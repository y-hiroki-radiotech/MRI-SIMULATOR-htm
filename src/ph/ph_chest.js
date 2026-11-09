(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir;
/* ---------- 胸部（心臓レベル軸位：四腔断面に近い） ----------
 座標：x 右向き＝患者の左、y 下向き＝背側。体の中心 C を基準に、体表からの深さで胸壁の層（皮下脂肪・筋・肋骨）を描く。 */
MS.addTissues({
  pericard_c:{n:'心膜', T1:[800,1000], T2:[25,22], T2s:[12,8], PD:0.45, ADC:0.8, mt:0.4, src:'est'},
  fissure_c: {n:'葉間胸膜（葉間裂）', T1:[900,1100], T2:[35,30], T2s:[5,3], PD:0.35, ADC:1.0, chi:1.0, src:'est'},
  bronch_c:  {n:'気管支壁', T1:[1000,1200], T2:[30,27], T2s:[12,8], PD:0.55, ADC:1.0, mt:0.3, src:'est'}
});
var D=Math.PI/180;
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function Rof(R,th){ var n=R.length, tt=((th/(2*Math.PI))%1+1)%1*n, i=Math.floor(tt), fr=tt-i; return cr(R[(i-1+n)%n],R[i%n],R[(i+1)%n],R[(i+2)%n],fr); }
function segD(x,y,ax,ay,bx,by){ var dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy, t=L2?((x-ax)*dx+(y-ay)*dy)/L2:0; t=t<0?0:t>1?1:t; var px=ax+t*dx-x, py=ay+t*dy-y; return [Math.sqrt(px*px+py*py),t]; }
/* 体表（0°=患者の左、90°=背側、180°=右、270°=腹側） */
var C=[0,6];
var RB=[164,163,156,147,134,122,114,122,134,147,156,163,165,162,152,138,125,117,114,117,126,140,153,161];
/* 胸壁の厚さ（体表から胸腔まで） */
var WT=[27,31,44,55,57,63,67,63,57,55,44,31,27,28,30,31,30,25,20,25,30,31,30,28];
function mirR(R){ var n=R.length; return R.map(function(_,k){ return R[((n/2-k)%n+n)%n]; }); } /* 左右反転（θ→180°−θ） */
function polar(x,y){ var dx=x-C[0], dy=y-C[1]; var th=Math.atan2(dy,dx); return [th, Math.sqrt(dx*dx+dy*dy)]; }
function depth(x,y){ var p=polar(x,y); return Rof(RB,p[0])-p[1]; }
function atDepth(a,d){ var th=a*D, R=Rof(RB,th)-d; return [C[0]+R*Math.cos(th), C[1]+R*Math.sin(th)]; }
/* 体表に沿う帯（筋・肩甲骨）：角度 a0→a1（時計回り）、深さ [i0,o0]→[i1,o1]、両端は pw で細くなる */
function band(L,a0,a1,i0,o0,i1,o1,pw,cond){ pw=pw==null?0.45:pw; var span=((a1-a0)%360+360)%360; var xs=[],ys=[];
  for(var k=0;k<=24;k++){ var a=a0+span*k/24; [Math.min(i0,i1)-1,Math.max(o0,o1)+1].forEach(function(d){ var q=atDepth(a,d); xs.push(q[0]); ys.push(q[1]); }); }
  var bb=[Math.min.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,xs),Math.max.apply(null,ys)];
  return F(L,bb,function(x,y,c){ if(cond&&!cond(c)) return null; var p=polar(x,y); var deg=p[0]/D; var t=(((deg-a0)%360)+360)%360/span; if(t>1) return null;
    var dep=Rof(RB,p[0])-p[1]; var di=i0+(i1-i0)*t, dO=o0+(o1-o0)*t; var m=(di+dO)/2, h=(dO-di)/2*Math.pow(Math.max(0,Math.sin(Math.PI*t)),pw); return (dep>m-h&&dep<m+h)?L:null; }); }
