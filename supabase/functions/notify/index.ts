// Basket "notify" Edge Function. Deploy with JWT verification OFF.
// POST {"action":"key"} -> {"publicKey": "..."}   (public VAPID key for phones to subscribe)
// POST {"action":"run"} -> sends one bundled notification per person who added items, to the other person's phones.
// Nothing here is secret-revealing: the private key never leaves the database.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const url = Deno.env.get("SUPABASE_URL")!;
function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return keys.default ?? Object.values(keys)[0] as string;
}
const sb = createClient(url, serviceKey(), { auth: { persistSession: false } });
const QUIET_MS = 3 * 60 * 1000;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

let cached: { keys: CryptoKeyPair; publicKey: string } | null = null;
async function vapid() {
  if (cached) return cached;
  const { data, error } = await sb.from("app_keys").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (data) {
    cached = { keys: await webpush.importVapidKeys(data.vapid), publicKey: data.public_key };
    return cached;
  }
  const gen = await webpush.generateVapidKeys({ extractable: true });
  const exported = await webpush.exportVapidKeys(gen);
  const publicKey = await webpush.exportApplicationServerKey(gen);
  const ins = await sb.from("app_keys").insert({ id: 1, vapid: exported, public_key: publicKey });
  if (ins.error && ins.error.code !== "23505") throw ins.error;
  cached = null; // re-read so two first calls agree on one key
  return await vapid();
}

async function run() {
  const { data: items, error } = await sb.from("items")
    .select("id,name,household_id,pending_by,pending_by_user,pending_at").eq("pending", true).eq("notified", false);
  if (error) throw error;
  // One bundle per (household, person who added).
  const groups = new Map<string, NonNullable<typeof items>>();
  for (const it of items ?? []) {
    const k = it.household_id + "|" + (it.pending_by_user ?? it.pending_by ?? "");
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const { data: subs, error: e2 } = await sb.from("push_subscriptions").select("*");
  if (e2) throw e2;
  const { keys } = await vapid();
  const server = await webpush.ApplicationServer.new({ contactInformation: "mailto:noreply@basket-home.app", vapidKeys: keys });
  let sent = 0;
  for (const list of groups.values()) {
    const newest = Math.max(...list.map((i) => new Date(i.pending_at).getTime()));
    if (Date.now() - newest < QUIET_MS) continue; // still adding: wait for a quiet spell
    const { household_id, pending_by_user } = list[0];
    const person = list[0].pending_by || "Someone";
    const names = list.map((i) => i.name);
    const text = (lang: string) => {
      const pt = lang === "pt"; const n = names.length;
      const title = n === 1 ? `${person} ${pt ? "adicionou" : "added"} ${names[0]}` : `${person} ${pt ? "adicionou" : "added"} ${n} ${pt ? "itens" : "items"}`;
      const body = n === 1 ? (pt ? "Toque para abrir a lista" : "Tap to open the list") : names.slice(0, 6).join(", ") + (n > 6 ? "…" : "");
      return { title, body };
    };
    for (const s of subs ?? []) {
      if (s.household_id !== household_id) continue;
      if (pending_by_user ? s.user_id === pending_by_user : s.person === person) continue; // not to the person who added
      try {
        await server.subscribe(s.subscription).pushTextMessage(JSON.stringify(text(s.subscription?.lang ?? "en")), {});
        sent++;
      } catch (err) {
        if (err instanceof webpush.PushMessageError && err.isGone()) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        else console.error("push failed", err);
      }
    }
    await sb.from("items").update({ notified: true }).in("id", list.map((i) => i.id));
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { action } = await req.json().catch(() => ({ action: "" }));
    if (action === "key") return json({ publicKey: (await vapid()).publicKey });
    if (action === "run") return json({ sent: await run() });
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
