(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir;
/*KIT>*//* ===== 脳の描画キット（頭部の各ファントムで共有。同じ実装を各ファイルに置き、最初に読まれたものを使う） ===== */
MS.PH_BK = MS.PH_BK || (function(){
  /* 閉曲線の Catmull-Rom 平滑化（制御点 → 多角形の点列） */
  function cr(a,b,c,d,t){ var t2=t*t,t3=t2*t; return 0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3); }
  function smooth(pts,k,open){ k=k||6; var n=pts.length, o=[]; var m=open?n-1:n;
    for(var i=0;i<m;i++){ var p0=pts[open?Math.max(0,i-1):(i-1+n)%n], p1=pts[i], p2=pts[open?Math.min(n-1,i+1):(i+1)%n], p3=pts[open?Math.min(n-1,i+2):(i+2)%n];
      for(var j=0;j<k;j++){ var t=j/k; o.push([cr(p0[0],p1[0],p2[0],p3[0],t),cr(p0[1],p1[1],p2[1],p3[1],t)]); } }
    if(open) o.push(pts[n-1]); return o; }
  function SP(L,pts,k){ return P.Pg(L,smooth(pts,k||6)); }            /* 滑らかな多角形 */
  function SL(L,pts,r,k){ return P.PL(L,smooth(pts,k||4,true),r); }   /* 滑らかな折れ線 */
  /* 平滑化した閉曲線を法線方向に d mm ずらす（d>0 で外へ） */
  function offs(pts,d,k){ var q=smooth(pts,k||6), n=q.length, ar=0; for(var i=0;i<n;i++){ var a=q[i], b=q[(i+1)%n]; ar+=a[0]*b[1]-b[0]*a[1]; } var sg=ar>0?1:-1;
    return q.map(function(p,i){ var a=q[(i-1+n)%n], b=q[(i+1)%n], tx=b[0]-a[0], ty=b[1]-a[1], l=Math.hypot(tx,ty)||1; return [p[0]+sg*ty/l*d, p[1]-sg*tx/l*d]; }); }
  function OP(L,pts,d,k){ return P.Pg(L,offs(pts,d,k)); }
  /* 星形の閉曲線を極座標の B 図形に変換（大きな輪郭は多角形より速い） */
  function toB(L,pts,cx,cy,n,pre){ n=n||96; var q=pre?pts:smooth(pts,6), R=[]; for(var i=0;i<n;i++){ var t=2*Math.PI*i/n, dx=Math.cos(t), dy=Math.sin(t), best=0;
      for(var j=0;j<q.length;j++){ var a=q[j], b=q[(j+1)%q.length]; var ex=b[0]-a[0], ey=b[1]-a[1], den=dx*ey-dy*ex; if(Math.abs(den)<1e-12) continue;
        var ax=a[0]-cx, ay=a[1]-cy, tt=(ax*ey-ay*ex)/den, u=(ax*dy-ay*dx)/den; if(tt>0&&u>=0&&u<=1&&tt>best) best=tt; } R.push(best); }
    return P.B(L,cx,cy,R,0); }
  /* 多角形の内外判定を行ごとの交点表で速くする（返り値 fn(x,y) → true/false） */
  function rowPoly(pts,h){ h=h||0.1; var ys=pts.map(function(p){return p[1];}), y0=Math.min.apply(null,ys), y1=Math.max.apply(null,ys), n=Math.ceil((y1-y0)/h)+1, rows=new Array(n);
    for(var i=0;i<n;i++){ var y=y0+(i+0.5)*h, c=[]; for(var j=0;j<pts.length;j++){ var p1=pts[j], p2=pts[(j+1)%pts.length]; if((p1[1]>y)!==(p2[1]>y)) c.push(p1[0]+(y-p1[1])*(p2[0]-p1[0])/(p2[1]-p1[1])); } c.sort(function(a,b){return a-b;}); rows[i]=c; }
    return function(x,y){ var i=Math.floor((y-y0)/h); if(i<0||i>=n) return false; var c=rows[i], k=0; while(k<c.length&&c[k]<x) k++; return (k&1)===1; }; }
  function mx(s,pts){ return pts.map(function(q){ return [s*q[0],q[1]]; }); }  /* x を左右反転 */
  /* 極座標関数 R(θ) を B 図形に（θ=0 が +x、+y 方向へ回る） */
  function polar(L,cx,cy,Rf,n){ n=n||48; var R=[]; for(var i=0;i<n;i++) R.push(Rf(2*Math.PI*i/n)); return P.B(L,cx,cy,R,0); }
  /* 皮質の格子：mask 内で、src（脳表外・脳溝・裂）からの距離が thick 未満を灰白質、その奥を白質にする */
  function cortex(o){
    var h=o.h||0.25, x0=o.bb[0], y0=o.bb[1], nx=Math.ceil((o.bb[2]-x0)/h), ny=Math.ceil((o.bb[3]-y0)/h), N=nx*ny;
    var msk=new Uint8Array(N), src=new Uint8Array(N), d=new Float32Array(N), i, j, q;
    for(j=0;j<ny;j++) for(i=0;i<nx;i++){ q=j*nx+i; var x=x0+(i+0.5)*h, y=y0+(j+0.5)*h; var m=o.mask(x,y); msk[q]=m?1:0; if(!m) src[q]=2; else if(o.src&&o.src(x,y)) src[q]=1; }
    (o.sulci||[]).forEach(function(sc){ var p=sc.p, n=p.length; for(var k=0;k<n-1;k++){ var a=p[k], b=p[k+1], wa=sc.w0+(sc.w1-sc.w0)*k/(n-1), wb=sc.w0+(sc.w1-sc.w0)*(k+1)/(n-1), w=Math.max(wa,wb);
      var i0=Math.max(0,Math.floor((Math.min(a[0],b[0])-w-x0)/h)), i1=Math.min(nx-1,Math.ceil((Math.max(a[0],b[0])+w-x0)/h)), j0=Math.max(0,Math.floor((Math.min(a[1],b[1])-w-y0)/h)), j1=Math.min(ny-1,Math.ceil((Math.max(a[1],b[1])+w-y0)/h));
      if(sc.ws){ wa=sc.ws[k]; wb=sc.ws[k+1]; w=Math.max(wa,wb); } var ax=b[0]-a[0], ay=b[1]-a[1], L2=ax*ax+ay*ay||1e-9;
      for(var jj=j0;jj<=j1;jj++) for(var ii=i0;ii<=i1;ii++){ var qq=jj*nx+ii; if(!msk[qq]) continue; var X=x0+(ii+0.5)*h, Y=y0+(jj+0.5)*h; var t=((X-a[0])*ax+(Y-a[1])*ay)/L2; t=t<0?0:t>1?1:t; var px=a[0]+t*ax-X, py=a[1]+t*ay-Y; var wt=wa+(wb-wa)*t; if(px*px+py*py<=wt*wt) src[qq]=1; } } });
    var INF=1e9, dg=h*Math.SQRT2; for(q=0;q<N;q++) d[q]=src[q]?0:INF;
    for(j=0;j<ny;j++) for(i=0;i<nx;i++){ q=j*nx+i; if(!d[q]) continue; var v=d[q];
      if(i>0&&d[q-1]+h<v) v=d[q-1]+h; if(j>0){ if(d[q-nx]+h<v) v=d[q-nx]+h; if(i>0&&d[q-nx-1]+dg<v) v=d[q-nx-1]+dg; if(i<nx-1&&d[q-nx+1]+dg<v) v=d[q-nx+1]+dg; } d[q]=v; }
    for(j=ny-1;j>=0;j--) for(i=nx-1;i>=0;i--){ q=j*nx+i; if(!d[q]) continue; var v2=d[q];
      if(i<nx-1&&d[q+1]+h<v2) v2=d[q+1]+h; if(j<ny-1){ if(d[q+nx]+h<v2) v2=d[q+nx]+h; if(i<nx-1&&d[q+nx+1]+dg<v2) v2=d[q+nx+1]+dg; if(i>0&&d[q+nx-1]+dg<v2) v2=d[q+nx-1]+dg; } d[q]=v2; }
    var lab=new Uint8Array(N), K=o.keys||['csf','gm','wm'];
    for(j=0;j<ny;j++) for(i=0;i<nx;i++){ q=j*nx+i; if(!msk[q]) continue; if(src[q]===1){ lab[q]=1; continue; } var X2=x0+(i+0.5)*h, Y2=y0+(j+0.5)*h; lab[q]=d[q]<(o.thick?o.thick(X2,Y2):2.7)?2:3; }
    var fn=function(x,y){ var ii=Math.floor((x-x0)/h), jj=Math.floor((y-y0)/h); if(ii<0||jj<0||ii>=nx||jj>=ny) return null; var l=lab[jj*nx+ii]; return l?K[l-1]:null; };
    fn.d=function(x,y){ var ii=Math.floor((x-x0)/h), jj=Math.floor((y-y0)/h); if(ii<0||jj<0||ii>=nx||jj>=ny||!msk[jj*nx+ii]) return -1; return src[jj*nx+ii]?0:d[jj*nx+ii]; };
    return fn;
  }
  /* 脳溝を表面から内側へ「育てる」：蛇行・分岐し、他の脳溝や禁止域の手前で止まる */
  function grow(seeds,o){ var r=rng(o.seed||1), out=[], occ={}, cs=1.0;
    function key(x,y){ return Math.floor(x/cs)+','+Math.floor(y/cs); }
    function hit(x,y,id,rad){ var cx=Math.floor(x/cs), cy=Math.floor(y/cs), R=Math.ceil(rad/cs); for(var a=-R;a<=R;a++) for(var b=-R;b<=R;b++){ var v=occ[(cx+a)+','+(cy+b)]; if(v!==undefined&&v!==id&&Math.hypot(a,b)*cs<=rad) return true; } return false; }
    function mark(p,id){ p.forEach(function(q){ occ[key(q[0],q[1])]=id; }); }
    (o.fixed||[]).forEach(function(f,k){ var pp=smooth(f.p,4,true); mark(pp,'f'+k); out.push({p:pp,w0:f.w0,w1:f.w1}); });
    var gid=0;
    function one(x,y,ang,L,w0,id,parent,depth){ var pts=[[x,y]], a0=ang, a=ang, cur=(r()-0.5)*0.14;
      for(var k=0;k<L;k++){ cur+= (r()-0.5)*(o.wig||0.22); cur*=0.8; a+=cur; a+= (a0-a)*(o.pull||0.04); var nxp=x+Math.cos(a), nyp=y+Math.sin(a);
        if(o.stop(nxp,nyp)) break; if(k>1 && hit(nxp,nyp,id,o.gap||2.6)) break; x=nxp; y=nyp; pts.push([x,y]); }
      if(pts.length<3) return; mark(pts,id); var w1=o.w1||0.28, ws=pts.map(function(q,k){ return w1+(w0-w1)*Math.exp(-k/(depth?1.5:2.6)); }); out.push({p:pts,w0:w0,w1:w1,ws:ws});
      if(depth<1 && pts.length>7){ var nb=r()<(o.pb||0.55)?1:0; if(r()<(o.pt||0.25)) nb=2;
        for(var b=0;b<nb;b++){ var ki=nb===2?pts.length-1:Math.floor(pts.length*(0.45+0.4*r())); var sg=(nb===2?(b?1:-1):(r()<0.5?1:-1)); var aa=Math.atan2(pts[ki][1]-pts[ki-1][1],pts[ki][0]-pts[ki-1][0])+sg*(0.45+0.5*r());
          one(pts[ki][0],pts[ki][1],aa,3+r()*(nb===2?4:7),w0*0.7,id,id,depth+1); } } }
    seeds.forEach(function(s){ gid++; one(s[0],s[1],s[2],s[3],s[4],'g'+gid,null,0); });
    return out; }
  return {smooth:smooth, offs:offs, OP:OP, toB:toB, rowPoly:rowPoly, SP:SP, SL:SL, mx:mx, polar:polar, cortex:cortex, grow:grow};
})();
/*<KIT*/
var K=MS.PH_BK, SP=K.SP, SL=K.SL, OP=K.OP, mx=K.mx, offs=K.offs, smooth=K.smooth, toB=K.toB;