function bandM(L,a0,a1,i0,o0,i1,o1,pw,cond){ return [band(L,a0,a1,i0,o0,i1,o1,pw,cond), band(L,180-a1,180-a0,i1,o1,i0,o0,pw,cond)]; }
/* 肋骨：体表からの深さ d に、接線方向に細長い断面（斜めに切れる） */
function rib(a,d,len,t,tilt,cart){ var q=atDepth(a,d); var rot=a+90+(tilt||0);
  if(cart) return [E('cartilage',q[0],q[1],len/2,t/2,rot)];
  return [E('bone',q[0],q[1],len/2,t/2,rot), E('marrow_r',q[0],q[1],len/2-1.4,t/2-1.4,rot)]; }
/* 肺の中だけに描く線分（血管の枝・葉間裂） */
var LUNG={lung:1,vessel_l:1};
function lungSeg(L,ax,ay,bx,by,r0,r1){ var m=Math.max(r0,r1)+0.5; return F(L,[Math.min(ax,bx)-m,Math.min(ay,by)-m,Math.max(ax,bx)+m,Math.max(ay,by)+m],function(x,y,c){ if(!LUNG[c]) return null; var q=segD(x,y,ax,ay,bx,by); return q[0]<r0+(r1-r0)*q[1]?L:null; }); }
function tree(out,x,y,ang,len,r,dep,R){ var a=ang*D, x2=x+len*Math.cos(a), y2=y+len*Math.sin(a); out.push(lungSeg('vessel_l',x,y,x2,y2,r,r*0.82));
  if(dep<=0||r<0.75) return; var sp=18+R()*16; tree(out,x2,y2,ang-sp*(0.6+R()*0.6),len*(0.68+R()*0.16),r*0.74,dep-1,R); tree(out,x2,y2,ang+sp*(0.6+R()*0.6),len*(0.68+R()*0.16),r*0.7,dep-1,R); }

/* ---- 心臓 ----
 左室：長軸に沿った局所座標（u：僧帽弁輪→心尖、v：+側＝側壁、−側＝中隔）。右室・心房は体の座標の閉曲線。
 優先順位：左室内腔 > 左室心筋（中隔を含む） > 右室 > 心房 > 心外膜脂肪 > 心膜 */
