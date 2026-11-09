/* ===== 組織パラメータ（教育用の代表値） =====
 T1/T2/T2s: ms [1.5T, 3T]。PD: 水素密度（相対）。ADC: ×10^-3 mm²/s。ff: 脂肪分率。
 chi: 周囲組織に対する磁化率差（ppm, 相対）。v: 面直交方向の流速 cm/s。vt: 'a' 動脈 'v' 静脈 'p' 門脈 'c' 心腔。
 mt: 磁化移動の効きやすさ(0-0.5)。fa: 拡散異方性。cbf: ml/100g/min。
 ce: 造影剤による ΔR1 (s^-1, 1.5T) — eca:[動脈相, 門脈相, 平衡相/遅延相], eob:[動脈相, 門脈相, 移行相, 肝細胞相]
 src: S05=Stanisz 2005, W99=Wansapura 1999, dB04=de Bazelaire 2004, G04=Gold 2004, est=文献値をもとにした教育用の推定値
*/
var MS = window.MS || {};
MS.FAT_PPM = -3.4;
MS.TISSUES = {
  air:      {n:'空気', T1:[1,1], T2:[1,1], T2s:[1,1], PD:0, ADC:0, chi:9.4, src:'—'},
  fat:      {n:'脂肪', T1:[343,382], T2:[58,68], T2s:[35,30], PD:0.95, ADC:0.02, ff:1, mt:0.05, src:'dB04'},
  skin:     {n:'皮膚', T1:[700,900], T2:[35,32], T2s:[20,12], PD:0.6, ADC:1.0, mt:0.35, src:'est'},
  muscle:   {n:'骨格筋', T1:[1008,1412], T2:[44,50], T2s:[28,20], PD:0.7, ADC:1.5, mt:0.35, fa:0.3, src:'S05'},
  bone:     {n:'皮質骨', T1:[1000,1100], T2:[1,1], T2s:[0.5,0.4], PD:0.08, ADC:0, chi:-2, src:'est'},
  marrow_r: {n:'骨髄（赤色・混合）', T1:[549,586], T2:[49,49], T2s:[15,9], PD:0.85, ADC:0.5, ff:0.5, chi:-0.5, mt:0.1, src:'dB04'},
  marrow_v: {n:'椎体骨髄', T1:[549,586], T2:[49,49], T2s:[15,9], PD:0.85, ADC:0.45, ff:0.45, chi:-0.5, mt:0.1, src:'dB04'},
  marrow_y: {n:'骨髄（黄色）', T1:[360,400], T2:[55,60], T2s:[12,7], PD:0.9, ADC:0.15, ff:0.85, chi:-0.5, src:'est'},
  wm:       {n:'白質', T1:[660,850], T2:[72,69], T2s:[55,45], PD:0.69, ADC:0.72, mt:0.4, fa:0.55, cbf:22, src:'W99（3T）/est'},
  gm:       {n:'灰白質（皮質）', T1:[1100,1350], T2:[95,99], T2s:[65,50], PD:0.80, ADC:0.85, mt:0.25, fa:0.12, cbf:60, src:'W99（3T）/est'},
  gm_deep:  {n:'基底核・視床', T1:[950,1200], T2:[85,78], T2s:[50,35], PD:0.78, ADC:0.75, mt:0.28, fa:0.2, cbf:55, chi:0.02, src:'est'},
  gp:       {n:'淡蒼球', T1:[800,1000], T2:[70,58], T2s:[35,22], PD:0.74, ADC:0.75, mt:0.3, fa:0.25, cbf:40, chi:0.1, src:'est'},
  csf:      {n:'脳脊髄液', T1:[4000,4300], T2:[2000,1800], T2s:[1500,1200], PD:1.0, ADC:3.0, src:'est'},
  choroid:  {n:'脈絡叢', T1:[1100,1400], T2:[100,90], T2s:[50,35], PD:0.8, ADC:1.0, ce:{eca:[4,4,3]}, src:'est'},
  dura:     {n:'硬膜・大脳鎌', T1:[800,1000], T2:[30,28], T2s:[15,10], PD:0.4, ADC:0.5, mt:0.4, ce:{eca:[1,2,2]}, src:'est'},
  artery:   {n:'動脈血', T1:[1441,1932], T2:[290,275], T2s:[200,100], PD:0.85, ADC:1.6, v:60, vt:'a', ce:{eca:[18,7,3.5], eob:[10,3.5,2,1]}, src:'S05'},
  vein:     {n:'静脈血', T1:[1441,1932], T2:[180,90], T2s:[50,25], PD:0.85, ADC:1.6, v:15, vt:'v', chi:0.35, ce:{eca:[1,7,3.5], eob:[0.5,3.5,2,1]}, src:'S05/est'},
  portal:   {n:'門脈血', T1:[1441,1932], T2:[250,200], T2s:[120,70], PD:0.85, ADC:1.6, v:15, vt:'p', chi:0.1, ce:{eca:[1.5,9,3.5], eob:[0.8,4.5,2,1]}, src:'S05/est'},
  blood_c:  {n:'心腔内血液', T1:[1441,1932], T2:[290,275], T2s:[200,100], PD:0.85, ADC:1.6, v:30, vt:'c', ce:{eca:[16,7,2.6], eob:[9,3.5,2,1]}, src:'S05'},
  myo:      {n:'心筋', T1:[1000,1250], T2:[50,45], T2s:[35,25], PD:0.72, ADC:1.4, mt:0.3, ce:{eca:[3,2,1.2]}, src:'est'},
  lung:     {n:'肺', T1:[1200,1350], T2:[40,35], T2s:[2,1], PD:0.15, ADC:1.0, chi:2.5, src:'est'},
  vessel_l: {n:'肺血管', T1:[1441,1932], T2:[200,150], T2s:[20,10], PD:0.85, ADC:1.6, v:20, vt:'a', ce:{eca:[12,7,3.5]}, src:'est'},
  esoph:    {n:'食道', T1:[1000,1400], T2:[45,45], T2s:[25,18], PD:0.7, ADC:1.4, mt:0.3, ce:{eca:[2,3,2.5]}, src:'est'},
  cord:     {n:'脊髄', T1:[745,993], T2:[74,78], T2s:[45,35], PD:0.7, ADC:0.9, mt:0.35, fa:0.6, src:'dB04'},
  fgt:      {n:'乳腺実質', T1:[1100,1450], T2:[60,55], T2s:[30,20], PD:0.75, ADC:1.6, ce:{eca:[0.5,1,1.5]}, src:'est'},
  liver:    {n:'肝', T1:[576,812], T2:[46,42], T2s:[30,18], PD:0.73, ADC:1.15, mt:0.25, ce:{eca:[0.8,3,2.5], eob:[0.6,1.8,2.2,2.0]}, src:'S05'},
  spleen:   {n:'脾', T1:[1057,1328], T2:[79,61], T2s:[40,28], PD:0.8, ADC:0.85, mt:0.2, ce:{eca:[5,4,3], eob:[3,2,1.5,0.6]}, src:'dB04'},
  pancreas: {n:'膵', T1:[584,725], T2:[46,43], T2s:[30,20], PD:0.72, ADC:1.3, mt:0.25, ce:{eca:[5,3,2], eob:[3,1.6,1.2,0.6]}, src:'dB04'},
  kidney_c: {n:'腎皮質', T1:[966,1142], T2:[87,76], T2s:[50,35], PD:0.82, ADC:2.0, fa:0.3, ce:{eca:[10,7,5], eob:[6,4,3,2]}, src:'dB04'},
  kidney_m: {n:'腎髄質', T1:[1412,1545], T2:[85,81], T2s:[50,35], PD:0.85, ADC:2.0, fa:0.35, ce:{eca:[2,7,6], eob:[1,4,3.5,2.5]}, src:'dB04'},
  adrenal:  {n:'副腎', T1:[800,1000], T2:[60,55], T2s:[30,22], PD:0.75, ADC:1.1, ce:{eca:[4,3,2]}, src:'est'},
  gi_wall:  {n:'消化管壁', T1:[1000,1300], T2:[60,55], T2s:[30,22], PD:0.72, ADC:1.3, mt:0.3, ce:{eca:[3,4,3], eob:[2,2,1.5,0.6]}, src:'est'},
  gi_fluid: {n:'消化管内容（液）', T1:[2800,3000], T2:[800,700], T2s:[200,120], PD:0.95, ADC:2.5, src:'est'},
  bile:     {n:'胆汁（胆嚢）', T1:[2000,2200], T2:[600,500], T2s:[300,200], PD:0.95, ADC:2.8, ce:{eob:[0,0,0.2,0.3]}, src:'est'},
  urine:    {n:'尿', T1:[3000,3300], T2:[1500,1300], T2s:[800,500], PD:1.0, ADC:2.9, src:'est'},
  myometrium:{n:'子宮筋層（外層）', T1:[1309,1514], T2:[117,79], T2s:[60,40], PD:0.8, ADC:1.5, ce:{eca:[4,5,4]}, src:'dB04'},
  jz:       {n:'接合帯', T1:[1100,1300], T2:[55,48], T2s:[30,22], PD:0.75, ADC:1.2, ce:{eca:[3,5,4]}, src:'est'},
  endometrium:{n:'子宮内膜', T1:[1274,1453], T2:[150,130], T2s:[70,50], PD:0.88, ADC:1.4, ce:{eca:[1,3,4]}, src:'est'},
  ovary:    {n:'卵巣間質', T1:[1100,1350], T2:[80,70], T2s:[40,30], PD:0.8, ADC:1.3, ce:{eca:[2,3,3]}, src:'est'},
  pz:       {n:'前立腺 辺縁域', T1:[1317,1597], T2:[130,115], T2s:[60,45], PD:0.85, ADC:1.7, ce:{eca:[1.5,2.5,2.5]}, src:'dB04/est'},
  tz:       {n:'前立腺 移行域', T1:[1250,1500], T2:[80,72], T2s:[45,32], PD:0.8, ADC:1.25, ce:{eca:[2.5,3,2.5]}, src:'est'},
  cartilage:{n:'関節軟骨', T1:[1024,1168], T2:[30,27], T2s:[20,14], PD:0.75, ADC:1.4, mt:0.3, src:'G04'},
  meniscus: {n:'半月板', T1:[700,800], T2:[8,7], T2s:[5,4], PD:0.5, ADC:0.8, mt:0.3, src:'est'},
  lig:      {n:'靱帯', T1:[600,700], T2:[10,9], T2s:[5,4], PD:0.5, ADC:0.9, mt:0.3, fa:0.7, src:'est'},
  tendon:   {n:'腱', T1:[600,700], T2:[5,4], T2s:[2,1.5], PD:0.45, ADC:0.7, mt:0.3, fa:0.8, src:'est'},
  fluid:    {n:'液体（関節液・胸水など）', T1:[3500,3800], T2:[1500,1300], T2s:[700,500], PD:1.0, ADC:3.0, src:'est'},
  /* ---- 病変 ---- */
  infarct:  {n:'急性期梗塞', T1:[1050,1500], T2:[110,100], T2s:[70,55], PD:0.84, ADC:0.40, mt:0.2, cbf:8, lesion:1, src:'est'},
  edema:    {n:'浮腫', T1:[1300,1700], T2:[130,120], T2s:[80,60], PD:0.86, ADC:1.6, mt:0.15, cbf:15, lesion:1, src:'est'},
  tumor_rim:{n:'腫瘍（造影される部分）', T1:[1150,1500], T2:[95,85], T2s:[45,30], PD:0.82, ADC:0.85, cbf:120, ce:{eca:[3,4,4.5]}, lesion:1, src:'est'},
  necrosis: {n:'壊死', T1:[2000,2400], T2:[300,280], T2s:[150,100], PD:0.92, ADC:2.4, lesion:1, src:'est'},
  hem:      {n:'血腫', T1:[1000,1300], T2:[40,30], T2s:[15,8], PD:0.85, ADC:0.6, chi:0.8, lesion:1, src:'est（病期で変化）'},
  hemo_rim: {n:'ヘモジデリン沈着', T1:[700,900], T2:[15,12], T2s:[4,2], PD:0.6, ADC:0.6, chi:2.0, lesion:1, src:'est'},
  ms:       {n:'脱髄斑', T1:[1150,1450], T2:[120,110], T2s:[70,55], PD:0.82, ADC:1.1, mt:0.15, ce:{eca:[0.5,1.5,2]}, lesion:1, src:'est'},
  meningioma:{n:'髄膜腫', T1:[1000,1300], T2:[80,75], T2s:[40,30], PD:0.8, ADC:0.8, cbf:100, ce:{eca:[6,6,5]}, lesion:1, src:'est'},
  nodule:   {n:'肺結節', T1:[1100,1400], T2:[70,65], T2s:[25,15], PD:0.75, ADC:1.0, ce:{eca:[2,3,3]}, lesion:1, src:'est'},
  mi:       {n:'心筋梗塞（瘢痕）', T1:[1150,1400], T2:[60,52], T2s:[35,25], PD:0.75, ADC:1.6, ce:{eca:[1.5,2.5,3.0]}, lesion:1, src:'est'},
  hcc:      {n:'肝細胞癌', T1:[900,1150], T2:[70,62], T2s:[35,25], PD:0.8, ADC:0.95, ce:{eca:[7,1.6,1.0], eob:[5,1.0,0.6,0.15]}, lesion:1, src:'est'},
  hcc_cap:  {n:'被膜', T1:[1000,1250], T2:[50,45], T2s:[25,18], PD:0.7, ADC:1.0, ce:{eca:[0.5,2.5,3.5], eob:[0.3,1.2,1.2,0.2]}, lesion:1, src:'est'},
  hem_rim:  {n:'血管腫（辺縁結節状濃染部）', T1:[1200,1550], T2:[140,120], T2s:[60,40], PD:0.9, ADC:1.7, ce:{eca:[10,8,5], eob:[6,4,2,0.5]}, lesion:1, src:'est'},
  hem_core: {n:'血管腫（内部）', T1:[1250,1600], T2:[150,130], T2s:[70,50], PD:0.92, ADC:1.8, ce:{eca:[0.5,3,5], eob:[0.3,1.5,1.8,0.4]}, lesion:1, src:'est'},
  cyst:     {n:'嚢胞', T1:[3000,3300], T2:[1000,900], T2s:[500,350], PD:1.0, ADC:2.8, lesion:1, src:'est'},
  met_rim:  {n:'転移（辺縁）', T1:[1000,1300], T2:[80,72], T2s:[35,25], PD:0.8, ADC:0.9, ce:{eca:[3,3,2.5], eob:[2,1.5,1,0.2]}, lesion:1, src:'est'},
  met_core: {n:'転移（中心）', T1:[1400,1800], T2:[150,130], T2s:[60,45], PD:0.88, ADC:1.4, ce:{eca:[0.3,0.8,1.5], eob:[0.2,0.5,0.6,0.1]}, lesion:1, src:'est'},
  adenoma:  {n:'副腎腺腫（脂質含有）', T1:[700,900], T2:[60,55], T2s:[30,22], PD:0.78, ADC:1.1, ff:0.25, ce:{eca:[4,3,1.5]}, lesion:1, src:'est'},
  fibroid:  {n:'子宮筋腫', T1:[1100,1300], T2:[40,36], T2s:[25,18], PD:0.7, ADC:0.9, mt:0.35, ce:{eca:[2,4,4]}, lesion:1, src:'est'},
  endometrioma:{n:'内膜症性嚢胞', T1:[400,450], T2:[60,50], T2s:[15,8], PD:0.9, ADC:1.2, chi:0.5, lesion:1, src:'est'},
  pca:      {n:'前立腺癌', T1:[1250,1500], T2:[70,62], T2s:[35,25], PD:0.8, ADC:0.75, ce:{eca:[5,3,2]}, lesion:1, src:'est'},
  bph:      {n:'BPH結節', T1:[1250,1500], T2:[95,85], T2s:[45,32], PD:0.82, ADC:1.2, ce:{eca:[3,3,2.5]}, lesion:1, src:'est'},
  bme:      {n:'骨髄浮腫', T1:[900,1050], T2:[90,80], T2s:[25,15], PD:0.85, ADC:1.0, ff:0.35, lesion:1, src:'est'},
  metal:    {n:'金属', T1:[1,1], T2:[1,1], T2s:[1,1], PD:0, ADC:0, chi:3000, lesion:1, src:'—'}
};
/* 血腫の病期（T1/T2/磁化率を上書き） */
MS.HEM_STAGES = [
  {id:'hyper', n:'超急性期（オキシHb）', T1:[1200,1600], T2:[220,180], T2s:[120,80], chi:0.05},
  {id:'acute', n:'急性期（デオキシHb）', T1:[1050,1400], T2:[45,35], T2s:[12,6], chi:0.8},
  {id:'esub',  n:'亜急性期早期（細胞内メトHb）', T1:[320,420], T2:[45,35], T2s:[12,6], chi:0.8},
  {id:'lsub',  n:'亜急性期後期（細胞外メトHb）', T1:[320,420], T2:[220,180], T2s:[90,60], chi:0.1},
  {id:'chronic',n:'慢性期（ヘモジデリン縁）', T1:[1800,2200], T2:[400,350], T2s:[150,100], chi:0.05}
];
/* ガドリニウム製剤の緩和能 r1（血漿, s^-1 mM^-1）— Rohrer 2005 の報告値を丸めた代表値 */
MS.GBCA = {
  none:{n:'造影なし'},
  eca:{n:'細胞外液性（ガドブトロール等 0.1 mmol/kg）', r1:[5.2,5.0], phases:['単純','動脈相','門脈相','平衡相（遅延相）']},
  eob:{n:'Gd-EOB-DTPA（0.025 mmol/kg）', r1:[6.9,6.2], phases:['単純','動脈相','門脈相','移行相','肝細胞相']}
};
MS.REFS = [
  {k:'S05', t:'Stanisz GJ, et al. T1, T2 relaxation and magnetization transfer in tissue at 3T. Magn Reson Med. 2005;54:507-512.', pmid:'16086319'},
  {k:'dB04', t:'de Bazelaire CM, et al. MR imaging relaxation times of abdominal and pelvic tissues measured in vivo at 3.0 T: preliminary results. Radiology. 2004;230:652-659.', pmid:'14990831'},
  {k:'G04', t:'Gold GE, et al. Musculoskeletal MRI at 3.0 T: relaxation times and image contrast. AJR Am J Roentgenol. 2004;183:343-351.', pmid:'15269023'},
  {k:'W99', t:'Wansapura JP, et al. NMR relaxation times in the human brain at 3.0 tesla. J Magn Reson Imaging. 1999;9:531-538.', pmid:'10232510'},
  {k:'R05', t:'Rohrer M, et al. Comparison of magnetic properties of MRI contrast media solutions at different magnetic field strengths. Invest Radiol. 2005;40:715-724.', pmid:'16230904'}
];
window.MS = MS;
