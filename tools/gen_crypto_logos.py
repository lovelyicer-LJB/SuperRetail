"""从 tmp_export/logo_*.svg 生成 crypto-logos.tsx（内联矢量，白色填充）。"""
import re
from pathlib import Path

LOGOS = [
    ("63_507", "BtcLogo", "Bitcoin btc"),
    ("63_515", "AvaxLogo", "avalanche avax"),
    ("63_523", "EthLogo", "Ethereum eth"),
    ("63_531", "StxLogo", "stacks"),
    ("63_538", "AdaLogo", "Cardano ada"),
    ("63_542", "NearLogo", "Near protocol"),
]

out = [
    "/**",
    " * 加密货币 logo —— Pixso 实例矢量 1:1 导出（get_export_image imageType:3）",
    " * 节点: BTC 63:507 / AVAX 63:515 / ETH 63:523 / STX 63:531 / ADA 63:538 / NEAR 63:542",
    " * 全部为白色填充（设计值 rgb(255,255,255)），尺寸由调用方按 DSL 实测 % 控制",
    " */",
    "import type { SVGProps } from 'react'",
    "",
]

for key, name, label in LOGOS:
    s = Path(f"tmp_export/logo_{key}.svg").read_text(encoding="utf-8")
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"[^>]*/?>', s)
    out.append(f"/** {label} —— viewBox {vb}，{len(paths)} 条路径 */")
    out.append(f"export function {name}(props: SVGProps<SVGSVGElement>) {{")
    out.append(f'  return (')
    out.append(f'    <svg viewBox="{vb}" fill="none" aria-hidden {{...props}}>')
    for d in paths:
        out.append(f'      <path d="{d}" fill="#fff" fillRule="nonzero" />')
    out.append("    </svg>")
    out.append("  )")
    out.append("}")
    out.append("")

Path("apps/web/src/modules/atlas/components/crypto-logos.tsx").write_text("\n".join(out), encoding="utf-8")
print("written", sum(1 for _ in open('apps/web/src/modules/atlas/components/crypto-logos.tsx', encoding='utf-8')), "lines")
