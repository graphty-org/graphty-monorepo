"""GML oracle: networkx 3.1 read_gml(path, label="id"), so node ids match graph-io's id-keyed default.

A file whose duplicate edges networkx refuses without `multigraph 1` is re-read with that line
added (graph-io keeps parallel edges whatever the flag says). Returns None when networkx cannot
read the file at all; such fixtures carry a hand-written "spec" expectation instead.
"""
import re

import networkx as nx


def _read(path):
    try:
        return nx.read_gml(path, label="id")
    except nx.NetworkXError as err:
        if "duplicated" not in str(err):
            raise
    with open(path, "rb") as f:
        text = f.read().decode("ascii")
    patched = re.sub(r"\bgraph\s*\[", "graph [\n  multigraph 1\n", text, count=1)
    return nx.parse_gml(patched, label="id")


def compute(path, fixture):
    try:
        g = _read(path)
    except Exception:  # networkx cannot read it: the expectation is hand-written
        return None
    nodes = list(g.nodes(data=True))
    out = {
        "outcome": "pass",
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "directed": g.is_directed(),
        "nodeIds": [n for n, _ in nodes[:3]],
    }
    labels = [str(d["label"]) for _, d in nodes[:3] if "label" in d]
    if labels:
        out["labels"] = labels
    checks = []
    for e in list(g.edges(data=True))[:3]:
        check = {"source": e[0], "target": e[1]}
        # graph-io's GML weight key is "value" (weightFrom default)
        if isinstance(e[2].get("value"), (int, float)):
            check["weight"] = e[2]["value"]
        checks.append(check)
    if checks:
        out["edgeChecks"] = checks
    return out
