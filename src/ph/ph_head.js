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
var K=MS.PH_BK, SP=K.SP, SL=K.SL, mx=K.mx;

MS.addTissues({
  galea:{n:'帽状腱膜・側頭筋膜', T1:[700,800], T2:[18,16], T2s:[8,6], PD:0.45, ADC:0.6, mt:0.35, fa:0.5, src:'est'}
});

/* ---------- 頭部（基底核レベル軸位：モンロー孔〜第三脳室） ---------- */
/* 脳表の輪郭（θ=0 が患者左、+y が後方）。前頭部は細く、側頭部でふくらみ、右前頭・左後頭がわずかに突出（petalia） */
function gB(x,y){ var yc=0.5, front=y<yc; var a=62.6-(front?7.5*Math.pow(Math.max(0,12-y)/92,2):6.5*Math.pow(Math.max(0,y-12)/70,2.2));
  var b=(front?80.5+1.4*Math.tanh(-x/8):80+1.6*Math.tanh(x/8)); var pw=front?2.3:2.05;
  return Math.pow(Math.abs(x)/a,pw)+Math.pow(Math.abs(y-yc)/b,pw)-1; }
var RT=(function(){ var n=1440, o=new Float32Array(n+1); for(var i=0;i<=n;i++){ var t=2*Math.PI*i/n, c=Math.cos(t), s=Math.sin(t), lo=30, hi=100;
  for(var k=0;k<30;k++){ var m=(lo+hi)/2; if(gB(m*c,m*s)<0) lo=m; else hi=m; } o[i]=lo+0.45*Math.sin(6*t+0.7)+0.3*Math.sin(11*t+2)+0.2*Math.sin(17*t+1); } return o; })();
function Rb(t){ var n=1440; var u=((t/(2*Math.PI))%1+1)%1*n, i=Math.floor(u), f=u-i; return RT[i]*(1-f)+RT[i+1]*f; }
/* 外側の層の厚さ（mm）。側頭部（|cosθ|大）は板間層が薄く、側頭筋がある */
function lat(t){ return Math.pow(Math.abs(Math.cos(t)),4); }
function tCSF(t){ var s=Math.sin(t); return 1.5+1.3*Math.pow(Math.max(0,-s),2)+0.4*Math.pow(Math.max(0,s),3); }
function tDip(t){ var s=Math.sin(t); return 0.6+3.0*(1-0.9*lat(t))+1.2*Math.pow(Math.max(0,s),4); }
function tMus(t){ var c=Math.abs(Math.cos(t)), s=Math.sin(t); return c<0.3?0:4.6*Math.exp(-Math.pow((s+0.2)/0.42,2))*Math.pow(Math.min(1,(c-0.3)/0.55),1.5); }
var LY=(function(){ var f={}; f.br=Rb; f.csf=function(t){ return Rb(t)+tCSF(t); }; f.dura=function(t){ return f.csf(t)+0.6; }; f.it=function(t){ return f.dura(t)+1.4; };
  f.dip=function(t){ return f.it(t)+tDip(t); }; f.ot=function(t){ return f.dip(t)+1.7-0.4*lat(t); }; f.mus=function(t){ return f.ot(t)+tMus(t); };
  f.gal=function(t){ return f.mus(t)+0.7; }; f.fat=function(t){ return f.gal(t)+3.6+0.8*Math.pow(Math.max(0,Math.sin(t)),2); }; f.skin=function(t){ return f.fat(t)+2.0; }; return f; })();
