# -*- coding: utf-8 -*-
"""SuperRetail 画板自动同步：导出画板内容 -> git 提交 -> 推送到 GitHub。

参考 Evoloop 插件的保存/同步方式：内容以文件形式保存在工作区，
变更后自动 commit 并 push 到远程仓库。

用法：python tools/sync_canvases.py
返回码：0 = 已推送或无变更；1 = 失败。
"""
import os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REMOTE = "origin"
BRANCH = "main"


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kw)


def main():
    # 1) 重新导出画板内容
    r = run([sys.executable, os.path.join("tools", "export_canvases.py")])
    if r.returncode != 0:
        print("export failed:\n" + (r.stdout or "") + (r.stderr or ""))
        return 1

    # 2) 有变更才提交
    run(["git", "add", "-A"])
    r = run(["git", "status", "--porcelain"])
    if not r.stdout.strip():
        print("no changes; nothing to commit")
        return 0

    msg = "superretail: 同步画板"
    r = run(["git", "commit", "-m", msg])
    if r.returncode != 0:
        print("commit failed:\n" + (r.stdout or "") + (r.stderr or ""))
        return 1

    # 3) 推送（先拉取合并远程变更，避免非快进拒绝）
    for attempt in range(3):
        r = run(["git", "pull", "--rebase", REMOTE, BRANCH])
        if r.returncode != 0:
            print("pull --rebase failed:\n" + (r.stdout or "") + (r.stderr or ""))
            run(["git", "rebase", "--abort"])
            return 1
        r = run(["git", "push", REMOTE, BRANCH])
        if r.returncode == 0:
            print("pushed: " + msg)
            return 0
        print("push failed (attempt %d), retrying..." % (attempt + 1))
        time.sleep(5)

    print("push failed after retries:\n" + (r.stdout or "") + (r.stderr or ""))
    return 1


if __name__ == "__main__":
    sys.exit(main())
