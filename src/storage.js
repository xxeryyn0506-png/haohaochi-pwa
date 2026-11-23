const DB_NAME='haohaochi-local-v1';

function openDb() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if (!req.result.objectStoreNames.contains('entries')) req.result.createObjectStore('entries',{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function localTransaction(mode, act) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('entries', mode);
      const req = act(tx.objectStore('entries'));
      let result;
      req.onsuccess = () => { result = req.result; };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('本地存储未完成'));
    });
  } finally { db.close(); }
}
export const localStore={
  kind:'local',
  async list(){const list=await localTransaction('readonly',store=>store.getAll());return list.sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(e=>({...e,image_url:e.image_data||''}));},
  async save(entry,image){
    const now=new Date().toISOString();
    const record={...entry,updated_at:now};
    if(image) record.image_data=image.dataUrl;
    try{await localTransaction('readwrite',s=>s.put(record));}
    catch(error){
      if(error?.name==='QuotaExceededError')throw new Error('设备存储空间不足，这次修改未保存。请先导出备份并释放一些空间后重试。');
      throw error;
    }
    return record;
  },
  async remove(id){await localTransaction('readwrite',s=>s.delete(id));},
  async getImageData(entry){return entry.image_data||'';}
};
