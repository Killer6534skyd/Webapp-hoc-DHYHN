#!/usr/bin/env python3
"""
Bundle modular project (index.html + styles/main.css + data/*.js + js/*.js)
back into a single standalone HTML file in dist/webapp-dhyhn-bundle.html.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_PATH = os.path.join(ROOT, "index.html")
DIST_DIR = os.path.join(ROOT, "dist")
OUT_PATH = os.path.join(DIST_DIR, "webapp-dhyhn-bundle.html")


def compact_course_js(js_code: str) -> str:
    """Compact pretty-printed COURSE_BANKS_DATA['...'] = {...}; to save bundle size."""
    m = re.search(r"(COURSE_BANKS_DATA\['[^']+'\]\s*=\s*)(\{.*\})\s*;\s*$", js_code, re.S)
    if not m:
        return js_code
    prefix, json_part = m.group(1), m.group(2)
    try:
        parsed = json.loads(json_part)
        return f"{prefix}{json.dumps(parsed, ensure_ascii=False)};"
    except Exception:
        return js_code


def main():
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # Inline <link rel="stylesheet" href="styles/main.css" />
    def replace_css(match):
        rel = match.group(1)
        css_path = os.path.join(ROOT, rel)
        with open(css_path, "r", encoding="utf-8") as cf:
            return f"<style>\n{cf.read()}\n  </style>"

    html = re.sub(
        r'<link\s+rel="stylesheet"\s+href="((?!https?://)[^"]+)"\s*/?>',
        replace_css,
        html,
    )

    # Inline local <script src="..."></script>
    def replace_js(match):
        rel = match.group(1)
        js_path = os.path.join(ROOT, rel)
        with open(js_path, "r", encoding="utf-8") as jf:
            js_code = jf.read()
        if rel.startswith("data/courses/"):
            js_code = compact_course_js(js_code)
        js_code = js_code.replace("</script>", "<\\/script>")
        return f"<script>\n{js_code}\n  </script>"

    html = re.sub(
        r'<script\s+src="((?!https?://)[^"]+)"></script>',
        replace_js,
        html,
    )

    os.makedirs(DIST_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(html)

    size_mb = os.path.getsize(OUT_PATH) / (1024 * 1024)
    print(f"Built {OUT_PATH} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
