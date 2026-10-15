# -*- coding: utf-8 -*-
"""导出 Kimi Work 画板（Canvas + Widget）内容到本仓库 canvases/ 目录。

方式参考 Evoloop 插件：内容以文件形式保存在工作区，再由 git 提交同步到 GitHub。
数据源：blueprint 本地存储（widget.json + workspace/）+ Canvas 布局清单。

用法：python tools/export_canvases.py
"""
import io, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BW = r"C:\Users\Administrator\AppData\Roaming\kimi-desktop\daimon-share\daimon\agents\main\blueprint\widgets"
OUT = os.path.join(ROOT, "canvases")

CANVASES = [
    {
        "canvasId": "canvas_dd5058b5-252f-40ad-b868-d55f3724a0ed",
        "title": "看板入门",
        "purpose": "浏览实时信息看板，安装预设，创建并调整自己的看板。",
        "placements": [
            {"mountId": "mount_18b731c3-a6cf-4bf8-8aa9-70d3ce73962f", "widgetId": "widget_2d70932b-eaba-4569-a0b2-648d8ec9e95c", "layout": {"mode": "grid", "x": 0, "y": 12, "w": 12, "h": 3}, "zOrder": 1},
            {"mountId": "mount_2f429acc-17de-4b67-aef1-9d36975e63a7", "widgetId": "widget_e2cc80a7-f7a0-4078-9950-db6f1783f337", "layout": {"mode": "grid", "x": 0, "y": 22, "w": 12, "h": 8}, "zOrder": 5},
            {"mountId": "mount_5129bbc0-6a63-4f38-bc3d-5f982d31df77", "widgetId": "widget_d422423b-678b-450a-bed7-b441c5503cbe", "layout": {"mode": "grid", "x": 0, "y": 0, "w": 12, "h": 12}, "zOrder": 0},
            {"mountId": "mount_517255fc-c43c-4d38-8070-74f4009a9d85", "widgetId": "widget_d1aa10b7-3071-42fb-b2cf-1c0b4008e855", "layout": {"mode": "grid", "x": 0, "y": 15, "w": 4, "h": 7}, "zOrder": 2},
            {"mountId": "mount_6b853308-18af-411b-aba3-7ece75f68240", "widgetId": "widget_fef10036-e726-41f1-a5e9-579dabbe9d77", "layout": {"mode": "grid", "x": 8, "y": 15, "w": 4, "h": 7}, "zOrder": 4},
            {"mountId": "mount_7525ce3f-1e3e-45fd-b8c2-bdfc4f7613f9", "widgetId": "widget_de516ce8-f974-44bd-8191-856efb8082e8", "layout": {"mode": "grid", "x": 4, "y": 15, "w": 4, "h": 7}, "zOrder": 3},
            {"mountId": "mount_970807c1-02c3-4f7b-8cfe-ffadc21639a6", "widgetId": "widget_9d68a869-1b15-4de1-8c62-34a7568a4842", "layout": {"mode": "grid", "x": 0, "y": 30, "w": 12, "h": 8}, "zOrder": 6},
        ],
    },
    {
        "canvasId": "canvas_7c295802-8b38-427d-a369-2e4cf3811d14",
        "title": "Hello World",
        "purpose": "一块统一蓝黑白画风的 Hello Dashboard 教程。",
        "placements": [
            {"mountId": "mount_071b255b-2507-45bc-9447-499672627308", "widgetId": "widget_0d93ada8-2455-4c26-ae82-86bd296aa9cd", "layout": {"mode": "grid", "x": 0, "y": 45, "w": 12, "h": 7}, "zOrder": 16},
            {"mountId": "mount_1773a793-54e2-4f8b-af00-b80b5ae67014", "widgetId": "widget_fa749192-4bf0-4e70-af58-64644eacbfe0", "layout": {"mode": "grid", "x": 8, "y": 52, "w": 4, "h": 12}, "zOrder": 18},
            {"mountId": "mount_25468bdf-f174-4579-9976-101beba92978", "widgetId": "widget_aaed1dd5-b263-4708-98fb-4d5e847b065f", "layout": {"mode": "grid", "x": 0, "y": 18, "w": 12, "h": 7}, "zOrder": 15},
            {"mountId": "mount_326e2ace-4d82-47b1-bc5a-080037ffe725", "widgetId": "widget_c34933ad-4dda-4fa0-a216-6af5798b46bc", "layout": {"mode": "grid", "x": 4, "y": 52, "w": 4, "h": 12}, "zOrder": 4},
            {"mountId": "mount_35355005-b1f8-4954-bf99-eca65fee58b9", "widgetId": "widget_27b1f197-a414-40cb-9109-f1fa7dc512c0", "layout": {"mode": "grid", "x": 7, "y": 85, "w": 5, "h": 13}, "zOrder": 19},
            {"mountId": "mount_3ee669a3-030a-4300-8424-04e0bc166fa1", "widgetId": "widget_6edea9a5-73fb-4f2b-a310-9a481e6d0419", "layout": {"mode": "grid", "x": 4, "y": 6, "w": 4, "h": 6}, "zOrder": 12},
            {"mountId": "mount_4a5c90e4-14e2-4694-9e5c-6b8104825598", "widgetId": "widget_d1b155d6-1c73-4a58-acbf-44842dc20a78", "layout": {"mode": "grid", "x": 0, "y": 64, "w": 12, "h": 7}, "zOrder": 17},
            {"mountId": "mount_5529afbb-1a33-4a96-9ece-945a5e16d40d", "widgetId": "widget_afae7442-fee3-4521-9e7f-290570dcea11", "layout": {"mode": "grid", "x": 0, "y": 71, "w": 12, "h": 14}, "zOrder": 7},
            {"mountId": "mount_64978a9d-c4b1-478e-b4fd-f1044e49175b", "widgetId": "widget_73cbecbc-331f-4db3-b459-44a81868bf48", "layout": {"mode": "grid", "x": 0, "y": 25, "w": 6, "h": 8}, "zOrder": 8},
            {"mountId": "mount_81b24f33-fe7d-47ef-acbc-b948d068a46c", "widgetId": "widget_9967df81-a612-4f0c-a54a-d5d1431c6896", "layout": {"mode": "grid", "x": 6, "y": 25, "w": 6, "h": 8}, "zOrder": 1},
            {"mountId": "mount_82fee85b-ee41-41e0-85c2-7cc2cbd5ed0a", "widgetId": "widget_64cd6956-21b9-497b-8ff7-636a01efe365", "layout": {"mode": "grid", "x": 0, "y": 6, "w": 4, "h": 6}, "zOrder": 11},
            {"mountId": "mount_96ea0be1-b2ce-4d82-92d7-47bb888b5ff2", "widgetId": "widget_a78b35a4-1cff-4e03-8903-39d83bfa892a", "layout": {"mode": "grid", "x": 0, "y": 85, "w": 7, "h": 13}, "zOrder": 21},
            {"mountId": "mount_9f20853f-b63f-4aca-b54a-aacec123fbfd", "widgetId": "widget_789339a0-a20d-456a-ae39-928719d8c14f", "layout": {"mode": "grid", "x": 0, "y": 0, "w": 12, "h": 6}, "zOrder": 9},
            {"mountId": "mount_b2b42378-d510-4db0-878c-d75e64a53c7a", "widgetId": "widget_89663c89-b09f-4e69-bce3-da64af1946e7", "layout": {"mode": "grid", "x": 0, "y": 12, "w": 12, "h": 6}, "zOrder": 14},
            {"mountId": "mount_bbf596dd-a7ee-48af-b16a-82322518f525", "widgetId": "widget_074f43e7-f106-4641-a51b-574c09b58936", "layout": {"mode": "grid", "x": 0, "y": 98, "w": 12, "h": 11}, "zOrder": 22},
            {"mountId": "mount_d4b00976-d1ce-44f2-9936-50168a60541a", "widgetId": "widget_1e82cc8e-c510-4aa6-94d6-adac585f3d1f", "layout": {"mode": "grid", "x": 0, "y": 33, "w": 12, "h": 12}, "zOrder": 6},
            {"mountId": "mount_d9537526-7b2d-4cc0-8d98-4fe4150c7ce4", "widgetId": "widget_f28a1785-83f8-400e-8307-494a0d707232", "layout": {"mode": "grid", "x": 8, "y": 6, "w": 4, "h": 6}, "zOrder": 13},
            {"mountId": "mount_dde134da-03c3-4869-8141-e7a43d5c9193", "widgetId": "widget_77e5a6e8-9e5b-4f86-a665-a26917b977cc", "layout": {"mode": "grid", "x": 0, "y": 52, "w": 4, "h": 12}, "zOrder": 5},
            {"mountId": "mount_f1452479-f813-4729-8c97-263f5bd94804", "widgetId": "widget_7bf9c221-6e97-4637-95c1-87fca4f1bb85", "layout": {"mode": "grid", "x": 0, "y": 109, "w": 12, "h": 8}, "zOrder": 3},
        ],
    },
]

