"""Oracle for the JSON fixtures (called by oracle.py).

- "JSONTestSuite-prefix": the file name prefix is the authority (y_ must accept, n_ must reject,
  i_ implementation-defined). graph-io reads a whole document per import, so a y_ file must never
  be rejected as a syntax error (it may still be refused as "not a graph"), an n_ file must fail
  with E_SYNTAX (E_EMPTY_INPUT for a document with no value at all), and an i_ file may do either.
  A NaN / Infinity literal is the one n_ case the right behaviour accepts leniently (networkx
  writes it), so those files only have to fail, as documents that are not graphs.
- "networkx-3.1": networkx.readwrite.json_graph (node_link with the key the file uses,
  adjacency, cytoscape, tree).
- "python-json-<dialect>": a counter over the parsed document that follows the dialect's spec
  (networkx has no reader for JGF, Cytoscape.js, d3, graphology, vis, sigma).
"""
import json
import math
import os
import re

import networkx as nx
from networkx.readwrite import json_graph

SYNTAX = "E_SYNTAX"
EMPTY = "E_EMPTY_INPUT"


def compute(path, fixture):
    oracle = fixture["oracle"]
    if oracle == "JSONTestSuite-prefix":
        return json_test_suite(path)
    with open(path, "rb") as f:
        doc = json.loads(f.read().decode("utf-8-sig"))
    if oracle == "networkx-3.1":
        return from_networkx(doc)
    counter = COUNTERS.get(oracle)
    return None if counter is None else counter(doc)


def json_test_suite(path):
    name = os.path.basename(path)
    with open(path, "rb") as f:
        raw = f.read()
    if name.startswith("y_"):
        return {"outcome": "any", "forbidCodes": [SYNTAX, EMPTY]}
    if name.startswith("i_"):
        return {"outcome": "any"}
    text = raw.decode("latin-1")
    if text.lstrip("\ufeff\xef\xbb\xbf \t\r\n") == "":
        return {"outcome": "fail", "code": EMPTY}
    if re.fullmatch(r"\s*\[\s*-?(NaN|Infinity)\s*\]\s*", text):
        return {"outcome": "fail"}
    return {"outcome": "fail", "code": SYNTAX}


def plain_id(node_id):
    return isinstance(node_id, (str, int)) and not isinstance(node_id, bool)


def spot_ids(ids, n=5):
    # a tuple id (networkx writes it as a JSON array) is expected under its canonical JSON text
    canon = [json.dumps(list(i), separators=(",", ":")) if isinstance(i, tuple) else i for i in ids]
    return [i for i in canon if plain_id(i)][:n]


def edge_checks(pairs, n=3):
    out = []
    for u, v, w in pairs:
        if not (plain_id(u) and plain_id(v)):
            continue
        check = {"source": u, "target": v}
        if isinstance(w, (int, float)) and not isinstance(w, bool) and math.isfinite(w):
            check["weight"] = w
        out.append(check)
        if len(out) == n:
            break
    return out


def from_networkx(doc):
    if "adjacency" in doc:
        g = json_graph.adjacency_graph(doc)
    elif "elements" in doc:
        g = json_graph.cytoscape_graph(doc)
    elif "children" in doc and "nodes" not in doc:
        g = json_graph.tree_graph(doc)
    else:
        g = json_graph.node_link_graph(doc, link="edges" if "edges" in doc else "links")
    out = {
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "directed": g.is_directed(),
        "nodeIds": spot_ids(list(g.nodes)),
        "edgeChecks": edge_checks((u, v, d.get("weight")) for u, v, d in g.edges(data=True)),
    }
    first = next(iter(g.nodes), None)
    if plain_id(first) and "club" in g.nodes[first]:
        out["nodeAttrs"] = [{"id": first, "column": "club", "value": g.nodes[first]["club"]}]
    return out


def jgf(doc):
    graphs = doc["graphs"] if "graphs" in doc else [doc["graph"]]
    g = graphs[0]
    nodes = g.get("nodes", {})
    items = list(nodes.items()) if isinstance(nodes, dict) else [(n.get("id"), n) for n in nodes]
    edges = g.get("edges", [])
    out = {
        "nodes": len(items),
        "edges": len(edges),
        "directed": g.get("directed", True),
        "nodeIds": spot_ids([i for i, _ in items]),
        "labels": [n["label"] for _, n in items if isinstance(n.get("label"), str)][:3],
        "edgeChecks": edge_checks((e.get("source"), e.get("target"), None) for e in edges),
    }
    if len(graphs) > 1:
        out["graphs"] = len(graphs)
        out["warnings"] = ["W_MULTIPLE_GRAPHS"]
    if g.get("hyperedges"):
        out["warnings"] = out.get("warnings", []) + ["W_HYPEREDGES_SKIPPED"]
    return out


