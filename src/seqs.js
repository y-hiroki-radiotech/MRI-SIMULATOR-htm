/* ===== シーケンス一覧と信号モデル =====
 conf（名称の確認度）: o = メーカー公開資料で確認 / c = ベンダー比較表で確認（表の読み取りに曖昧さあり・装置で要確認） / x = 未確認（装置・取扱説明書で要確認）
*/
(function(){
var MS=window.MS, PI=Math.PI, E=Math.exp, sin=Math.sin, cos=Math.cos, D=PI/180;
function S(id,k,cat,n,gen,sie,can,d,p,o,x){ var e={id:id,k:k,cat:cat,n:n,gen:gen,sie:sie[0],sieC:sie[1],can:can[0],canC:can[1],d:d,p:p,o:o||[]}; for(var a in x||{}) e[a]=x[a]; return e; }
var G2={gre:true}, G3={gre:true,dim:'3D'}, D3={dim:'3D'};
MS.CATS=[['basic','基本（SE・FSE・IR）'],['gre','グラディエントエコー・SSFP'],['epi','拡散・EPI'],['mra','MRA・血流'],['body','体部・高速撮像'],['cardiac','心臓'],['quant','定量・マッピング'],['adv','応用・特殊']];
MS.SEQS=[
/* ---- 基本 ---- */
S('se_t1','se','basic','SE T1強調像','Spin Echo',['SE','o'],['SE','o'],'90°励起と180°再収束で作るスピンエコー。短TR・短TEでT1強調。撮像時間は TR×位相エンコード数×加算回数。',{tr:500,te:12,bw:150,fa:90,nex:1},['fs','satband','flowcomp']),
S('se_pd','se','basic','SE プロトン密度強調像','Spin Echo',['SE','o'],['SE','o'],'長TR・短TEでT1とT2の影響を減らし、水素密度の差を見る。',{tr:2500,te:15,bw:150,fa:90,nex:1},['fs','satband']),
S('fse_t2','fse','basic','FSE T2強調像','Turbo/Fast Spin Echo',['TSE','o'],['FSE（FastSE）','o'],'1回の励起で複数のエコー（ETL）を集めて高速化。実効TE（k空間中心のエコー）でコントラストが決まる。ETLが長いほど速いが、T2減衰によるぼけ・脂肪の高信号・MT効果が増える。',{tr:4000,te:90,etl:16,esp:9,refoc:150,bw:200,nex:1},['fs','restore','mt','satband','flowcomp']),
S('fse_pd','fse','basic','FSE プロトン密度強調像','TSE PD',['TSE','o'],['FSE','o'],'骨軟部で頻用。脂肪抑制併用で軟骨・半月板・骨髄浮腫を評価。',{tr:3000,te:30,etl:8,esp:9,refoc:150,bw:220,nex:1},['fs','restore','mt','satband']),
S('fse_t1','fse','basic','FSE T1強調像','TSE T1',['TSE','o'],['FSE','o'],'短TR・短ETLのFSE。SE T1より速いが、ETLを伸ばすとT1コントラストが弱まる。',{tr:600,te:10,etl:3,esp:10,refoc:150,bw:200,nex:1},['fs','satband']),
S('ssfse','ssfse','basic','シングルショットFSE（ハーフフーリエ）','Single-shot TSE / HASTE',['HASTE','o'],['FASE','o'],'1回の励起でk空間を全て埋める。動きに強く息止め・自由呼吸で使える。エコートレインが長く、T2減衰によるぼけが強い。',{tr:1200,te:90,esp:4.5,refoc:150,bw:500,nex:1,pf:0.55},['fs','satband']),
S('stir','ir','basic','STIR','Short TI Inversion Recovery',['STIR（TIRM）','o'],['FastSTIR','c'],'反転パルス後、脂肪の縦磁化がゼロになる時刻（TI）で読み出し脂肪を抑制。磁場不均一に強いが、T1の短い組織（造影後の病変等）も抑制される。',{tr:4500,te:50,ti:160,etl:14,esp:9,refoc:150,bw:220,nex:1},['satband','mt']),
S('flair','ir','basic','FLAIR','Fluid-Attenuated IR',['TIRM / Dark Fluid','o'],['FastFLAIR','c'],'長いTIで髄液を抑制したT2強調像。TR が短いと髄液の抑制が不十分。',{tr:9000,te:100,ti:2500,etl:18,esp:10,refoc:150,bw:200,nex:1},['fs','satband']),
S('t1flair','ir','basic','T1-FLAIR','T1 FLAIR',['TIRM（T1 Dark Fluid）','c'],['FastFLAIR（T1）','x'],'中程度のTIで灰白質・白質のT1コントラストを強めたIR-FSE。',{tr:2200,te:10,ti:800,etl:6,esp:10,refoc:150,bw:200,nex:1},['satband']),
S('psir_ir','ir','basic','Real IR／位相補正IR','Phase-sensitive / Real IR',['TIR（real）','c'],['Real IR','x'],'反転からの回復を符号付きで表示。T1の差を広いダイナミックレンジで見られる。',{tr:5000,te:12,ti:400,etl:7,esp:10,refoc:150,bw:200,nex:1},[],{real:true}),
S('dir3d','fse3d','basic','3D DIR（二重反転）','Double IR',['SPACE DIR','c'],['Dual IR（3D FSE）','x'],'2回の反転で髄液と白質を抑制し、皮質・病変を強調。皮質病変の検出に用いる。',{tr:7500,te:280,ti:3000,ti2:450,etl:200,esp:4.2,refoc:120,bw:600,npart:160,thk:1.1,nex:1},['fs'],{dim:'3D',dir:true}),
S('fse3d_t2','fse3d','basic','3D FSE T2（可変フリップ角）','3D TSE / VFA',['SPACE','o'],['FASE3D（3D FSE）','c'],'可変リフォーカス角で非常に長いエコートレインを使う等方性3D撮像。任意断面再構成ができる。表示TEは「T2等価TE」。',{tr:2500,te:120,etl:120,esp:4,refoc:120,bw:600,npart:160,thk:1,nex:1},['fs','restore'],{dim:'3D'}),
S('flair3d','fse3d','basic','3D FLAIR','3D FLAIR (VFA)',['SPACE FLAIR','o'],['3D FLAIR（FASE3D）','x'],'等方性の3D FLAIR。多発性硬化症などで標準的。',{tr:5000,te:390,ti:1800,etl:220,esp:3.6,refoc:120,bw:650,npart:176,thk:1,nex:1},['fs'],{dim:'3D',ir:true}),
S('fse3d_t1','fse3d','basic','3D FSE T1（ブラックブラッド）','3D TSE T1',['SPACE T1','o'],['3D FSE T1','x'],'流れる血液が無信号になる（ブラックブラッド）。血管壁・転移の検出に。',{tr:600,te:12,etl:30,esp:4,refoc:120,bw:500,npart:160,thk:1,nex:1},['fs'],{dim:'3D'}),
/* ---- GRE・SSFP ---- */
S('gre_t1','gre','gre','2D スポイルドGRE T1','Spoiled GRE',['FLASH','o'],['FE（RFスポイル）','c'],'RFスポイリングで横磁化を消し、T1強調を得る。フリップ角とTRで決まり、エルンスト角で信号最大。',{tr:150,te:4.6,fa:70,bw:250,nex:1},['fs','satband','flowcomp'],G2),
S('gre_t2s','gre','gre','2D T2*強調GRE','T2* GRE',['FLASH（T2*）／MEDIC','o'],['FE（T2*）','c'],'長いTE・小さいフリップ角でT2*を強調。出血・石灰化・鉄沈着を低信号で示す。',{tr:600,te:20,fa:20,bw:120,nex:1},['flowcomp','satband'],G2),
S('inopp','dixon','gre','In/Opposed-phase（2エコーGRE）','Dual-echo chemical shift',['FLASH in/opp','o'],['FE（in/out of phase）','x'],'水と脂肪が逆位相・同位相になるTEで撮像。少量の脂肪（脂肪肝・副腎腺腫）を逆位相の信号低下で検出。',{tr:150,te:2.3,te2:4.6,fa:70,bw:500,nex:1},['satband'],{gre:true,dixType:'gre2',outs:['op','ip']}),
S('vibe','gre3d','gre','3D スポイルドGRE（脂肪抑制T1）','3D spoiled GRE',['VIBE','o'],['Quick 3D','c'],'腹部ダイナミック・造影の標準。息止めで薄いスライスの3D T1。',{tr:4,te:1.8,fa:12,bw:450,npart:56,thk:3.5,nex:1,pf:0.75,pos:0},['fs','satband'],{gre:true,dim:'3D',fsDef:'spair'}),
S('vibe_dixon','dixon','gre','3D GRE Dixon（水・脂肪分離）','3D Dixon GRE',['VIBE Dixon','o'],['Quick 3D Dixon（WFS）','x'],'2つ以上のエコーから水画像・脂肪画像・同位相・逆位相を一度に作る。磁場不均一に強い均一な脂肪抑制。',{tr:6,te:2.4,te2:4.8,fa:10,bw:800,npart:72,thk:3,nex:1},['satband'],{gre:true,dim:'3D',dixType:'gre2',outs:['w','f','ip','op']}),
S('starvibe','gre3d','gre','3D ラジアルGRE（自由呼吸）','Radial stack-of-stars GRE',['StarVIBE（FREEZEit）','o'],['（相当機能）','x'],'放射状にk空間を埋めるため呼吸の影響が分散し、自由呼吸で撮像できる。撮像時間はやや長い。',{tr:4,te:1.8,fa:12,bw:500,npart:72,thk:3,nex:1},['fs'],{gre:true,dim:'3D',radial:true,fsDef:'spair'}),
S('mprage','mprage','gre','3D MPRAGE','MP-RAGE',['MPRAGE','o'],['3D MPRAGE（FastFE 3D）','c'],'反転パルスで準備した高速3D GRE。灰白質と白質のコントラストが高く、脳容積計測の標準。',{trs:2300,ti:1000,fa:9,esp:7,bw:200,npart:176,thk:1,nex:1},[],{gre:true,dim:'3D'}),
S('mp2rage','mp2rage','gre','3D MP2RAGE','MP2RAGE',['MP2RAGE','o'],['（相当機能）','x'],'2つのTIで撮った画像を組み合わせ、受信感度・B1の影響を減らしたUNI画像とT1マップを作る。',{trs:5000,ti:700,ti2:2500,fa:4,fa2:5,esp:7,bw:240,npart:176,thk:1,nex:1},[],{gre:true,dim:'3D'}),
S('bssfp','bssfp','gre','バランスドSSFP','Balanced SSFP',['TrueFISP','o'],['True SSFP','o'],'全軸の傾斜磁場を釣り合わせた定常状態。信号は T2/T1 比で決まり、血液・液体が明るい。磁場の不均一で帯状のアーチファクト（バンディング）が出る。',{tr:4,te:2,fa:60,bw:900,nex:1},['fs'],G2),
S('ciss','bssfp','gre','位相サイクル併用 SSFP（CISS）','Phase-cycled bSSFP',['CISS','o'],['（True SSFP 位相サイクル）','x'],'位相をずらした2つのbSSFPを合成してバンディングを打ち消す。内耳・脳神経の高分解能撮像。',{tr:5.5,te:2.7,fa:50,bw:450,npart:64,thk:0.7,nex:1},[],{gre:true,dim:'3D',ciss:true}),
S('fisp','fisp','gre','SSFP-FID（コヒーレントGRE）','SSFP-FID',['FISP','o'],['SSFP','c'],'横磁化を残す定常状態GRE。T2/T1 比とT1の混合コントラスト。',{tr:12,te:4,fa:40,bw:250,nex:1},[],G2),
S('psif','psif','gre','SSFP-Echo（T2強調定常状態）','SSFP-Echo',['PSIF','o'],['（相当機能）','x'],'エコー成分を使う時間反転型SSFP。T2の影響が強い。拡散強調PSIFにも応用。',{tr:12,te:8,fa:40,bw:250,nex:1},[],G2),
S('dess','dess','gre','DESS（2エコー定常状態）','Double Echo Steady State',['DESS','o'],['（相当機能）','x'],'FISP と PSIF のエコーを1回で収集し合成。膝軟骨の3D評価に用いる。',{tr:14,te:4.5,fa:25,bw:300,npart:120,thk:0.7,nex:1},['fs'],{gre:true,dim:'3D',fsDef:'we'}),
S('swi','swi','gre','磁化率強調像（SWI）','Susceptibility-weighted imaging',['SWI','o'],['FSBB','c'],'3D GREの強度と位相を組み合わせ、静脈・微小出血・石灰化・鉄沈着を強調。位相の符号の向きは装置で異なるので要確認。',{tr:28,te:20,fa:15,bw:120,npart:72,thk:2,nex:1},['flowcomp'],{gre:true,dim:'3D',fcDef:true}),
/* ---- 拡散・EPI ---- */
S('dwi','dwi','epi','拡散強調像（シングルショットEPI）','DWI (ss-EPI)',['ep2d_diff','o'],['DWI（EPI）','o'],'EPIで撮る拡散強調像。b値が大きいほど水分子の動きの差を強調。ADCマップも作る。EPIは磁化率の差で歪みやすい。',{tr:5000,te:65,bw:1500,nex:2,bvals:'0,1000',ndir:3,pf:0.75,nx:160,ny:160,thk:5},['fs'],{epi:true,fsDef:'spair'}),
S('dwi_rs','dwi','epi','読出し分割型EPI拡散強調像','Readout-segmented EPI',['RESOLVE','o'],['（相当機能）','x'],'読出し方向に分割して収集し、エコー間隔を短くして歪み・ぼけを減らす。撮像時間は分割数に比例。',{tr:5000,te:60,bw:1000,nex:1,bvals:'0,1000',ndir:3,seg:5,nx:192,ny:192,thk:4},['fs'],{epi:true,fsDef:'spair'}),
S('dwi_zoom','dwi','epi','小FOV拡散強調像','Reduced-FOV DWI',['ZOOMit','o'],['Zoom DWI','c'],'2次元選択励起で関心領域だけを励起し、位相方向のFOVを狭めても折り返さない。前立腺・脊髄・膵などで高分解能・低歪み。',{tr:4000,te:65,bw:1400,nex:4,bvals:'0,1000',ndir:3,fov:200,pfov:40,nx:128,ny:56,thk:3},['fs'],{epi:true,zoom:true,fsDef:'spair'}),
S('dwibs','dwi','epi','背景抑制拡散強調像（DWIBS）','DWIBS (STIR-EPI)',['REVEAL（DWI + STIR）','c'],['Body DWI（STIR）','x'],'STIRで脂肪を抑え自由呼吸で広範囲を撮像。全身の病変検索に。',{tr:7000,te:65,ti:180,bw:1800,nex:4,bvals:'0,1000',ndir:3,nx:160,ny:128,thk:5},[],{epi:true,stir:true}),
S('dti','dti','epi','拡散テンソル（DTI）','DTI',['DTI','o'],['DTI','c'],'多方向の拡散強調像から異方性（FA）と平均拡散能を計算。神経線維の走行評価。',{tr:7000,te:75,bw:1600,nex:1,bvals:'0,1000',ndir:30,nx:128,ny:128,thk:2.5},['fs'],{epi:true,fsDef:'spair'}),
S('bold','bold','epi','BOLD fMRI','BOLD EPI',['BOLD（ep2d_bold）','o'],['BOLD','x'],'T2*強調EPIを連続撮像し、課題で増える酸素化Hb（デオキシHbの減少）による信号上昇を検出。',{tr:2000,te:30,fa:80,bw:2200,nex:1,nvol:150,nx:64,ny:64,thk:3.5,nsl:36},[],{epi:true,gre:true}),
S('dsc','dsc','epi','造影灌流（DSC）','DSC perfusion',['ep2d_perf','c'],['Perfusion（EPI）','x'],'造影剤の初回循環で起こるT2*短縮から相対脳血液量を求める。',{tr:1500,te:30,fa:70,bw:2000,nex:1,nvol:60,nx:128,ny:128,thk:5,nsl:20},[],{epi:true,gre:true}),
/* ---- MRA ---- */
S('tof','tof','mra','3D TOF MRA','Time-of-flight',['TOF（TONE）','o'],['TOF（ISCE）','c'],'流入する未飽和の血液が明るく、静止組織は繰り返しパルスで飽和して暗い。面内を流れる血管・遅い流れは飽和して見えにくい。',{tr:23,te:3.5,fa:20,bw:180,npart:40,thk:0.6,slabs:4,nex:1},['tone','mt','vsat'],{gre:true,dim:'3D',mtDef:true,toneDef:true,vsatDef:true}),
S('tof2d','tof','mra','2D TOF MRA','2D TOF',['2D TOF','o'],['2D TOF','c'],'1断面ずつ撮る TOF。遅い流れ（静脈）に強い。',{tr:20,te:4,fa:60,bw:200,thk:2.5,nex:1},['vsat','mt'],{gre:true}),
S('pc','pc','mra','位相コントラスト（流速計測）','Phase contrast',['Phase Contrast（flow quant）','o'],['Phase Shift（PS）','c'],'双極傾斜磁場で流速を位相に変換。VENC を超える流速は位相が折り返す（エイリアシング）。',{tr:20,te:4,fa:20,bw:300,venc:150,thk:6,nex:1},[],{gre:true}),
S('fbi','ncmra_fbi','mra','非造影MRA（心電図同期3D FSE）','ECG-gated 3D FSE NC-MRA',['NATIVE-SPACE','o'],['FBI／FS-FBI','o'],'拡張期と収縮期の3D FSEを撮り、差分で動脈だけを残す。収縮期の速い動脈血は信号が抜ける。下肢・腹部で使う。',{tr:1700,te:60,etl:80,esp:4.5,refoc:150,bw:600,npart:40,thk:2.5,nex:1,spoil:30,ny:192,pf:0.6},['fs'],{dim:'3D',fsDef:'chess'}),
S('timeslip','ncmra_ts','mra','非造影MRA（選択的反転・流入）','Inflow inversion bSSFP',['NATIVE-TrueFISP','o'],['Time-SLIP（True SSFP）','o'],'撮像範囲に反転パルス（タグ）をかけ、BBTI の間に流入した未反転の動脈血だけを明るく描く。腎動脈などで使う。',{tr:4.5,te:2.2,fa:90,bw:900,bbti:1200,npart:60,thk:1.5,nex:1},['fs'],{gre:true,dim:'3D',fsDef:'chess'}),
S('qiss','ncmra_qiss','mra','非造影MRA（静止期シングルショット）','QISS',['QISS','o'],['（相当機能）','x'],'面内飽和で背景を抑え、静止期に流入した動脈血をシングルショットbSSFPで撮る。下肢動脈。',{tr:4,te:2,fa:90,bw:700,qi:230,thk:3,nex:1},['fs'],{gre:true}),
S('cemra','cemra','mra','造影MRA','CE-MRA',['CE-MRA（CARE Bolus）','o'],['CE-MRA（Visual Prep）','c'],'造影剤の初回循環で血液のT1を大きく短縮させ、短TRの3D GREで撮る。造影前を差分。',{tr:3,te:1.1,fa:30,bw:600,npart:80,thk:1.2,nex:1,pf:0.75},[],{gre:true,dim:'3D'}),
S('twist','gre3d','mra','時間分解能造影MRA／ダイナミック','Time-resolved MRA (view sharing)',['TWIST','o'],['DRKS','c'],'k空間中心を頻回に、周辺を間引いて更新し（ビューシェアリング）、高い時間分解能で動態を追う。',{tr:3,te:1.1,fa:25,bw:650,npart:48,thk:1.5,nex:1,pa:20,pb:25},[],{gre:true,dim:'3D',twist:true}),
/* ---- 体部 ---- */
S('mrcp3d','mrcp','body','3D MRCP','3D heavily T2-weighted FSE',['SPACE MRCP','o'],['3D MRCP（FASE3D）','x'],'非常に長いTEで液体（胆汁・膵液）だけを残す。呼吸同期またはナビゲータで撮る。',{tr:4500,te:650,etl:140,esp:5,refoc:120,bw:400,npart:72,thk:1.2,nex:1},['fs'],{dim:'3D',fsDef:'spair'}),
S('mrcp2d','mrcp2d','body','2D 厚切りMRCP','Thick-slab single-shot',['HASTE thick slab','o'],['FASE（厚切り）','c'],'40〜80 mm の厚いスライスを1回のシングルショットで撮る投影像。',{tr:6000,te:750,esp:6,refoc:150,bw:400,thk:50,nex:1,pf:0.6},['fs'],{fsDef:'spair'}),
S('dixon_tse','dixon_tse','body','FSE Dixon（水・脂肪分離）','TSE Dixon',['TSE Dixon','o'],['WFOP（FSE）','c'],'FSEのエコー位置をずらして水・脂肪を分離。T2強調でも均一な脂肪抑制が得られる。',{tr:4000,te:80,etl:14,esp:9,refoc:150,bw:300,nex:1,dixpts:2},['restore'],{dixType:'tse',outs:['w','f','ip']}),
S('pdff','pdff','quant','多エコーDixon（PDFF・R2*）','Multi-echo Dixon PDFF',['LiverLab（qDixon）','o'],['Fat Fraction Quantification','o'],'6エコー程度のGREで脂肪分率（PDFF）とR2*を同時に推定。脂肪肝・鉄過剰の定量。',{tr:9,te:1.1,dte:1.1,ne:6,fa:4,bw:1100,npart:64,thk:3.5,nex:1},[],{gre:true,dim:'3D'}),
S('mre','mre','quant','MRエラストグラフィ','MR Elastography',['MR Elastography','o'],['MRE','x'],'外部の加振装置で肝に剪断波を伝え、波の長さから硬さ（kPa）を求める。線維化の評価。',{tr:50,te:20,fa:25,bw:300,freq:60,nsl:4,thk:10,nex:1},[],{gre:true}),
/* ---- 心臓 ---- */
S('cine','cine','cardiac','シネ（bSSFP）','Cine bSSFP',['TrueFISP cine','o'],['True SSFP cine','c'],'心電図同期・セグメント収集で心周期の動画を作る。時間分解能 = 1セグメントのライン数 × TR。',{tr:3.2,te:1.6,fa:55,bw:950,vps:12,thk:8,nex:1},[],{gre:true,ecgReq:true}),
S('lge','lge','cardiac','遅延造影（LGE・PSIR）','Late gadolinium enhancement',['PSIR（IR-TurboFLASH）','o'],['LGE（PSIR）','x'],'造影後10分前後に、正常心筋がゼロになるTIで撮像。瘢痕・線維化が高信号。PSIRはTIの誤差に強い。',{tr:6,te:2.5,ti:300,fa:25,bw:300,vps:25,thk:8,nex:1},[],{gre:true,ecgReq:true,forceAgent:'eca',forcePhase:3}),
S('molli','map_t1','cardiac','T1マッピング（MOLLI）','Modified Look-Locker',['MOLLI（MyoMaps）','o'],['MOLLI','c'],'複数のTIの画像からT1を推定。MOLLIは真のT1よりやや短く出る傾向がある。',{tr:2.8,te:1.2,fa:35,bw:1000,thk:8,nex:1},[],{gre:true,ecgReq:true}),
/* ---- 定量 ---- */
S('t2map','map_t2','quant','T2マッピング（多エコーSE）','Multi-echo SE T2 map',['MapIt（T2）','o'],['T2 map','c'],'複数のTEのSE画像からT2を推定。軟骨・心筋・肝で使う。',{tr:1500,te:13,etl:8,esp:13,refoc:180,bw:200,nex:1},[],{}),
S('t2smap','map_t2s','quant','T2*マッピング（多エコーGRE）','Multi-echo GRE T2* map',['MapIt（T2*）','o'],['T2* Relax Map','x'],'多エコーGREからT2*（R2*）を推定。鉄沈着の評価。空気との境界ではT2*が短く出る。',{tr:200,te:2.5,dte:2.5,ne:12,fa:20,bw:600,nex:1},[],{gre:true}),
S('t1map_vfa','map_vfa','quant','T1マッピング（可変フリップ角）','VFA T1 map',['VIBE VFA（MapIt）','c'],['（相当機能）','x'],'2つ以上のフリップ角の3D GREからT1を推定。B1の誤差に敏感。',{tr:5,te:1.5,fa:2,fa2:15,bw:450,npart:64,thk:3,nex:1},[],{gre:true,dim:'3D'}),
/* ---- 応用・特殊 ---- */
S('asl','asl','adv','動脈スピンラベリング（pCASL）','pCASL',['ASL（3D pCASL）','o'],['ASL','c'],'頸部で血液を磁気的に標識し、標識あり・なしの差から脳血流（CBF）を求める。造影剤不要。PLD が短いと血管内に信号が残る。',{tr:4600,te:16,pld:1800,ld:1800,npairs:8,bw:2300,nx:64,ny:64,thk:4,nex:1},[],{}),
S('ute','ute','adv','超短TE（UTE）','Ultrashort TE',['UTE／PETRA','o'],['mUTE','x'],'0.1 ms 以下の超短TEで、通常は無信号の皮質骨・腱・半月板・肺から信号を得る。2エコーの差分で短T2成分を強調。',{tr:6,te:0.07,te2:2.3,fa:8,bw:700,nex:1},[],{gre:true}),
S('mrs','mrs','adv','MRスペクトロスコピー（単一ボクセル）','Single-voxel MRS',['SVS（PRESS／STEAM）','o'],['SVS（PRESS／STEAM）','x'],'ボクセル内の代謝物（NAA・Cr・Cho・乳酸など）をスペクトルで表示。TE 135–144 ms では乳酸の二重線が下向き。',{tr:2000,te:30,navg:128,vox:15},[],{}),
S('metal','fse','adv','金属アーチファクト低減FSE','Metal artifact reduction',['WARP（VAT＋SEMAC）','o'],['VAT（FSE）','c'],'受信帯域を広げ、VAT（view angle tilting）で面内のずれを、SEMAC で面直交方向のずれを補正する。',{tr:4000,te:30,etl:14,esp:8,refoc:150,bw:600,nex:2},['fs','vat','semac'],{vatDef:true})
];
MS.SEQ={}; MS.SEQS.forEach(function(s){ MS.SEQ[s.id]=s; });

/* ---------- 加速・オプションの名称対応 ---------- */
MS.VENDOR_OPTS=[
  ['並列画像（画像空間）','mSENSE','o','SPEEDER','o'],
  ['並列画像（k空間）','GRAPPA','o','（SPEEDER として統合）','c'],
  ['3D の CAIPIRINHA 型サンプリング','CAIPIRINHA','o','（相当機能）','x'],
  ['同時多断面励起（SMS）','Simultaneous Multi-Slice','o','MultiBand SPEEDER','c'],
  ['圧縮センシング','Compressed Sensing','o','Compressed SPEEDER','o'],
  ['深層学習再構成（雑音低減）','Deep Resolve Gain／Boost','o','AiCE','o'],
  ['深層学習による高分解能化','Deep Resolve Sharp','o','PIQE','c'],
  ['高速3D収集','—','—','Fast 3D mode','o'],
  ['ラジアル（ブレード）動き補正','BLADE','o','JET','c'],
  ['呼吸同期・ナビゲータ','PACE','o','呼吸同期／RMC','c'],
  ['化学シフト選択的脂肪抑制','Fat Sat','o','MSOFT（比較表）','c'],
  ['断熱パルスの脂肪抑制','SPAIR','o','SPAIR','o'],
  ['水選択励起','Water Excitation','o','PASTA','o'],
  ['Dixon 法（FSE）','TSE Dixon','o','WFOP','c'],
  ['FSE のフリップバック','RESTORE','o','T2 Plus','o'],
  ['磁化移動（MT）パルス','MTC','o','SORS-STC','c'],
  ['TOF の傾斜フリップ角','TONE','o','ISCE','c'],
  ['ボーラスタイミング','CARE Bolus','o','Visual Prep','c'],
  ['計算 b 値','Computed b-values','o','cDWI','c'],
  ['金属アーチファクト（面内）','WARP（VAT）','o','VAT','c'],
  ['金属アーチファクト（面直交）','Advanced WARP（SEMAC）','o','（相当機能）','x'],
  ['ダイナミックのビューシェアリング','TWIST','o','DRKS','c']
];
/* 公開版：裏付けのとれていないメーカー名称（確認度 x）は「—」にする */
if(MS.PUBLIC){ MS.SEQS.forEach(function(s){ if(s.sieC==="x"){ s.sie="—"; s.sieC="—"; } if(s.canC==="x"){ s.can="—"; s.canC="—"; } }); MS.VENDOR_OPTS.forEach(function(r){ if(r[2]==="x"){ r[1]="—"; r[2]="—"; } if(r[4]==="x"){ r[3]="—"; r[4]="—"; } }); }

/* ---------- 実行（シーケンス別の画像生成） ---------- */
var cacheP={key:null,ph:null}, cacheG={key:null,geo:null};
function excF(b1,a){ return sin((a||90)*D*b1); }
function refF(b1,b){ var x=sin((b||180)*D*b1/2); return x*x; }
function flowVoid(tp,te,thk){ if(!tp.v) return 1; var d=tp.v*0.01*te/2; return Math.max(0,1-d/Math.max(0.5,thk)); }
function inflow(tp,tr,thk){ if(!tp.v) return 0; return Math.min(1,tp.v*0.01*tr/Math.max(0.3,thk)); }
function fatT2fse(tp,esp){ return tp.fT2*(esp<15?1.6:1.15); }

MS.run=function(st){
  var sq=MS.SEQ[st.seq];
  var ph=ensurePh(st); st.coil=ph.ph.coil; st.coilG=ph.ph.coilG;
  if(sq.forceAgent){ st=Object.assign({},st,{agent:sq.forceAgent,cphase:sq.forcePhase}); }
  st.p.dim3=sq.dim==='3D';
  var info=MS.derive(st,sq); var p=info.p;
  var S=(Math.max(p.nx,p.ny)>256 && !st.fast)?512:256;
  var gk=[S,p.fov,p.pfov,p.pos,st.pe,st.offX,st.offY].join('|');
  if(cacheG.key!==gk||cacheG.ph!==ph){ cacheG.key=gk; cacheG.ph=ph; cacheG.geo=MS.geometry(ph,st,S); }
  var geo=cacheG.geo;
  var tps=ph.keys.map(function(k){ return MS.tissueAt(k,st); });
  /* 動き */
  var m=ph.ph.motion, ssh=/ssfse|mrcp2d|dwi|dti|bold|dsc|cine|lge|map_t1|qiss|asl|mre|mrs/.test(sq.k);
  var rf={none:1,bh:0.04,trig:0.15,nav:0.1,radial:1}[st.resp||'none'];
  var mot={resp:(m.resp||0)*rf*(ssh?0.06:1), card:(m.card||0)*(st.ecg&&st.ecg!=='none'?0.08:1)*(ssh?0.2:1), puls:(!ssh && (ph.ph.region==='abd'||ph.ph.region==='chest'||ph.ph.pulsatile) && !st.satband)?1:0, rr:60/(st.hr||70), radial:st.resp==='radial'||sq.radial, dirPE:1};
  if(st.satband && mot.puls) mot.puls=0;
  var reg=ph.ph.region;
  mot.wfn=ph.ph.motion.wfn||function(x,y,k){ if(k==='bone'||k==='marrow_v'||k==='cord'||k==='csf') return 0; if(reg==='abd') return Math.max(0,Math.min(1,(30-y)/110)); if(reg==='chest'||reg==='breast') return Math.max(0,Math.min(1,(-55-y)/50)); return Math.max(0,Math.min(1,(-60-y)/50)); };
  if(!geo.peV) mot.resp*=0.6;
  var ctx={st:st,sq:sq,info:info,ph:ph,geo:geo,tps:tps,motion:mot,wantK:true};
  MS.resetNoise(st.noiseSeed||12345);
  var outs=(K[sq.k]||K.fse)(ctx,p,sq,st);
  return {outs:outs, info:info, geo:geo, ph:ph, tps:tps, sq:sq, S:S};
};
/* ---------- 掃引（グラフ用）：1画素=1組織の小格子でシーケンス計算を回す ---------- */
function ensurePh(st){ var pk=st.phantom+'|'+JSON.stringify(st.les)+'|'+JSON.stringify(st.popt)+'|'+st.hemStage; if(cacheP.key!==pk){ cacheP.key=pk; cacheP.ph=MS.buildPhantom(st.phantom,st.les,st.popt,st.hemStage); cacheG.key=null; } return cacheP.ph; }
function probeGeo(ph){ var n=ph.keys.length, S=1; while(S*S<n) S*=2; var N=S*S; var lab=new Int16Array(N).fill(-1); for(var i=0;i<n;i++) lab[i]=i; var z=new Float32Array(N);
  var one_=new Float32Array(N).fill(1); return {S:S,sub:1,ns:1,K:1,lab:lab,tex:one_,fld:z,grd:z,xs:z,ys:z,peV:true,fov:100,fovpe:100,fovAcq:100}; }
MS.setParam=function(st,key,x){ if(key==='B0') st.B0=x; else if(key==='dose') st.dose=x; else if(key==='b') st.p.bvals='0,'+Math.round(x); else if(key==='hr') st.hr=x; else st.p[key]=x; };
MS.probe=function(st0,spec){ var sq=MS.SEQ[st0.seq], ph=ensurePh(st0), pg=probeGeo(ph);
  function ev(mods){ var st=JSON.parse(JSON.stringify(st0)); mods.forEach(function(m){ MS.setParam(st,m[0],m[1]); }); st.coil=ph.ph.coil; st.coilG=ph.ph.coilG; if(sq.forceAgent){ st.agent=sq.forceAgent; st.cphase=sq.forcePhase; } st.p.dim3=sq.dim==='3D';
    var info=MS.derive(st,sq), p=info.p, tps=ph.keys.map(function(k){ return MS.tissueAt(k,st); });
    var ctx={st:st,sq:sq,info:info,ph:ph,geo:pg,tps:tps,motion:{resp:0,card:0,puls:0,wfn:function(){return 0;}},probe:true};
    MS._probe=true; var outs; try{ outs=(K[sq.k]||K.fse)(ctx,p,sq,st); } finally{ MS._probe=false; }
    var oi=spec.out||0; if(spec.xk==='b'||spec.yk==='b') oi=Math.max(1,oi); var o=outs[Math.min(oi,outs.length-1)]; var v=[]; for(var i=0;i<ph.keys.length;i++) v.push(o.data?o.data[i]:NaN);
    return {v:v,T:info.T,snr:info.snr0,sar:info.sar,kind:o.kind,unit:o.unit,name:o.name}; }
  var r={keys:ph.keys, names:ph.keys.map(function(k){ return MS.tissueAt(k,st0).n; }), pts:[]};
  if(spec.mode==='map'){ spec.ys.forEach(function(y){ spec.xs.forEach(function(x){ r.pts.push(ev([[spec.xk,x],[spec.yk,y]])); }); }); }
  else spec.xs.forEach(function(x){ r.pts.push(ev([[spec.xk,x]])); });
  r.cur=ev([]); return r; };
function one(ctx,acq,name,opt){ var im=MS.form(ctx,acq); var f=MS.finish(ctx,im,opt); var o={name:name, data:MS.mag(f), re:f.re, im:f.im, kmag:im.kmag, kind:'mag'}; return o; }
function real(f){ var o=new Float32Array(f.re.length); for(var i=0;i<o.length;i++) o[i]=f.re[i]; return o; }
function phaseOf(f){ var o=new Float32Array(f.re.length); for(var i=0;i<o.length;i++) o[i]=Math.atan2(f.im[i],f.re[i]); return o; }
function fsSig(st){ return (st.fs==='stir')?'none':(st.fs||'none'); }
function mtFac(tp,st,sq,p){ var lv=0; if(st.mt) lv+=0.5; if((sq.k==='fse'||sq.k==='ir')&&(p.nsl||1)>4) lv+=0.25*Math.pow((p.refoc||150)/180,2)*Math.min(1,(p.etl||1)/10); return 1-Math.min(0.6,tp.mt*lv); }

var K={};
K.se=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te; return [one(ctx,{fs:fsSig(st),tr:TR,sig:function(tp,df,b1){ var M=(1-2*E(-(TR-TE/2)/tp.T1)+E(-TR/tp.T1)); var fv=flowVoid(tp,TE,p.thk); var Mf=(1-2*E(-(TR-TE/2)/tp.fT1)+E(-TR/tp.fT1));
  var e=excF(b1)*refF(b1); return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*e*fv, f:tp.PD*tp.ff*Mf*E(-TE/tp.fT2)*e}; }},sq.n)]; };
