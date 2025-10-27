// === KONFIG ===
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwX0b4cFUhK_AAzncaVQV08JuaoL8hwWtWNyqAwiy-CogeEjm4frBoSifNQPTXNEy_Nug/exec";

// === UTIL ===
const $ = (q) => document.querySelector(q);
const listEl = $("#list");
const nameEl = $("#name");
const qtyEl = $("#qty");
const netBadge = $("#netBadge");
const btnAdd = $("#btnAdd");
const btnRefresh = $("#btnRefresh");

let deferredPrompt = null;

// Network indicator
function updateOnlineStatus() {
  const online = navigator.onLine;
  netBadge.textContent = online ? "Online" : "Offline";
  netBadge.className = "badge " + (online ? "" : "offline");
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// PWA install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installCard")?.classList.remove("hidden");
});
document.getElementById("btnInstall")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") document.getElementById("installCard")?.classList.add("hidden");
  deferredPrompt = null;
});

// Render list
function render(items) {
  listEl.innerHTML = "";
  if (!items || !items.length) {
    listEl.innerHTML = '<li><span class="muted">Belum ada data</span></li>';
    return;
  }
  items.forEach((it) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = `<strong>${it.name}</strong><br><span class="muted">Qty: ${it.qty}</span>`;
    const btnDel = document.createElement("button");
    btnDel.textContent = "Del";
    btnDel.onclick = () => deleteItem(it.id);
    li.append(left, btnDel);
    listEl.append(li);
  });
}

// API Calls
async function fetchItems() {
  const res = await fetch(WEB_APP_URL, { method: "GET" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  return res.json().then((d) => d.items || []);
}

async function createItem(name, qty) {
  await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // penting: simple request
    body: JSON.stringify({ action: "create", name, qty: Number(qty || 0) }),
  });
}

async function deleteItem(id) {
  await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "delete", id }),
  });
  loadAndRender();
}

async function loadAndRender() {
  try {
    const items = await fetchItems();
    render(items);
  } catch (e) {
    console.error(e);
    // tampilkan placeholder kalau error
    listEl.innerHTML = `<li><span class="muted">Error: ${e.message}</span></li>`;
  }
}

btnAdd.addEventListener("click", async () => {
  if (!nameEl.value.trim()) return;
  await createItem(nameEl.value.tri
