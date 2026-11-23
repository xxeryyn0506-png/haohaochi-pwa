import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('static app is device-local and has no account, sync-key or API boot path',async()=>{
  const [html,app,storage,sw]=await Promise.all([read('../index.html'),read('../src/app.js'),read('../src/storage.js'),read('../sw.js')]);
  assert.match(html,/src="\.\/src\/app\.js"/);
  assert.doesNotMatch(html,/app-config\.js|login|sync-key|\/api\//i);
  assert.match(app,/const store=localStore/);
  assert.doesNotMatch(app,/makeVaultStore|sync-form|同步钥匙|连接已有收藏|store\.connect/);
  assert.match(app,/不会自动同步到其他设备/);
  assert.match(storage,/indexedDB\.open\(DB_NAME/);
  assert.doesNotMatch(storage,/fetch\(|localStorage|sync-key/);
  assert.match(app,/导出本机备份/);
  assert.doesNotMatch(app,/backup-input|async function importBackup/);
  assert.doesNotMatch(sw,/app-config\.js|vault\.js|\/api\//);
});

test('PWA uses a relative scope suitable for a hosted project path and has iOS icons',async()=>{
  const [html,manifest,sw]=await Promise.all([read('../index.html'),read('../manifest.webmanifest'),read('../sw.js')]);
  const pwa=JSON.parse(manifest);
  assert.equal(pwa.name,'好好吃');
  assert.equal(pwa.short_name,'好好吃');
  assert.equal(pwa.display,'standalone');
  assert.equal(pwa.start_url,'./');
  assert.equal(pwa.scope,'./');
  assert.ok(pwa.icons.some(icon=>icon.sizes==='192x192'));
  assert.match(html,/apple-mobile-web-app-capable/);
  assert.match(html,/apple-touch-icon/);
  assert.match(sw,/haohaochi-shell-v4/);
  assert.match(sw,/clients\.claim/);
});
