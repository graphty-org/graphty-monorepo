"""CX version 1 oracle (called by oracle.py): ndex2 3.12.0, NDEx's own Python client
(BSD-3-Clause), `ndex2.create_nice_cx_from_raw_cx`, read as its NiceCX model and typed here by the
CX data-type table with Cytoscape's value rule ("" and "null" are unset, "NaN" is NaN in a double):
ndex2 itself leaves every value as written.

ndex2 needs networkx 3.4, the other oracles networkx 3.1, so this module runs in its own Python:

    uv venv tmp/cx/venv -p 3.10 && VIRTUAL_ENV=tmp/cx/venv uv pip install ndex2==3.12.0
    tmp/cx/venv/bin/python test/conformance/tools/oracle.py cx

NiceCX is the root network: it does not split a collection into its subnetworks and reads only the
aspects metaData names, so collections, files whose metaData leaves an aspect out, duplicate ids,
dangling edges and failed statuses carry hand-written "spec" expectations instead (research-cx.md
section 7.3). Positions are expected y-up (graph-io negates Cytoscape's screen y).
"""
import math
import re

try:
    import ndex2
except ImportError as err:  # pragma: no cover - the venv above provides it
    raise SystemExit(f"oracle_cx needs ndex2 3.12.0 ({err}); see this module's docstring") from err

import json

SPOT_NODES = 3
SPOT_ATTRS = 4
DECIMAL = re.compile(r"^-?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$")


def typed(value, d):
    """A CX attribute value typed by its d, or None when it is unset or does not parse."""
    if value is None:
        return None
    d = d or "string"
    if d.startswith("list_of_"):
        if not isinstance(value, list):
            return None
        items = [typed(v, d[len("list_of_"):]) for v in value]
        return None if any(i is None for i in items) else items
    if isinstance(value, list):
        return None
    if d == "string":
        return value if isinstance(value, str) else str(value)
    if isinstance(value, bool):
        return value if d == "boolean" else None
    if isinstance(value, (int, float)):
        return value if d in ("double", "float", "integer", "long") else None
    if value == "" or value.lower() == "null":
        return None
    if d == "boolean":
        return {"true": True, "false": False}.get(value.lower())
    if d in ("integer", "long"):
        return int(value) if re.fullmatch(r"-?[0-9]+", value) else None
    if d in ("double", "float"):
        if not DECIMAL.match(value):
            return None
        number = float(value)
        return number if math.isfinite(number) else None
    return None


def compute(path, fixture):
    with open(path, "rb") as f:
        raw = json.loads(f.read().decode("utf-8-sig"))
    try:
        nice = ndex2.create_nice_cx_from_raw_cx(raw)
    except Exception:  # ndex2 refuses it: the expectation is hand-written
        return None
    nodes = nice.nodes
    edges = nice.edges
    out = {
        "outcome": "pass",
        "nodes": len(nodes),
        "edges": len(edges),
        "directed": True,
        "nodeIds": list(nodes)[:5],
    }
    names = [n["n"] for n in nodes.values() if isinstance(n.get("n"), str)]
    if names:
        out["labels"] = names[:5]
    attrs = []
    layout = layout_of(nice)
    for node_id in list(nodes)[:SPOT_NODES]:
        if node_id in layout:
            x, y = layout[node_id]
            attrs.append({"id": node_id, "role": "position", "value": [x, -y if y != 0 else 0, 0]})
        seen = set()
        for element in nice.nodeAttributes.get(node_id, []):
            name = element.get("n")
            if name in seen or name in ("name", "represents") or len(seen) >= SPOT_ATTRS or "s" in element:
                continue
            value = typed(element.get("v"), element.get("d"))
            if value is not None:
                seen.add(name)
                attrs.append({"id": node_id, "column": name, "value": value})
    if attrs:
        out["nodeAttrs"] = attrs
    pairs = {}
    for edge in edges.values():
        pairs[(edge["s"], edge["t"])] = pairs.get((edge["s"], edge["t"]), 0) + 1
    checks = []
    for edge in list(edges.values())[:3]:
        if edge["s"] in nodes and edge["t"] in nodes:
            checks.append({"source": edge["s"], "target": edge["t"]})
    if checks:
        out["edgeChecks"] = checks
    edge_attrs = []
    for edge_id, edge in list(edges.items())[:5]:
        if pairs[(edge["s"], edge["t"])] != 1 or edge["s"] not in nodes or edge["t"] not in nodes:
            continue
        if isinstance(edge.get("i"), str):
            edge_attrs.append({"source": edge["s"], "target": edge["t"], "column": "interaction", "value": edge["i"]})
        for element in nice.edgeAttributes.get(edge_id, [])[:2]:
            value = typed(element.get("v"), element.get("d"))
            if value is not None and "s" not in element and element.get("n") not in ("weight", "interaction"):
                edge_attrs.append({"source": edge["s"], "target": edge["t"], "column": element["n"], "value": value})
    if edge_attrs:
        out["edgeAttrs"] = edge_attrs[:4]
    return out


def layout_of(nice):
    """node id -> (x, y) of the first view (the entries without a view when there is none)."""
    entries = nice.opaqueAspects.get("cartesianLayout") or []
    views = []
    for relation in nice.opaqueAspects.get("cyNetworkRelations") or []:
        if relation.get("r") == "view" and relation.get("c") not in views:
            views.append(relation.get("c"))
    for view in nice.opaqueAspects.get("cyViews") or []:
        if view.get("@id") not in views:
            views.append(view.get("@id"))
    if not views:
        for entry in entries:
            if "view" in entry and entry["view"] not in views:
                views.append(entry["view"])
    first = views[0] if views else None
    out = {}
    for entry in entries:
        view = entry.get("view")
        if view is not None and view != first:
            continue
        x, y = entry.get("x"), entry.get("y")
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            out[entry.get("node")] = (x, y)
    return out
