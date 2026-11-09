/* ===== 仮想ファントム（解析的な図形を 1024² のラベルマップに描く） ===== */
(function(){
var MS = window.MS;
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
/* 図形 */
function E(L,cx,cy,rx,ry,a,w,f,p){ return {t:'e',L:L,c:[cx,cy],r:[rx,ry],a:(a||0)*Math.PI/180,w:w||0,f:f||0,p:p||0}; }
function Pg(L,pts){ return {t:'p',L:L,pts:pts}; }
function S(L,x1,y1,x2,y2,r){ return {t:'s',L:L,a:[x1,y1],b:[x2,y2],r:r}; }
function PL(L,pts,r){ var o=[]; for(var i=0;i<pts.length-1;i++) o.push(S(L,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],r)); return o; }
function B(L,cx,cy,R,a){ return {t:'b',L:L,c:[cx,cy],R:R,a:(a||0)*Math.PI/180}; }
function F(L,bb,fn){ return {t:'f',L:L,bb:bb,fn:fn}; }   /* fn(x,y,cur) -> key | null */
function M(list){ var o=[]; (function f(a){ a.forEach(function(s){ if(Array.isArray(s)) f(s); else if(s) o.push(s); }); })(list); return o; }
function mir(fn){ return [fn(-1),fn(1)]; }   /* 左右対称の組 */
function bbox(s){
  if(s.t==='e'){ var m=Math.max(s.r[0],s.r[1])*(1+Math.abs(s.w)); return [s.c[0]-m,s.c[1]-m,s.c[0]+m,s.c[1]+m]; }
  if(s.t==='b'){ var m2=Math.max.apply(null,s.R)*1.15; return [s.c[0]-m2,s.c[1]-m2,s.c[0]+m2,s.c[1]+m2]; }
  if(s.t==='s'){ return [Math.min(s.a[0],s.b[0])-s.r,Math.min(s.a[1],s.b[1])-s.r,Math.max(s.a[0],s.b[0])+s.r,Math.max(s.a[1],s.b[1])+s.r]; }
  if(s.t==='p'){ var xs=s.pts.map(function(q){return q[0];}), ys=s.pts.map(function(q){return q[1];}); return [Math.min.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,xs),Math.max.apply(null,ys)]; }
  return s.bb;
}
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function inside(s,x,y){
  if(s.t==='e'){ var dx=x-s.c[0],dy=y-s.c[1],ca=Math.cos(s.a),sa=Math.sin(s.a); var u=dx*ca+dy*sa, v=-dx*sa+dy*ca;
    var q=(u*u)/(s.r[0]*s.r[0])+(v*v)/(s.r[1]*s.r[1]); if(!s.w) return q<=1; var th=Math.atan2(v/s.r[1],u/s.r[0]); var k=1+s.w*Math.sin(s.f*th+s.p); return q<=k*k; }
  if(s.t==='b'){ var dx2=x-s.c[0],dy2=y-s.c[1]; var th2=Math.atan2(dy2,dx2)-s.a; var n=s.R.length; var tt=((th2/(2*Math.PI))%1+1)%1*n; var i=Math.floor(tt), fr=tt-i;
    var r=cr(s.R[(i-1+n)%n],s.R[i%n],s.R[(i+1)%n],s.R[(i+2)%n],fr); return dx2*dx2+dy2*dy2<=r*r; }
  if(s.t==='s'){ var ax=s.b[0]-s.a[0], ay=s.b[1]-s.a[1]; var L2=ax*ax+ay*ay; var t=L2?((x-s.a[0])*ax+(y-s.a[1])*ay)/L2:0; t=Math.max(0,Math.min(1,t)); var px=s.a[0]+t*ax-x, py=s.a[1]+t*ay-y; return px*px+py*py<=s.r*s.r; }
  if(s.t==='p'){ var c=false, P=s.pts; for(var a=0,b=P.length-1;a<P.length;b=a++){ if(((P[a][1]>y)!==(P[b][1]>y)) && (x<(P[b][0]-P[a][0])*(y-P[a][1])/(P[b][1]-P[a][1])+P[a][0])) c=!c; } return c; }
  return false;
}
function paint(lab, keys, idx, N, P, shapes){
  var px=P/N;
  shapes.forEach(function(s){
    var b=bbox(s); var i0=Math.max(0,Math.floor((b[0]+P/2)/px)), i1=Math.min(N-1,Math.ceil((b[2]+P/2)/px));
    var j0=Math.max(0,Math.floor((b[1]+P/2)/px)), j1=Math.min(N-1,Math.ceil((b[3]+P/2)/px));
    for(var j=j0;j<=j1;j++){ var y=(j+0.5)*px-P/2; for(var i=i0;i<=i1;i++){ var x=(i+0.5)*px-P/2; var o=j*N+i;
      if(s.t==='f'){ var r=s.fn(x,y,keys[lab[o]]); if(r) lab[o]=idx(r); }
      else if(inside(s,x,y)) lab[o]=idx(s.L); } }
  });
}
function ribs(rx,ry,cy,angles,sz){ var o=[]; angles.forEach(function(d){ var a=d*Math.PI/180; var x=rx*Math.cos(a), y=cy+ry*Math.sin(a); var rot=d+90;
  o.push(E('bone',x,y,sz[0],sz[1],rot)); o.push(E('marrow_r',x,y,sz[0]-1.6,sz[1]-1.6,rot)); }); return o; }