PLACED = {p["widgetId"] for c in CANVASES for p in c["placements"]}
UNPLACED = [
    {"widgetId": "widget_1c7f02a4-d2f4-4842-b5c7-63bdb7c58aba", "title": "会话接力"},
    {"widgetId": "widget_964df7b3-2583-473f-8554-3bca241fd841", "title": "Kimi"},
    {"widgetId": "widget_379db102-64a8-45be-a761-045a94229e39", "title": "待办卡片 · Milanote"},
]


def widget_title(wid, fallback=""):
    if wid in TITLES:
        return TITLES[wid]
    # 从本地 widget.json 读标题
    p = os.path.join(BW, wid, "widget.json")
    if os.path.isfile(p):
        try:
            with io.open(p, encoding="utf-8") as f:
                return json.load(f).get("title") or fallback
        except Exception:
            pass
    return fallback


TITLES = {
    "widget_9d68a869-1b15-4de1-8c62-34a7568a4842": "随心摆放 组合看板",
    "widget_e2cc80a7-f7a0-4078-9950-db6f1783f337": "让 Kimi 搭建你的专属看板",
    "widget_fef10036-e726-41f1-a5e9-579dabbe9d77": "来点酷的",
    "widget_de516ce8-f974-44bd-8191-856efb8082e8": "个人效率",
    "widget_d1aa10b7-3071-42fb-b2cf-1c0b4008e855": "每日财经",
    "widget_2d70932b-eaba-4569-a0b2-648d8ec9e95c": "搭建你的第一个看板",
    "widget_d422423b-678b-450a-bed7-b441c5503cbe": "关心的事 实时呈现",
    "widget_1c7f02a4-d2f4-4842-b5c7-63bdb7c58aba": "会话接力",
    "widget_964df7b3-2583-473f-8554-3bca241fd841": "Kimi",
    "widget_1e82cc8e-c510-4aa6-94d6-adac585f3d1f": "Kimi Tech Blog",
    "widget_379db102-64a8-45be-a761-045a94229e39": "待办卡片 · Milanote",
    "widget_fa749192-4bf0-4e70-af58-64644eacbfe0": "电脑剩余空间",
    "widget_89663c89-b09f-4e69-bce3-da64af1946e7": "演示 · 点一下运行",
    "widget_7bf9c221-6e97-4637-95c1-87fca4f1bb85": "便签 · 复刻咒语",
    "widget_074f43e7-f106-4641-a51b-574c09b58936": "BEETBOX · 合成器",
    "widget_27b1f197-a414-40cb-9109-f1fa7dc512c0": "历史上的今天",
    "widget_a78b35a4-1cff-4e03-8903-39d83bfa892a": "Kimi Work 介绍",
    "widget_afae7442-fee3-4521-9e7f-290570dcea11": "黑胶唱片机",
    "widget_d1b155d6-1c73-4a58-acbf-44842dc20a78": "导览 · ③ 和外面的世界握手",
    "widget_c34933ad-4dda-4fa0-a216-6af5798b46bc": "番茄钟",
    "widget_77e5a6e8-9e5b-4f86-a665-a26917b977cc": "待办 + 打卡",
    "widget_0d93ada8-2455-4c26-ae82-86bd296aa9cd": "导览 · ② 本地数据，自己管",
    "widget_9967df81-a612-4f0c-a54a-d5d1431c6896": "A股盯盘",
    "widget_73cbecbc-331f-4db3-b459-44a81868bf48": "实时汇率",
    "widget_aaed1dd5-b263-4708-98fb-4d5e847b065f": "导览 · ① 真实信息，运行时刷新",
    "widget_f28a1785-83f8-400e-8307-494a0d707232": "演示 · 点开看",
    "widget_6edea9a5-73fb-4f2b-a310-9a481e6d0419": "演示 · 拉一拉",
    "widget_64cd6956-21b9-497b-8ff7-636a01efe365": "演示 · 拖一拖",
    "widget_789339a0-a20d-456a-ae39-928719d8c14f": "导览 · 你好 Dashboard",
}


