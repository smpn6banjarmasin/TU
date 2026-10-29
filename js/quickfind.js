/* =====================================================================
   Cari Cepat (Command Palette) — fitur tambahan.
   Membaca data langsung dari localStorage (hanya-baca), TIDAK mengubah
   logika inti aplikasi (app.js). Semua fungsi lama tetap utuh.
   Buka: Ctrl+K / ⌘K, atau tombol kaca pembesar di bilah atas.
   ===================================================================== */
(()=>{
'use strict';
const DATA_KEY='dataSekolahApp_v2';
const $=s=>document.querySelector(s);
const qq=(sel,ctx)=>Array.from((ctx||document).querySelectorAll(sel));
const root=$('#quickFind');
if(!root)return;

const TITLES={home:'Dashboard',murid:'Data Murid',pengingat:'Pengingat Data',pemeriksa:'Pemeriksa Data',kepegawaian:'Pengingat Kepegawaian','cetak-murid':'Cetak Daftar Murid','cetak-guru':'Cetak Daftar Guru','cetak-rekap':'Cetak Rekap',pip:'Penerima PIP','portal-murid':'Portal Murid','cek-nisn':'Cek NISN',tenaga:'Tenaga Kependidikan',walikelas:'Guru & Wali Kelas',alumni:'Alumni & Mutasi',foto:'Foto Kelas',pengaturan:'Pengaturan & Data',update:'Riwayat Update'};
// Halaman tujuan + input pencarian yang akan diisi otomatis setelah memilih data.
const PAGE_INPUT={murid:'studentSearch',walikelas:'teacherSearch',tenaga:'staffSearch',alumni:'alumniSearch',pip:'pipSearch'};
const GROUPS=[
 {key:'murid',page:'murid',label:'Murid',icon:'users',fields:['nama','nis','nisn'],sub:r=>`${r.kelas||'—'} · ${r.status||''}`},
 {key:'walikelas',page:'walikelas',label:'Guru / Wali Kelas',icon:'teacher',fields:['nama','nuptk','nip','mapel'],sub:r=>`${r.mapel||''} ${r.kelas?' · '+r.kelas:''}`},
 {key:'tenaga',page:'tenaga',label:'Tenaga Kependidikan',icon:'briefcase',fields:['nama','jabatan','nik'],sub:r=>r.jabatan||''},
 {key:'alumni',page:'alumni',label:'Alumni & Mutasi',icon:'archive',fields:['nama','nis','nisn'],sub:r=>`${r.kelas||''} · ${r.status||''}`}
];

let cache={len:0,data:null};
function loadData(){
 try{
  const raw=localStorage.getItem(DATA_KEY)||'';
  if(raw&&raw.length===cache.len&&cache.data)return cache.data;
  const d=raw?JSON.parse(raw):null;
  if(d&&Array.isArray(d.students)){cache={len:raw.length,data:d};return d}
 }catch(e){}
 return null;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlight(text,q){
 if(!q)return esc(text);
 const t=String(text??''),i=t.toLowerCase().indexOf(q.toLowerCase());
 if(i<0)return esc(t);
 return esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length));
}
const canGo=page=>{try{return !window.Auth||Auth.can(page)}catch(e){return true}};
function go(page,q){
 try{
  // Isi kotak pencarian halaman tujuan DULU, lalu navigasi agar filter langsung berlaku.
  const inputId=PAGE_INPUT[page];
  if(q&&inputId){const inp=document.getElementById(inputId);if(inp)inp.value=q}
  if(window.navigate){window.navigate(page)}
  else{const b=document.querySelector('#nav [data-page="'+page+'"]');if(b)b.click()}
 }catch(e){}
}

/* ---- status buka/tutup ---- */
let open=false,activeIdx=0,items=[],lastFocus=null;
function isLocked(){return document.body.classList.contains('login-locked')}
function modalOpen(){const m=document.getElementById('modalRoot');return !!(m&&m.firstChild)}

function buildPanel(){
 root.innerHTML=`
  <div class="qf-panel" role="dialog" aria-modal="true" aria-label="Cari cepat">
   <div class="qf-input-wrap"><svg class="i" aria-hidden="true"><use href="#i-search"></use></svg>
    <input type="search" class="qf-input" placeholder="Cari halaman, murid, guru, tendik, alumni…" aria-label="Cari cepat" autocomplete="off">
    <span class="qf-kbd">Esc</span>
   </div>
   <div class="qf-results" role="listbox"></div>
   <div class="qf-foot">
    <span><b>↑↓</b> navigasi</span><span><b>↵</b> pilih</span><span><b>Esc</b> tutup</span>
    <span style="margin-left:auto">Data dibaca dari browser ini</span>
   </div>
  </div>`;
}
function openPanel(){
 if(open||isLocked()||modalOpen())return;
 lastFocus=document.activeElement;
 root.hidden=false;root.classList.add('qf-open');
 open=true;activeIdx=0;items=[];
 buildPanel();
 rebuildList('');
 renderResults('');
 const input=root.querySelector('.qf-input');
 if(input)input.focus();
}
function closePanel(){
 if(!open)return;
 open=false;root.hidden=true;root.classList.remove('qf-open');
 if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}
}