K.fse=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te,etl=p.etl,esp=p.esp; var trn=etl*esp, rest=st.restore;
  if(sq.id==='metal'){ st.vat=st.vat!==false; }
  return [one(ctx,{fs:fsSig(st),tr:TR,train:{type:'fse',etl:etl,esp:esp,te:TE},sig:function(tp,df,b1){
    var mfb=rest?E(-trn/tp.T2):0, mfbF=rest?E(-trn/fatT2fse(tp,esp)):0;
    var M=1-(1-mfb)*E(-(TR-trn)/tp.T1), Mf=1-(1-mfbF)*E(-(TR-trn)/tp.fT1);
    var rf=0.55+0.45*Math.pow(sin((p.refoc||150)*D*b1/2),2); var e=excF(b1)*rf; var fv=flowVoid(tp,esp*2,p.thk);
    return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*e*fv*mtFac(tp,st,sq,p), f:tp.PD*tp.ff*Mf*E(-TE/fatT2fse(tp,esp))*e, T2b:tp.T2, fT2b:fatT2fse(tp,esp)}; }},sq.n)]; };
K.ssfse=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te,esp=p.esp; return [one(ctx,{fs:fsSig(st),tr:TR,train:{type:'ss',etl:p.ny,esp:esp,te:TE,R:ctx.info.R,te0:0},sig:function(tp,df,b1){
  var M=1-E(-TR/tp.T1), Mf=1-E(-TR/tp.fT1); var e=excF(b1)*(0.55+0.45*Math.pow(sin((p.refoc||150)*D*b1/2),2)); var fv=flowVoid(tp,esp*2,p.thk);
  return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*e*fv, f:tp.PD*tp.ff*Mf*E(-TE/fatT2fse(tp,esp))*e, T2b:tp.T2, fT2b:fatT2fse(tp,esp)}; }},sq.n)]; };
