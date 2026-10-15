"""Condensed Pixso DSL tree printer.

Usage: python tools/dsl_tree.py <guid>
Calls get_node_dsl via pixso_mcp plumbing and prints a compact indented tree
with only the fields useful for 1:1 React reconstruction.
"""
import json
import sys

from pixso_mcp import call_tool  # reuse existing plumbing

KEEP = (
    "id", "type", "name", "box", "fills", "radius", "strokes", "strokeWeight",
    "effects", "autoLayout", "text", "font", "fontSize", "fontWeight",
    "lineHeight", "letterSpacing", "textAlign", "opacity", "rotation",
    "constraints", "visible", "blendMode", "clipsContent", "layoutAlign",
    "layoutGrow", "strokeAlign", "dashPattern", "vectorPaths", "gradientStops",
)


def walk(node: dict, depth: int = 0) -> None:
    indent = "  " * depth
    parts = []
    for k in KEEP:
        if k in node and node[k] not in (None, "", [], {}):
            v = node[k]
            if k == "vectorPaths":
                v = f"<{len(str(v))} chars>"
            parts.append(f"{k}={json.dumps(v, ensure_ascii=False)}")
    head = f"{indent}[{node.get('type')}] {node.get('name')!r} id={node.get('id')}"
    print(head)
    for p in parts:
        if p.startswith(("id=", "type=", "name=")):
            continue
        print(f"{indent}  {p}")
    for c in node.get("children", []) or []:
        walk(c, depth + 1)


def main() -> None:
    guid = sys.argv[1]
    raw = call_tool(
        "get_node_dsl",
        {"guid": guid, "clientFrameworks": "react", "simplify": True},
    )
    payload = json.loads(raw["content"][0]["text"])
    for root in payload.get("roots", []):
        walk(root)
    styles = payload.get("localStyles") or payload.get("styles")
    if styles:
        print("\n== localStyles ==")
        print(json.dumps(styles, ensure_ascii=False, indent=1)[:6000])


if __name__ == "__main__":
    main()
