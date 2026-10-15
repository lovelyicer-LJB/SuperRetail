"""导出 Pixso 节点为 SVG 并下载到 tmp_export/。
用法: python tools/export_svg.py <guid> [guid...]
URL 提取对 MCP 双重转义健壮：找 .svg 结尾的 http 链接。
"""
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

OUT = Path("tmp_export")
OUT.mkdir(exist_ok=True)

for guid in sys.argv[1:]:
    args = json.dumps({
        "guid": guid,
        "exportSettings": {"constraint": {"type": 1, "value": 1}, "imageType": 3},
    })
    raw = subprocess.run(
        [sys.executable, "tools/pixso_mcp.py", "call", "get_export_image", args],
        capture_output=True, text=True,
    ).stdout
    m = re.search(r"https?://[^\s\"'\\]+\.svg", raw)
    if not m:
        print(f"{guid} -> NO URL; raw head: {raw[:200]}")
        continue
    url = m.group(0)
    fn = OUT / f"logo_{guid.replace(':', '_')}.svg"
    urllib.request.urlretrieve(url, fn)
    print(f"{guid} -> {fn} ({fn.stat().st_size} bytes)")