def copy_widget(wid, dest_dir):
    src = os.path.join(BW, wid)
    if not os.path.isdir(src):
        print("  !! missing widget dir: " + wid)
        return False
    if os.path.isdir(dest_dir):
        shutil.rmtree(dest_dir)
    shutil.copytree(src, dest_dir)
    return True


def main():
    if not os.path.isdir(BW):
        print("blueprint widgets dir not found: " + BW)
        sys.exit(1)
    os.makedirs(OUT, exist_ok=True)
    manifest = {"generatedBy": "tools/export_canvases.py", "canvases": []}

    for c in CANVASES:
        cdir = os.path.join(OUT, c["title"])
        wdir = os.path.join(cdir, "widgets")
        os.makedirs(wdir, exist_ok=True)
        canvas_doc = {
            "canvasId": c["canvasId"],
            "title": c["title"],
            "purpose": c["purpose"],
            "placements": [],
        }
        for p in c["placements"]:
            wid = p["widgetId"]
            ok = copy_widget(wid, os.path.join(wdir, wid))
            canvas_doc["placements"].append({
                "mountId": p["mountId"],
                "widgetId": wid,
                "title": widget_title(wid),
                "layout": p["layout"],
                "zOrder": p["zOrder"],
                "exported": ok,
            })
        with io.open(os.path.join(cdir, "canvas.json"), "w", encoding="utf-8") as f:
            json.dump(canvas_doc, f, ensure_ascii=False, indent=2)
        manifest["canvases"].append({
            "canvasId": c["canvasId"], "title": c["title"],
            "purpose": c["purpose"], "widgetCount": len(c["placements"]),
            "canvasJson": c["title"] + "/canvas.json",
        })
        print("canvas %-12s -> %d widgets" % (c["title"], len(c["placements"])))

    if UNPLACED:
        udir = os.path.join(OUT, "_unplaced", "widgets")
        os.makedirs(udir, exist_ok=True)
        ulist = []
        for u in UNPLACED:
            ok = copy_widget(u["widgetId"], os.path.join(udir, u["widgetId"]))
            ulist.append({"widgetId": u["widgetId"], "title": u["title"], "exported": ok})
        with io.open(os.path.join(OUT, "_unplaced", "widgets.json"), "w", encoding="utf-8") as f:
            json.dump(ulist, f, ensure_ascii=False, indent=2)
        manifest["unplacedWidgets"] = "_unplaced/widgets.json"
        print("unplaced       -> %d widgets" % len(UNPLACED))

    with io.open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("manifest -> canvases/manifest.json")


if __name__ == "__main__":
    main()