function onR(fn,t,dr){ var r=fn(t)+(dr||0); return [r*Math.cos(t), r*Math.sin(t)]; }
function inBrain(x,y){ return Math.hypot(x,y)<Rb(Math.atan2(y,x)); }
/* 大脳縦裂（前方は脳梁膝の手前まで、後方は膨大部の後ろから）。脳表に近いほど広がる */
var FIS_A=-46.5, FIS_P=44.5;
function inFis(x,y){ if(y>FIS_A&&y<FIS_P) return false; var r=Math.hypot(x,y), ds=Rb(Math.atan2(y,x))-r; var w=1.25+3.2*Math.exp(-ds/2.6); return Math.abs(x)<w; }
/* 島・シルビウス裂（左 s=+1）：島槽（島の表面に沿う）と外側への幹、前水平枝 */
function sylv(s){ return [
  {p:mx(s,[[38.4,-26],[40.2,-19],[41.3,-11],[41.6,-4],[41.2,3],[40.2,10],[38.4,16]]), w0:0.8, w1:0.8},
  {p:mx(s,[[41.5,-4],[46.5,-3],[51,-1],[55.5,2],[60,4.5],[63.5,5.8]]), w0:0.85, w1:1.4},
  {p:mx(s,[[46.5,-3.2],[50.5,-9],[53,-13],[54.5,-18]]), w0:0.7, w1:0.35},
  {p:mx(s,[[51,-1],[53,-6.5],[55,-9]]), w0:0.5, w1:0.3},
  {p:mx(s,[[40.4,-17],[37.6,-16]]), w0:0.4, w1:0.3}, {p:mx(s,[[41,-6],[38.2,-5.5]]), w0:0.4, w1:0.3}, {p:mx(s,[[40.6,5],[37.8,5.5]]), w0:0.4, w1:0.3}
]; }
var CTX=null;
function ctx(){ if(CTX) return CTX;
  var r=rng(23), seeds=[];
  /* 外側面：表面に沿って 9.5–14 mm おきに種を置く */
  var t=0.07; while(t<2*Math.PI){ var R=Rb(t), x=R*Math.cos(t), y=R*Math.sin(t); var ok=Math.abs(x)>7 && !(Math.abs(x)>40&&y>-9&&y<10);
    if(ok){ var p1=onR(Rb,t-0.01), p2=onR(Rb,t+0.01); var tx=p2[0]-p1[0], ty=p2[1]-p1[1]; var nxv=ty, nyv=-tx; if(nxv*x+nyv*y>0){ nxv=-nxv; nyv=-nyv; } var a=Math.atan2(nyv,nxv)+(r()-0.5)*0.35;
      var front=y<-30, back=y>35; var L=(front?14:back?15:13)+r()*10; seeds.push([x+Math.cos(a)*0.3,y+Math.sin(a)*0.3,a,L,0.5+r()*0.35]); }
    t+=(8+r()*4.5)/R; }
  /* 内側面（大脳縦裂の壁）：前頭葉内側・後頭葉内側 */
  [-1,1].forEach(function(s){ for(var y=-79+r()*3;y<-50;y+=10+r()*3) seeds.push([s*1.3,y,(s>0?0:Math.PI)+s*(r()-0.3)*0.5,8+r()*7,0.45+r()*0.2]);
    for(var y2=52+r()*3;y2<79;y2+=10+r()*3) seeds.push([s*1.3,y2,(s>0?0:Math.PI)-s*(r()-0.2)*0.5,8+r()*8,0.45+r()*0.2]); });
  var fixed=[].concat(sylv(-1),sylv(1),[{p:[[0,-84],[0,-60],[0,-47]],w0:0.3,w1:0.3},{p:[[0,45],[0,60],[0,84]],w0:0.3,w1:0.3}]);
  [-1,1].forEach(function(s){ fixed.push({p:mx(s,[[1.3,-53],[6,-52],[11,-48.5],[15,-44],[17,-39]]), w0:0.55, w1:0.35});   /* 帯状溝（脳梁膝を囲む） */
    fixed.push({p:mx(s,[[1.3,57],[6,53.5],[10.5,50.5],[14,49]]), w0:0.6, w1:0.35}); });                                   /* 頭頂後頭溝 */
  var sul=K.grow(seeds,{seed:5, fixed:fixed, gap:2.7, w1:0.28, pb:0.6, pt:0.15,
    stop:function(x,y){ return !inBrain(x,y)||Math.abs(x)<1.6|| Math.pow(x/40,2)+Math.pow((y-2)/52,2)<1 || Rb(Math.atan2(y,x))-Math.hypot(x,y)>27; }});
  CTX=K.cortex({bb:[-68,-90,68,90], h:0.25, mask:function(x,y){ return inBrain(x,y)&&!inFis(x,y); }, src:null, sulci:sul,
    thick:function(x,y){ return 2.45+0.45*(0.5+0.5*Math.sin(0.23*x+0.31*y+1)); }});
  return CTX; }
