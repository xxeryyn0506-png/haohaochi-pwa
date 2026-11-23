import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

// Build only the static, device-local PWA. No worker, account, sync key or
// remote data binding is part of the deployed application.
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const path of ['index.html','styles.css','mobile.css','manifest.webmanifest','sw.js','src','assets']){
  await cp(path,`dist/${path}`,{recursive:true});
}
await writeFile('dist/.nojekyll','');
