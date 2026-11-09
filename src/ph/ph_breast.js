(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir;
/* ---------- 乳房（腹臥位・両側・軸位） ----------
 座標：x 右向き＝患者の左、y 下向き＝背側。腹臥位で乳房は前方（画像の上）へ垂れ下がる。胸壁は画像の下側。 */
MS.addTissues({
  idc_br:{n:'浸潤性乳癌（浸潤性乳管癌）', T1:[1050,1350], T2:[75,68], T2s:[35,25], PD:0.8, ADC:0.85, mt:0.3, ce:{eca:[9,5.5,3.5]}, tx:{f:.06,c:.09}, lesion:1, src:'est'},
  fa_br: {n:'線維腺腫', T1:[1150,1400], T2:[120,105], T2s:[55,40], PD:0.86, ADC:1.6, ce:{eca:[1.4,3,4.6]}, tx:{f:.04,c:.04}, lesion:1, src:'est'}
});
var D=Math.PI/180;
function cr(p0,p1,p2,p3,t){ var t2=t*t,t3=t2*t; return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3); }
function Rof(R,th){ var n=R.length, tt=((th/(2*Math.PI))%1+1)%1*n, i=Math.floor(tt), fr=tt-i; return cr(R[(i-1+n)%n],R[i%n],R[(i+1)%n],R[(i+2)%n],fr); }
function mirR(R){ var n=R.length; return R.map(function(_,k){ return R[((n/2-k)%n+n)%n]; }); }
function inB(R,c,x,y,g){ var dx=x-c[0], dy=y-c[1]; var r=Rof(R,Math.atan2(dy,dx))+(g||0); return r>0 && dx*dx+dy*dy<r*r; }
function segD(x,y,ax,ay,bx,by){ var dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy, t=L2?((x-ax)*dx+(y-ay)*dy)/L2:0; t=t<0?0:t>1?1:t; var px=ax+t*dx-x, py=ay+t*dy-y; return [Math.sqrt(px*px+py*py),t]; }
/* 滑らかな擬似乱数場（向きの違う余弦波の和、およそ −1〜1） */
function noise(seed,n,k0,k1){ var r=rng(seed), w=[]; for(var i=0;i<n;i++){ var a=r()*Math.PI, k=k0+(k1-k0)*r(); w.push([k*Math.cos(a),k*Math.sin(a),r()*6.283]); }
  return function(x,y){ var s=0; for(var i=0;i<w.length;i++) s+=Math.cos(w[i][0]*x+w[i][1]*y+w[i][2]); return s/Math.sqrt(w.length/2); }; }
/* 胸壁：前胸部の体表 y=cw(x)。そこからの深さで層を作る */
function cw(x){ return 12+0.0034*x*x+0.0000002*x*x*x*x; }
var BODY_C=[0,112], BODY_R=[168,176,186,190,190,186,176,168,156,124,101,101,124,156]; /* 14 点・左右対称 */
/* 乳房（左：s=+1、右：s=-1）。中心は胸壁の少し前、前方（270°）へ長い */
var BRL=[72,76,68,56,54,56,60,62,62,64,72,92,106,94,76,70]; /* 0°=外側（左乳房） */
function brR(s){ return s>0?BRL:mirR(BRL); }
function brC(s){ return [s*82,8]; }
var FG=[40,36,22,14,14,20,30,38,40,44,52,66,78,68,52,44];
function fgR(s){ return s>0?FG:mirR(FG); }
var NZ=[noise(3,9,0.08,0.22),noise(8,9,0.08,0.22)], NZ2=[noise(13,7,0.25,0.5),noise(17,7,0.25,0.5)];
function inBreast(s,x,y,g){ return inB(brR(s),brC(s),x,y,g); }
function breastFn(s){ var c=brC(s), R=brR(s), FR=fgR(s), nz=NZ[s>0?1:0], nz2=NZ2[s>0?1:0];
  return function(x,y,cur){ if(!(cur==='air'||cur==='skin'||cur==='fat')) return null; var dx=x-c[0], dy=y-c[1], r=Math.hypot(dx,dy), th=Math.atan2(dy,dx); var Rr=Rof(R,th); if(r>Rr) return null;
    var body=y>cw(x)-1.5; /* 胸壁の中は脂肪だけ書き換える */
    if(!body && r>Rr-1.9) return 'skin';
    if(body && cur==='skin') return 'fat';
    if(y>cw(x)+7) return null;          /* 乳腺後脂肪より奥は描かない */
    var lim=Rof(FR,th)*(1+0.12*nz(x*0.5,y*0.5)); if(y>cw(x)-4) lim=0; /* 乳腺後脂肪 */
    if(r<lim && r<Rr-7){ var v=nz(x,y)+0.55*nz2(x,y)+0.6*(1-r/lim); return v>0.1?'fgt':'fat'; }
    return 'fat'; }; }

