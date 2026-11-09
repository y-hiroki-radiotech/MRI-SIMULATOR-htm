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
  dentate:{n:'小脳歯状核', T1:[850,1050], T2:[68,55], T2s:[32,20], PD:0.75, ADC:0.72, mt:0.3, fa:0.2, cbf:45, chi:0.08, src:'est'},
  nerve:{n:'脳神経（顔面・前庭蝸牛神経）', T1:[750,950], T2:[70,66], T2s:[45,35], PD:0.68, ADC:1.0, mt:0.35, fa:0.6, src:'est'},
  labyr:{n:'内耳（外・内リンパ）', T1:[3800,4100], T2:[1800,1600], T2s:[400,250], PD:1.0, ADC:2.9, src:'est'},
  mucosa:{n:'副鼻腔・鼻腔粘膜', T1:[1100,1300], T2:[110,100], T2s:[40,28], PD:0.85, ADC:1.6, ce:{eca:[3,4,3.5]}, src:'est'},
  vitreous:{n:'硝子体', T1:[3900,4200], T2:[1500,1300], T2s:[800,500], PD:1.0, ADC:2.9, src:'est'},
  sclera:{n:'強膜', T1:[900,1000], T2:[25,22], T2s:[10,8], PD:0.5, ADC:0.8, mt:0.35, src:'est'},
  cart_ear:{n:'軟骨（耳介・鼻中隔）', T1:[1000,1150], T2:[35,32], T2s:[20,14], PD:0.72, ADC:1.3, mt:0.3, src:'est'},
  schwannoma:{n:'神経鞘腫', T1:[1150,1450], T2:[110,100], T2s:[55,40], PD:0.85, ADC:1.25, cbf:60, ce:{eca:[3.5,5,5.5]}, lesion:1, src:'est'},
  cav_core:{n:'海綿状血管腫（混在する血液成分）', T1:[520,620], T2:[130,110], T2s:[18,9], PD:0.88, ADC:1.0, chi:0.6, ce:{eca:[0.3,0.8,1.2]}, lesion:1, tx:{f:0.15,c:0.25}, src:'est'}
});

/* ---------- 頭部（後頭蓋窩・内耳道レベル・軸位） ----------
   左＝患者右、上＝前。中心は橋の少し前。 */
