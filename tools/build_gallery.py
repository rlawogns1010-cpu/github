# -*- coding: utf-8 -*-
"""gallery/images/ 폴더를 스캔해 gallery/images.json 을 다시 만든다.
기존 캡션은 파일명 기준으로 유지된다.
사용법:  python tools/build_gallery.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "gallery", "images")
JSON_PATH = os.path.join(ROOT, "gallery", "images.json")
EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif")

old = {}
if os.path.exists(JSON_PATH):
    try:
        for it in json.load(open(JSON_PATH, encoding="utf-8")):
            if isinstance(it, dict):
                old[it.get("src")] = it.get("caption", "")
    except Exception:
        pass

os.makedirs(IMG_DIR, exist_ok=True)
files = sorted(f for f in os.listdir(IMG_DIR) if f.lower().endswith(EXTS))
items = [{"src": f, "caption": old.get(f, "")} for f in files]

with open(JSON_PATH, "w", encoding="utf-8") as fp:
    json.dump(items, fp, ensure_ascii=False, indent=2)

print(f"{len(items)}개 이미지 등록 -> gallery/images.json")
for f in files:
    print("  -", f)
