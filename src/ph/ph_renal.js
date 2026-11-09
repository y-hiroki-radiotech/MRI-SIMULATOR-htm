(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir;
/* ---------- 上腹部（腎門・膵頭部レベル・軸位：L2 付近） ----------
 座標：x 右向き＝患者の左、y 下向き＝背側。体表からの深さで腹壁を描き、その内側に後腹膜臓器と腸管を置く。 */
MS.addTissues({
  stool_ab:{n:'便（結腸内容）', T1:[900,1100], T2:[90,80], T2s:[20,12], PD:0.8, ADC:1.0, chi:0.8, tx:{f:.12,c:.15}, src:'est'},
  cauda_r: {n:'馬尾（神経根）', T1:[900,1100], T2:[80,75], T2s:[45,35], PD:0.7, ADC:1.2, mt:0.3, src:'est'},
  rcc_cc:  {n:'腎細胞癌（淡明細胞型）', T1:[1100,1350], T2:[115,100], T2s:[45,30], PD:0.86, ADC:1.5, ff:0.06, ce:{eca:[14,7,4], eob:[8,4,2.5,1]}, tx:{f:.08,c:.16}, lesion:1, src:'est'},
  aml_fat: {n:'腎血管筋脂肪腫（脂肪成分）', T1:[360,400], T2:[60,68], T2s:[30,26], PD:0.93, ADC:0.3, ff:0.88, mt:0.05, ce:{eca:[0.5,0.8,0.8]}, lesion:1, src:'est'},
  aml_sm:  {n:'腎血管筋脂肪腫（筋・血管成分）', T1:[1050,1300], T2:[70,62], T2s:[35,25], PD:0.78, ADC:1.1, ce:{eca:[6,5,3.5]}, lesion:1, src:'est'},
  pdac_h:  {n:'膵癌（膵頭部・乏血性）', T1:[950,1250], T2:[75,68], T2s:[35,25], PD:0.8, ADC:1.1, mt:0.3, ce:{eca:[1.2,2.3,3.3], eob:[0.8,1.4,1.6,0.4]}, tx:{f:.06,c:.09}, lesion:1, src:'est'}
});
var D=Math.PI/180;
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function Rof(R,th){ var n=R.length, tt=((th/(2*Math.PI))%1+1)%1*n, i=Math.floor(tt), fr=tt-i; return cr(R[(i-1+n)%n],R[i%n],R[(i+1)%n],R[(i+2)%n],fr); }
function mirR(R){ var n=R.length; return R.map(function(_,k){ return R[((n/2-k)%n+n)%n]; }); }
function segD(x,y,ax,ay,bx,by){ var dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy, t=L2?((x-ax)*dx+(y-ay)*dy)/L2:0; t=t<0?0:t>1?1:t; var px=ax+t*dx-x, py=ay+t*dy-y; return [Math.sqrt(px*px+py*py),t]; }
function inB(R,c,x,y,g){ var dx=x-c[0], dy=y-c[1]; var r=Rof(R,Math.atan2(dy,dx))+(g||0); return r>0 && dx*dx+dy*dy<r*r; }
var C=[0,4];
var RB=[156,155,151,144,134,123,115,123,134,144,151,155,156,153,145,134,124,117,115,117,124,134,145,153];
var WT=[33,34,36,40,48,62,72,62,48,40,36,34,33,34,36,37,35,32,30,32,35,37,36,34];
function polar(x,y){ var dx=x-C[0], dy=y-C[1]; return [Math.atan2(dy,dx), Math.sqrt(dx*dx+dy*dy)]; }
function cav(x,y){ var p=polar(x,y); return Rof(RB,p[0])-p[1]-Rof(WT,p[0]); }
function atDepth(a,d){ var th=a*D, R=Rof(RB,th)-d; return [C[0]+R*Math.cos(th), C[1]+R*Math.sin(th)]; }
function band(L,a0,a1,i0,o0,i1,o1,pw){ pw=pw==null?0.45:pw; var span=((a1-a0)%360+360)%360; var xs=[],ys=[];
  for(var k=0;k<=24;k++){ var a=a0+span*k/24; [Math.min(i0,i1)-1,Math.max(o0,o1)+1].forEach(function(d){ var q=atDepth(a,d); xs.push(q[0]); ys.push(q[1]); }); }
  var bb=[Math.min.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,xs),Math.max.apply(null,ys)];
  return F(L,bb,function(x,y,c){ var p=polar(x,y); var t=((((p[0]/D)-a0)%360)+360)%360/span; if(t>1) return null;
    var dep=Rof(RB,p[0])-p[1]; var di=i0+(i1-i0)*t, dO=o0+(o1-o0)*t; var m=(di+dO)/2, h=(dO-di)/2*Math.pow(Math.max(0,Math.sin(Math.PI*t)),pw); return (dep>m-h&&dep<m+h)?L:null; }); }
