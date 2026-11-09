// 使い方: node tests/img1.js <phantomId> [seq,seq,...] [B0] [opts JSON] [lesions all|none|ids]
// 出力: tests/out/<id>_img.pgm（各シーケンスの最初の画像を 384px で横に並べる）
const MS=require('./load.js'); const fs=require('fs');
const id=process.argv[2]; const seqs=(process.argv[3]||'se_t1,fse_t2,flair,stir,vibe,dwi').split(','); const B0=+(process.argv[4]||1.5); const opts=JSON.parse(process.argv[5]||'{}'); const lw=process.argv[6]||'all';
const n=384; const tiles=[];
for(const sid of seqs){ const st=MS.defaultState(id,sid); st.B0=B0; Object.assign(st.popt,opts); st.les={}; const ls=MS.PHANTOMS[id].les(st.popt); if(lw==='all') ls.forEach(l=>st.les[l.id]=true); else if(lw!=='none') lw.split(',').forEach(k=>st.les[k]=true);
  const t0=Date.now(); let r; try{ r=MS.run(st); }catch(e){ console.log('ERR',sid,e.message); continue; } const o=r.outs[sid==='dwi'?1:0]; if(!o||!o.data){ continue; }
  const S=r.S,d=o.data,G=r.geo; const vals=Array.from(d).filter(v=>isFinite(v)).sort((a,b)=>a-b); const top=vals[vals.length-1]; const b=vals.filter(v=>v>top*0.04); const hi=(b[Math.floor(b.length*0.99)]||top)*1.05, lo=o.kind==='signed'?-hi:0;
  const buf=Buffer.alloc(n*n); for(let Y=0;Y<n;Y++)for(let X=0;X<n;X++){ const xi=Math.floor(X*S/n), yi=Math.floor(Y*S/n); const q=G.peV? yi*S+xi : xi*S+yi; buf[Y*n+X]=Math.max(0,Math.min(255,Math.round((d[q]-lo)/(hi-lo)*255))); }
  tiles.push(buf); console.log(sid.padEnd(10), (Date.now()-t0)+'ms', 'T='+r.info.T.toFixed(0)+'s', r.info.W.filter(w=>w.lv!=='info').map(w=>w.t.slice(0,30)).join('/'));
}
const W=n*tiles.length, big=Buffer.alloc(W*n); tiles.forEach((t,k)=>{ for(let j=0;j<n;j++) t.copy(big,j*W+k*n,j*n,(j+1)*n); });
fs.mkdirSync('tests/out',{recursive:true}); fs.writeFileSync(`tests/out/${id}_img.pgm`,Buffer.concat([Buffer.from(`P5 ${W} ${n} 255\n`),big]));
