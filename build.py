"""MRIパラメータシミュレーター Pro のビルド

usage: python3 build.py OUT.html [CSS_DIR] [--public] [--radtools] [--lang=en|zh]

  既定        単独のHTML（院内用。RadTools の共通ヘッダ・フッタなし）
  --public    公開版（院内向けの表記を外し、裏付けのないメーカー名称を「—」にする。フッタに注意書き・ライセンス）
  --radtools  RadTools ポータル統合版（共通ヘッダ・フッタつき。RadTools の ui/chrome.py が必要）
  --lang=en / --lang=zh  英語版／中国語（簡体字）版。i18n/<lang>.json（と i18n/extra_<lang>.json）の対訳で、
              ソース中の日本語の文字列リテラルと ui.html の文字を置き換える

  CSS は次の順に探す：
    1. 引数 CSS_DIR（RadTools の _build/src_v7）
    2. build.py の隣の css/（公開リポジトリの構成：book.css・radtools-ui.css・theme.css）
    3. build.py の一つ上の src_v7（便利ツール/_build/ の構成）
"""
import re,sys,os,datetime,glob
args=[a for a in sys.argv[1:] if not a.startswith('--')]; flags=set(a for a in sys.argv[1:] if a.startswith('--'))
RT_MODE='--radtools' in flags; PUBLIC='--public' in flags
LANG=([f.split('=',1)[1] for f in flags if f.startswith('--lang=')]+['ja'])[0]
here=os.path.dirname(os.path.abspath(__file__)); d=os.path.join(here,'src')+'/'
FAVICON="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Crect width=%2724%27 height=%2724%27 rx=%276%27 fill=%27%23007d82%27/%3E%3Cpath d=%27M5 12h3l2-5 3 10 2-5h4%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E"
def css_from_rt(rt):
  book=open(os.path.join(rt,'work/mri-sequence-book.src.html'),encoding='utf-8').read()
  return (re.findall(r'<style[^>]*>(.*?)</style>',book,re.S)[0], open(os.path.join(rt,'ui/radtools-ui.css'),encoding='utf-8').read(), open(os.path.join(rt,'themes/mri-sequence-book.css'),encoding='utf-8').read())
rt=None
if len(args)>1: rt=args[1]
elif os.path.isdir(os.path.join(here,'css')): rt=None
elif os.path.isdir(os.path.join(here,'..','src_v7')): rt=os.path.join(here,'..','src_v7')
if rt: bookcss,rtui,theme=css_from_rt(rt)
else: bookcss,rtui,theme=[open(os.path.join(here,'css',f),encoding='utf-8').read() for f in ['book.css','radtools-ui.css','theme.css']]
files=[d+'tissues.js',d+'phantom.js']+sorted(glob.glob(d+'ph/*.js'))+[d+f+'.js' for f in ['engine','seqs','vendors','state','meta','learn'] if os.path.exists(d+f+'.js')]+sorted(glob.glob(d+'seq/*.js'))
parts=[open(f,encoding='utf-8').read() for f in files]
if PUBLIC: parts.insert(1,'MS.PUBLIC=true;')
eng='\n'.join(parts)+'\n'
html=open(d+'ui.html',encoding='utf-8').read(); ui=open(d+'ui.js',encoding='utf-8').read()
if PUBLIC:
  REPO='https://github.com/ringnir/MRI-SIMULATOR-html'
  rep=[(html,[('院内教育版 · 全身・網羅版','教育用 · 全身・網羅版'),
              ('<span class="cf x">要確認</span> 名称を確認できていない。','裏付けのとれていない名称は「—」としています。'),
              ('院内装置のプロトコル名で確認してください。','お使いの装置のプロトコル名で確認してください。'),
              ('<p>院内教育用 · 全身・網羅版（2026年11月） · 外部ライブラリを使わず、すべての計算をこのファイル内で行います。既存の「MRIシーケンス読本」内のパラメータシミュレーターはそのまま残しています。</p>',
               '<p>教育用 · 全身・網羅版（2026年11月） · 外部ライブラリを使わず、すべての計算をこのファイル内で行います（オフラインで動作し、入力した値はどこにも送信しません）。</p>'
               '<p><b>診療・装置の設定には使わないでください。</b>組織値は文献値を丸めた代表値・推定値、仮想ファントムは解析的な図形で描いた模式図で、画像・撮像時間・SNR・SAR は教育用の近似です。医療機器ではありません。</p>'
               '<p>Siemens Healthineers、GE HealthCare、Philips、Canon Medical Systems、Fujifilm、United Imaging Healthcare の各社名、および本ツールに記載のシーケンス名・機能名（TSE、HASTE、VIBE、SPACE、FASE、SPEEDER、AiCE、PROPELLER、SENSE など）は各社の商標または登録商標です。名称の対応を示す目的で記載しており、各社とは関係のない非公式のツールです。</p>'
               '<p><a href="'+REPO+'">GitHub</a> · <a href="'+REPO+'/blob/main/LICENSE">MIT License</a> · © 2026 ringnir</p>')]),
       ]
  for a,b in rep[0][1]:
    assert a in html, a[:30]; html=html.replace(a,b,1)
  for a,b in [('「要確認」は名称の裏付けが取れていないもので、','裏付けのとれていない名称は「—」としています。'),('院内の装置のプロトコル名で確認してください。','お使いの装置のプロトコル名で確認してください。')]:
    assert a in eng, a[:20]; eng=eng.replace(a,b)
  a='Siemens: Deep Resolve Sharp、Canon: PIQE（名称要確認）。'; assert a in ui; ui=ui.replace(a,'Siemens: Deep Resolve Sharp など。')