MS.addTissues({
  galea:{n:'帽状腱膜・側頭筋膜', T1:[700,800], T2:[18,16], T2s:[8,6], PD:0.45, ADC:0.6, mt:0.35, fa:0.5, src:'est'},
  bstem:{n:'脳幹（被蓋・橋核）', T1:[800,1010], T2:[80,74], T2s:[50,38], PD:0.74, ADC:0.75, mt:0.35, fa:0.4, cbf:35, src:'est'},
  mucosa:{n:'副鼻腔・鼻腔粘膜', T1:[1100,1300], T2:[110,100], T2s:[40,28], PD:0.85, ADC:1.6, ce:{eca:[3,4,3.5]}, src:'est'},
  cart_ear:{n:'軟骨（耳介・鼻中隔）', T1:[1000,1150], T2:[35,32], T2s:[20,14], PD:0.72, ADC:1.3, mt:0.3, src:'est'},
  pit_a:{n:'下垂体前葉・下垂体茎', T1:[950,1150], T2:[85,80], T2s:[45,32], PD:0.78, ADC:0.9, cbf:80, ce:{eca:[6,5.5,4]}, src:'est'},
  pit_p:{n:'下垂体後葉（T1高信号）', T1:[420,520], T2:[75,70], T2s:[40,28], PD:0.78, ADC:0.9, cbf:80, ce:{eca:[6,5,4]}, src:'est'},
  septum:{n:'透明中隔', T1:[1150,1350], T2:[88,84], T2s:[52,40], PD:0.78, ADC:1.1, mt:0.25, src:'est（薄い膜と脳室の部分容積）'},
  disc_c:{n:'頸椎椎間板', T1:[1050,1250], T2:[85,80], T2s:[40,30], PD:0.8, ADC:1.4, mt:0.3, src:'est'},
  pit_adenoma:{n:'下垂体腺腫', T1:[1150,1400], T2:[95,90], T2s:[45,32], PD:0.82, ADC:0.85, cbf:60, ce:{eca:[2,3.5,4.2]}, lesion:1, tx:{f:0.05,c:0.07}, src:'est'}
});

