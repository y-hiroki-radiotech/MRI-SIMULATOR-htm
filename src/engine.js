/* ===== 画像生成エンジン ===== */
(function(){
var MS=window.MS, PI=Math.PI, GAMMA=42.577; /* MHz/T */
/* ---------- FFT ---------- */
var fftCache={};
function fftPlan(n){ if(fftCache[n]) return fftCache[n]; var lg=Math.log2(n)|0, rev=new Uint32Array(n);
  for(var i=0;i<n;i++){ var r=0; for(var b=0;b<lg;b++) r|=((i>>b)&1)<<(lg-1-b); rev[i]=r; }
  var cs=new Float64Array(n/2), sn=new Float64Array(n/2); for(var k=0;k<n/2;k++){ cs[k]=Math.cos(2*PI*k/n); sn[k]=Math.sin(2*PI*k/n); }
  return fftCache[n]={rev:rev,cs:cs,sn:sn}; }
function fft1(re,im,n,inv,pl){ var rev=pl.rev; for(var i=0;i<n;i++){ var j=rev[i]; if(j>i){ var t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
  for(var size=2;size<=n;size<<=1){ var half=size>>1, step=n/size; for(var st=0;st<n;st+=size){ for(var k=0;k<half;k++){ var c=pl.cs[k*step], s=inv?pl.sn[k*step]:-pl.sn[k*step];
    var a=st+k, b=a+half; var tr=re[b]*c-im[b]*s, ti=re[b]*s+im[b]*c; re[b]=re[a]-tr; im[b]=im[a]-ti; re[a]+=tr; im[a]+=ti; } } }
  if(inv){ for(var q=0;q<n;q++){ re[q]/=n; im[q]/=n; } } }
function fft2(re,im,n,inv){ var pl=fftPlan(n), r=new Float64Array(n), m=new Float64Array(n);
  for(var y=0;y<n;y++){ var o=y*n; for(var x=0;x<n;x++){ r[x]=re[o+x]; m[x]=im[o+x]; } fft1(r,m,n,inv,pl); for(var x2=0;x2<n;x2++){ re[o+x2]=r[x2]; im[o+x2]=m[x2]; } }
  for(var x3=0;x3<n;x3++){ for(var y2=0;y2<n;y2++){ r[y2]=re[y2*n+x3]; m[y2]=im[y2*n+x3]; } fft1(r,m,n,inv,pl); for(var y3=0;y3<n;y3++){ re[y3*n+x3]=r[y3]; im[y3*n+x3]=m[y3]; } } }
function chk(re,im,n){ for(var y=0;y<n;y++) for(var x=0;x<n;x++) if((x+y)&1){ var o=y*n+x; re[o]=-re[o]; im[o]=-im[o]; } }
MS.fft2=fft2;
/* ---------- 乱数 ---------- */
var seed=12345; function rnd(){ seed^=seed<<13; seed^=seed>>>17; seed^=seed<<5; return ((seed>>>0)/4294967296); }
function gauss(){ if(MS._probe) return 0; var u=rnd()||1e-9, v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*PI*v); }
MS.resetNoise=function(s){ seed=s||12345; };

/* ---------- 組織パラメータ（磁場・造影・オプション反映） ---------- */
function atB(arr,B){ if(B===1.5) return arr[0]; if(B===3) return arr[1]; var k=Math.log(arr[1]/arr[0])/Math.log(2); return arr[0]*Math.pow(B/1.5,k); }
MS.tissueAt=function(key,st){
  var t=MS.TISSUES[key], B=st.B0, o={key:key, n:t.n, src:t.src};
  var T1=t.T1, T2=t.T2, T2s=t.T2s, chi=t.chi||0;
  if(key==='hem'){ var hs=MS.HEM_STAGES.filter(function(h){return h.id===st.hemStage;})[0]||MS.HEM_STAGES[1]; T1=hs.T1; T2=hs.T2; T2s=hs.T2s; chi=hs.chi; o.n='血腫：'+hs.n; }
  o.T1=atB(T1,B); o.T2=B===3?T2[1]:(B===1.5?T2[0]:T2[0]*1.03); o.T2s=B===3?T2s[1]:(B===1.5?T2s[0]:T2s[0]*1.6);
  o.PD=t.PD; o.ADC=t.ADC; o.ff=t.ff||0; o.chi=chi; o.v=t.v||0; o.vt=t.vt||''; o.mt=t.mt||0; o.fa=t.fa||0; o.cbf=t.cbf||0; o.lesion=!!t.lesion;
  if(key==='liver'){ o.ff=(st.liverFF||0)/100; var iron=st.liverIron||0; o.T2s=1/(1/o.T2s+iron*B/1.5/1000); o.T2=1/(1/o.T2+iron*0.15*B/1.5/1000); }
  /* 造影 */
  var ag=st.agent||'none', ph=st.cphase||0;
  if(ag!=='none' && ph>0 && t.ce){ var v=null;
    if(ag==='eca'&&t.ce.eca) v=t.ce.eca[Math.min(ph,3)-1];
    else if(ag==='eob'){ if(t.ce.eob) v=t.ce.eob[Math.min(ph,4)-1]; else if(t.ce.eca) v=t.ce.eca[Math.min(ph,3)-1]*0.35; }
    if(v){ var rs=(ag==='eob'?MS.GBCA.eob.r1:MS.GBCA.eca.r1); var sc=(B>=3?rs[1]/rs[0]:1)*(st.dose||1); o.dR1=v*sc; o.T1=1/(1/o.T1+v*sc/1000); o.T2=1/(1/o.T2+v*sc*1.1/1000); o.T2s=1/(1/o.T2s+v*sc*1.3/1000); } }
  var fat=MS.TISSUES.fat; o.fT1=atB(fat.T1,B); o.fT2=B===3?fat.T2[1]:fat.T2[0]; o.fT2s=B===3?fat.T2s[1]:fat.T2s[0];
  return o;
};
/* ---------- 共通の信号式 ---------- */
var E=Math.exp, sin=Math.sin, cos=Math.cos, D2R=PI/180;
MS.sig={
  spgr:function(T1,T2s,TR,TE,a){ var E1=E(-TR/T1); return sin(a)*(1-E1)/(1-cos(a)*E1)*E(-TE/T2s); },
  bssfp:function(T1,T2,TR,a,theta){ var E1=E(-TR/T1), E2=E(-TR/T2); var th=theta+PI; var ca=cos(a), sa=sin(a), ct=cos(th), st=sin(th);
    /* 定常状態 M = A M + b,  A = P(θ)·緩和·Rx(α)（交互位相の RF を θ+π で表す）を 3×3 で解く */
    var a00=ct*E2, a01=st*E2*ca, a02=st*E2*sa, a10=-st*E2, a11=ct*E2*ca, a12=ct*E2*sa, a20=0, a21=-E1*sa, a22=E1*ca;
    var m00=1-a00, m01=-a01, m02=-a02, m10=-a10, m11=1-a11, m12=-a12, m20=-a20, m21=-a21, m22=1-a22, b2=1-E1;
    var det=m00*(m11*m22-m12*m21)-m01*(m10*m22-m12*m20)+m02*(m10*m21-m11*m20);
    var x0=(-m01*(-m12*b2)+m02*(-m11*b2))/det; /* Cramer: b=(0,0,b2) */
    x0=( m01*m12*b2 - m02*m11*b2 )/det;
    var x1=( -m00*m12*b2 + m02*m10*b2 )/det;
    var x2=( m00*m11*b2 - m01*m10*b2 )/det;
    var re=x0, im=ca*x1+sa*x2; var e=Math.sqrt(E2); return {re:re*e, im:im*e, mag:Math.hypot(re,im)*e}; },
  fisp:function(T1,T2,TR,TE,a,T2s){ var E1=E(-TR/T1), E2=E(-TR/T2), ca=cos(a); var p=1-E1*ca-E2*E2*(E1-ca), q=E2*(1-E1)*(1+ca); var r=Math.sqrt(Math.max(1e-12,p*p-q*q));
    return Math.tan(a/2)*(1-(E1-ca)*(1-E2*E2)/r)*E(-TE/(T2s||T2)); },
  psif:function(T1,T2,TR,TE,a){ var E1=E(-TR/T1), E2=E(-TR/T2), ca=cos(a); var p=1-E1*ca-E2*E2*(E1-ca), q=E2*(1-E1)*(1+ca); var r=Math.sqrt(Math.max(1e-12,p*p-q*q));
    return Math.tan(a/2)*(1-(1-E1*ca)*(1-E2*E2)/r)*E(-(2*TR-TE)/T2); },
  /* IR: 縦磁化 (TRサイクル内の回復 Trec 後に反転) */
  ir:function(T1,TI,Trec){ var M1=1-E(-Math.max(0,Trec)/T1); return 1-(1+M1)*E(-TI/T1); },
  dir:function(T1,TI1,TI2,Trec){ var M1=1-E(-Math.max(0,Trec)/T1); var m=1-(1+M1)*E(-(TI1-TI2)/T1); return 1-(1+m)*E(-TI2/T1); },
  /* MPRAGE 型：反転 → n パルスのGRE読出し → 回復 を定常まで反復。中心パルス時の Mz を返す */
  mprage:function(T1,TRs,TI,esp,n,a,center){ var E1=E(-esp/T1), ca=cos(a); var tPre=TI-center*esp; if(tPre<0) tPre=0; var tPost=TRs-tPre-n*esp; if(tPost<0) tPost=0; var Mz=1, mc=0;
    for(var it=0;it<12;it++){ Mz=-Mz; Mz=1-(1-Mz)*E(-tPre/T1); for(var k=0;k<n;k++){ if(k===center) mc=Mz; Mz=Mz*ca; Mz=1-(1-Mz)*E1; } Mz=1-(1-Mz)*E(-tPost/T1); }
    return mc*sin(a); },
  mp2rage:function(T1,TRs,TI1,TI2,esp,n,a1,a2){ var E1=E(-esp/T1); var c=Math.floor(n/2); var tA=TI1-c*esp, tB=TI2-TI1-n*esp, tC=TRs-TI2-(n-c)*esp; tA=Math.max(0,tA); tB=Math.max(0,tB); tC=Math.max(0,tC);
    var Mz=1, s1=0, s2=0; for(var it=0;it<12;it++){ Mz=-Mz; Mz=1-(1-Mz)*E(-tA/T1); for(var k=0;k<n;k++){ if(k===c) s1=Mz*sin(a1); Mz=Mz*cos(a1); Mz=1-(1-Mz)*E1; }
      Mz=1-(1-Mz)*E(-tB/T1); for(var k2=0;k2<n;k2++){ if(k2===c) s2=Mz*sin(a2); Mz=Mz*cos(a2); Mz=1-(1-Mz)*E1; } Mz=1-(1-Mz)*E(-tC/T1); }
    return [s1,s2]; }
};

/* ---------- 撮像条件の補正・時間・SNR・SAR ---------- */
MS.derive=function(st,sq){
  var p=JSON.parse(JSON.stringify(st.p)); var W=[], info={};
  var k=sq.timeAs||sq.k, dim=sq.dim||'2D';
  var tro=1000/p.bw; /* 読出し時間 ms */
  info.tro=tro;
  var Gmax=st.grad||45;
  /* 最短値の補正 */
  function clamp(key,v,msg){ if(p[key]!==undefined && p[key]<v-1e-9){ W.push({lv:'warn', t:msg+'：'+fmt(p[key])+' → '+fmt(v)+' に補正（最短値）'}); p[key]=v; } }
  var epi=/^(dwi|dti|bold|dsc)$/.test(k)||sq.epi;
  if(epi){ var bwE=Math.max(p.bw,600); p.esp_epi=Math.max(0.35, 1000/bwE+0.12+ (p.nx>192?0.15:0)); }
  if(/fse|ssfse|ir|fse3d|dixon_tse|ncmra_fbi|map_t2|mrcp/.test(k) && p.esp!==undefined){ clamp('esp',tro+2.4,'エコー間隔'); }
  if(sq.gre){ var minTE=0.6+tro/2*(p.pecho?0.55:1); if(k!=='ute') clamp('te',minTE,'TE'); if(p.tr!==undefined && k!=='mprage'&&k!=='mp2rage') clamp('tr',(p.te||minTE)+tro/2+1.0,'TR'); }
  if(k==='se') clamp('te',tro/2+5,'TE');
  if(k==='fse'||k==='ir'||k==='dixon_tse'||k==='map_t2'){ if(p.te!==undefined && p.esp) clamp('te',p.esp,'TE'); if(p.etl && p.te>p.etl*p.esp) { W.push({lv:'warn',t:'実効TEがエコートレインより長いため、TE='+fmt(p.etl*p.esp)+' ms に補正'}); p.te=p.etl*p.esp; } }
  if(epi){ var Ry=Math.max(1,p.r||1); var lines=Math.round(p.ny*(p.pf||1)/Ry); var pre=Math.round(p.ny*((p.pf||1)-0.5)/Ry);
    info.etlEPI=lines; info.readEPI=lines*p.esp_epi;
    if(k==='dwi'||k==='dti'){ var bmax=Math.max.apply(null,(p.bvals||'0,1000').split(',').map(Number)); var G=Gmax*1e-3; var gam=2.675e8; var del=Math.cbrt(1.5*bmax*1e6/(gam*gam*G*G))*1000; info.bdel=del;
      var minTEd=2*del+6+pre*p.esp_epi; if(p.seg>1) minTEd=2*del+6+pre*p.esp_epi/p.seg; clamp('te',minTEd,'TE（b値・傾斜磁場強度から）'); }
    else clamp('te',pre*p.esp_epi+2,'TE');
    if(p.tr) clamp('tr',p.te+lines*p.esp_epi/2+8,'TR'); }
  /* マトリクス・画素 */
  var fovpe=p.fov*p.pfov/100; info.fovpe=fovpe; info.dx=p.fov/p.nx; info.dy=fovpe/p.ny; info.dz=dim==='3D'? (p.thk) : p.thk;
  info.voxel=info.dx*info.dy*info.dz;
  var pos=(p.pos||0)/100, R=(st.pimode&&st.pimode!=='off')?Math.max(1,p.r||1):1, Rz=(dim==='3D'&&st.pimode!=='off')?Math.max(1,p.rz||1):1, CS=Math.max(1,p.cs||1);
  if(CS>1 && R>1) { /* CS と PI の併用 */ }
  var nyAcq=p.ny*(1+pos)*(p.pf||1);
  var nzAcq=dim==='3D'? p.npart*(1+(p.sos||0)/100)*(p.pfz||1):1;
  info.R=R; info.Rz=Rz; info.CS=CS;
  /* 撮像時間 */
  var TR=p.tr||0, nex=p.nex||1, T=0, sl=p.nsl||1, sms=Math.max(1,p.sms||1); var slEff=Math.ceil(sl/sms); var conc=1, tSlice=0;
  var fsT={none:0,chess:12,spair:20,we:2,dixon:0,stir:0}[st.fs||'none']||0;
  var resp=st.resp||'none', RR=60000/(st.hr||70);
  if(dim==='2D'){
    if(k==='se'){ tSlice=p.te+tro/2+6+fsT; }
    else if(k==='fse'||k==='dixon_tse'||k==='map_t2'){ tSlice=p.etl*p.esp+8+fsT; }
    else if(k==='ir'){ tSlice=p.etl*p.esp+12+fsT; }
    else if(sq.gre){ tSlice=(p.te2||p.te)+tro/2+2+fsT; }
    else if(epi){ tSlice=p.te+info.readEPI/2+12+fsT; }
    if(tSlice>0 && TR>0){ var maxSl=Math.max(1,Math.floor(TR/tSlice)); if(k==='ir'){ maxSl=Math.max(1,Math.floor((TR-0)/(tSlice*1.0))); } conc=Math.ceil(slEff/maxSl); info.maxSl=maxSl; }
  }
  var lines=nyAcq/(R*(dim==='2D'?CS:1));
  if(k==='se'){ T=TR*lines*nex*conc; }
  else if(k==='fse'||k==='dixon_tse'||k==='ir'||k==='map_t2'){ T=TR*Math.ceil(lines/p.etl)*nex*conc*(k==='dixon_tse'?(p.dixpts||2):1); }
  else if(k==='ssfse'||k==='mrcp2d'){ T=slEff*Math.max(TR, (lines*p.esp+20))*nex; }
  else if(epi && dim==='2D'){ var nv=1; if(k==='dwi'){ var bs=(p.bvals||'0,1000').split(',').map(Number); nv=bs.reduce(function(a,b){return a+(b>0?(p.ndir||3)*(p.bavg||1):1);},0); } else if(k==='dti'){ nv=(p.ndir||30)+Math.max(1,Math.round((p.ndir||30)/10)); } else if(k==='bold'||k==='dsc'){ nv=p.nvol||100; }
    T=TR*nv*conc*(p.seg||1)*(k==='dwi'||k==='dti'?nex:1); info.nvol=nv; }
  else if(sq.gre && dim==='2D'){ if(TR>40) T=TR*lines*nex*conc; else T=TR*lines*nex*slEff; if(k==='cine'||k==='cine_gre'){ var vps=p.vps||12; T=slEff*Math.ceil(lines/vps)*RR*(1); info.tres=vps*TR; } if(k==='lge'){ T=slEff*Math.ceil(lines/(p.vps||25))*RR*2; } if(k==='pc'){ T*= (p.vdirs||1)+1; } if(k==='map_t1'){ T=slEff*17*RR; } }
  else if(dim==='3D'){ var l3=nyAcq*nzAcq/(R*Rz*CS);
    if(k==='fse3d'||k==='ncmra_fbi'||k==='mrcp'){ T=TR*l3/p.etl*nex; if(k==='ncmra_fbi') T=RR*Math.max(1,Math.round(TR/RR))*l3/p.etl*2; }
    else if(k==='mprage'||k==='mp2rage'){ T=p.trs*nyAcq*(dim==='3D'?(nzAcq/p.npart):1)/(R*CS)*nex*(p.npart>0?1:1); }
    else if(k==='asl'){ T=p.tr*(p.npairs||10)*2*Math.max(1,(p.segs||1)); }
    else { T=TR*l3*nex*(k==='pc4d'?4:1)*(k==='dixon'||k==='pdff'?1:1)*(p.slabs||1); }
  }
  if(k==='mrs'){ T=p.tr*(p.navg||128); }
  if(k==='mre'){ T=(p.nsl||4)*15*1000; }
  if(k==='asl'){ T=p.tr*((p.npairs||8)*2+1); }
  if(k==='ute'){ T=TR*Math.PI/2*p.nx*nex*(p.nsl||1)/(CS*R); }
  if((st.radial||st.resp==='radial') && /gre|fse/.test(sq.base||k) && !sq.radial) { T*=1.4; info.radial=true; } if(sq.radial) info.radial=true;
  /* 呼吸・心電図同期 */
  var eff=1; if(resp==='trig'){ eff= Math.max(0.3, Math.min(1, TR/ (Math.ceil(TR/4000)*4000))); if(!sq.gre && TR<4000){ T=T*4000/TR; } else T=T/0.85; }
  else if(resp==='nav'){ T=T/0.45; } else if(resp==='bh'){ }
  if(st.ecg==='pro' && !/cine|lge|map_t1|ncmra/.test(k)){ T=T*Math.max(1,RR/Math.max(TR,1)); }
  info.T=T/1000; info.conc=conc; info.tSlice=tSlice;
  if(resp==='bh' && info.T>22) W.push({lv:'warn', t:'息止め時間 '+info.T.toFixed(1)+' 秒 — 一般に 20 秒前後までが目安。分割するか加速を上げてください'});
  if(conc>1 && dim==='2D' && !/ssfse|mrcp2d/.test(k)) W.push({lv:'info', t:'1TR内に収まるスライス数は '+info.maxSl+' 枚 → '+conc+' 回に分けて収集（Siemens: Concatenations）'});
  /* SNR */
  var B0f=Math.pow(st.B0/1.5,0.85); var coil=st.coilG; var V=info.voxel;
  var acqLines=nyAcq/(R*CS)*(dim==='3D'?nzAcq/(Rz):1)*nex; if(k==='dwi'||k==='dti') acqLines=nyAcq/R*nex;
  if(k==='ssfse') acqLines=nyAcq/R*nex;
  var gmean=R>1?(1+0.06*Math.pow(R-1,1.6)*(dim==='3D'&&st.caipi?0.6:1)):1; if(Rz>1) gmean*=1+0.05*Math.pow(Rz-1,1.5);
  var smsG=sms>1?1+0.04*(sms-1):1;
  var snr0=35*B0f*coil*V*Math.sqrt(acqLines/p.bw)/(gmean*smsG);
  if(CS>1) snr0*=Math.min(2.2,1+0.22*(CS-1));
  var dlr=[1,1.35,1.7,2.1][st.dlr||0]; snr0*=dlr;
  info.snr0=snr0; info.g=gmean;
  /* SAR（相対） */
  var en=0; var b1rms=0;
  var refoc=(p.refoc||180)/90, fa=(p.fa||90)/90;
  var fsE={none:0,chess:0.5,spair:0.8,we:0.3,dixon:0}[st.fs||'none']||0;
  if(k==='se') en=sl*(1+4+fsE)/(TR/1000);
  else if(k==='fse'||k==='dixon_tse'||k==='map_t2') en=Math.min(sl,info.maxSl||sl)*(1+p.etl*refoc*refoc+fsE)/(TR/1000);
  else if(k==='ir') en=Math.min(sl,info.maxSl||sl)*(4+1+p.etl*refoc*refoc+fsE)/(TR/1000);
  else if(k==='ssfse'||k==='mrcp2d') en=(1+lines*refoc*refoc)/(Math.max(TR,lines*p.esp)/1000);
  else if(k==='fse3d'||k==='mrcp'||k==='ncmra_fbi') en=(1+p.etl*Math.pow(refoc*0.55,2)+fsE+(p.ti?4:0))/(TR/1000);
  else if(epi) en=Math.min(sl,info.maxSl||sl)*(1+4+fsE+(st.fs==='stir'?4:0))/(TR/1000);
  else if(sq.gre){ var ftr=TR||5; en=(fa*fa)/(ftr/1000)*(dim==='2D'&&TR>40?Math.min(sl,info.maxSl||sl):1)+fsE*(1000/Math.max(ftr*20,50)); if(k==='mprage'||k==='mp2rage') en=(fa*fa*p.npart/(p.trs/1000))*0.08+4/(p.trs/1000); }
  else en=50;
  var regK={head:1,body:1.5,knee:0.7}[st.coil]||1;
  var sarPct=en*st.B0*st.B0*regK/50; info.sar=sarPct; info.sarE=en;
  if(sarPct>100) W.push({lv:'err', t:'SAR が上限を超える見込み（相対 '+Math.round(sarPct)+'%）— TRを延ばす／スライスを減らす／リフォーカス角を下げる／ETLを減らす'});
  else if(sarPct>70) W.push({lv:'warn', t:'SAR が高め（相対 '+Math.round(sarPct)+'%）'});
  info.p=p; info.W=W; return info;
};
function fmt(v){ return (Math.abs(v)<10? (Math.round(v*100)/100): Math.round(v*10)/10); }
MS.fmt=fmt;

/* ---------- サンプリング幾何（ラベル・磁場・B1・動き） ---------- */
function bilin(arr,n,P,x,y){ var fx=(x+P/2)/P*n-0.5, fy=(y+P/2)/P*n-0.5; var i=Math.floor(fx), j=Math.floor(fy), ax=fx-i, ay=fy-j;
  function g(a,b){ a=Math.max(0,Math.min(n-1,a)); b=Math.max(0,Math.min(n-1,b)); return arr[b*n+a]; }
  return (1-ax)*(1-ay)*g(i,j)+ax*(1-ay)*g(i+1,j)+(1-ax)*ay*g(i,j+1)+ax*ay*g(i+1,j+1); }
MS.geometry=function(ph,st,S){
  var p=st.p, P=ph.P, fov=p.fov, fovpe=fov*p.pfov/100, fovAcq=fovpe*(1+(p.pos||0)/100);
  var peV=ph.ph.plane==='ax'? (st.pe==='AP') : (st.pe==='SI'); /* PE が縦方向 */
  var sub=S<=256?2:1, K=3, ns=sub*sub;
  var lab=new Int16Array(S*S*ns*K).fill(-1), ta=new Float32Array(S*S*ns*K), tb=new Float32Array(S*S*ns*K), tc=new Float32Array(S*S*ns*K), fld=new Float32Array(S*S*ns*K), grd=new Float32Array(S*S*ns*K), xs=new Float32Array(S*S*ns*K), ys=new Float32Array(S*S*ns*K);
  var N=ph.N, fn=ph.fn, field=ph.field;
  /* 磁場勾配 */
  var gx=new Float32Array(fn*fn); var hmm=P/fn; for(var j=0;j<fn;j++) for(var i=0;i<fn;i++){ var a=field[j*fn+Math.min(fn-1,i+1)]-field[j*fn+Math.max(0,i-1)], b=field[Math.min(fn-1,j+1)*fn+i]-field[Math.max(0,j-1)*fn+i]; gx[j*fn+i]=Math.sqrt(a*a+b*b)/(2*hmm); }
  var ox=st.offX||0, oy=st.offY||0;
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ for(var sy=0;sy<sub;sy++) for(var sx=0;sx<sub;sx++){
      var u=(c+(sx+0.5)/sub)/S*fov-fov/2; /* RO */ var v=(r+(sy+0.5)/sub)/S*fovpe-fovpe/2; /* PE */
      for(var kk=0;kk<K;kk++){ var w=v+(kk===0?0:(kk===1?-fovAcq:fovAcq)); var x,y; if(peV){ x=u; y=w; } else { x=w; y=u; } x+=ox; y+=oy;
        var o=((r*S+c)*ns+sy*sub+sx)*K+kk;
        if(Math.abs(x)>=P/2||Math.abs(y)>=P/2){ continue; }
        var li=ph.lab[Math.floor((y+P/2)/P*N)*N+Math.floor((x+P/2)/P*N)]; if(kk>0 && li===0) continue;
        lab[o]=li; ta[o]=bilin(ph.t1,ph.tn,P,x,y); tb[o]=bilin(ph.t2,ph.tn,P,x,y); tc[o]=bilin(ph.t3,ph.tn,P,x,y); fld[o]=bilin(field,fn,P,x,y); grd[o]=bilin(gx,fn,P,x,y); xs[o]=x; ys[o]=y; } } }
  return {S:S,sub:sub,ns:ns,K:K,lab:lab,ta:ta,tb:tb,tc:tc,fld:fld,grd:grd,xs:xs,ys:ys,peV:peV,fov:fov,fovpe:fovpe,fovAcq:fovAcq};
};

/* B1（送信）不均一 */
function b1At(st,ph,x,y){ if(st.B0<3) return 1; var amp=st.b1corr?0.35:1, c=ph.ph.coil;
  if(c==='head') return 1+amp*0.12*E(-(x*x+y*y)/(55*55))-amp*0.05;
  if(c==='knee'||c==='shoulder') return 1;
  if(c==='breast'||c==='spine') return 1+amp*(0.08*E(-(x*x+y*y)/(120*120))-0.06*E(-((x-40)*(x-40)+(y+20)*(y+20))/(60*60)));
  var dip=0.3*E(-(((x-25)*(x-25))/(75*75)+((y+35)*(y+35))/(55*55)));
  return 1+amp*(0.12*E(-(x*x+y*y)/(140*140))-dip-0.02); }
/* 受信コイル感度 */
function coilAt(ph,x,y){ var P=ph.P, c=ph.ph.coil, ce=ph.ph.coilC||[0,0];
  if(c==='head'){ var r=Math.hypot(x/80,y/98); return 0.85+0.3*r*r; }
  if(c==='knee'||c==='shoulder'){ var r2=Math.hypot((x-ce[0])/60,(y-ce[1])/120); return 0.8+0.5*r2*r2; }
  if(c==='spine'){ /* 後方（矢状断では +x）の脊椎コイル */ var d=Math.max(0,(ce[0]||80)-x); return 0.45+1.1*E(-d/70); }
  if(c==='breast'){ var dl=Math.hypot(x+75,y+40), dr=Math.hypot(x-75,y+40); return 0.5+0.9*E(-Math.min(dl,dr)/70); }
  var rx=x/170, ry=y/125; var r3=Math.sqrt(rx*rx+ry*ry); return 0.55+0.85*Math.pow(r3,2.2); }
MS.b1At=b1At; MS.coilAt=coilAt;

/* ---------- 1回の収集から画像を作る ----------
 acq: { sig(tp,df) -> {w, wph, f, fph, T2b, fT2b}, gre(bool), te(ms), perPixel(bool), fs, epi, train:{type,etl,esp,te}, nlines, timing, noise }
*/
MS.form=function(ctx,acq){
  var st=ctx.st, info=ctx.info, p=info.p, G=ctx.geo, S=G.S, ns=G.ns, K=G.K, ph=ctx.ph, tps=ctx.tps;
  if(ctx.probe){ /* 掃引用：1画素=1組織、磁場ずれ・k空間・雑音なし */
    var pre=new Float32Array(S*S), pim=new Float32Array(S*S), fH=MS.FAT_PPM*GAMMA*st.B0;
    for(var pq=0;pq<S*S;pq++){ var pli=G.lab[pq]; if(pli<0) continue; var ptp=tps[pli]; if(!ptp||!ptp.PD) continue; var sg0=acq.sig(ptp,0,1); var w0=sg0.w||0, f0=sg0.f||0, wp0=sg0.wph||0, fp0=sg0.fph||0;
      if(acq.gre) fp0+=-2*PI*fH*acq.te/1000; var fm=acq.fs||'none'; if(fm==='chess') f0=0; else if(fm==='spair') f0*=0.03; else if(fm==='we') f0*=0.05;
      pre[pq]=w0*cos(wp0)+f0*cos(fp0); pim[pq]=w0*sin(wp0)+f0*sin(fp0); }
    return {re:pre,im:pim,kmag:null}; }
  var B0=st.B0, hzppm=GAMMA*B0, fatHz=MS.FAT_PPM*hzppm;
  var bw=p.bw, nx=Math.min(S,p.nx), ny=Math.min(S,p.ny);
  var roScale=S/nx, peScale=S/ny;
  var vat=!!st.vat, fsMode=acq.fs||'none';
  var useBins=!!acq.train, nb=useBins?5:1, edges=[25,55,100,250];
  function bin(T){ if(!useBins) return 0; for(var i=0;i<4;i++) if(T<edges[i]) return i; return 4; }
  var binT=[15,40,75,160,800];
  var mot=ctx.motion; /* {resp:amp, card:amp, puls:bool} */
  var comps={}; function comp(c,b){ var id=c*8+b; if(!comps[id]){ comps[id]={c:c,b:b,re:new Float64Array(S*S),im:new Float64Array(S*S)}; } return comps[id]; }
  /* 信号テーブル（ラベル × B1 段階） */
  var nB1=7, b1v=[0.6,0.7,0.8,0.9,1.0,1.1,1.2];
  var tab={};
  function look(li,b1){ var bi=Math.max(0,Math.min(nB1-1,Math.round((b1-0.6)/0.1))); var key=li*8+bi; var r=tab[key]; if(!r){ r=tab[key]=acq.sig(tps[li],0,b1v[bi]); } return r; }
  var epiShift=acq.epi? (acq.epi.lines*acq.epi.esp/1000) : 0; /* Hz → 取得画素 */
  var wsc=1/ns;
  var semac=st.semac||0, excBW=1200*(1+semac*0.6);
  var heartC=ph.ph.region==='chest'; var texs=tps.map(function(t){ return t?MS.texOf(t.key):null; });
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var base=(r*S+c)*ns;
    for(var s=0;s<ns;s++) for(var kk=0;kk<K;kk++){ var o=(base+s)*K+kk; var li=G.lab[o]; if(li<0) continue; if(li===0 && kk>0) continue;
      var tp=tps[li]; if(!tp.PD) continue; var x=G.xs[o], y=G.ys[o];
      var df=G.fld[o]*hzppm, g=G.grd[o]*hzppm*(st.shim?0.6:1); if(st.shim) df*=0.7;
      var b1=b1At(st,ph,x,y);
      var sg=acq.perPixel? acq.sig(tp,df,b1) : look(li,b1);
      var w=sg.w, wph=sg.wph||0, f=sg.f||0, fph=sg.fph||0;
      /* 励起帯域外（金属近傍） */
      if(Math.abs(df)>excBW){ var q=excBW/Math.abs(df); w*=q*q; f*=q*q; }
      /* GRE: 位相・ボクセル内位相分散 */
      if(acq.gre){ var te=acq.te/1000; var dz=(info.dz||5)*(st.p.dim3?0.5:1); var arg=PI*g*dz*te*1.0; var dep=arg<1e-3?1:Math.abs(Math.sin(arg)/arg); dep=Math.max(0,dep);
        w*=dep; f*=dep; wph+= -2*PI*df*te; fph+= -2*PI*(df+fatHz)*te; }
      /* 周波数選択性の脂肪抑制・水励起 */
      if(fsMode==='chess'||fsMode==='spair'){ var sgm=Math.abs(fatHz)*0.42; var effF=fsMode==='chess'?(1-Math.abs(cos(PI/2*b1))):0.97; var hit=E(-Math.pow(df/sgm,4)); f*=1-effF*hit; var hw=E(-Math.pow((df-fatHz)/sgm,4)); w*=1-effF*hw; }
      else if(fsMode==='we'){ var sg2=Math.abs(fatHz)*0.4; w*=E(-Math.pow(df/(sg2*1.3),4)); f*=0.04+0.96*(1-E(-Math.pow((df+fatHz)/sg2,4))); f=f*0.05+f*0.95*E(-Math.pow((df+fatHz)/sg2,4)); }
      /* 位置ずれ：読出し方向（化学シフト・磁場）と EPI の位相方向 */
      var dRO=vat?0:(df/bw)*roScale, dROf=vat?0:((df+fatHz)/bw)*roScale;
      var dPE=acq.epi? df*epiShift*peScale : 0, dPEf=acq.epi? (df+fatHz)*epiShift*peScale : 0;
      /* 成分（動き） */
      var cc=0, wr=0;
      if(mot.card && heartC && /^(myo|blood_c|mi)$/.test(tp.key)) cc=2;
      else if(mot.puls && (tp.vt==='a'||tp.vt==='c')) cc=3;
      else if(mot.resp){ var yy=G.peV?y:y; wr=mot.wfn(x,y,tp.key); }
      var amp=wsc, TX=texs[li]; if(TX){ var tf=1+(TX.f||0)*G.ta[o]+(TX.c||0)*G.tb[o]+(TX.d||0)*G.tc[o]; if(tf<0.2) tf=0.2; amp*=tf; if(TX.ffv&&f){ var vv=TX.ffv*G.ta[o]; w*=Math.max(0,1-vv); f*=1+vv; } }
      var rr=(G.peV? r : r), ccx=c;
      var put=function(cat,bn,val,ph0,dr,dp,wt){ if(!val) return; var C=comp(cat,bn); var re=val*cos(ph0)*wt, im=val*sin(ph0)*wt;
        var fr=r+dp, fc=c+dr; var i0=Math.floor(fc), j0=Math.floor(fr), ax=fc-i0, ay=fr-j0;
        function add(j,i,ww){ if(i<0||i>=S||j<0||j>=S) return; var q=j*S+i; C.re[q]+=re*ww; C.im[q]+=im*ww; }
        add(j0,i0,(1-ax)*(1-ay)); add(j0,i0+1,ax*(1-ay)); add(j0+1,i0,(1-ax)*ay); add(j0+1,i0+1,ax*ay); };
      var bw_=bin(sg.T2b||tp.T2), bf_=bin(sg.fT2b||tp.fT2);
      if(cc){ put(cc,bw_,w,wph,dRO,dPE,amp); put(cc,bf_,f,fph,dROf,dPEf,amp); }
      else { if(wr<1){ put(0,bw_,w,wph,dRO,dPE,amp*(1-wr)); put(0,bf_,f,fph,dROf,dPEf,amp*(1-wr)); }
             if(wr>0){ put(1,bw_,w,wph,dRO,dPE,amp*wr); put(1,bf_,f,fph,dROf,dPEf,amp*wr); } }
    } }
  /* k空間 */
  var KR=new Float64Array(S*S), KI=new Float64Array(S*S);
  var half=S/2, kyStart=-ny/2+(1-(p.pf||1))*ny, kxStart=p.pecho? -nx/2+0.3*nx/2 : -nx/2;
  var sr=st.sr?1.35:1; var nxe=Math.min(S,nx*sr), nye=Math.min(S,ny*sr);
  var filt=st.filter||'weak';
  var tr=acq.train;
  /* 各 ky ラインの時刻（動き）と T2 減衰 */
  var nyAll=ny; var lineT=new Float64Array(S), lineEcho=new Float64Array(S);
  for(var j=0;j<S;j++){ var ky=j-half; var li2=ky+ny/2; /* 0..ny */
    var tt=0, te_=0;
    if(tr){ if(tr.type==='fse'){ var grp=Math.max(1,Math.round(ny/tr.etl)); var g0=Math.floor(li2/grp); var gc=Math.floor((ny/2)/grp); var nc=Math.max(0,Math.round(tr.te/tr.esp)-1); var e=((g0-gc+nc)%tr.etl+tr.etl)%tr.etl; te_=(e+1)*tr.esp; tt=(li2%grp)*acq.tr/1000; }
      else if(tr.type==='ss'){ var first=(1-(p.pf||1))*ny; var idx=li2-first; te_=tr.te+(li2-ny/2)*tr.esp; tt=idx*tr.esp/1000; }
      else if(tr.type==='epi'){ var first2=(1-(p.pf||1))*ny; te_=tr.te+(li2-ny/2)*tr.esp; tt=0; }
      else if(tr.type==='fse3d'){ te_=tr.te+((li2-ny/2)/(ny/2))*(tr.etl*tr.esp)*0.25; tt=li2*acq.tr/1000; }
    } else { tt=li2*(acq.tr||5)/1000*(acq.tmul||1); }
    lineT[j]=tt; lineEcho[j]=te_; }
  var pulsP=mot.rr||1;
  for(var id in comps){ var C=comps[id]; chk(C.re,C.im,S); fft2(C.re,C.im,S,false); chk(C.re,C.im,S);
    var T2=binT[C.b]*(tr&&tr.type==='fse3d'?2.2:1);
    for(var j3=0;j3<S;j3++){ var ky3=j3-half; if(ky3<kyStart-1e-9||ky3>=ny/2*sr+1e-9&&ky3>=nye/2) { for(var i4=0;i4<S;i4++){ C.re[j3*S+i4]=0; C.im[j3*S+i4]=0; } continue; }
      var wky=1; if(tr && useBins){ wky=E(-(lineEcho[j3]-(tr.te))/T2); if(!isFinite(wky)) wky=0; wky=Math.min(wky,8); }
      if(Math.abs(ky3)>=nye/2) { wky=0; }
      if(sr>1 && Math.abs(ky3)>=ny/2) wky*=0.55*(1-(Math.abs(ky3)-ny/2)/(nye/2-ny/2+1e-9));
      if(filt==='hamming') wky*=0.54+0.46*cos(PI*ky3/(nye/2)); else if(filt!=='none'){ var u3=Math.abs(ky3)/(nye/2); if(u3>0.8) wky*=0.5+0.5*cos(PI*(u3-0.8)/0.2); }
      /* 動き */
      var mr=1, mi=0;
      if(C.c===1||C.c===2||C.c===3){ var nav=Math.max(1,Math.round(p.nex||1)); var sr_=0, si_=0;
        for(var a=0;a<nav;a++){ var t=lineT[j3]+a*(ctx.info.T/nav)+a*0.37; var d=0, am=1;
          if(C.c===1){ d=mot.resp*Math.sin(2*PI*t/3.7+0.3); } else if(C.c===2){ d=mot.card*Math.sin(2*PI*t/(pulsP)+1.1); } else { am=1+0.6*Math.sin(2*PI*t/pulsP); }
          if(mot.radial && C.c!==3){ d*=0.25*((rnd()*2-1)); }
          var phs=-2*PI*(ky3*d*(mot.dirPE||1)/G.fovAcq);
          sr_+=am*cos(phs); si_+=am*sin(phs); }
        mr=sr_/nav; mi=si_/nav; }
      for(var i5=0;i5<S;i5++){ var kx=i5-half; var q=j3*S+i5; if(kx<kxStart||Math.abs(kx)>=nxe/2){ C.re[q]=0; C.im[q]=0; continue; }
        var wkx=1; if(sr>1&&Math.abs(kx)>=nx/2) wkx=0.55*(1-(Math.abs(kx)-nx/2)/(nxe/2-nx/2+1e-9)); if(filt==='hamming') wkx*=0.54+0.46*cos(PI*kx/(nxe/2)); else if(filt!=='none'){ var u4=Math.abs(kx)/(nxe/2); if(u4>0.8) wkx*=0.5+0.5*cos(PI*(u4-0.8)/0.2); }
        var ww=wky*wkx; var re=C.re[q]*ww, im=C.im[q]*ww; KR[q]+=re*mr-im*mi; KI[q]+=re*mi+im*mr; } } }
  /* 部分フーリエはゼロ埋め（共役補完は行わない＝ぼけの再現） */
  var kmag=null; if(ctx.wantK){ kmag=new Float32Array(S*S); for(var q2=0;q2<S*S;q2++) kmag[q2]=Math.log(1e-6+Math.hypot(KR[q2],KI[q2])); }
  chk(KR,KI,S); fft2(KR,KI,S,true); chk(KR,KI,S);
  /* 部分フーリエ: 実数化を近似（ホモダイン相当で位相成分を半減）*/
  var re=new Float32Array(S*S), im=new Float32Array(S*S);
  var pfA=(p.pf||1)<1? 1/(2*(p.pf||1)-0.0001) : 1;
  for(var q3=0;q3<S*S;q3++){ re[q3]=KR[q3]*(pfA>1?1:1); im[q3]=KI[q3]; }
  if((p.pf||1)<1){ /* ゼロ埋めで中心振幅が落ちるのを補正 */ var sc=1/(0.5+((p.pf||1)-0.5)); var sc2=Math.min(2,1/(1-(1-(p.pf))*1)); for(var q4=0;q4<S*S;q4++){ re[q4]*=sc2; im[q4]*=sc2; } }
  return {re:re, im:im, kmag:kmag};
};

/* 雑音・コイル感度・並列画像の残存折り返し */
MS.finish=function(ctx,img,opt){
  opt=opt||{}; if(ctx.probe) return {re:new Float32Array(img.re), im:new Float32Array(img.im)}; var st=ctx.st, info=ctx.info, G=ctx.geo, S=G.S, ph=ctx.ph;
  var sigma=(opt.sigma!==undefined?opt.sigma:1/info.snr0)*(opt.noiseMul||1);
  var re=img.re, im=img.im, out_re=new Float32Array(S*S), out_im=new Float32Array(S*S);
  var R=info.R, Rmax=(st.p.dim3||ctx.sq.dim==='3D')?4:3;
  var alias=R>Rmax? 0.05*Math.pow(R-Rmax,1.2):0; var shiftPx=Math.round(S/(Math.max(R,1))*(G.fovAcq/G.fovpe));
  var smsLeak=(st.p.sms||1)>1?0.02*((st.p.sms||1)-1):0;
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c; var u=(c+0.5)/S*G.fov-G.fov/2, v=(r+0.5)/S*G.fovpe-G.fovpe/2; var x=G.peV?u:v, y=G.peV?v:u;
    var cs=coilAt(ph,x,y); var a=re[q], b=im[q];
    if(alias>0){ var r2=(r+shiftPx)%S; a+=alias*re[r2*S+c]; b+=alias*im[r2*S+c]; }
    if(smsLeak>0){ var c2=(c+Math.round(S/3))%S; a+=smsLeak*re[q-c+c2]; b+=smsLeak*im[q-c+c2]; }
    var gl=1; if(R>1){ var cen=E(-(x*x+y*y)/(Math.pow(ph.P*0.25,2))); gl=1+(info.g-1)*(0.6+1.4*cen); gl/=info.g; }
    var n1=gauss()*sigma*gl, n2=gauss()*sigma*gl;
    a=a*cs+n1; b=b*cs+n2; if(st.norm!==false){ a/=cs; b/=cs; }
    out_re[q]=a; out_im[q]=b; }
  if(st.cs>1 || (st.p.cs||1)>1){ /* CS の軽いぼかし */ var k=Math.min(0.5,0.05*((st.p.cs||1)-1)); if(k>0) smooth(out_re,out_im,S,k); }
  if(st.dlr>=3){ smooth(out_re,out_im,S,0.18); }
  return {re:out_re, im:out_im};
};
function smooth(re,im,S,k){ var a=new Float32Array(re), b=new Float32Array(im); for(var r=1;r<S-1;r++) for(var c=1;c<S-1;c++){ var q=r*S+c;
  re[q]=(1-k)*a[q]+k*0.25*(a[q-1]+a[q+1]+a[q-S]+a[q+S]); im[q]=(1-k)*b[q]+k*0.25*(b[q-1]+b[q+1]+b[q-S]+b[q+S]); } }
MS.mag=function(o){ var S=o.re.length, m=new Float32Array(S); for(var i=0;i<S;i++) m[i]=Math.hypot(o.re[i],o.im[i]); return m; };
MS.gauss=gauss; MS.rnd=rnd;
})();
