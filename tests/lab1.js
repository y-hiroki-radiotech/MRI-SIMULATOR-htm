// 使い方: node tests/lab1.js <phantomId> [opts JSON] [lesions: all|none|id,id]
// 出力: tests/out/<id>_lab.ppm（組織ごとの色）と凡例を標準出力
const MS=require('./load.js'); const fs=require('fs');
const id=process.argv[2], opts=JSON.parse(process.argv[3]||'{}'), lw=process.argv[4]||'all';
const ph=MS.PHANTOMS[id]; if(!ph){ console.log('no phantom',id,Object.keys(MS.PHANTOMS)); process.exit(1); }
const L={}; const ls=ph.les(opts); if(lw==='all') ls.forEach(l=>L[l.id]=true); else if(lw!=='none') lw.split(',').forEach(k=>L[k]=true);
const t0=Date.now(); const p=MS.buildPhantom(id,L,opts,'chronic'); const dt=Date.now()-t0;
function col(k){ let h=0; for(const c of k) h=(h*131+c.charCodeAt(0))>>>0; const r=(h&255),g=(h>>8)&255,b=(h>>16)&255; return [80+r%176,80+g%176,80+b%176]; }
const fixed={air:[0,0,0],fat:[235,215,90],bone:[255,255,255],csf:[40,90,230],fluid:[90,190,255],urine:[90,190,255],muscle:[175,60,60],artery:[255,0,0],vein:[0,0,170],portal:[140,0,210],lung:[25,25,25]};
const n=768,N=p.N,f=N/n; const buf=Buffer.alloc(n*n*3); const cnt={};
for(let j=0;j<n;j++)for(let i=0;i<n;i++){ const k=p.keys[p.lab[Math.floor(j*f)*N+Math.floor(i*f)]]; cnt[k]=(cnt[k]||0)+1; buf.set(fixed[k]||col(k),(j*n+i)*3); }
fs.mkdirSync('tests/out',{recursive:true}); fs.writeFileSync(`tests/out/${id}_lab.ppm`,Buffer.concat([Buffer.from(`P6 ${n} ${n} 255\n`),buf]));
console.log(`${id}: build ${dt} ms, P=${p.P} mm, ${p.keys.length} labels`); console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,c])=>`${k}(${(MS.TISSUES[k]||{}).n||'?'}):${(c/n/n*100).toFixed(1)}%`).join('  '));
