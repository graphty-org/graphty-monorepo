"""CSV oracle for tools/oracle.py: Python's csv module (and networkx 3.1 for the networkx
edge-list dialects) read the fixture as described by its "oracleHints"; every record with two
non-blank endpoints is an edge, the endpoints (after the canonical id rule) are the nodes.

oracleHints keys: mode ("csv" default, "whitespace", "nx-edgelist", "nx-weighted", "nx-adjlist"), encoding
(a Python codec, default "utf-8-sig"), delimiter (default ","), header (default true), comment
(a line prefix dropped anywhere, default none), source / target (column index or header name,
default 0 / 1), weight (index, name or null), directed (default true: the CSV importer's
documented default when the file says nothing).
"""
import csv
import io
import re

CANONICAL = re.compile(r"^-?(0|[1-9][0-9]*)$")


def canonical(text):
    if text != "-0" and CANONICAL.match(text) and abs(int(text)) <= 2**53 - 1:
        return int(text)
    return text


def records(text, hints):
    comment = hints.get("comment")
    lines = text.splitlines(keepends=True)
    if comment:
        lines = [l for l in lines if not l.startswith(comment)]
    mode = hints.get("mode", "csv")
    if mode == "whitespace":
        return [l.split() for l in lines if l.strip()]
    rows = csv.reader(io.StringIO("".join(lines), newline=""), delimiter=hints.get("delimiter", ","))
    return [r for r in rows if r != []]


def column(ref, header):
    return header.index(ref) if isinstance(ref, str) else ref


def networkx_edges(path, hints):
    import networkx as nx

    reader = {"nx-adjlist": nx.read_adjlist, "nx-weighted": nx.read_weighted_edgelist}.get(hints["mode"], nx.read_edgelist)
    g = reader(path, create_using=nx.MultiDiGraph, nodetype=str)
    edges = [(canonical(u), canonical(v), d.get("weight")) for u, v, d in g.edges(data=True)]
    return [canonical(n) for n in g.nodes()], edges


def compute(path, fixture):
    hints = fixture.get("oracleHints", {})
    if hints.get("mode", "csv").startswith("nx-"):
        nodes, edges = networkx_edges(path, hints)
    else:
        with open(path, encoding=hints.get("encoding", "utf-8-sig"), newline="") as f:
            rows = records(f.read(), hints)
        header = rows.pop(0) if hints.get("header", True) else []
        s = column(hints.get("source", 0), header)
        t = column(hints.get("target", 1), header)
        w = hints.get("weight")
        w = None if w is None else column(w, header)
        nodes, edges = [], []
        for r in rows:
            if len(r) <= max(s, t) or r[s] == "" or r[t] == "":
                continue
            u, v = canonical(r[s]), canonical(r[t])
            weight = float(r[w]) if w is not None and w < len(r) and r[w] != "" else None
            edges.append((u, v, weight))
            for n in (u, v):
                if n not in nodes:
                    nodes.append(n)
    pairs = [(u, v) for u, v, _ in edges]
    checks = []
    for u, v, weight in edges:
        if pairs.count((u, v)) + pairs.count((v, u)) == 1 and len(checks) < 3:
            check = {"source": u, "target": v}
            if weight is not None:
                check["weight"] = weight
            checks.append(check)
    return {
        "outcome": "pass",
        "nodes": len(set(nodes)),
        "edges": len(edges),
        "directed": hints.get("directed", True),
        "nodeIds": list(dict.fromkeys(nodes))[:3],
        "edgeChecks": checks,
    }


if __name__ == "__main__":
    assert canonical("01") == "01" and canonical("1") == 1 and canonical("-0") == "-0"
    assert records("# c\na b\n", {"mode": "whitespace", "comment": "#"}) == [["a", "b"]]
    print("ok")