K.mrcp2d=K.ssfse;
K.ir=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te,TI=p.ti,etl=p.etl,esp=p.esp,trn=etl*esp;
  var acq={fs:fsSig(st),tr:TR,train:{type:'fse',etl:etl,esp:esp,te:TE},sig:function(tp,df,b1){
    var inv=Math.pow(sin(90*D*b1),2); var Trec=TR-TI-trn; var Mw=MS.sig.ir(tp.T1,TI,Trec), Mf=MS.sig.ir(tp.fT1,TI,Trec); Mw=1-(1-Mw)*inv; Mf=1-(1-Mf)*inv;
    var e=excF(b1)*(0.55+0.45*Math.pow(sin((p.refoc||150)*D*b1/2),2)); var fv=flowVoid(tp,esp*2,p.thk);
    var w=tp.PD*(1-tp.ff)*Mw*E(-TE/tp.T2)*e*fv*mtFac(tp,st,sq,p), f=tp.PD*tp.ff*Mf*E(-TE/fatT2fse(tp,esp))*e;
    if(sq.real){ return {w:Math.abs(w), wph:w<0?PI:0, f:Math.abs(f), fph:f<0?PI:0, T2b:tp.T2, fT2b:fatT2fse(tp,esp)}; }
    return {w:Math.abs(w), f:Math.abs(f), T2b:tp.T2, fT2b:fatT2fse(tp,esp)}; }};
  var im=MS.form(ctx,acq), fz=MS.finish(ctx,im); var o={name:sq.n, data:MS.mag(fz), kmag:im.kmag, kind:'mag'};
  if(sq.real){ var r=real(fz); return [{name:sq.n+'（実部・符号付き）', data:r, kmag:im.kmag, kind:'signed'}, Object.assign(o,{name:'強度画像（参考）'})]; }
  return [o]; };