/* ---------- 頭部（正中矢状断） ----------
   左＝前、右＝後、上＝頭側。原点は第三脳室の少し上。 */
/* 皮膚（顔・頭・頸の輪郭） */
var SKIN=[[0,-100],[40,-96],[72,-78],[94,-48],[104,-14],[104,16],[101,36],[94,54],[86,74],[82,96],[81,128],[-34,128],[-38,113],[-50,107],[-68,104],[-79,100],[-83,91],[-80,84],[-84,78],[-86,71],[-85,65],[-96,61],[-108,55],[-104,46],[-97,36],[-93,22],[-96,8],[-99,-16],[-92,-50],[-72,-79],[-40,-96]];
/* 頭蓋外板（前頭〜頭頂〜後頭）と頭蓋底の下縁 */
var OUT=[[-86,16],[-91.5,2],[-93,-20],[-86.5,-50],[-66,-75.5],[-38,-90.5],[0,-95.5],[38,-91.5],[68,-73.5],[89,-45],[98.5,-14],[98.5,14],[97.4,28],[94,46],[84,59],[68,66],[46,68],[20,67],[12,64],[2,58],[-8,50],[-30,50],[-38,40],[-40,22],[-60,22],[-76,21]];
/* 頭蓋内腔（内板・頭蓋底）＋大後頭孔から脊柱管 */
var CRAN=[[-77,9.5],[-84,-14],[-79.5,-46],[-60.5,-69.5],[-34,-83.5],[0,-88.5],[34,-84.5],[62.5,-67.5],[81.5,-41],[90,-12],[90,13],[88.8,28],[86.4,43],[78,56],[65,63.4],[50,67],[38,67.6],[28,65.5],[21,64],[14,61],[7,53],[2,43],[0.5,33],[-0.5,22.5],[-2,20.8],[-7,22],[-13.5,23.2],[-22,19.5],[-40,16.5],[-60,13.5]];
var SELLA=[[-0.4,21.6],[-1,28],[-1.5,33.5],[-5,36],[-10,35.5],[-13.5,30.5],[-13.6,24],[-7,22.6]];
var CANAL=[[56,63],[51.5,68],[49,80],[49.5,129],[32,129],[32.5,98],[32,82],[31,67],[28,64]];
/* 大脳半球内側面の輪郭（下縁は前頭蓋底・視交叉・第三脳室底・テント） */
var CER=[[-16,16],[-30,14.5],[-50,13],[-66,10.5],[-75,5.5],[-80,-6],[-81.2,-20],[-76.5,-42],[-58,-65],[-32,-80],[0,-85],[32,-81],[59,-64],[78.5,-40],[87,-12],[87.4,11],[82,20],[70,19.5],[58,15.5],[47,11.5],[40,10.5],[34,10],[27,5],[21,6.5],[12,10],[4,14],[-3,17],[-9,15.5],[-13,14.5]];
function inPoly(x,y,P){ var c=false; for(var a=0,b=P.length-1;a<P.length;b=a++){ if(((P[a][1]>y)!==(P[b][1]>y)) && (x<(P[b][0]-P[a][0])*(y-P[a][1])/(P[b][1]-P[a][1])+P[a][0])) c=!c; } return c; }
var CERs=smooth(CER,5), inCER=K.rowPoly(CERs);
/* 脳梁（吻・膝・体・膨大） */
var CC=[[-40.5,-4],[-38,-12],[-31,-19],[-20,-23],[-6,-25],[8,-25],[20,-23],[30,-19],[36,-13],[40,-6],[41.5,1],[39.5,7],[34.5,9.5],[29,7],[26.5,2],[27,-3],[29,-6],[22,-13],[12,-17],[0,-18.5],[-12,-17.5],[-22,-14],[-28,-9],[-30,-3],[-28,2],[-25,6],[-21,9.5],[-24,11],[-30,8.5],[-35.5,4],[-39.5,0]];
/* 内側面の脳溝（手で置く主要なもの） */
var FIX=[
  {p:[[-34,7.5],[-41.6,-2],[-39.2,-13.6],[-31.7,-20.6],[-20,-24.6],[-6,-26.6],[8,-26.6],[20,-24.6],[31,-20.6],[37.4,-14],[41.4,-6.5],[43,1],[41.4,8.5]], w0:0.5, w1:0.5},   /* 脳梁溝 */
  {p:[[-38,11],[-47.5,-1],[-47,-17],[-38.5,-29.5],[-24,-35.5],[-8,-37.5],[6,-37.5],[12,-38.5],[16,-45],[19,-56],[21,-70],[22.5,-82]], w0:0.7, w1:0.7},              /* 帯状溝・辺縁枝 */
  {p:[[-8,-37.5],[-10,-55],[-12,-70],[-13,-83]], w0:0.6, w1:0.45},                                      /* 中心傍溝 */
  {p:[[4,-84.5],[6,-76],[7,-70]], w0:0.6, w1:0.3},                                                       /* 中心溝（内側端） */
  {p:[[24,-30],[33,-31.5],[42,-29]], w0:0.45, w1:0.45},                                                 /* 頭頂下溝 */
  {p:[[63,-61],[55.5,-43],[49.5,-25],[45.5,-9],[43.5,4],[42.5,9.5]], w0:0.9, w1:0.7},                   /* 頭頂後頭溝 */
  {p:[[87.4,10],[76,9.6],[64,8.4],[53,8.2],[43.5,7.5]], w0:0.9, w1:0.6},                                 /* 鳥距溝 */
  {p:[[-61,9],[-52,4],[-43,4]], w0:0.5, w1:0.35}                                                         /* 上吻側溝 */
];
var CX=null;
function cereb(){ if(CX) return CX; var r=rng(31), seeds=[];
  var n=CERs.length, acc=0, nextS=4; for(var i=0;i<n;i++){ var p=CERs[i], q=CERs[(i+1)%n]; acc+=Math.hypot(q[0]-p[0],q[1]-p[1]); if(acc<nextS) continue; acc=0; nextS=7+r()*4.5;
    if(p[1]>12&&p[0]>-70) continue; if(p[0]>-20&&p[0]<40&&p[1]>-10) continue;
    var tx=q[0]-CERs[(i-1+n)%n][0], ty=q[1]-CERs[(i-1+n)%n][1], a=Math.atan2(tx,-ty); if(Math.cos(a)*(4-p[0])+Math.sin(a)*(-6-p[1])<0) a+=Math.PI; a+=(r()-0.5)*0.5;
    seeds.push([p[0]+Math.cos(a)*0.3,p[1]+Math.sin(a)*0.3,a,9+r()*13,0.55+r()*0.3]); }
  /* 帯状溝・頭頂後頭溝から分かれる二次溝 */
  [[-46,-12],[-40,-27],[-28,-34.5],[-14,-37],[0,-37.5]].forEach(function(p){ var a=Math.atan2(-60-p[1],-10-p[0])+(r()-0.5)*0.6; seeds.push([p[0]+Math.cos(a)*1.2,p[1]+Math.sin(a)*1.2,a,6+r()*8,0.45]); });
  [[53,-36],[48,-18],[45,-4]].forEach(function(p){ var a=Math.atan2(-40-p[1],20-p[0])+(r()-0.5)*0.5; seeds.push([p[0]+Math.cos(a)*1.2,p[1]+Math.sin(a)*1.2,a,6+r()*7,0.45]); });
  [[56,-30],[52,-10],[60,0]].forEach(function(p){ var a=Math.atan2(-10-p[1],85-p[0])+(r()-0.5)*0.5; seeds.push([p[0]+Math.cos(a)*1.2,p[1]+Math.sin(a)*1.2,a,6+r()*7,0.45]); });
  /* 前頭葉底部（直回）からの短い溝 */
  [-66,-54,-44,-34].forEach(function(x){ seeds.push([x+r()*3,12.5,-Math.PI/2+(r()-0.5)*0.4,4+r()*4,0.45]); });
  var sul=K.grow(seeds,{seed:13, fixed:FIX, gap:2.4, pb:0.65, pt:0.2, wig:0.28, stop:function(x,y){ return !inCER(x,y) || inPoly(x,y,CCZ); }});
  CX=K.cortex({bb:[-84,-88,90,24], h:0.25, mask:function(x,y){ return inCER(x,y); }, sulci:sul, thick:function(x,y){ return 4.6+0.7*Math.sin(0.21*x+0.33*y); }});
  return CX; }