function brainFn(x,y){ return ctx()(x,y); }
function head(){
  var sh=M([
    K.polar('skin',0,0,LY.skin), K.polar('fat',0,0,LY.fat), K.polar('galea',0,0,LY.gal), K.polar('muscle',0,0,LY.mus),
    K.polar('bone',0,0,LY.ot), K.polar('marrow_y',0,0,LY.dip), K.polar('bone',0,0,LY.it), K.polar('dura',0,0,LY.dura), K.polar('csf',0,0,LY.csf),
    F('wm',[-68,-90,68,90],brainFn),
    /* 大脳鎌 */
    S('dura',0,-LY.dura(-Math.PI/2)+0.5,0,-50.5,0.4), S('dura',0,48,0,LY.dura(Math.PI/2)-0.5,0.4),
    /* 脳梁膝・膨大（小鉗子・大鉗子へ続く白質） */
    SP('wm',[[-15,-33],[-11,-41.5],[0,-45.2],[11,-41.5],[15,-33],[9,-31],[0,-34],[-9,-31]]),
    SP('wm',[[-17,33],[-9,30],[0,29.5],[9,30],[17,33],[13,40],[0,42.2],[-13,40]]),
    mir(function(s){ var a=1+0.03*s; return [
      /* 尾状核頭（側脳室前角の外側壁をつくる） */
      SP('gm_deep',mx(s,[[10.4,-31],[13.6,-31],[16,-27.5],[16.2,-22.5],[15,-16],[13.4,-9.5],[11.4,-4.2],[8.2,-5.4],[5.8,-9.5],[6.6,-15.5],[8.6,-22],[9.4,-28]])),
      /* レンズ核：被殻（外側）と淡蒼球（内側の楔）。尖端が内包膝に向く */
      SP('gm_deep',mx(s,[[17.6,-3],[20.2,-12],[22.8,-20.5],[24.8,-22.4],[27.4,-21.5],[29.6,-17],[31.2,-10],[31.8,-2],[31,5],[29.6,10],[28,13],[26,15.4],[24.4,14.5],[21.8,8],[19.2,1.5]])),
      SP('gp',mx(s,[[18.5,-2.6],[20.6,-10],[22,-13.4],[23.8,-9.5],[24.8,-3],[24.4,3],[23.2,7.6],[20.6,3]])),
      S('wm',s*20.8,-8.5,s*22,2.5,0.3),
      /* 線条体の灰白質橋（内包前脚を横切る） */
      S('gm_deep',s*15.6,-22,s*22.6,-19.5,0.45), S('gm_deep',s*15.8,-16,s*21.2,-14,0.4), S('gm_deep',s*15.2,-11,s*19.6,-9.2,0.35),
      /* 前障 */
      SL('gm',mx(s,[[33.7,-24],[34.6,-14],[35,-4],[34.6,6],[33.5,14]]),0.55),
      /* 視床（内側は第三脳室、後方は視床枕） */
      SP('gm_deep',mx(s,[[3,-4.2],[6,-6.2],[9.8,-5],[11.8,-3],[12.6,-0.5],[15,7],[17.6,14],[19.6,20],[19.2,23.6],[16,26],[11,25.6],[6.5,23],[3.6,18.5],[2.4,10],[2.3,2]])),
      /* 側脳室前角（透明中隔を挟む） */
      SP('csf',mx(s,[[1.25,-30],[2.4,-33.6*a],[5.2,-34.8*a],[8.4*a,-33.4],[10.6*a,-30.6],[9.8*a,-27.2],[7.8,-22.5],[6.3,-17],[5.0,-12],[3.8,-8.4],[2.7,-6.8],[1.25,-7.4]])),
      /* 脳弓柱 */
      E('wm',s*2.2,-6.2,1.25,1.6),
      /* 三角部と後角（視床枕の後外側、大鉗子に囲まれる） */
      SP('csf',mx(s,[[16.8,24.2],[21,21.8],[25.4*a,22.2],[28.8*a,26.2],[29.4*a,31],[28*a,36],[25.6,41],[23.6,46.5],[21.6,52.5],[19.6*a,57.5],[18.2,54],[18.4,47],[17.4,40],[16.2,34],[15.6,28]])),
      E('choroid',s*24.2,31,3.6,5,-s*20,0.12,5,s),
      /* 鳥距（後角内側壁のくぼみ） */
      E('wm',s*16.2,45,1.6,3.5,s*15)
    ]; }),
    /* 第三脳室・中間帆槽・内大脳静脈 */
    SP('csf',[[-1.7,-5],[1.7,-5],[1.9,6],[2.0,16],[1.4,18],[-1.4,18],[-2.0,16],[-1.9,6]]),
    SP('csf',[[-2.2,17],[2.2,17],[2.6,21.5],[1.6,25.5],[-1.6,25.5],[-2.6,21.5]]),
    mir(function(s){ return SL('vein',mx(s,[[1.6,12],[1.7,18],[1.45,23.5],[0.9,28]]),0.75); }),
    /* 中大脳動脈（M2/M3：島槽と外側溝の中） */
    mir(function(s){ return [E('artery',s*40.3,-19,0.9,1.0), E('artery',s*41.4,-10.5,1.0,1.0), E('artery',s*41.6,-1.5,0.9,1.0), E('artery',s*40.5,9,0.8,0.8), E('artery',s*46.5,-3,0.9,0.9), E('artery',s*55.4,2,0.75,0.75),
      E('artery',s*1.0,-49,0.8,0.8), E('artery',s*0.9,-62,0.6,0.6), E('artery',s*1.0,58,0.6,0.6)]; }),
    /* 浅中大脳静脈（外側溝の出口） */
    mir(function(s){ var p=onR(LY.br,s>0?0.09:Math.PI-0.09,0.9); return E('vein',p[0],p[1],1.0,1.0); }),
    /* 上矢状静脈洞（前後の三角） */
    Pg('vein',[[-4.5,-LY.it(-Math.PI/2)+0.3],[4.5,-LY.it(-Math.PI/2)+0.3],[0,-LY.it(-Math.PI/2)+6.2]]),
    Pg('vein',[[-5,LY.it(Math.PI/2)-0.3],[5,LY.it(Math.PI/2)-0.3],[0,LY.it(Math.PI/2)-6.8]]),
    /* 浅側頭動静脈（皮下脂肪の中） */
    mir(function(s){ var t=s>0?-0.38:Math.PI+0.38; var p=onR(LY.gal,t,1.6), q=onR(LY.gal,t+(s>0?-0.05:0.05),1.8); return [E('artery',p[0],p[1],0.8,0.8), E('vein',q[0],q[1],0.9,0.9)]; })
  ]);
  /* 脳表の静脈（くも膜下腔の中だけ） */
  var r=rng(7); for(var k=0;k<30;k++){ var t=r()*Math.PI*2, p=onR(LY.br,t,0.8+r()*0.5), rr=0.6+r()*0.4;
    sh.push(F('vein',[p[0]-rr,p[1]-rr,p[0]+rr,p[1]+rr],(function(cx,cy,R){ return function(x,y,c){ return (c==='csf')&&Math.hypot(x-cx,y-cy)<R?'vein':null; }; })(p[0],p[1],rr))); }
  return sh;
}
function headLes(){
  var tm=Math.atan2(-0.62,-0.78), u=[Math.cos(tm),Math.sin(tm)], Rd=LY.dura(tm), mc=[u[0]*(Rd-8.6),u[1]*(Rd-8.6)], deg=tm*180/Math.PI+90;
  function tail(dt){ var o=[]; for(var k=0;k<=4;k++){ var t=tm+dt*(0.13+k*0.035); o.push(onR(LY.dura,t,-0.5)); } return PL('meningioma',o,0.45); }
  return [
  {id:'infarct', n:'急性期脳梗塞（左MCA域）', shapes:[F('infarct',[16,-56,68,50],function(x,y,c){ if(!(c==='gm'||c==='wm'||c==='gm_deep'||c==='gp')) return null;
      var q=Math.pow((x-52)/36,2)+Math.pow((y+3)/47,2); return (q<1&&x>17.5)?'infarct':null; })]},
  {id:'glioma', n:'膠芽腫（右前頭葉）', shapes:[F('edema',[-62,-74,-4,-12],function(x,y,c){ var th=Math.atan2(y+42,x+30); var q=Math.pow((x+30)/26,2)+Math.pow((y+42)/23,2); var k=1+0.18*Math.sin(5*th+1)+0.08*Math.sin(9*th);
      return (c==='wm')&&q<k*k?'edema':null; }),
      E('tumor_rim',-30,-43,12.5,10.5,20,0.12,4,1), E('necrosis',-30.5,-43,7,5.8,20,0.15,3,0)]},
  {id:'hem', n:'脳内血腫（左視床）', opt:'hemStage', dyn:function(st){ return hemShapes(st); }},
  {id:'ms', n:'多発性硬化症（脳室周囲）', shapes:[F('ms',[-60,-60,60,62],function(x,y,c){ if(c!=='wm'&&c!=='gm') return null;
      /* 側脳室に垂直な卵円形（Dawson 指）＋傍皮質 */
      var L=[[-13.5,-36.5,2.6,5.0,-0.6],[12.5,-37.5,2.4,4.6,0.55],[31.5,30,2.6,5.2,1.1],[-31,33,2.4,4.6,-1.0],[27,47,2.2,4.0,0.7],[46,-34,2.4,3.4,0.4],[-21,-8,2.0,2.6,0]];
      for(var i=0;i<L.length;i++){ var q=L[i], dx=x-q[0], dy=y-q[1], ca=Math.cos(q[4]), sa=Math.sin(q[4]); var uu=dx*ca+dy*sa, vv=-dx*sa+dy*ca; if(uu*uu/(q[2]*q[2])+vv*vv/(q[3]*q[3])<1) return 'ms'; } return null; })]},
  {id:'mening', n:'髄膜腫（右前頭部円蓋部）', shapes:[E('csf',mc[0],mc[1],15.4,10.6,deg), E('meningioma',mc[0]-u[0]*0.3,mc[1]-u[1]*0.3,14,9.6,deg,0.04,5,0), tail(1), tail(-1)]}
]; }
function hemShapes(stage){ var o=[]; if(stage==='chronic') o.push(E('hemo_rim',10.5,10,9.2,7.6,-15)); o.push(E('hem',10.5,10,stage==='chronic'?7.4:9,stage==='chronic'?5.8:7.4,-15,0.06,5,0)); return o; }

MS.PHANTOMS.head =    {n:'頭部（基底核レベル・軸位）', P:240, plane:'ax', coil:'head', coilG:1.0, fov:230, pe:'RL', shapes:head, les:headLes, motion:{resp:0, card:0}, region:'brain'};
MS.hemShapes=hemShapes;
})();
