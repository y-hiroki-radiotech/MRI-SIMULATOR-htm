# 使い方: python3 tests/topng.py tests/out/xxx.ppm|pgm ... → 同名 .png
import sys
from PIL import Image
for f in sys.argv[1:]: Image.open(f).save(f.rsplit('.',1)[0]+'.png'); print(f.rsplit('.',1)[0]+'.png')
