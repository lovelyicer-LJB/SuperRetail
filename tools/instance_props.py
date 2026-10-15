"""Dump override props of component instances, e.g. python tools/instance_props.py 65:4017 65:4018 65:4016 65:3885 65:3886"""
import sys, json
sys.path.insert(0, 'tools')
from pixso_mcp import call_tool

for guid in sys.argv[1:]:
    r = call_tool('get_node_dsl', {'guid': guid, 'clientFrameworks': 'react', 'simplify': False})
    txt = next(c['text'] for c in r['content'] if c.get('type') == 'text')
    n = json.loads(txt)
    root = n['pixTreeNodes'][0] if 'pixTreeNodes' in n else n
    print('=' * 10, guid, root.get('name'), f"{root.get('width')}x{root.get('height')}")
    for p in root.get('props', []):
        out = {k: p.get(k) for k in ('pathString', 'type', 'name', 'componentNormName', 'nodeText', 'width', 'height', 'top', 'left', 'cornerRadius') if p.get(k) is not None}
        fp = p.get('fillPaints')
        if fp:
            out['fills'] = [
                (f.get('color') and f"rgba({f['color'].get('r')},{f['color'].get('g')},{f['color'].get('b')},{f['color'].get('a')})")
                + ('' if f.get('visible', True) else ' HIDDEN')
                for f in fp
            ]
        if p.get('inheritFillStyleID'):
            out['style'] = p['inheritFillStyleID']
        if p.get('textStyleID') or p.get('inheritTextStyleID'):
            out['textStyle'] = p.get('textStyleID') or p.get('inheritTextStyleID')
        print('  ', json.dumps(out, ensure_ascii=False))