/* 皮膚の輪郭（患者左半分、前→後） */
var SKIN=[[0,-104],[9,-101],[17,-96.5],[25,-99],[33,-100],[42,-96],[51,-86],[58,-72],[65,-55],[69.5,-36],[71.5,-16],[72.5,4],[72,22],[69,42],[62,62],[50,80],[34,93],[17,99.5],[0,101]];
function closeM(h){ var a=h.slice(), b=h.slice(1,-1).reverse().map(function(p){ return [-p[0],p[1]]; }); return a.concat(b); }
var skin=closeM(SKIN);
/* 後頭蓋窩の内板（錐体後面〜後頭骨）、患者左半分 */
var PF=[[0,-5.5],[9,-6],[13.5,-6.5],[17,-3.5],[21,0.5],[27,4.5],[33,8.5],[40,14],[45,19.5],[49,26.5],[51.5,36],[50.5,46],[45.5,56],[37,65.5],[26,72.5],[13,76.5],[0,77.5]];
var pf=closeM(PF);
/* 中頭蓋窩（側頭葉の入る区画） */
function mcf(s){ return mx(s,[[19,-44],[27,-48.5],[37,-50.5],[47,-48.5],[54.5,-42],[57.5,-31],[57.5,-21],[54.5,-15],[46,-15.5],[37,-18.5],[28,-21.5],[22,-24.5],[18.5,-31],[17.5,-38]]); }
/* 小脳半球・虫部・橋の輪郭 */
function hemi(s){ return mx(s,[[7.5,31],[12,24],[17,15.5],[22,9.5],[27,7.2],[33,10],[39,14.5],[44.5,21],[48.4,29],[49.6,38],[48.6,46.5],[44,55],[36,63.5],[25,70.2],[14,74],[8.2,72.5],[7,62],[7.2,46],[7.6,37]]); }
var VERM=[[0,30.2],[4.5,30.6],[7.4,36],[8,48],[7.6,62],[5.8,72.5],[0,75],[-5.8,72.5],[-7.6,62],[-8,48],[-7.4,36],[-4.5,30.6]];
var PONS=[[0,0.6],[2.2,-0.4],[6.5,-0.6],[11.5,1.2],[15.6,4.6],[18.2,9],[18.4,13],[16.4,17.4],[12.4,21],[7.4,22.6],[0,22.2]];
function inPoly(x,y,P){ var c=false; for(var a=0,b=P.length-1;a<P.length;b=a++){ if(((P[a][1]>y)!==(P[b][1]>y)) && (x<(P[b][0]-P[a][0])*(y-P[a][1])/(P[b][1]-P[a][1])+P[a][0])) c=!c; } return c; }
var HL=smooth(hemi(1),5), HR=smooth(hemi(-1),5), VS=smooth(VERM,5), PS=smooth(closeM(PONS),5), TL=smooth(offs(mcf(1),-1.6),5), TR=smooth(offs(mcf(-1),-1.6),5);
var inHL=K.rowPoly(HL), inHR=K.rowPoly(HR), inVS=K.rowPoly(VS), inTL=K.rowPoly(TL), inTR=K.rowPoly(TR);
/* 小脳：表面からの距離に沿って並ぶ葉（folia）と、その間の細い裂。深部は白質（髄体） */
var CB=null;
function cbl(){ if(CB) return CB;
  var fis=[]; [-1,1].forEach(function(s){
    fis.push({p:smooth(mx(s,[[49.7,36],[42,36.5],[35,34.5],[28,31.5],[23,27]]),3,true), w0:0.75, w1:0.35});     /* 水平裂 */
    fis.push({p:smooth(mx(s,[[43,53],[36.5,49.5],[30,46.5],[25,43]]),3,true), w0:0.6, w1:0.3});
    fis.push({p:smooth(mx(s,[[26,69.5],[23,62],[20.5,55]]),3,true), w0:0.55, w1:0.3});
    fis.push({p:smooth(mx(s,[[33,9.8],[31.5,15.5],[28.5,20]]),3,true), w0:0.55, w1:0.3});
    fis.push({p:smooth(mx(s,[[7.6,72],[7.6,58],[7.8,44],[7.4,34]]),3,true), w0:0.6, w1:0.5});                    /* 傍虫部溝（谷） */
  });
  var g=K.cortex({bb:[-50,8,50,76], h:0.25, mask:function(x,y){ return inHL(x,y)||inHR(x,y)||inVS(x,y); }, sulci:fis, thick:function(){ return 99; }});
  CB=function(x,y){ var l=g(x,y); if(!l) return null; if(l==='csf') return 'csf'; var d=g.d(x,y);
    var ver=Math.abs(x)<7.6, X=Math.abs(x);
    var nz=0.9*Math.sin(0.31*x+0.17*y)+0.6*Math.sin(0.12*x-0.37*y+1.3)+0.35*Math.sin(0.53*x+0.47*y+2);
    /* 葉の並ぶ座標：半球は歯状核付近を中心とする同心の弧、虫部は第四脳室を中心とする横向きの弧 */
    var rho=ver?Math.hypot(x*0.45,y-24):Math.hypot((X-17)*1.0,(y-31)*1.08), core=ver?9:11, sp=ver?2.5:2.8;
    if(rho<core+nz && d>2.2) return 'wm';
    if(d<1.0) return 'gm';
    var u=(rho+0.7*nz)/sp, fr=u-Math.floor(u), band=Math.floor(u);
    var gate=Math.sin(0.23*x+0.19*y+band*2.3)+0.6*Math.sin(0.41*x-0.27*y+band);
    if((fr<0.1||fr>0.9) && gate>-0.8 && d>1.0) return 'csf';
    if(Math.abs(fr-0.5)<0.13 && d>2.0 && rho<core+11 && gate>-0.3) return 'wm';
    return 'gm'; };
  return CB; }
/* 側頭葉下部（脳回・脳溝） */
var TC=null;
function tlobe(){ if(TC) return TC; var r=rng(41), seeds=[];
  [TL,TR].forEach(function(T,si){ var n=T.length, cx=0, cy=0; T.forEach(function(p){ cx+=p[0]; cy+=p[1]; }); cx/=n; cy/=n;
    for(var i=0;i<n;i+=Math.max(1,Math.round(n/ (8+r()*2)))){ var p=T[i]; var a=Math.atan2(cy-p[1],cx-p[0])+(r()-0.5)*0.5; seeds.push([p[0]+Math.cos(a)*0.3,p[1]+Math.sin(a)*0.3,a,7+r()*7,0.45+r()*0.3]); } });
  var sul=K.grow(seeds,{seed:9, gap:2.6, pb:0.5, pt:0.15, stop:function(x,y){ return !(inTL(x,y)||inTR(x,y)); }});
  TC=K.cortex({bb:[-60,-52,60,-12], h:0.25, mask:function(x,y){ return inTL(x,y)||inTR(x,y); }, sulci:sul, thick:function(x,y){ return 2.5+0.3*Math.sin(0.4*x+0.3*y); }});
  return TC; }
