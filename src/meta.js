(function(){
var MS=window.MS;
MS.pack=function(r){ var tx=[]; var S=r.S, G=r.geo; var lab=new Int16Array(S*S); for(var q=0;q<S*S;q++) lab[q]=G.lab[q*G.ns*G.K];
  var outs=r.outs.map(function(o){ var x={name:o.name,kind:o.kind,unit:o.unit,range:o.range,othr:o.othr,spec:o.spec}; if(o.data){ x.data=new Float32Array(o.data); tx.push(x.data.buffer); } if(o.overlay){ x.overlay=new Float32Array(o.overlay); tx.push(x.overlay.buffer); } return x; });
  var km=null; for(var i=0;i<r.outs.length;i++) if(r.outs[i].kmag){ km=new Float32Array(r.outs[i].kmag); tx.push(km.buffer); break; }
  var i2=r.info; var info={T:i2.T,snr0:i2.snr0,sar:i2.sar,W:i2.W,p:i2.p,R:i2.R,Rz:i2.Rz,CS:i2.CS,tres:i2.tres,dx:i2.dx,dy:i2.dy,dz:i2.dz,conc:i2.conc,tro:i2.tro,etlEPI:i2.etlEPI,radial:i2.radial};
  tx.push(lab.buffer);
  return {S:S, outs:outs, kmag:km, info:info, geo:{S:S,peV:G.peV,fov:G.fov,fovpe:G.fovpe}, labC:lab, tps:r.tps.map(function(t){ return {key:t.key,n:t.n,T1:t.T1,T2:t.T2,T2s:t.T2s,PD:t.PD,ADC:t.ADC,ff:t.ff,dR1:t.dR1}; }), tx:tx};
};
MS.NAME_SRC=[
 ['Siemens Healthineers「MRI Acronyms – Cross-Vendor Comparisons」（DKFZ 掲載版 PDF）','https://www.dkfz-heidelberg.de/en/radiologie/images/MR-Akronymliste.pdf'],
 ['Siemens Healthineers Academy「MRI Acronyms – Cross-Vendor Comparisons」','https://academy.siemens-healthineers.com/en-us/mri-acronyms-crossvendor-comparisons'],
 ['Canon Medical Systems USA, Vantage Elan 1.5T Clinical Gallery（Vascular：Time-SLIP, FS-FBI）','https://us.medical.canon/products/magnetic-resonance/vantage-elan-15t/clinical-gallery/vascular'],
 ['Canon Medical Systems USA, Vantage Elan 1.5T Clinical Gallery（Body：SPAIR, PASTA, T2+）','https://us.medical.canon/products/magnetic-resonance/vantage-elan-15t/clinical-gallery/body-imaging'],
 ['Canon Medical Systems, Vantage Orian Advanced Productivity（Compressed SPEEDER, AiCE, Fast 3D mode）','https://global.medical.canon/products/magnetic-resonance/vantage_orian_high_productivity'],
 ['DOTmed News（2020-12-21）Compressed SPEEDER 3D・Fat Fraction Quantification','https://www.dotmed.com/legal/print/story.html?nid=53505']
];
MS.ABOUT=[
'<h2>使い方</h2>',
'<ol><li>左上で<b>部位</b>（頭部・胸部・上腹部・女性骨盤・男性骨盤・膝）と<b>病変</b>、<b>静磁場</b>を選びます。</li>',
'<li><b>シーケンス</b>を一覧から選びます（検索欄に HASTE・FASE・SPACE・DWI などの装置名でも入力できます）。メーカー別の名称は、シーケンスの見出しと「名称対応表」に出ます。</li>',
'<li>パラメータは<b>スライダーまたは数値</b>で変更します。最短値より短い TE・TR・エコー間隔は自動で補正され、黄色の枠と右側の注意に理由が出ます。</li>',
'<li>右側に<b>撮像時間・SNR（既定条件比）・ボクセル・SAR</b>と注意事項、シーケンスの説明と両社の名称が出ます。</li>',
'<li>画像上を<b>ドラッグ</b>でウインドウ幅（左右）・レベル（上下）、<b>ダブルクリック</b>で自動に戻ります。「比較用に固定」で条件を変える前の画像を横に残せます。「k空間」で取得データの範囲、「組織境界」で解剖の輪郭を重ねて表示します。</li></ol>',
'<h2>計算のしくみ</h2>',
'<p>仮想ファントムは解析的な図形で描いた 1024² のラベル地図で、各組織に T1・T2・T2*・水素密度・ADC・脂肪分率・磁化率・流速などを持たせています。シーケンスごとの信号式（SE・FSE・IR・スポイルドGRE・bSSFP の定常状態・FISP/PSIF・MPRAGE/MP2RAGE の数値計算・拡散・流入・位相コントラストなど）で各組織の複素信号を求め、FOV に合わせて標本化（位相方向の折り返しを含む）したのち 2 次元 FFT で k 空間に移し、取得マトリクス・部分フーリエ・エコートレインの T2 減衰・呼吸や拍動による位相誤差を与えて画像に戻します。化学シフト・磁化率による読出し方向（EPI では位相方向）のずれ、GRE のボクセル内位相分散、周波数選択的な脂肪抑制の失敗、3T の B1 不均一、表面コイルの感度むら、並列画像の g 因子と雑音を加えています。</p>',
'<h2>注意（必ずお読みください）</h2>',
'<ul><li>教育用の近似モデルです。画質・撮像時間・SAR は<b>傾向をつかむための目安</b>で、装置の表示値・安全管理の代わりにはなりません。SAR は相対値で、実際の上限判定は装置の表示に従ってください。</li>',
'<li>組織の値は文献の報告値を丸めた代表値か、それをもとにした教育用の推定値（「組織パラメータ」の出典欄 est）です。定量の基準値ではありません。</li>',
'<li>シーケンス・オプションの<b>メーカー名称は確認度つき</b>で表示しています。「要確認」は名称の裏付けが取れていないもので、ソフトウェアのバージョンや地域で名称が異なることがあります。院内の装置のプロトコル名で確認してください。</li>',
'<li>1 断面の 2 次元計算のため、3D 撮像の MIP・任意断面再構成、スライス方向のプロファイルやクロストーク、渦電流、勾配の非線形性、MR スペクトルのフィッティングなどは扱いません。深層学習再構成・圧縮センシングは雑音とぼけの変化のみを近似しています。</li></ul>'
].join('');
})();