# ---------- 多言語化（ビルド時に文字列を置き換える） ----------
JP=re.compile('[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]')
def js_tokens(src):
  i=0; n=len(src)
  while i<n:
    c=src[i]
    if c=='/' and i+1<n and src[i+1]=='/':
      j=src.find('\n',i); i=n if j<0 else j; continue
    if c=='/' and i+1<n and src[i+1]=='*':
      j=src.find('*/',i+2); i=n if j<0 else j+2; continue
    if c in '\'"`':
      q=c; j=i+1
      while j<n and src[j]!=q:
        j+=2 if src[j]=='\\' else 1
      yield (i,j+1,q,src[i+1:j]); i=j+1; continue
    i+=1
def js_translate(src,D,miss):
  out=[]; last=0
  for a,b,q,v in js_tokens(src):
    if v in D:
      t=re.sub(r'(?<!\\)'+re.escape(q),'\\\\'+q,D[v]).replace('\n','\\n')
      out.append(src[last:a]); out.append(q+t+q); last=b
    elif JP.search(v): miss.add(v)
  out.append(src[last:]); return ''.join(out)
def html_translate(h,D,miss):
  parts=re.split(r'(<script.*?</script>|<style.*?</style>)',h,flags=re.S)
  for k in range(0,len(parts),2):
    seg=parts[k]
    def tn(m):
      x=m.group(1); y=x.strip()
      if y in D: return '>'+x.replace(y,D[y],1)+'<'
      if JP.search(y): miss.add(y)
      return m.group(0)
    seg=re.sub(r'>([^<>]+)<',tn,seg)
    def at(m):
      y=m.group(2)
      if y in D: return m.group(1)+'="'+D[y].replace('"','&quot;')+'"'
      if JP.search(y): miss.add(y)
      return m.group(0)
    seg=re.sub(r'(title|placeholder|aria-label|alt)="([^"]+)"',at,seg)
    parts[k]=seg
  return ''.join(parts)
safe=lambda x:x.replace('</script','<\\/script')
import json
if LANG!='ja':
  D={}
  for f in ['i18n/%s.json'%LANG,'i18n/extra_%s.json'%LANG]:
    q=os.path.join(here,f)
    if os.path.exists(q): D.update(json.load(open(q,encoding='utf-8')))
  miss=set()
  eng=js_translate(eng,D,miss); ui=js_translate(ui,D,miss); html=html_translate(html,D,miss)
  html=html.replace('<html lang="ja">','<html lang="%s">'%{'en':'en','zh':'zh-CN'}[LANG],1)
  font={'en':'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif','zh':'"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans SC",system-ui,sans-serif'}[LANG]
  html=html.replace('</head>','<style>:root{--rt-font:%s}body,button,input,select,textarea{font-family:%s}</style>\n</head>'%(font,font),1)
  if miss:
    json.dump(sorted(miss),open(os.path.join(here,'i18n','missing_%s.json'%LANG),'w',encoding='utf-8'),ensure_ascii=False,indent=0)
    print('未訳の文字列',len(miss),'件 → i18n/missing_%s.json'%LANG)
if PUBLIC:
  cur={'ja':'index.html','en':'en.html','zh':'zh.html'}[LANG]
  sw=' · '.join(('<b>%s</b>' if f==cur else '<a href="%s" onclick="this.href=\'%s\'+location.hash">%s</a>')%((n,) if f==cur else (f,f,n)) for f,n in [('index.html','日本語'),('en.html','English'),('zh.html','中文')])
  a='<button type="button" class="print-button"'
  assert a in html; html=html.replace(a,'<span class="langsw" style="margin-right:10px">'+sw+'</span> '+a,1)
themes=open(d+'themes.css',encoding='utf-8').read() if os.path.exists(d+'themes.css') else ''
html=html.replace('/*__BOOKCSS__*/',bookcss).replace('/*__RTUI__*/',rtui).replace('/*__THEME__*/',theme+'\n'+themes)
html=html.replace('/*__ENGINE__*/',safe(eng)).replace('/*__ENGINE_RUN__*/',safe(eng)).replace('/*__UI__*/',safe(ui))
html=html.replace('</head>','<link rel="icon" href="'+FAVICON+'">\n</head>',1)
if RT_MODE:
  sys.path.insert(0,os.path.join(rt,'ui')); import chrome
  html=re.sub(r'(<body[^>]*>)',lambda m:m.group(1)+'\n'+chrome.bar('MRIパラメータシミュレーター Pro','MRI物理・シーケンス','cat-physics','index.html'),html,count=1)
  i=html.rfind('</body>'); html=html[:i]+chrome.foot('index.html',datetime.date.today().isoformat())+'\n'+html[i:]
else:
  html=html.replace('</head>','<style>:root{--rt-bar-h:0px}.sidebar{padding-top:26px}</style>\n</head>',1)
out=args[0]; open(out,'w',encoding='utf-8').write(html); print(out,len(html)//1024,'KB')