/* 乳突蜂巣：ランダムな点の Voronoi で、境界（骨梁）以外を空気に */
var MC=(function(){ var r=rng(77), o=[]; for(var k=0;k<70;k++) o.push([44+r()*20,4+r()*40]); return o; })();
function mastoidFn(s){ return function(x,y,c){ var X=s*x; var reg=[[45,8],[52,4.5],[59,8],[63,16],[63,30],[58,41],[51.5,41],[49,31],[47,20]]; if(!inPoly(X,y,reg)) return null;
  var d1=99,d2=99; for(var i=0;i<MC.length;i++){ var dd=Math.hypot(X-MC[i][0],y-MC[i][1]); if(dd<d1){ d2=d1; d1=dd; } else if(dd<d2) d2=dd; } return (d2-d1)<0.55?'bone':'air'; }; }
/* 篩骨蜂巣 */
var EC=(function(){ var r=rng(19), o=[]; for(var k=0;k<24;k++) o.push([-13+r()*26,-93+r()*40]); return o; })();
function ethFn(x,y,c){ if(Math.abs(x)>13.6||y<-95.4||y>-53.6) return null; if(Math.abs(x)<0.7) return 'bone'; var d1=99,d2=99; for(var i=0;i<EC.length;i++){ var dd=Math.hypot(x-EC[i][0],y-EC[i][1]); if(dd<d1){ d2=d1; d1=dd; } else if(dd<d2) d2=dd; }
  if(d2-d1<0.5) return 'bone'; if(d2-d1<1.1) return 'mucosa'; return 'air'; }

