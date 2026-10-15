#!/usr/bin/env python3
"""Minimal MCP client for the Figma Dev Mode MCP Server (http://127.0.0.1:3845/mcp).

Usage:
  python figma_mcp.py list-tools
  python figma_mcp.py call <tool_name> '<json_args>'
"""
import json
import sys
import urllib.request
import urllib.error

MCP_URL = "http://127.0.0.1:3845/mcp"


def _post(payload, session_id=None):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["mcp-session-id"] = session_id
    req = urllib.request.Request(MCP_URL, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {e.code}: {body}")
    sid = resp.headers.get("mcp-session-id", session_id)
    raw = resp.read().decode("utf-8", "replace")
    # Parse SSE: take JSON from data: lines
    results = []
    for line in raw.splitlines():
        if line.startswith("data:"):
            results.append(json.loads(line[5:].strip()))
    if not results and raw.strip():
        results.append(json.loads(raw))
    return results, sid


class FigmaMCP:
    def __init__(self):
        init = {
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "superretail-cli", "version": "1.0"},
            },
        }
        results, self.sid = _post(init)
        note = {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}
        _post(note, self.sid)

    def call(self, method, params=None, _id=2):
        payload = {"jsonrpc": "2.0", "id": _id, "method": method, "params": params or {}}
        results, _ = _post(payload, self.sid)
        return results


def main():
    client = FigmaMCP()
    if len(sys.argv) >= 2 and sys.argv[1] == "list-tools":
        out = client.call("tools/list")
        print(json.dumps(out, ensure_ascii=False, indent=2))
    elif len(sys.argv) >= 3 and sys.argv[1] == "call":
        tool = sys.argv[2]
        args = json.loads(sys.argv[3]) if len(sys.argv) >= 4 else {}
        out = client.call("tools/call", {"name": tool, "arguments": args})
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
