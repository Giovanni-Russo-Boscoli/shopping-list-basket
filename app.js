/* Basket: shared shopping list. Plain JS, no build step. */
(() => {
const CFG = window.BASKET_CONFIG;
const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---------- state ----------
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const S = {
  session: null, me: null, ready: false, online: navigator.onLine,
  households: null, hid: ls.get("basket.household"), members: [], authMode: "in", joinCode: null,
  tab: ls.get("basket.tab") || "shop", group: ls.get("basket.group") || "cat", shop: "All", q: "",
  sheet: null, toast: null, lockErr: "", busy: false, updateReady: null,
  cats: [], shops: [], items: [],
};

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const eur = (n) => "€" + Number(n).toFixed(2);
const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const shopById = (id) => S.shops.find((s) => s.id === id);
const shopId = (name) => (S.shops.find((s) => s.name === name) || {}).id;
const catName = (it) => (S.cats.find((c) => c.id === it.category_id) || {}).name || "Other";
function ago(ts) {
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : d + " days ago";
}
function shopPrice(it) {
  if (S.shop !== "All") { const p = it.prices[shopId(S.shop)]; return typeof p === "number" ? p : undefined; }
  const v = Object.values(it.prices).filter((x) => typeof x === "number");
  return v.length ? Math.min(...v) : undefined;
}
const hasShops = (it) => Object.keys(it.prices).length > 0;
const inShop = (it) => S.shop === "All" || !hasShops(it) || shopId(S.shop) in it.prices;
const shopLabel = (it) => hasShops(it)
  ? S.shops.filter((s) => s.id in it.prices).map((s) => s.name).join(" · ") : "Any shop";
let toastTimer;
function toast(msg, undo, ms = 3500) {
  S.toast = { msg, undo }; render();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, ms);
}
function fail(e) { console.error(e); toast(navigator.onLine ? "Couldn't save. Try again." : "You're offline. Changes need a signal."); }

// ---------- data ----------
async function load() {
  const [c, s, i, is] = await Promise.all([
    sb.from("categories").select("*").eq("household_id", S.hid).order("sort_order"),
    sb.from("shops").select("*").eq("household_id", S.hid).order("sort_order"),
    sb.from("items").select("*").eq("household_id", S.hid).order("name"),
    sb.from("item_shops").select("*").eq("household_id", S.hid),
  ]);
  const m = await sb.from("members").select("user_id,display_name").eq("household_id", S.hid).order("joined_at");
  const err = c.error || s.error || i.error || is.error || m.error;
  if (err) throw err;
  S.members = m.data;
  S.cats = c.data; S.shops = s.data;
  const prices = {};
  for (const r of is.data) (prices[r.item_id] ||= {})[r.shop_id] = r.price_eur === null ? null : Number(r.price_eur);
  S.items = i.data.map((it) => ({ ...it, prices: prices[it.id] || {} }));
  if (S.shop !== "All" && !S.shops.some((x) => x.name === S.shop)) S.shop = "All";
  S.ready = true;
}
let reloadTimer;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => { try { await load(); render(); } catch (e) { console.error(e); } }, 250);
}
let channel;
function subscribe() {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel("basket-" + S.hid);
  for (const table of ["categories", "shops", "items", "item_shops", "members"])
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: "household_id=eq." + S.hid }, scheduleReload);
  channel
    .subscribe((status) => { if (status === "SUBSCRIBED") scheduleReload(); });
}
async function updateItem(id, patch) {
  const it = S.items.find((x) => x.id === id); const before = { ...it };
  Object.assign(it, patch, { updated_by: S.me, updated_at: new Date().toISOString() }); render();
  const { error } = await sb.from("items").update({ ...patch, updated_by: S.me }).eq("id", id);
  if (error) { Object.assign(it, before); render(); fail(error); }
}