function breast(){
  var sh=M([
    B('skin',BODY_C[0],BODY_C[1],BODY_R), B('fat',BODY_C[0],BODY_C[1],BODY_R.map(function(r){return r-2;})),
    /* 胸壁の層：大胸筋・小胸筋・前鋸筋（外側）・肋骨と肋間筋・胸骨 */
    F('muscle',[-180,-10,180,180],function(x,y,c){ if(c!=='fat') return null; var ax=Math.abs(x), d=y-cw(x);
      var pm0=8+0.012*ax, pm1=pm0+Math.max(0,13-0.05*ax)*Math.min(1,(ax-12)/14); if(ax>12 && ax<150 && d>pm0 && d<pm1) return 'muscle';
      if(ax>62 && ax<128 && d>pm1+1 && d<pm1+6.5*Math.sin(Math.PI*(ax-62)/66)+1) return 'muscle';
      if(ax>138 && d>9 && d<20 && y<120) return 'muscle';
      var ic=23+0.02*ax; if(d>ic && d<ic+9 && ax>14) return 'muscle';
      if(d>ic+9 && d<ic+10) return 'fat';
      if(d>=ic+10) return 'lung';
      return null; })
  ]);
  /* 肋骨（前方は肋軟骨）と胸骨 */
  [[-148,0],[-118,0],[-88,0],[-58,1],[-30,1],[30,1],[58,1],[88,0],[118,0],[148,0]].forEach(function(R){ var x=R[0], ax=Math.abs(x); var y=cw(x)+27.5+0.02*ax; var slope=Math.atan(0.0068*x+0.0000008*x*x*x)/D; var len=ax<40?13:20;
    if(R[1]) sh.push(E('cartilage',x,y,len/2,3.6,slope)); else { sh.push(E('bone',x,y,len/2,3.7,slope)); sh.push(E('marrow_r',x,y,len/2-1.4,2.3,slope)); } });
  sh=sh.concat(M([
    E('bone',0,cw(0)+28,13,5.6,0,0.04,4,0), E('marrow_r',0,cw(0)+28,11.4,4,0,0.04,4,0),
    mir(function(s){ return [E('fat',s*23,cw(23)+39,6,3.4), E('artery',s*25,cw(25)+39,1.4,1.4), E('vein',s*20.5,cw(20)+39,1.7,1.6)]; }),
    /* 前縦隔の脂肪・心臓（右室・左室の前部）・肺 */
    B('fat',8,98,[40,30,26,26,30,34,38,34,22,18,22,34]),
    B('pericard_b',16,138,[64,60,58,58,60,64,70,64,50,46,50,58]), B('fat',16,138,[62.5,58.5,56.5,56.5,58.5,62.5,68.5,62.5,48.5,44.5,48.5,56.5]),
    B('myo',18,140,[56,54,52,52,54,58,62,56,44,40,44,52]), B('blood_c',16,142,[51,50,48,48,50,54,58,52,40,36,40,48]),
    B('myo',64,158,[36,36,36,36,36,36,36,36,34,32,32,34]), B('blood_c',68,164,[24,24,24,24,24,24,24,24,23,22,22,23]),
    E('fat',38,98,4,3.2), E('artery',38,98,1.4,1.4)
  ]));
  /* 肺血管 */
  var r=rng(41); for(var k=0;k<60;k++){ var x=(r()<0.5?-1:1)*(40+130*r()), y=cw(x)+42+r()*90; var rr=0.6+1.4*r(); var a=r()*Math.PI, l=r()<0.5?0:3+r()*6;
    sh.push((function(ax,ay,bx,by,R){ return F('vessel_l',[Math.min(ax,bx)-R-1,Math.min(ay,by)-R-1,Math.max(ax,bx)+R+1,Math.max(ay,by)+R+1],function(xx,yy,c){ return (c==='lung'&&segD(xx,yy,ax,ay,bx,by)[0]<R)?'vessel_l':null; }); })(x,y,x+l*Math.cos(a),y+l*Math.sin(a),rr)); }
  /* 乳房：皮膚・皮下脂肪・乳腺実質（不均一）・Cooper 靭帯・乳頭と乳管・表在静脈 */
  sh=sh.concat(M(mir(function(s){ var c=brC(s), R=brR(s), FR=fgR(s); var bb=[c[0]-75,c[1]-125,c[0]+75,c[1]+75]; var rr=rng(s>0?71:72), o=[];
    o.push(F('fat',bb,breastFn(s)));
    /* Cooper 靭帯：乳腺の縁から皮膚へ向かう弓状の線 */
    for(var k=0;k<13;k++){ var ang=(s>0?(195+k*13):(345-k*13))*D+(rr()-0.5)*0.12, bend=(rr()-0.5)*0.5;
      var lb=(function(an,bd){ var xs=[],ys=[]; for(var t=0;t<=1.001;t+=0.25){ var a2=an+bd*t*t, rr2=Rof(FR,an)*0.8+(Rof(R,an)-Rof(FR,an)*0.8)*t; xs.push(c[0]+rr2*Math.cos(a2)); ys.push(c[1]+rr2*Math.sin(a2)); } return [Math.min.apply(null,xs)-3,Math.min.apply(null,ys)-3,Math.max.apply(null,xs)+3,Math.max.apply(null,ys)+3]; })(ang,bend);
      o.push(F('lig',lb,(function(an,bd){ return function(x,y,cu){ if(cu!=='fat'||y>cw(x)-3) return null; var dx=x-c[0], dy=y-c[1], r0=Math.hypot(dx,dy); var th=Math.atan2(dy,dx); var lim=Rof(FR,an); var Rr=Rof(R,an); if(r0<lim*0.82||r0>Rr-2.2) return null; var t=(r0-lim)/(Rr-lim); var ta=an+bd*t*t;
        var dd=Math.abs(Math.atan2(Math.sin(th-ta),Math.cos(th-ta)))*r0; return dd<0.42?'lig':null; }; })(ang,bend))); }
    /* 乳頭と乳管（乳頭へ収束する索状の乳腺） */
    var tip=[c[0]+s*4, c[1]-Rof(R,(s>0?-86:-94)*D)];
    o.push(E('skin',tip[0],tip[1]+1,6,5)); o.push(E('fgt',tip[0],tip[1]+5.5,4.5,3.5));
    for(var j=-2;j<=2;j++) o.push((function(jj){ var ax=tip[0]+jj*2, ay=tip[1]+6, bx=c[0]+s*4+jj*9, by=c[1]-Rof(FR,(s>0?-86:-94)*D)+4; return F('fgt',[Math.min(ax,bx)-2,Math.min(ay,by)-2,Math.max(ax,bx)+2,Math.max(ay,by)+2],function(x,y,cu){ if(cu!=='fat') return null; return segD(x,y,ax,ay,bx,by)[0]<0.9?'fgt':null; }); })(j));
    /* 表在静脈（皮下脂肪の中） */
    [[0.55,212],[0.7,240],[0.6,300],[0.75,320]].forEach(function(V){ var a=(s>0?V[1]:180-V[1])*D, rad=Rof(R,a)-6; o.push((function(px,py){ return F('vein',[px-2,py-2,px+2,py+2],function(x,y,cu){ return (cu==='fat'&&Math.hypot(x-px,y-py)<1.3)?'vein':null; }); })(c[0]+rad*Math.cos(a),c[1]+rad*Math.sin(a))); });
    return o; })));
  return sh;
}
MS.addTissues({ pericard_b:{n:'心膜', T1:[800,1000], T2:[25,22], T2s:[12,8], PD:0.45, ADC:0.8, mt:0.4, src:'est'} });
var BRK={fgt:1,fat:1,lig:1,vein:1};
function breastLes(){ return [
  {id:'idc', n:'浸潤性乳癌（左乳房・外側、スピキュラ）', shapes:(function(){ var cx=104, cy=-52, o=[]; var r=rng(91);
    o.push(F('idc_br',[cx-14,cy-14,cx+14,cy+14],function(x,y,c){ if(!BRK[c]) return null; var dx=x-cx, dy=y-cy, th=Math.atan2(dy,dx); return Math.hypot(dx,dy)<8.5*(1+0.16*Math.sin(5*th+0.7)+0.1*Math.sin(9*th)) ?'idc_br':null; }));
    for(var k=0;k<11;k++){ var a=k/11*2*Math.PI+r()*0.4, l=8+r()*10; var ax=cx+7*Math.cos(a), ay=cy+7*Math.sin(a), bx=cx+(7+l)*Math.cos(a+0.15*(r()-0.5)), by=cy+(7+l)*Math.sin(a+0.15*(r()-0.5));
      o.push((function(ax,ay,bx,by){ return F('idc_br',[Math.min(ax,bx)-2,Math.min(ay,by)-2,Math.max(ax,bx)+2,Math.max(ay,by)+2],function(x,y,c){ if(!BRK[c]) return null; var q=segD(x,y,ax,ay,bx,by); return q[0]<1.3*(1-q[1])+0.25?'idc_br':null; }); })(ax,ay,bx,by)); }
    return o; })()},
  {id:'fa', n:'線維腺腫（右乳房・境界明瞭）', shapes:[F('fa_br',[-98,-80,-60,-48],function(x,y,c){ if(!BRK[c]) return null; var ca=Math.cos(20*D), sa=Math.sin(20*D), dx=x+79, dy=y+64, u=dx*ca+dy*sa, v=-dx*sa+dy*ca; var th=Math.atan2(v,u); var q=Math.hypot(u/12.5,v/8.5)/(1+0.06*Math.sin(3*th+1)); if(q>1) return null;
      /* 内部の造影されない隔壁（低信号の線） */ if(q<0.85 && Math.abs(v-0.35*u+1)<0.45) return 'lig'; if(q<0.8 && Math.abs(u+0.4*v-4)<0.4 && v>-2) return 'lig'; return 'fa_br'; })]},
  {id:'bcyst', n:'乳腺嚢胞（左乳房・内側）', shapes:[F('cyst',[40,-50,64,-26],function(x,y,c){ return (BRK[c]&&Math.hypot((x-52)/6.5,(y+38)/5.8)<1)?'cyst':null; })]}
]; }

MS.PHANTOMS.breast = {n:'乳房（腹臥位・両側・軸位）', P:360, plane:'ax', coil:'breast', coilG:0.85, fov:340, pe:'RL', shapes:breast, les:breastLes,
  motion:{resp:2, card:0, wfn:function(x,y,k){ if(k==='bone'||k==='marrow_r') return 0.1; return Math.max(0,Math.min(1,(y-cw(x)-5)/60)); }},
  region:'breast', pulsatile:true, ab:['idc_br','fgt'], def:{fov:340,pfov:100,nx:448,ny:384,thk:3,nsl:60}};
})();
