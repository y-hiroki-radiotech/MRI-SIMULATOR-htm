(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir;
/* ---------- 上腹部（膵体部レベル・軸位：L1 付近） ----------
 座標：x 右向き＝患者の左、y 下向き＝背側。体表からの深さで腹壁の層を描き、その内側（腹腔・後腹膜）に臓器を置く。 */
MS.addTissues({
  stool_ab:{n:'便（結腸内容）', T1:[900,1100], T2:[90,80], T2s:[20,12], PD:0.8, ADC:1.0, chi:0.8, tx:{f:.12,c:.15}, src:'est'}
});
var D=Math.PI/180;
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function Rof(R,th){ var n=R.length, tt=((th/(2*Math.PI))%1+1)%1*n, i=Math.floor(tt), fr=tt-i; return cr(R[(i-1+n)%n],R[i%n],R[(i+1)%n],R[(i+2)%n],fr); }
function mirR(R){ var n=R.length; return R.map(function(_,k){ return R[((n/2-k)%n+n)%n]; }); }
function segD(x,y,ax,ay,bx,by){ var dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy, t=L2?((x-ax)*dx+(y-ay)*dy)/L2:0; t=t<0?0:t>1?1:t; var px=ax+t*dx-x, py=ay+t*dy-y; return [Math.sqrt(px*px+py*py),t]; }
function polyD(x,y,pts){ var best=1e9, bs=0, acc=0, tot=0, i; for(i=0;i<pts.length-1;i++) tot+=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);
  for(i=0;i<pts.length-1;i++){ var L=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]); var q=segD(x,y,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]); if(q[0]<best){ best=q[0]; bs=(acc+q[1]*L)/tot; } acc+=L; } return [best,bs]; }
function inB(R,c,x,y,g){ var dx=x-c[0], dy=y-c[1]; var r=Rof(R,Math.atan2(dy,dx))+(g||0); return r>0 && dx*dx+dy*dy<r*r; }
/* 体表と腹壁の厚さ（0°=患者の左、90°=背側、180°=右、270°=腹側） */
var C=[0,4];
var RB=[158,157,153,146,136,124,116,124,136,146,153,157,158,155,147,136,126,119,117,119,126,136,147,155];
var WT=[34,35,36,38,46,62,72,62,46,38,36,35,34,35,37,38,36,33,31,33,36,38,37,35];
function polar(x,y){ var dx=x-C[0], dy=y-C[1]; return [Math.atan2(dy,dx), Math.sqrt(dx*dx+dy*dy)]; }
function depth(x,y){ var p=polar(x,y); return Rof(RB,p[0])-p[1]; }
function cav(x,y){ var p=polar(x,y); return Rof(RB,p[0])-p[1]-Rof(WT,p[0]); }   /* 腹腔の壁から内側への距離 */
function atDepth(a,d){ var th=a*D, R=Rof(RB,th)-d; return [C[0]+R*Math.cos(th), C[1]+R*Math.sin(th)]; }
function band(L,a0,a1,i0,o0,i1,o1,pw){ pw=pw==null?0.45:pw; var span=((a1-a0)%360+360)%360; var xs=[],ys=[];
  for(var k=0;k<=24;k++){ var a=a0+span*k/24; [Math.min(i0,i1)-1,Math.max(o0,o1)+1].forEach(function(d){ var q=atDepth(a,d); xs.push(q[0]); ys.push(q[1]); }); }
  var bb=[Math.min.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,xs),Math.max.apply(null,ys)];
  return F(L,bb,function(x,y,c){ var p=polar(x,y); var t=((((p[0]/D)-a0)%360)+360)%360/span; if(t>1) return null;
    var dep=Rof(RB,p[0])-p[1]; var di=i0+(i1-i0)*t, dO=o0+(o1-o0)*t; var m=(di+dO)/2, h=(dO-di)/2*Math.pow(Math.max(0,Math.sin(Math.PI*t)),pw); return (dep>m-h&&dep<m+h)?L:null; }); }
