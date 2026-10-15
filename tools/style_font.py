"""Extract text style font params by node_id: python tools/style_font.py 63:375"""
import sys, json, re
sys.path.insert(0, 'tools')
from pixso_mcp import call_tool

target = sys.argv[1]
r = call_tool('get_local_styles', {})
s = json.dumps(r)
i = s.find('"node_id\\":\\"' + target + '"')
if i < 0:
    i = s.find(target)
seg = s[max(0, i - 3000):i]
def last(pat):
    m = re.findall(pat, seg)
    return m[-1] if m else None
print('name   :', last(r'\\"name\\":\\"([^\\]+)'))
print('family :', last(r'\\"fontFamily\\":\\"([^\\]+)'))
print('style  :', last(r'\\"fontStyle\\":\\"([^\\]+)'))
print('size   :', last(r'\\"fontSize\\":([\d.]+)'))
print('weight :', last(r'\\"fontWeight\\":(\d+)'))
print('lh     :', last(r'\\"lineHeight\\":\{\\"units\\":\d+,\\"value\\":([\d.]+)\}'))
print('ls     :', last(r'\\"letterSpacing\\":\{\\"units\\":\d+,\\"value\\":([-\d.]+)\}'))
