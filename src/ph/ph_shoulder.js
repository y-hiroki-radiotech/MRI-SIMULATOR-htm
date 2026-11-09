(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir, ribs=P.ribs, spine=P.spine;
MS.addTissues({
  labrum:{n:'関節唇（線維軟骨）', T1:[700,800], T2:[9,8], T2s:[5,4], PD:0.5, ADC:0.8, mt:0.3, tx:{f:.03}, src:'est'},
  bplex: {n:'腕神経叢・腋窩神経', T1:[1000,1250], T2:[65,58], T2s:[35,25], PD:0.72, ADC:1.3, mt:0.3, fa:0.5, src:'est'}
});
/* ---------- 補助 ---------- */
function crs(p,n){ var o=[], m=p.length; for(var k=0;k<n;k++){ var t=k/(n-1)*(m-1), i=Math.min(m-2,Math.floor(t)), f=t-i;
  var a=p[Math.max(0,i-1)], b=p[i], c=p[i+1], d=p[Math.min(m-1,i+2)]; o.push([cr(a[0],b[0],c[0],d[0],f), cr(a[1],b[1],c[1],d[1],f)]); } return o; }
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function lerpA(a,t){ if(typeof a==='number') return a; var x=t*(a.length-1), i=Math.min(a.length-2,Math.floor(x)), f=x-i; return a[i]*(1-f)+a[i+1]*f; }
function bandPts(pts,hw,n){ n=n||Math.max(12,pts.length*6); var c=crs(pts,n), L=[], R=[];
  for(var k=0;k<n;k++){ var a=c[Math.max(0,k-1)], b=c[Math.min(n-1,k+1)]; var dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1; var nx=-dy/l, ny=dx/l, w=lerpA(hw,k/(n-1));
    L.push([c[k][0]+nx*w, c[k][1]+ny*w]); R.push([c[k][0]-nx*w, c[k][1]-ny*w]); }
  return L.concat(R.reverse()); }
function band(L,pts,hw,n){ return Pg(L,bandPts(pts,hw,n)); }
function segD(x,y,a,b){ var ax=b[0]-a[0], ay=b[1]-a[1], L2=ax*ax+ay*ay, t=L2?((x-a[0])*ax+(y-a[1])*ay)/L2:0; t=t<0?0:t>1?1:t; var px=a[0]+t*ax-x, py=a[1]+t*ay-y; return Math.sqrt(px*px+py*py); }
function lineD(x,y,p){ var d=1e9; for(var i=0;i<p.length-1;i++){ var q=segD(x,y,p[i],p[i+1]); if(q<d) d=q; } return d; }
function polyD(x,y,p){ var d=1e9; for(var a=0,b=p.length-1;a<p.length;b=a++){ var q=segD(x,y,p[b],p[a]); if(q<d) d=q; } return d; }
function inPoly(x,y,p){ var c=false; for(var a=0,b=p.length-1;a<p.length;b=a++){ if(((p[a][1]>y)!==(p[b][1]>y)) && (x<(p[b][0]-p[a][0])*(y-p[a][1])/(p[b][1]-p[a][1])+p[a][0])) c=!c; } return c; }
function bb(p,m){ m=m||0; var xs=p.map(function(q){return q[0];}), ys=p.map(function(q){return q[1];}); return [Math.min.apply(null,xs)-m,Math.min.apply(null,ys)-m,Math.max.apply(null,xs)+m,Math.max.apply(null,ys)+m]; }
function boneP(pts,th,mar){ return [Pg('bone',pts), F(mar,bb(pts),function(x,y){ return inPoly(x,y,pts)&&polyD(x,y,pts)>th?mar:null; })]; }

/* ---------- 肩（斜冠状断：棘上筋に平行、画像の左＝内側、上＝頭側） ---------- */
var HC=[12,6], HR=23;                     /* 上腕骨頭の中心と半径（mm） */
var RC=HR+1.6, RG=RC+1.8;                 /* 骨頭軟骨の外縁・関節窩骨面 */
var GP=[[-1,-19],[-10,-20.5],[-20,-15],[-27,-6],[-31,1],[-31,9],[-25,17],[-14,27],[-1,30]];   /* 関節窩〜頸部 */
var BUR=[[-14,-28.4],[0,-27.4],[12,-25.4],[24,-21.9],[32.5,-16.6],[38.6,-9.5],[40.2,2],[40,16],[38,30]];  /* 肩峰下-三角筋下滑液包の脂肪層 */
var SST=[[-17,-24.4],[-2,-23.2],[12,-21.0],[24,-17.6],[31.5,-12.6],[35,-8.5]];
var OUT=[[-110,-66],[-60,-64],[-24,-58],[8,-54],[34,-48],[53,-36],[63,-16],[66,8],[65,40],[62,70],[59,110],[-110,110]];
function ang(x,y){ return (Math.atan2(y-HC[1],x-HC[0])*180/Math.PI+360)%360; }
function shoulder(){
  var sh=[], rr=rng(17);
  /* 皮膚・皮下脂肪 */
  sh.push(Pg('skin',OUT), F('fat',[-110,-70,70,110],function(x,y){ return inPoly(x,y,OUT)&&polyD(x,y,OUT)>2.2?'fat':null; }));
  /* 胸壁（内側下方）：肋骨・肋間筋・前鋸筋 */
  sh.push(band('muscle',[[-100,52],[-86,70],[-78,100]],[6,7,6]));
  [[-97,62],[-88,82],[-83,102]].forEach(function(r){ sh.push(E('bone',r[0],r[1],5.5,7,30), E('marrow_r',r[0],r[1],3.8,5.3,30)); });
  /* 僧帽筋（上方）・棘上筋（筋腹）・肩甲下筋/棘下筋（肩甲骨の下）・小円筋/大円筋・上腕三頭筋長頭 */
  sh.push(band('muscle',[[-110,-52],[-70,-50],[-36,-47],[-14,-44.5],[2,-44]],[7,7,6,4,2.5]));
  sh.push(band('fat',[[-110,-4],[-76,-8],[-48,-15],[-28,-21.5],[-12,-24.8]],[16.2,14.2,11.2,7.2,4.2]));
  sh.push(band('muscle',[[-110,-4],[-76,-8],[-48,-15],[-28,-21.5],[-12,-24.8]],[15,13,10,6,3.2]));
  sh.push(Pg('muscle',[[-110,24],[-70,18],[-46,15],[-34,24],[-32,34],[-50,44],[-80,50],[-110,52]]));
  sh.push(PL('fat',[[-110,38],[-80,36],[-50,32]],0.7));
  sh.push(band('fat',[[-110,72],[-70,74],[-36,78],[-8,86]],[9.8,8.8,7.8,5.8]), band('muscle',[[-110,72],[-70,74],[-36,78],[-8,86]],[9,8,7,5]));
  sh.push(band('fat',[[-17,30],[-18,50],[-15,75],[-10,110]],[4.8,7.8,9.8,9.8]), band('muscle',[[-17,30],[-18,50],[-15,75],[-10,110]],[4,7,9,9]));
  /* 腋窩：脂肪・腋窩動静脈・腕神経叢・後上腕回旋動脈/腋窩神経（四辺形間隙） */
  sh.push(PL('vein',[[-70,48],[-46,58],[-34,72],[-28,100]],4.6), PL('artery',[[-66,40],[-42,52],[-30,66],[-24,100]],3.2));
  sh.push(PL('bplex',[[-64,34],[-44,44],[-32,58]],1.6), PL('bplex',[[-62,30],[-40,38],[-30,48]],1.3));
  sh.push(E('artery',-2,50,1.6,1.4), E('vein',0.8,51.5,2,1.6), E('bplex',-4,52.5,1.6,1.3));
  /* 三角筋（肩峰・鎖骨外側から外側を覆う） */
  sh.push(band('muscle',[[24,-40],[42,-31],[50,-13],[51,8],[49,32],[45,62],[40,110]],[4,8,10,11,11,10,8]));
  /* 肩鎖関節・鎖骨遠位・肩峰（皮質＋骨髄） */
  var CLV=[[-66,-41],[-52,-44],[-20,-42.6],[-8.2,-40.5],[-7.4,-30],[-20,-29.8],[-50,-30.5],[-64,-33]];
  var ACR=[[-5.8,-39],[10,-37],[26,-35],[36,-31.5],[40.5,-27],[38,-23.6],[26,-25.6],[12,-27.3],[-5,-29.2]];
  sh.push(boneP(CLV,1.8,'marrow_r'), boneP(ACR,1.6,'marrow_r'));
  sh.push(S('labrum',-6.6,-38.5,-6.4,-30.5,0.7), PL('lig',[[-14,-43],[-6.5,-41.5],[2,-40.4]],1.0), PL('lig',[[-14,-28.6],[-6.5,-28.4],[0,-28.6]],0.6));
  /* 肩甲骨（関節窩・頸部・体部）と肩甲上動静脈・神経 */
  sh.push(band('bone',[[-28,5],[-56,12],[-110,22]],[7,4.2,3.2]), band('marrow_r',[[-28,5],[-56,12],[-110,22]],[5.4,2.6,1.8]));
  sh.push(F('bone',bb(GP),function(x,y){ return inPoly(x,y,GP)&&Math.hypot(x-HC[0],y-HC[1])>RG?'bone':null; }));
  sh.push(F('marrow_r',bb(GP),function(x,y){ return inPoly(x,y,GP)&&Math.hypot(x-HC[0],y-HC[1])>RG+1.6&&polyD(x,y,GP)>1.6?'marrow_r':null; }));
  sh.push(F('cartilage',bb(GP),function(x,y){ var d=Math.hypot(x-HC[0],y-HC[1]); return inPoly(x,y,GP)&&d>RC&&d<=RG?'cartilage':null; }));
  sh.push(E('fat',-31,-10,4.2,3), E('artery',-30,-10.5,1.3,1.2), E('vein',-32.6,-9.2,1.7,1.4), E('bplex',-29.5,-8,1,0.9));
  /* 上腕骨：骨頭軟骨 → 骨頭・大結節・外科頸・骨幹（皮質）→ 黄色髄 → 骨端線の名残 */
  sh.push(F('cartilage',[HC[0]-RC,HC[1]-RC,HC[0]+RC,HC[1]+RC],function(x,y){ var d=Math.hypot(x-HC[0],y-HC[1]), a=ang(x,y); return d<RC&&a>=122&&a<=302?'cartilage':null; }));
  var GT=[11.5,10,9,10,13,16,18,17,13,11,11,11.6];  /* 大結節（中心 26,1） */
  var SH=[[1,18],[3,34],[4.5,60],[5.5,110],[29.5,110],[29,60],[30,36],[34,22],[37,12]];
  sh.push(E('bone',HC[0],HC[1],HR,HR), B('bone',26,1,GT,0), Pg('bone',SH));
  sh.push(E('marrow_y',HC[0],HC[1],HR-1.3,HR-1.3), B('marrow_y',26,1,GT.map(function(r){return r-1.4;}),0),
    Pg('marrow_y',[[3.2,18],[6,34],[8,60],[9,110],[26,110],[25.8,60],[27,36],[31,22],[34.5,12]]));
  sh.push(F('marrow_r',[4,16,32,70],function(x,y,c){ if(c!=='marrow_y') return null; var w=Math.sin(x*0.45+y*0.21)+Math.sin(y*0.33-x*0.17); return y>20+3*Math.sin(x*0.3)&&y<58&&w>0.4?'marrow_r':null; }));
  sh.push(PL('bone',[[34.5,15],[26,6.5],[17,3],[8,6],[-2,13],[-8,19]],0.55));
  /* 関節唇（上方・下方）、上腕二頭筋長頭腱（関節唇から）、関節包（上方・腋窩陥凹） */
  sh.push(Pg('labrum',[[-4.6,-13.6],[-12,-20.2],[-4,-21.6],[1.8,-18.8]]), Pg('labrum',[[-7.6,22.6],[-14.2,28.4],[-6,31.2],[-0.6,28.8]]));
  sh.push(PL('tendon',[[-11,-21.2],[-4,-22.2],[4,-21.6]],1.25));
  sh.push(PL('lig',[[-15,-22.4],[-6,-24],[6,-23.3]],0.7));
  sh.push(PL('lig',[[-12,29.4],[-11.5,37],[-6,44.5],[1,44],[4,37],[3.6,30]],0.8), E('fluid',-4.5,38,2.6,4.6,-10), E('fluid',3,-19.6,2,0.9,10));
  /* 棘上筋腱（大結節に付着）・肩峰下滑液包の脂肪層 */
  sh.push(PL('fat',BUR,0.9));
  sh.push(band('tendon',SST,[2.7,2.9,2.9,2.9,2.7,2.4]));
  sh.push(PL('fat',[[-26,-31],[-16,-30]],0.8));
  return M(sh);
}
function shoulderLes(){ return [
  {id:'sst_tear', n:'棘上筋腱 全層断裂（大結節付着部近傍）', shapes:[F('fluid',[14,-30,34,-12],function(x,y,c){ if(!(c==='tendon'||c==='fat'||c==='lig')) return null; var u=x-21.5-0.25*(y+20); if(Math.abs(u)>3.2+0.6*Math.sin(y)) return null; return lineD(x,y,SST)<3.6||lineD(x,y,BUR)<1.2?'fluid':null; })]},
  {id:'bursitis', n:'肩峰下-三角筋下滑液包の液貯留', shapes:[F('fluid',[-20,-34,46,36],function(x,y,c){ if(!(c==='fat'||c==='muscle'||c==='fluid')) return null; var d=lineD(x,y,BUR), w=x<-6?0.9:x>38&&y>10?1.2:1.9; return d<w?'fluid':null; })]},
  {id:'bruise', n:'上腕骨頭の骨挫傷（上外側）', shapes:[F('bme',[4,-20,40,14],function(x,y,c){ if(c!=='marrow_y') return null; var dx=x-24, dy=y+3, a=Math.atan2(dy,dx); return Math.hypot(dx,dy)<9.5+1.8*Math.sin(3*a+0.6)?'bme':null; })]}
]; }

MS.PHANTOMS.shoulder = {n:'肩（斜冠状断）', P:200, plane:'cor', coil:'shoulder', coilG:1.0, coilC:[12,6], fov:160, pe:'RL', shapes:shoulder, les:shoulderLes,
  motion:{resp:0, card:0}, region:'msk', def:{fov:160,pfov:100,nx:320,ny:256,thk:3,nsl:20,pos:30}, ab:['tendon','fluid'], musDir:'horz'};
})();