K.fse3d=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te,etl=p.etl,esp=p.esp,trn=etl*esp; var isIR=!!sq.ir||!!p.ti&&!sq.dir; var refo=p.refoc||120;
  return [one(ctx,{fs:fsSig(st),tr:TR,train:{type:'fse3d',etl:etl,esp:esp,te:TE},sig:function(tp,df,b1){
    var Trec=TR-trn-(p.ti||0); var Mw=1-E(-Math.max(0,TR-trn)/tp.T1), Mf=1-E(-Math.max(0,TR-trn)/tp.fT1);
    if(sq.dir){ Mw=Math.abs(MS.sig.dir(tp.T1,p.ti,p.ti2,TR-trn-p.ti)); Mf=Math.abs(MS.sig.dir(tp.fT1,p.ti,p.ti2,TR-trn-p.ti)); }
    else if(isIR){ Mw=Math.abs(MS.sig.ir(tp.T1,p.ti,Trec)); Mf=Math.abs(MS.sig.ir(tp.fT1,p.ti,Trec)); }
    var vfa=0.5+0.5*Math.pow(sin(refo*D*b1/2),2); var T2e=tp.T2*(refo<150?1.25:1); var e=excF(b1)*vfa;
    var fv=tp.v?E(-tp.v/6):1; /* 3D FSE は流れに対してブラックブラッド */
    return {w:tp.PD*(1-tp.ff)*Mw*E(-TE/T2e*0.85)*e*fv, f:tp.PD*tp.ff*Mf*E(-TE/(fatT2fse(tp,esp)*1.3))*e, T2b:T2e, fT2b:fatT2fse(tp,esp)}; }},sq.n)]; };
