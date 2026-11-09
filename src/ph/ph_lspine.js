(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir, ribs=P.ribs, spine=P.spine;
MS.addTissues({
  disc_n:   {n:'椎間板 髄核', T1:[1150,1350], T2:[130,110], T2s:[60,40], PD:0.9, ADC:1.7, mt:0.15, tx:{f:.03,c:.03}, src:'est'},
  disc_af:  {n:'椎間板 線維輪', T1:[900,1050], T2:[35,30], T2s:[14,9], PD:0.65, ADC:1.1, mt:0.35, fa:0.4, tx:{f:.03,d:.04}, src:'est'},
  disc_dg:  {n:'変性した髄核（乾燥）', T1:[1000,1150], T2:[55,48], T2s:[25,16], PD:0.75, ADC:1.2, mt:0.3, src:'est'},
  cauda:    {n:'馬尾・終糸', T1:[950,1200], T2:[70,62], T2s:[40,28], PD:0.72, ADC:1.2, mt:0.3, fa:0.5, src:'est'},
  disc_hern:{n:'椎間板ヘルニア（脱出髄核）', T1:[1100,1300], T2:[95,85], T2s:[45,30], PD:0.85, ADC:1.5, ce:{eca:[0.2,0.6,1.0]}, lesion:1, src:'est'},
  modic1:   {n:'Modic 1型変化（終板下の浮腫・肉芽）', T1:[950,1150], T2:[85,75], T2s:[25,15], PD:0.85, ADC:1.1, ff:0.2, ce:{eca:[1.5,2.5,2.5]}, lesion:1, tx:{f:.08,c:.08}, src:'est'}
});
/* ---------- 補助 ---------- */
function segD(x,y,a,b){ var ax=b[0]-a[0], ay=b[1]-a[1], L2=ax*ax+ay*ay, t=L2?((x-a[0])*ax+(y-a[1])*ay)/L2:0; t=t<0?0:t>1?1:t; var px=a[0]+t*ax-x, py=a[1]+t*ay-y; return Math.sqrt(px*px+py*py); }
function polyD(x,y,p){ var d=1e9; for(var a=0,b=p.length-1;a<p.length;b=a++){ var q=segD(x,y,p[b],p[a]); if(q<d) d=q; } return d; }
function inPoly(x,y,p){ var c=false; for(var a=0,b=p.length-1;a<p.length;b=a++){ if(((p[a][1]>y)!==(p[b][1]>y)) && (x<(p[b][0]-p[a][0])*(y-p[a][1])/(p[b][1]-p[a][1])+p[a][0])) c=!c; } return c; }
function bb(p,m){ m=m||0; var xs=p.map(function(q){return q[0];}), ys=p.map(function(q){return q[1];}); return [Math.min.apply(null,xs)-m,Math.min.apply(null,ys)-m,Math.max.apply(null,xs)+m,Math.max.apply(null,ys)+m]; }
function lerp(xs,ys,x){ if(x<=xs[0]) return ys[0]; for(var i=0;i<xs.length-1;i++){ if(x<=xs[i+1]){ var f=(x-xs[i])/(xs[i+1]-xs[i]); return ys[i]*(1-f)+ys[i+1]*f; } } return ys[ys.length-1]; }

/* ---------- 脊柱の幾何（中心線に沿った s・u 座標） ----------
 s: 椎体中心を結ぶ曲線に沿った長さ（下向き +）、u: 曲線の法線方向（後方 +）。画像の左＝前、上＝頭側。 */
var LV=[ /* 名前, 椎体高 H, 前後径 D, 下の椎間板高, 曲線の傾き(°、下へ行くと後方へ +), 脊柱管前後径, 棘突起長, 棘突起の傾き */
  ['Th11',22,28,5,  4,17,26,12], ['Th12',24,30,6,-2,17,28,7], ['L1',26,32,8,-9,18,30,3], ['L2',27,34,9,-13,18,31,2],
  ['L3',28,35,10,-10,17.5,31,2], ['L4',28,36,10.5,-1,17,30,2], ['L5',27,35,8.5,13,17,26,4], ['S1',28,34,2,33,15,12,0],
  ['S2',22,28,1.5,44,12,10,0], ['S3',17,22,1.2,54,9,8,0], ['S4',13,17,1,64,7,6,0] ];
var G=(function(){
  var n=LV.length, sc=[0]; for(var i=1;i<n;i++) sc.push(sc[i-1]+LV[i-1][1]/2+LV[i-1][3]+LV[i][1]/2);
  var ang=LV.map(function(l){ return l[4]*Math.PI/180; });
  var s0=sc[0]-40, s1=sc[n-1]+30, ds=0.5, N=Math.round((s1-s0)/ds)+1, X=new Float64Array(N), Y=new Float64Array(N), A=new Float64Array(N);
  for(var k=0;k<N;k++) A[k]=lerp(sc,ang,s0+k*ds);
  for(var k2=1;k2<N;k2++){ X[k2]=X[k2-1]+Math.sin(A[k2])*ds; Y[k2]=Y[k2-1]+Math.cos(A[k2])*ds; }
  /* L3 中心を (6, 2) 付近に置く */
  var k3=Math.round((sc[4]-s0)/ds), ox=6-X[k3], oy=-2-Y[k3]; for(var q=0;q<N;q++){ X[q]+=ox; Y[q]+=oy; }
  return {sc:sc, s0:s0, s1:s1, ds:ds, N:N, X:X, Y:Y, A:A};
})();
function idx(s){ var k=(s-G.s0)/G.ds; return Math.max(0,Math.min(G.N-1,k)); }
function C(s){ var k=idx(s), i=Math.min(G.N-2,Math.floor(k)), f=k-i; return [G.X[i]*(1-f)+G.X[i+1]*f, G.Y[i]*(1-f)+G.Y[i+1]*f, G.A[i]*(1-f)+G.A[i+1]*f]; }
function at(s,u){ var c=C(s); return [c[0]+u*Math.cos(c[2]), c[1]-u*Math.sin(c[2])]; }
/* 逆変換 (x,y) → [s,u] （中心線の最近点） */
function toSU(x,y){ var best=1e18, bk=0; for(var k=0;k<G.N;k+=8){ var dx=x-G.X[k], dy=y-G.Y[k], d=dx*dx+dy*dy; if(d<best){ best=d; bk=k; } }
  var k0=Math.max(0,bk-10), k1=Math.min(G.N-1,bk+10); best=1e18; for(var k2=k0;k2<=k1;k2++){ var dx2=x-G.X[k2], dy2=y-G.Y[k2], d2=dx2*dx2+dy2*dy2; if(d2<best){ best=d2; bk=k2; } }
  var a=G.A[bk], dx3=x-G.X[bk], dy3=y-G.Y[bk]; return [G.s0+bk*G.ds+dx3*Math.sin(a)+dy3*Math.cos(a), dx3*Math.cos(a)-dy3*Math.sin(a)]; }
/* 連続量（s の関数）：椎体前後径の半分・脊柱管前後径 */
var SC=G.sc, Dh=function(s){ return lerp(SC,LV.map(function(l){return l[2]/2;}),s); }, CAN=function(s){ return lerp(SC,LV.map(function(l){return l[5];}),s); };
function discMid(j){ return SC[j]+LV[j][1]/2+LV[j][3]/2; }
/* (s,u) で定義した多角形を画像座標へ */
function suPoly(pts){ return pts.map(function(q){ return at(q[0],q[1]); }); }
function suBand(s0,s1,u0fn,u1fn,step){ step=step||2; var A=[], Bk=[]; for(var s=s0;s<=s1+1e-6;s+=step){ A.push(at(s,u0fn(s))); Bk.push(at(s,u1fn(s))); } return A.concat(Bk.reverse()); }
function suPg(L,s0,s1,u0fn,u1fn,step){ var o=[], len=20; for(var a=s0;a<s1-1e-6;a+=len){ var b=Math.min(s1,a+len+(step||2)); o.push(Pg(L,suBand(a,b,u0fn,u1fn,step))); } return o; }
/* 椎体の局所座標（剛体：中心 c、角度 a） */
function bodyFrame(i){ var c=C(SC[i]); return {x:c[0], y:c[1], a:c[2], H:LV[i][1], D:LV[i][2]}; }
function loc(f,u,v){ var ca=Math.cos(f.a), sa=Math.sin(f.a); return [f.x+u*ca+v*sa, f.y-u*sa+v*ca]; }
function inv(f,x,y){ var dx=x-f.x, dy=y-f.y, ca=Math.cos(f.a), sa=Math.sin(f.a); return [dx*ca-dy*sa, dx*sa+dy*ca]; }
/* 椎体の輪郭（角の丸い長方形、前面と終板はわずかに凹） */
function bodyPts(f,shrink,wedge){ var o=[], D=f.D/2-shrink, H=f.H/2-shrink, p=7; for(var k=0;k<48;k++){ var t=k/48*2*Math.PI, c=Math.cos(t), s=Math.sin(t);
  var u=D*Math.sign(c)*Math.pow(Math.abs(c),2/p), v=H*Math.sign(s)*Math.pow(Math.abs(s),2/p);
  if(u<0) u+=1.3*Math.max(0,1-Math.pow(v/H,2)); v-=Math.sign(v)*0.9*Math.max(0,1-Math.pow(u/D,2));
  if(wedge&&u<0) v*=1-wedge*(-u/D);
  o.push(loc(f,u,v)); } return o; }
function endplate(f,side,ext){ /* side=-1 上終板, +1 下終板。前→後の点列 */ var o=[], D=f.D/2; for(var k=0;k<=12;k++){ var u=-D-ext+(2*D+2*ext)*k/12, uu=Math.max(-D,Math.min(D,u));
  var v=side*(f.H/2-0.9*Math.max(0,1-Math.pow(uu/D,2))-ext*0.0); o.push(loc(f,u,v+side*(-1.2))); } return o; }

/* ---------- 形状 ---------- */
var LsS=function(s){ return lerp([SC[0],SC[2],SC[5],SC[6],SC[7]+12,SC[10]],[26,30,30,26,14,8],s); };
var SK=function(s){ return Dh(s)+CAN(s)+LsS(s)+lerp([SC[0],SC[4],SC[6],SC[7],SC[9],SC[10]],[18,22,22,26,26,22],s); }; /* 後方の皮膚までの u */ /* 後方の皮膚までの u */
var XA=function(y){ return -136+5*Math.exp(-Math.pow((y-10)/60,2))-6*Math.exp(-Math.pow((y-125)/30,2)); };  /* 前腹壁の皮膚の x */
function lspine(){
  var sh=[], rr=rng(5), sA=G.s0+2, sB=G.s1-2;
  /* 体の輪郭（後方の皮膚は中心線から、前方は腹壁） */
  var bk=[]; for(var s=sA;s<=sB;s+=3) bk.push(at(s,SK(s)));
  var sm=bk.map(function(q,i){ var x=0,y=0,n=0; for(var k=Math.max(0,i-5);k<=Math.min(bk.length-1,i+5);k++){ x+=bk[k][0]; y+=bk[k][1]; n++; } return [x/n,y/n]; });
  var XB=function(y){ if(y<=sm[0][1]) return sm[0][0]; for(var i=0;i<sm.length-1;i++){ if(y<=sm[i+1][1]){ var f=(y-sm[i][1])/(sm[i+1][1]-sm[i][1]); return sm[i][0]*(1-f)+sm[i+1][0]*f; } } return sm[sm.length-1][0]+(y-sm[sm.length-1][1])*0.25; };
  var tb=[]; for(var yy=-152;yy<=152;yy+=1) tb.push(XB(yy)); var XBt=function(y){ var k=Math.max(0,Math.min(tb.length-2,y+152)), i=Math.floor(k), f=k-i; return tb[i]*(1-f)+tb[i+1]*f; };
  sh.push(F('skin',[-150,-150,150,150],function(x,y){ return x>XA(y)&&x<XBt(y)?'skin':null; }));
  sh.push(F('fat',[-150,-150,150,150],function(x,y){ return x>XA(y)+2.5&&x<XBt(y)-2.5?'fat':null; }));
  /* 前腹壁：腹直筋（白線近傍の部分容積）と腹膜前脂肪 */
  var rect=[]; for(var y2=-160;y2<=150;y2+=5) rect.push([XA(y2)+14+2*Math.sin(y2/37),y2]); var rect2=rect.map(function(q){ return [q[0]+7-2*Math.exp(-Math.pow((q[1]-10)/25,2)),q[1]]; }).reverse();
  sh.push(Pg('muscle',rect.concat(rect2)));
  sh.push(PL('lig',rect2.map(function(q){ return [q[0]+1.2,q[1]]; }),0.5));
  /* 傍脊柱筋（棘突起間・後方の部分容積）と胸腰筋膜 */
  sh.push(suPg('muscle',sA,SC[9]+4,function(s){ return Dh(s)+CAN(s); },function(s){ return Dh(s)+CAN(s)+LsS(s)+3; },2));
  sh.push(PL('lig',(function(){ var o=[]; for(var s=sA;s<=SC[9];s+=4) o.push(at(s,Dh(s)+CAN(s)+LsS(s)+3.8)); return o; })(),0.6));
  /* 腹腔：肝左葉・胃・膵・横行結腸・小腸・S状結腸・膀胱 */
  sh.push(B('liver',-78,-158,[46,40,36,34,36,44,52,56,58,56,52,48],5));
  sh.push(F('vein',[-125,-200,-30,-110],function(x,y,c){ if(c!=='liver') return null; var d1=Math.abs((y+150)-0.35*(x+80)), d2=Math.hypot(x+95,y+128); return (d1<1.6&&x<-55&&x>-110)||d2<2.4?'vein':null; }));
  sh.push(B('gi_wall',-84,-104,[24,18,14,15,20,24,20,16,15,16],-15), B('gi_fluid',-84,-104,[20,14.5,10.5,11.5,16.5,20,16.5,12.5,11.5,12.5],-15));
  sh.push(F('air',[-110,-125,-60,-108],function(x,y,c){ return c==='gi_fluid'&&y<-113?'air':null; }));
  var sacr=function(s,u){ return at(s,-Dh(s)+u); };
  /* 大動脈（L4 で分岐）・腹腔動脈・SMA・左腎静脈・膵・十二指腸水平部 */
  var aoT=sA, aoB=SC[5]+2;
  sh.push(suPg('fat',aoT,aoB+6,function(s){ return -Dh(s)-26; },function(s){ return -Dh(s)-1.5; },2));
  sh.push(suPg('muscle',aoT,SC[2]+4,function(s){ return -Dh(s)-26; },function(s){ return -Dh(s)-22.5; },2));
  sh.push(suPg('artery',aoT,aoB,function(s){ return -Dh(s)-23-Math.max(0,s-(aoB-8))*0.4; },function(s){ return -Dh(s)-3.5; },2), E('artery',at(aoB,-Dh(aoB)-13)[0],at(aoB,-Dh(aoB)-13)[1],9,4.5,-C(aoB)[2]*180/Math.PI));
  sh.push(PL('artery',[at(SC[1]-4,-Dh(SC[1])-22),at(SC[1]-7,-Dh(SC[1])-32),at(SC[1]-10,-Dh(SC[1])-44)],3.2));
  var smaP=[at(SC[2]-6,-Dh(SC[2])-22),at(SC[2]-2,-Dh(SC[2])-30),at(SC[2]+12,-Dh(SC[2])-36),at(SC[3]+12,-Dh(SC[3])-40),at(SC[4]+6,-Dh(SC[4])-43)];
  sh.push(B('pancreas',at(SC[2]+4,-Dh(SC[2])-50)[0],at(SC[2]+4,-Dh(SC[2])-50)[1],[9,10,13,12,9,8,11,12],80));
  var spv=at(SC[2]+3,-Dh(SC[2])-41.5); sh.push(E('vein',spv[0],spv[1],3.2,3));
  sh.push(PL('artery',smaP,3.3));
  var lrv=at(SC[2]+13,-Dh(SC[2])-29); sh.push(E('vein',lrv[0],lrv[1],4.5,3.5));
  var d3=at(SC[4]-3,-Dh(SC[4])-31.5); sh.push(E('gi_wall',d3[0],d3[1],8,6.5,10), E('gi_fluid',d3[0],d3[1],5,3.5,10));
  /* 小腸ループ・横行結腸 */
  [[-100,-62,13,1],[-72,-48,11,0],[-108,-20,12,0],[-80,-4,13,0],[-108,22,12,1],[-70,30,11,0],[-96,58,13,0],[-64,70,10,0],[-104,92,12,0]].forEach(function(q,i){
    var R=[]; for(var k=0;k<10;k++) R.push(q[2]*(0.85+0.3*rr())); sh.push(B('gi_wall',q[0],q[1],R,rr()*90)); var R2=R.map(function(r){ return r-2-rr()*1.5; }); var inn=B('gi_fluid',q[0],q[1],R2,rr()*90); sh.push(inn);
    if(q[3]) sh.push(F('air',[q[0]-20,q[1]-20,q[0]+20,q[1]-q[2]*0.35],function(x,y,c){ return c==='gi_fluid'&&P.inside(inn,x,y)?'air':null; })); });
  [[-58,-20,1.6],[-88,10,1.4],[-55,48,1.5],[-82,40,1.2],[-60,88,1.3],[-90,-38,1.3]].forEach(function(v,i){ sh.push(E(i%2?'artery':'vein',v[0],v[1],v[2],v[2]*0.9)); });
  /* 左総腸骨静脈（L5 前面）、S状結腸・直腸（仙骨前面）、膀胱 */
  var lciv=at(SC[6]-4,-Dh(SC[6])-7); sh.push(E('vein',lciv[0],lciv[1],5,8,-C(SC[6])[2]*180/Math.PI));
  var rc=at(SC[9]+2,-Dh(SC[9])-17); sh.push(E('gi_wall',rc[0],rc[1],15,13,-30), E('gi_fluid',rc[0],rc[1],11,8,-30)); var sg=at(SC[8]-6,-Dh(SC[8])-38); sh.push(E('gi_wall',sg[0],sg[1],13,11,10), E('gi_fluid',sg[0],sg[1],9,6.5,10), E('air',sg[0],sg[1]-4,6,2.2,10));
  sh.push(B('gi_wall',-78,142,[34,30,24,22,24,30,34,36,30,32],0), B('urine',-78,142,[31,27,21,19,21,27,31,33,27,29],0));
  /* 前縦靱帯・椎体前の脂肪 */
  sh.push(suPg('lig',sA,SC[8],function(s){ return -Dh(s)-1.9; },function(s){ return -Dh(s)+1; },2));
  /* 脊柱管の中身：硬膜外脂肪（前方は静脈叢）→硬膜→髄液 */
  var sacEnd=SC[8]+2;
  var fatP=function(s){ var b=0; for(var j=1;j<=5;j++){ var m=discMid(j)-3; b=Math.max(b,Math.exp(-Math.pow((s-m)/5,2))); } return 1.6+3.2*b*(s>SC[2]?1:0.5); };
  var sacA=function(s){ return Dh(s)+2.4; }, sacP=function(s){ var t=Math.max(0,Math.min(1,(sacEnd-s)/16)); var full=Dh(s)+CAN(s)-fatP(s); return sacA(s)+(full-sacA(s))*Math.sqrt(t); };
  sh.push(suPg('fat',sA,SC[10]+4,function(s){ return Dh(s)+0.8; },function(s){ return Dh(s)+CAN(s)+0.3; },2));
  sh.push(suPg('dura',sA,sacEnd,function(s){ return sacA(s)-0.5; },function(s){ return sacP(s)+0.5; },1.5));
  sh.push(suPg('csf',sA,sacEnd-0.5,sacA,sacP,1.5));
  /* 脊髄円錐（L1 下部で終わる）・終糸・馬尾 */
  var tip=SC[2]+11, cm=function(s){ return (sacA(s)+sacP(s))/2+0.8; };
  var cr=function(s){ var a=SC[2]-3; if(s<a-14) return 4.0; if(s<a) return 4.0+0.5*Math.sin((s-a+14)/14*Math.PI); return Math.max(0,4.0*(1-Math.pow((s-a)/(tip-a),1.4))); };
  sh.push(suPg('cord',sA,tip,function(s){ return cm(s)-cr(s); },function(s){ return cm(s)+cr(s); },1));
  sh.push(suPg('cauda',tip-2,sacEnd+18,function(s){ return cm(s)-0.45; },function(s){ return cm(s)+0.45; },2));
  for(var j=0;j<5;j++){ (function(j){ var end=SC[3+j]+6, off=0.12+0.13*j;
    sh.push(suPg('cauda',tip-6,Math.min(end,sacEnd-2),function(s){ var t=Math.min(1,(s-tip+6)/24); return cm(s)+(sacP(s)-cm(s))*off*1.6*t+(j%2?0.3:-0.3)-0.55; },function(s){ var t=Math.min(1,(s-tip+6)/24); return cm(s)+(sacP(s)-cm(s))*off*1.6*t+(j%2?0.3:-0.3)+0.55; },2)); })(j); }
  /* 前方の硬膜外静脈叢・椎体静脈 */
  for(var i=1;i<=6;i++){ var pv=at(SC[i],Dh(SC[i])+1.6); sh.push(E('vein',pv[0],pv[1],1.2,4.5,-C(SC[i])[2]*180/Math.PI)); }
  /* 椎間板（線維輪→髄核、髄核内の横走する裂隙）。L5/S1 は変性で低信号・低い */
  for(var jd=0;jd<LV.length-1;jd++){ var fu=bodyFrame(jd), fl=bodyFrame(jd+1); var e1=endplate(fu,1,0), e2=endplate(fl,-1,0).reverse();
    var am=at(discMid(jd),-Dh(discMid(jd))-(jd>=4&&jd<=5?2.2:1.3)), pm=at(discMid(jd),Dh(discMid(jd))+(jd>=3&&jd<=5?1.6:1.0));
    var dp=e1.concat([pm]).concat(e2).concat([am]); sh.push(Pg('disc_af',dp));
    if(jd<7){ var dm=at(discMid(jd),2), aa=-C(discMid(jd))[2]*180/Math.PI, hh=LV[jd][3]; var dg=(jd===6);
      sh.push(E(dg?'disc_dg':'disc_n',dm[0],dm[1],(fu.D+fl.D)/4*(dg?0.45:0.64),hh*(dg?0.3:0.44),aa));
      if(!dg&&jd>=2) sh.push(S('disc_af',at(discMid(jd),-5)[0],at(discMid(jd),-5)[1],at(discMid(jd),8)[0],at(discMid(jd),8)[1],0.3)); } }
  /* 椎体（皮質・終板・椎体骨髄・椎体静脈） */
  for(var ib=0;ib<LV.length;ib++){ var f=bodyFrame(ib), wd=(ib===6?0.06:0); var op=bodyPts(f,0,wd), ip=bodyPts(f,1.3,wd);
    sh.push(Pg('bone',op), Pg('marrow_v',ip));
    if(ib<7){ var b1=loc(f,f.D/2-0.5,0), b2=loc(f,f.D/2-9,0); sh.push(S('vein',b1[0],b1[1],b2[0],b2[1],0.9)); } }
  /* 後縦靱帯 */
  sh.push(suPg('lig',sA,SC[8],function(s){ return Dh(s)+0.1; },function(s){ return Dh(s)+1.2; },2));
  /* 黄色靱帯（椎弓間）→ 椎弓・棘突起（皮質＋骨髄）→ 棘間靱帯・棘上靱帯 */
  var cp=function(s){ return Dh(s)+CAN(s); };
  for(var il=0;il<7;il++){ var lb=SC[il]+LV[il][1]/2+1, lt=SC[il+1]-LV[il+1][1]/2+(il===6?4:7);
    sh.push(Pg('lig',suPoly([[lb-4,cp(lb-4)-0.3],[lt+3,cp(lt+3)-0.3],[lt+3,cp(lt+3)+4],[lb-4,cp(lb-4)+4.5]]))); }
  var tips=[];
  for(var ip2=0;ip2<7;ip2++){ var l=LV[ip2], f=bodyFrame(ip2), H=l[1]/2, uc=l[2]/2+l[5], Ls=l[6], sl=l[7];
    var lp=[[uc-0.6,-H+6],[uc+6,-H+4.5],[uc+Ls*0.6,-H+6+sl*0.5],[uc+Ls-3,-H+8+sl],[uc+Ls+0.6,-H+11+sl],[uc+Ls+0.6,H-4+sl],[uc+Ls-3,H-2+sl],[uc+Ls*0.55,H+sl*0.5],[uc+7,H+2],[uc-0.6,H+3.5]];
    if(ip2===6){ lp=lp.map(function(q){ return [q[0],q[1]-(q[0]>uc+4?2:0)]; }); }
    var pts=lp.map(function(q){ return loc(f,q[0],q[1]); }); tips.push({f:f,uc:uc,Ls:Ls,sl:sl,H:H});
    sh.push(Pg('bone',pts), F('marrow_v',bb(pts),(function(pts){ return function(x,y){ return inPoly(x,y,pts)&&polyD(x,y,pts)>1.4?'marrow_v':null; }; })(pts))); }
  for(var it=0;it<6;it++){ var A=tips[it], Bn=tips[it+1];
    var m1=loc(A.f,A.uc+6,A.H+3), m2=loc(Bn.f,Bn.uc+6,-Bn.H+4.5), t1=loc(A.f,A.uc+A.Ls-1,A.H-3+A.sl), t2=loc(Bn.f,Bn.uc+Bn.Ls-1,-Bn.H+9+Bn.sl);
    sh.push(S('lig',(m1[0]+m2[0])/2,(m1[1]+m2[1])/2,(t1[0]+t2[0])/2,(t1[1]+t2[1])/2,1.0)); }
  var ssl=[]; tips.forEach(function(T){ ssl.push(loc(T.f,T.uc+T.Ls+1.6,-T.H+11+T.sl)); ssl.push(loc(T.f,T.uc+T.Ls+1.6,T.H-4+T.sl)); });
  sh.push(PL('lig',ssl,1.0));
  /* 仙骨の後壁（癒合した椎弓）と正中仙骨稜 */
  sh.push(suPg('bone',SC[7]-LV[7][1]/2+4,SC[10]+6,function(s){ return cp(s)+0.3; },function(s){ return cp(s)+4.5+2.5*Math.max(0,Math.sin((s-SC[7])/9)); },2));
  sh.push(suPg('marrow_v',SC[7]-LV[7][1]/2+6,SC[10]+4,function(s){ return cp(s)+1.6; },function(s){ return cp(s)+3.2+2.5*Math.max(0,Math.sin((s-SC[7])/9)); },2));
  return M(sh);
}
function lspineLes(){
  var j=5, sd=discMid(j), fu=bodyFrame(5), fl=bodyFrame(6), fx=bodyFrame(2), f2=bodyFrame(3);
  var c=at(sd,Dh(sd)+3), bbH=[c[0]-16,c[1]-16,c[0]+16,c[1]+16];
  var dome=function(s,u){ return (u-Dh(sd))/6.5+Math.pow((s-sd-1.5)/6.5,2); };
  return [
  {id:'hernia', n:'椎間板ヘルニア（L4/5、後方脱出）', shapes:[
    F('disc_hern',bbH,function(x,y,cur){ var q=toSU(x,y); if(q[1]<Dh(sd)-1.5) return null; return dome(q[0],q[1])<1?'disc_hern':null; }),
    F('lig',bbH,function(x,y,cur){ var q=toSU(x,y); if(q[1]<Dh(sd)) return null; var d=dome(q[0],q[1]); return d>=1&&d<1.18?'lig':null; }),
    F('disc_n',bbH,function(x,y,cur){ var q=toSU(x,y); return Math.abs(q[0]-sd-0.5)<1.1&&q[1]>3&&q[1]<Dh(sd)+0.5?'disc_n':null; }) ]},
  {id:'met', n:'椎体転移（L2）', shapes:[ (function(){ var m=loc(f2,4,2); return F('met_rim',[m[0]-14,m[1]-14,m[0]+14,m[1]+14],function(x,y,cur){ if(!(cur==='marrow_v'||cur==='vein')) return null; var r=Math.hypot(x-m[0],y-m[1]); return r<9.5+1.2*Math.sin(Math.atan2(y-m[1],x-m[0])*3)?'met_rim':null; }); })() ]},
  {id:'fx', n:'圧迫骨折（L1、骨髄浮腫）', shapes:(function(){ var b=[fx.x-25,fx.y-25,fx.x+25,fx.y+25], H=fx.H/2, D=fx.D/2, dep=function(u){ return 1.5+4.5*(0.5-u/(2*D))+1.2*Math.max(0,1-Math.pow(u/D,2)); };
    return [ F('disc_af',b,function(x,y,cur){ if(!(cur==='marrow_v'||cur==='bone'||cur==='vein')) return null; var q=inv(fx,x,y); return q[1]<-H+dep(q[0])&&Math.abs(q[0])<D?'disc_af':null; }),
      F('bone',b,function(x,y,cur){ if(!(cur==='marrow_v'||cur==='vein')) return null; var q=inv(fx,x,y); var e=-H+dep(q[0]); return q[1]>=e&&q[1]<e+1.4?'bone':null; }),
      F('bme',b,function(x,y,cur){ if(!(cur==='marrow_v'||cur==='vein')) return null; var q=inv(fx,x,y); return q[1]<-H+dep(q[0])+15+2*Math.sin(q[0]*0.4)?'bme':null; }),
      F('bone',b,function(x,y,cur){ if(cur!=='bme') return null; var q=inv(fx,x,y); return Math.abs(q[1]-(-H+dep(q[0])+6.5+0.8*Math.sin(q[0]*0.5)))<0.6&&Math.abs(q[0])<D-3?'bone':null; }) ]; })()},
  {id:'modic', n:'Modic 1型変化（L5/S1 終板）', shapes:(function(){ var b=[fl.x-30,fl.y-10,fl.x+40,fl.y+60]; var fs=bodyFrame(7);
    return [ F('modic1',b,function(x,y,cur){ if(cur!=='marrow_v') return null; var q=inv(fl,x,y); if(q[1]>fl.H/2-6.5-2*Math.sin(q[0]*0.35+1)&&q[1]<fl.H/2+2&&Math.abs(q[0])<fl.D/2) return 'modic1';
      var r=inv(fs,x,y); if(r[1]<-fs.H/2+7+2*Math.sin(r[0]*0.3)&&r[1]>-fs.H/2-2&&Math.abs(r[0])<fs.D/2) return 'modic1'; return null; }) ]; })()}
]; }
var cL3=at(SC[4],SK(SC[4]));
MS.PHANTOMS.lspine = {n:'腰椎（正中矢状断）', P:300, plane:'sag', coil:'spine', coilG:0.8, coilC:[Math.round(cL3[0]-4),0], fov:280, pe:'AP', shapes:lspine, les:lspineLes,
  motion:{resp:1, card:0, wfn:function(x,y,k){ if(/bone|marrow|csf|cord|cauda|disc|lig|dura/.test(k)) return 0; return Math.max(0,Math.min(1,(-38-x)/60))*(y<40?1:0.6); }},
  pulsatile:true, region:'spine', def:{fov:280,pfov:100,nx:384,ny:288,thk:4,nsl:13}, ab:['disc_n','marrow_v'], musDir:'vert'};
})();