function rebuildList(q){
 items=[];
 const pages=qq('#nav [data-page]').filter(b=>!b.hidden);
 const ql=q.toLowerCase();
 for(const b of pages){
  const page=b.dataset.page,label=(b.textContent||'').trim();
  if(!ql||label.toLowerCase().includes(ql)||(TITLES[page]||'').toLowerCase().includes(ql))
   items.push({type:'page',page,label,sub:'Buka halaman',icon:'home'});
 }
 if(!ql)return;
 const data=loadData();if(!data)return;
 const norm=s=>String(s??'').toLowerCase();
 for(const g of GROUPS){
  if(!canGo(g.page))continue;
  const listKey=g.key==='murid'?'students':g.key==='walikelas'?'teachers':g.key==='tenaga'?'staff':'students';
  const list=Array.isArray(data[listKey])?data[listKey]:[];
  let n=0;
  for(const r of list){
   const hay=g.fields.map(f=>norm(r[f])).join(' ');
   if(!hay.includes(ql))continue;
   items.push({type:'record',page:g.page,label:r.nama||'(tanpa nama)',sub:g.sub(r),icon:g.icon,fields:g.fields});
   if(++n>=5)break;
  }
 }
}
function avatarIcon(icon){return `<span class="qf-icon"><svg class="i" aria-hidden="true"><use href="#i-${icon}"></use></svg></span>`}
function renderResults(q){
 const results=root.querySelector('.qf-results');
 if(!results)return;
 if(!items.length){
  results.innerHTML=`<div class="qf-empty">${q?'Tidak ditemukan untuk “'+esc(q)+'”. Coba kata kunci lain.':'Ketik untuk mencari halaman atau data…'}</div>`;
  return;
 }
 let html='',lastGroup='';
 items.forEach((it,i)=>{
  const grp=it.type==='page'?'Halaman':'Data';
  if(grp!==lastGroup){html+=`<div class="qf-group-title">${grp}</div>`;lastGroup=grp}
  html+=`<button type="button" class="qf-item" data-i="${i}" role="option" aria-selected="false">
    ${avatarIcon(it.icon)}
    <span class="qf-main"><span class="qf-name">${highlight(it.label,q)}</span><span class="qf-sub">${esc(it.sub)}</span></span>
    ${it.type==='page'?`<span class="qf-type">Halaman</span>`:`<span class="qf-type">${esc(grp)}</span>`}
   </button>`;
 });
 results.innerHTML=html;
 const btns=qq('.qf-item',results);
 btns.forEach((b,i)=>{
  b.addEventListener('mouseenter',()=>setActive(i));
  b.addEventListener('click',()=>choose(i));
 });
 setActive(0);
}
function setActive(i){
 if(!items.length)return;
 activeIdx=(i+items.length)%items.length;
 const btns=qq('.qf-item',root.querySelector('.qf-results'));
 btns.forEach((b,j)=>{
  const on=j===activeIdx;
  b.classList.toggle('qf-active',on);
  b.setAttribute('aria-selected',on?'true':'false');
 });
 const cur=btns[activeIdx];
 if(cur&&cur.scrollIntoView)cur.scrollIntoView({block:'nearest'});
}
function choose(i){
 if(i<0||i>=items.length)return;
 const it=items[i];const q=root.querySelector('.qf-input').value.trim();
 closePanel();
 if(it.type==='page')go(it.page,'');
 else go(it.page,q);
}

/* ---- event ---- */
document.addEventListener('keydown',e=>{
 const k=e.key;
 if((k==='k'||k==='K')&&(e.ctrlKey||e.metaKey)){e.preventDefault();open?closePanel():openPanel();return}
 if(!open)return;
 if(k==='Escape'){e.preventDefault();closePanel()}
 else if(k==='ArrowDown'){e.preventDefault();setActive(activeIdx+1)}
 else if(k==='ArrowUp'){e.preventDefault();setActive(activeIdx-1)}
 else if(k==='Enter'){e.preventDefault();choose(activeIdx)}
});
root.addEventListener('click',e=>{if(e.target===root)closePanel()});
root.addEventListener('input',e=>{
 const t=e.target;
 if(t&&t.classList&&t.classList.contains('qf-input')){
  activeIdx=0;rebuildList(t.value);renderResults(t.value);
 }
});
const trigger=document.getElementById('quickFindBtn');
if(trigger)trigger.addEventListener('click',openPanel);
})();