def cytoscape(doc):
    if isinstance(doc, list):
        nodes = [e for e in doc if e.get("group") == "nodes"]
        edges = [e for e in doc if e.get("group") == "edges"]
    else:
        section = doc.get("elements", doc)
        nodes, edges = section.get("nodes", []), section.get("edges", [])
    out = {
        "nodes": len(nodes),
        "edges": len(edges),
        "nodeIds": spot_ids([n["data"]["id"] for n in nodes]),
        "edgeChecks": edge_checks((e["data"]["source"], e["data"]["target"], None) for e in edges),
    }
    positioned = [n for n in nodes if isinstance(n.get("position"), dict)][:2]
    if positioned:
        out["nodeAttrs"] = [
            {"id": n["data"]["id"], "role": "position",
             "value": [n["position"].get(k, 0) for k in ("x", "y", "z")]}
            for n in positioned
        ]
    if isinstance(doc, dict) and isinstance(doc.get("directed"), bool):
        out["directed"] = doc["directed"]
    return out


def d3(doc):
    nodes, links = doc["nodes"], doc["links"]
    key = "id" if any("id" in n for n in nodes) else "name"
    ids = [n[key] for n in nodes]
    by_index = all(isinstance(l["source"], int) for l in links) and not any(isinstance(i, int) for i in ids)
    ends = (lambda x: ids[x]) if by_index else (lambda x: x)
    return {
        "nodes": len(nodes),
        "edges": len(links),
        "nodeIds": spot_ids(ids),
        "edgeChecks": edge_checks((ends(l["source"]), ends(l["target"]), None) for l in links),
    }


def label_checks(pairs, n=3):
    # node-link, graphology, vis and sigma have no label role of their own: the label is a plain
    # "label" column
    return [{"id": i, "column": "label", "value": v} for i, v in pairs if plain_id(i) and isinstance(v, str)][:n]


def xy_checks(pairs, n=2):
    # x / y belong to the position role (sources.md 8.4); graph-io's Cytoscape positions are x, y, z
    return [{"id": i, "role": "position", "value": [x, y, 0]} for i, x, y in pairs][:n]


def graphology(doc):
    nodes, edges = doc["nodes"], doc.get("edges", [])
    kind = doc.get("options", {}).get("type", "mixed")
    attrs = lambda x: x.get("attributes") or {}
    out = {
        "nodes": len(nodes),
        "edges": len(edges),
        "directed": kind != "undirected",
        "nodeIds": spot_ids([n["key"] for n in nodes]),
        "nodeAttrs": label_checks((n["key"], attrs(n).get("label")) for n in nodes),
        "edgeChecks": edge_checks((e["source"], e["target"], attrs(e).get("weight")) for e in edges),
    }
    return out


def vis(doc):
    nodes, edges = doc["nodes"], doc["edges"]
    return {
        "nodes": len(nodes),
        "edges": len(edges),
        "nodeIds": spot_ids([n["id"] for n in nodes]),
        "nodeAttrs": label_checks((n["id"], n.get("label")) for n in nodes)
        + xy_checks((n["id"], n["x"], n["y"]) for n in nodes if "x" in n),
        "edgeChecks": edge_checks((e["from"], e["to"], None) for e in edges),
    }


def sigma(doc):
    nodes, edges = doc["nodes"], doc["edges"]
    return {
        "nodes": len(nodes),
        "edges": len(edges),
        "nodeIds": spot_ids([n["id"] for n in nodes]),
        "nodeAttrs": label_checks((n["id"], n.get("label")) for n in nodes)
        + xy_checks((n["id"], n["x"], n["y"]) for n in nodes if "x" in n),
        "edgeChecks": edge_checks((e["source"], e["target"], None) for e in edges),
    }


COUNTERS = {
    "python-json-jgf": jgf,
    "python-json-cytoscape": cytoscape,
    "python-json-d3": d3,
    "python-json-graphology": graphology,
    "python-json-vis": vis,
    "python-json-sigma": sigma,
}
