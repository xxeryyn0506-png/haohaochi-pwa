export const CATEGORIES = ['家常菜', '主食', '甜品', '饮品', '小吃', '早餐', '其他'];
export const STATUSES = [
  {value: 'want_to_make', label: '想做', emoji: '🧑‍🍳'},
  {value: 'made', label: '做过', emoji: '🍳'},
  {value: 'want_to_eat', label: '想吃', emoji: '😋'},
  {value: 'eaten', label: '吃过', emoji: '🍽️'}
];
export const SOURCES = [
  {value: 'inspiration', label: '刷到的'},
  {value: 'homemade', label: '自己做'},
  {value: 'merchant', label: '商家'}
];
export const icons = {家常菜:'🍲',主食:'🍜',甜品:'🍰',饮品:'🧋',小吃:'🥟',早餐:'🥐',其他:'🍓'};

export function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeUrl(url) {
  try {
    if (!url) return '';
    const u = new URL(String(url));
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}
export function statusLabel(value) { return STATUSES.find(item => item.value === value)?.label || '想做'; }
export function sourceLabel(value) { return SOURCES.find(item => item.value === value)?.label || '刷到的'; }
export function displayDate(date) {
  try { return new Intl.DateTimeFormat('zh-CN', {year:'numeric', month:'short', day:'numeric'}).format(new Date(date)); }
  catch { return ''; }
}
export function validateEntry(entry) {
  if (typeof entry?.title !== 'string' || !entry.title.trim()) throw new Error('请填写美食名称');
  if (entry.title.trim().length > 100) throw new Error('名称请控制在100字以内');
  if (!CATEGORIES.includes(entry.category)) throw new Error('请选择有效品类');
  if (!STATUSES.some(x=>x.value===entry.status)) throw new Error('请选择有效状态');
  if (!SOURCES.some(x=>x.value===entry.source_type)) throw new Error('请选择有效来源');
  if (entry.source_url && !safeUrl(entry.source_url)) throw new Error('来源链接需要以 https:// 或 http:// 开头');
  const result={title:entry.title.trim(),category:entry.category,status:entry.status,source_type:entry.source_type,source_url:safeUrl(entry.source_url)};
  for (const key of ['merchant_name','recipe','notes','price_note']) {
    const value=entry[key]??'';
    if (typeof value!=='string'||value.length>10000) throw new Error('输入内容格式不正确或过长');
    result[key]=value;
  }
  return result;
}
export async function imageFromFile(file) {
  if (!file) return null;
  if (!/^image\/(png|jpeg|webp|heic|heif|avif)$/.test(file.type) && !(!file.type && /\.(heic|heif|jpg|jpeg|png|webp|avif)$/i.test(file.name))) throw new Error('请选择 iPhone 照片或 JPG、PNG、WebP 图片');
  if (file.size > 25*1024*1024) throw new Error('图片不能超过25 MB');
  const source = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve,reject) => {
      const el = new Image(); el.onload=()=>resolve(el); el.onerror=()=>reject(new Error('此浏览器无法读取这张照片，请先转成 JPG 或 PNG')); el.src=source;
    });
    const ratio = Math.min(1, 1400 / Math.max(img.naturalWidth,img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth*ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight*ratio));
    const context=canvas.getContext('2d');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(img,0,0,canvas.width,canvas.height);
    let blob;
    for(const quality of [.85,.72,.58]){
      blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('照片压缩失败')), 'image/jpeg', quality));
      if(blob.size<=2*1024*1024)break;
    }
    if(blob.size>2*1024*1024)throw new Error('照片压缩后仍超过2 MB');
    const dataUrl=await asDataUrl(blob);
    return {dataUrl,blob};
  } finally { URL.revokeObjectURL(source); }
}
export async function imageFromDataUrl(dataUrl) {
  if (dataUrl==null||dataUrl==='') return null;
  if (typeof dataUrl!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) throw new Error('备份包含无效的照片');
  const blob=await (await fetch(dataUrl)).blob();
  if (blob.size>2*1024*1024) throw new Error('备份包含超过2 MB的照片');
  const bytes=new Uint8Array(await blob.slice(0,3).arrayBuffer());
  if (bytes[0]!==255||bytes[1]!==216||bytes[2]!==255) throw new Error('备份包含无效的照片');
  return {dataUrl,blob};
}
export function asDataUrl(blob) {
  return new Promise((resolve,reject)=>{
    const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error('图片读取失败')); reader.readAsDataURL(blob);
  });
}
