/* ===== 追加シーケンスの例 1：既存の種類（k:'se'）を使い、既定値だけ変える ===== */
(function(){
var MS=window.MS;
MS.addSeq({
  id:'se_t2', k:'se', cat:'basic',
  n:'SE T2強調像（従来型SE）', gen:'Conventional spin echo T2',
  sie:['SE','o'], can:['SE','o'], ge:['SE','c'], phi:['SE','c'], fuji:['SE','c'], uih:['SE','x'],
  d:'1ライン×1TRの従来型スピンエコー。長いTR・長いTEでT2強調になる。撮像時間はTR×位相エンコード数×加算回数なので、FSEより大幅に長い。',
  p:{tr:2500, te:90, bw:130, nex:1, nx:256, ny:192}
});
})();
