"""GraphML oracle: networkx 3.1 read_graphml.

Returns nodes, edges, directed, a few node ids, labels (when a "label" attribute exists) and edge
weights (when a "weight" attribute exists). Returns None when networkx cannot read the file; such
fixtures carry a hand-written expectation with "oracle": "spec".

networkx quirks this oracle does not copy into an expectation:
- nested graphs are flattened (every node at every level is a node), which matches graph-io's
  parent-column model, so counts agree; hyperedges raise, so those files are "spec";
- edgedefault missing: networkx reads undirected, the spec requires the attribute; graph-io warns
  and falls back to undirected too;
- an edge with directed="true" in an undirected graph is read undirected by networkx (it keeps one
  direction for the whole graph), so mixed-direction files are "spec".
"""
import networkx as nx

MAX_SPOTS = 3


def _num(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def compute(path, fixture):
    try:
        g = nx.read_graphml(path)
    except Exception:  # noqa: BLE001 -- any refusal means "no oracle"
        return None
    out = {
        "outcome": "pass",
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "directed": g.is_directed(),
        "nodeIds": [str(n) for n in list(g.nodes)[:MAX_SPOTS]],
    }
    labels = [str(d["label"]) for _, d in g.nodes(data=True) if "label" in d][:MAX_SPOTS]
    if labels:
        out["labels"] = labels
    checks = []
    for u, v, d in g.edges(data=True):
        if len(checks) >= MAX_SPOTS:
            break
        if g.number_of_edges(u, v) > 1:
            continue  # parallel edges: a (source, target) spot check cannot tell them apart
        w = _num(d.get("weight")) if "weight" in d else None
        if "weight" in d and w is None:
            continue
        check = {"source": str(u), "target": str(v)}
        if w is not None:
            check["weight"] = w
        checks.append(check)
    if checks:
        out["edgeChecks"] = checks
    return out
