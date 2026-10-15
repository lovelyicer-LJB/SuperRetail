#!/usr/bin/env python3
"""Call a Figma MCP tool, save text parts to .txt and image parts to files."""
import base64
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from figma_mcp import FigmaMCP


def main():
    tool = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) >= 3 else {}
    out_prefix = sys.argv[3] if len(sys.argv) >= 4 else "out"
    client = FigmaMCP()
    res = client.call("tools/call", {"name": tool, "arguments": args})
    content = res[0].get("result", {}).get("content", [])
    n_img = 0
    for i, part in enumerate(content):
        ptype = part.get("type")
        if ptype == "text":
            path = f"{out_prefix}-{i}.txt"
            with open(path, "w", encoding="utf-8") as f:
                f.write(part.get("text", ""))
            print(f"[text] {path} ({len(part.get('text',''))} chars)")
        elif ptype == "image":
            data = part.get("data", "")
            mime = part.get("mimeType", "image/png")
            ext = "png" if "png" in mime else ("jpg" if "jpeg" in mime else "bin")
            path = f"{out_prefix}-{i}.{ext}"
            with open(path, "wb") as f:
                f.write(base64.b64decode(data))
            print(f"[image] {path} ({len(data)} b64 chars)")
            n_img += 1
        else:
            path = f"{out_prefix}-{i}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(part, f, ensure_ascii=False, indent=2)
            print(f"[{ptype}] {path}")
    if not content:
        print(json.dumps(res, ensure_ascii=False)[:2000])


if __name__ == "__main__":
    main()