function spine(cy, bodyR, canal){ return M([
  Pg('bone',[[-15,cy+bodyR[1]-3],[15,cy+bodyR[1]-3],[24,cy+bodyR[1]+22],[0,cy+bodyR[1]+33],[-24,cy+bodyR[1]+22]]),
  E('marrow_v',0,cy+bodyR[1]+22,12,6),
  E('bone',0,cy,bodyR[0],bodyR[1]), E('marrow_v',0,cy,bodyR[0]-1.8,bodyR[1]-1.8),
  E('csf',0,cy+bodyR[1]+9,canal[0],canal[1]), canal[2]?E(canal[2],0,cy+bodyR[1]+9,canal[0]*0.55,canal[1]*0.55):[] ]); }


MS.PH={rng:rng,E:E,Pg:Pg,S:S,PL:PL,B:B,F:F,M:M,mir:mir,ribs:ribs,spine:spine,inside:inside};
MS.PHANTOMS=MS.PHANTOMS||{};
/* 部位の並び順と分類（画面のボタン用） */
MS.PH_GROUPS=[['頭部',['head','headPF','headSag']],['胸部・乳房',['chest','breast']],['腹部',['abdomen','abdRenal']],['骨盤',['pelvisF','pelvisM']],['脊椎・骨軟部',['lspine','shoulder','knee']]];
/* 組織の追加（各ファントムのファイルから） */
/* 組織ごとの質感の強さ：f=細粒, c=粗い, d=線維方向, ffv=脂肪分率のむら（骨髄など） */
MS.TEX={liver:{f:.045,c:.03},spleen:{f:.04,c:.03},pancreas:{f:.07,c:.06},kidney_c:{f:.04},kidney_m:{f:.04},muscle:{f:.02,c:.02,d:.07},myo:{f:.03,d:.04},
  marrow_r:{f:.07,c:.04,ffv:.25},marrow_v:{f:.07,c:.04,ffv:.22},marrow_y:{f:.045,c:.025,ffv:.1},fat:{f:.015,c:.02},wm:{f:.012,c:.02},gm:{f:.015,c:.015},gm_deep:{f:.02,c:.03},gp:{f:.02,c:.03},
  fgt:{c:.18,f:.06},tz:{c:.13,f:.05},pz:{f:.05,c:.03},myometrium:{f:.03,c:.03},jz:{f:.02},endometrium:{f:.03},ovary:{f:.05,c:.05},lung:{f:.28,c:.22},vessel_l:{f:.05},gi_wall:{f:.04},esoph:{f:.03},
  cartilage:{f:.02},meniscus:{f:.03},tendon:{f:.05,d:.05},lig:{f:.03,d:.08},skin:{f:.04},cord:{f:.015},adrenal:{f:.04},
  tumor_rim:{f:.08,c:.1},necrosis:{f:.04,c:.05},edema:{f:.02,c:.04},hcc:{c:.12,f:.05},met_rim:{f:.05,c:.05},fibroid:{c:.08,d:.07},bme:{f:.1,c:.08,ffv:.2},meningioma:{f:.05,c:.05},nodule:{f:.06},pca:{f:.05},bph:{c:.1,f:.05},hem:{f:.06,c:.08},endometrioma:{c:.12}};
MS.TEX_NONE={csf:1,fluid:1,urine:1,bile:1,gi_fluid:1,cyst:1,air:1,artery:1,vein:1,portal:1,blood_c:1,metal:1};
MS.texOf=function(k){ var t=MS.TISSUES[k]; if(t&&t.tx) return t.tx; if(MS.TEX_NONE[k]) return null; return MS.TEX[k]||{f:.015,c:.015}; };
MS.addTissues=function(o){ for(var k in o){ if(MS.TISSUES[k]) continue; MS.TISSUES[k]=o[k]; } };

