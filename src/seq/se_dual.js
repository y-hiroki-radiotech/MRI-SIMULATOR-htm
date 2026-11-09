/* ===== 追加シーケンスの例 2：新しい種類（run）とパラメータ（addParam）を足す =====
   2エコーのスピンエコー：1回の励起で TE の違う2枚（プロトン密度強調・T2強調）を同時に得る */
(function(){
var MS=window.MS, E=Math.exp;
MS.addParam(['te2se','TE（第2エコー）','ms',20,300,1,'con','2つ目のエコーのTE。長いほどT2強調になる。']);
MS.addSeq({
  id:'se_dual', k:'se_dual', cat:'basic', x:{timeAs:'se'},      /* 撮像時間・最短TEの計算は SE と同じ扱い */
  n:'2エコーSE（PD＋T2）', gen:'Dual-echo spin echo',
  sie:['SE (2 echo)','c'], can:['SE (Dual echo)','x'], ge:['Dual Echo SE','x'], phi:['SE (Dual echo)','x'],
  d:'1回の励起の後に180°パルスを2回打ち、短いTE（PD強調）と長いTE（T2強調）の2枚を同じ時間で得る。昔の頭部ルーチン。',
  p:{tr:2500, te:20, te2se:90, bw:130, nex:1, nx:256, ny:192},
  run:function(ctx,p,sq,st){ var A=MS.SEQAPI, TR=p.tr;
    function acq(TE){ return {fs:A.fsSig(st), tr:TR, sig:function(tp,df,b1){
      var M=1-2*E(-(TR-TE/2)/tp.T1)+E(-TR/tp.T1), Mf=1-2*E(-(TR-TE/2)/tp.fT1)+E(-TR/tp.fT1);
      var e=A.excF(b1)*A.refF(b1), fv=A.flowVoid(tp,TE,p.thk);
      return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*e*fv, f:tp.PD*tp.ff*Mf*E(-TE/tp.fT2)*e}; }}; }
    var te2=Math.max(p.te2se, p.te+10);
    return [A.one(ctx,acq(p.te),'第1エコー（PD強調）TE '+MS.fmt(p.te)+' ms'), A.one(ctx,acq(te2),'第2エコー（T2強調）TE '+MS.fmt(te2)+' ms')]; }
});
})();
