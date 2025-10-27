// === KONFIG ===
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwX0b4cFUhK_AAzncaVQV08JuaoL8hwWtWNyqAwiy-CogeEjm4frBoSifNQPTXNEy_Nug/exec";

document.addEventListener('DOMContentLoaded', () => {
  // ambil elemen SETELAH DOM siap
  const $ = (q) => document.querySelector(q);
  const listEl = $("#list");
  const nameEl = $("#name");
  const qtyEl = $("#qty");
  const netBadge = $("#netBadge");
  const btnAdd = $("#btnAdd");
  const btnRefresh = $("#btnRefresh");
  const errEl = $("#err");
  const topLoading = document.getElementById("topLoading");
  const listLoading = document.getElementById("listLoading");

  // helper loading
  let loadingCount = 0;
  function setLoading(on, scope="top"){
    loadingCount += on ? 1 : -1; if (loadingCount < 0) loadingCount = 0;
    const el = scope === "list" ? listLoading : topLoading;
    if (el) el.innerHTML = loadingCount > 0 ? '<span class="spinner"></span>' : '';
  }
  function setListLoading(on){ if (listLoading) listLoading.innerHTML = on ? '<span class="spinner"></span>' : ''; }
  function showError(msg){ if (errEl) { errEl.textContent = String(msg||""); setTimeout(()=> errEl.textContent="", 4000);} }

  // badge jaringan
  function updateOnlineStatus(){
    if (!netBadge) return;
    const online = navigator.onLine;
    netBadge.textContent = online ? "Online" : "Offline";
    netBadge.className = "badge " + (online ? "" : "offline");
  }
  addEventListener("online", updateOnlineStatus);
  addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // API
  async function fetchItems(){
    const res = await fetch(WEB_APP_URL);
    if (!res.ok) throw new Error(`GET ${res.status}`);
    const data = await res.json();
    return data.items || [];
  }
  async function postSimple(body){
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

  // render
  function escapeHtml(s){ return s?.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) || ""; }
  function liTemplate(item){
    const li = document.createElement("li");
    li.className = "enter";
    const left = document.createElement("div");
    left.innerHTML = `<div><strong>${escapeHtml(item.name||"")}</strong></div>
                      <div class="muted">Qty: ${item.qty} • ${item.updated_at||""}</div>`;
    const right = document.createElement("div");
    const del = document.createElement("button");
    del.className = "ghost"; del.textContent = "Del";
    del.onclick = () => deleteItem(item.id);
    right.append(del);
    li.append(left, right);
    requestAnimationFrame(()=> li.classList.add("show"));
    return li;
  }
  function render(items){
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items || !items.length){
      listEl.innerHTML = `<li class="muted" style="padding:10px 8px;">Belum ada data</li>`;
      return;
    }
    for (const it of items) listEl.append(liTemplate(it));
  }
  function showSkeleton(rows=4){
    if (!listEl) return;
    listEl.innerHTML = "";
    for (let i=0;i<rows;i++){
      const li = document.createElement("li");
      li.className = "loadingRow";
      li.innerHTML = `<div class="skeleton" style="width:100%;"><div class="s1"></div><div class="s2"></div></div>`;
      listEl.append(li);
    }
  }

  // data flow
  let currentItems = [];
  async function loadAndRender(){
    setListLoading(true); showSkeleton();
    try { currentItems = await fetchItems(); render(currentItems); }
    catch(e){ showError(e.message); }
    finally { setListLoading(false); }
  }
  async function createItemOptimistic(name, qty){
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, name, qty:Number(qty||0), updated_at:"…" };
    currentItems = [optimistic, ...currentItems]; render(currentItems);
    setLoading(true);
    try {
      const resp = await postSimple({ action:"create", name, qty:Number(qty||0) });
      currentItems = currentItems.map(x => x.id===tempId ? {...x, id:resp.id, updated_at:new Date().toISOString()} : x);
      render(currentItems);
    } catch(e) {
      currentItems = currentItems.filter(x => x.id!==tempId);
      render(currentItems); showError(e.message);
    } finally { setLoading(false); }
  }
  async function deleteItem(id){
    const backup = currentItems.slice();
    currentItems = currentItems.filter(x => x.id!==id); render(currentItems);
    setLoading(true);
    try { await postSimple({ action:"delete", id }); }
    catch(e){ currentItems = backup; render(currentItems); showError(e.message); }
    finally { setLoading(false); }
  }
  // expose for liTemplate
  window.deleteItem = deleteItem;

  // events (aman karena DOM sudah siap)
  if (btnAdd) btnAdd.addEventListener("click", async ()=>{
    const name = nameEl?.value.trim(); if (!name) { nameEl?.focus(); return; }
    btnAdd.disabled = true;
    try { await createItemOptimistic(name, qtyEl?.value); nameEl.value=""; if(qtyEl) qtyEl.value=""; }
    finally { btnAdd.disabled = false; }
  });
  if (btnRefresh) btnRefresh.addEventListener("click", loadAndRender);

  // first load
  loadAndRender();
});