/* 脳溝が入り込まない範囲（脳梁と帯状回の内側） */
var CCZ=smooth([[-44,6],[-46,-8],[-41,-25],[-24,-33],[0,-35],[20,-33],[34,-25],[44,-10],[46,6],[40,12],[-20,14]],4);
/* 小脳虫部：主要な裂（第一裂・水平裂など）で小葉に分かれ、髄体が枝分かれする（arbor vitae） */
var VER=[[35.5,28.5],[38.6,23],[45,19.6],[56,19.2],[68,22.6],[78,30],[83,40],[81.6,51],[75,59.4],[64.5,64],[54,64.4],[46.5,60.6],[42.6,55],[43,50],[45.6,43.6],[44.6,40],[40,34.4]];
var VERs=smooth(VER,5), inVER=K.rowPoly(VERs), VX=null;
/* 髄体（corpus medullare）から各小葉へ伸びる白質の枝（arbor vitae）：[点列, 根元の半径, 先端の半径] */
var VC=[48.6,40.8];
function rayV(a){ for(var d=1;d<45;d+=0.25){ if(!inVER(VC[0]+d*Math.cos(a),VC[1]+d*Math.sin(a))) return d; } return 45; }
var LOB=[[-150,0.1],[-124,0.12],[-99,0.18],[-63,0.16],[-31,0.1],[-5,0.06],[25,-0.08],[60,-0.14],[108,-0.1]], FISA=[[-137,0.55],[-112,0.6],[-81,0.82],[-46,0.6],[-18,0.78],[10,0.62],[42,0.7],[84,0.6]];
var TREE=(function(){ var o=[], rr=rng(91);
  LOB.forEach(function(L,k){ var a0=L[0]*Math.PI/180, len=rayV(a0)-3.2, pts=[], x=VC[0], y=VC[1];
    for(var i=0;i<=6;i++){ var t=i/6, a=a0+L[1]*t; if(i){ x+=Math.cos(a)*len/6; y+=Math.sin(a)*len/6; } pts.push([x,y]); }
    o.push([pts,k===8?1.2:1.7,0.5]);
    [0.5,0.72].forEach(function(f,j){ var i=Math.round(f*6), p=pts[i], a=a0+L[1]*f+(j?-1:1)*(0.5+0.2*rr()); var l2=3.5+rr()*2.5; if(k===8) return;
      o.push([[p,[p[0]+Math.cos(a)*l2*0.6,p[1]+Math.sin(a)*l2*0.6],[p[0]+Math.cos(a+0.15)*l2,p[1]+Math.sin(a+0.15)*l2]],0.75,0.35]); }); });
  return o; })();
