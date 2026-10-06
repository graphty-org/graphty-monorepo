"""CX2 oracle (called by oracle.py): ndex2 3.12.0, NDEx's own Python client (BSD-3-Clause),
`ndex2.cx2.CX2Network.create_from_raw_cx2`, which resolves aliases, applies defaults and types
values by their declarations.

ndex2 needs networkx 3.4, the other oracles networkx 3.1, so this module runs in its own Python:

    uv venv tmp/cx/venv -p 3.10 && VIRTUAL_ENV=tmp/cx/venv uv pip install ndex2==3.12.0
    tmp/cx/venv/bin/python test/conformance/tools/oracle.py cx2

Positions are expected y-up (graph-io negates Cytoscape's screen y at import), so y is negated
here. ndex2 validates nothing structural and departs from the specification in known ways
(research-cx2.md section 7): such fixtures carry a hand-written "spec" expectation and an
`oracleDisagrees` note, and oracle.py leaves them alone. A file ndex2 cannot read returns None.
"""
import math

try:
    from ndex2.cx2 import CX2Network
except ImportError as err:  # pragma: no cover - the venv above provides it
    raise SystemExit(f"oracle_cx2 needs ndex2 3.12.0 ({err}); see this module's docstring") from err

SPOT_NODES = 3
SPOT_ATTRS = 4


def plain(value):
    """A value as JSON: finite numbers, strings, booleans and lists of them; anything else None."""
    if isinstance(value, bool) or isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return value if math.isfinite(value) else None
    if isinstance(value, list):
        items = [plain(v) for v in value]
        return None if any(i is None for i in items) else items
    return None


def compute(path, fixture):
    net = CX2Network()
    try:
        net.create_from_raw_cx2(path)
    except Exception:  # ndex2 refuses it: the expectation is hand-written
        return None
    nodes = net.get_nodes()
    edges = net.get_edges()
    out = {
        "outcome": "pass",
        "nodes": len(nodes),
        "edges": len(edges),
        "directed": True,
        "nodeIds": list(nodes)[:5],
    }
    names = [n["v"].get("name") for n in nodes.values() if isinstance(n["v"].get("name"), str)]
    if names:
        out["labels"] = names[:5]
    attrs = []
    for node_id, node in list(nodes.items())[:SPOT_NODES]:
        if node.get("x") is not None and node.get("y") is not None:
            y = node["y"]
            attrs.append({"id": node_id, "role": "position", "value": [node["x"], -y if y != 0 else 0, 0]})
        if node.get("z") is not None:
            attrs.append({"id": node_id, "column": "z", "value": node["z"]})
        taken = 0
        for name, value in node["v"].items():
            value = plain(value)
            if value is None or taken >= SPOT_ATTRS:
                continue
            attrs.append({"id": node_id, "column": name, "value": value})
            taken += 1
    for bypass_id, bypass in list(net.get_node_bypasses().items())[:2]:
        for prop, value in list(bypass.items())[:2]:
            if plain(value) is not None and bypass_id in nodes:
                attrs.append({"id": bypass_id, "column": prop, "value": plain(value)})
    if attrs:
        out["nodeAttrs"] = attrs
    pairs = {}
    for edge in edges.values():
        key = (edge["s"], edge["t"])
        pairs[key] = pairs.get(key, 0) + 1
    checks = []
    edge_attrs = []
    for edge in list(edges.values())[:5]:
        if edge["s"] not in nodes or edge["t"] not in nodes:
            continue
        check = {"source": edge["s"], "target": edge["t"]}
        weight = plain(edge["v"].get("weight"))
        if isinstance(weight, (int, float)) and not isinstance(weight, bool) and pairs[(edge["s"], edge["t"])] == 1:
            check["weight"] = weight
        checks.append(check)
        if pairs[(edge["s"], edge["t"])] == 1:
            for name, value in list(edge["v"].items())[:2]:
                if name != "weight" and plain(value) is not None:
                    edge_attrs.append({"source": edge["s"], "target": edge["t"], "column": name, "value": plain(value)})
    if checks:
        out["edgeChecks"] = checks[:3]
    if edge_attrs:
        out["edgeAttrs"] = edge_attrs[:4]
    return out
