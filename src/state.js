/* ===== 既定値とパラメータ定義 ===== */
(function(){
var MS=window.MS;
/* パラメータ定義: id, 表示名, 単位, min, max, step, グループ, 説明 */
MS.PARAMS=[
 ['fov','FOV（読出し方向）','mm',20,500,1,'geo','撮像範囲。大きくすると画素が大きくなりSNRは上がるが分解能は下がる。'],
 ['pfov','位相方向FOV','%',25,100,1,'geo','位相方向の撮像範囲（矩形FOV）。体の幅より小さいと折り返しが出る。'],
 ['nx','マトリクス（読出し）','',32,1024,16,'geo','読出し方向の画素数。'],
 ['ny','マトリクス（位相）','',16,1024,8,'geo','位相エンコード数。撮像時間に比例。'],
 ['thk','スライス厚','mm',0.2,100,0.1,'geo','2Dではスライス厚、3Dでは1パーティションの厚さ。'],
 ['gap','スライス間隔','%',0,300,5,'geo','スライス間のすき間（厚さに対する%）。クロストーク対策。'],
 ['nsl','スライス枚数','枚',1,256,1,'geo','2Dのスライス数。TR内に入らない分は分割収集になる。'],
 ['npart','パーティション数','',8,512,4,'geo','3Dのスライス方向エンコード数。撮像時間に比例。'],
 ['pos','位相オーバーサンプリング','%',0,200,5,'geo','位相方向にFOVを広げて折り返しを防ぐ（時間は増える）。'],
 ['sos','スライスオーバーサンプリング','%',0,100,5,'geo','3Dのスラブ端の折り返し対策。'],
 ['nex','加算回数（NEX/NSA/平均）','回',0.5,32,0.5,'geo','SNRは√加算回数に比例、時間は比例して延長。'],
 ['bw','受信バンド幅','Hz/画素',30,3000,10,'con','広いと化学シフト・磁化率による歪みが減り最短TE/ESPが短くなるが、SNRは√で下がる。'],
 ['tr','TR','ms',1,20000,1,'con','繰り返し時間。'],
 ['trs','TR（反転の間隔）','ms',500,12000,10,'con','MPRAGE系の1ショット（反転から次の反転まで）の時間。'],
 ['te','TE（実効TE）','ms',0.03,1500,0.1,'con','エコー時間。FSEではk空間中心のエコー時刻。3D FSEではT2等価TE。'],
 ['te2','TE（第2エコー）','ms',0.5,100,0.1,'con','2エコー目。'],
 ['dte','エコー間隔（多エコーGRE）','ms',0.5,20,0.1,'con','多エコーGREのエコー間隔。'],
 ['ne','エコー数','',2,32,1,'con','多エコーの数。'],
 ['ti','TI','ms',10,5000,5,'con','反転時間。脂肪の null は 1.5T で約150–170 ms、3T で約 200–230 ms が目安（TR に依存）。'],
 ['ti2','TI（第2）','ms',10,5000,5,'con','2つ目の反転時間（DIR・MP2RAGE）。'],
 ['fa','フリップ角','°',1,180,1,'con','励起角。'],
 ['fa2','フリップ角（第2）','°',1,90,1,'con','2つ目のフリップ角。'],
 ['etl','エコートレイン長（ETL/ターボファクタ）','',1,512,1,'con','1回の励起で集めるエコー数。'],
 ['esp','エコー間隔','ms',2,40,0.1,'con','FSEのエコー間隔。短いほどぼけが少ない。最短値はバンド幅で決まる。'],
 ['refoc','リフォーカス角','°',60,180,5,'con','下げるとSARが減るが信号とコントラストが変わる。'],
 ['pf','部分フーリエ（位相）','',0.5,1,0.0625,'acc','k空間の一部だけ収集（例 6/8 = 0.75）。時間短縮・TE短縮。ぼけとSNR低下。'],
 ['pfz','部分フーリエ（スライス）','',0.5,1,0.0625,'acc','3Dのスライス方向の部分フーリエ。'],
 ['r','並列画像 加速係数（位相）','',1,8,1,'acc','R倍速くなるが、SNRは g×√R で低下。上げすぎると残存折り返し。'],
 ['rz','並列画像 加速係数（スライス）','',1,4,1,'acc','3Dのスライス方向の加速。'],
 ['sms','同時多断面（SMS）係数','',1,8,1,'acc','複数スライスを同時に励起。TRを短く・時間短縮。'],
 ['cs','圧縮センシング係数','',1,12,0.5,'acc','ランダムな間引きと反復再構成で加速。上げすぎると平滑化・細部の消失。'],
 ['bvals','b値（カンマ区切り）','s/mm²',0,0,0,'spc','例: 0,50,800,1500'],
 ['ndir','MPG方向数','',1,256,1,'spc','拡散の方向数。'],
 ['bavg','高b値の追加加算','回',1,16,1,'spc','高b値だけ加算を増やす。'],
 ['seg','読出し分割数','',1,15,1,'spc','読出し分割EPIのセグメント数。'],
 ['nvol','ボリューム数','',10,1000,10,'spc','fMRI/DSCの繰り返し数。'],
 ['venc','VENC','cm/s',5,600,5,'spc','これを超える流速は位相が折り返す。'],
 ['bbti','BBTI','ms',200,3000,10,'spc','タグ（反転）から撮像までの時間。'],
 ['qi','静止期（quiescent interval）','ms',100,400,5,'spc','QISSの待ち時間。'],
 ['spoil','フロースポイラー強度','',5,60,1,'spc','FBI系の流れによる信号低下の強さ。'],
 ['vps','セグメントあたりライン数','',1,64,1,'spc','心電図同期セグメント収集の1心拍あたりのライン数。時間分解能=VPS×TR。'],
 ['pld','PLD（標識後待ち時間）','ms',200,4000,50,'spc','標識終了から撮像までの時間。'],
 ['ld','標識時間（LD）','ms',200,3000,50,'spc','pCASLの標識の長さ。'],
 ['npairs','標識/非標識ペア数','',1,64,1,'spc','ASLの加算回数。'],
 ['slabs','スラブ数','',1,12,1,'spc','3D TOFのマルチスラブ数。'],
 ['pa','中心領域（A）','%',5,50,1,'spc','TWIST/DRKS：毎回収集するk空間中心の割合。'],
 ['pb','周辺の更新率（B）','%',5,100,1,'spc','TWIST/DRKS：周辺領域を1時相あたり収集する割合。'],
 ['dixpts','Dixon エコー数','点',2,3,1,'spc','2点または3点。'],
 ['freq','加振周波数','Hz',30,120,5,'spc','MRE の剪断波の周波数。'],
 ['navg','加算回数','',1,1024,1,'spc','MRSの加算回数。'],
 ['vox','ボクセル一辺','mm',8,30,1,'spc','MRSのボクセルの大きさ。']
];
MS.GROUPS=[['geo','範囲・分解能'],['con','コントラスト・タイミング'],['spc','シーケンス固有'],['acc','加速・k空間']];
MS.PDEF={}; MS.PARAMS.forEach(function(a){ MS.PDEF[a[0]]={id:a[0],n:a[1],u:a[2],min:a[3],max:a[4],step:a[5],g:a[6],tip:a[7]}; });

var COMMON={pfov:100,nx:256,ny:256,thk:5,gap:20,nsl:20,pos:0,nex:1,pf:1,r:1,sms:1,cs:1};
var BYREG={
  brain:{fov:230,pfov:100,nx:256,ny:256,thk:5,nsl:24},
  chest:{fov:380,pfov:75,nx:256,ny:192,thk:6,nsl:30},
  abd:{fov:380,pfov:75,nx:320,ny:224,thk:6,nsl:30},
  pelvis:{fov:300,pfov:85,nx:320,ny:256,thk:4,nsl:25},
  msk:{fov:160,pfov:100,nx:320,ny:256,thk:3,nsl:25},
  spine:{fov:280,pfov:100,nx:384,ny:288,thk:4,nsl:13},
  breast:{fov:340,pfov:70,nx:448,ny:320,thk:3,nsl:60}
};
MS.defaultState=function(phid,seqid,prev){
  var ph=MS.PHANTOMS[phid], sq=MS.SEQ[seqid], reg=ph.region;
  var p=Object.assign({},COMMON,BYREG[reg]||BYREG.msk,ph.def||{});
  if(!ph.def && ph.fov) p.fov=ph.fov;
  if(phid==='pelvisM' && !ph.def){ p.pfov=100; p.nx=320; p.ny=256; p.thk=3; }
  Object.keys(sq.p).forEach(function(k){ if(['fov','pfov','nx','ny','thk','nsl'].indexOf(k)>=0 && (reg!=='brain'||ph.def) && !/dwi|dti|bold|dsc|asl/.test(sq.k) ) return; p[k]=sq.p[k]; });
  if(/dwi|dti|bold|dsc|asl/.test(sq.k)){ if(reg!=='brain'){ p.fov=Math.max(p.fov||0,ph.fov); if(sq.zoom){ p.fov=reg==='pelvis'?200:220; } } }
  if(sq.dim==='3D'){ if(p.npart===undefined) p.npart=64; if(p.pfz===undefined) p.pfz=1; if(p.rz===undefined) p.rz=1; p.sos=p.sos||0; if(reg!=='brain'&&sq.p.thk) p.thk=sq.p.thk; if(reg==='abd'||reg==='chest'||reg==='pelvis'){ if(!/mrcp|fbi|timeslip|cemra|twist|pdff/.test(seqid)) p.thk=Math.max(sq.p.thk||3,3); } }
  if(reg==='abd' && sq.k==='fse'){ p.etl=Math.max(p.etl,16); }
  var st={phantom:phid, seq:seqid, p:p, les:{}, popt:{}, hemStage:'acute', B0:1.5, grad:45,
    fs:sq.fsDef||'none', restore:false, mt:!!sq.mtDef, tone:!!sq.toneDef, vsat:!!sq.vsatDef, flowcomp:!!sq.fcDef, satband:false, vat:!!sq.vatDef, semac:sq.vatDef?8:0,
    pimode:'off', caipi:false, dlr:0, sr:false, resp:'none', ecg:sq.ecgReq?'pro':'none', hr:70, agent:'none', cphase:0, dose:1, b1corr:true, norm:true, shim:true,
    liverFF:3, liverIron:0, liverKpa:2.2, pe:ph.pe, filter:'weak', cdwi:0, mrsVox:'normal', offX:0, offY:0};
  (ph.opts||[]).forEach(function(o){ st.popt[o.id]=o.def; });
  if(reg==='abd'||reg==='chest'||reg==='breast'){ if(/gre3d|dixon|pdff|cemra|cine|lge|map_t1|bssfp/.test(sq.k)||seqid==='inopp'||seqid==='gre_t1') st.resp='bh'; else if(/^(fse|ir|mrcp|dixon_tse|dwi|map_t2|fse3d)$/.test(sq.k)) st.resp=(sq.k==='dwi'?'none':'trig'); }
  if(sq.k==='mre') { st.resp='bh'; }
  if(sq.ecgReq){ p.nsl=1; }
  if(/^(dixon|pdff)$/.test(sq.k) && reg!=='brain'){ st.pimode='grappa'; p.r=2; if(sq.dim==='3D'){ p.pf=0.75; if(sq.k==='pdff'){ p.rz=2; p.npart=48; } } if(seqid==='inopp'){ p.nsl=20; p.ny=192; } }
  if(sq.k==='ncmra_fbi'||sq.k==='mrcp'){ st.pimode='grappa'; p.r=2; }
  if(/gre3d|cemra|twist/.test(sq.k) && (reg==='abd'||reg==='chest'||reg==='pelvis')) { st.pimode='grappa'; p.r=2; }
  if(sq.k==='dwi'||sq.k==='dti'||sq.k==='bold'||sq.k==='dsc'){ st.pimode='grappa'; p.r=2; }
  if(sq.dim==='3D' && reg==='brain' && /mprage|mp2rage|fse3d|swi|tof/.test(sq.k)){ st.pimode='grappa'; p.r=2; }
  if(prev){ ['B0','grad','les','popt','hemStage','liverFF','liverIron','liverKpa','dlr','norm','b1corr','shim'].forEach(function(k){ if(prev[k]!==undefined) st[k]=JSON.parse(JSON.stringify(prev[k])); }); }
  return st;
};

/* 拡張用：パラメータを足す。a=[id, 名前, 単位, 最小, 最大, 刻み, 群（'geo'|'con'|'spc'|'acc'）, 説明]。シーケンスの p に同じ id を書くと画面に出る */
MS.addParam=function(a){ if(MS.PDEF[a[0]]) return MS.PDEF[a[0]]; MS.PARAMS.push(a); MS.PDEF[a[0]]={id:a[0],n:a[1],u:a[2],min:a[3],max:a[4],step:a[5],g:a[6],tip:a[7]}; return MS.PDEF[a[0]]; };
})();