K.mrcp=K.fse3d;
function greSig(p,st,TE,opt){ opt=opt||{}; var TR=p.tr, a=(opt.fa||p.fa)*D; var thk=opt.slab||p.thk; return function(tp,df,b1){
  var aa=a*b1; var fr=opt.noInflow?0:inflow(tp,TR,opt.slab?opt.slab:thk); var Mw=MS.sig.spgr(tp.T1,1e9,TR,0,aa); var Ms=Mw; Mw=Mw*(1-fr)+sin(aa)*fr;
  var fc=st.flowcomp?1:E(-Math.pow(tp.v*TE/220,2)); var Mf=MS.sig.spgr(tp.fT1,1e9,TR,0,aa);
  return {w:tp.PD*(1-tp.ff)*Mw*E(-TE/tp.T2s)*(tp.v?fc:1), f:tp.PD*tp.ff*Mf*E(-TE/tp.fT2s)}; }; }
K.gre=function(ctx,p,sq,st){ return [one(ctx,{fs:fsSig(st),tr:p.tr,gre:true,te:p.te,sig:greSig(p,st,p.te)},sq.n)]; };
K.gre3d=function(ctx,p,sq,st){ var slab=p.npart*p.thk; var o=one(ctx,{fs:fsSig(st),tr:p.tr,tmul:p.npart/(ctx.info.Rz||1),gre:true,te:p.te,sig:greSig(p,st,p.te,{slab:slab})},sq.n);
  if(sq.twist){ var A=p.pa/100, Bv=p.pb/100; var tres=ctx.info.T*(A+(1-A)*Bv); ctx.info.tres=tres*1000; ctx.info.W.push({lv:'info',t:'時間分解能（1時相の更新間隔）≈ '+tres.toFixed(1)+' 秒（中心'+p.pa+'%・周辺'+p.pb+'%）。全k空間の時間幅は約 '+(ctx.info.T).toFixed(1)+' 秒'}); }
  return [o]; };
K.dixon=function(ctx,p,sq,st){ var outs=[]; var a=MS.form(ctx,{tr:p.tr,gre:true,te:p.te,sig:greSig(p,st,p.te,{slab:sq.dim==='3D'?p.npart*p.thk:p.thk})}); var A=MS.finish(ctx,a);
  var b=MS.form(ctx,{tr:p.tr,gre:true,te:p.te2,sig:greSig(p,st,p.te2,{slab:sq.dim==='3D'?p.npart*p.thk:p.thk})}); var Bm=MS.finish(ctx,b);
  var n=A.re.length, op=MS.mag(A), ip=MS.mag(Bm);
  var B0=st.B0, fH=MS.FAT_PPM*42.577*B0, opTE=Math.abs(1/(2*fH))*1000; var isOP=Math.abs(((p.te/opTE)%2)-1)<0.35;
  if(sq.dixType==='gre2' && sq.outs.indexOf('w')<0){ return [{name:'第1エコー TE '+MS.fmt(p.te)+' ms'+(isOP?'（逆位相）':''), data:op, kmag:a.kmag, kind:'mag'},{name:'第2エコー TE '+MS.fmt(p.te2)+' ms', data:ip, kmag:b.kmag, kind:'mag'}]; }
  /* 2点Dixon: W=(IP+OP)/2, F=(IP-OP)/2（強度ベース＋位相補正の近似）。大きい磁場ずれで水脂肪の入れ替わり */
  var W=new Float32Array(n), F=new Float32Array(n); var G=ctx.geo, S=G.S, hz=42.577*B0;
  for(var i=0;i<n;i++){ var w=(ip[i]+op[i])/2, f=Math.abs(ip[i]-op[i])/2; W[i]=w; F[i]=f; }
  /* 入れ替わり：主成分の磁場が水と脂肪の中間付近を超える画素 */
  var swaps=0; for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var o=((r*S+c)*G.ns)*G.K; var df=G.fld[o]*hz; if(Math.abs(df)>Math.abs(fH)*0.5 && G.lab[o]>0){ var q=r*S+c; var t=W[q]; W[q]=F[q]; F[q]=t; swaps++; } }
  if(swaps>20) ctx.info.W.push({lv:'warn',t:'磁場の不均一が大きい部位で水・脂肪の入れ替わり（swap）が起きています'});
  var res=[{name:'水画像（W）',data:W,kmag:a.kmag,kind:'mag'},{name:'脂肪画像（F）',data:F,kmag:a.kmag,kind:'mag'},{name:'同位相（IP）',data:ip,kmag:b.kmag,kind:'mag'},{name:'逆位相（OP）',data:op,kmag:a.kmag,kind:'mag'}];
  return res; };
K.dixon_tse=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te,etl=p.etl,esp=p.esp,trn=etl*esp; var Wm,Fm,IPm;
  var base=function(tp,df,b1){ var M=1-E(-(TR-trn)/tp.T1), Mf=1-E(-(TR-trn)/tp.fT1); var e=excF(b1)*0.9; var fv=flowVoid(tp,esp*2,p.thk);
    return [tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*e*fv, tp.PD*tp.ff*Mf*E(-TE/fatT2fse(tp,esp))*e]; };
  var acqW={tr:TR,train:{type:'fse',etl:etl,esp:esp,te:TE},sig:function(tp,df,b1){ var v=base(tp,df,b1); return {w:v[0],f:0,T2b:tp.T2}; }};
  var acqF={tr:TR,train:{type:'fse',etl:etl,esp:esp,te:TE},sig:function(tp,df,b1){ var v=base(tp,df,b1); return {w:0,f:v[1],fT2b:fatT2fse(tp,esp)}; }};
  var acqI={tr:TR,train:{type:'fse',etl:etl,esp:esp,te:TE},sig:function(tp,df,b1){ var v=base(tp,df,b1); return {w:v[0],f:v[1],T2b:tp.T2,fT2b:fatT2fse(tp,esp)}; }};
  var nm=Math.sqrt(p.dixpts||2);
  var w=MS.finish(ctx,MS.form(ctx,acqW),{noiseMul:1/nm}), f=MS.finish(ctx,MS.form(ctx,acqF),{noiseMul:1/nm}), ii=MS.form(ctx,acqI), I=MS.finish(ctx,ii);
  return [{name:'水画像（W）',data:MS.mag(w),kmag:ii.kmag,kind:'mag'},{name:'脂肪画像（F）',data:MS.mag(f),kind:'mag'},{name:'同位相（IP）',data:MS.mag(I),kind:'mag'}]; };
K.mprage=function(ctx,p,sq,st){ var n=Math.round(p.npart/(ctx.info.Rz||1)); var c=Math.floor(n/2); return [one(ctx,{tr:p.trs,tmul:1,sig:function(tp,df,b1){
  var a=p.fa*D*b1; var w=MS.sig.mprage(tp.T1,p.trs,p.ti,p.esp,n,a,c), f=MS.sig.mprage(tp.fT1,p.trs,p.ti,p.esp,n,a,c); var te=2.5;
  return {w:Math.abs(tp.PD*(1-tp.ff)*w*E(-te/tp.T2s)), f:Math.abs(tp.PD*tp.ff*f*E(-te/tp.fT2s)), wph:w<0?PI:0, fph:f<0?PI:0}; }},sq.n)]; };
K.mp2rage=function(ctx,p,sq,st){ var n=Math.round(p.npart/(ctx.info.Rz||1));
  function acq(ix){ return {tr:p.trs,sig:function(tp,df,b1){ var s=MS.sig.mp2rage(tp.T1,p.trs,p.ti,p.ti2,p.esp,n,p.fa*D*b1,p.fa2*D*b1), sf=MS.sig.mp2rage(tp.fT1,p.trs,p.ti,p.ti2,p.esp,n,p.fa*D*b1,p.fa2*D*b1);
    var w=tp.PD*(1-tp.ff)*s[ix], f=tp.PD*tp.ff*sf[ix]; return {w:Math.abs(w),wph:w<0?PI:0,f:Math.abs(f),fph:f<0?PI:0}; }}; }
  var a=MS.form(ctx,acq(0)), b=MS.form(ctx,acq(1)); var A=MS.finish(ctx,a), Bv=MS.finish(ctx,b); var n2=A.re.length, U=new Float32Array(n2), T1m=new Float32Array(n2);
  for(var i=0;i<n2;i++){ var num=A.re[i]*Bv.re[i]+A.im[i]*Bv.im[i], den=A.re[i]*A.re[i]+A.im[i]*A.im[i]+Bv.re[i]*Bv.re[i]+Bv.im[i]*Bv.im[i]; U[i]=den>1e-12?num/den:0; }
  /* UNI→T1 の参照表 */
  var lut=[]; for(var t=200;t<=4500;t+=20){ var s=MS.sig.mp2rage(t,p.trs,p.ti,p.ti2,p.esp,n,p.fa*D,p.fa2*D); lut.push([s[0]*s[1]/(s[0]*s[0]+s[1]*s[1]),t]); }
  for(var j=0;j<n2;j++){ var best=0,bd=9; for(var q=0;q<lut.length;q++){ var d=Math.abs(lut[q][0]-U[j]); if(d<bd){bd=d;best=lut[q][1];} } T1m[j]=(A.re[j]*A.re[j]+A.im[j]*A.im[j]+Bv.re[j]*Bv.re[j]+Bv.im[j]*Bv.im[j])>4e-6?best:0; }
  return [{name:'UNI画像',data:U,kind:'signed',kmag:a.kmag},{name:'INV1（TI '+p.ti+' ms）',data:MS.mag(A),kind:'mag'},{name:'INV2（TI '+p.ti2+' ms）',data:MS.mag(Bv),kind:'mag'},{name:'T1マップ（ms）',data:T1m,kind:'map',unit:'ms',range:[0,3000]}]; };
