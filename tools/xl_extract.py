"""Extract Overall balance XL column data + right panel structure from Pixso DSL."""
import sys
sys.path.insert(0, 'tools')
from pixso_mcp import call_tool

r = call_tool('get_node_dsl', {'guid': '65:3880', 'clientFrameworks': 'react', 'simplify': True})
# MCP 返回 {content:[{type:'text',text:'<json>'}]}，先解出 JSON
import json
if isinstance(r, dict) and 'content' in r:
    txt = next(c['text'] for c in r['content'] if c.get('type') == 'text')
    node = json.loads(txt)
else:
    node = r
def find_root(o):
    if isinstance(o, dict):
        if o.get('id') == '65:3880':
            return o
        for v in o.values():
            f = find_root(v)
            if f: return f
    elif isinstance(o, list):
        for v in o:
            f = find_root(v)
            if f: return f
    return None
root = find_root(node)
if not root:
    print('root not found; keys:', list(r.keys()) if isinstance(r, dict) else type(r))
    sys.exit(1)

def box(n):
    b = n.get('box') or n.get('absoluteBoundingBox') or {}
    return b

def walk_cols(n, out):
    if isinstance(n, dict):
        if n.get('name') == 'Column' and isinstance(n.get('children'), list):
            inner = None; top = None; bottom = None; date = None
            b = box(n)
            for c in n['children']:
                nm = c.get('name')
                if nm == 'Clolumn': inner = box(c)
                elif nm == 'Date': date = c.get('text', {}).get('content')
                if nm == 'Clolumn':
                    for cc in c.get('children', []):
                        if cc.get('name') == 'Top': top = box(cc)
                        if cc.get('name') == 'Bottom': bottom = box(cc)
            out.append((b.get('x'), inner.get('y') if inner else None, inner.get('h') if inner else None,
                        top.get('h') if top else None, bottom.get('h') if bottom else None, date))
        for v in n.get('children', []) if isinstance(n.get('children'), list) else []:
            walk_cols(v, out)

cols = []
walk_cols(root, cols)
print('COLUMNS (x, innerY, innerH, topH, botH, date):')
for c in cols:
    print(c)

# print top-level children names to find right panel
print('\nTOP-LEVEL CHILDREN:')
for c in root.get('children', []):
    b = box(c)
    print(' -', c.get('type'), repr(c.get('name')), c.get('id'), {k: b.get(k) for k in ('x','y','w','h')})
