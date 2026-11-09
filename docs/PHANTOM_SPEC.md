# 仮想ファントム作成仕様（MRIパラメータシミュレーター Pro）

仮想ファントム（断面の模式図）を追加・修正するときの決まりごとです。目標は、放射線科医が見て「模式図だが解剖として不自然ではない」水準です。画像は信号エンジンが自動で作るので、ファントムでは **図形（解剖）と組織の割り当て** だけを書きます。

## 置き場所
- 1ファントム＝1ファイル：`src/ph/ph_<name>.js`。`build.py` が名前順に連結します。部位ボタンの並びは `src/phantom.js` の `MS.PH_GROUPS` に追加します。
- 新しい組織が必要なら、ファイルの中で `MS.addTissues({...})` で登録します（既存キーは上書きされません）。キー名は具体的に（例 `disc_n`, `labrum`, `pituitary_a`）。既存の組織は `src/tissues.js` を参照。

## ファイルの型（既存の `src/ph/ph_knee.js` などを見本に）
```js
(function(){
var MS=window.MS, P=MS.PH, rng=P.rng, E=P.E, Pg=P.Pg, S=P.S, PL=P.PL, B=P.B, F=P.F, M=P.M, mir=P.mir, ribs=P.ribs, spine=P.spine;
MS.addTissues({ disc_n:{n:'椎間板髄核', T1:[1200,1400], T2:[120,110], T2s:[60,40], PD:0.85, ADC:1.6, src:'est'} });
function shapes(opts){ return M([ ... ]); }          // 描画順に並べる（後のものが上書き）
function les(opts){ return [ {id:'hernia', n:'椎間板ヘルニア（L4/5）', shapes:[ ... ]}, ... ]; }
MS.PHANTOMS.lspine = {n:'腰椎（正中矢状断）', P:300, plane:'sag', coil:'spine', coilG:0.8, coilC:[90,0], fov:280, pe:'AP',
  shapes:shapes, les:les, motion:{resp:1, card:0}, region:'spine', def:{fov:280,pfov:100,nx:384,ny:288,thk:4,nsl:13}, ab:['disc_n','marrow_v'], musDir:'vert'};
})();
```

### 座標
- 単位は mm。原点はファントム中央。`P` はファントムの一辺（mm）。描画範囲は ±P/2。
- 画像の表示方向：x は右向き、y は下向き。
  - 軸位（`plane:'ax'`）：画像の左＝患者の右、上＝前（A）、下＝後（P）。
  - 矢状断（`plane:'sag'`）：左＝前（A）、右＝後（P）、上＝頭側（S）。
  - 冠状断（`plane:'cor'`）：左＝患者の右、上＝頭側（S）。
- 実寸に合わせる（例：成人の椎体の前後径 約30–35 mm、腎の長径 約110 mm、上腕骨頭の径 約45 mm）。

### 図形 API（`MS.PH`）
- `E(L,cx,cy,rx,ry,回転deg,揺らぎ振幅,揺らぎ周波数,位相)`：楕円。揺らぎで輪郭を有機的にできる。
- `B(L,cx,cy,[r0,r1,…],回転deg)`：中心からの半径を等角度（0°=+x、時計回り＝+y方向）に並べた滑らかな閉曲線。**臓器の輪郭はこれを使う**と自然になる（点は8〜24個）。
- `Pg(L,[[x,y],…])`：多角形（直線の辺）。
- `S(L,x1,y1,x2,y2,r)`：太さ 2r の線分（端は丸い）。`PL(L,[[x,y],…],r)`：折れ線。血管・靱帯・腱・筋膜の脂肪層に。
- `F(L,[x0,y0,x1,y1],fn)`：bbox 内の各点で `fn(x,y,cur)` を呼び、返した組織キーで塗る（null なら塗らない）。`cur` はその点の現在の組織キー。**条件付きで塗る**（例：肝の中だけ血管を描く、筋の中だけ浮腫）ときに使う。
- `M([...])`：入れ子の配列を平らにする。`mir(function(s){ return [...]; })`：左右対称の組を作る（s=-1,+1）。
- `rng(seed)`：再現性のある乱数。