var HO=[26,-14], HA=-50*D, hd=[Math.cos(HA),Math.sin(HA)], hn=[-Math.sin(HA),Math.cos(HA)];
var LC=64, WC=20, TL=10, TS=10, TA=7;
function uv(x,y){ var dx=x-HO[0], dy=y-HO[1]; return [dx*hd[0]+dy*hd[1], dx*hn[0]+dy*hn[1]]; }
function xy(u,v){ return [HO[0]+u*hd[0]+v*hn[0], HO[1]+u*hd[1]+v*hn[1]]; }
function lvOut(u,v,g){ var La=LC+TA+g; if(u<-6-g||u>La) return false; var f=Math.sqrt(Math.max(0,1-Math.pow(Math.max(u,0)/La,2))); return v>-(WC+TS+g)*f && v<(WC+TL+g)*f; }
function lvCav(u,v){ if(u<-0.5||u>LC) return false; var f=Math.sqrt(Math.max(0,1-Math.pow(Math.max(u,0)/LC,2.2))); return Math.abs(v-0.5)<WC*f; }
var RV_C=[-2,-60], RV_R=[46,32,26,26,28,32,31,29,26,25,27,36];
var RA_C=[-31,-22], RA_R=[22,23,21,20,22,24,25,24,23,23,24,24];
var LA_C=[13,-1], LA_R=[20,17,15,15,16,18,22,20,17,17,20,22];
var HB=[[0,-28,10,8],[0,-14,9,8],[38,4,8,6]]; /* 房室間溝・心臓十字部の脂肪 */
function inHB(x,y,g){ for(var i=0;i<HB.length;i++){ var h=HB[i], dx=(x-h[0])/(h[2]+g), dy=(y-h[1])/(h[3]+g); if(dx*dx+dy*dy<1) return true; } return false; }
function inB(R,c,x,y,g){ var dx=x-c[0], dy=y-c[1]; var r=Rof(R,Math.atan2(dy,dx))+g; return r>0 && dx*dx+dy*dy < r*r; }
function heartU(x,y,g){ var q=uv(x,y); return lvOut(q[0],q[1],g)||inB(RV_R,RV_C,x,y,g)||inB(RA_R,RA_C,x,y,g)||inB(LA_R,LA_C,x,y,g)||inHB(x,y,g-GP); }
var HBB=[-80,-108,112,40];
var GP=2.6; /* 心外膜脂肪の厚さ（基本値） */
function heartFn(x,y,c){ var q=uv(x,y), u=q[0], v=q[1];
  if(lvCav(u,v)){ /* 乳頭筋（前外側・後内側） */ if(Math.hypot(u-36,v-13)<4.0||Math.hypot(u-42,v+11)<3.4) return 'myo'; return 'blood_c'; }
  var lvo=lvOut(u,v,0);
  if(lvo && u<0.5 && inB(LA_R,LA_C,x,y,-1.5) && Math.abs(v-0.5)<WC-1){ /* 僧帽弁口と弁尖 */ var w=Math.abs(v-0.5); return (Math.abs(w-(WC-3))<0.7)?'myo':'blood_c'; }
  if(lvo) return 'myo';
  var rvo=inB(RV_R,RV_C,x,y,0), rvc=inB(RV_R,RV_C,x,y,-4);
  if(rvc){ /* 調節帯 */ if(u>26&&u<28.5&&v<-20&&v>-60) return 'myo'; return 'blood_c'; }
  if(rvo){ if(inB(RA_R,RA_C,x,y,-2)){ /* 三尖弁口 */ return 'blood_c'; } return 'myo'; }
  var inRA=inB(RA_R,RA_C,x,y,0), inLA=inB(LA_R,LA_C,x,y,0);
  if(inRA&&inLA) return 'myo';
  if(inRA) return inB(RA_R,RA_C,x,y,-2.2)?'blood_c':'myo';
  if(inLA) return inB(LA_R,LA_C,x,y,-2.0)?'blood_c':'myo';
  if(heartU(x,y,GP)) return 'fat';
  if(heartU(x,y,GP+1.3)) return 'pericard_c';
  return null; }