function bandM(L,a0,a1,i0,o0,i1,o1,pw){ return [band(L,a0,a1,i0,o0,i1,o1,pw), band(L,180-a1,180-a0,i1,o1,i0,o0,pw)]; }

/* ---- 腎（腎門レベル）：皮質・放射状の髄質錐体・腎洞脂肪・腎盂と腎杯・腎動静脈 ----
 s=-1 右腎、+1 左腎。長軸は前外側→後内側、腎門は前内側を向く。 */
function kidneyGeo(s){ var c=s<0?[-76,42]:[76,38]; var ax=(s<0?225:315)*D; var hil=(s<0?315:225)*D; return {c:c, ax:ax, hil:hil, A:31, Bm:22}; }
function kLocal(K,x,y){ var dx=x-K.c[0], dy=y-K.c[1]; var ca=Math.cos(K.ax), sa=Math.sin(K.ax); var u=dx*ca+dy*sa, v=-dx*sa+dy*ca; var rho=Math.sqrt(u*u/(K.A*K.A)+v*v/(K.Bm*K.Bm));
  var dir=Math.atan2(dy,dx); var dh=Math.atan2(Math.sin(dir-K.hil),Math.cos(dir-K.hil)); return {rho:rho, phi:Math.atan2(v/K.Bm,u/K.A), dh:dh}; }
function kidneyFn(s){ var K=kidneyGeo(s);
  return function(x,y,c){ var q=kLocal(K,x,y); var bump=1+0.035*Math.sin(3*q.phi+s)+0.02*Math.sin(7*q.phi); var rho=q.rho/bump; if(rho>1) return null;
    var notch=Math.abs(q.dh)<0.52-0.25*Math.max(0,0.62-rho); /* 腎門の切れ込み（前内側） */
    if(rho<0.52 || (notch&&rho>0.4)){ /* 腎洞 */
      if(notch&&rho>0.86) return 'fat';
      return 'fat'; }
    if(notch) return 'fat';
    if(rho>0.8) return 'kidney_c';
    /* 錐体：外側が広く、腎洞に向かって細い（腎乳頭） */
    var n=7, ph=q.phi+Math.PI, seg=2*Math.PI/n, k=Math.round(ph/seg), d=Math.abs(ph-k*seg); var hw=seg*0.42*Math.min(1,(rho-0.5)/0.28);
    return d<hw?'kidney_m':'kidney_c'; }; }
function kBox(s){ var K=kidneyGeo(s); return [K.c[0]-35,K.c[1]-35,K.c[0]+35,K.c[1]+35]; }
/* 腎洞の中身（腎盂・腎杯・腎動静脈の枝） */
function sinusFn(s){ var K=kidneyGeo(s); var hx=Math.cos(K.hil), hy=Math.sin(K.hil);
  return function(x,y,c){ if(c!=='fat') return null; var q=kLocal(K,x,y); if(q.rho>1.45) return null; var dx=x-K.c[0], dy=y-K.c[1]; var al=dx*hx+dy*hy, pe=-dx*hy+dy*hx; /* al：腎門方向、pe：直交 */
    var ps=s<0?1:-1; /* 背側（後方）が pe の符号で変わる */
    /* 腎盂：腎洞の後方寄りから腎門の外へ */
    if(al>-8 && al<24 && Math.abs(pe-ps*4.5)<(4.4-0.12*Math.max(0,al-8))*Math.sqrt(Math.max(0,1-Math.pow((al-6)/16,2)))+1.2) return 'urine';
    /* 腎杯：錐体の先へ向かう短い枝 */
    if(q.rho<0.6 && al<2){ var ang=Math.atan2(pe,al); var k=Math.round(ang/(Math.PI/3.5)); if(Math.abs(ang-k*Math.PI/3.5)*Math.hypot(al,pe)<1.6 && q.rho>0.2) return 'urine'; }
    /* 腎静脈（前方）・腎動脈（その後ろ） */
    if(al>-2 && al<30 && Math.abs(pe+ps*8)<3.6) return 'vein';
    if(al>0 && al<30 && Math.abs(pe+ps*1.5)<2.0) return 'artery';
    return null; }; }