### 組織
- 主な組織キー：`fat skin muscle bone marrow_r marrow_v marrow_y wm gm gm_deep gp csf choroid dura artery vein portal blood_c myo lung vessel_l esoph cord fgt liver spleen pancreas kidney_c kidney_m adrenal gi_wall gi_fluid bile urine myometrium jz endometrium ovary pz tz cartilage meniscus lig tendon fluid air`、病変 `infarct edema tumor_rim necrosis hem hemo_rim ms meningioma nodule mi hcc hcc_cap hem_rim hem_core cyst met_rim met_core adenoma fibroid endometrioma pca bph bme metal`。
- 組織の値：T1/T2/T2s は [1.5T, 3T] の ms、PD 相対水素密度、ADC ×10⁻³ mm²/s、ff 脂肪分率、chi 磁化率差（ppm、空気 9.4、金属 3000）、v 流速 cm/s と vt（'a' 動脈, 'v' 静脈, 'p' 門脈, 'c' 心腔）、mt 磁化移動、fa 異方性、cbf、ce（造影の ΔR1 s⁻¹：`eca:[動脈相,門脈相,平衡相]`, `eob:[動脈,門脈,移行,肝細胞相]`）、`lesion:1`（病変）。値が文献で裏付けられないものは `src:'est'`。
- 質感（任意）：`tx:{f:細粒, c:粗い, d:線維方向, ffv:脂肪分率のむら}`（標準偏差に掛かる係数、0.02〜0.2 程度）。省略すると `MS.TEX` の既定。線維方向は `musDir`（'tan' 体の輪郭に沿う／'vert' 縦／'horz' 横）。

### ファントムの属性
- `n` 表示名（「腰椎（正中矢状断）」のように部位と断面）、`P`、`plane`、`coil`（'head' 'body' 'knee' 'shoulder' 'spine' 'breast'）、`coilG`（受信感度の総合係数：頭部 1.0、体部 0.6 前後、膝 1.15）、`coilC`（コイル中心 mm、任意）、`fov` 既定 FOV、`pe` 既定の位相方向（ax: 'AP'/'RL'、sag: 'AP'/'SI'、cor: 'RL'/'SI'）、`region`（'brain' 'chest' 'abd' 'pelvis' 'msk' 'spine' 'breast'）、`def`（既定の fov/pfov/nx/ny/thk/nsl）、`ab`（コントラストのグラフで最初に比べる2組織）、`motion`（`resp` 呼吸振幅 mm、`card` 心拍振幅 mm、任意で `wfn(x,y,key)`＝0〜1 の動く割合）、`opts`（断面の切替えなどの選択肢、knee を参照）、`pulsatile`（拍動ゴーストを出す大血管がある体幹なら true）。
- 病変：`les(opts)` が `[{id, n, shapes}]` を返す。`dyn:function(stage,opts){...}` で動的に作ることもできる（head の血腫を参照）。病変は通常、`F` で「既存の組織の上にだけ」塗る。

## 品質の目安
- 臓器は楕円の寄せ集めにしない。`B`（滑らかな閉曲線）や多角形で実際の形に近づける。左右差・非対称を入れる。
- 筋と筋の間、臓器の周りには**薄い脂肪層**（`S`/`PL` で 0.6–1.5 mm）を入れる。皮下脂肪の厚さ、筋膜も自然に。
- 血管：断面に応じて動脈・静脈を正しい位置に。臓器内の血管（肝静脈・門脈枝、腎動静脈、肺血管、脳表の静脈など）を `F` で臓器内に限定して描く。
- 骨：皮質骨（`bone`）を外側 1–3 mm、内部を骨髄（部位に応じて `marrow_r` 赤色髄／`marrow_v` 椎体／`marrow_y` 黄色髄）。関節面には軟骨。
- 空気（副鼻腔・乳突蜂巣・腸管ガス・肺）は磁化率アーチファクトの源になるので、解剖上あるべき位置に置く。
- 図形の数は 1 ファントムあたり数百までにし、`MS.buildPhantom` が 1.5 秒以内に終わること（`node tests/lab1.js <id>` が時間を表示）。

## 確認のしかた（必ず目で見ること）
- ラベル図：`node tests/lab1.js <id> '<opts JSON>' all` → `python3 tests/topng.py tests/out/<id>_lab.ppm` → PNG を開いて見る。凡例（組織と面積%）が標準出力に出る。
- 画像：`node tests/img1.js <id> se_t1,fse_t2,flair,stir,vibe,dwi 1.5 '<opts JSON>' all` → `python3 tests/topng.py tests/out/<id>_img.pgm` → 開いて見る。T1・T2 で組織のコントラストが解剖として妥当か確かめる。
- 全シーケンスの計算が通ること：`node -e "const MS=require('./tests/load.js'); for(const s of MS.SEQS){ const st=MS.defaultState('<id>',s.id); st.fast=true; MS.PHANTOMS['<id>'].les(st.popt).forEach(l=>st.les[l.id]=true); MS.run(st); } console.log('ok')"`（リポジトリの最上位で実行）。
- 全ファントム×全シーケンス×1.5/3T の一括試験：`node tests/all.js`（数分）。勉強用の設定の整合：`node tests/learn_chk.js`。
