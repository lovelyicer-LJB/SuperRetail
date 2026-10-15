"""Minimal Pixso MCP client: call a tool on the local Pixso MCP server.

Usage:
  python tools/pixso_mcp.py list
  python tools/pixso_mcp.py call <tool_name> '<json_args>'
"""
import json
import sys
import urllib.request

URL = "http://127.0.0.1:3667/mcp"


def _post(payload, session_id=None):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["mcp-session-id"] = session_id
    req = urllib.request.Request(URL, data=json.dumps(payload).encode("utf-8"), headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp:
        sid = resp.headers.get("mcp-session-id", session_id)
        body = resp.read().decode("utf-8")
    # SSE framed: lines starting with "data: "
    result = None
    for line in body.splitlines():
        if line.startswith("data:"):
            result = json.loads(line[5:].strip())
    if result is None and body.strip():
        result = json.loads(body)
    return result, sid


def _session():
    init = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "kimi-work", "version": "1.0"},
        },
    }
    _, sid = _post(init)
    _post({"jsonrpc": "2.0", "method": "notifications/initialized"}, sid)
    return sid


def call_tool(tool, args=None):
    """Call a Pixso MCP tool, return the result dict (has 'content')."""
    sid = _session()
    result, _ = _post(
        {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
         "params": {"name": tool, "arguments": args or {}}},
        sid,
    )
    return result.get("result", result)


def main():
    init = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "kimi-work", "version": "1.0"},
        },
    }
    _, sid = _post(init)
    _post({"jsonrpc": "2.0", "method": "notifications/initialized"}, sid)

    if sys.argv[1] == "list":
        result, _ = _post({"jsonrpc": "2.0", "id": 2, "method": "tools/list"}, sid)
    else:
        tool = sys.argv[2]
        args = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        result, _ = _post(
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
             "params": {"name": tool, "arguments": args}},
            sid,
        )
    print(json.dumps(result, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