K.bssfp=function(ctx,p,sq,st){ var TR=p.tr, a=p.fa*D, hz=MS.FAT_PPM*42.577*st.B0;
  function acq(off){ return {fs:fsSig(st),tr:TR,perPixel:true,sig:function(tp,df,b1){ var th=2*PI*(df/1000*TR)+off, thf=2*PI*((df+hz)/1000*TR)+off;
    var w=MS.sig.bssfp(tp.T1,tp.T2,TR,a*b1,th), f=MS.sig.bssfp(tp.fT1,tp.fT2,TR,a*b1,thf); var fv=tp.v?0.95:1;
    return {w:tp.PD*(1-tp.ff)*w.mag*fv, wph:Math.atan2(w.im,w.re), f:tp.PD*tp.ff*f.mag, fph:Math.atan2(f.im,f.re)}; }}; }
  if(sq.ciss){ var A=MS.finish(ctx,MS.form(ctx,acq(0))), Bv=MS.finish(ctx,MS.form(ctx,acq(PI))); var m1=MS.mag(A), m2=MS.mag(Bv), C=new Float32Array(m1.length); for(var i=0;i<C.length;i++) C[i]=Math.max(m1[i],m2[i]);
    return [{name:'CISS（2つの位相サイクルの合成）',data:C,kind:'mag'},{name:'位相サイクル 0°（バンディングあり）',data:m1,kind:'mag'},{name:'位相サイクル 180°',data:m2,kind:'mag'}]; }
  return [one(ctx,acq(0),sq.n)]; };
K.cine=function(ctx,p,sq,st){ var o=K.bssfp(ctx,p,sq,st); ctx.info.W.push({lv:'info',t:'時間分解能 ≈ '+MS.fmt((p.vps||12)*p.tr)+' ms（'+(p.vps||12)+' ライン/セグメント × TR）、1スライスの息止め ≈ '+MS.fmt(ctx.info.T/Math.max(1,p.nsl||1))+' 秒'}); o[0].name='シネ（拡張末期の1フレーム）'; return o; };
K.fisp=function(ctx,p,sq,st){ var a=p.fa*D; return [one(ctx,{tr:p.tr,gre:true,te:p.te,sig:function(tp,df,b1){ return {w:tp.PD*(1-tp.ff)*Math.abs(MS.sig.fisp(tp.T1,tp.T2,p.tr,p.te,a*b1,tp.T2s)), f:tp.PD*tp.ff*Math.abs(MS.sig.fisp(tp.fT1,tp.fT2,p.tr,p.te,a*b1,tp.fT2s))}; }},sq.n)]; };
K.psif=function(ctx,p,sq,st){ var a=p.fa*D; return [one(ctx,{tr:p.tr,sig:function(tp,df,b1){ var fv=tp.v?0.3:1; return {w:tp.PD*(1-tp.ff)*Math.abs(MS.sig.psif(tp.T1,tp.T2,p.tr,p.te,a*b1))*fv, f:tp.PD*tp.ff*Math.abs(MS.sig.psif(tp.fT1,tp.fT2,p.tr,p.te,a*b1))}; }},sq.n)]; };
K.dess=function(ctx,p,sq,st){ var a=p.fa*D; var A=MS.form(ctx,{fs:fsSig(st),tr:p.tr,gre:true,te:p.te,sig:function(tp,df,b1){ var s1=Math.abs(MS.sig.fisp(tp.T1,tp.T2,p.tr,p.te,a*b1,tp.T2s)), s2=Math.abs(MS.sig.psif(tp.T1,tp.T2,p.tr,p.tr-p.te,a*b1));
  var f1=Math.abs(MS.sig.fisp(tp.fT1,tp.fT2,p.tr,p.te,a*b1,tp.fT2s)), f2=Math.abs(MS.sig.psif(tp.fT1,tp.fT2,p.tr,p.tr-p.te,a*b1)); return {w:tp.PD*(1-tp.ff)*Math.sqrt(s1*s1+s2*s2), f:tp.PD*tp.ff*Math.sqrt(f1*f1+f2*f2)}; }});
  var f=MS.finish(ctx,A); return [{name:sq.n,data:MS.mag(f),kmag:A.kmag,kind:'mag'}]; };
K.swi=function(ctx,p,sq,st){ var slab=p.npart*p.thk; var A=MS.form(ctx,{tr:p.tr,gre:true,te:p.te,tmul:p.npart,sig:greSig(p,st,p.te,{slab:slab,noInflow:true})}); var f=MS.finish(ctx,A);
  var S=ctx.geo.S, mag=MS.mag(f), ph=phaseOf(f);
  /* 高域通過（低周波の位相を除去） */
  var lr=new Float32Array(S*S), li=new Float32Array(S*S); for(var i=0;i<S*S;i++){ lr[i]=f.re[i]; li[i]=f.im[i]; }
  var kr=Math.max(2,Math.round(S/32)); var br=boxBlur(lr,S,kr), bi=boxBlur(li,S,kr); var hp=new Float32Array(S*S), sw=new Float32Array(S*S);
  for(var j=0;j<S*S;j++){ var cr=f.re[j]*br[j]+f.im[j]*bi[j], ci=f.im[j]*br[j]-f.re[j]*bi[j]; var ang=Math.atan2(ci,cr); hp[j]=ang; var msk=ang<0?Math.max(0,1+ang/PI):1; sw[j]=mag[j]*Math.pow(msk,4); }
  return [{name:'SWI（強度×位相マスク⁴）',data:sw,kmag:A.kmag,kind:'mag'},{name:'強度画像',data:mag,kind:'mag'},{name:'フィルタ後の位相（rad）',data:hp,kind:'phase',range:[-PI,PI]}]; };
function boxBlur(a,S,r){ var t=new Float32Array(S*S), o=new Float32Array(S*S); for(var y=0;y<S;y++){ var s=0,cnt=0; for(var x=-r;x<S+r;x++){ if(x+r<S){ s+=a[y*S+x+r]; cnt++; } if(x-r-1>=0){ s-=a[y*S+x-r-1]; cnt--; } if(x>=0&&x<S) t[y*S+x]=s/cnt; } }
  for(var x2=0;x2<S;x2++){ var s2=0,c2=0; for(var y2=-r;y2<S+r;y2++){ if(y2+r<S){ s2+=t[(y2+r)*S+x2]; c2++; } if(y2-r-1>=0){ s2-=t[(y2-r-1)*S+x2]; c2--; } if(y2>=0&&y2<S) o[y2*S+x2]=s2/c2; } } return o; }
/* 拡散 */
K.dwi=function(ctx,p,sq,st){ var bs=(p.bvals||'0,1000').split(',').map(Number).filter(function(v){return !isNaN(v);}); if(!bs.length) bs=[0,1000];
  var TR=p.tr,TE=p.te, R=ctx.info.R, seg=p.seg||1, lines=Math.round(p.ny*(p.pf||1)/R);
  var esp=p.esp_epi/(seg>1?seg*0.55:1);
  var stir=sq.stir||st.fs==='stir'; var fsm=stir?'none':(st.fs||'none');
  if(sq.zoom){ ctx.info.W.push({lv:'info',t:'小FOV励起：位相方向のFOV外は励起されないため折り返しません'}); }
  var outs=[], imgs=[];
  bs.forEach(function(b){ var acq={fs:fsm,tr:TR,gre:false,te:TE,epi:{lines:lines,esp:esp},train:{type:'epi',etl:lines,esp:esp,te:TE},sig:function(tp,df,b1){
      var M=1-E(-TR/tp.T1), Mf=1-E(-TR/tp.fT1); if(stir){ var ti=p.ti||(st.B0>=3?220:170); M=Math.abs(MS.sig.ir(tp.T1,ti,TR-ti)); Mf=Math.abs(MS.sig.ir(tp.fT1,ti,TR-ti)); }
      var ivim=tp.v?E(-b*0.02):1; var e=excF(b1)*refF(b1);
      return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*E(-b*tp.ADC/1000)*ivim*e, f:tp.PD*tp.ff*Mf*E(-TE/tp.fT2)*E(-b*0.02/1000)*e, T2b:tp.T2s*1.4, fT2b:tp.fT2s}; }};
    if(sq.zoom){ acq.zoom=true; }
    var nav=b>0?(p.ndir||3):1; var im=MS.form(ctx,acq); var f=MS.finish(ctx,im,{noiseMul:1/Math.sqrt(nav*(p.bavg||1))}); imgs.push({b:b,m:MS.mag(f),k:im.kmag}); });
  imgs.forEach(function(x){ outs.push({name:'b = '+x.b+' s/mm²',data:x.m,kmag:x.k,kind:'mag'}); });
  if(imgs.length>=2){ var a=imgs[0], z=imgs[imgs.length-1], n=a.m.length, adc=new Float32Array(n); var thr=0.02*maxOf(a.m);
    for(var i=0;i<n;i++){ adc[i]=(a.m[i]>thr&&z.m[i]>0)? Math.max(0,Math.log(a.m[i]/Math.max(z.m[i],1e-6))/(z.b-a.b)*1000):0; }
    outs.push({name:'ADCマップ（×10⁻³ mm²/s）',data:adc,kind:'map',unit:'×10⁻³ mm²/s',range:[0,3]});
    if(st.cdwi){ var cb=st.cdwi, c=new Float32Array(n); for(var j=0;j<n;j++) c[j]=a.m[j]*E(-cb*adc[j]/1000); outs.splice(imgs.length,0,{name:'計算DWI b = '+cb,data:c,kind:'mag'}); } }
  if(seg>1) ctx.info.W.push({lv:'info',t:'読出しを '+seg+' 分割：実効エコー間隔が短くなり歪みとぼけが減る（撮像時間は約 '+seg+' 倍）'});
  return outs; };
function maxOf(a){ var m=0; for(var i=0;i<a.length;i+=7) if(a[i]>m) m=a[i]; return m; }
K.dti=function(ctx,p,sq,st){ var o=K.dwi(ctx,p,sq,st); var b0=o[0].data, n=b0.length; var fa=new Float32Array(n); var G=ctx.geo, S=G.S, tps=ctx.tps; var sig=1/Math.max(1,ctx.info.snr0*Math.sqrt(p.ndir/6));
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c, oo=((q)*G.ns)*G.K; var li=G.lab[oo]; var v=li>0?tps[li].fa:0; if(b0[q]<0.02*maxOf(b0)) v=0; fa[q]=Math.max(0,Math.min(1,v+MS.gauss()*sig*2)); }
  return [{name:'FAマップ',data:fa,kind:'map',unit:'FA',range:[0,1]}].concat(o); };