/* ---- 小腸（空腸：ひだが羽毛状） ---- */
function jejunum(cx,cy,R,rot,seed){ var r=rng(seed); var ph=r()*6; return F('gi_wall',[cx-R-1,cy-R-1,cx+R+1,cy+R+1],function(x,y,c){ var dx=x-cx, dy=y-cy, th=Math.atan2(dy,dx); var rr=R*(1+0.08*Math.sin(3*th+ph)); var d=Math.hypot(dx,dy); if(d>rr) return null; if(d>rr-2.2) return 'gi_wall';
  var fold=Math.cos(9*th+ph+0.18*d); if(d>rr*0.42 && fold>0.55) return 'gi_wall'; if(d<rr*0.25 && y<cy-rr*0.1 && seed%3===0) return 'air'; return 'gi_fluid'; }); }
/* ---- 結腸（ガスと便） ---- */
function colon(cx,cy,R,seed){ var r=rng(seed), ph=r()*6; return F('gi_wall',[cx-R-1,cy-R-1,cx+R+1,cy+R+1],function(x,y,c){ var dx=x-cx, dy=y-cy, th=Math.atan2(dy,dx); var rr=R*(1+0.1*Math.cos(3*th+ph)); var d=Math.hypot(dx,dy); if(d>rr) return null; if(d>rr-2.4) return 'gi_wall';
  if(d>rr-4.5 && Math.cos(5*th+ph)>0.85) return 'gi_wall'; /* 半月ひだ */
  if(y<cy-rr*0.35) return 'air'; var n=Math.sin(x*0.9+ph)*Math.sin(y*0.85)+0.4*Math.sin(x*0.3-y*0.4); return n>0.75?'air':'stool_ab'; }); }

/* ---- 肝（右葉下部）・膵頭部 ---- */
var LV_C=[-112,-34], LV_R=[34,30,24,20,24,34,46,50,46,40,38,36];
function liverIn(x,y){ if(cav(x,y)<2.2) return false; return inB(LV_R,LV_C,x,y,0); }
var PH_C=[-36,-14], PH_R=[17,15,14,14,15,17,19,20,19,17,16,17];
function pancFn(x,y,c){ if(c!=='fat') return null; var th=Math.atan2(y-PH_C[1],x-PH_C[0]); var inH=inB(PH_R,PH_C,x,y,1.3*Math.sin(7*th+1)+0.8*Math.sin(13*th)); var q=segD(x,y,-28,-2,-6,4); var inU=q[0]<(6.5-2*q[1])*(1+0.1*Math.sin(q[1]*20));
  return (inH||inU)?'pancreas':null; }

