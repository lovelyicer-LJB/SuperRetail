"""Extract exact RGBA of a local style by node_id, e.g. python tools/style_color.py 63:445"""
import sys
sys.path.insert(0, 'tools')
from pixso_mcp import call_tool
import json, re

target = sys.argv[1]
r = call_tool('get_local_styles', {})
s = json.dumps(r)
idx = s.find('"node_id\\":\\"' + target + '"')
if idx < 0:
    idx = s.find(target)
seg = s[max(0, idx - 1200):idx]
m = re.findall(r'\{\\"a\\":(\d+),\\"b\\":(\d+),\\"g\\":(\d+),\\"r\\":(\d+)\}', seg)
nm = re.search(r'\\"name\\":\\"([^\\]+)', s[idx:idx+200])
print('style', target, 'name:', nm.group(1) if nm else '?')
if m:
    a, b, g, rr = m[-1]
    print(f'rgba({rr},{g},{b},{a}) = #{int(rr):02X}{int(g):02X}{int(b):02X}')
else:
    print('no color in window; raw tail:', repr(seg[-300:]))