K.bold=function(ctx,p,sq,st){ var TR=p.tr,TE=p.te,R=ctx.info.R, lines=Math.round(p.ny*(p.pf||1)/R);
  var acq={fs:'none',tr:TR,gre:true,te:TE,epi:{lines:lines,esp:p.esp_epi},train:{type:'epi',etl:lines,esp:p.esp_epi,te:TE},sig:function(tp,df,b1){ var M=MS.sig.spgr(tp.T1,1e9,TR,0,p.fa*D*b1); return {w:tp.PD*(1-tp.ff)*M*E(-TE/tp.T2s), f:tp.PD*tp.ff*MS.sig.spgr(tp.fT1,1e9,TR,0,p.fa*D)*E(-TE/tp.fT2s), T2b:tp.T2s, fT2b:tp.fT2s}; }};
  var im=MS.form(ctx,acq), f=MS.finish(ctx,im), m=MS.mag(f); var G=ctx.geo, S=G.S, n=S*S; var ov=new Float32Array(n);
  var dR2=0.6*st.B0/1.5; var sigma=1/ctx.info.snr0; var nv=p.nvol||150;
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c, o=(q*G.ns)*G.K; var li=G.lab[o]; if(li<=0) continue; var k=ctx.tps[li].key; var x=G.xs[o], y=G.ys[o];
    var act=(k==='gm'&&y>45&&Math.abs(x)<40)?1:0; var dS=m[q]*TE/1000*dR2*act; var t=dS/sigma*Math.sqrt(nv/4)+MS.gauss(); ov[q]=t; }
  return [{name:'BOLD EPI＋賦活マップ（t値, 視覚課題）',data:m,overlay:ov,othr:3.1,kmag:im.kmag,kind:'mag'}]; };
K.dsc=function(ctx,p,sq,st){ var o=K.bold(ctx,p,sq,st); var G=ctx.geo, S=G.S, cbv=new Float32Array(S*S); for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c, oo=(q*G.ns)*G.K; var li=G.lab[oo]; if(li<=0) continue; var t=ctx.tps[li]; var v=t.cbf?t.cbf/60*4:(t.vt?12:0); cbv[q]=Math.max(0,v*(1+MS.gauss()*0.6/Math.max(1,ctx.info.snr0/5))); }
  return [{name:'rCBV（相対値）',data:cbv,kind:'map',unit:'rCBV',range:[0,8]},{name:'EPI（造影前）',data:o[0].data,kind:'mag',kmag:o[0].kmag}]; };
/* MRA */
K.tof=function(ctx,p,sq,st){ var a=p.fa*D, TR=p.tr, slab=sq.dim==='3D'?p.npart*p.thk:p.thk; var tone=st.tone, mt=st.mt, vs=st.vsat;
  return [one(ctx,{tr:TR,gre:true,te:p.te,tmul:sq.dim==='3D'?p.npart:1,sig:function(tp,df,b1){ var aa=a*b1*(tone?0.85:1); var E1=E(-TR/tp.T1); var Mss=(1-E1)/(1-cos(aa)*E1);
    var w=Mss; if(tp.v){ var nP=(slab/2)/(tp.v*0.01*TR); var Mn=Mss+(1-Mss)*Math.pow(cos(aa)*E1,Math.max(0,nP)); w=Mn; if(vs && (tp.vt==='v'||tp.vt==='p')) w=Mss*0.3; }
    var mtf=mt?1-0.6*tp.mt:1; var fc=st.flowcomp===false?E(-Math.pow(tp.v/60,2)):1;
    return {w:tp.PD*(1-tp.ff)*sin(aa)*w*E(-p.te/tp.T2s)*mtf*(tp.v?fc:1), f:tp.PD*tp.ff*sin(aa)*(1-E(-TR/tp.fT1))/(1-cos(aa)*E(-TR/tp.fT1))*E(-p.te/tp.fT2s)}; }},sq.n)]; };
K.pc=function(ctx,p,sq,st){ var TR=p.tr; var A=MS.form(ctx,{tr:TR,gre:true,te:p.te,sig:function(tp,df,b1){ var g=greSig(p,st,p.te)(tp,df,b1); g.wph=(tp.v? PI*tp.v*(tp.vt==='v'?-1:1)/p.venc : 0); g.fph=0; return g; }}); var f=MS.finish(ctx,A,{noiseMul:Math.SQRT2});
  var B=MS.form(ctx,{tr:TR,gre:true,te:p.te,sig:greSig(p,st,p.te)}); var g=MS.finish(ctx,B,{noiseMul:Math.SQRT2}); var n=f.re.length, vel=new Float32Array(n), mag=MS.mag(g);
  for(var i=0;i<n;i++){ var cr=f.re[i]*g.re[i]+f.im[i]*g.im[i], ci=f.im[i]*g.re[i]-f.re[i]*g.im[i]; vel[i]=Math.atan2(ci,cr)/PI*p.venc; }
  var vmax=0; ctx.tps.forEach(function(t){ if(t.v>vmax) vmax=t.v; }); if(vmax>p.venc) ctx.info.W.push({lv:'warn',t:'最大流速 '+vmax+' cm/s が VENC '+p.venc+' cm/s を超え、位相の折り返し（エイリアシング）が起きます'});
  return [{name:'流速画像（cm/s）',data:vel,kind:'phase',range:[-p.venc,p.venc],unit:'cm/s',kmag:A.kmag},{name:'強度画像',data:mag,kind:'mag'}]; };
K.ncmra_fbi=function(ctx,p,sq,st){ var TR=p.tr, TE=p.te, spoil=p.spoil||30;
  function acq(phase){ return {fs:fsSig(st),tr:TR,train:{type:'fse3d',etl:p.etl,esp:p.esp,te:TE},sig:function(tp,df,b1){ var M=1-E(-TR/tp.T1), Mf=1-E(-TR/tp.fT1); var w=tp.PD*(1-tp.ff)*M*E(-TE/tp.T2)*0.9;
    if(tp.v){ var vv=(tp.vt==='a')?(phase==='sys'?tp.v*1.4:tp.v*0.12):tp.v*0.4; w*=E(-Math.pow(vv/(1200/spoil),2)); }
    return {w:w, f:tp.PD*tp.ff*Mf*E(-TE/fatT2fse(tp,p.esp))*0.9, T2b:tp.T2, fT2b:fatT2fse(tp,p.esp)}; }}; }
  var d=MS.finish(ctx,MS.form(ctx,acq('dia'))), s=MS.finish(ctx,MS.form(ctx,acq('sys'))); var md=MS.mag(d), ms=MS.mag(s), sub=new Float32Array(md.length); for(var i=0;i<sub.length;i++) sub[i]=Math.max(0,md[i]-ms[i]);
  return [{name:'差分（拡張期−収縮期）= 動脈',data:sub,kind:'mag'},{name:'拡張期',data:md,kind:'mag'},{name:'収縮期（動脈の信号が抜ける）',data:ms,kind:'mag'}]; };
K.ncmra_ts=function(ctx,p,sq,st){ var TR=p.tr, a=p.fa*D, BB=p.bbti; return [one(ctx,{fs:fsSig(st),tr:TR,perPixel:true,sig:function(tp,df,b1){ var th=2*PI*(df/1000*TR);
  var s=MS.sig.bssfp(tp.T1,tp.T2,TR,a*b1,th); var mz=(tp.vt==='a')?1:Math.abs(1-2*E(-BB/tp.T1)); var sf=MS.sig.bssfp(tp.fT1,tp.fT2,TR,a,th+2*PI*MS.FAT_PPM*42.577*st.B0/1000*TR);
  return {w:tp.PD*(1-tp.ff)*s.mag*mz, f:tp.PD*tp.ff*sf.mag*Math.abs(1-2*E(-BB/tp.fT1))}; }},'選択的反転・流入（BBTI '+BB+' ms）')]; };
K.ncmra_qiss=function(ctx,p,sq,st){ var TR=p.tr,a=p.fa*D,QI=p.qi; return [one(ctx,{fs:fsSig(st),tr:TR,perPixel:true,sig:function(tp,df,b1){ var s=MS.sig.bssfp(tp.T1,tp.T2,TR,a*b1,2*PI*df/1000*TR); var mz=(tp.vt==='a')?1:(tp.vt?0.05:1-E(-QI/tp.T1)); return {w:tp.PD*(1-tp.ff)*s.mag*mz, f:tp.PD*tp.ff*0.6*(1-E(-QI/tp.fT1))}; }},sq.n)]; };
K.cemra=function(ctx,p,sq,st){ var s1=Object.assign({},st,{agent:'none',cphase:0}); var pre=ctx.tps; var post=ctx.ph.keys.map(function(k){ return MS.tissueAt(k,Object.assign({},st,{agent:'eca',cphase:1,dose:(st.dose||1)*1.5})); });
  var slab=p.npart*p.thk; ctx.tps=pre; var A=MS.finish(ctx,MS.form(ctx,{tr:p.tr,gre:true,te:p.te,tmul:p.npart,sig:greSig(p,st,p.te,{slab:slab,noInflow:true})})); ctx.tps=post; var Bi=MS.form(ctx,{tr:p.tr,gre:true,te:p.te,tmul:p.npart,sig:greSig(p,st,p.te,{slab:slab,noInflow:true})}); var B=MS.finish(ctx,Bi); ctx.tps=pre;
  var a=MS.mag(A), b=MS.mag(B), d=new Float32Array(a.length); for(var i=0;i<a.length;i++) d[i]=Math.max(0,b[i]-a[i]); return [{name:'差分（造影後−造影前）',data:d,kind:'mag',kmag:Bi.kmag},{name:'造影後（動脈相）',data:b,kind:'mag'},{name:'造影前',data:a,kind:'mag'}]; };
/* 心臓 */
K.lge=function(ctx,p,sq,st){ var RR=60000/(st.hr||70), TRb=2*RR, TI=p.ti, a=p.fa*D;
  var acq={tr:p.tr,gre:true,te:p.te,sig:function(tp,df,b1){ var mz=MS.sig.ir(tp.T1,TI,TRb-TI), mf=MS.sig.ir(tp.fT1,TI,TRb-TI); var w=tp.PD*(1-tp.ff)*mz*sin(a*b1)*E(-p.te/tp.T2s), f=tp.PD*tp.ff*mf*sin(a*b1)*E(-p.te/tp.fT2s); return {w:Math.abs(w),wph:w<0?PI:0,f:Math.abs(f),fph:f<0?PI:0}; }};
  var im=MS.form(ctx,acq), f=MS.finish(ctx,im); var myo=ctx.tps.filter(function(t){return t.key==='myo';})[0]; var tn=myo?Math.round(myo.T1*Math.log(2)*(1-0.15)):0;
  ctx.info.W.push({lv:'info',t:'造影後の正常心筋 T1 ≈ '+(myo?Math.round(myo.T1):'—')+' ms → 心筋がゼロになる TI の目安 ≈ '+tn+' ms（2心拍ごとの反転を考慮した近似）'});
  return [{name:'LGE 強度画像（TI '+TI+' ms）',data:MS.mag(f),kmag:im.kmag,kind:'mag'},{name:'PSIR（符号付き）',data:real(f),kind:'signed'}]; };
