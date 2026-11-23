import {CATEGORIES, STATUSES, SOURCES, icons, escapeHtml as h, safeUrl, statusLabel, sourceLabel, displayDate, validateEntry, imageFromFile} from './utils.js';
import {localStore} from './storage.js';

const store=localStore;
const root=document.querySelector('#app');
const state={view:'home',category:'全部',status:'all',query:'',items:[],chosen:null,editing:null,photo:null,menu:false,busy:false,photoPending:false,loadError:'',pendingShare:safeUrl(new URLSearchParams(location.search).get('url'))};

const svg={
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
  plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>',
  dots:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
  link:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5a5 5 0 0 0 7 0l2.6-2.6a5 5 0 0 0-7-7L10.5 6.5M14.5 9.5a5 5 0 0 0-7 0l-2.6 2.6a5 5 0 0 0 7 7l1.5-1.6"/></svg>',
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10H3zM9 21v-7h6v7"/></svg>',
  edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M13 6l5 5M10 18l-4 1 1-4L17 5a2 2 0 0 1 3 3z"/></svg>'
};
function linkButton(text,action,extra=''){return `<button type="button" data-action="${action}" class="${extra}">${text}</button>`;}
function iconButton(action,label,body,extra=''){return `<button class="icon-btn ${extra}" type="button" data-action="${action}" aria-label="${h(label)}" title="${h(label)}">${body}</button>`;}
function photoMarkup(item,alt,placeholder){
  if(item.image_url&&/^(data:image\/jpeg;base64,|blob:)/.test(item.image_url))return `<img src="${h(item.image_url)}" alt="${h(alt)}"/>`;
  if(item.photo)return `<img data-photo-id="${h(item.id)}" alt="${h(alt)}" hidden/>${placeholder}`;
  return placeholder;
}
let observer;
function hydratePhotos(){
  // Local IndexedDB records already contain their image data URL.
}
function entryCard(item){
  const image=photoMarkup(item,item.title,`<div class="placeholder">${icons[item.category]||'🍓'}</div>`);
  return `<button type="button" class="food-card" data-open="${h(item.id)}" aria-label="查看 ${h(item.title)}">
    <div class="card-picture">${image}<span class="picture-state">${h(statusLabel(item.status))}</span></div>
    <div class="card-body"><h3>${h(item.title)}</h3><p>${h(item.category)} <span class="bullet">·</span> ${h(item.merchant_name||sourceLabel(item.source_type))}</p></div>
  </button>`;
}
function filtered(){const q=state.query.trim().toLocaleLowerCase();return state.items.filter(i=>
  (state.category==='全部'||i.category===state.category)&&(state.status==='all'||i.status===state.status)&&
  (!q||[i.title,i.category,i.merchant_name,i.notes,i.recipe].some(x=>(x||'').toLocaleLowerCase().includes(q)))
);}
function renderCards(){
  const items=filtered();
  const grid=root.querySelector('#food-grid'); if(!grid)return;
  const counter=root.querySelector('#result-count'); if(counter)counter.textContent=`${items.length} 条收藏`;
  grid.innerHTML=items.length?items.map(entryCard).join(''):
    `<div class="empty-state">${state.loadError?`<h3>暂时无法加载收藏</h3><p>${h(state.loadError)}</p>${linkButton('重新加载','refresh','btn btn-primary')}`:`<img src="./assets/icon-192.png" alt="" width="64" height="64"/><h3>${state.items.length?'没有符合条件的收藏':'还没有收藏'}</h3>${state.items.length?linkButton('清除筛选','reset','btn btn-ghost'):linkButton('添加第一条收藏','new','btn btn-primary')}`}</div>`;
  hydratePhotos();
}
function header(inner=false){
  return `<header class="topbar"><div class="brand-wrap">${inner?iconButton('home','返回首页',svg.arrow):'<img class="brand-icon" src="./assets/icon-192.png" width="36" height="36" alt=""/>'}
     <div class="brand"><strong>好好吃</strong></div></div>
     <div class="top-actions">${inner?'':iconButton('toggle-menu','打开设置',svg.dots)}${!inner?linkButton(`${svg.plus}<span>收藏美食</span>`,'new','btn btn-primary add-button'):''}</div></header>`;
}
function home(){
  return `${header()}<main class="page home-page">
  <div class="collection-head"><h1>我的收藏</h1><span class="count" id="result-count" aria-live="polite"></span></div>
  <label class="search-box">${svg.search}<input type="search" id="search-input" placeholder="搜索美食、店名或做法" autocomplete="off" value="${h(state.query)}" aria-label="搜索美食" /></label>
  <div class="toolbar"><div class="category-list" role="group" aria-label="按品类筛选">${['全部',...CATEGORIES].map(c=>`<button data-category="${h(c)}" type="button" aria-pressed="${state.category===c}" class="chip ${state.category===c?'active':''}">${h(c)}</button>`).join('')}</div></div>
  <div class="secondary-toolbar"><div class="status-list" role="group" aria-label="按状态筛选">${[{value:'all',label:'全部状态'},...STATUSES].map(s=>`<button type="button" data-status="${s.value}" aria-pressed="${state.status===s.value}" class="status-chip ${state.status===s.value?'active':''}">${s.label}</button>`).join('')}</div></div>
  <section class="food-grid" id="food-grid" aria-label="美食收藏列表"></section>
  </main>${footer()}${state.menu?settingsMenu():''}`;
}
function options(list, selected){return list.map(v=>`<option value="${h(typeof v==='string'?v:v.value)}" ${(typeof v==='string'?v:v.value)===selected?'selected':''}>${h(typeof v==='string'?v:v.label)}</option>`).join('');}
function form(){const e=state.editing||{};return `${header(true)}<main class="page edit-page"><div class="page-intro"><h1>${e.id?'编辑收藏':'添加收藏'}</h1></div>
  <form id="entry-form" class="entry-form" novalidate>
    <label class="photo-field" for="photo-input"><div class="photo-preview" id="photo-preview">${photoMarkup(e,'当前照片','<span class="photo-empty" aria-hidden="true"></span>')}<strong>${e.image_url||e.photo?'更换照片':'＋ 添加美食照片'}</strong></div><input type="file" id="photo-input" name="photo" aria-label="选择美食照片" accept="image/*,.heic,.heif" /></label>
    <div class="form-grid"><label class="field full"><span>美食名称 <b>*</b></span><input name="title" maxlength="100" required placeholder="比如：奶油蘑菇意面" value="${h(e.title||'')}" /></label>
      <label class="field"><span>品类 <b>*</b></span><select name="category">${options(CATEGORIES,e.category||'家常菜')}</select></label>
      <label class="field"><span>目前状态</span><select name="status">${options(STATUSES,e.status||'want_to_make')}</select></label>
      <label class="field"><span>来源</span><select name="source_type">${options(SOURCES,e.source_type||'inspiration')}</select></label>
      <label class="field"><span>商家 / 店名（可选）</span><input name="merchant_name" maxlength="140" placeholder="例如：某某面包房" value="${h(e.merchant_name||'')}" /></label>
      <label class="field full"><span>原始链接（可选）</span><input name="source_url" type="url" inputmode="url" placeholder="https://..." value="${h(e.source_url||state.pendingShare||'')}" /></label>
      <label class="field full"><span>做法 / 菜谱（可选）</span><textarea name="recipe" rows="4" placeholder="食材、步骤，或者下次想试的做法">${h(e.recipe||'')}</textarea></label>
      <label class="field full"><span>自己的小备注（可选）</span><textarea name="notes" rows="3" placeholder="好吃在哪里？想改进什么？">${h(e.notes||'')}</textarea></label>
      <label class="field full"><span>价格 / 人均（可选）</span><input name="price_note" maxlength="120" placeholder="例如：约 ¥45" value="${h(e.price_note||'')}" /></label></div>
    <div class="form-footer"><button class="btn btn-ghost" type="button" data-action="cancel">取消</button><button class="btn btn-primary" id="save-btn" type="submit">保存收藏 ${svg.plus}</button></div>
  </form></main>`;}
