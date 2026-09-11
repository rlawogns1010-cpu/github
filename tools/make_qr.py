# -*- coding: utf-8 -*-
"""갤러리 주소를 가리키는 QR 코드 이미지를 만든다.
사용법:  python tools/make_qr.py https://내사이트주소/gallery/
출력:    qr-gallery.png (화면/웹용), qr-gallery.svg (인쇄용, 무한 확대 가능)
"""
import os, sys
import segno

if len(sys.argv) < 2:
    print("사용법: python tools/make_qr.py <갤러리 URL>")
    sys.exit(1)

url = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
png = os.path.join(ROOT, "qr-gallery.png")
svg = os.path.join(ROOT, "qr-gallery.svg")

# error='h': 로고를 얹거나 인쇄가 흐려져도 30%까지 복원 가능
qr = segno.make(url, error="h")
qr.save(png, scale=12, border=4, dark="#0e1116", light="#ffffff")
qr.save(svg, scale=12, border=4, dark="#0e1116", light="#ffffff")

print("QR 생성 완료")
print("  대상 주소 :", url)
print("  PNG :", png)
print("  SVG :", svg)