function bandM(L,a0,a1,i0,o0,i1,o1,pw){ return [band(L,a0,a1,i0,o0,i1,o1,pw), band(L,180-a1,180-a0,i1,o1,i0,o0,pw)]; }
function rib(a,d,len,t,tilt){ var q=atDepth(a,d), rot=a+90+(tilt||0); return [E('bone',q[0],q[1],len/2,t/2,rot), E('marrow_r',q[0],q[1],len/2-1.4,t/2-1.4,rot)]; }
/* 臓器の中だけに描く枝（肝静脈・門脈） */
function inSeg(L,ok,ax,ay,bx,by,r0,r1){ var m=Math.max(r0,r1)+0.5; return F(L,[Math.min(ax,bx)-m,Math.min(ay,by)-m,Math.max(ax,bx)+m,Math.max(ay,by)+m],function(x,y,c){ if(!ok[c]) return null; var q=segD(x,y,ax,ay,bx,by); return q[0]<r0+(r1-r0)*q[1]?L:null; }); }
function tree(out,L,ok,x,y,ang,len,r,dep,R){ var a=ang*D, x2=x+len*Math.cos(a), y2=y+len*Math.sin(a); out.push(inSeg(L,ok,x,y,x2,y2,r,r*0.8));
  if(dep<=0||r<0.8) return; var sp=20+R()*16; tree(out,L,ok,x2,y2,ang-sp*(0.5+R()*0.6),len*(0.66+R()*0.18),r*0.72,dep-1,R); tree(out,L,ok,x2,y2,ang+sp*(0.5+R()*0.6),len*(0.66+R()*0.18),r*0.68,dep-1,R); }

/* ---- 肝（腹腔の壁に沿う。右葉・尾状葉・左葉外側区） ---- */
function liverIn(x,y){ var cv=cav(x,y); var p=polar(x,y), deg=((p[0]/D)%360+360)%360; var dI=(deg>95&&deg<170)?6:2.2; if(cv<dI) return false;
  var right = x < -40 - 0.16*Math.max(0,y-15) + 5*Math.sin((y+30)*0.045) - 0.004*Math.pow(Math.min(0,y+20),2);
  var left  = x < 30 && y < -46 - 0.32*(x+42) && (x<-42 || y < -46);
  var quad  = x>=-46 && x<-18 && y < -36 - 0.9*(x+46);
  var caud  = Math.pow((x+31)/11,2)+Math.pow((y+5)/9,2)<1;
  return right||left||quad||caud; }
var LIV={liver:1};
/* ---- 脾（左の背外側、腹腔の壁に沿う三日月形） ---- */
function spleenIn(x,y){ var cv=cav(x,y); if(cv<5.5) return false; var p=polar(x,y), deg=((p[0]/D)%360+360)%360; if(deg>180) deg-=360; if(deg<-8||deg>54) return false;
  var t=(deg+8)/62, th=36*Math.pow(Math.sin(Math.PI*t),0.55)+4; return cv<5.5+th; }
/* ---- 胃（体部＋前庭部、壁とひだ） ---- */
var SB_C=[66,-58], SB_R=[38,30,25,22,24,28,44,36,26,22,25,32], SA_C=[8,-54], SA_R=[26,16,11,10,11,14,18,14,11,10,12,20];
function stomachFn(x,y,c){ var wb=inB(SB_R,SB_C,x,y,0), wa=inB(SA_R,SA_C,x,y,0); if(!wb&&!wa) return null;
  var th1=Math.atan2(y-SB_C[1],x-SB_C[0]), th2=Math.atan2(y-SA_C[1],x-SA_C[0]); var f1=Math.pow(Math.max(0,Math.cos(9*th1+0.6*Math.sin(3*th1))),2)*2.6, f2=Math.pow(Math.max(0,Math.cos(7*th2)),2)*1.6;
  var lb=inB(SB_R,SB_C,x,y,-4.2-f1), la=inB(SA_R,SA_C,x,y,-3.8-f2);
  if(lb||la) return y< -70 ? 'air' : 'gi_fluid';
  return 'gi_wall'; }