/* ラベルマップの生成 */
MS.buildPhantom = function(id, lesOn, opts, hemStage){
  var ph=MS.PHANTOMS[id], N=1024, P=ph.P;
  var keys=['air'], map={air:0}; function idx(k){ if(map[k]===undefined){ map[k]=keys.length; keys.push(k); } return map[k]; }
  var lab=new Uint8Array(N*N);
  paint(lab,keys,idx,N,P,M(ph.shapes(opts||{})));
  ph.les(opts||{}).forEach(function(L){ if(lesOn[L.id]){ var sh=L.dyn?L.dyn(hemStage||'acute',opts||{}):L.shapes; paint(lab,keys,idx,N,P,M(sh)); } });
  /* 磁化率 → 磁場（ppm）: 256² で差分ガウシアン近似 */
  var n=256, f=N/n, chi=new Float32Array(n*n);
  var met=[]; var px=P/n;
  for(var j=0;j<n;j++) for(var i=0;i<n;i++){ var s=0, sm=0; for(var b=0;b<f;b+=2) for(var a=0;a<f;a+=2){ var t=MS.TISSUES[keys[lab[(j*f+b)*N+i*f+a]]]; var c=(t.chi||0); if(c>50) sm+=c; else s+=c; } chi[j*n+i]=s/((f/2)*(f/2)); if(sm>0) met.push([i,j,sm/((f/2)*(f/2))*0.2]); }
  var g1=blur(chi,n,1.6*n/P*1), g2=blur(chi,n,5*n/P*1);
  var fld=new Float32Array(n*n); for(var q=0;q<n*n;q++) fld[q]=0.12*(g1[q]-g2[q]);
  /* 金属: 双極子場の和（矢状断は B0 が上下方向、軸位は面に垂直） */
  if(met.length){ var sag=ph.plane!=='ax', dV=px*px*5; for(var jj=0;jj<n;jj++) for(var ii=0;ii<n;ii++){ var acc=0; for(var m=0;m<met.length;m++){ var dx=(ii-met[m][0])*px, dy=(jj-met[m][1])*px; var r2=dx*dx+dy*dy; if(r2<px*px*0.25) r2=px*px*0.25; var r=Math.sqrt(r2); var ang=sag?(3*dy*dy/r2-1):-1; acc+=met[m][2]*dV*ang/(4*Math.PI*r2*r); } fld[jj*n+ii]+=acc; } }
  /* 質感：細粒（t1）・粗い（t2）・線維方向（t3）の3つの場。いずれも平均0・標準偏差1 */
  var tn=512, tpx=P/tn; function noiseField(seed,sig){ var r=rng(seed), a=new Float32Array(tn*tn); for(var q=0;q<tn*tn;q++) a[q]=r()-0.5; var b=blur(a,tn,sig); var m=0,v=0; for(var q2=0;q2<tn*tn;q2++){ m+=b[q2]; } m/=tn*tn; for(var q3=0;q3<tn*tn;q3++){ b[q3]-=m; v+=b[q3]*b[q3]; } v=Math.sqrt(v/(tn*tn))||1; for(var q4=0;q4<tn*tn;q4++) b[q4]/=v; return b; }
  var t1=noiseField(99,0.7*512/P*1.0+0.4), t2=noiseField(7,Math.max(2,4.5*tn/P)), t3=new Float32Array(tn*tn), wob=noiseField(31,Math.max(2,6*tn/P));
  var md=ph.musDir||(ph.plane==='ax'?'tan':'vert');
  for(var jj=0;jj<tn;jj++) for(var ii=0;ii<tn;ii++){ var xx=(ii+0.5)*tpx-P/2, yy=(jj+0.5)*tpx-P/2; var proj; if(md==='vert') proj=xx; else if(md==='horz') proj=yy; else proj=Math.hypot(xx,yy); t3[jj*tn+ii]=1.41*Math.sin(2*Math.PI*proj/2.6+1.6*wob[jj*tn+ii]); }
  return {id:id, N:N, P:P, lab:lab, keys:keys, field:fld, fn:n, ph:ph, t1:t1, t2:t2, t3:t3, tn:tn};
};
function blur(src,n,sig){ var r=Math.max(1,Math.ceil(sig*3)), k=[], s=0; for(var i=-r;i<=r;i++){ var v=Math.exp(-i*i/(2*sig*sig)); k.push(v); s+=v; } k=k.map(function(v){return v/s;});
  var tmp=new Float32Array(n*n), out=new Float32Array(n*n);
  for(var y=0;y<n;y++) for(var x=0;x<n;x++){ var a=0; for(var t=-r;t<=r;t++){ var xx=Math.min(n-1,Math.max(0,x+t)); a+=src[y*n+xx]*k[t+r]; } tmp[y*n+x]=a; }
  for(var y2=0;y2<n;y2++) for(var x2=0;x2<n;x2++){ var a2=0; for(var t2=-r;t2<=r;t2++){ var yy=Math.min(n-1,Math.max(0,y2+t2)); a2+=tmp[yy*n+x2]*k[t2+r]; } out[y2*n+x2]=a2; }
  return out; }
MS.blur=blur;
})();
