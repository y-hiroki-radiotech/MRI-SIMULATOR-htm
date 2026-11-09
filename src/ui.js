/* ===== 画面 ===== */
(function(){
var MS=window.MS, $=function(s){return document.querySelector(s);}, el=function(t,a,h){ var e=document.createElement(t); if(a) for(var k in a){ if(k==='class') e.className=a[k]; else if(k==='html') e.innerHTML=a[k]; else e.setAttribute(k,a[k]); } if(h!==undefined) e.textContent=h; return e; };
var st=null, res=null, cur=0, manualW=null, pinned=null, vendor='both', snrRef=1, lastSeq=null;
var closedG={}; try{ closedG=JSON.parse(localStorage.getItem('mrisimClosedGroups')||'{}')||{}; }catch(e){ closedG={}; }
var defPcache={key:null,p:null};
function vlist(){ var nm={sie:'Siemens',can:'Canon',ge:'GE',phi:'Philips',fuji:'Fujifilm',uih:'United Imaging'}; var order=['sie','can','ge','phi','fuji','uih']; return order.filter(function(k){ return k==='sie'||k==='can'||(MS.SEQS[0]&&MS.SEQS[0][k]!==undefined); }).map(function(k){ return [k,nm[k]]; }); }
if(MS.PUBLIC){ ['ge','phi','fuji','uih'].forEach(function(k){ MS.SEQS.forEach(function(s){ if(s[k+'C']==='x'){ s[k]='—'; s[k+'C']='—'; } }); (MS.VOPT_NAMES||[]).forEach(function(r){ if(r[k]&&r[k][1]==='x') r[k]=null; }); }); }

var LOG={tr:1,te:1,ti:1,ti2:1,bw:1,trs:1,pld:1,nx:1,ny:1,npart:1,etl:1,fov:1,thk:1,nex:1,venc:1,bbti:1,navg:1,nvol:1,ndir:1,esp:1};
var ROMAN={brain:'頭部',chest:'胸部',abd:'上腹部',pelvis:'骨盤',msk:'骨軟部'};
/* ---------- ワーカー ---------- */
var worker=null, busy=false, queued=null, jobId=0, wsrc=null;
try{ var src=$('#engine-src').textContent; wsrc='self.window=self;\n'+src+'\n;self.onmessage=function(e){ var r; if(e.data.type===\'probe\'){ try{ r=MS.probe(e.data.st,e.data.spec); }catch(err){ self.postMessage({id:e.data.id,err:String(err&&err.stack||err)}); return; } self.postMessage({id:e.data.id,r:r}); return; } try{ r=MS.run(e.data.st); }catch(err){ self.postMessage({id:e.data.id,err:String(err&&err.stack||err)}); return; } var pk=MS.pack(r); self.postMessage({id:e.data.id,r:pk},pk.tx); };';
  worker=new Worker(URL.createObjectURL(new Blob([wsrc],{type:'text/javascript'})));
  worker.onmessage=function(e){ busy=false; if(e.data.err){ $('#busy').textContent='エラー: '+e.data.err.split('\n')[0]; console.error(e.data.err); } else { prevRes=res; fresh=true; show(e.data.r); } if(queued){ var q=queued; queued=null; go(q); } else $('#busy').textContent=''; };
  worker.onerror=function(){ worker=null; busy=false; };
}catch(e){ worker=null; }
function go(s){ if(busy){ queued=s; return; } busy=true; $('#busy').textContent='計算中…'; var snap=JSON.parse(JSON.stringify(s));
  if(worker){ worker.postMessage({id:++jobId,st:snap}); }
  else setTimeout(function(){ try{ prevRes=res; fresh=true; show(MS.pack(MS.run(snap))); }catch(err){ $('#busy').textContent='エラー: '+err; console.error(err); } busy=false; if(queued){ var q=queued; queued=null; go(q); } else $('#busy').textContent=''; },10); }
var fresh=false;
var tmr=null; function schedule(){ clearTimeout(tmr); tmr=setTimeout(function(){ go(st); },90); }

/* ---------- 部位・病変 ---------- */
function buildPhantomSel(){ var box=$('#phantoms'); box.innerHTML=''; var used={};
  function chip(k){ used[k]=1; var nm=MS.PHANTOMS[k].n; var b=el('button',{type:'button',class:'chipbtn','aria-pressed':String(!!st&&st.phantom===k),title:nm},nm); b.onclick=function(){ newState(k, st.seq); }; return b; }
  (MS.PH_GROUPS||[]).forEach(function(g){ var ks=g[1].filter(function(k){ return MS.PHANTOMS[k]; }); if(!ks.length) return; var row=el('div',{class:'phrow'}); row.appendChild(el('span',{class:'phlab'},g[0])); ks.forEach(function(k){ row.appendChild(chip(k)); }); box.appendChild(row); });
  var rest=Object.keys(MS.PHANTOMS).filter(function(k){ return !used[k]; }); if(rest.length){ var row=el('div',{class:'phrow'}); row.appendChild(el('span',{class:'phlab'},'その他')); rest.forEach(function(k){ row.appendChild(chip(k)); }); box.appendChild(row); } }
function buildLesions(){ var box=$('#les'); box.innerHTML=''; var ph=MS.PHANTOMS[st.phantom];
  box.appendChild(el('span',{class:'sim-control',style:'width:100%;margin-bottom:-2px'},'病変（重ねて表示）'));
  ph.les(st.popt).forEach(function(L){ var lb=el('label',{class:'chk'}); var c=el('input',{type:'checkbox'}); c.checked=!!st.les[L.id]; c.onchange=function(){ st.les[L.id]=c.checked; buildLesions(); schedule(); }; lb.appendChild(c); lb.appendChild(document.createTextNode(L.n)); box.appendChild(lb);
    });
  var po=$('#popts'); po.innerHTML='';
  if(st.les.hem) po.appendChild(sel('血腫の病期',MS.HEM_STAGES.map(function(h){return [h.id,h.n];}),function(){return st.hemStage;},function(v){st.hemStage=v;}));
  (ph.opts||[]).forEach(function(o){ if(o.choices){ var d=sel(o.n,o.choices,function(){return st.popt[o.id];},function(v){ st.popt[o.id]=v; st.les={}; buildLesions(); }); po.appendChild(d); }
    else { var lb=el('label',{class:'chk'}); var c=el('input',{type:'checkbox'}); c.checked=!!st.popt[o.id]; c.onchange=function(){ st.popt[o.id]=c.checked; schedule(); }; lb.appendChild(c); lb.appendChild(document.createTextNode(o.n)); po.appendChild(lb); } });
  if(ph.region==='abd'){ [['liverFF','背景肝 脂肪分率','%',0,50,1],['liverIron','背景肝 鉄（ΔR2*）','s⁻¹',0,800,10],['liverKpa','肝の硬さ（MRE）','kPa',1,10,0.1]].forEach(function(a){ po.appendChild(numRow(a[0],a[1],a[2],a[3],a[4],a[5],function(){return st[a[0]];},function(v){st[a[0]]=v;})); }); }
}
/* ---------- シーケンス一覧 ---------- */
function vname(s){ if(vendor==='sie') return s.sie; if(vendor==='can') return s.can; if(vendor==='gen') return s.gen; return s.sie+' ／ '+s.can; }
function buildSeqList(){ var box=$('#navigation'), q=($('#seqq').value||'').toLowerCase(); box.innerHTML='';
  function nb(label,small,active,fn){ var b=el('button',{type:'button',class:'nav-btn'+(active?' active':'')}); b.appendChild(document.createTextNode(label)); if(small) b.appendChild(el('small',{},small)); b.onclick=function(){ fn(); closeMenu(); }; if(active) b.setAttribute('aria-current','page'); return b; }
  if(!q){ box.appendChild(el('div',{class:'nav-group'},'はじめに')); box.appendChild(nb('このツールの使い方','',view==='about',function(){ setView('about'); }));
    box.appendChild(el('div',{class:'nav-group'},'勉強用（よく使うシーケンス）'));
    MS.LEARN.forEach(function(L){ var s=MS.SEQ[L.seq]; box.appendChild(nb(s.n,'',view==='sim'&&mode==='learn'&&st&&st.seq===L.seq,function(){ setView('sim'); startLearn(L.seq); })); });
    box.appendChild(el('div',{class:'nav-group'},'資料')); box.appendChild(nb('名称対応表','メーカー別',view==='names',function(){ setView('names'); })); box.appendChild(nb('組織パラメータ','T1・T2・文献',view==='tissue',function(){ setView('tissue'); }));
    box.appendChild(el('div',{class:'nav-group',style:'color:#fff;font-weight:700;margin-top:26px'},'エキスパート用（全 '+MS.SEQS.length+' シーケンス）')); }
  var hit=0;
  MS.CATS.forEach(function(c){ var items=MS.SEQS.filter(function(s){ return s.cat===c[0] && (!q || (s.n+s.gen+s.sie+s.can+(s.ge||'')+(s.phi||'')+(s.fuji||'')+(s.uih||'')+s.d).toLowerCase().indexOf(q)>=0); }); if(!items.length) return; hit+=items.length;
    box.appendChild(el('div',{class:'nav-group'},c[1])); items.forEach(function(s){ box.appendChild(nb(s.n,'',view==='sim'&&mode==='expert'&&st&&st.seq===s.id,function(){ setView('sim'); mode='expert'; newState(st.phantom,s.id,true); setHash('expert'); })); }); });
  if(q && !hit) box.appendChild(el('div',{class:'nav-group'},'該当なし')); }
function setHash(h){ try{ history.replaceState(null,'','#'+h); }catch(e){} }
function startLearn(seq){ var L=MS.LEARN_MAP[seq]; mode='learn'; st=MS.defaultState(L.ph,seq,null); st.B0=B0pref; st.les={}; if(L.popt) Object.keys(L.popt).forEach(function(k){ st.popt[k]=L.popt[k]; }); (L.les||[]).forEach(function(k){ st.les[k]=true; }); if(L.agent){ st.agent=L.agent; st.cphase=L.cphase||0; }
  chart.mode='curve'; chart.xk=L.x; chart.metric=L.m; chart.A=L.A; chart.B=L.B; chart.hide={}; chart.follow=true; lastChanged=null; prevRes=null; manualW=null; cur=(seq==='dwi')?1:0; snrRef=null; refInfo();
  buildPhantomSel(); buildSys(); buildLesions(); buildSeqList(); buildParams(); seqCard(); schedule(); setHash('learn'); }
function learnCard(){ var box=$('#learncard'); var L=mode==='learn'?MS.LEARN_MAP[st.seq]:null; $('#protop').classList.toggle('one',!L); if(!L){ box.hidden=true; return; } box.hidden=false; box.innerHTML='';
  box.appendChild(el('h2',{},'学習のポイント')); box.appendChild(el('p',{},L.goal)); var ul=el('ul',{style:'font-size:14px'}); L.pts.forEach(function(t){ ul.appendChild(el('li',{},t)); }); box.appendChild(ul);
  var pr=el('div',{class:'sim-presets'}); L.pre.forEach(function(x){ var b=el('button',{type:'button'},x[0]); b.onclick=function(){ Object.keys(x[1]).forEach(function(k){ st.p[k]=x[1][k]; lastChanged=k; }); if(x[2]) Object.keys(x[2]).forEach(function(k){ st[k]=x[2][k]; }); buildParams(); schedule(); }; pr.appendChild(b); }); box.appendChild(pr);
  var sw=el('p',{class:'sim-note',style:'margin-top:14px'}); var a=el('button',{type:'button',class:'quiet-link',style:'border:0;background:none;color:var(--rt-link);text-decoration:underline;padding:0;font-size:12px'},'エキスパート用で同じシーケンスを開く（すべてのパラメータ）'); a.onclick=function(){ mode='expert'; buildSeqList(); buildParams(); seqCard(); setHash('expert'); schedule(); }; sw.appendChild(document.createTextNode('もっと細かく調べたいとき：')); sw.appendChild(a); box.appendChild(sw); }
function vname(s){ if(vendor==='sie') return s.sie; if(vendor==='can') return s.can; if(vendor==='gen') return s.gen; return s.sie===s.can? s.sie : s.sie+'／'+s.can; }
var view='sim';
function setView(v){ view=v; document.querySelectorAll('.view').forEach(function(m){ m.hidden=(m.id!=='v-'+v); }); document.body.classList.toggle('simview',v==='sim'); buildSeqList(); window.scrollTo(0,0); if(v==='sim'&&res) show(res); }
function closeMenu(){ $('#sidebar').classList.remove('open'); $('#shade').classList.remove('visible'); $('#menu').setAttribute('aria-expanded','false'); }
/* ---------- パラメータ ---------- */
function visibleParams(sq){ var p=st.p, keys=['fov','pfov','nx','ny','thk']; if(sq.dim==='3D') keys.push('npart','sos'); else keys.push('gap','nsl'); keys.push('pos','nex');
  Object.keys(sq.p).forEach(function(k){ if(keys.indexOf(k)<0 && MS.PDEF[k]) keys.push(k); });
  if(sq.k==='mrs') keys=['tr','te','navg','vox'];
  if(sq.k!=='mrs'){ keys.push('pf'); if(sq.dim==='3D') keys.push('pfz'); if(st.pimode!=='off'){ keys.push('r'); if(sq.dim==='3D') keys.push('rz'); } if(sq.dim!=='3D' && /dwi|dti|bold|dsc|fse|ir|se/.test(sq.k)) keys.push('sms'); keys.push('cs'); }
  keys.forEach(function(k){ if(p[k]===undefined){ var d=MS.PDEF[k]; p[k]=k==='sos'?0:(k==='pfz'||k==='pf'?1:(k==='rz'||k==='r'||k==='sms'||k==='cs'?1:d.min)); } });
  return keys; }
function numRow(id,name,unit,min,max,step,get,set,tip,logm){ var lb=el('label',{class:'sim-control','data-k':id}); lb.appendChild(document.createTextNode(name)); if(tip){ lb.appendChild(el('span',{class:'q',title:tip},'?')); }
  var right=el('span',{class:'val'}); var n=el('input',{type:'number',min:min,max:max,step:step||'any','aria-label':name}); n.value=fmtv(get()); right.appendChild(n); if(unit) right.appendChild(el('small',{},unit)); lb.appendChild(right);
  var r=el('input',{type:'range',min:0,max:1000,step:1,'aria-label':name+'（スライダー）'}); function toPos(v){ if(logm&&min>0) return 1000*Math.log(v/min)/Math.log(max/min); return 1000*(v-min)/(max-min); } function fromPos(x){ var v= (logm&&min>0)? min*Math.pow(max/min,x/1000) : min+(max-min)*x/1000; if(step) v=Math.round(v/step)*step; return +v.toFixed(4); }
  r.value=toPos(get()); lb.appendChild(r);
  r.oninput=function(){ var v=fromPos(+r.value); n.value=fmtv(v); set(v); lastChanged=id; if(id===chart.xk||(chart.mode==='map'&&id===chart.yk)) cursorOnly(); schedule(); };
  n.onchange=function(){ var v=Math.max(min,Math.min(max,+n.value)); if(isNaN(v)) return; n.value=fmtv(v); r.value=toPos(v); set(v); lastChanged=id; if(id===chart.xk||(chart.mode==='map'&&id===chart.yk)) cursorOnly(); schedule(); };
  return lb; }
function fmtv(v){ return Math.abs(v)>=100? Math.round(v*10)/10 : Math.round(v*1000)/1000; }
function sel(name,opts,get,set,tip){ var d=el('label',{class:'sim-control'}); d.appendChild(document.createTextNode(name)); if(tip) d.appendChild(el('span',{class:'q',title:tip},'?')); var s=el('select'); opts.forEach(function(o){ var op=el('option',{value:o[0]},o[1]); if(String(get())===String(o[0])) op.selected=true; s.appendChild(op); }); s.onchange=function(){ set(s.value); schedule(); if(s.dataset.rebuild) buildParams(); }; d.appendChild(s); d.s=s; return d; }
function chk(name,get,set,tip){ var lb=el('label',{class:'chk'}); if(tip) lb.title=tip; var c=el('input',{type:'checkbox'}); c.checked=!!get(); c.onchange=function(){ set(c.checked); schedule(); }; lb.appendChild(c); lb.appendChild(document.createTextNode(name)); return lb; }
function buildParams(){ buildParams0(); grpCounts(); grpBadges(); }
function buildParams0(){ var sq=MS.SEQ[st.seq], box=$('#params'); box.innerHTML=''; var keys=visibleParams(sq);
  function grp(title){ var c0=!!closedG[title]; var sec=el('div',{class:'pgrp'+(c0?' closed':''),'data-t':title}); var h=el('button',{type:'button',class:'grp','aria-expanded':String(!c0)});
    h.appendChild(el('span',{class:'chev','aria-hidden':'true'})); h.appendChild(document.createTextNode(title)); var cn=el('span',{class:'gcnt'}); h.appendChild(cn); h.appendChild(el('span',{class:'gbadge',title:'既定値から変えたパラメータの数'}));
    h.onclick=function(){ setClosed(sec,!sec.classList.contains('closed')); saveClosed(); };
    sec.appendChild(h); var g=el('div',{class:'sim-controls'}); sec.appendChild(g); box.appendChild(sec); return g; }
  learnCard();
  if(mode==='learn' && MS.LEARN_MAP[st.seq]){ var L=MS.LEARN_MAP[st.seq];
    function addK(gg,k){ var d=MS.PDEF[k]; if(k==='bvals'){ var lb=el('label',{class:'sim-control','data-k':'bvals'}); lb.appendChild(document.createTextNode(d.n)); lb.appendChild(el('span',{class:'q',title:d.tip},'?')); var t=el('input',{type:'text',value:st.p.bvals}); t.onchange=function(){ st.p.bvals=t.value; lastChanged='b'; schedule(); }; lb.appendChild(t); gg.appendChild(lb); return; } gg.appendChild(numRow(k,d.n,d.u,d.min,d.max,d.step,function(){return st.p[k];},function(v){st.p[k]=v;},d.tip,!!LOG[k])); }
    var g1=grp('コントラストを決めるパラメータ'); L.p.forEach(function(k){ addK(g1,k); });
    (L.o||[]).forEach(function(o){ if(o==='fs') g1.appendChild(sel('脂肪抑制',[['none','なし'],['chess','化学シフト選択（Fat Sat）'],['spair','SPAIR'],['we','水選択励起']],function(){return st.fs;},function(v){st.fs=v;}));
      if(o==='agent'){ g1.appendChild(sel('造影の時相',MS.GBCA.eca.phases.map(function(n,i){return [i,n];}),function(){return st.cphase;},function(v){ st.agent='eca'; st.cphase=+v; })); } });
    var g2=grp('分解能・SNR・撮像時間'); MS.LEARN_COMMON.forEach(function(k){ addK(g2,k); });
    var g3=grp('撮像の工夫'); g3.appendChild(sel('呼吸',[['none','なし（自由呼吸）'],['bh','息止め'],['trig','呼吸同期']],function(){return st.resp;},function(v){st.resp=v;}));
    return; }
  MS.GROUPS.forEach(function(g){ var ks=keys.filter(function(k){ return MS.PDEF[k].g===g[0]; }); if(!ks.length) return; var det=grp(g[1]);
    ks.forEach(function(k){ var d=MS.PDEF[k]; if(k==='bvals'){ var lb=el('label',{class:'sim-control','data-k':'bvals'}); lb.appendChild(document.createTextNode(d.n)); var t=el('input',{type:'text',value:st.p.bvals}); t.onchange=function(){ st.p.bvals=t.value; lastChanged='b'; schedule(); }; lb.appendChild(t); det.appendChild(lb); return; }
      det.appendChild(numRow(k,d.n,d.u,d.min,d.max,d.step,function(){return st.p[k];},function(v){st.p[k]=v;},d.tip,!!LOG[k])); });
    if(g[0]==='acc'){ det.appendChild(sel('並列画像',[['off','なし'],['grappa','k空間法（GRAPPA）'],['sense','画像空間法（mSENSE／SPEEDER）']],function(){return st.pimode;},function(v){ st.pimode=v; buildParams(); },'Siemens: iPAT（GRAPPA／mSENSE）、Canon: SPEEDER'));
      if(sq.dim==='3D') det.appendChild(chk('CAIPIRINHA 型サンプリング（3D）',function(){return st.caipi;},function(v){st.caipi=v;},'g因子を下げる'));
      det.appendChild(sel('深層学習再構成',[[0,'なし'],[1,'弱'],[2,'中'],[3,'強']],function(){return st.dlr;},function(v){st.dlr=+v;},'Siemens: Deep Resolve、Canon: AiCE。雑音を下げる（強すぎると平滑化）'));
      det.appendChild(chk('深層学習による高分解能化',function(){return st.sr;},function(v){st.sr=v;},'Siemens: Deep Resolve Sharp、Canon: PIQE（名称要確認）。シミュレーションでは取得範囲外の高周波を一部補う近似'));
      det.appendChild(sel('k空間フィルタ',[['none','なし（生データ）'],['weak','弱（既定：外周を緩やかに減衰）'],['hamming','ハミング（Gibbs 低減・ぼける）']],function(){return st.filter;},function(v){st.filter=v;}));
    }
  });
  /* オプション */
  var o=sq.o||[], det2=grp('脂肪抑制・オプション');
  if(o.indexOf('fs')>=0 || /dwi/.test(sq.k)){ var fsOpts=[['none','なし'],['chess','化学シフト選択（CHESS／Fat Sat）'],['spair','断熱パルス（SPAIR）'],['we','水選択励起（WE／PASTA）']]; if(/dwi|dti/.test(sq.k)) fsOpts.push(['stir','STIR（反転）']); det2.appendChild(sel('脂肪抑制',fsOpts,function(){return st.fs;},function(v){st.fs=v;},'磁場不均一に弱いのは CHESS・SPAIR・水選択励起。STIR と Dixon は均一だが原理が異なる')); }
  if(o.indexOf('restore')>=0) det2.appendChild(chk('フリップバック（RESTORE／T2 Plus）',function(){return st.restore;},function(v){st.restore=v;},'エコートレイン終了時の横磁化を縦に戻す。短いTRでも液体が明るい'));
  if(o.indexOf('mt')>=0) det2.appendChild(chk('MTパルス（MTC／SORS-STC）',function(){return st.mt;},function(v){st.mt=v;},'高分子と結合した水の信号を下げる（白質・筋・軟骨が低下）'));
  if(o.indexOf('tone')>=0) det2.appendChild(chk('傾斜フリップ角（TONE／ISCE）',function(){return st.tone;},function(v){st.tone=v;}));
  if(o.indexOf('vsat')>=0) det2.appendChild(chk('静脈の飽和パルス',function(){return st.vsat;},function(v){st.vsat=v;}));
  if(o.indexOf('flowcomp')>=0||sq.gre) det2.appendChild(chk('流れ補正（GMN／Flow Comp）',function(){return st.flowcomp;},function(v){st.flowcomp=v;},'流れによる位相分散を減らす'));
  det2.appendChild(chk('空間飽和パルス（拍動アーチファクト対策）',function(){return st.satband;},function(v){st.satband=v;},'血管の流入側に飽和パルスを置き、拍動による位相方向のゴーストを減らす'));
  if(o.indexOf('vat')>=0) det2.appendChild(chk('VAT（view angle tilting）',function(){return st.vat;},function(v){st.vat=v;},'Siemens: WARP、Canon: VAT。面内の位置ずれを補正'));
  if(o.indexOf('semac')>=0) det2.appendChild(numRow('semac','SEMAC 補正ステップ','',0,24,1,function(){return st.semac;},function(v){st.semac=v;},'面直交方向の歪みを補正（時間はステップ数に比例して延長）'));
  if(/dwi/.test(sq.k)) det2.appendChild(numRow('cdwi','計算DWI の b 値（0=なし）','s/mm²',0,3000,50,function(){return st.cdwi;},function(v){st.cdwi=v;},'Siemens: Computed b-values、Canon: cDWI'));
  if(sq.k==='mrs') det2.appendChild(sel('ボクセル位置',[['normal','正常白質'],['lesion','病変（腫瘍）']],function(){return st.mrsVox;},function(v){st.mrsVox=v;}));
  var det3=grp('動き対策・同期・位相方向');
  det3.appendChild(sel('呼吸',[['none','なし（自由呼吸）'],['bh','息止め'],['trig','呼吸同期'],['nav','ナビゲータ'],['radial','ラジアル（BLADE／JET）']],function(){return st.resp;},function(v){st.resp=v;}));
  det3.appendChild(sel('心電図同期',[['none','なし'],['pro','前向き同期'],['retro','後ろ向き同期']],function(){return st.ecg;},function(v){st.ecg=v;}));
  det3.appendChild(numRow('hr','心拍数','bpm',40,140,1,function(){return st.hr;},function(v){st.hr=v;}));
  var plx=MS.PHANTOMS[st.phantom].plane; var peOpts=plx==='sag'?[['AP','前後（AP）'],['SI','上下（SI）']]:(plx==='cor'?[['RL','左右（RL）'],['SI','上下（SI）']]:[['AP','前後（AP）'],['RL','左右（RL）']]);
  det3.appendChild(sel('位相エンコード方向',peOpts,function(){return st.pe;},function(v){st.pe=v;},'折り返し・動きのゴースト・化学シフトの向きが変わる'));
  var det4=grp('造影');
  if(!sq.forceAgent){ det4.appendChild(sel('造影剤',[['none','なし'],['eca','細胞外液性'],['eob','Gd-EOB-DTPA']],function(){return st.agent;},function(v){ st.agent=v; st.cphase=v==='none'?0:Math.max(1,st.cphase); buildParams(); }));
    if(st.agent!=='none'){ var ph=MS.GBCA[st.agent].phases; det4.appendChild(sel('時相',ph.map(function(n,i){return [i,n];}),function(){return st.cphase;},function(v){st.cphase=+v;})); det4.appendChild(numRow('dose','投与量（標準量比）','×',0.25,3,0.25,function(){return st.dose;},function(v){st.dose=v;})); } }
  else det4.appendChild(el('div',{class:'chk'},'このシーケンスは造影後（遅延相）を想定して計算します。'));
  var det5=grp('装置・再構成');
  det5.appendChild(numRow('grad','傾斜磁場強度（最大）','mT/m',20,100,1,function(){return st.grad;},function(v){st.grad=v;},'拡散強調像の最短TEに影響'));
  det5.appendChild(chk('受信感度の補正（Prescan Normalize 等）',function(){return st.norm;},function(v){st.norm=v;},'表面コイル由来の明るさのむらを補正（中心部の雑音は相対的に増える）'));
  det5.appendChild(chk('B1 不均一の補正（3T 体部）',function(){return st.b1corr;},function(v){st.b1corr=v;},'多チャンネル送信・誘電パッド等'));
  det5.appendChild(chk('シミング（高次）',function(){return st.shim;},function(v){st.shim=v;},'磁場の不均一を減らす'));
  det5.appendChild(chk('高速表示（256格子で計算）',function(){return st.fast;},function(v){st.fast=v;},'マトリクス 256 超でも 256 格子で計算して速くする'));
}
/* ---------- 状態 ---------- */
function newState(ph,seq,keep){ var prev=st; st=MS.defaultState(ph,seq,keep?prev:null); if(keep&&prev&&prev.phantom===ph){ st.les=prev.les; st.popt=prev.popt; } else { st.les={}; MS.PHANTOMS[ph].les(st.popt).forEach(function(L,i){ if(i===0) st.les[L.id]=true; }); }
  manualW=null; cur=0; var sq=MS.SEQ[seq]; st.B0=B0pref; snrRef=null; refInfo();
  buildPhantomSel(); buildSys(); buildLesions(); buildSeqList(); buildParams(); seqCard(); schedule(); }
function buildSys(){ var b=$('#sys'); b.innerHTML=''; b.appendChild(sel('静磁場',[['0.55','0.55 T'],['1.5','1.5 T'],['3','3.0 T']],function(){return String(st.B0);},function(v){ st.B0=+v; B0pref=+v; buildParams(); })); }
var B0pref=1.5;
function refInfo(){ var sq=MS.SEQ[st.seq]; var s2=MS.defaultState(st.phantom,st.seq); s2.B0=1.5; s2.coilG=MS.PHANTOMS[st.phantom].coilG; s2.coil=MS.PHANTOMS[st.phantom].coil; s2.p.dim3=sq.dim==='3D'; try{ snrRef=MS.derive(s2,sq).snr0; }catch(e){ snrRef=1; } }
function seqCard(){ var sq=MS.SEQ[st.seq]; $('#sqname').textContent=sq.n; $('#sqcat').textContent=mode==='learn'?'勉強用':(MS.CATS.filter(function(c){return c[0]===sq.cat;})[0]||['',''])[1]; $('#v-sim .chapter-no').firstChild.nodeValue=mode==='learn'?'STUDY · ':'PARAMETER LAB PRO · '; document.title=sq.n+' — MRIパラメータシミュレーター Pro'; var v=$('#vend'); v.innerHTML='';
  function cf(c){ if(c==='—') return ''; return '<span class="cf '+c+'">'+({o:'公開資料',c:'比較表',x:'要確認'}[c]||'')+'</span>'; }
  var h='<b>一般名</b><span>'+sq.gen+'</span>'; vlist().forEach(function(vd){ h+='<b>'+vd[1]+'</b><span>'+(sq[vd[0]]||'—')+cf(sq[vd[0]+'C'])+'</span>'; }); v.innerHTML=h;
  $('#sqdesc').textContent=sq.d; }
/* ---------- 表示 ---------- */
var LUT=(function(){ var stops=[[0,[48,18,59]],[0.15,[70,110,230]],[0.35,[30,190,220]],[0.5,[60,230,120]],[0.65,[180,240,50]],[0.8,[250,190,40]],[0.92,[240,90,20]],[1,[150,15,5]]]; var L=[]; for(var i=0;i<256;i++){ var t=i/255,a=0; while(a<stops.length-2&&t>stops[a+1][0]) a++; var s0=stops[a],s1=stops[a+1],f=(t-s0[0])/(s1[0]-s0[0]); L.push([0,1,2].map(function(c){return Math.round(s0[1][c]+(s1[1][c]-s0[1][c])*f);})); } return L; })();
function autoWin(o){ var d=o.data, n=d.length, a=[]; var step=Math.max(1,Math.floor(n/40000)); for(var i=0;i<n;i+=step) if(isFinite(d[i])) a.push(d[i]); a.sort(function(x,y){return x-y;});
  if(o.kind==='map'&&o.range) return {lo:o.range[0],hi:o.range[1]}; if(o.kind==='phase'&&o.range) return {lo:o.range[0],hi:o.range[1]};
  if(o.kind==='signed'){ var m=Math.max(Math.abs(a[Math.floor(a.length*0.005)]),Math.abs(a[Math.floor(a.length*0.995)])); return {lo:-m,hi:m}; }
  var top=a[a.length-1]||1; var b=a.filter(function(v){return v>top*0.04;}); if(b.length<50) b=a; return {lo:0,hi:b[Math.floor(b.length*0.99)]*1.05||1}; }
function render(o,canvas,win,opts){ var S=res.S, peV=res.geo.peV; canvas.width=S; canvas.height=S; var ctx=canvas.getContext('2d'), img=ctx.createImageData(S,S), D=img.data;
  var data=opts.k? res.kmag : o.data; var lo=win.lo, hi=win.hi; if(opts.k){ var mx=-1e9,mn=1e9; for(var i=0;i<data.length;i+=3){ if(data[i]>mx) mx=data[i]; if(data[i]<mn) mn=data[i]; } lo=Math.max(mn,mx-11); hi=mx; }
  var useC=$('#color').checked && (o.kind==='map'||o.kind==='phase') && !opts.k; var lab=res.labC, edge=$('#showLab').checked&&!opts.k;
  for(var Y=0;Y<S;Y++) for(var X=0;X<S;X++){ var q=peV? Y*S+X : X*S+Y; var v=data[q]; var t=(v-lo)/(hi-lo); t=t<0?0:t>1?1:t; var p=(Y*S+X)*4; var r,g,b;
    if(useC){ var c=LUT[Math.round(t*255)]; r=c[0];g=c[1];b=c[2]; if(o.kind==='map'&&v<=0){ r=g=b=0; } } else { r=g=b=Math.round(t*255); }
    if(o.overlay && !opts.k){ var ov=o.overlay[q]; if(ov>o.othr){ var f=Math.min(1,(ov-o.othr)/6); r=255; g=Math.round(60+195*f); b=0; } }
    if(edge){ var q2=peV? Y*S+Math.min(S-1,X+1) : Math.min(S-1,X+1)*S+Y, q3=peV? Math.min(S-1,Y+1)*S+X : X*S+Math.min(S-1,Y+1); if(lab[q]!==lab[q2]||lab[q]!==lab[q3]){ r=255; g=210; b=60; } }
    D[p]=r; D[p+1]=g; D[p+2]=b; D[p+3]=255; }
  ctx.putImageData(img,0,0); }
function cssSize(){ var g=res.geo, wide=Math.min(($('#stage').clientWidth||480)/(pinned&&$('#stage').clientWidth>700?2.05:1),900); var ar=g.fovpe/g.fov; var w,h; if(g.peV){ w=wide; h=wide*ar; } else { w=wide*ar; h=wide;  } var mh=document.body.classList.contains('mob')? Math.max(160,Math.round(window.innerHeight*0.31)) : Math.max(260,Math.min(900,Math.round(window.innerWidth>=1200?window.innerHeight-330:(window.innerWidth>900?window.innerHeight*0.45:window.innerHeight-200)))); if(h>mh){ var k=mh/h; h=mh; w=w*k; } return [w,h]; }
function panel(o,title,sub,win,isPin){ var wrap=el('div',{class:'cv'}); var c=el('canvas'); render(o,c,win,{k:!isPin&&$('#showK').checked}); var sz=cssSize(); c.style.width=sz[0]+'px'; c.style.height=sz[1]+'px'; wrap.appendChild(c);
  wrap.appendChild(el('div',{class:'lab',html:title})); wrap.appendChild(el('div',{class:'lab2',html:sub}));
  var pl=MS.PHANTOMS[st.phantom].plane; var L=pl==='sag'?['S','I','A','P']:(pl==='cor'?['S','I','R','L']:['A','P','R','L']); [['top:4px;left:50%',L[0]],['bottom:4px;left:50%',L[1]],['left:4px;top:50%',L[2]],['right:4px;top:50%',L[3]]].forEach(function(a){ var d=el('div',{class:'ori',style:a[0]},a[1]); wrap.appendChild(d); });
  return {wrap:wrap,c:c}; }
function show(r){ res=r; var o=res.outs[cur]||res.outs[0]; if(!res.outs[cur]) cur=0; var stg=$('#stage'); stg.innerHTML='';
  $('#imgttl').textContent=o.name;
  if(o.kind==='spectrum'){ var cv=el('canvas',{width:720,height:380}); cv.style.width='100%'; cv.style.maxWidth='720px'; cv.style.background='#0b1214'; cv.style.borderRadius='8px'; stg.appendChild(cv); drawSpec(cv,o.spec); }
  else { var win=manualW||autoWin(o); var sub=MS.fmt(res.info.dx)+'×'+MS.fmt(res.info.dy)+'×'+MS.fmt(res.info.dz)+' mm'+(o.unit?'　'+o.unit:'')+'<br>WW '+MS.fmt(win.hi-win.lo)+'　WL '+MS.fmt((win.hi+win.lo)/2);
    var P=panel(o,MS.SEQ[st.seq].n+'<br>'+(MS.PHANTOMS[st.phantom].n)+'　'+st.B0+' T',sub,win); stg.appendChild(P.wrap); attachMouse(P.c,o,win);
    if(pinned){ var w2=el('div',{class:'cv'}); var c2=el('canvas'); c2.width=pinned.c.width; c2.height=pinned.c.height; c2.getContext('2d').drawImage(pinned.c,0,0); var sz=cssSize(); c2.style.width=sz[0]+'px'; c2.style.height=sz[1]+'px'; w2.appendChild(c2); w2.appendChild(el('div',{class:'lab',html:'固定：'+pinned.t})); stg.appendChild(w2); } }
  /* サムネイル */
  var th=$('#thumbs'); th.innerHTML=''; if(res.outs.length>1) res.outs.forEach(function(oo,i){ if(oo.kind==='spectrum') return; var b=el('button',{'aria-pressed':String(i===cur),title:oo.name}); var c=el('canvas'); render(oo,c,autoWin(oo),{}); c.style.width='96px'; c.style.height=Math.round(96*(res.geo.peV?res.geo.fovpe/res.geo.fov:res.geo.fov/res.geo.fovpe))+'px'; b.appendChild(c); b.appendChild(el('span',{},oo.name)); b.onclick=function(){ cur=i; manualW=null; show(res); }; th.appendChild(b); });
  buildChartUI(); metrics(); kfill(); bars(o); markAdjusted();
  if(fresh&&chart.follow&&lastChanged&&chartKeys().indexOf(lastChanged)>=0&&chart.mode==='curve'&&chart.xk!==lastChanged){ chart.xk=lastChanged; } fresh=false;
  buildChartUI(); reqChart(); }
function attachMouse(c,o,win){ var drag=null; c.onpointerdown=function(e){ drag={x:e.clientX,y:e.clientY,w:Object.assign({},win)}; c.setPointerCapture(e.pointerId); };
  c.onpointermove=function(e){ var rc=c.getBoundingClientRect(); var X=Math.floor((e.clientX-rc.left)/rc.width*res.S), Y=Math.floor((e.clientY-rc.top)/rc.height*res.S); hover(X,Y,o);
    if(drag){ var ww=drag.w.hi-drag.w.lo, wl=(drag.w.hi+drag.w.lo)/2; var k=(drag.w.hi-drag.w.lo||1)/200; ww=Math.max(1e-6,ww+(e.clientX-drag.x)*k); wl=wl-(e.clientY-drag.y)*k; manualW={lo:wl-ww/2,hi:wl+ww/2}; render(o,c,manualW,{k:$('#showK').checked}); } };
  c.onpointerup=function(){ if(drag&&manualW) show(res); drag=null; }; c.ondblclick=function(){ manualW=null; show(res); }; }
function hover(X,Y,o){ if(X<0||Y<0||X>=res.S||Y>=res.S) return; var q=res.geo.peV? Y*res.S+X : X*res.S+Y; var li=res.labC[q]; var t=li>=0?res.tps[li]:null; var v=o.data[q];
  var s=(t?'<b>'+t.n+'</b>　':'')+'値 '+MS.fmt(v)+(o.unit?' '+o.unit:'');
  if(t&&t.PD) s+='　｜ T1 '+Math.round(t.T1)+' ms, T2 '+Math.round(t.T2)+' ms, T2* '+MS.fmt(t.T2s)+' ms, ADC '+t.ADC+(t.dR1?'，造影 ΔR1 '+MS.fmt(t.dR1)+' s⁻¹':'')+(t.ff?'，脂肪分率 '+Math.round(t.ff*100)+'%':'');
  $('#hover').innerHTML=s; }
function mmss(s){ if(s<60) return s.toFixed(1)+' 秒'; var m=Math.floor(s/60), r=Math.round(s-m*60); if(r===60){ m++; r=0; } return m+' 分 '+(r<10?'0':'')+r+' 秒'; }
function metrics(){ var i=res.info, m=$('#metrics'); m.innerHTML=''; var sq=MS.SEQ[st.seq];
  function add(v,l,cls){ var d=el('div',{class:'metric'+(cls?' '+cls:'')}); d.appendChild(el('b',{},v)); d.appendChild(el('span',{},l)); m.appendChild(d); }
  add(mmss(i.T),'撮像時間',st.resp==='bh'&&i.T>22?'bad':'');
  add(sq.k==='mrs'?'—':Math.round(i.snr0/(snrRef||i.snr0)*100)+' %','SNR（このシーケンスの既定条件比）',i.snr0/(snrRef||1)<0.5?'mid':'');
  add(MS.fmt(i.dx)+'×'+MS.fmt(i.dy)+'×'+MS.fmt(i.dz),'取得ボクセル（mm）');
  add(Math.round(i.sar)+' %','SAR（上限比・相対）',i.sar>100?'bad':(i.sar>70?'mid':''));
  if(i.tres) add(MS.fmt(i.tres)+' ms','時間分解能');
  if(i.conc>1) add(i.conc+' 回','分割収集（スライスがTRに入らない）');
  if(i.etlEPI) add(i.etlEPI+' × '+MS.fmt(i.p.esp_epi)+' ms','EPI エコー数 × 間隔');
  if(i.R>1||i.CS>1||(st.p.sms||1)>1) add('×'+MS.fmt(i.R*(i.Rz||1)*(i.CS||1)*(st.p.sms||1)),'総加速（PI×CS×SMS）');
  add(MS.fmt(i.tro)+' ms','読出し時間（1/BW）');
  if(st.B0) add(MS.fmt(Math.abs(MS.FAT_PPM*42.577*st.B0/st.p.bw*1))+' 画素','化学シフト（読出し方向）');
  var w=$('#warns'); w.innerHTML=''; i.W.forEach(function(x){ w.appendChild(el('li',{class:x.lv},x.t)); }); }
function markAdjusted(){ grpBadges(); markAdjusted0(); }
function markAdjusted0(){ var p=res.info.p; document.querySelectorAll('#params label.sim-control[data-k]').forEach(function(lb){ var k=lb.dataset.k; if(!k) return; lb.classList.toggle('adj', p[k]!==undefined && Math.abs(p[k]-st.p[k])>1e-6); }); }
function medians(r,o){ var S=r.S, lab=r.labC, acc={}; for(var q=0;q<S*S;q++){ var li=lab[q]; if(li<=0) continue; (acc[li]=acc[li]||[]).push(o.data[q]); } var m={}; Object.keys(acc).forEach(function(li){ var a=acc[li].sort(function(x,y){return x-y;}); m[r.tps[li].key]={v:a[a.length>>1],n:a.length,li:+li}; }); return m; }
function prevOut(o){ if(!prevRes||prevRes.seq!==st.seq) return null; for(var i=0;i<prevRes.outs.length;i++) if(prevRes.outs[i].name===o.name&&prevRes.outs[i].data) return prevRes.outs[i]; return null; }
function bars(o){ var box=$('#bars'); box.innerHTML=''; res.seq=st.seq; if(o.kind==='spectrum'){ box.innerHTML='<tr><td colspan="5">スペクトル表示では組織ごとの信号を出しません。</td></tr>'; return; }
  var cm=medians(res,o), po=prevOut(o), pm=po?medians(prevRes,po):null;
  var rows=Object.keys(cm).map(function(k){ return {k:k,v:cm[k].v,n:cm[k].n,li:cm[k].li}; }).filter(function(r){ return r.n>30; }).sort(function(a,b){ return b.v-a.v; });
  var mx=Math.max.apply(null,rows.map(function(r){return Math.abs(r.v);}))||1; var sig=1/res.info.snr0;
  rows.forEach(function(r){ var t=res.tps[r.li]; var tr=el('tr'); tr.appendChild(el('td',{},t.n)); tr.appendChild(el('td',{},t.PD?(Math.round(t.T1)+' / '+Math.round(t.T2)+' / '+MS.fmt(t.T2s)+' ms'+(t.dR1?'（ΔR1 '+MS.fmt(t.dR1)+' s⁻¹）':'')):'—'));
    var td=el('td'); var bc=el('div',{class:'bar-cell'}); var bar=el('i'); bar.style.width=Math.max(2,Math.abs(r.v)/mx*90)+'px'; bar.style.background=colorOf(r.k); bc.appendChild(bar); bc.appendChild(document.createTextNode(o.kind==='mag'?String(Math.round(r.v/mx*100)):MS.fmt(r.v)+(o.unit?' '+o.unit:''))); td.appendChild(bc); tr.appendChild(td);
    tr.appendChild(el('td',{},o.kind==='mag'&&isFinite(sig)?String(Math.round(r.v/sig)):'—'));
    var d='—'; if(pm&&pm[r.k]&&Math.abs(pm[r.k].v)>1e-9){ var ch=(r.v-pm[r.k].v)/Math.abs(pm[r.k].v)*100; d=(ch>0?'+':'')+ch.toFixed(Math.abs(ch)<10?1:0)+' %'; } var tdd=el('td',{},d); if(d!=='—'){ var c=parseFloat(d); if(Math.abs(c)>=1) tdd.style.color=c>0?'var(--rt-ok)':'var(--rt-danger)'; tdd.style.fontWeight='700'; } tr.appendChild(tdd);
    box.appendChild(tr); });
  /* CNR（A 対 B） */
  var mA=cm[chart.A], mB=cm[chart.B]; if(mA&&mB&&o.kind==='mag'){ var cnr=Math.abs(mA.v-mB.v)/sig, lbl='CNR（'+res.tps[mA.li].n+' 対 '+res.tps[mB.li].n+'）'; var extra=''; if(pm&&pm[chart.A]&&pm[chart.B]){ var pc=Math.abs(pm[chart.A].v-pm[chart.B].v)*prevRes.info.snr0; var ch2=(cnr-pc)/Math.max(pc,1e-9)*100; extra=' 前回比 '+(ch2>0?'+':'')+ch2.toFixed(0)+'%'; }
    var mm=$('#metrics'); var dv=el('div',{class:'metric',style:'grid-column:1 / -1'}); dv.appendChild(el('b',{},fmtN(cnr)+(extra?'　':'' ))); if(extra){ var sp=el('small',{style:'font-size:12px;font-weight:700;color:'+(parseFloat(extra.replace(/[^-0-9.]/g,''))>=0?'var(--rt-ok)':'var(--rt-danger)')},extra); dv.firstChild.appendChild(sp); } dv.appendChild(el('span',{},lbl+'（組織A・Bはグラフで変更）')); mm.insertBefore(dv,mm.firstChild); } }
/* MRS */
function drawSpec(cv,sp){ var g=cv.getContext('2d'), W=cv.width, H=cv.height; g.fillStyle='#0b1214'; g.fillRect(0,0,W,H);
  var x0=40,x1=W-20,y0=20,y1=H-40; function X(ppm){ return x0+(4.2-ppm)/(4.2-0.4)*(x1-x0); }
  var te=sp.te, J=6.9; var mets=sp.lesion?[['Cho',3.22,1.4,200],['Cr',3.03,0.45,150],['Cr',3.92,0.3,120],['NAA',2.01,0.35,250],['Lac',1.33,0.7,1000,'d'],['Lip',1.3,te<60?1.1:0.15,60],['Lip',0.9,te<60?0.7:0.1,60]]:[['NAA',2.01,1.0,250],['Cr',3.03,0.65,150],['Cr',3.92,0.4,120],['Cho',3.22,0.5,200],['mI',3.56,0.45,150,'j'],['Glx',2.3,0.35,120,'j'],['Glx',3.75,0.25,120,'j']];
  var lw=sp.lw/(42.577*sp.B)*0.95; var N=900, ys=new Float32Array(N), Rn=MS.rnd||Math.random;
  for(var i=0;i<N;i++){ var ppm=4.2-(4.2-0.4)*i/(N-1), s=0; mets.forEach(function(m){ var a=m[2]*Math.exp(-te/m[3]); if(m[4]==='d'){ a*=Math.cos(Math.PI*J*te/1000); var dd=J/2/(42.577*sp.B); s+=a/2*L(ppm,m[1]-dd,lw)+a/2*L(ppm,m[1]+dd,lw); } else { if(m[4]==='j') a*=te<60?1:0.25; s+=a*L(ppm,m[1],lw); } }); ys[i]=s+(Math.random()-0.5)*2/Math.max(1,sp.snr)*1.4; }
  function L(x,c,w){ var d=(x-c)/(w/2); return 1/(1+d*d); }
  var mx=0; for(var k=0;k<N;k++) mx=Math.max(mx,Math.abs(ys[k])); var sc=(y1-y0)*0.8/mx, base=y1-(y1-y0)*0.15;
  g.strokeStyle='#2a3a3e'; g.beginPath(); g.moveTo(x0,base); g.lineTo(x1,base); g.stroke();
  g.strokeStyle='#5eead4'; g.lineWidth=1.4; g.beginPath(); for(var j=0;j<N;j++){ var xx=x0+(x1-x0)*j/(N-1), yy=base-ys[j]*sc; if(j) g.lineTo(xx,yy); else g.moveTo(xx,yy); } g.stroke();
  g.fillStyle='#cfe'; g.font='12px sans-serif'; [4,3.5,3,2.5,2,1.5,1,0.5].forEach(function(p){ g.fillText(p.toFixed(1),X(p)-8,y1+16); }); g.fillText('ppm',x1-24,y1+30);
  g.fillStyle='#ffd27a'; var seen={}; mets.forEach(function(m){ if(seen[m[0]+Math.round(m[1])]) return; seen[m[0]+Math.round(m[1])]=1; g.fillText(m[0],X(m[1])-10,y0+12); });
  g.fillStyle='#9fb0b5'; g.fillText('TE '+te+' ms'+(te>=120&&te<=160?'：乳酸の二重線は下向き（J ≈ 7 Hz による位相反転）':'')+'　線幅 ≈ '+MS.fmt(sp.lw)+' Hz',x0,H-6); }
/* ---------- コントラストのグラフ（曲線・2Dマップ） ---------- */
var chart={mode:'curve',xk:null,yk:null,metric:'sig',A:null,B:null,follow:true,full:false,hide:{},data:null,busy:false,queued:false,id:0,defP:null,defKey:null,logk:{},sig:null};
var LOGAX={tr:1,trs:1,bw:1};
var lastChanged=null, prevRes=null, mode='expert';
var MET={sig:'信号（M0=100）',snr:'SNR（組織ごと）',diff:'コントラスト A−B（M0=100）',ratio:'信号比 A/B',cnr:'CNR（|A−B|／雑音）',cnrt:'CNR効率（CNR／√撮像時間）',time:'撮像時間（秒）',sar:'SAR（相対 %）'};
function chartColors(){ var cs=getComputedStyle(document.documentElement); function v(n,d){ var x=cs.getPropertyValue(n).trim(); return x||d; } var pal=v('--ch-pal',''); if(pal) PAL=pal.split(',').map(function(x){return x.trim();}); else PAL=PAL0; return {text:v('--ch-text','#52667d'),text2:v('--ch-text2','#34495f'),grid:v('--ch-grid','#e6edf3'),zero:v('--ch-zero','#9fb0c0'),frame:v('--ch-frame','#b9c8d8'),frame2:v('--ch-frame2','#d7e1eb'),cursor:v('--ch-cursor','#12283e'),dot:v('--ch-dot','#fff')}; }
var PAL0=['#007d82','#c2410c','#2c55a5','#9f2f3b','#6d28d9','#15803d','#b45309','#0e7490','#be185d','#4d7c0f','#475569','#a16207','#1d4ed8','#7c2d12']; var PAL=PAL0.slice();
var pworker=null; try{ pworker=new Worker(URL.createObjectURL(new Blob([wsrc],{type:'text/javascript'}))); pworker.onmessage=function(e){ chart.busy=false; if(!e.data.err && e.data.id===chart.id){ chart.data=e.data.r; drawChart(); } else if(e.data.err) console.error(e.data.err); if(chart.queued){ chart.queued=false; reqChart(); } }; }catch(e){ pworker=null; }
function uniq(a){ var o=[]; a.forEach(function(x){ if(o.indexOf(x)<0) o.push(x); }); return o; }
function chartKeys(){ var sq=MS.SEQ[st.seq], ks;
  if(mode==='learn'&&MS.LEARN_MAP[st.seq]) ks=MS.LEARN_MAP[st.seq].p.concat(MS.LEARN_COMMON); else ks=visibleParams(sq);
  ks=ks.filter(function(k){ return k!=='bvals' && MS.PDEF[k] && MS.PDEF[k].max>MS.PDEF[k].min && st.p[k]!==undefined; });
  var gi={con:0,spc:1,geo:2,acc:3}; ks.sort(function(a,b){ return (gi[MS.PDEF[a].g]||0)-(gi[MS.PDEF[b].g]||0); });
  if(/dwi|dti/.test(sq.k)) ks.unshift('b'); if((st.agent&&st.agent!=='none')||sq.forceAgent) ks.push('dose'); ks.push('B0'); return uniq(ks); }
function pdefX(k){ if(k==='b') return {id:'b',n:'b値',u:'s/mm²',min:0,max:4000,step:10}; if(k==='dose') return {id:'dose',n:'造影剤 投与量',u:'×',min:0.1,max:3,step:0.05}; if(k==='B0') return {id:'B0',n:'静磁場',u:'T',min:0.5,max:3,step:0.05};
  var d=MS.PDEF[k]; return {id:k,n:d.n,u:d.u,min:d.min,max:d.max,step:d.step,log:!!LOG[k]}; }
function curX(k){ if(k==='b'){ var b=(st.p.bvals||'0,1000').split(',').map(Number); return b[b.length-1]||1000; } if(k==='dose') return st.dose||1; if(k==='B0') return st.B0; return st.p[k]; }
function anchorOf(k){ var key=st.phantom+'|'+st.seq; if(chart.defKey!==key){ chart.defKey=key; try{ chart.defP=MS.defaultState(st.phantom,st.seq).p; }catch(e){ chart.defP={}; } }
  if(k==='b'){ var b=(chart.defP.bvals||'0,1000').split(',').map(Number); return b[b.length-1]||1000; } if(k==='dose') return 1; if(k==='B0') return 1.5; var v=chart.defP[k]; return (v===undefined||v===null)?curX(k):v; }
function isLog(d){ if(chart.logk[d.id]!==undefined) return chart.logk[d.id]&&d.min>0; return !!LOGAX[d.id]&&d.min>0; }
/* 横軸の範囲：現在値ではなく、このシーケンスの既定値を基準に固定（動かしても軸は動かず、縦線だけが動く） */
function xRange(d,v){ var lo=d.min, hi=d.max, a=anchorOf(d.id), lg=isLog(d);
  if(!chart.full){ if(d.id==='B0'){ lo=0.5; hi=3; } else if(d.id==='pf'||d.id==='pfz'){ lo=0.5; hi=1; } else if(d.id==='fa'||d.id==='fa2'){ lo=1; hi=Math.min(180,Math.max(90,a*2)); } else if(d.id==='b'){ lo=0; hi=Math.max(2000,a*2); }
    else if(lg){ lo=Math.max(d.min,a/10); hi=Math.min(d.max,a*10); } else { lo=d.min; hi=Math.min(d.max,Math.max(a*3,d.min+(d.step||1)*10)); } }
  if(isFinite(v)){ if(v<lo) lo=Math.max(d.min,lg?v/1.5:v-(hi-lo)*0.1); if(v>hi) hi=Math.min(d.max,lg?v*1.5:v+(hi-lo)*0.15); }
  if(!(hi>lo)) hi=lo+(d.step||1); return [lo,hi]; }
function samp(d,lo,hi,n){ var a=[]; for(var i=0;i<n;i++){ var t=i/(n-1); a.push((isLog(d)&&lo>0)? lo*Math.pow(hi/lo,t) : lo+(hi-lo)*t); } return a; }
function defaultAB(){ var L=mode==='learn'?MS.LEARN_MAP[st.seq]:null; if(L){ chart.A=L.A; chart.B=L.B; return; }
  var pref=MS.PHANTOMS[st.phantom].ab||{brain:['wm','gm'],chest:['blood_c','myo'],abd:['liver','spleen'],pelvis:['myometrium','jz'],msk:['cartilage','fluid'],spine:['disc_n','marrow_v'],breast:['fgt','fat']}[MS.PHANTOMS[st.phantom].region]||['muscle','fat'];
  if(st.phantom==='pelvisM') pref=['pz','tz']; var les=res?res.tps.filter(function(t){ return MS.TISSUES[t.key]&&MS.TISSUES[t.key].lesion&&t.PD; }):[];
  chart.A=les.length?les[0].key:pref[0]; chart.B=les.length?pref[0]:pref[1]; if(chart.A===chart.B) chart.B=pref[1]; }
function present(){ var cnt={}; if(!res) return []; var lab=res.labC; for(var q=0;q<lab.length;q++){ var li=lab[q]; if(li>0) cnt[li]=(cnt[li]||0)+1; }
  return Object.keys(cnt).map(function(li){ return {li:+li,key:res.tps[li].key,n:res.tps[li].n,c:cnt[li]}; }).filter(function(x){ return res.tps[x.li].PD>0.05; }).sort(function(a,b){ return b.c-a.c; }); }
function buildChartUI(){ var box=$('#chartctl'); if(!box||!res) return; box.innerHTML=''; var ks=chartKeys(); if(!chart.xk||ks.indexOf(chart.xk)<0) chart.xk=ks[0]; if(!chart.yk||ks.indexOf(chart.yk)<0||chart.yk===chart.xk) chart.yk=ks.filter(function(k){return k!==chart.xk;})[0]||ks[0];
  var pr=present(); var keys=pr.map(function(x){return x.key;}); if(!chart.A||keys.indexOf(chart.A)<0||!chart.B||keys.indexOf(chart.B)<0) defaultAB(); if(keys.indexOf(chart.A)<0) chart.A=keys[0]; if(keys.indexOf(chart.B)<0) chart.B=keys[1]||keys[0];
  var md=el('div',{class:'sim-presets',style:'margin-bottom:6px'}); [['curve','曲線（横軸＝パラメータ）'],['map','2Dマップ（縦横＝パラメータ）']].forEach(function(m){ var b=el('button',{type:'button','aria-pressed':String(chart.mode===m[0])},m[1]); if(chart.mode===m[0]){ b.style.background='var(--rt-accent)'; b.style.color='#fff'; b.style.borderColor='var(--rt-accent)'; } b.onclick=function(){ chart.mode=m[0]; if(m[0]==='map'&&(chart.metric==='sig'||chart.metric==='snr')) chart.metric='cnr'; buildChartUI(); reqChart(); }; md.appendChild(b); }); box.appendChild(md);
  var g=el('div',{class:'sim-controls',style:'grid-template-columns:repeat(2,minmax(0,1fr));margin:6px 0'});
  var xo=ks.map(function(k){ var d=pdefX(k); return [k,d.n+(d.u?'（'+d.u+'）':'')]; });
  g.appendChild(csel('横軸',xo,function(){return chart.xk;},function(v){ chart.xk=v; chart.follow=false; buildChartUI(); reqChart(); }));
  if(chart.mode==='map') g.appendChild(csel('縦軸',xo.filter(function(o){return o[0]!==chart.xk;}),function(){return chart.yk;},function(v){ chart.yk=v; buildChartUI(); reqChart(); }));
  var mo=Object.keys(MET).filter(function(k){ return chart.mode==='curve'||(k!=='sig'&&k!=='snr'); }).map(function(k){ return [k,MET[k]]; }); if(chart.mode==='map') mo.unshift(['sigA','組織Aの信号（M0=100）']);
  g.appendChild(csel(chart.mode==='map'?'色（指標）':'縦軸（指標）',mo,function(){return chart.metric;},function(v){ chart.metric=v; buildChartUI(); drawChart(); }));
  var to=pr.map(function(x){ return [x.key,x.n]; });
  g.appendChild(csel('組織 A',to,function(){return chart.A;},function(v){ chart.A=v; buildChartUI(); drawChart(); }));
  g.appendChild(csel('組織 B',to,function(){return chart.B;},function(v){ chart.B=v; buildChartUI(); drawChart(); }));
  box.appendChild(g);
  var cks=el('div',{class:'vtools',style:'margin:0 0 6px'}); var c1=el('label'); var i1=el('input',{type:'checkbox'}); i1.checked=chart.follow; i1.onchange=function(){ chart.follow=i1.checked; }; c1.appendChild(i1); c1.appendChild(document.createTextNode('変えたパラメータに横軸を合わせる')); cks.appendChild(c1);
  var c2=el('label'); var i2=el('input',{type:'checkbox'}); i2.checked=chart.full; i2.onchange=function(){ chart.full=i2.checked; reqChart(); }; c2.appendChild(i2); c2.appendChild(document.createTextNode('設定範囲の全体')); cks.appendChild(c2);
  var dxl=pdefX(chart.xk); if(dxl.min>0){ var c3=el('label'); var i3=el('input',{type:'checkbox'}); i3.checked=isLog(dxl); i3.onchange=function(){ chart.logk[chart.xk]=i3.checked; reqChart(); }; c3.appendChild(i3); c3.appendChild(document.createTextNode('横軸を対数に')); cks.appendChild(c3); }
  box.appendChild(cks);
  /* 曲線に出す組織 */
  if(chart.mode==='curve'){ var lg=el('div',{class:'vtools',id:'legend',style:'margin-top:4px'}); var shown=0; pr.forEach(function(x,i){ if(chart.hide[x.key]===undefined) chart.hide[x.key]=!(x.key===chart.A||x.key===chart.B||(shown<5&&!/^(skin|bone|dura|air|marrow_r|choroid|vessel_l)$/.test(x.key))); if(!chart.hide[x.key]) shown++; var lb=el('label'); var ci=el('input',{type:'checkbox'}); ci.checked=!chart.hide[x.key]; ci.onchange=function(){ chart.hide[x.key]=!ci.checked; drawChart(); }; lb.appendChild(ci); var sw=el('span',{style:'display:inline-block;width:12px;height:3px;background:'+colorOf(x.key)+';margin:0 2px'}); lb.appendChild(sw); lb.appendChild(document.createTextNode(x.n)); lg.appendChild(lb); }); box.appendChild(lg); }
}
var colIdx={}; function colorOf(k){ if(colIdx[k]===undefined) colIdx[k]=Object.keys(colIdx).length; return PAL[colIdx[k]%PAL.length]; }
function csel(name,opts,get,set){ var d=el('label',{class:'sim-control'}); d.appendChild(document.createTextNode(name)); var s=el('select'); opts.forEach(function(o){ var op=el('option',{value:o[0]},o[1]); if(String(get())===String(o[0])) op.selected=true; s.appendChild(op); }); s.onchange=function(){ set(s.value); }; d.appendChild(s); return d; }
function chartSig(){ var c=JSON.parse(JSON.stringify(st)); [chart.xk,chart.mode==='map'?chart.yk:null].forEach(function(k){ if(!k) return; if(k==='b') c.p.bvals=''; else if(k==='dose') c.dose=0; else if(k==='B0') c.B0=0; else if(k==='hr') c.hr=0; else c.p[k]=0; }); return JSON.stringify(c)+'|'+cur+'|'+chart.mode+'|'+chart.full+'|'+JSON.stringify(chart.logk); }
function cursorOnly(){ if(!chart.spec) return; chart.spec.vx=curX(chart.xk); if(chart.mode==='map') chart.spec.vy=curX(chart.yk); drawChart(); }
function reqChart(){ if(!res||!st) return; var o=res.outs[cur]; if(o&&o.kind==='spectrum'){ chart.data=null; drawChart(); return; }
  var dx=pdefX(chart.xk); dx.log=isLog(dx); var vx=curX(chart.xk), rx=xRange(dx,vx); var spec={mode:chart.mode,xk:chart.xk,out:cur,xs:samp(dx,rx[0],rx[1],chart.mode==='map'?28:81),xd:dx,vx:vx};
  if(chart.mode==='map'){ var dy=pdefX(chart.yk); dy.log=isLog(dy); var vy=curX(chart.yk), ry=xRange(dy,vy); spec.yk=chart.yk; spec.ys=samp(dy,ry[0],ry[1],22); spec.yd=dy; spec.vy=vy; }
  var sg=chartSig()+'|'+spec.xs[0]+'|'+spec.xs[spec.xs.length-1]+(spec.ys?'|'+spec.ys[0]+'|'+spec.ys[spec.ys.length-1]:'')+'|'+spec.xk+'|'+(spec.yk||'');
  if(chart.data&&chart.sig===sg){ cursorOnly(); return; }
  if(chart.busy){ chart.queued=true; return; }
  chart.sig=sg; chart.spec=spec; chart.id++; var snap=JSON.parse(JSON.stringify(st));
  if(pworker){ chart.busy=true; pworker.postMessage({type:'probe',id:chart.id,st:snap,spec:spec}); }
  else { try{ chart.data=MS.probe(snap,spec); }catch(e){ console.error(e); } drawChart(); } }
function interp(xs,vs,x,lg){ var n=xs.length; if(!(n>1)) return NaN; var f=function(v){ return lg?Math.log(v):v; }; var t=f(x); for(var i=0;i<n-1;i++){ var a=f(xs[i]), b=f(xs[i+1]); if((t>=a&&t<=b)||(t<=a&&t>=b)){ var w=(t-a)/((b-a)||1); return vs[i]+(vs[i+1]-vs[i])*w; } } return NaN; }
function metricVal(pt,keys,m,ti){ var iA=keys.indexOf(chart.A), iB=keys.indexOf(chart.B); var a=pt.v[iA], b=pt.v[iB]; var sc=(pt.kind==='mag'||pt.kind==='signed')?100:1;
  switch(m){ case 'sig': return pt.v[ti]*sc; case 'snr': return pt.v[ti]*pt.snr; case 'sigA': return a*sc; case 'diff': return (a-b)*sc; case 'ratio': return b?a/b:NaN; case 'cnr': return Math.abs(a-b)*pt.snr; case 'cnrt': return Math.abs(a-b)*pt.snr/Math.sqrt(Math.max(pt.T,1e-3)); case 'time': return pt.T; case 'sar': return pt.sar; } return NaN; }
function fmtN(v){ if(!isFinite(v)) return '—'; var a=Math.abs(v); return a>=1000?Math.round(v).toLocaleString():a>=100?v.toFixed(0):a>=10?v.toFixed(1):a>=1?v.toFixed(2):v.toFixed(3); }
function drawChart(){ var cv=$('#chartcv'); if(!cv) return; var note=$('#chartnote'); var W=cv.clientWidth||460, big=window.innerWidth>=1200, H=chart.mode==='map'?(big?Math.max(360,Math.min(520,W*0.8)):330):(big?Math.max(300,Math.min(460,W*0.68)):290); var dpr=window.devicePixelRatio||1; cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px'; var CC=chartColors(); var g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  var D=chart.data, sp=chart.spec; g.font='11px '+getComputedStyle(document.body).fontFamily;
  if(!D||!sp||!res){ g.fillStyle=CC.text; g.fillText(res&&res.outs[cur]&&res.outs[cur].kind==='spectrum'?'スペクトルにはグラフを出しません。':'計算中…',12,24); return; }
  var keys=D.keys, m=chart.metric, L=50, R=chart.mode==='map'?58:24, T=14, B=36; var pw=W-L-R, ph=H-T-B;
  var dx=sp.xd, lx=dx.log&&sp.xs[0]>0; var x0=sp.xs[0], x1=sp.xs[sp.xs.length-1]; function X(v){ return L+(lx? Math.log(v/x0)/Math.log(x1/x0) : (v-x0)/(x1-x0))*pw; }
  function ticks(a,b,log){ var t=[]; if(log){ var e0=Math.floor(Math.log10(a)), e1=Math.ceil(Math.log10(b)); for(var e=e0;e<=e1;e++) [1,2,5].forEach(function(k){ var v=k*Math.pow(10,e); if(v>=a*0.999&&v<=b*1.001) t.push(v); }); return t; } var st_=Math.pow(10,Math.floor(Math.log10((b-a)/4||1))); var n=(b-a)/st_; if(n>8) st_*=2; if(n>16) st_*=2.5; for(var v=Math.ceil(a/st_)*st_;v<=b+1e-9;v+=st_) t.push(+v.toFixed(10)); return t; }
  g.strokeStyle=CC.frame2; g.fillStyle=CC.text; g.lineWidth=1;
  ticks(x0,x1,lx).forEach(function(v){ var x=X(v); g.beginPath(); g.moveTo(x,T); g.lineTo(x,T+ph); g.stroke(); g.textAlign='center'; g.fillText(fmtN(v),x,T+ph+14); });
  g.textAlign='center'; g.fillStyle=CC.text2; g.fillText(dx.n+(dx.u?'（'+dx.u+'）':''),L+pw/2,H-4);
  if(chart.mode==='curve'){
    var series=[]; if(m==='sig'||m==='snr'){ keys.forEach(function(k,i){ if(chart.hide[k]||chart.hide[k]===undefined&&k!==chart.A&&k!==chart.B) return; if(!present().some(function(p){return p.key===k;})) return; series.push({k:k,n:D.names[i],c:colorOf(k),v:D.pts.map(function(pt){ return metricVal(pt,keys,m,i); }),cur:metricVal(D.cur,keys,m,i)}); }); }
    else series.push({k:'m',n:MET[m],c:PAL[0],v:D.pts.map(function(pt){ return metricVal(pt,keys,m); }),cur:metricVal(D.cur,keys,m)});
    var ymin=0,ymax=0; series.forEach(function(s){ s.v.forEach(function(v){ if(isFinite(v)){ if(v<ymin) ymin=v; if(v>ymax) ymax=v; } }); }); if(m==='ratio'){ ymin=Math.min(ymin,0); } if(ymax===ymin) ymax=ymin+1; ymax*=1.06; if(ymin<0) ymin*=1.06;
    function Y(v){ return T+ph-(v-ymin)/(ymax-ymin)*ph; }
    ticks(ymin,ymax,false).forEach(function(v){ var y=Y(v); g.strokeStyle=CC.grid; g.beginPath(); g.moveTo(L,y); g.lineTo(L+pw,y); g.stroke(); g.fillStyle=CC.text; g.textAlign='right'; g.fillText(fmtN(v),L-5,y+4); });
    if(ymin<0){ g.strokeStyle=CC.zero; g.beginPath(); g.moveTo(L,Y(0)); g.lineTo(L+pw,Y(0)); g.stroke(); }
    g.strokeStyle=CC.frame; g.strokeRect(L,T,pw,ph);
    series.forEach(function(s){ g.strokeStyle=s.c; g.lineWidth=2; g.beginPath(); var st0=false; s.v.forEach(function(v,i){ if(!isFinite(v)){ st0=false; return; } var x=X(sp.xs[i]), y=Y(v); if(!st0){ g.moveTo(x,y); st0=true; } else g.lineTo(x,y); }); g.stroke(); });
    /* 現在値の縦線 */
    if(sp.vx>=Math.min(x0,x1)&&sp.vx<=Math.max(x0,x1)){ var xc=X(sp.vx); g.save(); g.setLineDash([5,4]); g.strokeStyle=CC.cursor; g.lineWidth=1.4; g.beginPath(); g.moveTo(xc,T); g.lineTo(xc,T+ph); g.stroke(); g.restore(); g.fillStyle=CC.cursor; g.textAlign=xc>L+pw-80?'right':'left'; g.font='bold 11px '+getComputedStyle(document.body).fontFamily; g.fillText(' 現在 '+fmtN(sp.vx)+(dx.u?' '+dx.u:'')+' ',xc,T+11);
      series.forEach(function(s){ var cv_=interp(sp.xs,s.v,sp.vx,lx); s.cur=cv_; if(!isFinite(cv_)) return; g.fillStyle=CC.dot; g.beginPath(); g.arc(xc,Y(cv_),5,0,7); g.fill(); g.fillStyle=s.c; g.beginPath(); g.arc(xc,Y(cv_),3.6,0,7); g.fill(); }); }
    cv.onmousemove=function(e){ var rc=cv.getBoundingClientRect(), mx=e.clientX-rc.left; var best=0,bd=1e9; sp.xs.forEach(function(v,i){ var d=Math.abs(X(v)-mx); if(d<bd){bd=d;best=i;} });
      var s='<b>'+dx.n+' '+fmtN(sp.xs[best])+(dx.u?' '+dx.u:'')+'</b>：'+series.map(function(q){ return '<span style="color:'+q.c+'">■</span>'+q.n+' '+fmtN(q.v[best]); }).join('　'); note.innerHTML=s; };
    note.innerHTML=chartNote(series.length?series:null);
  } else {
    var dy=sp.yd, ly=dy.log&&sp.ys[0]>0, y0=sp.ys[0], y1=sp.ys[sp.ys.length-1]; function Y2(v){ return T+ph-(ly? Math.log(v/y0)/Math.log(y1/y0) : (v-y0)/(y1-y0))*ph; }
    var nx=sp.xs.length, ny=sp.ys.length, vals=D.pts.map(function(pt){ return metricVal(pt,keys,m); }); var vmin=Infinity,vmax=-Infinity; vals.forEach(function(v){ if(isFinite(v)){ vmin=Math.min(vmin,v); vmax=Math.max(vmax,v); } }); if(m!=='diff') vmin=Math.min(vmin,0); if(vmax===vmin) vmax=vmin+1;
    var cw=pw/nx, chh=ph/ny;
    for(var j=0;j<ny;j++) for(var i=0;i<nx;i++){ var v=vals[j*nx+i]; var t=isFinite(v)?(v-vmin)/(vmax-vmin):0; var c=LUT[Math.max(0,Math.min(255,Math.round(t*255)))]; g.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')'; g.fillRect(L+i*cw,T+ph-(j+1)*chh,cw+0.6,chh+0.6); }
    ticks(y0,y1,ly).forEach(function(v){ var y=Y2(v); g.fillStyle=CC.text; g.textAlign='right'; g.fillText(fmtN(v),L-5,y+4); });
    g.save(); g.translate(11,T+ph/2); g.rotate(-Math.PI/2); g.textAlign='center'; g.fillStyle=CC.text2; g.fillText(dy.n+(dy.u?'（'+dy.u+'）':''),0,0); g.restore();
    g.strokeStyle=CC.frame; g.strokeRect(L,T,pw,ph);
    /* 現在値の十字 */
    var xc2=X(Math.min(Math.max(sp.vx,Math.min(x0,x1)),Math.max(x0,x1))), yc2=Y2(Math.min(Math.max(sp.vy,Math.min(y0,y1)),Math.max(y0,y1))); g.strokeStyle=CC.dot; g.lineWidth=2.5; g.beginPath(); g.moveTo(xc2,T); g.lineTo(xc2,T+ph); g.moveTo(L,yc2); g.lineTo(L+pw,yc2); g.stroke(); g.strokeStyle=CC.cursor; g.lineWidth=1; g.setLineDash([4,3]); g.stroke(); g.setLineDash([]); g.fillStyle=CC.cursor; g.beginPath(); g.arc(xc2,yc2,4.5,0,7); g.fill();
    /* カラーバー */
    var bx=L+pw+12; for(var k=0;k<ph;k++){ var c2=LUT[Math.round((1-k/ph)*255)]; g.fillStyle='rgb('+c2[0]+','+c2[1]+','+c2[2]+')'; g.fillRect(bx,T+k,12,1.2); } g.fillStyle=CC.text; g.textAlign='left'; g.fillText(fmtN(vmax),bx+15,T+8); g.fillText(fmtN(vmin),bx+15,T+ph);
    cv.onmousemove=function(e){ var rc=cv.getBoundingClientRect(), mx=e.clientX-rc.left, my=e.clientY-rc.top; var i=Math.floor((mx-L)/cw), j=Math.floor((T+ph-my)/chh); if(i<0||j<0||i>=nx||j>=ny) return; note.innerHTML='<b>'+dx.n+' '+fmtN(sp.xs[i])+'、'+dy.n+' '+fmtN(sp.ys[j])+'</b>：'+(m==='sigA'?'組織Aの信号':MET[m])+' '+fmtN(vals[j*nx+i]); };
    note.innerHTML=chartNote(null,vals,vmin,vmax);
  } }
function chartNote(series){ var D=chart.data, m=chart.metric, keys=D.keys; var nA=D.names[keys.indexOf(chart.A)], nB=D.names[keys.indexOf(chart.B)];
  var mm2=m==='sig'||m==='snr'?'cnr':m; var cur=metricVal(D.cur,keys,mm2); if(chart.mode==='curve'&&chart.spec){ var arr=D.pts.map(function(pt){ return metricVal(pt,keys,mm2); }); var iv=interp(chart.spec.xs,arr,chart.spec.vx,chart.spec.xd.log); if(isFinite(iv)) cur=iv; } else if(chart.mode==='map'&&chart.spec){ /* 最も近い格子点 */ var sp2=chart.spec, bi2=0,bd2=1e18; D.pts.forEach(function(pt,k){ var i=k%sp2.xs.length, j=Math.floor(k/sp2.xs.length); var d=Math.pow((sp2.xs[i]-sp2.vx)/(sp2.xs[sp2.xs.length-1]-sp2.xs[0]||1),2)+Math.pow((sp2.ys[j]-sp2.vy)/(sp2.ys[sp2.ys.length-1]-sp2.ys[0]||1),2); if(d<bd2){bd2=d;bi2=k;} }); cur=metricVal(D.pts[bi2],keys,mm2); } var s='現在の条件：'+(m==='sig'||m==='snr'?'CNR（'+nA+' 対 '+nB+'）':(m==='sigA'?'組織Aの信号':MET[m]))+' = <b>'+fmtN(cur)+'</b>';
  if(chart.mode==='curve'&&m!=='time'&&m!=='sar'){ var pts=D.pts.map(function(pt){ return metricVal(pt,keys,m==='sig'||m==='snr'?'cnr':m); }); var bi=-1,bv=-Infinity; pts.forEach(function(v,i){ var a=(m==='diff'||m==='ratio')?Math.abs(m==='ratio'?Math.log(v||1e-9):v):v; if(isFinite(a)&&a>bv){ bv=a; bi=i; } }); if(bi>=0) s+='　｜ グラフの範囲で最大になるのは '+pdefX(chart.xk).n+' ≈ '+fmtN(chart.spec.xs[bi]); }
  return s+'<br><span style="color:var(--rt-muted)">グラフ上にカーソルを置くと値を表示します。信号は磁場ずれ・k空間・雑音を除いた組織そのものの値です（画像の画素値とは少し異なります）。</span>'; }

/* ---------- 表 ---------- */
function tables(){ function cf(c){ if(c==='—'||!c) return ''; return '<span class="cf '+c+'">'+({o:'公開資料',c:'比較表',x:'要確認',"—":''}[c]||'')+'</span>'; }
  var VL=vlist(), h='<table class="data-table"><thead><tr><th>分類</th><th>名称</th><th>一般名</th>'+VL.map(function(vd){ return '<th>'+vd[1]+'</th>'; }).join('')+'</tr></thead><tbody>';
  MS.CATS.forEach(function(c){ MS.SEQS.filter(function(s){return s.cat===c[0];}).forEach(function(s){ h+='<tr><td>'+c[1]+'</td><td>'+s.n+'</td><td>'+s.gen+'</td>'+VL.map(function(vd){ return '<td>'+(s[vd[0]]||'—')+cf(s[vd[0]+'C'])+'</td>'; }).join('')+'</tr>'; }); });
  $('#nametbl').innerHTML=h+'</tbody></table>';
  var h2='<table class="data-table"><thead><tr><th>機能</th>'+VL.map(function(vd){ return '<th>'+vd[1]+'</th>'; }).join('')+'</tr></thead><tbody>'; MS.VENDOR_OPTS.forEach(function(r,ri){ var ex=(MS.VOPT_NAMES||[])[ri]||{}; h2+='<tr><td>'+r[0]+'</td>'+VL.map(function(vd){ var k=vd[0]; if(k==='sie') return '<td>'+r[1]+cf(r[2])+'</td>'; if(k==='can') return '<td>'+r[3]+cf(r[4])+'</td>'; var a=ex[k]; return '<td>'+(a?a[0]+cf(a[1]):'—')+'</td>'; }).join('')+'</tr>'; }); $('#opttbl').innerHTML=h2+'</tbody></table>';
  $('#namesrc').innerHTML=MS.NAME_SRC.concat(MS.VSRC||[]).map(function(s){ return '<li>'+s[0]+'：<a href="'+s[1]+'" target="_blank" rel="noopener">'+s[1]+'</a></li>'; }).join('');
  var t='<table class="data-table"><thead><tr><th>組織</th><th>T1 1.5T/3T (ms)</th><th>T2 (ms)</th><th>T2* (ms)</th><th>PD</th><th>ADC</th><th>脂肪分率</th><th>出典</th></tr></thead><tbody>';
  Object.keys(MS.TISSUES).forEach(function(k){ var x=MS.TISSUES[k]; if(!x.PD) return; t+='<tr><td>'+x.n+'</td><td>'+x.T1.join(' / ')+'</td><td>'+x.T2.join(' / ')+'</td><td>'+x.T2s.join(' / ')+'</td><td>'+x.PD+'</td><td>'+x.ADC+'</td><td>'+(x.ff?Math.round(x.ff*100)+'%':'')+'</td><td>'+x.src+'</td></tr>'; });
  $('#tisstbl').innerHTML=t+'</tbody></table>';
  $('#refs').innerHTML=MS.REFS.map(function(r){ return '<li>['+r.k+'] '+r.t+' PMID: <a href="https://pubmed.ncbi.nlm.nih.gov/'+r.pmid+'/" target="_blank" rel="noopener">'+r.pmid+'</a></li>'; }).join('');
  $('#about').innerHTML=MS.ABOUT; }
/* ---------- 初期化 ---------- */
function init(){ tables(); try{ if(window.top!==window) $('#save').hidden=true; }catch(e){ $('#save').hidden=true; }
  $('#seqq').oninput=buildSeqList;
  $('#reset').onclick=function(){ newState(st.phantom,st.seq,true); }; initGroupTools(); mobSetup();
  (function(){ var ts=$('#themesel'); if(!ts) return; ts.value=document.documentElement.getAttribute('data-theme')||'standard'; ts.onchange=function(){ var v=ts.value; if(v==='standard') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme',v); try{ localStorage.setItem('mrisimTheme',v); }catch(e){} if(res&&view==='sim') show(res); }; })();
  ['#showK','#showLab','#color'].forEach(function(s){ $(s).onchange=function(){ if(res) show(res); }; });
  $('#auto').onclick=function(){ manualW=null; if(res) show(res); };
  $('#pin').onclick=function(){ if(!res) return; if(pinned){ pinned=null; $('#pin').textContent='比較用に固定'; show(res); return; } var c=$('#stage canvas'); var cc=el('canvas'); cc.width=c.width; cc.height=c.height; cc.getContext('2d').drawImage(c,0,0); pinned={c:cc,t:MS.SEQ[st.seq].n+'（'+res.outs[cur].name+'）'}; $('#pin').textContent='固定を解除'; show(res); };
  $('#save').onclick=function(){ var c=$('#stage canvas'); if(!c) return; var a=el('a',{href:c.toDataURL('image/png'),download:'mrisim_'+st.seq+'.png'}); document.body.appendChild(a); a.click(); a.remove(); };
  $('#menu').onclick=function(){ var v=$('#sidebar').classList.toggle('open'); $('#shade').classList.toggle('visible',v); $('#menu').setAttribute('aria-expanded',String(v)); };
  $('#shade').onclick=closeMenu;
  var rz=null; window.addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(function(){ if(res&&view==='sim') show(res); },150); });
  var h=(location.hash||'').replace('#',''); if(h==='learn') startLearn(MS.LEARN[0].seq); else if(h==='names'||h==='tissue'||h==='about'){ newState('head','fse_t2'); setView(h); } else newState('head','fse_t2'); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

/* ---------- スマートフォン用の画面（幅 760px 以下） ----------
   画像と見積もりを上に固定し、下のタブで「部位／パラメータ／グラフ／詳細」を切り替える */
var MQ=window.matchMedia?window.matchMedia('(max-width:760px)'):null, mtab='params', mobHome=null;
function mobSetup(){ var on=!!(MQ&&MQ.matches); document.body.classList.toggle('simview',view==='sim'); var was=document.body.classList.contains('mob'); document.body.classList.toggle('mob',on);
  var v=$('#v-sim'), out=document.querySelector('.pro-out'), lc=$('#learncard'), pp=document.querySelector('.pro-params');
  if(on && !mobHome){ mobHome={out:[out.parentNode,out.nextSibling], lc:[lc.parentNode,lc.nextSibling]}; v.insertBefore(out,v.firstChild); pp.insertBefore(lc,pp.firstChild);
    if(!$('#mtabs')) buildMtabs(); setMtab(mtab,true); }
  else if(!on && mobHome){ mobHome.out[0].insertBefore(out,mobHome.out[1]); mobHome.lc[0].insertBefore(lc,mobHome.lc[1]); mobHome=null; document.body.removeAttribute('data-mtab'); }
  if(was!==on && res && view==='sim') show(res); }
function buildMtabs(){ var nav=el('nav',{id:'mtabs','aria-label':'表示の切り替え'});
  [['setup','部位・病変'],['params','パラメータ'],['chart','グラフ'],['info','詳細']].forEach(function(t){ var b=el('button',{type:'button','data-t':t[0]},t[1]); b.onclick=function(){ setMtab(t[0]); }; nav.appendChild(b); });
  document.body.appendChild(nav); }
function setMtab(t,quiet){ mtab=t; document.body.setAttribute('data-mtab',t); document.querySelectorAll('#mtabs button').forEach(function(b){ b.setAttribute('aria-pressed',String(b.getAttribute('data-t')===t)); });
  if(!quiet) window.scrollTo(0,0);
  if(t==='chart' && res){ try{ drawChart(); }catch(e){} } }
if(MQ){ if(MQ.addEventListener) MQ.addEventListener('change',mobSetup); else if(MQ.addListener) MQ.addListener(mobSetup); }

/* ---------- パラメータ群の開閉 ---------- */
function saveClosed(){ try{ localStorage.setItem('mrisimClosedGroups',JSON.stringify(closedG)); }catch(e){} }
function setClosed(sec,c){ var t=sec.getAttribute('data-t'); sec.classList.toggle('closed',c); var h=sec.querySelector('button.grp'); if(h) h.setAttribute('aria-expanded',String(!c)); if(c) closedG[t]=1; else delete closedG[t]; }
function grpCounts(){ document.querySelectorAll('#params .pgrp').forEach(function(sec){ var n=sec.querySelector('.sim-controls').children.length; var c=sec.querySelector('.gcnt'); if(c) c.textContent=n?'（'+n+'）':''; }); }
function grpBadges(){ if(!st) return; var key=st.phantom+'|'+st.seq; if(defPcache.key!==key){ try{ defPcache={key:key,p:MS.defaultState(st.phantom,st.seq,null).p}; }catch(e){ defPcache={key:key,p:{}}; } }
  var def=defPcache.p||{}; document.querySelectorAll('#params .pgrp').forEach(function(sec){ var n=0; sec.querySelectorAll('label.sim-control[data-k]').forEach(function(lb){ var k=lb.dataset.k; if(def[k]===undefined||st.p[k]===undefined) return; if(typeof def[k]==='number'? Math.abs(def[k]-st.p[k])>1e-9 : String(def[k])!==String(st.p[k])) n++; }); var b=sec.querySelector('.gbadge'); if(b) b.textContent=n?'変更 '+n:''; }); }
function initGroupTools(){ var a=$('#gopen'), b=$('#gclose'); if(a) a.onclick=function(){ document.querySelectorAll('#params .pgrp').forEach(function(s){ setClosed(s,false); }); saveClosed(); }; if(b) b.onclick=function(){ document.querySelectorAll('#params .pgrp').forEach(function(s){ setClosed(s,true); }); saveClosed(); }; }

/* ---------- k空間の充填（模式図・エキスパート用） ---------- */
var kfOpen=true;
function kfill(){ var box=$('#kfill'); if(!box) return; var sq=MS.SEQ[st.seq];
  if(mode!=='expert'||!res||!res.info||sq.k==='mrs'){ box.hidden=true; return; }
  box.hidden=false; box.innerHTML='';
  var i=res.info, p=i.p||st.p, k=sq.timeAs||sq.k, d3=sq.dim==='3D';
  var R=i.R||1, Rz=i.Rz||1, CS=i.CS||1, pf=p.pf||1, pfz=p.pfz||1, ny=Math.max(8,Math.round(p.ny||128)), nz=Math.max(1,Math.round(p.npart||1));
  var epi=/^(dwi|dti|bold|dsc)$/.test(k)||!!sq.epi, fse=/^(fse|ir|dixon_tse|map_t2)$/.test(k), ss=/^(ssfse|mrcp2d)$/.test(k);
  var rad=null; if(k==='ute') rad='ute'; else if(st.seq==='starvibe') rad='spoke'; else if(i.radial) rad=(fse||ss||k==='fse3d')?'blade':'spoke';
  var gr=(st.pimode==='grappa'), acs=gr?24:0;
  var det=el('details',{class:'kfill'}); if(kfOpen) det.open=true; det.ontoggle=function(){ kfOpen=det.open; };
  det.appendChild(el('summary',{},'k空間の充填（模式図）'));
  var row=el('div',{class:'kfrow'}); det.appendChild(row); box.appendChild(det);
  var W=170, dpr=2, cv=el('canvas',{width:W*dpr,height:W*dpr}); cv.style.width=W+'px'; cv.style.height=W+'px'; row.appendChild(cv);
  var tx=el('div',{class:'kftxt'}); row.appendChild(tx);
  var g=cv.getContext('2d'); g.scale(dpr,dpr); g.fillStyle='#0b1620'; g.fillRect(0,0,W,W);
  var pad=12, A=W-2*pad, x0=pad, y0=pad;
  function col(t){ var cs=[[253,230,138],[52,211,153],[43,179,168],[59,130,246],[139,92,246]]; t=Math.max(0,Math.min(1,t)); var u=t*(cs.length-1), a=Math.floor(u), f=u-a, c1=cs[a], c2=cs[Math.min(cs.length-1,a+1)]; return 'rgb('+[0,1,2].map(function(j){ return Math.round(c1[j]+(c2[j]-c1[j])*f); }).join(',')+')'; }
  var rng=(function(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; })(7);
  function vdKeep(u,frac){ /* 可変密度ランダム（中心は全取得） */ if(Math.abs(u)<0.08) return true; var c=frac; return rng()<Math.min(1,c*2.2*Math.pow(1-Math.min(1,Math.abs(u)),1.6)+0.02); }
  function axes(lx,ly){ g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=0.6; g.beginPath(); g.moveTo(x0,y0+A/2); g.lineTo(x0+A,y0+A/2); g.moveTo(x0+A/2,y0); g.lineTo(x0+A/2,y0+A); g.stroke();
    g.fillStyle='rgba(255,255,255,.55)'; g.font='9px sans-serif'; g.fillText(ly,2,9); g.fillText(lx,W-14,W-3); }
  var pfTxt=function(v){ var e=v*8; return Math.abs(e-Math.round(e))<0.01? Math.round(e)+'/8' : MS.fmt(v); };
  var lines=[], legend='';
  if(rad){
    axes('kx','ky'); var cx=x0+A/2, cy=y0+A/2, rr=A/2;
    if(rad==='blade'){ var etl=p.etl||Math.min(ny,24); var nb=Math.max(6,Math.min(24,Math.round(ny*Math.PI/2/etl))); var w=Math.max(3,A*etl/ny);
      for(var b=0;b<nb;b++){ var th=Math.PI*b/nb; g.save(); g.translate(cx,cy); g.rotate(th); g.fillStyle=col(b/(nb-1)).replace('rgb','rgba').replace(')',',.22)'); g.strokeStyle=col(b/(nb-1)); g.lineWidth=0.7; g.fillRect(-rr,-w/2,2*rr,w); g.strokeRect(-rr,-w/2,2*rr,w); g.restore(); }
      lines.push('ブレード（短冊）'+nb+' 枚を回転させて埋める（BLADE／JET）'); lines.push('1ブレード＝1エコートレイン（ETL '+etl+'）。中心を毎回通るので動きに強い'); legend='色＝取得順'; }
    else { var ns=rad==='ute'?48:40, ga=111.246*Math.PI/180;
      for(var s2=0;s2<ns;s2++){ var th2=(rad==='ute')? s2*2*Math.PI/ns : s2*ga; g.strokeStyle=col(s2/(ns-1)); g.lineWidth=0.8; g.beginPath(); if(rad==='ute'){ g.moveTo(cx,cy); } else g.moveTo(cx-rr*Math.cos(th2),cy-rr*Math.sin(th2)); g.lineTo(cx+rr*Math.cos(th2),cy+rr*Math.sin(th2)); g.stroke(); }
      if(rad==='ute'){ lines.push('中心から外へ放射状に読む（中心出し）'); lines.push('TE を極短にできる。3D では球状に埋める'); }
      else { lines.push('放射状のスポーク（黄金角で回転）'+(st.seq==='starvibe'||d3?'＋スライス方向は直交（stack-of-stars）':'')); lines.push('中心を毎回通るので体動が平均化される'); }
      legend='色＝取得順（図は本数を間引き）'; }
  }
  else if(d3){
    axes('kz','ky'); var Ny=Math.min(ny,36), Nz=Math.min(nz,36), sy=ny/Ny, sz=nz/Nz, dy=A/Ny, dz=A/Nz, acsY=gr?Math.max(2,Math.round(acs/sy)):0, acsZ=gr?Math.max(2,Math.round(acs/sz)):0, n3=0, tot=0;
    var frac=1/(R*Rz*CS);
    for(var r=0;r<Ny;r++) for(var c=0;c<Nz;c++){ tot++; var yy=r-Ny/2+0.5, zz=c-Nz/2+0.5; var uy=yy/(Ny/2), uz=zz/(Nz/2);
      var miss=(Ny-1-r)<(1-pf)*Ny-1e-9 || c<(1-pfz)*Nz-1e-9; var cen=gr&&Math.abs(yy)<acsY/2&&Math.abs(zz)<acsZ/2; var on;
      if(miss) on=false; else if(CS>1) on=vdKeep(Math.hypot(uy,uz)/1.2,frac); else if(cen) on=true; else { var ry=Math.round(yy-0.5), cz=Math.round(zz-0.5); on=(((cz%Rz)+Rz)%Rz===0) && ((((ry+(st.caipi&&Rz>1?Math.round(cz/Rz):0))%R)+R)%R===0); }
      var px=x0+(c+0.5)*dz, py=y0+(r+0.5)*dy;
      if(on){ n3++; g.fillStyle=cen?'#fde68a':'#2bb3a8'; g.beginPath(); g.arc(px,py,Math.max(0.9,Math.min(dy,dz)*0.36),0,7); g.fill(); }
      else { g.fillStyle=miss?'rgba(255,255,255,.05)':'rgba(255,255,255,.14)'; g.fillRect(px-0.5,py-0.5,1,1); } }
    var tot3=ny*nz, acq3=Math.round(ny*(1+(p.pos||0)/100)*pf*nz*(1+(p.sos||0)/100)*pfz/(R*Rz*CS));
    lines.push('ky×kz '+ny+'×'+nz+'＝'+tot3.toLocaleString()+' 点中 約 '+acq3.toLocaleString()+' 点を取得（1/'+MS.fmt(tot3/Math.max(1,acq3))+'）');
    var a=[]; if(R>1||Rz>1) a.push('並列 '+R+'×'+Rz+(st.caipi&&Rz>1?'（CAIPIでずらす）':'')+(gr?'・中心 ACS':'')); if(CS>1) a.push('圧縮センシング×'+MS.fmt(CS)+'（可変密度ランダム）'); if(pf<1) a.push('部分フーリエ '+pfTxt(pf)); if(pfz<1) a.push('スライス部分フーリエ '+pfTxt(pfz));
    if(/fse3d|ncmra_fbi|mrcp/.test(k)&&p.etl) a.push('1エコートレインで '+p.etl+' 点'); if(/mprage|mp2rage/.test(k)) a.push('1回の反転ごとに ky 1列分（'+nz+' 点）');
    lines.push(a.length?a.join('・'):'全点を取得（加速なし）'); legend='点＝取得した位相エンコード（ky・kz）'+(gr?'　黄＝ACS':'')+'　図は間引き表示';
  }
  else {
    axes('kx','ky'); var N=Math.min(ny,64), s=ny/N, dyr=A/N, acsR=gr?Math.max(2,Math.round(acs/s)):0, frac2=1/(R*CS), seq=[], rows=[];
    for(var r2=0;r2<N;r2++){ var L=(N-1-r2)*s, yy2=r2-N/2+0.5, u=yy2/(N/2); var miss2=L<(1-pf)*ny-1e-9; var cen2=gr&&Math.abs(yy2)<acsR/2; var on2;
      if(miss2) on2=false; else if(CS>1) on2=vdKeep(u,frac2); else if(cen2) on2=true; else on2=((Math.round(yy2-0.5)%R)+R)%R===0;
      rows.push({r:r2,L:L,on:on2,miss:miss2,cen:cen2}); if(on2) seq.push(r2); }
    var order=seq.slice().reverse(); /* 下（−ky）から上へ */
    var segs=Math.max(1,p.seg||1);
    if(epi && segs>1){ for(var q=1;q<segs;q++){ var xx=x0+A*q/segs; g.strokeStyle='rgba(255,255,255,.25)'; g.setLineDash([2,2]); g.beginPath(); g.moveTo(xx,y0); g.lineTo(xx,y0+A); g.stroke(); } g.setLineDash([]); }
    var xa=x0, xb=x0+A; if(epi&&segs>1){ var mid=Math.floor(segs/2); xa=x0+A*mid/segs; xb=x0+A*(mid+1)/segs; }
    rows.forEach(function(o){ var y=y0+(o.r+0.5)*dyr; if(!o.on){ g.strokeStyle=o.miss?'rgba(255,255,255,.04)':'rgba(255,255,255,.12)'; g.lineWidth=0.6; g.setLineDash([1.5,2.5]); g.beginPath(); g.moveTo(x0,y); g.lineTo(x0+A,y); g.stroke(); g.setLineDash([]); return; }
      var t=0; if(fse&&p.etl){ var etl=p.etl, grp=Math.max(1,ny/etl), g0=Math.floor(o.L/grp), gc=Math.floor((ny/2)/grp), nc=Math.max(0,Math.round(p.te/p.esp)-1); var e=((g0-gc+nc)%etl+etl)%etl; t=etl>1?e/(etl-1):0; }
      else t=order.length>1? order.indexOf(o.r)/(order.length-1) : 0;
      g.strokeStyle=o.cen&&!fse&&!ss&&!epi?'#fde68a':col(t); g.lineWidth=Math.max(0.8,Math.min(2.2,dyr*0.55)); g.beginPath(); g.moveTo(xa,y); g.lineTo(xb,y); g.stroke(); });
    if(epi){ /* ジグザグの軌跡 */ g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=0.6; g.beginPath(); order.forEach(function(r3,j){ var y=y0+(r3+0.5)*dyr; var L0=j%2? xb:xa, L1=j%2? xa:xb; if(j===0) g.moveTo(L0,y); else g.lineTo(L0,y); g.lineTo(L1,y); }); g.stroke(); }
    /* 部分フーリエの省略域 */
    if(pf<1){ var yb=y0+A*pf; g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x0,yb,A,y0+A-yb); g.fillStyle='rgba(255,255,255,.6)'; g.font='9px sans-serif'; g.fillText('部分フーリエで省略',x0+4,Math.min(y0+A-3,yb+11)); }
    /* 中心ライン（コントラストを決める） */
    g.fillStyle='#fff'; g.beginPath(); var yc=y0+A/2; g.moveTo(x0-2,yc); g.lineTo(x0-8,yc-3.5); g.lineTo(x0-8,yc+3.5); g.fill();
    var acq=Math.round(ny*(1+(p.pos||0)/100)*pf/(R*CS));
    lines.push('ky '+ny+' 本中 約 '+acq+' 本を取得'+(p.pos?'（位相オーバーサンプリング '+p.pos+'% 込み）':''));
    var a2=[]; if(R>1) a2.push('並列×'+R+(gr?'（中心 ACS '+acs+' 本）':'')); if(CS>1) a2.push('圧縮センシング×'+MS.fmt(CS)); if(pf<1) a2.push('部分フーリエ '+pfTxt(pf)); if((p.sms||1)>1) a2.push('SMS×'+p.sms+'（同時に'+p.sms+'枚、図には出ない）');
    if(fse&&p.etl){ a2.push('ETL '+p.etl+'・ショット '+Math.ceil(acq/p.etl)); legend='色＝エコー番号（黄＝早い→紫＝遅い）。中心（▶）のエコーが実効TE '+MS.fmt(p.te)+' ms'; }
    else if(ss){ a2.push('1回の励起で全ラインを順に取得'); legend='色＝取得順（黄＝早い→紫＝遅い）。中心（▶）が TE '+MS.fmt(p.te)+' ms'; }
    else if(epi){ a2.push('1回の励起でジグザグに '+(i.etlEPI||acq)+' 本'+(segs>1?'・読出し方向を '+segs+' 分割（図は中央の分割）':'')); legend='線＝ジグザグの軌跡、色＝取得順。中心（▶）が TE '+MS.fmt(p.te)+' ms'; }
    else if(/cine|lge/.test(k)){ a2.push('1心拍ごとに '+(p.vps||(k==='lge'?25:12))+' 本ずつ'); legend='色＝取得順'; }
    else { a2.push('1TR に1本ずつ順に取得'); legend='色＝取得順'+(gr?'　黄＝ACS':''); }
    lines.push(a2.join('・')); if(s>1) legend+='　図はライン数を間引いて表示';
  }
  lines.forEach(function(t,j){ tx.appendChild(el('div',{class:j?'':'kfmain'},t)); }); if(legend) tx.appendChild(el('div',{class:'kfleg'},legend));
}
window.__mrisimTest=function(f){ return f({newState:newState,buildParams:buildParams,schedule:schedule,getSt:function(){return st;},setMode:function(m){mode=m;}}); };

})();

(function sbResize(){ var MIN=200,MAX=560,DEF=300,root=document.documentElement,g=document.getElementById('sbgrip'); if(!g) return;
  function setW(w,save){ w=Math.max(MIN,Math.min(MAX,Math.min(w,window.innerWidth-420)||MIN)); root.style.setProperty('--sbw',Math.round(w)+'px'); g.setAttribute('aria-valuenow',String(Math.round(w))); if(save){ try{ localStorage.setItem('mrisimSbw',String(Math.round(w))); }catch(e){} } }
  var w0=DEF; try{ var v=parseInt(localStorage.getItem('mrisimSbw'),10); if(v) w0=v; }catch(e){} setW(w0,false);
  g.setAttribute('aria-valuemin',String(MIN)); g.setAttribute('aria-valuemax',String(MAX));
  var drag=false;
  g.addEventListener('pointerdown',function(e){ drag=true; g.setPointerCapture(e.pointerId); document.body.classList.add('sbdrag'); e.preventDefault(); });
  g.addEventListener('pointermove',function(e){ if(drag) setW(e.clientX,false); });
  function end(){ if(!drag) return; drag=false; document.body.classList.remove('sbdrag'); setW(parseInt(getComputedStyle(root).getPropertyValue('--sbw'),10),true); window.dispatchEvent(new Event('resize')); }
  g.addEventListener('pointerup',end); g.addEventListener('pointercancel',end);
  g.addEventListener('dblclick',function(){ setW(DEF,true); window.dispatchEvent(new Event('resize')); });
  g.addEventListener('keydown',function(e){ var c=parseInt(getComputedStyle(root).getPropertyValue('--sbw'),10); if(e.key==='ArrowLeft'){ setW(c-20,true); e.preventDefault(); } else if(e.key==='ArrowRight'){ setW(c+20,true); e.preventDefault(); } else if(e.key==='Home'){ setW(DEF,true); e.preventDefault(); } });
})();