function detail(){const e=state.chosen;if(!e)return home();const src=photoMarkup(e,e.title,`<div class="detail-blank">${icons[e.category]||'🍓'}</div>`);
  return `${header(true)}<main class="page detail-page"><div class="detail-layout"><div class="detail-cover">${src}</div><article class="detail-copy"><div class="detail-tags"><span class="tag tag-primary">${h(e.category)}</span><span class="tag">${h(statusLabel(e.status))}</span><span class="tag">${h(sourceLabel(e.source_type))}</span></div><h1>${h(e.title)}</h1><p class="muted">收藏于 ${h(displayDate(e.created_at))}</p>
    ${e.merchant_name?`<div class="detail-piece"><span class="piece-label">商家 / 店名</span><strong>${h(e.merchant_name)}</strong></div>`:''}
    ${e.price_note?`<div class="detail-piece"><span class="piece-label">价格参考</span><strong>${h(e.price_note)}</strong></div>`:''}
    ${e.recipe?`<div class="detail-piece"><span class="piece-label">做法 / 菜谱</span><div class="long-text">${h(e.recipe)}</div></div>`:''}
    ${e.notes?`<div class="detail-piece"><span class="piece-label">我的备注</span><div class="long-text">${h(e.notes)}</div></div>`:''}
    ${safeUrl(e.source_url)?`<a class="source-link" href="${h(safeUrl(e.source_url))}" target="_blank" rel="noopener noreferrer">${svg.link} 打开原始收藏链接 ↗</a>`:''}
    <div class="detail-actions"><button class="btn btn-primary" type="button" data-action="edit">${svg.edit} 编辑这条</button><button class="btn btn-danger" type="button" data-action="delete">删除</button></div>
  </article></div></main>${footer()}`;
}
function footer(){return `<nav class="mobile-nav" aria-label="主导航"><button type="button" data-action="home" class="${state.view==='home'?'selected':''}">${svg.home}<span>收藏</span></button><button type="button" data-action="new" class="mobile-plus" aria-label="添加收藏">${svg.plus}</button><button type="button" data-action="toggle-menu">${svg.dots}<span>设置</span></button></nav>`;}
function settingsMenu(){
  return `<dialog class="settings-panel" aria-label="收藏设置"><div class="settings-header"><h2>设置</h2>${iconButton('close-menu','关闭','✕')}</div><p class="muted">收藏和照片只保存在这台设备的 Safari 中，不会自动同步到其他设备。</p><div class="settings-actions"><button type="button" class="menu-action" data-action="export">导出本机备份（含照片）</button></div></dialog>`;
}
function showToast(message){let node=document.querySelector('.toast');node?.remove();node=document.createElement('div');node.className='toast';node.role='status';node.textContent=message;document.body.append(node);setTimeout(()=>node.remove(),3800);}
function render(){
  if(state.view==='detail'&&!state.chosen)state.view='home';
  const categoryScroll=root.querySelector('.category-list')?.scrollLeft||0;
  root.innerHTML=(state.view==='form'?form():state.view==='detail'?detail():home())+(state.view!=='home'&&state.menu?settingsMenu():'');
  const bar=root.querySelector('.category-list');if(bar)bar.scrollLeft=categoryScroll;
  if(state.view==='home')renderCards();else hydratePhotos();
  const dialog=root.querySelector('dialog');
  if(dialog){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();state.menu=false;render();});}
}
async function load(){state.items=await store.list();state.loadError='';if(state.chosen)state.chosen=state.items.find(x=>x.id===state.chosen.id)||null;render();}
function startNew(){state.view='form';state.editing=null;state.draftId=crypto.randomUUID();state.photo=null;state.menu=false;render();window.scrollTo(0,0);}
function startEdit(){if(!state.chosen)return;state.view='form';state.editing=state.chosen;state.photo=null;render();window.scrollTo(0,0);}
function goHome(){state.view='home';state.chosen=null;state.editing=null;state.pendingShare='';history.replaceState(null,'',location.pathname);render();window.scrollTo(0,0);}
async function saveForm(formElement){
  const data=new FormData(formElement),current=state.editing||{};
  const record=validateEntry({
    title:String(data.get('title')||''),category:String(data.get('category')||'家常菜'),status:String(data.get('status')||'want_to_make'),
    source_type:String(data.get('source_type')||'inspiration'),merchant_name:String(data.get('merchant_name')||''),
    source_url:String(data.get('source_url')||''),recipe:String(data.get('recipe')||''),notes:String(data.get('notes')||''),price_note:String(data.get('price_note')||'')
  });
  await store.save({...record,id:current.id||state.draftId,created_at:current.created_at||new Date().toISOString(),image_data:current.image_data,revision:current.revision},state.photo);
  state.photo=null;state.pendingShare='';state.view='home';state.editing=null;state.chosen=null;
  history.replaceState(null,'',location.pathname);
  try{await load();showToast('已保存收藏');}catch(e){render();showToast('已保存，列表暂未刷新：'+e.message);}
  window.scrollTo(0,0);
}
async function exportBackup(){
  const items=await store.list();
  const entries=[];
  for(const e of items){const image_data=await store.getImageData(e);entries.push({...validateEntry(e),id:e.id,created_at:e.created_at,updated_at:e.updated_at,image_data});}
  const file=new Blob([JSON.stringify({format:'haohaochi-backup-v1',created_at:new Date().toISOString(),entries},null,2)],{type:'application/json'});
  const link=document.createElement('a');const url=URL.createObjectURL(file);
  link.href=url;link.download=`haohaochi-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(`已导出 ${entries.length} 条收藏（含照片）`);
}
root.addEventListener('input',event=>{if(event.target.id==='search-input'){state.query=event.target.value;renderCards();}});
root.addEventListener('change',async event=>{
  if(event.target.id==='photo-input'){
    const input=event.target,button=root.querySelector('#save-btn');
    state.photoPending=true;if(button)button.disabled=true;
    try{
      const photo=await imageFromFile(input.files?.[0]);
      if(photo&&input.isConnected){
        state.photo=photo;
        root.querySelector('#photo-preview').innerHTML=`<img src="${photo.dataUrl}" alt="新上传的照片" /><strong>更换照片</strong>`;
      }
    }catch(e){showToast(e.message);}finally{state.photoPending=false;if(button)button.disabled=false;}
  }
});
root.addEventListener('submit',async event=>{
  event.preventDefault();
  const formElement=event.target;
  if(state.busy||state.photoPending)return;
  state.busy=true;
  const submit=formElement.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
  try{
    if(formElement.id==='entry-form')await saveForm(formElement);
  }catch(e){showToast(e.message||'操作未成功，请重试');}finally{state.busy=false;if(submit)submit.disabled=false;}
});
root.addEventListener('click',async event=>{
  if(state.busy||state.photoPending)return;
  const card=event.target.closest('[data-open]');
  if(card){state.chosen=state.items.find(x=>x.id===card.dataset.open)||null;state.view='detail';state.menu=false;render();window.scrollTo(0,0);return;}
  const chip=event.target.closest('[data-category]');if(chip){state.category=chip.dataset.category;render();return;}
  const status=event.target.closest('[data-status]');if(status){state.status=status.dataset.status;render();return;}
  const control=event.target.closest('[data-action]');if(!control)return;
  const action=control.dataset.action;
  if(['close-menu','toggle-menu'].includes(action)){state.menu=action==='toggle-menu'?!state.menu:false;render();return;}
  if(action==='reset'){state.category='全部';state.status='all';state.query='';render();return;}
  if(action==='refresh'){await refresh(true);return;}
  if(action==='home'||action==='cancel'){goHome();return;}
  if(action==='new'){startNew();return;}
  if(action==='edit'){startEdit();return;}
  if(action==='delete'){
    if(!state.chosen||!confirm(`确定删除「${state.chosen.title}」吗？这无法撤销。`))return;
    state.busy=true;
    try{await store.remove(state.chosen.id);state.chosen=null;state.view='home';await load();showToast('已删除收藏');}catch(e){showToast(e.message);}finally{state.busy=false;}return;
  }
  if(action==='export'){
    if(state.busy)return;state.busy=true;try{await exportBackup();}catch(e){showToast(`导出失败：${e.message}`);}finally{state.busy=false;}return;
  }
});

let refreshing=false;
async function refresh(manual=false){
  if(refreshing||state.busy||state.view==='form'||(state.menu&&!manual))return;
  refreshing=true;
  try{
    if(manual)state.menu=false;
    const items=await store.list();
    if(state.busy||state.view==='form'||state.menu)return;
    const changed=JSON.stringify(items.map(e=>[e.id,e.revision]))!==JSON.stringify(state.items.map(e=>[e.id,e.revision]));
    state.items=items;
    if(state.chosen){state.chosen=items.find(x=>x.id===state.chosen.id)||null;if(!state.chosen)state.view='home';}
    if(manual||changed||state.loadError){
      state.loadError='';
      if(!manual&&state.view==='home')renderCards();else render();
    }
    if(manual)showToast('收藏已刷新');
  }catch(e){state.loadError=e.message;if(manual){render();showToast(e.message);}}finally{refreshing=false;}
}

async function init(){
  render();
  try{
    await load();
    if(state.pendingShare||new URLSearchParams(location.search).get('add')==='1')startNew();
  }catch(e){state.loadError=e.message;render();}
  // iOS Safari may grant persistent storage to a Home Screen web app. This
  // is best-effort only; users should still keep an exported backup.
  try{
    const storage=navigator.storage;
    if(storage?.persisted&&storage?.persist&&!await storage.persisted())await storage.persist();
  }catch{}
  window.addEventListener('focus',()=>refresh());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  if('serviceWorker' in navigator && ['https:','http:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