var TDG=null; function treeD(x,y){ if(!TDG){ TDG=new Float32Array(250*236); TDG.fill(NaN); } var i=Math.floor((x-34)/0.2), j=Math.floor((y-17)/0.2); if(i<0||j<0||i>=250||j>=236) return treeD0(x,y); var q=j*250+i; var v=TDG[q]; if(v!==v){ v=TDG[q]=treeD0(34+(i+0.5)*0.2,17+(j+0.5)*0.2); } return v; }
function treeD0(x,y){ var best=0; for(var i=0;i<TREE.length;i++){ var T=TREE[i], p=T[0], n=p.length, Lt=0, seg=[]; for(var k=0;k<n-1;k++){ var l=Math.hypot(p[k+1][0]-p[k][0],p[k+1][1]-p[k][1]); seg.push(l); Lt+=l; }
    var acc=0; for(var k2=0;k2<n-1;k2++){ var a=p[k2], b=p[k2+1], ax=b[0]-a[0], ay=b[1]-a[1], L2=ax*ax+ay*ay, t=((x-a[0])*ax+(y-a[1])*ay)/L2; t=t<0?0:t>1?1:t; var px=a[0]+t*ax-x, py=a[1]+t*ay-y; var f=(acc+t*seg[k2])/Lt, r=T[1]+(T[2]-T[1])*f;
      var v=r-Math.sqrt(px*px+py*py); if(v>best) best=v; acc+=seg[k2]; } } return best; }
function vermis(){ if(VX) return VX; var r=rng(57);
  var fx=FISA.map(function(F){ var a=F[0]*Math.PI/180, R=rayV(a), pts=[]; for(var i=0;i<=5;i++){ var d=R+0.4-(R*F[1])*i/5, aa=a+0.08*Math.sin(i); pts.push([VC[0]+d*Math.cos(aa),VC[1]+d*Math.sin(aa)]); } return {p:pts,w0:0.6,w1:0.32}; });
  var seeds=[]; var n=VERs.length; for(var i=0;i<n;i++){ var p=VERs[i]; if(p[0]<46&&p[1]>34) continue; if(r()>0.85) continue; var a=Math.atan2(VC[1]-p[1],VC[0]-p[0])+(r()-0.5)*0.7; seeds.push([p[0]+Math.cos(a)*0.2,p[1]+Math.sin(a)*0.2,a,2+r()*3,0.3]); }
  var sul=K.grow(seeds,{seed:3, fixed:fx, gap:1.05, pb:0.35, pt:0.15, w1:0.2, stop:function(x,y){ return !inVER(x,y) || treeD(x,y)>-0.9; }});
  var g=K.cortex({bb:[34,17,84,64], h:0.2, mask:function(x,y){ return inVER(x,y); }, sulci:sul, thick:function(){ return 99; }});
  VX=function(x,y){ var l=g(x,y); if(!l||l==='csf') return l; return treeD(x,y)>0||Math.hypot(x-VC[0],y-VC[1])<3.6?'wm':'gm'; };
  return VX; }