function headPF(){
  var sh=M([
    /* 頭皮 */
    toB('skin',skin,0,0), toB('fat',offs(skin,-2.0),0,0,96,true),
    /* 後頸部の筋（半棘筋・頭板状筋）と項靱帯 */
    mir(function(s){ return [SP('muscle',mx(s,[[2,85],[14,83],[28,78],[40,70],[44,73],[34,84],[20,91],[6,93.5],[2,93]])), SL('fat',mx(s,[[18,82],[24,88]]),0.7)]; }),
    S('fat',0,84,0,95,0.9),
    /* 側頭筋・側頭筋膜 */
    mir(function(s){ return [SP('galea',mx(s,[[58,-60],[66.5,-48],[68.5,-30],[68.2,-12],[63,-8],[61,-28],[60,-46]])), SP('muscle',mx(s,[[58.5,-57],[65.4,-47],[67.2,-30],[66.8,-14],[62.5,-10],[60.5,-28],[59.8,-45]]))]; }),
    /* 頭蓋（外形をいったん骨で埋め、後で腔をくり抜く） */
    toB('bone',[[0,-97],[12,-94],[24,-92],[40,-90],[52,-80],[57,-62],[60.5,-45],[61.5,-28],[61.5,-12],[65.5,-4],[66,8],[64.5,24],[61,42],[54,58],[42,73],[24,83.5],[0,87.5],[-24,83.5],[-42,73],[-54,58],[-61,42],[-64.5,24],[-66,8],[-65.5,-4],[-61.5,-12],[-61.5,-28],[-60.5,-45],[-57,-62],[-52,-80],[-40,-90],[-24,-92],[-12,-94]],0,0),
    /* 後頭骨の板間層 */
    mir(function(s){ return SL('marrow_r',mx(s,[[0,82.5],[14,80.5],[27,76],[38,68.5],[47,58],[53,46]]),1.9); }),
    /* 斜台・錐体尖の骨髄 */
    SP('marrow_r',[[-9.5,-20.5],[9.5,-20.5],[10.5,-11],[7,-8],[0,-7.5],[-7,-8],[-10.5,-11]]),
    mir(function(s){ return SP('marrow_r',mx(s,[[14,-12],[19,-15],[22,-12],[18,-8.5]])); }),
    /* 眼窩（下部）：眼窩脂肪・下直筋・外直筋・眼球下部 */
    mir(function(s){ return [SP('fat',mx(s,[[16,-92],[28,-98.5],[42,-94],[50,-84],[48,-72],[40,-60],[30,-52.5],[22,-54],[17,-64],[15.3,-80]])),
      SL('muscle',mx(s,[[30,-74],[27,-64],[22.5,-56]]),2.0), SL('muscle',mx(s,[[44,-74],[41,-66],[36,-59]]),1.3),
      E('sclera',s*31,-85,9.2,8.4,s*6), E('vitreous',s*31,-85,8.4,7.6,s*6)]; }),
    /* 鼻腔・篩骨蜂巣 */
    SP('bone',[[-15,-97],[15,-97],[15.4,-52],[-15.4,-52]]), SP('mucosa',[[-14,-96.2],[14,-96.2],[14.4,-53],[-14.4,-53]]), F('air',[-14,-97,14,-52],ethFn),
    SP('air',[[-5,-96],[5,-96],[6,-92],[-6,-92]]), S('cart_ear',0,-99,0,-91,0.9),
    /* 蝶形骨洞（粘膜と中隔） */
    OP('mucosa',[[-16,-49],[-6,-50.5],[6,-50.5],[16,-49],[17.5,-36],[14,-25],[0,-23.5],[-14,-25],[-17.5,-36]],0),
    OP('air',[[-16,-49],[-6,-50.5],[6,-50.5],[16,-49],[17.5,-36],[14,-25],[0,-23.5],[-14,-25],[-17.5,-36]],-1.1),
    S('bone',3,-50,-1,-24,0.6),
    /* 中頭蓋窩：硬膜→髄液→側頭葉 */
    mir(function(s){ return [OP('dura',mcf(s),0), OP('csf',mcf(s),-0.6)]; }),
    F('wm',[-60,-52,60,-12],function(x,y){ return tlobe()(x,y); }),
    /* 海綿静脈洞下部と内頸動脈（破裂孔〜海綿静脈洞部）、錐体部の頸動脈管 */
    mir(function(s){ return [E('vein',s*20,-30.5,3.6,4.6), E('artery',s*20,-30,2.4,2.5), S('bone',s*26,-20.5,s*19.5,-26,3.2), S('artery',s*28.5,-17.5,s*20,-27,2.2)]; }),
    /* 後頭蓋窩：硬膜→髄液 */
    toB('dura',pf,0,36), toB('csf',offs(pf,-0.6),0,36,96,true),
    /* 内後頭稜 */
    Pg('bone',[[-2.2,77.8],[2.2,77.8],[0.8,71.5],[-0.8,71.5]]),
    /* 小脳（半球・虫部） */
    F('gm',[-50,8,50,76],function(x,y){ return cbl()(x,y); }),
    /* 歯状核 */
    mir(function(s){ return [E('dentate',s*15.5,37,5.6,3.6,s*35,0.13,9,0), E('wm',s*15.5,37,3.6,1.8,s*35)]; }),
    /* 中小脳脚（橋から小脳の髄体へ） */
    mir(function(s){ return SP('wm',mx(s,[[12.5,3],[18.5,4],[24.5,9],[30,16],[30.5,24],[26,29],[18,30.6],[10.5,29.2],[9.6,24.5],[13,18]])); }),
    /* 橋（底部・被蓋）。底部の中を皮質脊髄路と横走線維が通る */
    Pg('bstem',PS),
    F('wm',[-19,-1,19,23],function(x,y,c){ if(c!=='bstem'||y>13.5+0.04*x*x) return null; var cst=mir(function(s){ return Math.hypot((x-s*7)/3.6,(y-6.5)/2.6)<1; }); if(cst[0]||cst[1]) return 'wm';
      return null; }),
    SP('csf',[[-1.2,-0.6],[1.2,-0.6],[0.8,1.3],[-0.8,1.3]]),
    /* 内側縦束付近の白質、第四脳室（顔面神経丘のふくらみ） */
    mir(function(s){ return E('wm',s*2.6,19.5,1.4,1.8); }),
    SP('csf',[[0,21.8],[2.2,22.6],[4.6,21.8],[7.6,22.6],[10,24.6],[9.6,27],[6,29],[2.8,30],[0,30.6],[-2.8,30],[-6,29],[-9.6,27],[-10,24.6],[-7.6,22.6],[-4.6,21.8],[-2.2,22.6]]),
    /* 片葉（小脳橋角へ突出） */
    mir(function(s){ return [E('gm',s*21.5,10.2,3.2,2.2,-s*25), E('wm',s*21.6,10.6,1.4,0.8,-s*25)]; }),
    /* 錐体骨の内部：内耳道（髄液）・顔面神経／前庭蝸牛神経・蝸牛・前庭・半規管・中耳・外耳道 */
    mir(function(s){ return [
      E('csf',s*21.2,1.8,3.8,2.6,-s*20), S('csf',s*21,1.4,s*30.6,-2.2,2.3),
      SL('nerve',mx(s,[[17.4,7.4],[19.6,3.8],[22,0.6],[26,-1.4],[30.2,-3.2]]),0.55),
      SL('nerve',mx(s,[[17.8,9.2],[20.4,5.2],[22.6,2.6],[26.4,0.6],[30.4,-1.1]]),0.8),
      E('labyr',s*31.6,-8.6,4.4,3.8,s*30), E('bone',s*31.6,-8.6,2.9,2.4,s*30), E('labyr',s*31.6,-8.6,2.1,1.7,s*30), E('bone',s*31.3,-8.2,0.9,0.9),
      E('labyr',s*35.8,0.6,2.2,3.0,-s*15),
      E('labyr',s*39.8,4.2,3.1,2.7,s*10), E('bone',s*39.8,4.2,2.3,1.9,s*10),
      S('labyr',s*36.2,7.4,s*40.2,13.2,0.65),
      SP('air',mx(s,[[40.5,-11],[45,-12.5],[48.5,-7],[48,1],[45.5,4],[42.5,2],[40.8,-4]])), E('bone',s*44.6,-4.2,1.4,1.8), E('bone',s*46,0,1.0,1.3),
      E('air',s*46.2,8.2,2.8,3.2), S('air',s*48,-3.2,s*61,-1.4,2.9), S('skin',s*61.5,-1.4,s*69,-0.4,3.6), S('air',s*61.5,-1.4,s*73,-0.2,2.6),
      F('air',[s>0?44:-64,4,s>0?64:-44,42],mastoidFn(s)),
      E('vein',s*13.4,-7.2,1.1,1.1),
      SL('vein',mx(s,[[45.6,21.5],[48.2,27],[49.8,33],[49.6,39]]),2.5), SL('vein',mx(s,[[49.6,39],[48.4,45],[45,51]]),1.2)
    ]; }),
    /* 耳介（軟骨の弯曲） */
    mir(function(s){ return [SP('skin',mx(s,[[71,-6],[78,-4],[83,4],[84,16],[80,28],[74,32],[71.5,24]])), SL('cart_ear',mx(s,[[74,-2],[79.5,4],[81,15],[77.5,25]]),0.7)]; }),
    /* 動脈：椎骨脳底動脈移行部・前下小脳動脈（内耳道近くのループ） */
    E('artery',-1.4,-3.0,1.9,1.7), E('artery',1.6,-3.2,1.8,1.6),
    mir(function(s){ return [E('artery',s*17.2,4.2,0.65,0.65), E('artery',s*19.6,6.2,0.55,0.55), E('artery',s*11.5,-1.8,0.6,0.6)]; })
  ]);
  return sh;
}
function headPFLes(){ return [
  {id:'vs', n:'前庭神経鞘腫（右・内耳道〜小脳橋角）', shapes:[
    F('schwannoma',[-32,-5,-17,6],function(x,y,c){ if(c!=='csf'&&c!=='nerve') return null; var ax=-30.6+21, ay=-2.2-1.4, t=((x+21)*ax+(y-1.4)*ay)/(ax*ax+ay*ay); t=Math.max(0,Math.min(1,t)); return Math.hypot(-21+t*ax-x,1.4+t*ay-y)<2.4?'schwannoma':null; }),
    SP('csf',[[-21.8,-0.8],[-16,-1.2],[-11.4,3],[-10.2,9.8],[-13,15.6],[-19,17.8],[-25.2,15],[-27.4,9],[-25.4,3]]),
    SP('schwannoma',[[-21.6,0.2],[-16.4,-0.2],[-12.4,3.6],[-11.4,9.6],[-13.8,14.6],[-19,16.6],[-24.2,14],[-26.2,8.8],[-24.6,3.4]])]},
  {id:'cblinf', n:'小脳梗塞（左PICA域）', shapes:[F('infarct',[6,38,50,76],function(x,y,c){ if(c!=='gm'&&c!=='wm'&&c!=='dentate') return null; var q=Math.pow((x-22)/18,2)+Math.pow((y-58)/15,2); return q<1+0.12*Math.sin(5*Math.atan2(y-58,x-22))?'infarct':null; })]},
  {id:'cav', n:'海綿状血管腫（橋・左被蓋）', shapes:[E('hemo_rim',6.2,15.2,4.3,3.7,20,0.08,6,0), E('cav_core',6.2,15.2,3.0,2.5,20,0.15,5,1)]}
]; }

MS.PHANTOMS.headPF = {n:'頭部（後頭蓋窩・内耳道レベル・軸位）', P:240, plane:'ax', coil:'head', coilG:1.0, fov:230, pe:'RL', shapes:headPF, les:headPFLes, motion:{resp:0, card:0}, region:'brain', ab:['nerve','csf']};
})();
