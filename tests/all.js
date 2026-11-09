require('./load.js');
let n=0,bad=[];
for(const ph of Object.keys(MS.PHANTOMS)) for(const s of MS.SEQS){ for(const B0 of [1.5,3]){ const st=MS.defaultState(ph,s.id); st.B0=B0; st.fast=true; MS.PHANTOMS[ph].les(st.popt).forEach(l=>st.les[l.id]=true);
  try{ const r=MS.run(st); const pk=MS.pack(r); r.outs.forEach(o=>{ if(o.data){ let nan=0; for(const v of o.data) if(!isFinite(v)) nan++; if(nan) bad.push(ph+' '+s.id+' '+B0+' NaN '+nan+' '+o.name); } }); if(!isFinite(r.info.T)||!isFinite(r.info.sar)) bad.push(ph+' '+s.id+' T/SAR '+r.info.T+' '+r.info.sar); n++; }catch(e){ bad.push(ph+' '+s.id+' '+B0+' ERR '+e.message); } } }
console.log('runs',n); console.log(bad.slice(0,40).join('\n'), bad.length);