/* 脳幹（中脳・橋・延髄〜頸髄） */
var BST=[[3,17.5],[10,14],[18,10.5],[24,8.5],[30,9.8],[34,13],[35.6,18],[37,24],[35.2,29],[32,31],[34,40],[36.4,50],[40,59.5],[44,66],[45.4,76],[45.4,129],[35.4,129],[35.6,76],[31,67],[25,59],[18.6,52.6],[13.6,50.6],[8.4,47.4],[5.6,42],[5,36],[6.2,30.6],[9.4,26.2],[7.4,22.2],[4,20.4]];
function headSag(){
  var sh=M([
    /* 皮膚・皮下脂肪 */
    toB('skin',SKIN,0,10), toB('fat',offs(SKIN,-2.2),0,10,128,true),
    S('galea',-86,-46,-60,-80,0.5), PL('galea',[[-62,-78],[-36,-93],[0,-97.5],[38,-93.5],[70,-75.5]],0.5), PL('galea',[[70,-75.5],[91,-46],[100.5,-14],[100.5,14]],0.5),
    /* 後頸部の筋（頭半棘筋・後頭下筋群）と項靱帯の脂肪 */
    SP('muscle',[[60,64],[78,58],[90,62],[84,80],[80,100],[79,126],[64,126],[64,104],[70,92],[58,80],[54,72]]),
    SL('fat',[[66,70],[72,84],[70,100],[70,126]],0.9), SL('fat',[[80,62],[76,74]],0.7),
    /* 舌・口唇・軟口蓋・オトガイ */
    SP('muscle',[[-76,79],[-66,73.5],[-50,72.5],[-34,74.5],[-20,79],[-8,86],[-4,96],[-6,106],[-14,112],[-30,112],[-46,108],[-62,101],[-72,92]]),
    SL('fat',[[-62,80],[-48,82],[-30,86],[-18,93]],0.6), SL('fat',[[-56,94],[-38,99],[-22,104]],0.55),
    SP('muscle',[[-86,67],[-81,66.5],[-79,73],[-83,77.5]]), SP('muscle',[[-82,80],[-78,79],[-76,86],[-80,89]]),
    SP('muscle',[[-36,64.5],[-28,67],[-16,74.5],[-8,82],[-6.5,87],[-11,87],[-20,81],[-30,73.5],[-37,69.5]]),
    /* 鼻（外鼻の軟骨・脂肪） */
    SL('cart_ear',[[-96,40],[-104,50],[-101,57]],0.9), SL('cart_ear',[[-90,26],[-94,36]],0.7),
    /* 頭蓋（外板の輪郭を骨で埋め、腔をくり抜く） */
    toB('bone',OUT,0,-10,144),
    /* 板間層 */
    SL('marrow_y',[[-88.5,-6],[-89.5,-20],[-83,-48],[-63,-72.5],[-36,-87],[0,-92],[36,-88],[65,-70.5],[85.3,-43],[94.2,-13],[94.2,13],[92,26],[84.5,39]],1.6),
    /* 前頭洞（前頭骨の内外板の間） */
    SP('air',[[-90.6,-6],[-86.5,-10],[-83.6,-2],[-83,8],[-84.8,13],[-88.8,10],[-90.6,2]]),
    /* 蝶形骨洞・斜台の骨髄 */
    SP('mucosa',[[-31,23.5],[-15.5,23],[-13.6,36],[-6,40],[-1,40],[2,47],[-8,48.6],[-30,48.6],[-36,40],[-36.5,28]]),
    SP('air',[[-30,25],[-16.5,24.6],[-14.6,37],[-6.5,41.5],[-1.6,41.6],[0.4,46.4],[-8,47.3],[-29,47.3],[-34.8,39.5],[-35,29]]),
    SP('marrow_y',[[-2.4,25],[-1.4,32],[-0.4,40],[3.6,48],[10.6,56.6],[10,61],[4,57.6],[-1,51],[-2,43],[-3.2,37],[-3.4,30]]),
    /* 鼻腔：鼻中隔（軟骨・骨）と上下の空気、粘膜 */
    SP('mucosa',[[-88,24],[-60,24],[-40,23.5],[-37.8,40],[-38,52],[-36,63],[-50,64.5],[-70,64.5],[-86,63.6],[-97,56],[-96,44],[-91,34]]),
    SP('cart_ear',[[-94,40],[-80,30],[-72,34],[-74,50],[-82,62],[-94,56]]),
    SP('bone',[[-72,26],[-44,25],[-42,36],[-58,42],[-72,38]]), SP('bone',[[-74,52],[-48,46],[-40,52],[-42,61],[-72,61]]),
    SP('air',[[-86,62],[-50,62.6],[-40,62],[-41,63.6],[-86,64]]), SP('air',[[-84,25.5],[-46,25.4],[-44,27],[-84,27.4]]),
    SP('air',[[-72,39.5],[-56,44],[-46,46.5],[-70,50]]),
    /* 鼻骨・硬口蓋（上顎）・下顎骨結合 */
    SL('bone',[[-87.5,16],[-91.5,26],[-96,38]],1.0),
    SP('bone',[[-87,64.5],[-60,65],[-36,65],[-35.5,68.5],[-60,69.5],[-80,70],[-84,77],[-88,74]]), SP('marrow_y',[[-82,66.2],[-60,66.6],[-40,66.8],[-40,67.8],[-60,68.2],[-81,68.6],[-84,72]]),
    SP('bone',[[-80,82],[-72,81],[-67,90],[-66,104],[-72,108],[-78,104],[-82,92]]), SP('marrow_y',[[-77.5,85],[-72.5,84.5],[-69,92],[-68.5,102],[-72.5,105],[-76.5,101],[-79,92]]),
    /* 舌骨 */
    E('bone',-24,116,4.2,2.6,20), E('marrow_y',-24,116,2.8,1.4,20),
    /* 上咽頭（アデノイド）・中咽頭の空気、椎前軟部 */
    SP('mucosa',[[-36,50],[-8,50],[2,57],[9,64],[12,72],[12,128],[6,128],[2,96],[-1,88],[-6,80],[-20,70],[-36,64]]),
    SP('air',[[-35,53],[-14,53.6],[-4,57],[4,64],[7,72],[7.2,128],[3.6,128],[2.5,104],[1,93],[-3,86],[-7,83],[-12,77],[-20,72],[-35,63]]),
    SP('muscle',[[6,58],[12,64],[16,66],[17,76],[17,128],[12,128],[12,72],[8,64]]),
    /* 頸椎：C1 前弓・歯突起・C2・C3 椎体、椎間板 */
    E('bone',17.2,70.6,3.4,4.4), E('marrow_v',17.2,70.6,2,3),
    SP('bone',[[21,64],[27,63],[30.6,68],[31,81],[33,84],[33.4,96],[18.4,97],[18,84],[20.6,80],[20.2,68]]),
    SP('marrow_v',[[22.4,66],[26.6,65.4],[29,69],[29.4,82],[31.6,85],[31.8,94.6],[19.8,95.4],[19.6,85],[22,81],[21.8,68]]),
    SP('disc_c',[[18.4,97.4],[33.4,96.4],[33.6,100.6],[18.2,101.6]]),
    SP('bone',[[18,101.8],[33.6,101],[33.6,116],[17.6,116.6]]), SP('marrow_v',[[19.4,103],[32.2,102.4],[32.2,114.8],[19,115.4]]),
    SP('disc_c',[[17.6,116.8],[33.6,116.2],[33.6,120.6],[17.4,121.4]]), SP('bone',[[17.4,121.6],[33.6,120.8],[33.6,130],[17.2,130]]),
    /* 後頭骨下部・C1 後弓・C2 棘突起・C3 棘突起 */
    E('bone',61.5,71.5,3.6,4.6), E('marrow_v',61.5,71.5,2.2,3.2),
    SP('bone',[[50,82],[58,83],[68,86],[73,90],[70,95],[60,93],[52,90]]), SP('marrow_v',[[53,84.5],[60,85.4],[67,88],[68,91.5],[60,90.6],[54,88]]),
    SP('bone',[[50,104],[62,105],[68,108],[66,112],[56,110],[50,109]]),
    /* 頭蓋内腔：硬膜 → 髄液（大後頭孔から脊柱管へ） */
    toB('dura',CRAN,5,-5,180), toB('csf',offs(CRAN,-0.6),5,-5,180,true), SP('dura',SELLA), OP('csf',SELLA,-0.5), SP('csf',CANAL),
    SL('vein',offs([[-77,9.5],[-84,-14],[-79.5,-46],[-60.5,-69.5],[-34,-83.5],[0,-88.5],[34,-84.5],[62.5,-67.5],[81.5,-41],[90,-12],[90,13],[87,27]],-1.7,4).slice(6,-2),1.35),
    /* 歯突起の後ろ：蓋膜・後縦靱帯、横靱帯、黄色靱帯 */
    SL('lig',[[0,30],[2.4,44],[8.5,55],[19,62.8],[31.6,68],[32.2,82],[33.8,98],[34.2,128]],0.9), E('lig',33,71,1.7,2.6),
    SL('lig',[[50,80.6],[49.6,96],[49.6,104],[50,128]],1.0),
    /* 大脳半球（内側面） */
    F('wm',[-84,-88,90,24],function(x,y){ return cereb()(x,y); }),
    /* テント・直静脈洞・静脈洞交会・上矢状静脈洞・下矢状静脈洞 */
    SL('dura',[[40,11.5],[52,15],[64,19],[76,23],[86.5,27.6]],0.6),
    SL('vein',[[40,12],[52,15.4],[64,19.4],[76,23.4],[84,26.4]],1.6), E('vein',85.6,27,3.6,3.2,20),
    SL('vein',[[-22,-37.5],[0,-39.5],[22,-36.5],[34,-24]],0.6),
    /* 脳梁・帯状回の白質は皮質から続く。脳梁を描く */
    SP('wm',CC),
    /* 透明中隔・脳弓・前交連 */
    SP('septum',[[-27.4,-3],[-27,-8.5],[-21,-13.6],[-10,-17],[2,-18],[14,-16.4],[24,-11.4],[28,-6],[27.6,-2],[18,-5.4],[6,-7.6],[-4,-7.2],[-11,-4.6],[-14,-1.4],[-20,2],[-25,3.4]]),
    SL('wm',[[28,-2.8],[18,-5.6],[6,-7.6],[-4,-7.2],[-10.5,-4.4],[-13,-0.4],[-12.4,3.6]],1.45), E('wm',-12.6,4.6,1.6,1.6),
    /* 第三脳室（視交叉陥凹・漏斗陥凹・松果体陥凹）、視床間橋、視床下部 */
    SP('gm_deep',[[-12,2],[-10,-2.2],[4,-3.4],[20,-1.6],[27,3.4],[22,9],[16,12],[8,15],[3,17.6],[-3,19.4],[-9,17],[-12,13.5]]),
    SP('csf',[[-11,3.2],[-9,-0.6],[4,-1.6],[19,0],[25.4,3.4],[24.4,5.6],[21,7],[16,10.6],[8,13.4],[3.2,15.2],[-1.6,16.8],[-3.6,19.8],[-5.4,17.2],[-8.4,15.4],[-10.6,14],[-11.6,9]]),
    E('gm_deep',4,6,5,3.2,-5), E('gm_deep',3.2,16.4,2.3,2.0),
    /* 視交叉・下垂体茎・下垂体（前葉・後葉）、鞍隔膜 */
    SL('wm',[[-15.4,14.6],[-11,16.6],[-6.4,18.2]],1.5),
    SL('pit_a',[[-3.4,19],[-4.6,22.5],[-6,25.8]],1.15),
    SP('pit_a',[[-12.4,25.4],[-6,25],[-1.8,26.8],[-1.8,31.6],[-5,34.4],[-10,34],[-12.6,30.4]]), E('pit_p',-3.4,29.6,1.7,2.6,-10),
    S('dura',-13.4,24,-0.8,21.6,0.35),
    /* 中脳水道・脳幹・頸髄 */
    Pg('bstem',smooth(BST,4)),
    F('cord',[34,60,47,130],function(x,y,c){ return (c==='bstem'&&y>65)?'cord':null; }),
    SL('csf',[[22,9.2],[25,14],[27.6,20],[30.6,28],[32,31]],0.75),
    /* 第四脳室（室頂＝上髄帆→室頂→下髄帆） */
    SP('csf',[[32.4,30.6],[35,29.4],[40,34],[45.4,41],[44.4,45],[42.4,50.6],[41.6,56],[40.6,59.4],[37,51],[34.6,41]]),
    /* 小脳虫部 */
    F('gm',[34,17,84,64],function(x,y){ return vermis()(x,y); }),
    /* 内大脳静脈・大大脳静脈（Galen） */
    SL('vein',[[-9,-1.2],[4,-2.6],[18,-1.4],[26,2]],0.85), SL('vein',[[26,2.2],[32,6.6],[36.6,10.4],[40.6,12]],1.9),
    /* 動脈：脳底動脈（橋の前）・脳梁周囲動脈・後大脳動脈の枝 */
    SL('artery',[[9.6,51.6],[4.6,46],[3.1,40],[3.1,33],[4.8,27],[7,22.8]],1.35),
    SL('artery',[[-36,6],[-42.6,-3],[-40.2,-14.4]],0.7), SL('artery',[[-5,-27.4],[10,-27.4],[22,-25.6]],0.6),
    /* 松果体 */
    E('gm_deep',27,6.8,2.6,1.8,25)
  ]);
  return sh;
}
function headSagLes(){
  /* 脳梁下面（脳梁中隔境界）から脳梁を貫いて上へ伸びる卵円形：[x, y, 長軸の向き(rad), 長半径, 短半径] */
  var ccms=[[-25.5,-15,-2.25,5.2,1.5],[-15,-20,-1.95,4.2,1.3],[-4,-21.6,-1.68,5.4,1.6],[9,-21.4,-1.42,3.8,1.2],[18.5,-18.2,-1.15,4.8,1.5],[27.5,-9.4,-0.75,3.6,1.3],[3.5,-29.5,-1.6,2.4,1.6]];
  return [
  {id:'pitma', n:'下垂体腺腫（マクロアデノーマ）', shapes:[
    SP('csf',[[-17.6,13],[-14,7.6],[-6,5],[1.4,8],[3,14],[1.6,19]]),
    SP('pit_adenoma',[[-13.2,25],[-13.8,31],[-10.4,37.6],[-4,38.2],[0.6,34.6],[0.8,27.6],[-1.2,23],[-2.6,21.4],[0.6,18],[0.4,11.4],[-4,7.6],[-10,8.2],[-13.6,12.8],[-12.4,18.8],[-10.6,22.4],[-12.8,23.6]]),
    SL('wm',[[-17,9.4],[-12,5.6],[-6,4.4]],1.35)]},
  {id:'ccms', n:'脳梁の脱髄斑（Dawson’s fingers 様）', shapes:[F('ms',[-36,-34,38,2],function(x,y,c){ if(c!=='wm') return null;
      for(var i=0;i<ccms.length;i++){ var q=ccms[i], dx=x-q[0], dy=y-q[1], ca=Math.cos(q[2]), sa=Math.sin(q[2]); var u=dx*ca+dy*sa, v=-dx*sa+dy*ca; if(u*u/(q[3]*q[3])+v*v/(q[4]*q[4])<1) return 'ms'; } return null; })]}
]; }

MS.PHANTOMS.headSag = {n:'頭部（正中矢状断）', P:240, plane:'sag', coil:'head', coilG:1.0, fov:230, pe:'AP', shapes:headSag, les:headSagLes, motion:{resp:0, card:0}, region:'brain', ab:['pit_p','pit_a']};
})();
