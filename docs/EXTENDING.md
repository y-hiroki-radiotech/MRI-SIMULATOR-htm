# 拡張のしかた（シーケンス・技術・ファントム・メーカー名・勉強用・翻訳）

ソースはすべて `src/` にあり、`python3 build.py OUT.html` で1つの HTML にまとまります。**ファイルを足すだけで追加できる**ように、次のフォルダはビルド時に名前順で自動的に読み込まれます。

| 追加するもの | 置き場所 | 使う関数 |
|---|---|---|
| シーケンス | `src/seq/<id>.js` | `MS.addSeq({...})`、必要なら `MS.addParam([...])`・`MS.addCat(id,名前)` |
| ファントム（断面） | `src/ph/ph_<name>.js` | `MS.PHANTOMS.<id>={...}`、組織は `MS.addTissues({...})`（詳しくは [PHANTOM_SPEC.md](PHANTOM_SPEC.md)） |
| 勉強用の項目 | どのファイルでも（ふつうはシーケンスと同じファイル） | `MS.addLearn({...})` |
| メーカー名称 | `src/vendors.js`（GE・Philips・Fujifilm・United Imaging）、`src/seqs.js`（Siemens・Canon） | 確認度 `o`＝メーカー公開資料、`c`＝比較表、`x`＝未確認（公開版では「—」） |
| 翻訳 | `i18n/extra_en.json`・`i18n/extra_zh.json` | 日本語の文字列 → 訳 |

読み込み順：`tissues.js` → `phantom.js` → `ph/*.js` → `engine.js` → `seqs.js` → `vendors.js` → `state.js` → `meta.js` → `learn.js` → `seq/*.js`。

---

## 1. シーケンスを足す

### (a) 既存の種類を使う（いちばん簡単）
画像の作り方（信号式）が既存のものと同じなら、`k` に既存の種類を書き、既定値と名前だけ変えます。例：[`src/seq/se_t2.js`](../src/seq/se_t2.js)

```js
(function(){
var MS=window.MS;
MS.addSeq({
  id:'se_t2', k:'se', cat:'basic',                  // k = 画像を作る種類（MS.K のキー）
  n:'SE T2強調像（従来型SE）', gen:'Conventional spin echo T2',
  sie:['SE','o'], can:['SE','o'], ge:['SE','c'], phi:['SE','c'], fuji:['SE','c'], uih:['SE','x'],
  d:'説明文（シーケンスの見出しの下に出る）',
  p:{tr:2500, te:90, bw:130, nx:256, ny:192}        // 既定値。ここに書いたパラメータが画面に出る
});
})();
```

主な種類（`MS.K`）：`se` `fse` `ssfse` `ir`（STIR・FLAIR）`fse3d` `gre`（in/opposed-phase も）`gre3d` `dixon` `bssfp` `fisp` `psif` `dess` `mprage` `mp2rage` `swi` `dwi` `dti` `bold` `dsc` `tof` `pc` `ncmra_fbi` `ncmra_ts` `ncmra_qiss` `cemra` `cine` `lge` `map_t1` `map_t2` `map_t2s` `map_vfa` `pdff` `asl` `ute` `mre` `mrs` など（`src/seqs.js` の `K.xxx=`）。

`x` には追加の属性を書きます：`gre:true`（GRE 系：最短TE・TRの補正）、`dim:'3D'`（3D：パーティション数などが出る）、`epi:true`、`timeAs:'se'`（撮像時間・最短値の計算をどの種類として扱うか）、`ecgReq:true`、`radial:true` など。

`o` はオプション（`'fs'` 脂肪抑制、`'restore'` フリップバック、`'mt'`、`'flowcomp'`、`'vat'`、`'semac'` など）。

### (b) 新しい種類（信号式）を書く
`run(ctx, p, sq, st)` を書きます。`MS.SEQAPI` の部品で「1画素ごとの信号」を返す `acq` を組み、`one()` で画像にします。k空間・雑音・アーチファクトはエンジンが自動で加えます。例：[`src/seq/se_dual.js`](../src/seq/se_dual.js)

```js
run:function(ctx,p,sq,st){ var A=MS.SEQAPI, E=Math.exp, TR=p.tr;
  function acq(TE){ return {fs:A.fsSig(st), tr:TR, sig:function(tp,df,b1){
    // tp：組織（T1・T2・T2s・PD・ff・fT1・fT2・ADC・v…）、df：その画素の磁場ずれ（Hz）、b1：送信磁場の比
    var M=1-2*E(-(TR-TE/2)/tp.T1)+E(-TR/tp.T1);
    return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*A.excF(b1)*A.refF(b1), f:0};   // w＝水、f＝脂肪の信号
  }}; }
  return [A.one(ctx,acq(p.te),'画像の名前')];      // 返す配列の1つめが主画像、2つめ以降はサムネイル
}
```
`acq` にはほかに `train:{type:'fse'|'ss'|'epi'|'fse3d', etl, esp, te}`（エコートレインのぼけ）、`gre:true`（T2* 減衰・磁化率）、`epi:{lines,esp}`（EPI の歪み）などを書けます。既存の `K.xxx` が見本です。

### (c) 新しいパラメータ
```js
MS.addParam(['te2se','TE（第2エコー）','ms',20,300,1,'con','説明']);  // [id, 名前, 単位, 最小, 最大, 刻み, 群, 説明]
```
群：`geo` 範囲・分解能／`con` コントラスト・タイミング／`spc` シーケンス固有／`acc` 加速・k空間。シーケンスの `p` に同じ id を書くと画面に出て、グラフの横軸にも選べます。

---

## 2. ファントム（断面・部位）を足す
`src/ph/ph_<name>.js` を1つ書きます。部位ボタンの並びは `src/phantom.js` の `MS.PH_GROUPS` に id を足します。書き方・座標・図形 API・品質の目安・確認方法は [PHANTOM_SPEC.md](PHANTOM_SPEC.md)。

## 3. 勉強用に載せる
```js
MS.addLearn({ seq:'se_t2', ph:'head', les:[], p:['tr','te'], x:'te', m:'sig', A:'csf', B:'wm',
  goal:'学習のねらい（1文）', pts:['ポイント1','ポイント2'], pre:[['T2らしく',{tr:3000,te:100},{}]] });
```
`p` は表示するパラメータ、`x` はグラフの横軸、`A`・`B` は比べる組織、`pre` はプリセットのボタン。

## 4. 翻訳（英語・中国語）
日本語の文字列を足したら、英語版・中国語版をビルドします。
```
python3 build.py en.html --public --lang=en
python3 build.py zh.html --public --lang=zh
```
訳のない文字列があると `i18n/missing_en.json`（`missing_zh.json`）に一覧が出ます。その文字列をキーにして `i18n/extra_en.json`・`i18n/extra_zh.json` に訳を書き、もう一度ビルドします（「未訳の文字列」が出なくなれば完了）。文字列はソース中の文字列リテラル単位で置き換わるので、文の途中で数値をつなぐ場合は、つなぎ目の文字列ごとに訳します。

## 5. 確かめる
```
node tests/all.js          # 全ファントム×全シーケンス×1.5/3T（エラー・NaN がないこと）
node tests/learn_chk.js    # 勉強用の設定の整合
node tests/img1.js head se_t2,se_dual 1.5 '{}' none && python3 tests/topng.py tests/out/head_img.pgm   # 画像を目で見る
```
画面の配色は `src/themes.css`（`html[data-theme=…]` ごとに CSS 変数を上書き）で足せます。