// ---------- views ----------
function header(title, sub, extra = "") {
  return `<header><div class="demo"><span>${S.online ? "Basket" : "Offline"}</span><span class="who-info">${esc(S.me)}
      <button class="infobtn" data-infotoggle aria-pressed="${!!S.info}" aria-label="${S.info ? "Leave info mode" : "Info mode: tap anything to learn what it does"}">?</button></span></div>
    ${S.info ? `<div class="infobar">Info mode: tap anything to see what it does. Tap <b>?</b> again to finish.</div>` : ""}
    <h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}${extra}
    ${S.updateReady ? `<button class="offline" data-update style="width:100%;text-align:left;border:0">Update ready. Tap to reload.</button>` : ""}</header>`;
}
function rowShop(it) {
  const p = shopPrice(it);
  const cls = it.picked ? "done" : "on";
  const meta = [it.quantity_note, S.group === "cat" ? shopLabel(it) : catName(it)].filter(Boolean).join(" · ");
  return `<button class="row ${it.picked ? "picked" : ""}" data-pick="${it.id}" aria-label="${it.picked ? "Put back" : "Picked"} ${esc(it.name)}">
    <span class="tick ${cls}"></span>${thumb(it)}
    <span class="info"><div class="name">${esc(it.name)}</div><div class="meta">${esc(meta)}</div></span>
    ${p !== undefined ? `<span class="price">${eur(p)}</span>` : ""}</button>`;
}
function thumb(it, big) {
  return it.photo_url
    ? `<img class="thumb" src="${esc(it.photo_url)}" alt="" style="object-fit:cover${big ? ";width:64px;height:64px" : ""}">`
    : `<span class="thumb" aria-hidden="true">${esc(initials(it.name || "+"))}</span>`;
}
function groupHtml(groups, rowFn) {
  return groups.map(([g, list]) => `<section class="group"><h2><span>${esc(g)}</span><span>${list.length}</span></h2>
    <div class="list">${list.map(rowFn).join("")}</div></section>`).join("");
}
function byCategory(list) {
  const out = S.cats.map((c) => [c.name, list.filter((i) => i.category_id === c.id)]);
  out.push(["Other", list.filter((i) => !S.cats.some((c) => c.id === i.category_id))]);
  return out.filter((g) => g[1].length);
}
function viewShop() {
  const pend = S.items.filter((i) => (i.pending || i.picked) && inShop(i));
  const left = pend.filter((i) => !i.picked);
  const picked = pend.filter((i) => i.picked);
  const total = left.reduce((s, i) => s + (shopPrice(i) || 0), 0);
  let groups;
  if (S.group === "cat") groups = byCategory(left);
  else {
    const shops = S.shop === "All" ? S.shops : S.shops.filter((s) => s.name === S.shop);
    groups = shops.map((s) => [s.name, left.filter((i) => s.id in i.prices)]).filter((g) => g[1].length);
    const any = left.filter((i) => !hasShops(i)); if (any.length) groups.push(["Any shop", any]);
  }
  const sub = `${left.length} item${left.length === 1 ? "" : "s"}${total ? " · about " + eur(total) : ""}${S.shop !== "All" ? " at " + esc(S.shop) : ""}`;
  const extra = `<div class="chips" role="group" aria-label="I'm in">${["All", ...S.shops.map((s) => s.name)].map((s) =>
      `<button class="chip" data-shop="${esc(s)}" aria-pressed="${S.shop === s}">${s === "All" ? "All shops" : esc(s)}</button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Group by"><button data-group="cat" aria-pressed="${S.group === "cat"}">By category</button><button data-group="shop" aria-pressed="${S.group === "shop"}">By shop</button></div>`;
  return header("To buy", sub, extra) + `<main>
    ${groups.length ? groupHtml(groups, rowShop)
      : `<div class="empty">Nothing to buy${S.shop !== "All" ? " at " + esc(S.shop) : ""}. Tick items in the Catalogue to add them here.</div>`}
    ${picked.length ? groupHtml([["Picked this trip", picked]], rowShop) + `<button class="add" data-finish>Finish trip (clear picked)</button>` : ""}
    <p class="hint">Tap an item when it's in the basket.</p></main>`;
}
function rowCat(it) {
  const on = it.pending && !it.picked;
  return `<div class="row"><button class="tick ${on ? "on" : ""}" data-toggle="${it.id}" aria-label="${on ? "Remove from" : "Add to"} list: ${esc(it.name)}"></button>
    <button class="info" data-edit="${it.id}"><div class="name">${esc(it.name)}</div>
    <div class="meta">${esc(shopLabel(it))}${on ? " · added by " + esc(it.updated_by || "someone") + ", " + ago(it.updated_at) : ""}</div></button></div>`;
}
function viewCat() {
  const q = S.q.trim().toLowerCase();
  const match = S.items.filter((i) => !q || i.name.toLowerCase().includes(q));
  const pc = S.items.filter((i) => i.pending && !i.picked).length;
  const extra = `<div class="search"><input id="q" type="search" placeholder="Search or add an item" value="${esc(S.q)}" autocomplete="off" enterkeyhint="done"><button class="iconbtn" data-scan="find">Scan</button></div>`;
  return header("Catalogue", `${S.items.length} items · ${pc} on the list`, extra) + `<main>
    ${q && !S.items.some((i) => i.name.toLowerCase() === q) ? `<button class="add" data-new="${esc(S.q.trim())}">+ Add “${esc(S.q.trim())}”</button>` : ""}
    ${groupHtml(byCategory(match), rowCat)}
    ${!q ? `<button class="add" data-new="">+ New item</button>` : ""}
    ${!S.items.length ? `<p class="hint">Your catalogue is empty. Add the things you buy regularly. They stay here for next time.</p>`
      : `<p class="hint">Tap the circle to put an item on the shopping list. Tap the name to edit it.</p>`}</main>`;
}
function listEditor(kind, rows) {
  return `<section class="group"><h2><span>${kind === "shops" ? "Shops" : "Categories"}</span><span>${rows.length}</span></h2><div class="list">
    ${rows.map((r, ix) => `<div class="row"><span class="name" style="flex:1;min-width:0">${esc(r.name)}</span><span class="rowbtns">
      <button class="ghost" data-move="${kind}:${r.id}:-1" ${ix === 0 ? "disabled" : ""} aria-label="Move ${esc(r.name)} up">↑</button>
      <button class="ghost" data-move="${kind}:${r.id}:1" ${ix === rows.length - 1 ? "disabled" : ""} aria-label="Move ${esc(r.name)} down">↓</button>
      <button class="ghost" data-rename="${kind}:${r.id}">Edit</button></span></div>`).join("")}
    </div><button class="add" data-addto="${kind}">+ Add ${kind === "shops" ? "shop" : "category"}</button></section>`;
}
function viewSettings() {
  return header("Settings") + `<main class="settings">
    ${listEditor("shops", S.shops)}${listEditor("categories", S.cats)}
    <section class="group"><h2><span>Household</span><span>${S.members.length} ${S.members.length === 1 ? "person" : "people"}</span></h2><div class="list">
      <div class="row"><span class="info" style="flex:1"><div class="name">${esc(curHousehold().name)}</div><div class="meta" style="white-space:normal">${esc(S.members.map((m) => m.display_name).join(", "))}</div></span><button class="ghost" data-renamehh>Rename</button></div>
      <div class="row"><span class="info" style="flex:1"><div class="name">Invite someone</div><div class="meta" style="white-space:normal">Send them a link to join this list.</div></span><button class="ghost" data-invite>Invite</button></div>
      <div class="row"><span class="info" style="flex:1"><div class="name">Other households</div><div class="meta" style="white-space:normal">${S.households.length > 1 ? "You're in " + S.households.length + ". Switch, or join or create another." : "Join or create another list, e.g. for work."}</div></span><button class="ghost" data-households>Open</button></div></div></section>
    <section class="group"><h2><span>You</span></h2><div class="list">
      <div class="row"><span class="info" style="flex:1"><div class="name">${esc(S.me)}</div><div class="meta">${esc(S.session.user.email || "")}</div></span><button class="ghost" data-myname>Change name</button></div>
      <div class="row"><span class="info" style="flex:1"><div class="name">Notifications</div><div class="meta" style="white-space:normal">${esc(pushStatusText())}</div></span>
        ${S.push === "on" ? `<button class="ghost" data-pushoff>Turn off</button>` : S.push === "off" ? `<button class="ghost" data-pushon>Turn on</button>` : ""}</div>
      <div class="row" style="flex-wrap:wrap"><span class="info" style="flex:1"><div class="name">Language</div><div class="meta" style="white-space:normal">Choose the language for this phone.</div></span>${langChips()}</div>
      <div class="row"><span class="name">Sign out of this phone</span><button class="ghost" data-signout>Sign out</button></div></div></section>
    <p class="hint">Shop and category order is shared. Match it to the way you walk around the shop.</p></main>`;
}
function sheetHtml() {
  const sh = S.sheet; if (!sh) return "";
  if (sh.kind === "invite") {
    const link = inviteLink(curHousehold().invite_code);
    return `<div class="scrim" data-close><div class="sheet" role="dialog" aria-label="Invite someone"><h3>Invite someone <button class="ghost" data-closebtn>Close</button></h3>
      <p class="hint" style="margin-top:0">Send this link to the person you want to share “${esc(curHousehold().name)}” with. They open it, create an account, and they're in.</p>
      <input id="inv-link" readonly value="${esc(link)}">
      ${navigator.share ? `<button class="primary" data-shareinvite>Share link</button>` : ""}
      <button class="${navigator.share ? "add" : "primary"}" data-copyinvite>Copy link</button>
      <button class="add" style="border:0" data-newinvite>Make a new link (stops the old one working)</button></div></div>`;
  }
  if (sh.kind === "name") {
    return `<div class="scrim" data-close><div class="sheet" role="dialog" aria-label="${esc(sh.title)}"><h3>${esc(sh.title)} <button class="ghost" data-closebtn>Close</button></h3>
      <label class="f" for="n-name">Name</label><input id="n-name" value="${esc(sh.value)}" autocomplete="off">
      <button class="primary" data-savename>Save</button>
      ${sh.id && (sh.kind2 === "shops" || sh.kind2 === "categories") ? `<button class="add danger" style="border-color:currentColor" data-delname>Delete</button>` : ""}
      ${sh.err ? `<p class="err">${esc(sh.err)}</p>` : ""}</div></div>`;
  }
  const it = sh.item;
  return `<div class="scrim" data-close><div class="sheet" role="dialog" aria-label="${sh.isNew ? "New item" : "Edit item"}"><h3>${sh.isNew ? "New item" : "Edit item"} <button class="ghost" data-closebtn>Close</button></h3>
    ${sh.note ? `<p class="hint" style="margin:0 0 10px">${esc(sh.note)}</p>` : ""}
    <div class="photo">${thumb({ ...it, photo_url: sh.photoPreview || it.photo_url }, true)}
      <span class="rowbtns" style="flex-wrap:wrap"><button class="ghost" data-photo>${it.photo_url || sh.photoPreview ? "Change photo" : "Add photo"}</button>
      ${it.photo_url || sh.photoPreview ? `<button class="ghost" data-nophoto>Remove</button>` : ""}</span></div>
    <label class="f" for="e-name">Name</label><input id="e-name" value="${esc(it.name)}" placeholder="e.g. Oat milk" autocomplete="off">
    <label class="f" for="e-cat">Category</label><select id="e-cat">${S.cats.map((c) => `<option value="${c.id}" ${c.id === it.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <label class="f" for="e-note">Quantity / note</label><input id="e-note" value="${esc(it.quantity_note)}" placeholder="e.g. 2 L, the green one">
    <label class="f" for="e-barcode">Barcode</label>
    <div class="search" style="margin:0"><input id="e-barcode" value="${esc(it.barcode || "")}" inputmode="numeric" placeholder="Optional" autocomplete="off"><button class="iconbtn" data-scan="edit">Scan</button></div>
    <label class="f">Shops and price (€)</label>
    <div class="list" style="padding:0 12px">${S.shops.map((s) => { const on = s.id in it.prices; const p = it.prices[s.id];
      return `<div class="shoprow"><input type="checkbox" id="e-s${s.id}" data-shopchk="${s.id}" ${on ? "checked" : ""}><label class="sn" for="e-s${s.id}">${esc(s.name)}</label>
      <input type="number" inputmode="decimal" step="0.01" min="0" id="e-p${s.id}" data-shopprice="${s.id}" value="${typeof p === "number" ? p.toFixed(2) : ""}" placeholder="—" ${on ? "" : "disabled"} aria-label="Price at ${esc(s.name)}"></div>`; }).join("")}</div>
    <p class="hint">Leave all shops unticked for “Any shop”.</p>
    <button class="primary" data-save ${S.busy ? "disabled" : ""}>${sh.isNew ? "Add to catalogue and list" : "Save"}</button>
    ${!sh.isNew ? `<button class="add danger" style="border-color:currentColor" data-delitem>Delete from catalogue</button>` : ""}
    ${sh.err ? `<p class="err">${esc(sh.err)}</p>` : ""}</div></div>`;
}
const curHousehold = () => (S.households || []).find((h) => h.id === S.hid) || { name: "Home" };
const inviteLink = (code) => location.origin + location.pathname + "?join=" + encodeURIComponent(code);
function viewAuth() {
  const up = S.authMode === "up";
  return `<div class="lock"><div class="card">${langChips()}<h1>Basket</h1><p class="sub">${S.joinCode ? "You've been invited to a shared shopping list. " : ""}${up ? "Create your account." : "Sign in to your shopping list."}</p>
    <div class="seg" role="group" aria-label="Account"><button data-authmode="in" aria-pressed="${!up}">Sign in</button><button data-authmode="up" aria-pressed="${up}">Create account</button></div>
    ${up ? `<label class="f" for="a-name">Your first name</label><input id="a-name" autocomplete="given-name" autocapitalize="words" maxlength="30">` : ""}
    <label class="f" for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" inputmode="email" autocapitalize="none">
    <label class="f" for="a-pw">Password${up ? " (at least 8 characters)" : ""}</label><input id="a-pw" type="password" autocomplete="${up ? "new-password" : "current-password"}" enterkeyhint="go">
    <button class="primary" data-auth ${S.busy ? "disabled style='opacity:.5'" : ""}>${up ? "Create account" : "Sign in"}</button>
    ${!up ? `<button class="add" style="border:0;margin-top:6px" data-forgot>Forgot password?</button>` : ""}
    ${S.lockErr ? `<p class="err">${esc(S.lockErr)}</p>` : ""}</div></div>`;
}
function viewHouseholds() {
  const list = S.households || [];
  const defName = S.me || (S.session.user.user_metadata || {}).name || "";
  return `<div class="lock"><div class="card"><h1>${list.length ? "Your households" : "Set up your list"}</h1>
    <p class="sub">A household is one shared list. Everyone in it sees the same items.</p>
    ${list.length ? `<div class="list" style="margin-top:12px">${list.map((h) => `<button class="row" data-pickhh="${h.id}"><span class="info"><div class="name">${esc(h.name)}</div><div class="meta">as ${esc(h.display_name)}</div></span>${h.id === S.hid ? `<span class="meta">Current</span>` : ""}</button>`).join("")}</div>` : ""}
    <label class="f" for="h-me">Your name in the list</label><input id="h-me" value="${esc(defName)}" autocapitalize="words" maxlength="30">
    <h3 style="font:600 16px var(--display);margin:20px 0 0">Join with an invite</h3>
    <label class="f" for="h-code">Invite link or code</label><input id="h-code" value="${esc(S.joinCode || "")}" autocapitalize="none" autocomplete="off" placeholder="Paste the link you were sent">
    <button class="primary" data-joinhh ${S.busy ? "disabled" : ""}>Join</button>
    <h3 style="font:600 16px var(--display);margin:24px 0 0">Or start a new list</h3>
    <label class="f" for="h-name">Household name</label><input id="h-name" placeholder="e.g. Home" maxlength="40">
    <button class="add" data-createhh ${S.busy ? "disabled" : ""}>Create household</button>
    ${S.lockErr ? `<p class="err">${esc(S.lockErr)}</p>` : ""}
    <button class="add" style="border:0" data-signout>Sign out</button>
    ${list.length && S.hid ? `<button class="add" style="border:0" data-closehh>Back to the list</button>` : ""}</div></div>`;
}
const ICON = {
  shop: '<path d="M5 7h14l-1.5 11h-11z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  cat: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
};
function render() { renderInner(); I18N.translateDom($("#root")); }
function langChips() {
  return `<div class="chips" role="group" aria-label="Language" style="padding-top:0" data-notr>${I18N.LANGS.map(([k, n]) =>
    `<button class="chip" data-lang="${k}" aria-pressed="${I18N.lang === k}">${n}</button>`).join("")}</div>`;
}
function renderInner() {
  const a = document.activeElement; const fid = a && a.id;
  const caret = a && a.selectionStart != null && a.type !== "number" ? a.selectionStart : null;
  const formVals = {}; document.querySelectorAll(".sheet input:not([readonly]), .sheet select").forEach((el) => { formVals[el.id] = el.type === "checkbox" ? el.checked : el.value; });
  const keep = {}; document.querySelectorAll(".lock input").forEach((el) => { keep[el.id] = el.value; });
  const lockView = !S.session ? viewAuth : S.households && (!S.hid || S.pickHousehold) ? viewHouseholds : null;
  if (lockView) {
    $("#root").innerHTML = lockView();
    for (const [k, v] of Object.entries(keep)) { const el = document.getElementById(k); if (el && v) el.value = v; }
    restore(); return;
  }
  if (!S.ready) { $("#root").innerHTML = `<div class="boot">Loading your list…</div>`; return; }
  const pc = S.items.filter((i) => i.pending && !i.picked).length;
  $("#root").innerHTML = `<div class="app">${S.tab === "shop" ? viewShop() : S.tab === "cat" ? viewCat() : viewSettings()}</div>
  <nav><div class="in">
   <button data-tab="shop" ${S.tab === "shop" ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24">${ICON.shop}</svg><span>Shopping${pc ? `<span class="badge">${pc}</span>` : ""}</span></button>
   <button data-tab="cat" ${S.tab === "cat" ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24">${ICON.cat}</svg>Catalogue</button>
   <button data-tab="set" ${S.tab === "set" ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24">${ICON.set}</svg>Settings</button>
  </div></nav>${sheetHtml()}
  ${S.info && S.help ? `<div class="helpcard" role="status"><div class="ht">${esc(S.help[0])}</div><div>${esc(S.help[1])}</div><button class="helpdone" data-infotoggle>Done, leave info mode</button></div>` : ""}
  ${S.toast ? `<div class="toast" role="status">${esc(S.toast.msg)}${S.toast.undo ? `<button data-undo>Undo</button>` : ""}</div>` : ""}`;
  // keep half-typed form values and focus across live re-renders
  for (const [k, v] of Object.entries(formVals)) { const el = document.getElementById(k); if (el && el.type !== "file") { if (el.type === "checkbox") el.checked = v; else el.value = v; } }
  document.querySelectorAll("[data-shopchk]").forEach((c) => { const p = $("#e-p" + c.dataset.shopchk); if (p) p.disabled = !c.checked; });
  restore();
  function restore() { if (!fid) return; const el = document.getElementById(fid); if (el) { el.focus(); if (caret != null && el.setSelectionRange) try { el.setSelectionRange(caret, caret); } catch {} } }
}

// ---------- actions ----------
async function authSubmit() {
  const up = S.authMode === "up";
  const email = $("#a-email").value.trim(), password = $("#a-pw").value;
  const name = up ? $("#a-name").value.trim() : "";
  if (up && !name) { S.lockErr = "Type your first name."; render(); return; }
  if (!email || !password) { S.lockErr = "Type your email and password."; render(); return; }
  if (up && password.length < 8) { S.lockErr = "Use a password of at least 8 characters."; render(); return; }
  S.lockErr = ""; S.busy = true; render();
  const res = up ? await sb.auth.signUp({ email, password, options: { data: { name } } })
    : await sb.auth.signInWithPassword({ email, password });
  S.busy = false;
  if (res.error) {
    const m = res.error.message || "";
    S.lockErr = /invalid login/i.test(m) ? "Email or password isn't right." : /already registered/i.test(m) ? "There's already an account with that email. Sign in instead."
      : /signups? not allowed|signup.*disabled/i.test(m) ? "New accounts are switched off. In Supabase, turn on \"Allow new users to sign up\"."
      : /sending.*email|confirmation/i.test(m) ? "Supabase couldn't send a confirmation email. In Supabase, turn off \"Confirm email\"."
      : /password/i.test(m) ? m
      : "Couldn't " + (up ? "create the account" : "sign in") + (navigator.onLine ? ". Supabase said: " + (m || "unknown error") : ". Check your signal and try again.");
    render(); return;
  }
  if (!res.data.session) { S.lockErr = "Account created. Check your email to confirm it, then sign in."; S.authMode = "in"; render(); return; }
  S.session = res.data.session;
  await start();
}
async function forgotPassword() {
  const email = $("#a-email").value.trim();
  if (!email) { S.lockErr = "Type your email first, then tap Forgot password."; render(); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  S.lockErr = error ? "Couldn't send the reset email. Ask someone in your household to help, or try later." : "If that email has an account, a reset link is on its way.";
  render();
}
async function loadHouseholds() {
  const { data, error } = await sb.from("members").select("household_id,display_name,households(id,name,invite_code)").eq("user_id", S.session.user.id);
  if (error) throw error;
  S.households = data.filter((r) => r.households).map((r) => ({ id: r.household_id, name: r.households.name, invite_code: r.households.invite_code, display_name: r.display_name }));
  if (!S.households.some((h) => h.id === S.hid)) S.hid = S.households.length === 1 ? S.households[0].id : null;
  const cur = S.households.find((h) => h.id === S.hid);
  S.me = cur ? cur.display_name : null;
  if (S.hid) ls.set("basket.household", S.hid); else ls.del("basket.household");
}
function parseCode(v) {
  v = String(v || "").trim(); const m = v.match(/[?&]join=([^&#\s]+)/);
  return (m ? decodeURIComponent(m[1]) : v).toLowerCase();
}
async function householdAction(kind) {
  const me = $("#h-me").value.trim();
  if (!me) { S.lockErr = "Type your name first."; render(); return; }
  const arg = kind === "join" ? parseCode($("#h-code").value) : $("#h-name").value.trim() || "Home";
  if (kind === "join" && !arg) { S.lockErr = "Paste the invite link or code."; render(); return; }
  S.lockErr = ""; S.busy = true; render();
  const { data, error } = kind === "join" ? await sb.rpc("join_household", { p_code: arg, p_display_name: me })
    : await sb.rpc("create_household", { p_name: arg, p_display_name: me });
  S.busy = false;
  if (error) { S.lockErr = /invalid invite/i.test(error.message) ? "That invite isn't valid. Ask for a new link." : "Couldn't do that. Check your signal and try again."; render(); return; }
  if (kind === "create" && I18N.DEFAULT_CATS[I18N.lang]) {
    // New households start with English category names; rename them to the chosen language.
    await Promise.all(Object.entries(I18N.DEFAULT_CATS[I18N.lang]).map(([en, local]) =>
      sb.from("categories").update({ name: local }).eq("household_id", data).eq("name", en)));
  }
  S.joinCode = null; ls.del("basket.join"); await switchHousehold(data);
}
async function switchHousehold(id) {
  S.hid = id; ls.set("basket.household", id); S.pickHousehold = false; S.ready = false; S.shop = "All"; S.sheet = null; render();
  await start();
}
async function start() {
  try { await loadHouseholds(); } catch (e) { console.error(e); S.households = []; toast("Couldn't load your households. Check your signal."); }
  if (S.joinCode) { const already = S.households.find((h) => h.invite_code === S.joinCode); if (already) { S.joinCode = null; ls.del("basket.join"); S.hid = already.id; S.me = already.display_name; } else S.pickHousehold = true; }
  if (!S.hid) { render(); return; }
  render();
  try { await load(); } catch (e) { console.error(e); S.ready = true; toast("Couldn't load the list. Close and reopen the app to retry."); }
  subscribe(); render();
  pushInit().then(render).catch((e) => { console.error(e); S.push = "unsupported"; render(); });
}
async function saveItem() {
  const sh = S.sheet, it = sh.item;
  const name = $("#e-name").value.trim();
  if (!name) { sh.err = "Give the item a name."; render(); return; }
  const dup = S.items.find((x) => x.name.toLowerCase() === name.toLowerCase() && x.id !== it.id);
  if (dup) { sh.err = `“${dup.name}” is already in the catalogue.`; render(); return; }
  const barcode = $("#e-barcode").value.replace(/\s/g, "") || null;
  const bdup = barcode && S.items.find((x) => x.barcode === barcode && x.id !== it.id);
  if (bdup) { sh.err = `That barcode already belongs to “${bdup.name}”.`; render(); return; }
  const row = { name, category_id: Number($("#e-cat").value) || null, quantity_note: $("#e-note").value.trim(), barcode, photo_url: it.photo_url || null, updated_by: S.me };
  const prices = {};
  document.querySelectorAll("[data-shopchk]").forEach((c) => {
    if (!c.checked) return; const p = parseFloat($("#e-p" + c.dataset.shopchk).value);
    prices[c.dataset.shopchk] = isNaN(p) ? null : Math.round(p * 100) / 100;
  });
  S.busy = true; render();
  try {
    let id = it.id;
    if (sh.isNew) {
      const { data, error } = await sb.from("items").insert({ ...row, household_id: S.hid, pending: true }).select().single();
      if (error) throw error; id = data.id;
    } else {
      const { error } = await sb.from("items").update(row).eq("id", id); if (error) throw error;
    }
    if (sh.photoBlob) {
      const path = `${id}-${Date.now()}.jpg`;
      const up = await sb.storage.from("photos").upload(path, sh.photoBlob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const url = sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
      const { error } = await sb.from("items").update({ photo_url: url }).eq("id", id); if (error) throw error;
    }
    const old = it.prices || {};
    const removed = Object.keys(old).filter((k) => !(k in prices));
    if (removed.length) { const { error } = await sb.from("item_shops").delete().eq("item_id", id).in("shop_id", removed); if (error) throw error; }
    const up = Object.entries(prices).map(([sid, p]) => ({
      item_id: id, shop_id: Number(sid), price_eur: p, household_id: S.hid,
      ...(p !== null && old[sid] !== p ? { price_updated_at: new Date().toISOString() } : {}),
    }));
    if (up.length) { const { error } = await sb.from("item_shops").upsert(up); if (error) throw error; }
    S.busy = false; S.sheet = null; if (sh.isNew) S.q = "";
    await load(); toast(sh.isNew ? name + " added to the list" : "Saved");
  } catch (e) { S.busy = false; sh.err = (e && e.message && /bucket|storage|photo/i.test(e.message) ? "Couldn't upload the photo. " : "Couldn't save. ") + "Check your signal and try again."; console.error(e); render(); }
}
async function saveName() {
  const sh = S.sheet; const name = $("#n-name").value.trim();
  if (!name) { sh.err = "Type a name."; render(); return; }
  const table = sh.kind2;
  if (table === "households" || table === "members") {
    const { error } = table === "households" ? await sb.from("households").update({ name }).eq("id", S.hid)
      : await sb.from("members").update({ display_name: name }).eq("household_id", S.hid).eq("user_id", S.session.user.id);
    if (error) { sh.err = "Couldn't save. Try again."; render(); return; }
    S.sheet = null; await loadHouseholds(); await load(); render();
    if (table === "members" && S.push === "on") pushInit().catch(() => {});
    return;
  }
  const rows = S[table === "shops" ? "shops" : "cats"];
  const q = sh.id ? sb.from(table).update({ name }).eq("id", sh.id)
    : sb.from(table).insert({ name, household_id: S.hid, sort_order: Math.max(0, ...rows.map((r) => r.sort_order)) + 1 });
  const { error } = await q;
  if (error) { sh.err = error.code === "23505" ? "That name already exists." : "Couldn't save. Try again."; render(); return; }
  S.sheet = null; await load(); render();
}
async function deleteName() {
  const sh = S.sheet;
  if (!sh.confirm) { sh.confirm = true; sh.err = "Tap Delete again to confirm." + (sh.kind2 === "categories" ? " Items in it move to Other." : " Items keep their other shops."); render(); return; }
  const { error } = await sb.from(sh.kind2).delete().eq("id", sh.id);
  if (error) { sh.err = "Couldn't delete. Try again."; render(); return; }
  S.sheet = null; await load(); render();
}
async function move(kind, id, dir) {
  const rows = [...S[kind === "shops" ? "shops" : "cats"]];
  const i = rows.findIndex((r) => r.id === id), j = i + dir; if (j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  rows.forEach((r, ix) => (r.sort_order = ix + 1));
  S[kind === "shops" ? "shops" : "cats"] = rows; render();
  const res = await Promise.all([rows[i], rows[j]].map((r) => sb.from(kind).update({ sort_order: r.sort_order }).eq("id", r.id)));
  if (res.some((r) => r.error)) { fail(res.find((r) => r.error).error); await load(); render(); }
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button,[data-close]"); if (!t || t.disabled) return;
  const d = t.dataset; const num = (x) => Number(x);
  if (d.close !== undefined && e.target !== t) return;
  if (d.lang) { I18N.set(d.lang); render(); if (S.push === "on") pushInit().catch(() => {}); }
  else if (d.authmode) { S.authMode = d.authmode; S.lockErr = ""; render(); }
  else if (d.auth !== undefined) authSubmit();
  else if (d.forgot !== undefined) forgotPassword();
  else if (d.joinhh !== undefined) householdAction("join");
  else if (d.createhh !== undefined) householdAction("create");
  else if (d.pickhh) switchHousehold(d.pickhh);
  else if (d.households !== undefined) { S.pickHousehold = true; S.lockErr = ""; render(); scrollTo(0, 0); }
  else if (d.closehh !== undefined) { S.pickHousehold = false; S.lockErr = ""; render(); }
  else if (d.invite !== undefined) { S.sheet = { kind: "invite" }; render(); }
  else if (d.copyinvite !== undefined) { const l = inviteLink(curHousehold().invite_code); navigator.clipboard.writeText(l).then(() => toast("Link copied"), () => { const el = $("#inv-link"); el.select(); }); }
  else if (d.shareinvite !== undefined) { navigator.share({ title: I18N.tr("Join our shopping list"), text: I18N.tr("Join our shared shopping list on Basket:"), url: inviteLink(curHousehold().invite_code) }).catch(() => {}); }
  else if (d.newinvite !== undefined) {
    const { data, error } = await sb.rpc("new_invite_code", { p_household: S.hid });
    if (error) fail(error); else { curHousehold().invite_code = data; render(); toast("New link made. The old one no longer works."); }
  }
  else if (d.renamehh !== undefined) { S.sheet = { kind: "name", kind2: "households", id: S.hid, value: curHousehold().name, title: "Rename household" }; render(); }
  else if (d.myname !== undefined) { S.sheet = { kind: "name", kind2: "members", id: S.session.user.id, value: S.me, title: "Your name" }; render(); }
  else if (d.update !== undefined) S.updateReady();
  else if (d.tab) { S.tab = d.tab; ls.set("basket.tab", d.tab); S.sheet = null; render(); scrollTo(0, 0); }
  else if (d.shop) { S.shop = d.shop; render(); }
  else if (d.group) { S.group = d.group; ls.set("basket.group", d.group); render(); }
  else if (d.pick) {
    const it = S.items.find((x) => x.id === num(d.pick)); const now = !it.picked;
    await updateItem(it.id, { picked: now });
    if (now) toast(it.name + " picked", () => updateItem(it.id, { picked: false }));
  }
  else if (d.finish !== undefined) {
    const ids = S.items.filter((i) => i.picked).map((i) => i.id);
    S.items.forEach((i) => { if (i.picked) { i.picked = false; i.pending = false; } }); render();
    const { error } = await sb.from("items").update({ picked: false, pending: false, updated_by: S.me }).in("id", ids);
    if (error) { fail(error); await load(); render(); } else toast(ids.length + " items cleared. They stay in the Catalogue.");
  }
  else if (d.undo !== undefined) { const u = S.toast && S.toast.undo; S.toast = null; render(); if (u) u(); }
  else if (d.toggle) { const it = S.items.find((x) => x.id === num(d.toggle)); const on = it.pending && !it.picked; updateItem(it.id, { pending: !on, picked: false }); }
  else if (d.edit) { const it = S.items.find((x) => x.id === num(d.edit)); S.sheet = { kind: "edit", item: { ...it, prices: { ...it.prices } } }; render(); }
  else if (d.new !== undefined) {
    S.sheet = { kind: "edit", isNew: true, item: { name: d.new, category_id: S.cats[0] && S.cats[0].id, prices: {}, quantity_note: "" } };
    render(); setTimeout(() => { const n = $("#e-name"); if (n && !d.new) n.focus(); }, 0);
  }
  else if (d.save !== undefined) saveItem();
  else if (d.scan) openScanner(d.scan);
  else if (d.photo !== undefined) $("#photo-input").click();
  else if (d.nophoto !== undefined) { const sh = S.sheet; sh.item.photo_url = null; sh.photoBlob = null; if (sh.photoPreview) URL.revokeObjectURL(sh.photoPreview); sh.photoPreview = null; render(); }
  else if (d.delitem !== undefined) {
    const sh = S.sheet;
    if (!sh.confirm) { sh.confirm = true; sh.err = "Tap Delete again to remove it for good."; render(); return; }
    const { error } = await sb.from("items").delete().eq("id", sh.item.id);
    if (error) { sh.err = "Couldn't delete. Try again."; render(); return; }
    S.sheet = null; await load(); toast("Deleted");
  }
  else if (d.rename) { const [k, id] = d.rename.split(":"); const r = (k === "shops" ? S.shops : S.cats).find((x) => x.id === num(id));
    S.sheet = { kind: "name", kind2: k, id: r.id, value: r.name, title: "Edit " + (k === "shops" ? "shop" : "category") }; render(); }
  else if (d.addto) { S.sheet = { kind: "name", kind2: d.addto, value: "", title: "New " + (d.addto === "shops" ? "shop" : "category") }; render(); setTimeout(() => $("#n-name") && $("#n-name").focus(), 0); }
  else if (d.savename !== undefined) saveName();
  else if (d.delname !== undefined) deleteName();
  else if (d.move) { const [k, id, dir] = d.move.split(":"); move(k, num(id), num(dir)); }
  else if (d.infotoggle !== undefined) { S.info = !S.info; S.help = S.info ? ["Info mode is on", "Tap anything on the screen to see what it does. Nothing will change while info mode is on."] : null; render(); }
  else if (d.pushon !== undefined) pushOn();
  else if (d.pushoff !== undefined) pushOff();
  else if (d.signout !== undefined) {
    try { await pushOff(); } catch {}
    await sb.auth.signOut(); if (channel) sb.removeChannel(channel);
    Object.assign(S, { session: null, ready: false, me: null, households: null, hid: null, items: [], members: [], pickHousehold: false, sheet: null, lockErr: "" });
    ls.del("basket.household"); render();
  }
  else if (d.closebtn !== undefined || d.close !== undefined) { S.sheet = null; render(); }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "photo-input") {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f || !S.sheet || S.sheet.kind !== "edit") return;
    try {
      const blob = await shrinkPhoto(f);
      const sh = S.sheet; if (sh.photoPreview) URL.revokeObjectURL(sh.photoPreview);
      sh.photoBlob = blob; sh.photoPreview = URL.createObjectURL(blob); render();
    } catch (err) { console.error(err); toast("Couldn't read that photo. Try another."); }
    return;
  }
  const c = e.target.closest("[data-shopchk]");
  if (c) { const p = $("#e-p" + c.dataset.shopchk); p.disabled = !c.checked; if (c.checked) p.focus(); }
});
document.addEventListener("input", (e) => { if (e.target.id === "q") { S.q = e.target.value; render(); } });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.id === "a-pw") authSubmit();
  else if (e.target.id === "h-code") householdAction("join");
  else if (e.target.id === "h-name") householdAction("create");
  else if (e.target.id === "n-name") saveName();
  else if (e.target.id === "q" && S.q.trim()) { const b = document.querySelector("[data-new]"); if (b) b.click(); }
});
addEventListener("online", () => { S.online = true; scheduleReload(); render(); });
addEventListener("offline", () => { S.online = false; render(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.session) { scheduleReload(); checkForUpdate(); } });
setInterval(() => { if (S.tab === "cat") render(); }, 60000); // refresh "x min ago"

// ---------- info mode ----------
// While on, a tap explains the thing tapped instead of doing it.
const HELP = [
  ["[data-tab=shop]", () => ["Shopping", "What you need to buy right now. The number is how many items are still to get."]],
  ["[data-tab=cat]", () => ["Catalogue", "Everything you usually buy, kept for good. Tick items here to put them on the shopping list, or add new ones."]],
  ["[data-tab=set]", () => ["Settings", "Edit the shops and categories, switch whose phone this is, turn notifications on or off, or sign out."]],
  ["[data-shop]", (el) => el.dataset.shop === "All" ? ["All shops", "Shows everything on the list, whichever shop sells it."]
    : ["I'm in " + el.dataset.shop, "Shows only what you can buy in " + el.dataset.shop + ", plus items marked \"Any shop\". Prices and the total switch to this shop."]],
  ["[data-group=cat]", () => ["By category", "Groups the list by category (Dairy, Bakery…), so you can work through the shop aisle by aisle."]],
  ["[data-group=shop]", () => ["By shop", "Groups the list by shop. An item sold in two shops shows under both; ticking it once clears it everywhere."]],
  ["[data-pick]", (el) => el.classList.contains("picked") ? ["Picked item", "Already in the basket. Tap it to put it back on the list if you couldn't get it."]
    : ["Item to buy", "Tap it once it's in your basket. It moves to \"Picked this trip\". The price shown is the cheapest, or the selected shop's."]],
  ["[data-finish]", () => ["Finish trip", "Clears everything you picked from the shopping list. The items stay in the Catalogue for next time."]],
  ["[data-toggle]", () => ["Need to buy", "Tap the circle to put this item on the shopping list (orange) or take it off (empty)."]],
  ["[data-edit]", () => ["Item", "Tap the name to edit it: category, shops, prices, photo, barcode, or delete it. The grey line shows its shops and who added it."]],
  ["[data-new]", () => ["Add an item", "Creates a new item in the Catalogue and puts it straight on the shopping list."]],
  ["[data-scan=find]", () => ["Scan a barcode", "Opens the camera. A known product goes straight on the list; a new one opens with its name and photo filled in where possible."]],
  ["[data-scan=edit]", () => ["Scan barcode", "Reads this item's barcode with the camera, so next time you can scan it onto the list."]],
  ["#q", () => ["Search or add", "Type to find an item. If it isn't there, an \"+ Add\" button appears to create it."]],
  ["[data-update]", () => ["Update ready", "A new version of Basket is available. Tap to reload and use it."]],
  [".sub", () => ["Summary", "How many items are left and roughly what they'll cost, using the cheapest known price (or the selected shop's)."]],
  ["[data-move]", () => ["Reorder", "Moves this up or down. Order the list the way you walk around the shop; it's shared with the other phone."]],
  ["[data-rename]", () => ["Edit", "Rename or delete this shop or category."]],
  ["[data-addto=shops]", () => ["Add shop", "Adds a new shop you can pick when adding items."]],
  ["[data-addto=categories]", () => ["Add category", "Adds a new category, e.g. Snacks or Baby."]],
  ["[data-myname]", () => ["Your name", "How you appear to others in this household, e.g. \"added by …\" and in notifications."]],
  ["[data-renamehh]", () => ["Household", "The name of this shared list. The grey line shows who's in it."]],
  ["[data-invite]", () => ["Invite someone", "Gives you a link to send. Whoever opens it can create an account and join this list."]],
  ["[data-households]", () => ["Other households", "Switch to another list you belong to, or join or create a new one."]],
  ["[data-signout]", () => ["Sign out", "Signs this phone out. You'll need your email and password to get back in."]],
  ["[data-pushon]", () => ["Notifications", "Get a notification when the other person adds items to the list."]],
  ["[data-pushoff]", () => ["Notifications", "Stops notifications on this phone."]],
  ["#e-name", () => ["Name", "What the item is called. Keep it short so it fits on one line."]],
  ["#e-cat", () => ["Category", "Where it's grouped on the list, e.g. Dairy."]],
  ["#e-note", () => ["Quantity / note", "Anything that helps the shopper: size, how many, which brand."]],
  ["[data-shopchk]", () => ["Shop", "Tick every shop that sells this item. Leave them all unticked for \"Any shop\"."]],
  ["[data-shopprice]", () => ["Price", "Optional. The price at this shop in euro, used for the estimated total."]],
  ["#e-barcode", () => ["Barcode", "The number under the barcode. Lets you scan this item onto the list."]],
  ["[data-photo]", () => ["Photo", "Take or choose a picture, so the shopper knows exactly which product to get."]],
  ["[data-nophoto]", () => ["Remove photo", "Removes the photo from this item."]],
  ["[data-save]", () => ["Save", "Saves the item. A new item also goes straight on the shopping list."]],
  ["[data-delitem]", () => ["Delete", "Removes the item from the Catalogue for good. Tap twice to confirm."]],
  ["[data-closebtn]", () => ["Close", "Closes this without saving."]],
  [".price", () => ["Price", "The cheapest known price, or the selected shop's price."]],
];
function helpFor(target) {
  for (const [sel, fn] of HELP) { const el = target.closest(sel); if (el) return fn(el); }
  return ["Info mode", "Tap a button, an item or a box to see what it does."];
}
function infoIntercept(e) {
  if (!S.info) return;
  const t = e.target;
  if (t.closest("[data-infotoggle]") || t.closest(".helpcard") || !t.closest("#root")) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.type === "click") { if (document.activeElement) document.activeElement.blur(); S.help = helpFor(t); render(); }
}
document.addEventListener("pointerdown", infoIntercept, true); // stops boxes getting focus
document.addEventListener("click", infoIntercept, true);
document.addEventListener("change", infoIntercept, true);

// ---------- photos ----------
async function shrinkPhoto(file, max = 800) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.75));
}

// ---------- barcode scanning ----------
// The scanner lives outside #root so live re-renders never interrupt the camera.
const ZXING_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
let zxingLoading;
function loadZXing() {
  if (window.ZXing) return Promise.resolve();
  return (zxingLoading ||= new Promise((res, rej) => { const s = document.createElement("script"); s.src = ZXING_URL; s.onload = res; s.onerror = () => { zxingLoading = null; rej(new Error("zxing")); }; document.head.appendChild(s); }));
}
let reader = null, scanStream = null, scanTimer = null;
function scannerEl() {
  let el = $("#scanner");
  if (!el) { el = document.createElement("div"); el.id = "scanner"; el.className = "scrim"; el.hidden = true; document.body.appendChild(el); }
  return el;
}
function closeScanner() {
  clearTimeout(scanTimer); scanTimer = null;
  if (reader) { try { reader.reset(); } catch {} reader = null; }
  if (scanStream) { scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; }
  const el = scannerEl(); el.hidden = true; el.innerHTML = "";
}
async function nativeDetector() {
  if (!("BarcodeDetector" in window)) return null;
  try {
    const have = await BarcodeDetector.getSupportedFormats();
    const want = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"].filter((f) => have.includes(f));
    return want.length ? new BarcodeDetector({ formats: want }) : null;
  } catch { return null; }
}
async function openScanner(mode) {
  closeScanner();
  const el = scannerEl(); el.hidden = false;
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="Scan barcode"><h3>Scan barcode <button class="ghost" id="scan-close">Close</button></h3>
    <div class="cam"><video id="scan-video" playsinline muted autoplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>
    <div class="frame"><div class="laser"></div></div><p id="scan-msg">Starting camera…</p></div>
    <p class="hint">Hold the phone about 15 cm away, with the barcode flat and lit. It scans by itself.</p>
    <label class="f" for="scan-typed">Or type the number under the barcode</label>
    <div class="search" style="margin:0"><input id="scan-typed" inputmode="numeric" autocomplete="off" placeholder="e.g. 5011061002012"><button class="iconbtn" id="scan-use">Use</button></div></div>`;
  let done = false;
  const finish = (code) => {
    code = String(code || "").replace(/\D/g, ""); if (done || code.length < 6) return; done = true;
    if (navigator.vibrate) navigator.vibrate(60);
    closeScanner(); onBarcode(code, mode);
  };
  I18N.translateDom(el);
  $("#scan-close").onclick = closeScanner;
  $("#scan-use").onclick = () => finish($("#scan-typed").value);
  $("#scan-typed").onkeydown = (e) => { if (e.key === "Enter") finish(e.target.value); };
  el.onclick = (e) => { if (e.target === el) closeScanner(); };
  const msg = (t) => { const m = $("#scan-msg"); if (m) m.textContent = I18N.tr(t); };
  const video = $("#scan-video");
  try {
    const detector = await nativeDetector();
    if (!detector) await loadZXing();
    scanStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
      facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    if (el.hidden) { closeScanner(); return; }
    const track = scanStream.getVideoTracks()[0];
    try { const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (caps.focusMode && caps.focusMode.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }); } catch {}
    video.srcObject = scanStream; await video.play().catch(() => {});
    msg("Point the camera at the barcode");
    if (detector) {
      // Android Chrome: the phone's own barcode reader.
      const tick = async () => {
        if (done || !scanStream) return;
        try { if (video.readyState >= 2) { const r = await detector.detect(video); if (r.length) return finish(r[0].rawValue); } } catch {}
        scanTimer = setTimeout(tick, 150);
      };
      tick();
    } else {
      // iPhone and others: ZXing, trying harder on crumpled packets.
      const Z = window.ZXing;
      const hints = new Map([
        [Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]],
        [Z.DecodeHintType.TRY_HARDER, true]]);
      reader = new Z.BrowserMultiFormatReader(hints, 150);
      reader.decodeFromStream(scanStream, video, (result) => { if (result) finish(result.getText()); });
    }
  } catch (e) {
    console.error(e);
    msg(e && e.name === "NotAllowedError" ? "Camera blocked. Allow camera access for this site in your browser settings, or type the number below." :
        e && e.message === "zxing" ? "Couldn't load the scanner. Type the number below instead." : "Couldn't start the camera. Type the number below instead.");
  }
}
async function lookupProduct(code) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_en,product_name_pt,brands,quantity,image_front_small_url,image_front_url`);
    if (!r.ok) return null;
    const j = await r.json(); const p = j.product; if (j.status !== 1 || !p) return null;
    const base = (I18N.lang === "pt" ? p.product_name_pt || p.product_name : p.product_name_en || p.product_name) || "";
    const brand = (p.brands || "").split(",")[0].trim();
    const name = (brand && base && !base.toLowerCase().includes(brand.toLowerCase()) ? brand + " " + base : base || brand).trim();
    return name ? { name, quantity: p.quantity || "", photo: p.image_front_small_url || p.image_front_url || null } : null;
  } catch { return null; }
}
async function onBarcode(code, mode) {
  if (mode === "edit" && S.sheet && S.sheet.kind === "edit") {
    const sh = S.sheet; const bc = $("#e-barcode"); if (bc) bc.value = code; sh.item.barcode = code;
    const nameEl = $("#e-name");
    if (nameEl && !nameEl.value.trim()) {
      toast("Looking up " + code + "…");
      const p = await lookupProduct(code);
      if (p && S.sheet === sh) {
        const n = $("#e-name"); if (n && !n.value.trim()) n.value = p.name;
        const q = $("#e-note"); if (q && !q.value.trim()) q.value = p.quantity;
        if (!sh.item.photo_url && !sh.photoBlob) sh.item.photo_url = p.photo;
        sh.note = "Filled in from Open Food Facts. Check the details.";
      }
    }
    render(); return;
  }
  const known = S.items.find((i) => i.barcode === code);
  if (known) {
    if (!known.pending || known.picked) await updateItem(known.id, { pending: true, picked: false });
    toast(known.name + " is on the list"); return;
  }
  toast("Looking up " + code + "…", null, 8000);
  const p = await lookupProduct(code);
  S.toast = null;
  S.sheet = { kind: "edit", isNew: true, note: p ? "Found in Open Food Facts. Check the details, pick a category and shops." : "Not found in Open Food Facts. Type the name.",
    item: { name: p ? p.name : "", category_id: S.cats[0] && S.cats[0].id, prices: {}, quantity_note: p ? p.quantity : "", barcode: code, photo_url: p ? p.photo : null } };
  render(); if (!p) setTimeout(() => $("#e-name") && $("#e-name").focus(), 0);
}

// ---------- notifications ----------
// S.push: "unsupported" | "needs-install" | "blocked" | "off" | "on" | "busy"
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
function pushStatusText() {
  const other = S.members.filter((m) => m.user_id !== S.session.user.id).map((m) => m.display_name).join(" or ") || "someone else";
  return {
    on: `On. You'll hear when ${other} adds items.`,
    off: `Get a notification when ${other} adds items.`,
    busy: "Working…",
    blocked: "Blocked in your phone's settings. Allow notifications for Basket there, then reopen the app.",
    "needs-install": "Add Basket to your Home Screen first (Share > Add to Home Screen), then open it from there.",
    unsupported: "This browser can't show notifications.",
  }[S.push] || "Checking…";
}
async function pushInit() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    S.push = isIOS() && !isStandalone() ? "needs-install" : "unsupported"; return;
  }
  if (Notification.permission === "denied") { S.push = "blocked"; return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  S.push = sub ? "on" : "off";
  if (sub && S.me) sb.from("push_subscriptions").upsert({ endpoint: sub.endpoint, person: S.me, subscription: { ...sub.toJSON(), lang: I18N.lang }, household_id: S.hid, user_id: S.session.user.id }).then(() => {});
}
function b64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function pushOn() {
  S.push = "busy"; render();
  try {
    if ((await Notification.requestPermission()) !== "granted") { S.push = Notification.permission === "denied" ? "blocked" : "off"; render(); return; }
    const r = await fetch(CFG.supabaseUrl + "/functions/v1/notify", { method: "POST", headers: { "Content-Type": "application/json", apikey: CFG.supabaseAnonKey }, body: JSON.stringify({ action: "key" }) });
    const { publicKey } = await r.json();
    if (!publicKey) throw new Error("no key");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    const { error } = await sb.from("push_subscriptions").upsert({ endpoint: sub.endpoint, person: S.me, subscription: { ...sub.toJSON(), lang: I18N.lang }, household_id: S.hid, user_id: S.session.user.id });
    if (error) throw error;
    S.push = "on"; toast("Notifications on");
  } catch (e) { console.error(e); S.push = "off"; toast("Couldn't turn on notifications. Try again."); }
  render();
}
async function pushOff() {
  S.push = "busy"; render();
  try {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
  } catch (e) { console.error(e); }
  S.push = "off"; render();
}

// ---------- install / updates ----------
let swReg;
function checkForUpdate() { if (swReg) swReg.update().catch(() => {}); }
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then((reg) => {
    swReg = reg;
    const offer = (w) => { S.updateReady = () => w.postMessage("skipWaiting"); render(); };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch((e) => console.warn("SW", e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// ---------- boot ----------
(async () => {
  // An invite link (…?join=CODE) is remembered until the person has signed in and joined.
  const q = new URLSearchParams(location.search).get("join");
  if (q) { ls.set("basket.join", q.toLowerCase()); history.replaceState(null, "", location.pathname); }
  S.joinCode = ls.get("basket.join");
  if (S.joinCode) S.authMode = "up";
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  sb.auth.onAuthStateChange((_ev, session) => { S.session = session; });
  if (S.session) await start(); else render();
})();
})();