function chest(o){
  var sh=M([
    B('skin',C[0],C[1],RB), B('fat',C[0],C[1],RB.map(function(r){return r-2.2;})),
    /* 背部：僧帽筋（下部）・広背筋 */
    band('muscle',58,122,10,15,10,15,0.5),
    bandM('muscle',345,64,9,19,11,21,0.5),
    /* 肩甲骨（下角付近）と棘下筋・肩甲下筋・大円筋 */
    bandM('muscle',30,66,20,30,22,31,0.35),
    bandM('bone',29,60,31,35,30,34,0.2), bandM('marrow_r',31,58,32,33.9,31.1,32.9,0.2),
    bandM('muscle',26,64,35.5,46,35,45,0.4),
    /* 前鋸筋：前外側では浅く、肩甲骨の下では深い */
    bandM('muscle',300,52,13,19,46.5,50.5,0.35),
    /* 大胸筋・小胸筋 */
    bandM('muscle',276,338,8,18,10,20,0.5), bandM('muscle',300,332,19.5,24,19.5,24,0.6),
    /* 筋の間の脂肪の線 */
    bandM('fat',300,336,18.6,19.4,18.6,19.4,0.1),
    bandM('fat',30,64,19.3,20.1,21.3,22.1,0.1),
    /* 胸腔：肋間筋 → 胸膜外脂肪 → 肺 */
    F('lung',[-175,-115,175,130],function(x,y,c){ var p=polar(x,y), R=Rof(RB,p[0]), W=Rof(WT,p[0]); var dep=R-p[1]; if(dep>W) return 'lung'; if(dep>W-1) return 'fat'; if(dep>W-7){ var deg=((p[0]/D)%360+360)%360; if(deg>68&&deg<112) return null; return 'muscle'; } return null; })
  ]);
  /* 肋骨（各側 7 本）と肋軟骨 */
  [[352,24,0],[12,26,4],[33,40,6],[52,52,0],[64,58,-8],[333,26,-4],[312,27,6],[293,26,0]].forEach(function(R,k){ var a=R[0]; var w=Rof(WT,a*D)-4.2; var len=[22,20,24,18,16,22,18,14][k], t=[7.5,7.5,7,7,7.5,7,7.5,8][k];
    sh.push(rib(a,w,len,t,R[2])); sh.push(rib(180-a,Rof(WT,(180-a)*D)-4.2,len*0.95,t,-R[2])); });
  sh.push(rib(281,Rof(WT,281*D)-4,13,7,10,true)); sh.push(rib(259,Rof(WT,259*D)-4,13,7,-10,true));
  sh=sh.concat(M([
    /* 胸骨と内胸動静脈 */
    E('bone',0,-98,15,6.2,0,0.04,4,0), E('marrow_r',0,-98,13.4,4.6,0,0.04,4,0),
    mir(function(s){ return [E('fat',s*23,-90.5,7,3.6), E('artery',s*25.5,-90.5,1.4,1.4), E('vein',s*21,-90,1.8,1.6)]; }),
    /* 前縦隔の脂肪・後縦隔 */
    B('fat',-2,-82,[16,12,9,9,10,14,18,14,8,7,8,12]),
    B('fat',6,28,[30,22,17,15,16,20,26,22,14,12,14,22]),
    /* 心臓（心膜・心外膜脂肪・四腔） */
    F('myo',HBB,heartFn),
    /* 冠動脈：右冠動脈（右房室間溝）、回旋枝と大心静脈（左房室間溝）、前下行枝（前室間溝） */
    E('fat',-44,-50,6.5,5.5,-40), E('artery',-44,-50,2,2), E('fat',40,10,6,4.5,30), E('artery',40,10,1.8,1.8), E('vein',44,13,2.1,1.8),
    E('fat',44,-76,5.5,4.2,-40), E('artery',44,-76,1.6,1.6)
  ]));
  sh=sh.concat(M([
    /* 下行大動脈・食道・奇静脈 */
    E('artery',24,35,12,12), E('esoph',0,25,8.5,6.5,-10), E('air',0,25,2.6,0.9,-10), E('vein',-12,38,4,3.6), E('vein',15,54,2,1.8),
    /* 肺静脈（下肺静脈）→ 左房 */
    PL('vessel_l',[[-56,10],[-36,8],[-18,4]],4.6), PL('vessel_l',[[54,24],[40,16],[24,8]],4.4),
    /* 下葉の気管支 */
    E('bronch_c',-50,20,5,4.6), E('air',-50,20,3.4,3.0), E('bronch_c',52,36,4.8,4.4), E('air',52,36,3.2,2.8),
    E('bronch_c',-62,-2,3.4,3.2), E('air',-62,-2,2.0,1.8),
    /* 胸椎（椎体・椎弓根・横突起・椎弓・棘突起）と脊柱管 */
    B('bone',0,52,[17,16.5,15,14,13.5,14,15,16.5,17,15,13,15],0), B('marrow_v',0,52,[15.4,14.9,13.4,12.4,11.9,12.4,13.4,14.9,15.4,13.4,11.4,13.4],0),
    mir(function(s){ return [S('bone',s*10,63,s*11,72,4), S('marrow_v',s*10,64,s*11,71,2.2), S('bone',s*11,74,s*30,80,4.2), S('marrow_v',s*12,74,s*28,80,2.4), PL('bone',[[s*11,74],[s*8,86],[s*2,90]],3.1)]; }),
    E('fat',0,77,9.5,9), E('dura',0,76.5,8.6,8.2), E('csf',0,76.5,7.8,7.4), E('cord',0,76,4.5,3.8),
    /* 脊柱起立筋（多裂筋・最長筋・腸肋筋）：椎弓・横突起の背側から体表の近くまで */
    mir(function(s){ var R=[26,22,17,15,15,17,21,19,15,14,15,20]; if(s<0) R=mirR(R); return [B('muscle',s*31,96,R)]; }),
    mir(function(s){ return [PL('fat',[[s*14,84],[s*16,96],[s*15,110]],0.7), PL('fat',[[s*36,80],[s*39,95],[s*44,110]],0.6), S('fat',s*4.6,92,s*4.6,110,1.0)]; }),
    S('bone',0,90,0,104,3.6), S('marrow_v',0,91,0,103,1.9)
  ]));
  /* 肺血管：肺門から広がる枝（面内を走る部分）と、斜め・垂直に切れた短い断面 */
  var r=rng(11), vs=[];
  [[-58,6,186,16,2.4],[-58,14,140,16,2.3],[-56,-2,222,14,2.1],[-48,24,112,15,2.2],[-62,0,250,12,1.7]].forEach(function(T){ tree(vs,T[0],T[1],T[2],T[3],T[4],2,r); });
  [[56,26,8,16,2.3],[58,34,52,16,2.2],[50,42,94,13,2.0],[62,18,330,14,1.8],[62,30,-12,13,1.9]].forEach(function(T){ tree(vs,T[0],T[1],T[2],T[3],T[4],2,r); });
  sh=sh.concat(vs);
  [[-84,8,58,68,-56,8],[88,14,54,64,56,28]].forEach(function(L){ for(var k=0;k<95;k++){ var a=r()*Math.PI*2, d=0.18+0.8*Math.sqrt(r()); var x=L[0]+L[2]*d*Math.cos(a), y=L[1]+L[3]*d*Math.sin(a); var rr=0.55+1.6*(1-d)*(0.4+0.6*r());
    if(k%2){ var ang=Math.atan2(y-L[5],x-L[4])+(r()-0.5)*0.9, l=2+r()*7*(1-0.5*d); sh.push(lungSeg('vessel_l',x,y,x+l*Math.cos(ang),y+l*Math.sin(ang),rr,rr*0.8)); }
    else sh.push(F('vessel_l',[x-rr,y-rr,x+rr,y+rr],(function(cx,cy,R){ return function(xx,yy,c){ return c==='lung'&&Math.hypot(xx-cx,yy-cy)<R?'vessel_l':null; }; })(x,y,rr))); } });
  /* 葉間裂：右は大葉間裂（中葉と下葉）、左は大葉間裂（舌区と下葉） */
  sh.push(lungSeg('fissure_c',-64,-14,-96,-28,0.45,0.45), lungSeg('fissure_c',-96,-28,-128,-46,0.45,0.45), lungSeg('fissure_c',-128,-46,-146,-60,0.45,0.45));
  sh.push(lungSeg('fissure_c',62,-2,96,-14,0.45,0.45), lungSeg('fissure_c',96,-14,124,-30,0.45,0.45), lungSeg('fissure_c',124,-30,142,-46,0.45,0.45));
  if(o && o.breast) sh=sh.concat(breastSup());
  return sh;
}
/* 女性の乳房（仰臥位：外側へ流れて扁平）。胸壁の筋・骨は上書きしない */
var BR_L=[56,28,15,12,14,22,42,36,34,38,44,52], BR_FG=[30,12,6,5,6,10,22,22,22,24,26,28];
function breastSup(){ return M(mir(function(s){ var cx=s*76, cy=-98; var R=s>0?BR_L:mirR(BR_L), FG=s>0?BR_FG:mirR(BR_FG); var rr=rng(s>0?5:6), sp=[];
  var nip=[cx+s*6, cy-Rof(R,(s>0?-80:-100)*D)+1];
  function ok(x,y,c){ return c==='air'||c==='skin'||c==='fat'||c==='lig'||c==='fgt'; }
  for(var k=0;k<10;k++){ var ang=(s>0?(195+k*15):(345-k*15))*D+(rr()-0.5)*0.15; sp.push(F('lig',[cx-80,cy-60,cx+80,cy+30],(function(an){ return function(x,y,c){ if(c!=='fat') return null; var dx=x-cx, dy=y-cy; var r=Math.hypot(dx,dy); var th=Math.atan2(dy,dx)+0.1*Math.sin(r/8+an*3); var lim=Rof(FG,th); if(r<lim*0.8||r>Rof(R,th)-2.2) return null; var dd=Math.abs(((th-an+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)*r; return dd<0.45?'lig':null; }; })(ang))); }
  return [F('skin',[cx-80,cy-60,cx+80,cy+30],function(x,y,c){ if(!ok(x,y,c)) return null; var dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy), th=Math.atan2(dy,dx), Rr=Rof(R,th); if(r>Rr) return null; if(depth(x,y)>2.4) return (c==='skin')?'fat':null; return r>Rr-1.8?'skin':'fat'; }),
    F('fgt',[cx-80,cy-60,cx+80,cy+30],function(x,y,c){ if(c!=='fat') return null; var dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy), th=Math.atan2(dy,dx); var lim=Rof(FG,th)*(1+0.16*Math.sin(5*th+s)+0.08*Math.sin(13*th+2)); if(r>lim||depth(x,y)>6) return null; var n=Math.sin(x*0.33+s)*Math.sin(y*0.29)+0.6*Math.sin(x*0.12-y*0.16+s); return n>-0.5?'fgt':null; }),
    sp, E('skin',nip[0],nip[1],5.5,3.2,s*15)]; })); }
