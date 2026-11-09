require('./load.js');
for(const [id,L] of Object.entries(MS.LEARN)){ const ph=MS.PHANTOMS[L.ph]; if(!ph){console.log(id,'NO PH',L.ph);continue;}
 const st=MS.defaultState(L.ph,L.seq); Object.assign(st.popt||{},L.popt||{}); const lids=ph.les(st.popt).map(l=>l.id);
 (L.les||[]).forEach(l=>{ if(!lids.includes(l)) console.log(id,'missing lesion',l,lids.join(',')); });
 const keys=MS.buildPhantom(L.ph,Object.fromEntries((L.les||[]).map(l=>[l,true])),st.popt).keys; [L.A,L.B].forEach(k=>{ if(k&&!keys.includes(k)) console.log(id,'missing tissue',k); });
 st.fast=true; try{ MS.run(st);}catch(e){console.log(id,'ERR',e.message);} }
console.log('learn ok', Object.keys(MS.LEARN).length);