K.map_t1=function(ctx,p,sq,st){ return [mapOut(ctx,'T1マップ（MOLLI, ms）',function(t){ return t.T1*0.92; },[0,2000],'ms',2.5)]; };
K.map_t2=function(ctx,p,sq,st){ return [mapOut(ctx,'T2マップ（ms）',function(t){ return Math.min(t.T2*1.05,300); },[0,150],'ms',1.5)]; };
K.map_t2s=function(ctx,p,sq,st){ var G=ctx.geo, hz=42.577*st.B0; return [mapOut(ctx,'T2*マップ（ms）',function(t,o){ var g=G.grd[o]*hz; var r=1/t.T2s+PI*g*(p.thk||5)/1000*0.5; return Math.min(1/r,200); },[0,80],'ms',1.2), mapOut(ctx,'R2*マップ（s⁻¹）',function(t,o){ var g=G.grd[o]*hz; return 1000/t.T2s+PI*g*(p.thk||5)*0.5; },[0,300],'s⁻¹',1.2)]; };
K.map_vfa=function(ctx,p,sq,st){ return [mapOut(ctx,'T1マップ（VFA, ms）',function(t,o,x,y){ var b=MS.b1At(st,ctx.ph,x,y); return t.T1*b*b; },[0,2500],'ms',2)]; };
K.pdff=function(ctx,p,sq,st){ return [mapOut(ctx,'PDFF（%）',function(t){ return t.ff*100; },[0,50],'%',0.6), mapOut(ctx,'R2*（s⁻¹）',function(t){ return 1000/t.T2s; },[0,200],'s⁻¹',1.5), Object.assign(K.dixon(ctx,Object.assign({},p,{te2:p.te+p.dte}),{dixType:'gre2',outs:['w','f','ip','op'],dim:'3D',n:''},st)[0],{name:'水画像（参考）'})]; };
function mapOut(ctx,name,fn,range,unit,noiseK){ var G=ctx.geo, S=G.S, m=new Float32Array(S*S), sig=noiseK/Math.max(0.5,ctx.info.snr0/10);
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c, acc=0, wt=0; for(var s=0;s<G.ns;s++){ var o=((q)*G.ns+s)*G.K; var li=G.lab[o]; if(li<=0) continue; var t=ctx.tps[li]; if(t.PD<0.2) continue; acc+=fn(t,o,G.xs[o],G.ys[o]); wt++; }
    m[q]=wt?Math.max(0,acc/wt*(1+MS.gauss()*sig*0.05)):0; }
  return {name:name,data:m,kind:'map',unit:unit,range:range}; }
K.asl=function(ctx,p,sq,st){ var B=st.B0, T1b=B>=3?1650:1350, lam=0.9, al=0.85*(B>=3?1:0.95), PLD=p.pld, LD=p.ld; var G=ctx.geo, S=G.S, cbf=new Float32Array(S*S), pw=new Float32Array(S*S);
  var att={wm:1600,gm:1250,gm_deep:1200,gp:1300}; var sigma=1/ctx.info.snr0*Math.sqrt(2/(p.npairs||8))*3;
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c, o=(q*G.ns)*G.K; var li=G.lab[o]; if(li<=0) continue; var t=ctx.tps[li]; var f=t.cbf; var dm=0;
    var at=att[t.key]||1300; if(t.lesion&&t.key==='infarct') at=2200;
    if(f){ var eff=PLD>=at?1:Math.max(0,(PLD+LD-at)/LD); dm=f/6000/lam*2*al*T1b/1000*(1-E(-LD/T1b))*E(-PLD/T1b)*eff; }
    if(t.vt==='a' && PLD<1600) dm=0.02*(1600-PLD)/1600;
    var noisy=dm+MS.gauss()*sigma*0.004; pw[q]=noisy; cbf[q]=Math.max(0,6000*lam*noisy*E(PLD/T1b)/(2*al*T1b/1000*(1-E(-LD/T1b)))); }
  if(PLD<1500) ctx.info.W.push({lv:'warn',t:'PLD が短く、標識血が組織に届く前に撮像されるため血管内に信号が残ります（動脈通過時間アーチファクト）'});
  return [{name:'CBFマップ（ml/100g/min）',data:cbf,kind:'map',unit:'ml/100g/min',range:[0,100]},{name:'灌流強調像（差分）',data:pw,kind:'mag'}]; };
K.ute=function(ctx,p,sq,st){ var a=p.fa*D; function g(te){ return {tr:p.tr,gre:true,te:te,sig:function(tp,df,b1){ var M=MS.sig.spgr(tp.T1,1e9,p.tr,0,a*b1); var Mf=MS.sig.spgr(tp.fT1,1e9,p.tr,0,a*b1); return {w:tp.PD*(1-tp.ff)*M*E(-te/tp.T2s), f:tp.PD*tp.ff*Mf*E(-te/tp.fT2s)}; }}; }
  var A=MS.finish(ctx,MS.form(ctx,g(p.te))), B=MS.finish(ctx,MS.form(ctx,g(p.te2))); var a1=MS.mag(A), b1=MS.mag(B), d=new Float32Array(a1.length); for(var i=0;i<d.length;i++) d[i]=Math.max(0,a1[i]-b1[i]);
  return [{name:'UTE 第1エコー（TE '+p.te+' ms）',data:a1,kind:'mag'},{name:'第2エコー（TE '+p.te2+' ms）',data:b1,kind:'mag'},{name:'差分（短T2成分）',data:d,kind:'mag'}]; };
K.mre=function(ctx,p,sq,st){ var G=ctx.geo, S=G.S, wave=new Float32Array(S*S), stiff=new Float32Array(S*S); var kpa=st.liverKpa||2.2, f=p.freq||60;
  var mag=one(ctx,{tr:p.tr,gre:true,te:p.te,sig:greSig(p,st,p.te)},'強度画像');
  for(var r=0;r<S;r++) for(var c=0;c<S;c++){ var q=r*S+c, o=(q*G.ns)*G.K; var li=G.lab[o]; if(li<=0) continue; var t=ctx.tps[li]; var x=G.xs[o], y=G.ys[o];
    var mu=(t.key==='liver'||t.key==='hcc'||t.key==='met_rim'||t.key==='hem_core')?(t.key==='liver'?kpa:(t.key==='hcc'?kpa*2.2:kpa*1.6)):(t.key==='spleen'?kpa*1.4:(t.PD>0.3&&!t.vt&&t.key!=='fat'?3:0));
    if(!mu) continue; var lam=Math.sqrt(mu*1000/1000)/f*1000; /* mm */ var d=Math.hypot(x+150,y+20); wave[q]=Math.sin(2*PI*d/lam)*E(-d/400)*(t.key==='liver'?1:0.3); stiff[q]=mu*(1+MS.gauss()*0.04); }
  return [{name:'弾性率マップ（kPa）',data:stiff,kind:'map',unit:'kPa',range:[0,8]},{name:'波動画像（'+f+' Hz）',data:wave,kind:'phase',range:[-1,1]},mag]; };
K.mrs=function(ctx,p,sq,st){ var lesionOn=st.les&&(st.les.glioma||st.les.infarct); var B=st.B0; var lw=B>=3?5:3.5; var sp={te:p.te, lesion:st.mrsVox==='lesion', B:B, snr:Math.sqrt(p.navg/128)*Math.pow(p.vox/15,3)*(B>=3?1.8:1)*25, lw:lw};
  return [{name:'スペクトル',kind:'spectrum',spec:sp}]; };

/* ---------- 拡張用 API（新しいシーケンスを src/seq/*.js から足す） ----------
  MS.addSeq({ id, k, cat, n, gen, sie:[名称,確認度], can:[…], ge:[…], phi:[…], fuji:[…], uih:[…], d, p:{既定パラメータ}, o:[オプション], x:{gre:true, dim:'3D', …}, run:function(ctx,p,sq,st){…} })
    k   … 画像を作る関数の種類。既存の種類（'se','fse','ir','gre','gre3d','bssfp','dwi' など MS.K のキー）を使えば run は不要。
    run … 新しい種類のときだけ書く。MS.SEQAPI の部品（one, fsSig, greSig, flowVoid, excF, refF …）で acq を組み、[{name,data,kind}] を返す。
  MS.addCat(id, 名前) … シーケンスの分類を足す */
MS.K=K;
MS.SEQAPI={one:one, real:real, phaseOf:phaseOf, fsSig:fsSig, mtFac:mtFac, excF:excF, refF:refF, flowVoid:flowVoid, inflow:inflow, fatT2fse:fatT2fse, greSig:greSig, boxBlur:boxBlur, maxOf:maxOf, mapOut:mapOut};
MS.addCat=function(id,n){ if(!MS.CATS.some(function(c){ return c[0]===id; })) MS.CATS.push([id,n]); };
MS.addSeq=function(def){ var x=def.x||{}; var e=S(def.id,def.k||def.id,def.cat||'adv',def.n,def.gen||def.n,def.sie||['—','—'],def.can||['—','—'],def.d||'',def.p||{},def.o||[],x);
  ['ge','phi','fuji','uih'].forEach(function(v){ var a=def[v]; e[v]=a?a[0]:'—'; e[v+'C']=a?a[1]:'—'; });
  if(def.run) K[e.k]=def.run; if(!K[e.k]) throw new Error('addSeq: 種類 '+e.k+' がありません（run を書くか、既存の種類を指定）');
  if(MS.PUBLIC){ ['sie','can','ge','phi','fuji','uih'].forEach(function(v){ if(e[v+'C']==='x'){ e[v]='—'; e[v+'C']='—'; } }); }
  var i=-1; MS.SEQS.forEach(function(s,j){ if(s.id===e.id) i=j; }); if(i>=0) MS.SEQS[i]=e; else MS.SEQS.push(e); MS.SEQ[e.id]=e; return e; };
})();