/* ---- 病変 ---- */
function chestLes(){ return [
  {id:'nodule', n:'肺結節（右肺中葉）', shapes:[F('nodule',[-110,-45,-80,-15],function(x,y,c){ if(!LUNG[c]&&c!=='fissure_c') return null; var dx=x+95, dy=y+30; var th=Math.atan2(dy,dx); return Math.hypot(dx,dy)<8*(1+0.12*Math.sin(7*th)+0.06*Math.sin(3*th+1))?'nodule':null; })]},
  {id:'mi', n:'心筋梗塞（LV心尖部〜前側壁・心内膜下）', shapes:[F('mi',HBB,function(x,y,c){ if(c!=='myo') return null; var q=uv(x,y), u=q[0], v=q[1]; if(!lvOut(u,v,0)||lvCav(u,v)) return null; if(u<34) return null;
    /* 心内膜側の半分（側壁〜心尖） */ var La=LC+TA, f=Math.sqrt(Math.max(0,1-Math.pow(Math.max(u,0)/La,2))); var fi=Math.sqrt(Math.max(0,1-Math.pow(Math.max(u,0)/LC,2.2)));
    if(v>0){ var inner=WC*fi+1, outer=(WC+TL)*f; return v<inner+(outer-inner)*0.55?'mi':null; } return u>LC-6?'mi':null; })]},
  {id:'peff', n:'心嚢液', shapes:[F('fluid',HBB,function(x,y,c){ if(heartU(x,y,GP+1.3)) return (c==='pericard_c')?'fluid':null; if(heartU(x,y,GP+8)) return 'fluid'; if(heartU(x,y,GP+9.3)&&c!=='bone'&&c!=='marrow_r'&&c!=='artery'&&c!=='esoph') return 'pericard_c'; return null; })]},
  {id:'pleff', n:'胸水（右・背側）', shapes:[F('fluid',[-170,10,-8,125],function(x,y,c){ if(!(LUNG[c]||c==='fissure_c')) return null; var meni=6*Math.exp(-Math.pow((depth(x,y)-Rof(WT,polar(x,y)[0]))/6,2)); return (y>52+0.08*(x+80)-meni)?'fluid':null; })]}
]; }

MS.PHANTOMS.chest = {n:'胸部（心臓レベル・軸位）', P:400, plane:'ax', coil:'body', coilG:0.62, fov:380, pe:'AP', shapes:chest, les:chestLes, opts:[{id:'breast',n:'乳房（女性）',def:false}], motion:{resp:3, card:5}, region:'chest', pulsatile:true};
})();
