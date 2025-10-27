// === KONFIG: GANTI URL ANDA DI SINI ===
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwX0b4cFUhK_AAzncaVQV08JuaoL8hwWtWNyqAwiy-CogeEjm4frBoSifNQPTXNEy_Nug/exec";

// === QUERY ===
const $ = (q) => document.querySelector(q);
const listEl = $("#list");
const nameEl = $("#name");
const qtyEl = $("#qty");
const netBadge = $("#netBadge");
const btnAdd = $("#btnAdd");
const btnRefresh = $("#btnRefresh");
const errEl = $("#err");
const topLoading = $("#topLoading");
const listLoading = $("#listLoading");

let loadingCount = 0;
function setLoading(on, scope = "top") {
  loadingCount += on ? 1 : -1;
  if (loadingCount < 0) loadingCount = 0;
  const el = scope === "list" ? listLoading : topLoading;
  el.innerHTML = loadingCount > 0 ? '<span class="spinner"></span>' : '';
}
function setListLoading(on) {
  listLoading.innerHTML = on ? '<span class="spinner"></span>' : '';
}
function showError(msg) {
  errEl.textContent = String(msg || "");
  if (msg) setTimeout(()=> errEl.textContent = "", 5000);
}

// Network badge
function updateOnlineStatus() {
  const online = navigator.onLine;
  netBadge.textContent = online ? "Online" : "Offline";
  netBadge.className = "badge " + (online ? "" : "offline");
}
addEventListener("online", updateOnlineStatus);
addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// ===== Rendering =====
function liTemplate(item) {
  const li = document.createElement("li");
  li.className = "enter";
  const left = document.createElement("div");
  const right = document.createElement("div");
  right.className = "actions";

  left.innerHTML = `<div><strong>${escapeHtml(item.name||"")}</strong></div>
                    <div class="muted">Qty: ${item.qty} • ${item.updated_at||""}</div>`;

  const del = document.createElement("button");
  del.className = "ghost";
  del.textContent = "Del";
  del.onclick = () => deleteItem(item.id);

  right.append(del);
  li.append(left, right);
  // small next-frame to trigger CSS transition
  requestAnimationFrame(()=> li.classList.add("show"));
  return li;
}

function render(items) {
  listEl.innerHTML = "";
  if (!items || !items.length) {
    listEl.innerHTML = `<li class="muted" style="padding:10px 8px;">Belum ada data</li>`;
    return;
  }
  for (const it of items) listEl.append(liTemplate(it));
}

function showSkeletonList(rows=4) {
  listEl.innerHTML = "";
  for (let i=0;i<rows;i++){
    const li = document.createElement("li");
    li.className = "loadingRow";
    li.innerHTML = `<div class="skeleton" style="width:100%;">
                      <div class="s1"></div><div class="s2"></div>
                    </div>`;
    listEl.append(li);
  }
}

function escapeHtml(s){ return s?.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) || ""; }

// ===== API =====
async function fetchItems() {
  const res = await fetch(WEB_APP_URL, { method: "GET" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  return data.items || [];
}
async function postSimple(body) {
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${res.status}`);
  let j; try { j = JSON.parse(text); } catch { throw new Error("Server tidak mengembalikan JSON"); }
  if (j.ok === false) throw new Error(j.error || "Operasi gagal");
  return j;
}

// ===== Data flow =====
let currentItems = []; // cache dalam memori untuk optimistic updates

async function loadAndRender() {
  setListLoading(true);
  showSkeletonList();
  try {
    const items = await fetchItems();
    currentItems = items;
    render(items);
  } catch (e) {
    showError(e.message);
  } finally {
    setListLoading(false);
  }
}

async function createItemOptimistic(name, qty) {
  // 1) Optimistic: sisipkan dummy row
  const tempId = `temp-${Date.now()}`;
  const optimistic = { id: tempId, name, qty: Number(qty||0), updated_at: "…" };
  currentItems = [optimistic, ...currentItems];
  render(currentItems);

  // 2) Kirim ke server
  setLoading(true);
  try {
    const resp = await postSimple({ action:"create", name, qty:Number(qty||0) });
    // 3) Replace temp row dengan data “asli”
    currentItems = currentItems.map(x => x.id === tempId ? {...x, id: resp.id, updated_at: new Date().toISOString()} : x);
    render(currentItems);
  } catch (e) {
    // Rollback
    currentItems = currentItems.filter(x => x.id !== tempId);
    render(currentItems);
    showError(e.message);
  } finally {
    setLoading(false);
  }
}

async function deleteItem(id) {
  // Optimistic remove
  const backup = currentItems.slice();
  currentItems = currentItems.filter(x => x.id !== id);
  render(currentItems);

  setLoading(true);
  try {
    await postSimple({ action:"delete", id });
    // sukses: biarkan hasil render optimistic
  } catch (e) {
    // rollback
    currentItems = backup;
    render(currentItems);
    showError(e.message);
  } finally {
    setLoading(false);
  }
}

// ===== UI events =====
btnAdd.addEventListener("click", async () => {
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  btnAdd.disabled = true;
  try {
    await createItemOptimistic(name, qtyEl.value);
    nameEl.value = ""; qtyEl.value = "";
  } finally {
    btnAdd.disabled = false;
  }
});

btnRefresh.addEventListener("click", () => {
  loadAndRender();
});

// ===== First load =====
loadAndRender();
