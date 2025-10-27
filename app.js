// === KONFIG: GANTI URL ANDA DI SINI ===
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwX0b4cFUhK_AAzncaVQV08JuaoL8hwWtWNyqAwiy-CogeEjm4frBoSifNQPTXNEy_Nug/exec";

// === UTIL ===
const $ = (q) => document.querySelector(q);
const listEl = $("#list");
const nameEl = $("#name");
const qtyEl = $("#qty");
const btnAdd = $("#btnAdd");
const btnRefresh = $("#btnRefresh");
const netBadge = $("#netBadge");
const errEl = $("#err");
const btnInstall = $("#btnInstall");

const CACHE_ITEMS_KEY = "items_cache_v1";
const OUTBOX_KEY = "outbox_v1";

function setErr(msg) { errEl.textContent = msg; setTimeout(()=> errEl.textContent = "", 6000); }
function saveCache(items){ localStorage.setItem(CACHE_ITEMS_KEY, JSON.stringify(items)); }
function loadCache(){ try{ return JSON.parse(localStorage.getItem(CACHE_ITEMS_KEY)||"[]"); }catch{ return []; } }
function saveOutbox(arr){ localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr)); }
function loadOutbox(){ try{ return JSON.parse(localStorage.getItem(OUTBOX_KEY)||"[]"); }catch{ return []; } }

// Network badge
function updateOnlineStatus() {
  const online = navigator.onLine;
  netBadge.textContent = online ? "Online" : "Offline";
  netBadge.className = "badge " + (online ? "" : "offline");
}
addEventListener("online", async () => { updateOnlineStatus(); await processOutbox(); await loadAndRender(); });
addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// Install prompt (PWA)
let deferredPrompt = null;
addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.style.display = "inline-block";
});
btnInstall.addEventListener("click", async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  btnInstall.style.display = "none";
  deferredPrompt = null;
});

// Render
function render(items) {
  listEl.innerHTML = "";
  if (!items || !items.length) {
    listEl.innerHTML = '<li><span class="muted">Belum ada data</span></li>';
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = `<strong>${escapeHtml(it.name||"")}</strong><br><span class="muted">Qty: ${it.qty} • ${it.updated_at||""}</span>`;
    const del = document.createElement("button");
    del.textContent = "Del";
    del.className = "ghost";
    del.onclick = () => deleteItem(it.id);
    li.append(left, del);
    listEl.append(li);
  }
}
function escapeHtml(s){ return s?.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) || ""; }

// === API ===
async function fetchItems() {
  const res = await fetch(WEB_APP_URL, { method: "GET" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  return data.items || [];
}
async function postJson(bodyObj) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(bodyObj)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${res.status}`);
  let j; try { j = JSON.parse(text); } catch { throw new Error("Server tidak mengembalikan JSON"); }
  if (j.ok === false) throw new Error(j.error || "Operasi gagal");
  return j;
}

// === Offline queue ===
async function processOutbox(){
  if (!navigator.onLine) return;
  const outbox = loadOutbox();
  if (!outbox.length) return;
  const remaining = [];
  for (const job of outbox) {
    try { await postJson(job); }
    catch(e){ remaining.push(job); }
  }
  saveOutbox(remaining);
}

async function createItem(name, qty){
  const job = { action:"create", name, qty:Number(qty||0) };
  if (!navigator.onLine) {
    const box = loadOutbox(); box.push(job); saveOutbox(box);
    setErr("Offline: disimpan di antrian, akan dikirim saat online.");
    return;
  }
  await postJson(job);
}
async function deleteItem(id){
  const job = { action:"delete", id };
  if (!navigator.onLine) {
    const box = loadOutbox(); box.push(job); saveOutbox(box);
    setErr("Offline: penghapusan diantri, akan diproses saat online.");
    return;
  }
  await postJson(job);
  await loadAndRender();
}

// === Load ===
async function loadAndRender(){
  try{
    const items = await fetchItems();
    render(items);
    saveCache(items);
  }catch(e){
    // fallback cache saat gagal (mis. offline)
    render(loadCache());
  }
}

// === UI events ===
btnAdd.addEventListener("click", async ()=>{
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  try{
    await createItem(name, qtyEl.value);
    nameEl.value = ""; qtyEl.value = "";
    await processOutbox();
    await loadAndRender();
  }catch(e){ setErr(e.message); }
});
btnRefresh.addEventListener("click", loadAndRender);

// Service worker
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}

// First load
loadAndRender();
