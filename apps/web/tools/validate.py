#!/usr/bin/env python3
"""一次性验证: 启动 vite dev -> 等待就绪 -> 路由检查 -> Chrome 无头截图 -> 关闭"""
import subprocess
import sys
import time
import urllib.request
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # apps/web
WEB = ROOT
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = os.path.join(ROOT, "..", "..", "docs", "review")
os.makedirs(SHOTS, exist_ok=True)

proc = subprocess.Popen(
    ["npm", "run", "dev", "--", "--port", "7100", "--strictPort"],
    cwd=WEB,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    shell=True,
)
try:
    up = False
    for _ in range(60):
        try:
            urllib.request.urlopen("http://localhost:7100/", timeout=2)
            up = True
            break
        except Exception:
            time.sleep(1)
    if not up:
        print("DEV SERVER FAILED TO START")
        sys.exit(1)
    print("dev server up")

    for route in ["/atlas", "/market", "/interaction", "/workshop", "/me"]:
        r = urllib.request.urlopen(f"http://localhost:7100{route}", timeout=5)
        print(route, r.status)

    shots = [
        ("atlas", "/atlas"),
        ("market", "/market"),
        ("workshop", "/workshop"),
        ("light", "/atlas?theme=light"),
        ("loggedout", "/atlas?loggedOut=1"),
    ]
    for name, route in shots:
        out = os.path.join(SHOTS, f"topmenu-{name}.png")
        subprocess.run(
            [
                CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                "--window-size=1600,900", f"--screenshot={out}",
                f"http://localhost:7100{route}",
            ],
            capture_output=True,
            timeout=60,
        )
        print("shot", name, os.path.getsize(out), "bytes")
finally:
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
    print("dev server stopped")