/* ---- 膵（体尾部：膵頸部から脾門へ、分葉状） ---- */
var PANC=[[-14,-30],[6,-31],[30,-26],[52,-16],[74,-2],[92,12],[102,22]], PRAD=[10,10.5,10,9.5,9,8,6];
function pancFn(x,y,c){ if(c!=='fat') return null; var q=polyD(x,y,PANC); var s=q[1]*(PANC.length-1), i=Math.min(PANC.length-2,Math.floor(s)), f=s-i; var r=PRAD[i]*(1-f)+PRAD[i+1]*f;
  var lob=1+0.12*Math.sin(q[1]*60)+0.07*Math.sin(q[1]*143+1.3); if(q[0]>r*lob) return null;
  if(q[0]>r*lob-1.4 && Math.sin(q[1]*47+2*Math.sin(q[1]*13))*Math.sin(q[1]*29+1)>0.55) return 'fat'; /* 分葉の間の脂肪 */
  if(q[0]<0.9 && q[1]>0.04 && q[1]<0.86) return 'fluid'; /* 主膵管 */
  return 'pancreas'; }

function abdomen(){
  var sh=M([
    B('skin',C[0],C[1],RB), B('fat',C[0],C[1],RB.map(function(r){return r-2.2;})),
    /* 腹直筋（白線で左右に分かれる） */
    bandM('muscle',272.2,302,17,29,19,27,0.18),
    /* 外腹斜筋・内腹斜筋・腹横筋（筋の間に薄い脂肪） */
    bandM('muscle',298,12,17,23,17,23,0.3),
    bandM('muscle',300,8,24.2,30.5,24.2,29.5,0.3),
    bandM('muscle',301,22,31.6,35.4,31,34.5,0.3),
    /* 広背筋（背外側、浅層） */
    bandM('muscle',350,72,15,24,17,25,0.5)
  ]);
  /* 肋骨（第 9〜12 肋骨、腹壁の筋の間・横隔膜の外側） */
  [[350,27,0,16],[10,27,4,20],[28,29,5,20],[46,33,-4,18],[62,40,-6,15]].forEach(function(R){ sh.push(rib(R[0],R[1],R[3],7,R[2])); sh.push(rib(180-R[0],R[1]+0.6,R[3]*0.95,7,-R[2])); });
  sh=sh.concat(M([
    /* 腹腔・後腹膜の脂肪と横隔膜（背外側） */
    F('fat',[-165,-120,165,125],function(x,y,c){ var cv=cav(x,y); if(cv<=0) return null; var p=polar(x,y), deg=((p[0]/D)%360+360)%360;
      if(cv<5 && cv>1.2 && ((deg>8&&deg<72)||(deg>108&&deg<172))) return 'muscle'; return 'fat'; }),
    /* 椎体（L1）・椎弓・棘突起・脊柱管（円錐部） */
    B('bone',0,50,[21,20.5,17,15,14.5,15,17,20.5,21,17,14.5,17],0), B('marrow_v',0,50,[19.3,18.8,15.3,13.3,12.8,13.3,15.3,18.8,19.3,15.3,12.8,15.3],0),
    mir(function(s){ return [S('bone',s*12,62,s*13,72,4.3), S('marrow_v',s*12,63,s*13,71,2.4), S('bone',s*13,72,s*32,74,4.0), S('marrow_v',s*14,72,s*30,74,2.2), PL('bone',[[s*13,76],[s*8,86],[s*2,90]],3.2)]; }),
    S('bone',0,88,0,104,4.2), S('marrow_v',0,89,0,103,2.2),
    E('fat',0,74.5,10.5,9), E('dura',0,74,9.4,8), E('csf',0,74,8.6,7.2), E('cord',0,73,3.8,3.2),
    /* 脊柱起立筋・多裂筋 */
    mir(function(s){ var R=[27,24,19,17,17,19,22,20,16,15,16,22]; if(s<0) R=mirR(R); return [B('muscle',s*32,92,R)]; }),
    mir(function(s){ return [PL('fat',[[s*14,80],[s*16,94],[s*15,108]],0.7), PL('fat',[[s*38,76],[s*41,92],[s*46,108]],0.6), S('fat',s*4.8,90,s*4.8,108,1.0)]; }),
    S('bone',0,88,0,104,4.2), S('marrow_v',0,89,0,103,2.2),
    /* 大腰筋（起始部）・横隔膜脚 */
    mir(function(s){ return [E('muscle',s*25,42,7,9,s*20)]; }),
    PL('muscle',[[-6,35],[-15,28],[-20,16],[-17,2],[-10,-6]],4.2), PL('muscle',[[10,35],[19,28],[23,16],[20,4],[15,-3]],3.6),
    /* 肝 */
    F('liver',[-125,-95,40,80],function(x,y,c){ return (c==='fat'&&liverIn(x,y))?'liver':null; })
  ]));
  /* 肝静脈（下大静脈へ）・門脈枝（肝門から） */
  var r=rng(21), hv=[];
  [[-44,4,188,18,2.6],[-44,-2,222,16,2.2],[-44,10,150,15,2.0]].forEach(function(T){ tree(hv,'vein',LIV,T[0],T[1],T[2],T[3],T[4],2,r); });
  [[-35,-25,196,20,3.4],[-35,-21,160,20,3.0],[-30,-30,282,14,2.6]].forEach(function(T){ tree(hv,'portal',LIV,T[0],T[1],T[2],T[3],T[4],2,r); });
  tree(hv,'portal',LIV,-26,-48,300,14,2.6,2,r);
  sh=sh.concat(hv);
  sh=sh.concat(M([
    /* 脾と脾門の血管 */
    F('spleen',[30,-50,160,120],function(x,y,c){ return (c==='fat'&&spleenIn(x,y))?'spleen':null; }),
    /* 腎（上極）と腎周囲脂肪、副腎 */
    B('kidney_c',-60,64,[19,18,17,18,19,20,21,19,18,17,18,19],-30), E('kidney_m',-58,62,5,3.6,-30), E('kidney_m',-67,66,4.4,3.6,40), E('kidney_m',-53,70,4.4,3.2,10),
    B('kidney_c',62,58,[21,20,18,19,20,21,21,20,19,18,19,20],30), E('kidney_m',61,56,5.4,4,30), E('kidney_m',70,61,4.6,3.6,-40), E('kidney_m',55,65,4.6,3.2,-10),
    PL('adrenal',[[-34,20],[-37,30]],2.2), PL('adrenal',[[-37,30],[-33,44]],1.8), PL('adrenal',[[-37,30],[-46,40]],1.8),
    PL('adrenal',[[30,20],[33,30]],2.2), PL('adrenal',[[33,30],[30,44]],1.8), PL('adrenal',[[33,30],[42,42]],1.8),
    /* 大血管：下大静脈・大動脈・上腸間膜動脈（脂肪の襟）・総肝動脈・脾動静脈・門脈 */
    E('vein',-29,10,13,9.5,-20), E('artery',3,22,11,11),
    E('fat',3,-6,8.5,8.5), E('artery',3,-6,4,4),
    PL('artery',[[3,-14],[-10,-24],[-28,-30],[-36,-30]],2.2),
    PL('vein',[[-12,-17],[8,-17],[30,-11],[52,0],[74,13],[92,24],[104,30]],3.6),
    E('portal',-27,-22,10.5,7.5,-25),
    F('pancreas',[-30,-48,115,40],pancFn),
    E('artery',20,-20,2.2,2), E('artery',44,-10,2.4,2.1), S('artery',60,-1,70,5,2.0), E('artery',86,15,2.2,2), S('artery',96,22,104,25,1.8),
    /* 胃（前庭部〜体部、ひだ・液体・空気） */
    F('gi_wall',[-30,-110,115,-30],stomachFn),
    /* 結腸：肝弯曲・横行結腸・脾弯曲（ガスと便） */
    B('gi_wall',-96,-52,[17,15,14,15,17,18,18,17,16,15,15,16],20), F('stool_ab',[-118,-74,-74,-30],function(x,y,c){ if(c!=='gi_wall'||!inB([17,15,14,15,17,18,18,17,16,15,15,16],[-96,-52],x,y,-2.5)) return null; return (y<-58)?'air':((Math.sin(x*0.9)*Math.sin(y*0.8)>0.6)?'air':'stool_ab'); }),
    E('gi_wall',34,-84,13,8.5,-8), E('air',34,-85,10.5,6,-8),
    B('gi_wall',108,-34,[15,14,13,14,15,16,16,15,14,13,13,14],0), F('stool_ab',[90,-52,126,-16],function(x,y,c){ if(c!=='gi_wall'||!inB([15,14,13,14,15,16,16,15,14,13,13,14],[108,-34],x,y,-2.5)) return null; return y<-38?'air':'stool_ab'; }),
    /* 胆嚢（壁と胆汁） */
    B('gi_wall',-52,-60,[16,12,10,10,12,14,17,14,11,10,11,14],-35), B('bile',-52,-60,[13.8,9.8,7.8,7.8,9.8,11.8,14.8,11.8,8.8,7.8,8.8,11.8],-35)
  ]));
  return sh;
}
var LIVL={liver:1,vein:1,portal:1};
function inLiv(c){ return !!LIVL[c]; }
function lesBlob(L,cx,cy,r,w,f,ph,cond){ return F(L,[cx-r*1.3,cy-r*1.3,cx+r*1.3,cy+r*1.3],function(x,y,c){ if(!cond(c)) return null; var dx=x-cx, dy=y-cy, th=Math.atan2(dy,dx); return Math.hypot(dx,dy)<r*(1+w*Math.sin(f*th+ph))?L:null; }); }
function abdLes(){ var LV=function(c){ return inLiv(c)||c==='hcc_cap'||c==='hcc'||c==='met_rim'||c==='hem_core'; };
  return [
  {id:'hcc', n:'肝細胞癌（右葉後区・被膜あり）', shapes:[lesBlob('hcc_cap',-96,30,15,0.03,5,0,inLiv), lesBlob('hcc',-96,30,13.2,0.05,6,0,LV)]},
  {id:'hemang', n:'肝血管腫（右葉前区）', shapes:[lesBlob('hem_core',-100,-22,11,0.06,5,1,inLiv), F('hem_rim',[-113,-35,-87,-9],function(x,y,c){ if(c!=='hem_core') return null; var dx=(x+100)/11, dy=(y+22)/10.5, q=Math.hypot(dx,dy), th=Math.atan2(dy,dx); return (q>0.66&&Math.cos(6*th)>0.15)?'hem_rim':null; })]},
  {id:'cyst', n:'肝嚢胞（左葉外側区）', shapes:[lesBlob('cyst',-18,-72,6.5,0.02,3,0,inLiv)]},
  {id:'met', n:'肝転移（2個）', shapes:[lesBlob('met_rim',-72,-60,9,0.06,5,0,inLiv), lesBlob('met_core',-72,-60,5,0.05,4,1,function(c){return c==='met_rim';}), lesBlob('met_rim',-76,50,7.5,0.06,5,2,inLiv), lesBlob('met_core',-76,50,3.8,0.05,4,1,function(c){return c==='met_rim';})]},
  {id:'adenoma', n:'副腎腺腫（左・脂質含有）', shapes:[E('adenoma',35,36,7.5,6.5,20)]}
]; }

MS.PHANTOMS.abdomen = {n:'上腹部（膵体部レベル・軸位）', P:400, plane:'ax', coil:'body', coilG:0.6, fov:380, pe:'AP', shapes:abdomen, les:abdLes, motion:{resp:9, card:0}, region:'abd', pulsatile:true};
})();