function renal(){
  var sh=M([
    B('skin',C[0],C[1],RB), B('fat',C[0],C[1],RB.map(function(r){return r-2.2;})),
    /* 腹壁：腹直筋（白線）・外/内腹斜筋・腹横筋・広背筋 */
    bandM('muscle',272.4,304,16,28,18,26,0.18),
    bandM('muscle',299,20,16,22,17,22,0.3),
    bandM('muscle',301,14,23.2,29.2,23.2,28.6,0.3),
    bandM('muscle',302,36,30.4,33.8,30,33.6,0.3),
    bandM('muscle',8,66,15,22,17,23,0.5),
    /* 腹腔・後腹膜の脂肪 */
    F('fat',[-165,-120,165,125],function(x,y,c){ return cav(x,y)>0?'fat':null; }),
    /* 第 12 肋骨の先端（背外側） */
    mir(function(s){ var q=atDepth(s>0?52:128,30); return [E('bone',q[0],q[1],8,3.4,s*40), E('marrow_r',q[0],q[1],6.5,2,s*40)]; }),
    /* 椎体（L2）・椎弓・棘突起・脊柱管と馬尾 */
    B('bone',0,48,[22,21.5,18,16,15.5,16,18,21.5,22,18,15.5,18],0), B('marrow_v',0,48,[20.2,19.7,16.2,14.2,13.7,14.2,16.2,19.7,20.2,16.2,13.7,16.2],0),
    mir(function(s){ return [S('bone',s*12,62,s*13,72,4.5), S('marrow_v',s*12,63,s*13,71,2.6), S('bone',s*14,72,s*38,72,4.0), S('marrow_v',s*15,72,s*36,72,2.2), PL('bone',[[s*13,76],[s*8,86],[s*2,90]],3.4)]; }),
    S('bone',0,88,0,106,4.5), S('marrow_v',0,89,0,105,2.4),
    E('fat',0,75,11,9.4), E('dura',0,74.5,10,8.4), E('csf',0,74.5,9.2,7.6),
    /* 脊柱起立筋・多裂筋・腰方形筋・大腰筋 */
    mir(function(s){ var R=[26,23,19,17,17,19,22,20,16,15,16,22]; if(s<0) R=mirR(R); return [B('muscle',s*31,93,R)]; }),
    mir(function(s){ return [PL('fat',[[s*14,80],[s*16,94],[s*15,108]],0.7), PL('fat',[[s*37,78],[s*40,93],[s*45,108]],0.6), S('fat',s*4.8,90,s*4.8,108,1.0)]; }),
    S('bone',0,88,0,106,4.5), S('marrow_v',0,89,0,105,2.4),
    mir(function(s){ return [B('muscle',s*33,40,s>0?[14,13,13,12,12,12,13,14,15,14,13,13]:mirR([14,13,13,12,12,12,13,14,15,14,13,13]),0), S('fat',s*31,30,s*36,50,0.5)]; }),
    /* 横隔膜脚（右が長い） */
    PL('muscle',[[-8,33],[-14,24],[-13,14]],3.0), PL('muscle',[[11,33],[15,26]],2.4),
    /* 大血管：下大静脈・大動脈・左腎静脈（大動脈と SMA の間）・右腎静脈・腎動脈（腎門まで。腎洞内は sinusFn） */
    E('vein',-27,15,13,9,-15), E('artery',4,24,10,10),
    PL('vein',[[56,26],[34,14],[14,8],[-2,7],[-16,12]],3.8), PL('vein',[[-58,25],[-40,20],[-30,16]],4.0),
    PL('artery',[[-2,27],[-18,26],[-36,27],[-56,31]],2.3), PL('artery',[[12,27],[32,29],[56,33]],2.3),
    /* 腎と腎洞、腎周囲脂肪（Gerota 筋膜） */
    mir(function(s){ var K=kidneyGeo(s); return [E('lig',K.c[0],K.c[1],K.A+7,K.Bm+6.5,K.ax/D,0.04,3,s), E('fat',K.c[0],K.c[1],K.A+6.4,K.Bm+5.9,K.ax/D,0.04,3,s)]; }),
    mir(function(s){ return [E('muscle',s*60,74,16,8.5,s*-24,0.04,3,0)]; }), /* 腰方形筋 */
    F('kidney_c',kBox(-1),kidneyFn(-1)), F('kidney_c',kBox(1),kidneyFn(1)),
    F('urine',[-110,0,-20,80],sinusFn(-1)), F('urine',[20,0,110,80],sinusFn(1)),
    /* 肝（右葉下端）と胆嚢底部 */
    F('liver',[-150,-100,-40,40],function(x,y,c){ return (c==='fat'&&liverIn(x,y))?'liver':null; }),
    B('gi_wall',-62,-70,[15,12,11,11,12,14,16,14,12,11,12,14],-40), B('bile',-62,-70,[12.8,9.8,8.8,8.8,9.8,11.8,13.8,11.8,9.8,8.8,9.8,11.8],-40),
    /* 上腸間膜動静脈と脂肪の襟、空腸枝 */
    E('fat',4,-8,8,8), E('artery',4,-8,4,4), E('vein',-10,-10,6.4,5.6),
    E('artery',14,-22,1.4,1.4), E('vein',8,-26,1.8,1.6), E('artery',24,-34,1.2,1.2), E('vein',-2,-36,1.6,1.5),
    /* 膵頭部・鉤状突起、総胆管、胃十二指腸動脈 */
    F('pancreas',[-60,-40,0,14],pancFn),
    E('bile',-44,-4,3.6,3.4), E('fluid',-38,-10,1.1,1.1), E('artery',-28,-29,1.6,1.6),
    /* 十二指腸（下行脚） */
    B('gi_wall',-64,-18,[14,13,12,12,13,14,15,14,13,12,12,13],0), F('gi_fluid',[-80,-34,-48,-2],function(x,y,c){ if(c!=='gi_wall'||!inB([14,13,12,12,13,14,15,14,13,12,12,13],[-64,-18],x,y,-2.6)) return null; return y<-26?'air':'gi_fluid'; }),
    /* 上行結腸・下行結腸・横行結腸 */
    colon(-108,8,17,3), colon(108,-6,13.5,7), colon(-6,-86,13,11),
    /* 空腸（左上腹部）と腸間膜の血管 */
    jejunum(36,-62,15,0,3), jejunum(66,-42,14,0,5), jejunum(44,-30,12,0,7), jejunum(88,-72,13,0,9), jejunum(16,-48,11,0,12), jejunum(-30,-56,11,0,15), jejunum(16,-70,10,0,18),
    E('vein',58,-60,1.5,1.4), E('artery',30,-44,1.1,1.1)
  ]);
  /* 馬尾：硬膜嚢の背側（仰臥位で沈む） */
  var r=rng(5); for(var k=0;k<14;k++){ var a=Math.PI*(0.15+0.7*r()), d=2+4.2*r(); sh.push(E('cauda_r',d*Math.cos(a)*1.3,75+d*Math.sin(a)*0.9,1.0,1.0)); }
  sh.push(E('cauda_r',-4,71,1.6,1.3), E('cauda_r',4,71,1.6,1.3));
  return sh;
}
function blob(L,cx,cy,r,w,f,ph,cond){ return F(L,[cx-r*1.4,cy-r*1.4,cx+r*1.4,cy+r*1.4],function(x,y,c){ if(cond&&!cond(c)) return null; var dx=x-cx, dy=y-cy, th=Math.atan2(dy,dx); return Math.hypot(dx,dy)<r*(1+w*Math.sin(f*th+ph))?L:null; }); }
var KID={kidney_c:1,kidney_m:1,fat:1,urine:1,vein:1,artery:1,lig:1};
function renalLes(){ return [
  {id:'rcc', n:'腎細胞癌（左腎・淡明細胞型）', shapes:[blob('rcc_cc',86,24,15,0.06,4,0.5,function(c){ return KID[c]; }),
    F('necrosis',[72,10,100,38],function(x,y,c){ if(c!=='rcc_cc') return null; var n=Math.sin(x*0.7)*Math.sin(y*0.6+1)+0.5*Math.sin(x*0.25+y*0.3); return n>0.7?'necrosis':null; })]},
  {id:'rcyst', n:'腎嚢胞（右腎・単純性）', shapes:[blob('cyst',-85,60,10,0.01,3,0,function(c){ return KID[c]; })]},
  {id:'aml', n:'腎血管筋脂肪腫（右腎・肉眼的脂肪）', shapes:[blob('aml_fat',-87,27,9,0.05,5,1,function(c){ return KID[c]; }),
    F('aml_sm',[-98,16,-76,38],function(x,y,c){ if(c!=='aml_fat') return null; var n=Math.sin(x*0.9+y*0.4)*Math.sin(y*0.8-x*0.2); return n>0.55?'aml_sm':null; })]},
  {id:'pdac', n:'膵癌（膵頭部・乏血性、総胆管拡張）', shapes:[blob('pdac_h',-30,-17,11,0.14,5,0.3,function(c){ return c==='pancreas'||c==='fat'||c==='fluid'||c==='artery'; }),
    E('bile',-45,-3,6.2,5.8), E('fluid',-38,-12,2.4,2.2)]}
]; }

MS.PHANTOMS.abdRenal = {n:'上腹部（腎門・膵頭部レベル・軸位）', P:400, plane:'ax', coil:'body', coilG:0.6, fov:380, pe:'AP', shapes:renal, les:renalLes,
  motion:{resp:8, card:0, wfn:function(x,y,k){ if(k==='bone'||k==='marrow_v'||k==='marrow_r'||k==='csf'||k==='cauda_r'||k==='dura') return 0; return Math.max(0,Math.min(1,(18-y)/95)); }},
  region:'abd', pulsatile:true, ab:['rcc_cc','kidney_c']};
})();
