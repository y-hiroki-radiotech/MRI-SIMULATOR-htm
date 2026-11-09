(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir, ribs=P.ribs, spine=P.spine;
MS.addTissues({
  detrusor:{n:'膀胱壁（排尿筋）', T1:[1100,1400], T2:[48,44], T2s:[28,20], PD:0.7, ADC:1.4, mt:0.3, ce:{eca:[2,3,3]}, src:'est'},
  pnerve:  {n:'末梢神経（仙骨神経・坐骨神経）', T1:[1000,1250], T2:[65,58], T2s:[35,25], PD:0.72, ADC:1.3, mt:0.3, fa:0.5, src:'est'},
  afms:    {n:'前線維筋性間質（前立腺）', T1:[1150,1450], T2:[50,45], T2s:[28,20], PD:0.7, ADC:1.2, mt:0.35, ce:{eca:[1.5,2,2]}, src:'est'},
  stool:   {n:'便（大腸内容）', T1:[700,850], T2:[70,60], T2s:[20,12], PD:0.65, ADC:0.9, ff:0.05, chi:0.2, tx:{f:.12,c:.15}, src:'est'},
  pr_cap:  {n:'前立腺被膜・外科的被膜', T1:[1000,1300], T2:[45,40], T2s:[25,18], PD:0.65, ADC:1.2, mt:0.35, ce:{eca:[1,1.8,2]}, src:'est'}
});
/* ---------- 共通の補助 ---------- */
/* 開いた折れ線を Catmull-Rom で n 点に補間 */
function crs(p,n){ var o=[], m=p.length; for(var k=0;k<n;k++){ var t=k/(n-1)*(m-1), i=Math.min(m-2,Math.floor(t)), f=t-i;
  var a=p[Math.max(0,i-1)], b=p[i], c=p[i+1], d=p[Math.min(m-1,i+2)];
  o.push([cr(a[0],b[0],c[0],d[0],f), cr(a[1],b[1],c[1],d[1],f)]); } return o; }
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function lerpA(a,t){ if(typeof a==='number') return a; var x=t*(a.length-1), i=Math.min(a.length-2,Math.floor(x)), f=x-i; return a[i]*(1-f)+a[i+1]*f; }
/* 中心線と半幅から帯状の多角形（筋・骨・腱） */
function bandPts(pts,hw,n){ n=n||Math.max(12,pts.length*6); var c=crs(pts,n), L=[], R=[];
  for(var k=0;k<n;k++){ var a=c[Math.max(0,k-1)], b=c[Math.min(n-1,k+1)]; var dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1; var nx=-dy/l, ny=dx/l, w=lerpA(hw,k/(n-1));
    L.push([c[k][0]+nx*w, c[k][1]+ny*w]); R.push([c[k][0]-nx*w, c[k][1]-ny*w]); }
  return L.concat(R.reverse()); }
function band(L,pts,hw,n){ return Pg(L,bandPts(pts,hw,n)); }
function mx(pts,s){ return pts.map(function(q){ return [q[0]*s,q[1]]; }); }
function segD(x,y,a,b){ var ax=b[0]-a[0], ay=b[1]-a[1], L2=ax*ax+ay*ay, t=L2?((x-a[0])*ax+(y-a[1])*ay)/L2:0; t=t<0?0:t>1?1:t; var px=a[0]+t*ax-x, py=a[1]+t*ay-y; return Math.sqrt(px*px+py*py); }
function polyD(x,y,p){ var d=1e9; for(var a=0,b=p.length-1;a<p.length;b=a++){ var q=segD(x,y,p[b],p[a]); if(q<d) d=q; } return d; }
function inPoly(x,y,p){ var c=false; for(var a=0,b=p.length-1;a<p.length;b=a++){ if(((p[a][1]>y)!==(p[b][1]>y)) && (x<(p[b][0]-p[a][0])*(y-p[a][1])/(p[b][1]-p[a][1])+p[a][0])) c=!c; } return c; }
function bb(p,m){ m=m||0; var xs=p.map(function(q){return q[0];}), ys=p.map(function(q){return q[1];}); return [Math.min.apply(null,xs)-m,Math.min.apply(null,ys)-m,Math.max.apply(null,xs)+m,Math.max.apply(null,ys)+m]; }
/* 皮質骨＋骨髄（多角形） */
function boneP(pts,th,mar){ return [Pg('bone',pts), F(mar,bb(pts),function(x,y){ return inPoly(x,y,pts)&&polyD(x,y,pts)>th?mar:null; })]; }
/* 角度の関数から B の半径列を作る（0°=+x、90°=+y） */
function rad(fn,n){ var o=[]; for(var i=0;i<n;i++) o.push(fn(i*360/n)); return o; }
function sub(R,d){ return R.map(function(r){ return r-d; }); }
function supE(a,b,p,th){ var t=th*Math.PI/180, c=Math.abs(Math.cos(t)), s=Math.abs(Math.sin(t)); return 1/Math.pow(Math.pow(c/a,p)+Math.pow(s/b,p),1/p); }
function g(th,c,w){ var d=((th-c+540)%360)-180; return Math.exp(-d*d/(w*w)); }
/* 腸管ループ（壁・内容・前方のガス） */
function loop(cx,cy,R,a,wall,gas,cont){ var k=cont||'gi_fluid', inner=B(k,cx,cy,sub(R,wall),a); var o=[B('gi_wall',cx,cy,R,a), inner];
  if(gas){ var top=cy-Math.min.apply(null,R)*gas, m=Math.max.apply(null,R); o.push(F('air',[cx-m,cy-m,cx+m,top],function(x,y,c){ return c===k&&y<top&&P.inside(inner,x,y)?'air':null; })); } return o; }

/* ---------- 女性骨盤（子宮体部レベル・S2付近の軸位） ---------- */
var FB=rad(function(th){ var r=supE(166,Math.sin(th*Math.PI/180)>0?128:110,2.5,th); return r+6*g(th,58,22)+6*g(th,122,22)-6*g(th,90,8)-4*g(th,212,18)-4*g(th,328,18)+3*g(th,270,25); },36);
/* 左（+x）側の骨・筋の座標。右は x を反転し、少し非対称にする */
var IL_F=[[54,61],[63,54],[76,42],[90,28],[104,10],[115,-10],[122,-30],[127,-44],[132,-42],[129,-26],[122.5,-5],[112,16],[99,35.5],[87,52.5],[76,69],[70,86],[60,100],[48,106],[38,104],[36,97],[42,86],[48,74]];
var SAC_F=[[0,62],[18,62],[36,63],[53,61],[48,74],[42,86],[36,97],[26,100],[14,101],[6,104],[0,107]];
function sacrumPts(){ var r=SAC_F.slice(1,-1).reverse().map(function(q){ return [-q[0],q[1]]; }); return SAC_F.concat(r); }
function pelvisF(){
  var rr=rng(11);
  var sh=[ B('skin',0,0,FB), B('fat',0,0,sub(FB,2.5)) ];
  /* 前腹壁：腹直筋・側腹筋（薄い3層）・下腹壁動静脈 */
  sh.push(mir(function(s){ var k=s<0?1.04:1; return [
    band('muscle',mx([[6,-99],[22,-97],[38,-93]],s),[3.5,5,3.5]),
    band('muscle',mx([[42,-90],[75,-82],[106,-68],[130,-50],[142,-30]],s),[1.6,2.2,2.4,2.6,2.6]),
    band('muscle',mx([[44,-85],[76,-76],[104,-62],[126,-44],[136,-26]],s),[1.4,2.0,2.4,2.8,3]),
    band('muscle',mx([[46,-80],[76,-70],[102,-56],[120,-40]],s),[1,1.4,1.6,1.8]),
    E('artery',s*36*k,-87,1.3,1.3), E('vein',s*39*k,-86.5,1.6,1.4), E('vein',s*33*k,-87.5,1.3,1.2) ]; }));
  /* 殿筋群（大殿筋→中殿筋→小殿筋の順に重ね、間に薄い脂肪の筋膜） */
  sh.push(mir(function(s){ var GMED=mx([[134,-38],[144,-20],[139,1],[130,26],[116,48],[103,66],[88,81]],s), hmd=[4,7,10,11,11,9,6],
      GMIN=mx([[131,-38],[133,-25],[126,-3],[115.4,18],[102.3,38],[90,55]],s), hmn=[3,5,5.5,5.5,5,4];
    return [ band('muscle',mx([[40,116],[64,114],[92,104],[118,84],[138,58],[150,30]],s),[6,12,16,17,14,8]),
      band('fat',GMED,hmd.map(function(w){return w+0.9;})), band('muscle',GMED,hmd),
      band('fat',GMIN,hmn.map(function(w){return w+0.8;})), band('muscle',GMIN,hmn) ]; }));
  /* 腸骨・仙骨・仙腸関節 */
  sh.push(mir(function(s){ return boneP(mx(IL_F,s),2.2,'marrow_r'); }));
  sh.push(boneP(sacrumPts(),2.0,'marrow_r'));
  sh.push(mir(function(s){ return [ PL('cartilage',mx([[53.5,61],[48,74],[42,86],[37,96]],s),0.9), PL('lig',mx([[37,98],[33,106]],s),1.4) ]; }));
  /* 仙骨管（硬膜嚢の下端と神経根）・仙骨孔（S2 神経根） */
  sh.push(E('fat',0,92,12,5.2), E('dura',0,91.8,5.4,3.4), E('csf',0,91.8,4.8,2.8), E('pnerve',-2,93,1,1), E('pnerve',2.2,93.2,1,1), E('pnerve',0,90.8,0.8,0.8));
  sh.push(mir(function(s){ return [ PL('fat',mx([[9,90],[17,78],[23,66],[25,58]],s),2.8), PL('pnerve',mx([[11,88],[18,77],[23,66],[26,56],[32,50]],s),1.4) ]; }));
  /* 多裂筋（仙骨後面）と正中仙骨稜 */
  sh.push(mir(function(s){ return [ band('muscle',mx([[6,111],[18,107],[30,103]],s),[2.5,4.5,2.5]) ]; }));
  /* 腸骨筋・大腰筋・大腿神経 */
  sh.push(mir(function(s){ var k=s<0?1.03:1; return [
    band('muscle',mx([[118,-33],[111,-13],[100,7],[86,25],[72,39]],s),[5,7,8,7,5]), PL('fat',mx([[104,-30],[100,-14],[92,0]],s),0.6),
    B('muscle',s*92*k,-22,[14,13,12,13,14,14,13,13],s*30),
    E('pnerve',s*106,-26,2.6,1.6,s*40) ]; }));
  /* 梨状筋（仙骨前面外側）・仙骨神経叢 */
  sh.push(mir(function(s){ return [ band('muscle',mx([[22,56],[36,56.5],[50,57]],s),[3,4.5,4]), PL('pnerve',mx([[28,50],[40,51],[50,52]],s),1.2) ]; }));
  /* 外腸骨動静脈・内腸骨動静脈・尿管・卵巣動静脈 */
  sh.push(mir(function(s){ var k=s<0?1.02:1, dy=s<0?2:0; return [
    E('artery',s*72*k,-34+dy,4.4,4.2), E('vein',s*66*k,-25+dy,6.2,5,s*20),
    E('artery',s*50,35,2.6,2.6), E('artery',s*56,40,1.8,1.8), E('artery',s*46,30,1.6,1.6),
    E('vein',s*44,42,4.2,3.4,s*30), E('vein',s*52,47,3,2.6),
    E('gi_wall',s*40*k,24,2.6,2.6), E('urine',s*40*k,24,1,1),
    E('vein',s*67,6,2.4,2.2), E('artery',s*64.5,4.5,1,1) ]; }));
  /* 腸管：小腸ループ（右前方〜左前方）、盲腸（右腸骨窩）、S状結腸・直腸 */
  sh.push(loop(-84,-62,[13,12,11,12,13,12,11,12],20,2,0.5));
  sh.push(loop(-60,-80,[10,9,9,10,10,9,9,10],-10,2.6,0));
  sh.push(loop(-70,-40,[9,8,8,9,9,8],0,3.2,0));
  sh.push(loop(98,-62,[12,11,12,13,12,11],10,2,0));
  sh.push(loop(68,-74,[9,10,9,10,9,10],0,3,0));
  sh.push(loop(-108,-36,[16,14,15,17,18,16,14,15],-20,2,0.45,'stool'));
  sh.push(loop(116,-38,[13,11,10,11,13,12,11,12],-30,2.2,0,'stool'));
  sh.push(loop(34,18,[13,11,10,11,13,12,11,12],-35,2.4,0.55,'stool'));
  sh.push(PL('lig',[[-24,34],[-22,52],[-4,56],[14,54],[20,38]],0.5));
  sh.push(loop(-2,33,[16,14,13,14,16,14,13,14],5,3,0.5,'stool'));
  /* 膀胱（後壁は子宮で圧排）：壁と尿 */
  var BL=rad(function(th){ return supE(50,Math.sin(th*Math.PI/180)>0?20:24,2.3,th)-7*g(th,90,30)+4*g(th,60,18)+4*g(th,120,18); },24);
  sh.push(B('detrusor',0,-62,BL,0), B('urine',0,-62,sub(BL,3),0));
  /* 子宮体部：外層筋層・弓状血管・接合帯・内膜（前傾、やや右へ偏位） */
  var UT=[31,29,22,21,23,30,32,29,22,20,22,29];
  sh.push(B('myometrium',4,-22,UT,8));
  sh.push(F('vein',[-30,-48,38,4],function(x,y,c){ if(c!=='myometrium') return null; var u=(x-4)*0.99+(y+22)*0.14, v=-(x-4)*0.14+(y+22)*0.99; var q=Math.sqrt(u*u/(27*27)+v*v/(20*20)); if(Math.abs(q-0.83)>0.03) return null; var t=Math.atan2(v,u); return Math.sin(t*9)>0.55?'vein':null; }));
  sh.push(E('jz',4,-22,19.5,11.5,8), E('endometrium',4,-22,12.5,4.6,8,0.04,3,0.5));
  /* 子宮広間膜・円靱帯・子宮動静脈叢 */
  sh.push(mir(function(s){ return [ PL('lig',mx([[34,-22],[44,-14],[52,-6]],s),0.6), PL('lig',mx([[30,-36],[48,-50],[66,-58],[82,-64]],s),1.5) ]; }));
  sh.push(mir(function(s){ var o=[], cx=s*(s<0?-29+4:33+4)+0, n=7; for(var i=0;i<n;i++){ var yy=-34+i*4.5+rr()*2, xx=(s<0?-31:39)+s*(rr()*6)+s*Math.abs(yy+16)*-0.1; o.push(E('vein',xx,yy,1.6+rr()*1.6,1.3+rr()*1.2,rr()*180)); } o.push(E('artery',s<0?-32:40,-20,1.2,1.2), E('artery',s<0?-35:43,-12,1,1)); return o; }));
  /* 卵巣（卵胞を含む）：右は後外側、左はやや前方 */
  sh.push(B('ovary',-52,-2,[15,12,9,10,14,12,9,10],25), B('ovary',55,2,[14,11,9,10,15,11,9,10],-20));
  [[-57,-4,3.6],[-47,1,2.6],[-52,-7,2.2],[-44,-5,1.8],[-59,3,2],[52,4,4.2],[60,-1,2.6],[57,7,2],[48,-1,1.8]].forEach(function(f){ sh.push(E('fluid',f[0],f[1],f[2],f[2]*0.92)); });
  return M(sh);
}
function pelvisFLes(){ return [
  {id:'fibroid', n:'子宮筋腫（筋層内）', shapes:[F('fibroid',[6,-44,40,-10],function(x,y,c){ if(!(c==='myometrium'||c==='jz'||c==='vein')) return null; var dx=x-23; return Math.pow(dx/13,2)+Math.pow((y+28)/12,2)<1+0.06*Math.sin(5*Math.atan2(y+28,dx))?'fibroid':null; })]},
  {id:'endomet', n:'内膜症性嚢胞（右卵巣）', shapes:[B('ovary',-53,-2,[19,16,13,14,18,16,13,14],25), B('endometrioma',-54,-2,[16,14,11.5,12,16,14,11.5,12],25)]},
  {id:'dermoid', n:'成熟嚢胞性奇形腫（左卵巣）', shapes:[B('ovary',57,3,[19,15,13,14,19,15,13,14],-20), B('cyst',57,3,[17,13.5,11.5,12,17,13.5,11.5,12],-20), B('fat',59,-1,[8,7,6,7,8,7,6,7],0), E('bone',52,8,2.2,1.6,30), E('fat',62,8,2.5,2)]}
]; }

/* ---------- 男性骨盤（前立腺中部・恥骨結合レベルの軸位） ---------- */
var MB=rad(function(th){ var r=supE(170,Math.sin(th*Math.PI/180)>0?118:104,2.6,th); return r+5*g(th,55,22)+5*g(th,125,22)-5*g(th,240,14)-5*g(th,300,14)+4*g(th,270,10); },36);
function pelvisM(){
  var sh=[ B('skin',0,0,MB), B('fat',0,0,sub(MB,2.5)) ];
  /* 大殿筋（後方）、外旋筋群、坐骨神経 */
  sh.push(mir(function(s){ return [
    band('muscle',mx([[14,92],[46,96],[84,86],[118,64],[144,38],[158,12]],s),[7,15,19,20,17,10]),
    band('muscle',mx([[68,40],[92,40],[116,34],[132,26]],s),[5,6.5,6,4]),
    E('pnerve',s*98,52,7.5,3.6,s*-8) ]; }));
  /* 大腿前面の筋：腸腰筋・縫工筋・大腿直筋・大腿筋膜張筋・恥骨筋・外閉鎖筋 */
  sh.push(mir(function(s){ var k=s<0?1.02:1; return [
    B('muscle',s*98*k,-42,[18,15,12,12,15,18,14,13],s*-12), E('tendon',s*96*k,-35,4.5,2.6,s*-15),
    E('fat',s*122,-48,10,9,s*-10), E('muscle',s*122,-48,9,8,s*-10), E('tendon',s*121,-52,2.6,1.6),
    E('fat',s*112,-66,12,6.5,s*-25), E('muscle',s*112,-66,11,5.5,s*-25),
    E('fat',s*141,-36,9,14,s*-25), E('muscle',s*141,-36,8,13,s*-25),
    band('muscle',mx([[146,-18],[154,4],[157,26]],s),[3,5,4]), PL('tendon',mx([[150,-4],[155,14]],s),1.4),
    B('muscle',s*58,-64,[13,10,8,9,12,9,8,9],s*28),
    band('muscle',mx([[48,-48],[60,-40],[72,-30],[80,-22]],s),[5,7,6,4]) ]; }));
  /* 大腿動静脈・大腿神経・精索 */
  sh.push(mir(function(s){ var k=s<0?1.03:1; return [
    E('artery',s*80*k,-64,4.6,4.4), E('vein',s*67*k,-66,6.4,5.2,s*10), E('pnerve',s*93*k,-63,3,2,s*-20),
    E('fat',s*28,-88,7,6,s*20), E('vein',s*26,-87,1.8,1.6), E('vein',s*30,-90,1.6,1.5), E('vein',s*31,-85,1.4,1.3), E('gi_wall',s*25,-91,1.3,1.3) ]; }));
  /* 寛骨臼・恥骨・坐骨（閉鎖孔を挟む） */
  sh.push(mir(function(s){ return [
    boneP(mx([[4,-61],[6,-74],[10,-82],[20,-84],[30,-76],[44,-68],[58,-58],[70,-44],[76,-36],[66,-32],[54,-44],[40,-54],[26,-58],[14,-58]],s),1.8,'marrow_r'),
    boneP(mx([[67,-38],[73,-31],[71,-18],[68,-6],[70,8],[74,20],[80,28],[74,36],[62,44],[52,42],[54,30],[58,16],[60,0],[60,-16],[62,-30]],s),2.0,'marrow_r') ]; }));
  sh.push(E('cartilage',0,-70,2,11.5), S('lig',0,-83,0,-57,0.7));
  /* 内閉鎖筋（骨盤側壁）・閉鎖膜 */
  sh.push(mir(function(s){ return [ band('muscle',mx([[30,-56],[44,-46],[52,-30],[53,-10],[52,10],[48,28],[42,40]],s),[3,6,7,7.5,7,6,4]), PL('lig',mx([[57,-44],[62,-34]],s),0.7) ]; }));
  /* 大腿骨頭・頸部・大転子（関節軟骨・骨端線瘢痕・関節唇・腸骨大腿靱帯） */
  sh.push(mir(function(s){ var hc=[s*94,-8]; return [
    E('cartilage',hc[0],hc[1],25.2,25.2),
    band('bone',mx([[100,-2],[118,6],[134,12]],s),[13,13.5,15]),
    B('bone',s*140,16,[13,15,18,15,12,13,18,16],0),
    E('bone',hc[0],hc[1],23.6,23.6),
    F('marrow_y',s>0?[60,-40,160,40]:[-160,-40,-60,40],function(x,y,c){ if(c!=='bone') return null; if(Math.hypot(x-hc[0],y-hc[1])<21.8) return 'marrow_y';
      var u=(x*s-100), v=y+2; if(u>-4&&u<38&&Math.abs(v-u*0.42)<11.5) return 'marrow_y'; if(Math.hypot(x-s*140,y-16)<11.5+3*Math.sin(Math.atan2(y-16,x-s*140)*2)) return 'marrow_y'; return null; }),
    PL('bone',mx([[80,-24],[92,-14],[104,-2],[110,8]],s),0.7),
    E('fat',s*72,-8,3,6),
    PL('lig',mx([[74,-36],[96,-34],[116,-22],[132,-6]],s),1.5) ]; }));
  /* 肛門挙筋（恥骨直腸筋〜恥骨尾骨筋）・肛門尾骨靱帯・尾骨 */
  sh.push(PL('muscle',[[-16,-54],[-27,-38],[-31,-14],[-29,10],[-21,28],[-9,38],[0,40],[9,38],[21,28],[29,10],[31,-14],[27,-38],[16,-54]],2.4));
  sh.push(S('lig',0,41,0,56,1.4), E('bone',0,62,8,6), E('marrow_r',0,62,6.2,4.2));
  /* 陰部神経管（Alcock 管）の血管 */
  sh.push(mir(function(s){ return [ E('artery',s*44,26,1.2,1.2), E('vein',s*45.5,29,1.8,1.6), E('vein',s*43,22,1.5,1.4) ]; }));
  /* 直腸（直腸間膜の筋膜・周囲脂肪・壁・内腔） */
  sh.push(E('lig',0,11,27,21), E('fat',0,11,26.3,20.3));
  sh.push(mir(function(s){ return [ E('vein',s*16,22,1.6,1.4), E('artery',s*18,4,0.9,0.9), E('vein',s*10,28,1.3,1.2) ]; }));
  sh.push(B('gi_wall',0,11,[19,17,14,13,14,17,19,17,13,12,13,17],0), B('gi_fluid',0,12,[11,9,6,4,6,9,11,6,3,2.5,3,6],0), E('air',0,9.5,6,1.4));
  /* デノビエ筋膜・前立腺周囲静脈叢（サントリーニ叢を含む）・神経血管束 */
  sh.push(PL('lig',[[-18,-6],[-8,-4.8],[0,-4.5],[8,-4.8],[18,-6]],0.55));
  [[0,-47,3,1.8],[-8,-46,2.2,1.6],[8,-46.5,2.4,1.6],[-15,-43,1.8,1.4],[15,-43,1.8,1.4],[-26,-30,1.8,1.4],[27,-28,1.7,1.4],[-28,-20,1.6,1.4],[28,-18,1.6,1.3],[-26,-12,1.5,1.3]].forEach(function(v){ sh.push(E('vein',v[0],v[1],v[2],v[3])); });
  sh.push(mir(function(s){ return [ E('fat',s*21,-8,4,3), E('vein',s*21.5,-8.5,1.6,1.4), E('artery',s*19.5,-6.5,0.8,0.8), E('vein',s*23,-6,1.2,1.0), E('pnerve',s*20,-10,0.8,0.7) ]; }));
  /* 前立腺：被膜→辺縁域→外科的被膜→移行域→前線維筋性間質→尿道 */
  var PR=[24,22.5,19,16.5,15.5,16.5,19,22.5,24,22,18.5,16.8,16.5,16.8,18.5,22];
  sh.push(B('pr_cap',0,-22,PR.map(function(r){return r+0.8;}),0), B('pz',0,-22,PR,0));
  var TZ=[14.5,12,9,9.5,9,12,14.5,12,10,10.5,10,12];
  sh.push(B('pr_cap',0,-26,TZ.map(function(r){return r+0.7;}),0), B('tz',0,-26,TZ,0));
  sh.push(F('afms',[-20,-40,20,-28],function(x,y,c){ return (c==='tz'||c==='pz'||c==='pr_cap')&&Math.abs(x)<17&&y< -34.5+0.012*x*x?'afms':null; }));
  sh.push(E('afms',0,-24.5,3.6,3.4), E('gi_wall',0,-24.5,2.4,2.2), E('urine',0,-24.5,0.8,0.7));
  sh.push(mir(function(s){ return E('gi_wall',s*2.6,-18,0.8,0.8); }));
  /* 殿裂 */
  sh.push(Pg('air',[[0,104],[-2.2,124],[2.2,124]]), S('skin',0,104,0,121,1.0));
  return M(sh);
}
function pelvisMLes(){ return [
  {id:'pca', n:'前立腺癌（左辺縁域）', shapes:[F('pca',[4,-22,26,0],function(x,y,c){ return (c==='pz')&&Math.pow((x-14)/6.5,2)+Math.pow((y+10)/5.2,2)<1+0.08*Math.sin(4*Math.atan2(y+10,x-14))?'pca':null; })]},
  {id:'bph', n:'BPH結節（移行域）', shapes:[F('bph',[-16,-38,16,-14],function(x,y,c){ if(c!=='tz') return null; return (Math.pow((x+6)/5.8,2)+Math.pow((y+28)/5,2)<1||Math.pow((x-6.5)/5,2)+Math.pow((y+30)/4.2,2)<1)?'bph':null; }), E('pr_cap',-6,-28,6.4,5.6), E('bph',-6,-28,5.8,5), E('pr_cap',6.5,-30,5.6,4.8), E('bph',6.5,-30,5,4.2)]}
]; }

MS.PHANTOMS.pelvisF = {n:'女性骨盤（子宮体部レベル・軸位）', P:400, plane:'ax', coil:'body', coilG:0.66, fov:340, pe:'AP', shapes:pelvisF, les:pelvisFLes, motion:{resp:2, card:0, peri:1}, region:'pelvis', pulsatile:true, ab:['myometrium','jz']};
MS.PHANTOMS.pelvisM = {n:'男性骨盤（前立腺中部レベル・軸位）', P:400, plane:'ax', coil:'body', coilG:0.68, fov:240, pe:'AP', shapes:pelvisM, les:pelvisMLes, motion:{resp:1.5, card:0, peri:1}, region:'pelvis', pulsatile:true, ab:['pz','tz']};
})();
