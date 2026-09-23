"""GEXF oracles.

"networkx-3.1": networkx read_gexf. Quirks accounted for:
- read_gexf(relabel=False) keys nodes by the GEXF id (a string); the label is the "label" attribute.
- networkx 3.1 knows only the 1.1draft and 1.2draft namespaces (1.0 and 1.3 files raise), rejects
  mixed-direction files and invents nodes for edges to undeclared ids, so those fixtures use the
  structural oracle below instead.
- A file with parallel edges comes back as a MultiGraph / MultiDiGraph, so number_of_edges()
  counts every edge.

Ids are written the way graph-io's canonical id rule stores them (design 4.1): a canonical
integer text such as "7" becomes the number 7, "07" and "a" stay strings.

"gexf-structure": the specification applied with Python's ElementTree, independent of networkx:
every <node> element (nested ones included, duplicates once) is a node; every <edge> whose two
endpoints are declared nodes is an edge (the spec has no implicit nodes); the graph is directed
when defaultedgetype is "directed" or any edge's own type differs from the default (a mixed graph
is stored directed, its undirected edges expanded); defaultedgetype defaults to "undirected".
Bytes are decoded the way the owner's encoding rule says: BOM, else the XML declaration, else
UTF-8, else windows-1252 -- the fixture's "encoding" option wins over all of them.
"""
import codecs
import re
import xml.etree.ElementTree as ET

import networkx as nx

CANONICAL_INT = re.compile(r"-?(0|[1-9][0-9]*)")


def cid(value):
    """An id as graph-io's canonical rule stores it: a canonical integer text becomes a number."""
    text = str(value)
    return int(text) if CANONICAL_INT.fullmatch(text) and abs(int(text)) < 2**53 else text


def edge_checks(pairs):
    """Up to two edge checks; the weight is only checked when the pair is not a parallel edge."""
    counts = {}
    key = lambda u, v: tuple(sorted((str(u), str(v))))  # either orientation: conservative
    for u, v, _ in pairs:
        counts[key(u, v)] = counts.get(key(u, v), 0) + 1
    checks = []
    for u, v, w in pairs[:2]:
        check = {"source": cid(u), "target": cid(v)}
        if w is not None and counts[key(u, v)] == 1:
            check["weight"] = w
        checks.append(check)
    return checks


def local(tag):
    return tag.rsplit("}", 1)[-1].rsplit(":", 1)[-1]


def decode(data, fixture):
    forced = (fixture.get("options") or {}).get("encoding")
    if forced:
        return data.decode(forced)
    for bom, enc in ((codecs.BOM_UTF8, "utf-8"), (codecs.BOM_UTF16_LE, "utf-16-le"), (codecs.BOM_UTF16_BE, "utf-16-be")):
        if data.startswith(bom):
            return data[len(bom):].decode(enc)
    m = re.match(rb'<\?xml[^>]*encoding=["\']([A-Za-z0-9._-]+)', data)
    if m:
        return data.decode(m.group(1).decode())
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252")


def structure(path, fixture):
    with open(path, "rb") as f:
        text = decode(f.read(), fixture)
    text = re.sub(r"^\s*<\?xml[^>]*\?>", "", text)
    root = ET.fromstring(text)
    graph = next((e for e in root.iter() if local(e.tag) == "graph"), None)
    if graph is None:
        return None
    default = graph.get("defaultedgetype", "undirected")
    ids, labels = [], {}
    for e in graph.iter():
        if local(e.tag) == "node" and e.get("id") is not None and e.get("id") not in labels:
            ids.append(e.get("id"))
            labels[e.get("id")] = e.get("label")
    edges = [e for e in graph.iter() if local(e.tag) == "edge"]
    kept = [e for e in edges if e.get("source") in labels and e.get("target") in labels]
    directed = default == "directed" or any(e.get("type", default) != default for e in kept)
    out = {"outcome": "pass", "nodes": len(ids), "edges": len(kept), "directed": directed, "nodeIds": [cid(i) for i in ids[:3]]}
    shown = [labels[i] for i in ids[:3] if labels[i] is not None]
    if shown:
        out["labels"] = shown
    pairs = []
    for e in kept:
        w = e.get("weight")
        pairs.append((e.get("source"), e.get("target"), float(w) if w and re.fullmatch(r"-?[0-9.eE+-]+", w) else None))
    out["edgeChecks"] = edge_checks(pairs)
    return out


def networkx(path):
    g = nx.read_gexf(path)
    nodes = list(g.nodes(data=True))
    out = {
        "outcome": "pass",
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "directed": g.is_directed(),
        "nodeIds": [cid(n) for n, _ in nodes[:3]],
    }
    labels = [d["label"] for _, d in nodes[:3] if isinstance(d.get("label"), str)]
    if labels:
        out["labels"] = labels
    pairs = [
        (u, v, float(d["weight"]) if isinstance(d.get("weight"), (int, float)) else None)
        for u, v, d in g.edges(data=True)
    ]
    out["edgeChecks"] = edge_checks(pairs)
    return out


def compute(path, fixture):
    if fixture["oracle"] == "gexf-structure":
        return structure(path, fixture)
    return networkx(path)
