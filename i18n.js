/* Basket translations. The app is written in English; after each render, text and labels are
   swapped for the chosen language. Exact strings first, then patterns for text with names/numbers.
   To add a language: add a block to DICT and PATTERNS, and a button in LANGS. */
(() => {
const LANGS = [["en", "English"], ["pt", "Português"]];
const stored = (() => { try { return localStorage.getItem("basket.lang"); } catch { return null; } })();
let lang = stored || ((navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en");

const DICT = { pt: {
  // navigation and headers
  "Basket": "Basket", "Offline": "Sem conexão", "To buy": "Comprar", "Catalogue": "Catálogo", "Settings": "Ajustes",
  "Shopping": "Compras", "All shops": "Todas as lojas", "By category": "Por categoria", "By shop": "Por loja",
  "Group by": "Agrupar por", "I'm in": "Estou em", "Any shop": "Qualquer loja", "Other": "Outros",
  "Picked this trip": "Pegos nesta compra", "Finish trip (clear picked)": "Finalizar compra (limpar pegos)",
  "Tap an item when it's in the basket.": "Toque num item quando ele estiver no carrinho.",
  "Tick items in the Catalogue to add them here.": "Marque itens no Catálogo para adicioná-los aqui.",
  "Search or add an item": "Buscar ou adicionar um item", "Scan": "Escanear", "+ New item": "+ Novo item",
  "Your catalogue is empty. Add the things you buy regularly. They stay here for next time.": "Seu catálogo está vazio. Adicione o que você compra sempre. Os itens ficam aqui para a próxima vez.",
  "Tap the circle to put an item on the shopping list. Tap the name to edit it.": "Toque no círculo para colocar um item na lista de compras. Toque no nome para editá-lo.",
  "Update ready. Tap to reload.": "Atualização pronta. Toque para recarregar.",
  "Info mode: tap anything to see what it does. Tap": "Modo de ajuda: toque em qualquer coisa para ver o que faz. Toque em",
  "again to finish.": "de novo para sair.",
  "Leave info mode": "Sair do modo de ajuda", "Info mode: tap anything to learn what it does": "Modo de ajuda: toque em qualquer coisa para saber o que faz",
  "Done, leave info mode": "Pronto, sair do modo de ajuda", "Undo": "Desfazer", "Loading your list…": "Carregando sua lista…", "Loading…": "Carregando…",
  // settings
  "Shops": "Lojas", "Categories": "Categorias", "Edit": "Editar", "+ Add shop": "+ Adicionar loja", "+ Add category": "+ Adicionar categoria",
  "Household": "Casa", "Rename": "Renomear", "Invite someone": "Convidar alguém", "Send them a link to join this list.": "Envie um link para a pessoa entrar nesta lista.",
  "Invite": "Convidar", "Other households": "Outras casas", "Join or create another list, e.g. for work.": "Entre ou crie outra lista, por exemplo para o trabalho.",
  "Open": "Abrir", "You": "Você", "Change name": "Mudar nome", "Notifications": "Notificações", "Turn off": "Desligar", "Turn on": "Ligar",
  "Sign out of this phone": "Sair neste celular", "Sign out": "Sair", "Language": "Idioma",
  "Shop and category order is shared. Match it to the way you walk around the shop.": "A ordem das lojas e categorias é compartilhada. Deixe na ordem em que você anda pela loja.",
  "1 person": "1 pessoa", "Working…": "Aguarde…", "Checking…": "Verificando…",
  "Blocked in your phone's settings. Allow notifications for Basket there, then reopen the app.": "Bloqueadas nos ajustes do celular. Permita notificações para o Basket lá e abra o app de novo.",
  "Add Basket to your Home Screen first (Share > Add to Home Screen), then open it from there.": "Primeiro adicione o Basket à Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra por lá.",
  "This browser can't show notifications.": "Este navegador não mostra notificações.",
  // sheets
  "Close": "Fechar", "Name": "Nome", "Save": "Salvar", "Delete": "Excluir", "New item": "Novo item", "Edit item": "Editar item",
  "Add photo": "Adicionar foto", "Change photo": "Trocar foto", "Remove": "Remover", "e.g. Oat milk": "ex.: Leite de aveia",
  "Category": "Categoria", "Quantity / note": "Quantidade / observação", "e.g. 2 L, the green one": "ex.: 2 L, o de tampa verde",
  "Barcode": "Código de barras", "Optional": "Opcional", "Shops and price (€)": "Lojas e preço (€)",
  "Leave all shops unticked for “Any shop”.": "Deixe todas as lojas desmarcadas para “Qualquer loja”.",
  "Add to catalogue and list": "Adicionar ao catálogo e à lista", "Delete from catalogue": "Excluir do catálogo",
  "Make a new link (stops the old one working)": "Gerar um novo link (o antigo para de funcionar)", "Share link": "Compartilhar link", "Copy link": "Copiar link",
  "Rename household": "Renomear casa", "Your name": "Seu nome", "Edit shop": "Editar loja", "Edit category": "Editar categoria",
  "New shop": "Nova loja", "New category": "Nova categoria",
  // sign in and households
  "Sign in to your shopping list.": "Entre na sua lista de compras.", "Create your account.": "Crie sua conta.",
  "You've been invited to a shared shopping list.": "Você foi convidado para uma lista de compras compartilhada.",
  "You've been invited to a shared shopping list. Create your account.": "Você foi convidado para uma lista de compras compartilhada. Crie sua conta.",
  "You've been invited to a shared shopping list. Sign in to your shopping list.": "Você foi convidado para uma lista de compras compartilhada. Entre na sua conta.",
  "Account": "Conta", "Sign in": "Entrar", "Create account": "Criar conta", "Your first name": "Seu primeiro nome", "Email": "E-mail",
  "Password": "Senha", "Password (at least 8 characters)": "Senha (pelo menos 8 caracteres)", "Forgot password?": "Esqueceu a senha?",
  "Your households": "Suas casas", "Set up your list": "Configure sua lista",
  "A household is one shared list. Everyone in it sees the same items.": "Uma casa é uma lista compartilhada. Todos nela veem os mesmos itens.",
  "Current": "Atual", "Your name in the list": "Seu nome na lista", "Join with an invite": "Entrar com um convite",
  "Invite link or code": "Link ou código do convite", "Paste the link you were sent": "Cole o link que você recebeu", "Join": "Entrar",
  "Or start a new list": "Ou comece uma lista nova", "Household name": "Nome da casa", "e.g. Home": "ex.: Casa",
  "Create household": "Criar casa", "Back to the list": "Voltar para a lista",
  // messages
  "Type your first name.": "Digite seu primeiro nome.", "Type your email and password.": "Digite seu e-mail e senha.",
  "Use a password of at least 8 characters.": "Use uma senha com pelo menos 8 caracteres.",
  "Email or password isn't right.": "E-mail ou senha incorretos.",
  "There's already an account with that email. Sign in instead.": "Já existe uma conta com esse e-mail. Entre em vez disso.",
  "Account created. Check your email to confirm it, then sign in.": "Conta criada. Confirme pelo seu e-mail e depois entre.",
  "Type your email first, then tap Forgot password.": "Digite seu e-mail primeiro e depois toque em Esqueceu a senha.",
  "Couldn't send the reset email. Ask someone in your household to help, or try later.": "Não foi possível enviar o e-mail. Peça ajuda a alguém da sua casa ou tente mais tarde.",
  "If that email has an account, a reset link is on its way.": "Se esse e-mail tiver uma conta, um link para redefinir a senha está a caminho.",
  "Type your name first.": "Digite seu nome primeiro.", "Paste the invite link or code.": "Cole o link ou código do convite.",
  "That invite isn't valid. Ask for a new link.": "Esse convite não é válido. Peça um link novo.",
  "Couldn't do that. Check your signal and try again.": "Não deu certo. Verifique sua conexão e tente de novo.",
  "Couldn't load your households. Check your signal.": "Não foi possível carregar suas casas. Verifique sua conexão.",
  "Couldn't load the list. Close and reopen the app to retry.": "Não foi possível carregar a lista. Feche e abra o app de novo.",
  "Give the item a name.": "Dê um nome ao item.", "Saved": "Salvo", "Deleted": "Excluído", "Type a name.": "Digite um nome.",
  "Couldn't save. Try again.": "Não foi possível salvar. Tente de novo.", "That name already exists.": "Esse nome já existe.",
  "Couldn't save. Check your signal and try again.": "Não foi possível salvar. Verifique sua conexão e tente de novo.",
  "Couldn't upload the photo. Check your signal and try again.": "Não foi possível enviar a foto. Verifique sua conexão e tente de novo.",
  "Tap Delete again to confirm. Items in it move to Other.": "Toque em Excluir de novo para confirmar. Os itens vão para Outros.",
  "Tap Delete again to confirm. Items keep their other shops.": "Toque em Excluir de novo para confirmar. Os itens mantêm as outras lojas.",
  "Couldn't delete. Try again.": "Não foi possível excluir. Tente de novo.", "Tap Delete again to remove it for good.": "Toque em Excluir de novo para remover de vez.",
  "Couldn't save. Try again.": "Não foi possível salvar. Tente de novo.", "You're offline. Changes need a signal.": "Você está sem conexão. As mudanças precisam de internet.",
  "Link copied": "Link copiado", "New link made. The old one no longer works.": "Novo link gerado. O antigo não funciona mais.",
  "Notifications on": "Notificações ligadas", "Couldn't turn on notifications. Try again.": "Não foi possível ligar as notificações. Tente de novo.",
  "Couldn't read that photo. Try another.": "Não foi possível ler essa foto. Tente outra.",
  "Join our shopping list": "Entre na nossa lista de compras", "Join our shared shopping list on Basket:": "Entre na nossa lista de compras compartilhada no Basket:",
  // scanner
  "Scan barcode": "Escanear código", "Starting camera…": "Abrindo a câmera…", "Point the camera at the barcode": "Aponte a câmera para o código de barras",
  "Hold the phone about 15 cm away, with the barcode flat and lit. It scans by itself.": "Segure o celular a uns 15 cm, com o código reto e bem iluminado. Ele lê sozinho.",
  "Or type the number under the barcode": "Ou digite o número embaixo do código", "Use": "Usar",
  "Camera blocked. Allow camera access for this site in your browser settings, or type the number below.": "Câmera bloqueada. Permita a câmera para este site nos ajustes do navegador ou digite o número abaixo.",
  "Couldn't load the scanner. Type the number below instead.": "Não foi possível abrir o leitor. Digite o número abaixo.",
  "Couldn't start the camera. Type the number below instead.": "Não foi possível abrir a câmera. Digite o número abaixo.",
  "Filled in from Open Food Facts. Check the details.": "Preenchido pelo Open Food Facts. Confira os dados.",
  "Found in Open Food Facts. Check the details, pick a category and shops.": "Encontrado no Open Food Facts. Confira os dados e escolha a categoria e as lojas.",
  "Not found in Open Food Facts. Type the name.": "Não encontrado no Open Food Facts. Digite o nome.",
  // info mode
  "Info mode is on": "Modo de ajuda ligado",
  "Tap anything on the screen to see what it does. Nothing will change while info mode is on.": "Toque em qualquer coisa na tela para ver o que faz. Nada muda enquanto o modo de ajuda estiver ligado.",
  "What you need to buy right now. The number is how many items are still to get.": "O que precisa ser comprado agora. O número mostra quantos itens faltam.",
  "Everything you usually buy, kept for good. Tick items here to put them on the shopping list, or add new ones.": "Tudo o que vocês costumam comprar, guardado para sempre. Marque itens aqui para colocá-los na lista ou adicione novos.",
  "Edit the shops and categories, switch whose phone this is, turn notifications on or off, or sign out.": "Edite lojas e categorias, convide pessoas, ligue ou desligue notificações, mude o idioma ou saia.",
  "Shows everything on the list, whichever shop sells it.": "Mostra tudo da lista, em qualquer loja.",
  "Groups the list by category (Dairy, Bakery…), so you can work through the shop aisle by aisle.": "Agrupa a lista por categoria (Laticínios, Padaria…), para você seguir corredor por corredor.",
  "Groups the list by shop. An item sold in two shops shows under both; ticking it once clears it everywhere.": "Agrupa a lista por loja. Um item vendido em duas lojas aparece nas duas; marcar uma vez tira de todas.",
  "Picked item": "Item pego", "Already in the basket. Tap it to put it back on the list if you couldn't get it.": "Já está no carrinho. Toque para voltar à lista se não conseguiu pegar.",
  "Item to buy": "Item para comprar",
  "Tap it once it's in your basket. It moves to \"Picked this trip\". The price shown is the cheapest, or the selected shop's.": "Toque quando estiver no carrinho. Ele vai para \"Pegos nesta compra\". O preço mostrado é o mais barato, ou o da loja escolhida.",
  "Finish trip": "Finalizar compra", "Clears everything you picked from the shopping list. The items stay in the Catalogue for next time.": "Tira da lista tudo o que você pegou. Os itens continuam no Catálogo para a próxima vez.",
  "Need to buy": "Precisa comprar", "Tap the circle to put this item on the shopping list (orange) or take it off (empty).": "Toque no círculo para colocar o item na lista (laranja) ou tirar (vazio).",
  "Item": "Item", "Tap the name to edit it: category, shops, prices, photo, barcode, or delete it. The grey line shows its shops and who added it.": "Toque no nome para editar: categoria, lojas, preços, foto, código de barras, ou excluir. A linha cinza mostra as lojas e quem adicionou.",
  "Add an item": "Adicionar um item", "Creates a new item in the Catalogue and puts it straight on the shopping list.": "Cria um item novo no Catálogo e já coloca na lista de compras.",
  "Scan a barcode": "Escanear um código", "Opens the camera. A known product goes straight on the list; a new one opens with its name and photo filled in where possible.": "Abre a câmera. Um produto conhecido vai direto para a lista; um novo abre com nome e foto preenchidos quando possível.",
  "Reads this item's barcode with the camera, so next time you can scan it onto the list.": "Lê o código de barras do item com a câmera, para da próxima vez você escanear direto para a lista.",
  "Search or add": "Buscar ou adicionar", "Type to find an item. If it isn't there, an \"+ Add\" button appears to create it.": "Digite para achar um item. Se ele não existir, aparece um botão \"+ Adicionar\" para criá-lo.",
  "Update ready": "Atualização pronta", "A new version of Basket is available. Tap to reload and use it.": "Há uma versão nova do Basket. Toque para recarregar e usar.",
  "Summary": "Resumo", "How many items are left and roughly what they'll cost, using the cheapest known price (or the selected shop's).": "Quantos itens faltam e quanto devem custar, pelo preço mais barato conhecido (ou o da loja escolhida).",
  "Reorder": "Reordenar", "Moves this up or down. Order the list the way you walk around the shop; it's shared with the other phone.": "Move para cima ou para baixo. Deixe na ordem em que você anda pela loja; vale para todos da casa.",
  "Rename or delete this shop or category.": "Renomeie ou exclua esta loja ou categoria.",
  "Add shop": "Adicionar loja", "Adds a new shop you can pick when adding items.": "Adiciona uma loja nova para escolher ao adicionar itens.",
  "Add category": "Adicionar categoria", "Adds a new category, e.g. Snacks or Baby.": "Adiciona uma categoria nova, ex.: Lanches ou Bebê.",
  "How you appear to others in this household, e.g. \"added by …\" and in notifications.": "Como você aparece para os outros da casa, ex.: \"adicionado por …\" e nas notificações.",
  "The name of this shared list. The grey line shows who's in it.": "O nome desta lista compartilhada. A linha cinza mostra quem participa.",
  "Gives you a link to send. Whoever opens it can create an account and join this list.": "Gera um link para enviar. Quem abrir pode criar uma conta e entrar nesta lista.",
  "Switch to another list you belong to, or join or create a new one.": "Troque para outra lista sua, ou entre ou crie uma nova.",
  "Signs this phone out. You'll need your email and password to get back in.": "Sai neste celular. Para voltar, use seu e-mail e senha.",
  "Get a notification when the other person adds items to the list.": "Receba uma notificação quando alguém adicionar itens à lista.",
  "Stops notifications on this phone.": "Para as notificações neste celular.",
  "What the item is called. Keep it short so it fits on one line.": "Como o item se chama. Use um nome curto, que caiba numa linha.",
  "Where it's grouped on the list, e.g. Dairy.": "Onde ele fica agrupado na lista, ex.: Laticínios.",
  "Anything that helps the shopper: size, how many, which brand.": "O que ajudar quem vai comprar: tamanho, quantidade, marca.",
  "Shop": "Loja", "Tick every shop that sells this item. Leave them all unticked for \"Any shop\".": "Marque todas as lojas que vendem o item. Deixe todas desmarcadas para \"Qualquer loja\".",
  "Price": "Preço", "Optional. The price at this shop in euro, used for the estimated total.": "Opcional. O preço nesta loja, em euro, usado no total estimado.",
  "The number under the barcode. Lets you scan this item onto the list.": "O número embaixo do código de barras. Permite escanear o item para a lista.",
  "Photo": "Foto", "Take or choose a picture, so the shopper knows exactly which product to get.": "Tire ou escolha uma foto, para quem for comprar saber exatamente qual produto pegar.",
  "Remove photo": "Remover foto", "Removes the photo from this item.": "Remove a foto deste item.",
  "Saves the item. A new item also goes straight on the shopping list.": "Salva o item. Um item novo também vai direto para a lista.",
  "Removes the item from the Catalogue for good. Tap twice to confirm.": "Remove o item do Catálogo de vez. Toque duas vezes para confirmar.",
  "Closes this without saving.": "Fecha sem salvar.", "The cheapest known price, or the selected shop's price.": "O preço mais barato conhecido, ou o da loja escolhida.",
  "Info mode": "Modo de ajuda", "Tap a button, an item or a box to see what it does.": "Toque num botão, item ou campo para ver o que faz.",
  "Choose the language for this phone.": "Escolha o idioma deste celular.",
  // ago
  "just now": "agora mesmo", "yesterday": "ontem",
}};

const PATTERNS = { pt: [
  [/^€(\d+)\.(\d{2})$/, (m) => "€" + m[1] + "," + m[2]],
  [/^e\.g\. (.+)$/, (m) => "ex.: " + m[1]],
  [/^(\d+) items?$/, (m) => m[1] + (m[1] === "1" ? " item" : " itens")],
  [/^about (€[\d.]+)$/, (m) => "cerca de " + m[1].replace(".", ",")],
  [/^about (€[\d.]+) at (.+)$/, (m) => "cerca de " + m[1].replace(".", ",") + " em " + m[2]],
  [/^at (.+)$/, (m) => "em " + m[1]],
  [/^(\d+) on the list$/, (m) => m[1] + " na lista"],
  [/^Nothing to buy at (.+)\. Tick items in the Catalogue to add them here\.$/, (m) => "Nada para comprar em " + m[1] + ". Marque itens no Catálogo para adicioná-los aqui."],
  [/^Nothing to buy\. Tick items in the Catalogue to add them here\.$/, () => "Nada para comprar. Marque itens no Catálogo para adicioná-los aqui."],
  [/^\+ Add “(.+)”$/, (m) => "+ Adicionar “" + m[1] + "”"],
  [/^added by (.+), (.+)$/, (m) => "adicionado por " + m[1] + ", " + ago(m[2])],
  [/^(\d+) people$/, (m) => m[1] + " pessoas"],
  [/^You're in (\d+)\. Switch, or join or create another\.$/, (m) => "Você está em " + m[1] + ". Troque, ou entre ou crie outra."],
  [/^as (.+)$/, (m) => "como " + m[1]],
  [/^Send this link to the person you want to share “(.+)” with\. They open it, create an account, and they're in\.$/, (m) => "Envie este link para quem você quer que participe de “" + m[1] + "”. A pessoa abre, cria uma conta e já entra."],
  [/^On\. You'll hear when (.+) adds items\.$/, (m) => "Ligadas. Você será avisado quando " + m[1].replace(/ or /g, " ou ") + " adicionar itens."],
  [/^Get a notification when (.+) adds items\.$/, (m) => "Receba uma notificação quando " + (m[1] === "someone else" ? "outra pessoa" : m[1].replace(/ or /g, " ou ")) + " adicionar itens."],
  [/^(.+) picked$/, (m) => m[1] + " pego"],
  [/^(\d+) items cleared\. They stay in the Catalogue\.$/, (m) => m[1] + " itens retirados. Eles continuam no Catálogo."],
  [/^(.+) added to the list$/, (m) => m[1] + " adicionado à lista"],
  [/^(.+) is on the list$/, (m) => m[1] + " está na lista"],
  [/^Looking up (.+)…$/, (m) => "Buscando " + m[1] + "…"],
  [/^“(.+)” is already in the catalogue\.$/, (m) => "“" + m[1] + "” já está no catálogo."],
  [/^That barcode already belongs to “(.+)”\.$/, (m) => "Esse código de barras já é de “" + m[1] + "”."],
  [/^I'm in (.+)$/, (m) => "Estou em " + m[1]],
  [/^Shows only what you can buy in (.+), plus items marked "Any shop"\. Prices and the total switch to this shop\.$/, (m) => "Mostra só o que dá para comprar em " + m[1] + ", mais os itens de \"Qualquer loja\". Preços e total passam a ser desta loja."],
  [/^Couldn't (create the account|sign in)\. Supabase said: (.+)$/, (m) => "Não foi possível " + (m[1] === "sign in" ? "entrar" : "criar a conta") + ". O Supabase disse: " + m[2]],
  [/^Couldn't (create the account|sign in)\. Check your signal and try again\.$/, (m) => "Não foi possível " + (m[1] === "sign in" ? "entrar" : "criar a conta") + ". Verifique sua conexão e tente de novo."],
  [/^New accounts are switched off\./, () => "Novas contas estão desativadas. Peça para quem administra o Basket liberar."],
  [/^Supabase couldn't send a confirmation email\./, () => "Não foi possível enviar o e-mail de confirmação. Peça para quem administra o Basket verificar."],
  [/^(Put back|Picked) (.+)$/, (m) => (m[1] === "Picked" ? "Pego: " : "Devolver: ") + m[2]],
  [/^(Add to|Remove from) list: (.+)$/, (m) => (m[1] === "Add to" ? "Colocar na lista: " : "Tirar da lista: ") + m[2]],
  [/^Move (.+) (up|down)$/, (m) => "Mover " + m[1] + (m[2] === "up" ? " para cima" : " para baixo")],
  [/^Price at (.+)$/, (m) => "Preço em " + m[1]],
]};

function ago(s) {
  if (s === "just now") return "agora mesmo";
  if (s === "yesterday") return "ontem";
  let m;
  if ((m = s.match(/^(\d+) min ago$/))) return "há " + m[1] + " min";
  if ((m = s.match(/^(\d+) h ago$/))) return "há " + m[1] + " h";
  if ((m = s.match(/^(\d+) days ago$/))) return "há " + m[1] + " dias";
  return s;
}
function tr(s) {
  if (lang === "en" || s == null) return s;
  const raw = String(s); const t = raw.trim(); if (!t) return raw;
  const d = DICT[lang] || {};
  let out = d[t];
  if (out === undefined) {
    for (const [re, fn] of PATTERNS[lang] || []) { const m = t.match(re); if (m) { out = fn(m); break; } }
  }
  if (out === undefined && t.includes(" · ")) {
    // "2 L · Lidl · Aldi · added by Sam, 2 h ago": translate each part on its own
    const parts = t.split(" · "); const tp = parts.map((p) => tr(p));
    if (tp.some((p, i) => p !== parts[i])) out = tp.join(" · ");
  }
  if (out === undefined) return raw;
  return raw.replace(t, out);
}
function translateDom(root) {
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  if (lang === "en" || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (n.parentElement && n.parentElement.closest("[data-notr]")) continue;
    const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v;
  }
  root.querySelectorAll("[placeholder],[aria-label],[title]").forEach((el) => {
    for (const a of ["placeholder", "aria-label", "title"]) if (el.hasAttribute(a)) { const v = tr(el.getAttribute(a)); if (v !== el.getAttribute(a)) el.setAttribute(a, v); }
  });
}
// Starting categories for a new household, in the chosen language.
const DEFAULT_CATS = { pt: { "Veg & Fruit": "Hortifruti", "Dairy": "Laticínios", "Meat & Fish": "Carnes e peixes", "Bakery": "Padaria",
  "Cupboard": "Mercearia", "Frozen": "Congelados", "Drinks": "Bebidas", "Household": "Limpeza", "Toiletries": "Higiene" } };

window.I18N = {
  LANGS, tr, translateDom, DEFAULT_CATS,
  get lang() { return lang; },
  set(l) { lang = l; try { localStorage.setItem("basket.lang", l); } catch {} },
};
})();
