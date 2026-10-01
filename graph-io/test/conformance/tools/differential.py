#!/usr/bin/env python3
"""Differential fixtures: networkx writes, networkx reads back, graph-io must read the same graph.

Usage (from graph-io/):  python3 test/conformance/tools/differential.py

A seeded, deterministic set of graphs from networkx's own generators (path, cycle, star, complete,
G(n, m), Barabasi-Albert, Watts-Strogatz, karate club, Florentine families; multigraph variants
with parallel edges and self-loops) gets random node and edge attributes (floats including 1e-300,
1e300 and -0.0, integers, strings with XML / GML / JSON special characters and non-ASCII text,
booleans; GEXF viz colour, position and size) and is written with networkx 3.1's writers:
write_gml, write_graphml (plain and infer_numeric_types), write_gexf 1.2draft, write_pajek,
node_link_data, cytoscape_data, write_edgelist and write_weighted_edgelist. What networkx reads
back from each file is recorded as the expectation (oracle "networkx-differential"): the node
count, edge count, direction, every node id, labels, every generated attribute of every node and
every non-parallel edge. The Node harness (harness.ts) then checks graph-io reads the same graph.

Where networkx and the specification disagree, the specification wins: the entry's expectation is
the spec's value and `networkxDisagrees` says what networkx does instead and why it is wrong
(set by the variant's writer function below). Where graph-io is wrong, the entry keeps the right expectation and carries a
`knownFailure` marker; markers already in a manifest survive a rerun (matched by file name).

The files go to fixtures/<format>/networkx-generated/ and their manifest entries replace the
format manifest's previous "networkx-differential" entries; every other entry is left alone.
"""
import json
import math
import os
import random
import re
import shutil

import networkx as nx

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(os.path.dirname(HERE), "fixtures")
SUBDIR = "networkx-generated"
ORACLE = "networkx-differential"
SEED = 20260923
FIXED_DATE = "2026-09-23"
CANONICAL_INT = re.compile(r"-?(0|[1-9][0-9]*)")
MAX_ATTR_NODES = 12
MAX_EDGE_CHECKS = 16

# strings every writer must escape; each pool is what the format's networkx writer can carry at all
TEXT_XML = ["plain", "two words", "a&b", "<tag>", 'say "hi"', "it's", "caf\u00e9", "\u4e2d\u6587", "x" * 300, "tab\there"]
TEXT_GML = ["plain", "two words", "a&b", "<tag>", "it's", "caf\u00e9", "\u4e2d\u6587", "x" * 300, "[bracket]", "#hash"]
TEXT_JSON = TEXT_XML + ["back\\slash", "line\nbreak", "\u00a0nbsp", "\U0001f600"]
TEXT_PAJEK = ["plain", "two words", "a&b", "caf\u00e9", "\u4e2d\u6587", "x" * 300, "semi;colon"]
FLOATS = [0.5, -2.25, 1e-300, 1e300, -0.0, 2.0, 3.141592653589793, 1e-7, 123456789.125]


def cid(value):
    """An id as graph-io's canonical rule stores it: a canonical integer text becomes a number."""
    text = str(value)
    return int(text) if CANONICAL_INT.fullmatch(text) and abs(int(text)) < 2**53 else text


def base_graphs(rng):
    """(name, graph) pairs from networkx's generators, seeded."""
    out = [
        ("path", nx.path_graph(6)),
        ("cycle-directed", nx.cycle_graph(7, create_using=nx.DiGraph)),
        ("star", nx.star_graph(8)),
        ("complete", nx.complete_graph(5)),
        ("gnm", nx.gnm_random_graph(12, 20, seed=rng.randrange(2**31))),
        ("gnm-directed", nx.gnm_random_graph(10, 18, seed=rng.randrange(2**31), directed=True)),
        ("barabasi-albert", nx.barabasi_albert_graph(15, 2, seed=rng.randrange(2**31))),
        ("watts-strogatz", nx.watts_strogatz_graph(12, 4, 0.3, seed=rng.randrange(2**31))),
        ("karate", nx.karate_club_graph()),
        ("florentine", nx.florentine_families_graph()),
        ("empty", nx.empty_graph(3)),
        ("isolated-directed", nx.empty_graph(4, create_using=nx.DiGraph)),
    ]
    multi = nx.MultiGraph(nx.path_graph(5))
    multi.add_edges_from([(0, 1), (1, 1), (2, 3), (4, 4)])
    out.append(("multigraph", multi))
    multid = nx.MultiDiGraph(nx.gnm_random_graph(6, 8, seed=rng.randrange(2**31), directed=True))
    multid.add_edges_from([(0, 1), (0, 1), (2, 2), (3, 0)])
    out.append(("multidigraph", multid))
    named = nx.relabel_nodes(nx.cycle_graph(5), {i: f"node {i}" for i in range(5)})
    out.append(("string-ids", named))
    return out


def decorate(g, rng, texts, viz=False, bools=True, weighted=False):
    """A copy of g with random attributes; every node and edge gets a random subset (every edge a
    weight when weighted: write_weighted_edgelist writes a short row for an edge without one)."""
    g = g.copy()
    for n in g.nodes:
        d = g.nodes[n]
        d.clear()  # karate / florentine carry their own attributes; replace them with ours
        if rng.random() < 0.8:
            d["score"] = rng.choice(FLOATS) if rng.random() < 0.5 else round(rng.uniform(-100, 100), 6)
        if rng.random() < 0.7:
            d["rank"] = rng.choice([0, 1, -7, 42, 2**31 - 1, -(2**31)])
        if rng.random() < 0.7:
            d["tag"] = rng.choice(texts)
        if bools and rng.random() < 0.5:
            d["flag"] = rng.random() < 0.5
        if viz:
            d["viz"] = {
                "color": {"r": rng.randrange(256), "g": rng.randrange(256), "b": rng.randrange(256), "a": 1.0},
                "position": {"x": round(rng.uniform(-50, 50), 3), "y": round(rng.uniform(-50, 50), 3), "z": 0.0},
                "size": round(rng.uniform(1, 10), 2),
            }
    edges = g.edges(keys=True, data=True) if g.is_multigraph() else g.edges(data=True)
    for e in edges:
        d = e[-1]
        d.clear()
        if weighted or rng.random() < 0.8:
            d["weight"] = rng.choice(FLOATS[:5] + [1, 3, 10]) if rng.random() < 0.5 else round(rng.uniform(0, 10), 4)
        if rng.random() < 0.5:
            d["rel"] = rng.choice(texts)
        if rng.random() < 0.4:
            d["cap"] = rng.randrange(-5, 1000)
    return g


def plain(value):
    """A JSON-safe expectation value (never NaN / Infinity, which the generator does not produce)."""
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("non-finite value in an expectation")
    return value


def expectation(h, ids, node_attrs, edge_attrs, labels=None):
    """The Expected record of a networkx read-back graph h.

    ids maps each h node to the id graph-io must give it; node_attrs / edge_attrs name the
    attributes to check; labels maps h nodes to the label text, when the format has labels.
    """
    nodes = list(h.nodes)
    out = {
        "outcome": "pass",
        "nodes": h.number_of_nodes(),
        "edges": h.number_of_edges(),
        "directed": h.is_directed(),
        "nodeIds": [ids[n] for n in nodes],
    }
    if labels is not None and nodes:
        out["labels"] = sorted({labels[n] for n in nodes})
    checks = []
    for n in nodes[:MAX_ATTR_NODES]:
        for key in node_attrs:
            if key in h.nodes[n]:
                checks.append({"id": ids[n], "column": key, "value": plain(h.nodes[n][key])})
    if checks:
        out["nodeAttrs"] = checks
    multiplicity = {}
    for u, v in h.edges():
        k = (u, v) if h.is_directed() else tuple(sorted((str(u), str(v))))
        multiplicity[k] = multiplicity.get(k, 0) + 1
    edge_checks, attr_checks = [], []
    for u, v, d in h.edges(data=True):
        if len(edge_checks) >= MAX_EDGE_CHECKS:
            break
        k = (u, v) if h.is_directed() else tuple(sorted((str(u), str(v))))
        if multiplicity[k] > 1:
            continue  # a (source, target) check cannot tell parallel edges apart
        edge_checks.append({"source": ids[u], "target": ids[v]})
        for key in edge_attrs:
            if key in d:
                attr_checks.append({"source": ids[u], "target": ids[v], "column": key, "value": plain(d[key])})
    if edge_checks:
        out["edgeChecks"] = edge_checks
    if attr_checks:
        out["edgeAttrs"] = attr_checks
    return out


NODE_ATTRS = ["score", "rank", "tag", "flag"]
EDGE_ATTRS = ["weight", "rel", "cap"]


def fix_gexf_date(path):
    """write_gexf stamps today's date; pin it so a rerun is byte-identical."""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    text = re.sub(r'lastmodifieddate="[0-9-]+"', f'lastmodifieddate="{FIXED_DATE}"', text)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def write_json(path, data):
    with open(path, "w", encoding="utf-8", newline="") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


# ------------------------------------------------------------------ one writer per variant

def v_gml(g, path):
    nx.write_gml(g, path)
    h = nx.read_gml(path, label="id")
    ids = {n: n for n in h.nodes}
    labels = {n: str(h.nodes[n].get("label", n)) for n in h.nodes}
    return expectation(h, ids, NODE_ATTRS, EDGE_ATTRS, labels), {}


def v_graphml(g, path, infer=False):
    nx.write_graphml_xml(g, path, infer_numeric_types=infer)
    h = nx.read_graphml(path)
    exp = expectation(h, {n: cid(n) for n in h.nodes}, NODE_ATTRS, EDGE_ATTRS)
    extra = {}
    with open(path, encoding="utf-8") as f:
        edge_ids = re.findall(r'<edge [^>]*\bid="([^"]*)"', f.read())
    if len(edge_ids) != len(set(edge_ids)):
        # networkx writes each multigraph edge KEY as the GraphML edge id, so "0" repeats across
        # node pairs; the GraphML spec (and the XSD's key constraint) wants edge ids unique in the
        # document. graph-io reports each repeat as E_DUPLICATE_EDGE_ID and skips that edge, as
        # its rule for a hard element error says; the expectation keeps the nodes and that report
        for key in ("edges", "edgeChecks", "edgeAttrs"):
            exp.pop(key, None)
        exp["code"] = "E_DUPLICATE_EDGE_ID"
        extra["networkxDisagrees"] = (
            "networkx writes multigraph edge keys as GraphML edge ids, which repeat across node pairs; GraphML "
            "requires edge ids unique within the document, so networkx's read-back (every edge kept) is not the "
            "expectation: graph-io reports E_DUPLICATE_EDGE_ID for each repeat"
        )
    if any(" " in str(n) for n in g.nodes):
        extra["roundTripFailure"] = (
            'a node id with spaces is not an NMTOKEN, so export refuses it without sanitizeIds "mangle" (sources.md 2.1)'
        )
    return exp, extra


def v_gexf(g, path):
    nx.write_gexf(g, path, version="1.2draft")
    fix_gexf_date(path)
    h = nx.read_gexf(path)
    labels = {n: str(h.nodes[n].get("label", n)) for n in h.nodes}
    exp = expectation(h, {n: cid(n) for n in h.nodes}, NODE_ATTRS, EDGE_ATTRS, labels)
    viz = []
    for n in list(h.nodes)[:MAX_ATTR_NODES]:
        v = h.nodes[n].get("viz")
        if v is None:
            continue
        # graph-io's viz roles: position f32 x3, color f32 x4 rgba in 0..1, size f32
        p = v["position"]
        viz.append({"id": cid(n), "role": "position", "value": [p["x"], p["y"], p.get("z", 0.0)]})
        c = v["color"]
        viz.append({"id": cid(n), "role": "color", "value": [c["r"] / 255, c["g"] / 255, c["b"] / 255, c.get("a", 1.0)]})
        viz.append({"id": cid(n), "role": "size", "value": v["size"]})
    if viz:
        exp["nodeAttrs"] = exp.get("nodeAttrs", []) + viz
    return exp, {}


def v_pajek(g, path):
    # write_pajek writes string attributes only; the vertex numbers are 1..n in node order
    nx.write_pajek(g, path)
    h = nx.read_pajek(path)
    order = {n: i + 1 for i, n in enumerate(h.nodes)}
    labels = {n: str(n) for n in h.nodes}
    return expectation(h, order, ["tag"], ["weight", "rel"], labels), {}


def v_node_link(g, path):
    data = nx.node_link_data(g)
    write_json(path, data)
    with open(path, encoding="utf-8") as f:
        h = nx.node_link_graph(json.load(f))
    return expectation(h, {n: n for n in h.nodes}, NODE_ATTRS, EDGE_ATTRS), {}


def v_cytoscape(g, path):
    data = nx.cytoscape_data(g)
    write_json(path, data)
    with open(path, encoding="utf-8") as f:
        h = nx.cytoscape_graph(json.load(f))
    # Cytoscape.js keys an element by data.id, always a string; networkx writes str(node) there
    # but keys its read-back by data.value (the original Python key) and writes the edge ends as
    # the original keys too. The spec's id is data.id, so the expected ids are the strings.
    exp = expectation(h, {n: str(n) for n in h.nodes}, NODE_ATTRS, EDGE_ATTRS)
    # Cytoscape.js elements JSON has no graph direction: the top-level "directed" key is networkx's
    # own addition, and graph-io reads Cytoscape with its documented dialect default; the spec is
    # silent, so direction is not asserted
    del exp["directed"]
    extra = {
        "networkxDisagrees": (
            "networkx keys its read-back nodes by data.value and writes edge ends as the original Python keys, "
            "while Cytoscape.js ids are the data.id strings (Cytoscape.js turns a numeric id, source or target "
            "into its string); the top-level `directed` key is a networkx extension the elements JSON does not "
            "define, so direction is not asserted"
        )
    }
    if h.number_of_edges() > 0 and not all(isinstance(n, str) for n in g.nodes):
        extra["knownFailure"] = (
            "json cytoscape: a numeric source / target is not read as the string id Cytoscape.js makes of it, so "
            'the edge ends 0, 1 of a networkx cytoscape_data file become new nodes next to the declared "0", "1" '
            "(every node doubled)"
        )
    return exp, extra


def v_edgelist(g, path, weighted=False):
    if weighted:
        nx.write_weighted_edgelist(g, path)
        h = nx.read_weighted_edgelist(path, create_using=nx.MultiDiGraph if g.is_multigraph() else nx.DiGraph)
    else:
        nx.write_edgelist(g, path, data=False)
        h = nx.read_edgelist(path, create_using=nx.MultiDiGraph if g.is_multigraph() else nx.DiGraph)
    # an edge list carries no direction; graph-io's CSV default is directed, so read it directed
    return expectation(h, {n: cid(n) for n in h.nodes}, [], ["weight"] if weighted else []), {}


# (format dir, variant name, extension, writer, text pool, needs weights, viz)
VARIANTS = [
    ("gml", "gml", "gml", v_gml, TEXT_GML),
    ("graphml", "graphml", "graphml", v_graphml, TEXT_XML),
    ("graphml", "graphml-infer", "graphml", lambda g, p: v_graphml(g, p, infer=True), TEXT_XML),
    ("gexf", "gexf", "gexf", v_gexf, TEXT_XML),
    ("pajek", "pajek", "net", v_pajek, TEXT_PAJEK),
    ("json", "node-link", "json", v_node_link, TEXT_JSON),
    ("json", "cytoscape", "json", v_cytoscape, TEXT_JSON),
    ("csv", "edgelist", "edgelist", v_edgelist, TEXT_XML),
    ("csv", "weighted-edgelist", "edgelist", lambda g, p: v_edgelist(g, p, weighted=True), TEXT_XML),
]

ORIGIN = "generated by test/conformance/tools/differential.py with networkx 3.1 (seed %d)" % SEED


def load_manifest(fmt):
    with open(os.path.join(FIXTURES, fmt, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


def save_manifest(fmt, manifest):
    with open(os.path.join(FIXTURES, fmt, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=True)
        f.write("\n")


def main():
    rng = random.Random(SEED)
    graphs = base_graphs(rng)
    entries = {}
    for fmt in sorted({v[0] for v in VARIANTS}):
        out_dir = os.path.join(FIXTURES, fmt, SUBDIR)
        shutil.rmtree(out_dir, ignore_errors=True)
        os.makedirs(out_dir)
        entries[fmt] = []
    for fmt, variant, ext, writer, texts in VARIANTS:
        for gname, base in graphs:
            for rep in range(2):
                vrng = random.Random(f"{SEED}/{variant}/{gname}/{rep}")
                viz = fmt == "gexf" and rep == 1
                # bools: GML writes them as 1 / 0 and pajek not at all; keep them where they are typed
                g = decorate(base, vrng, texts, viz=viz, bools=fmt not in ("pajek",), weighted=variant == "weighted-edgelist")
                if fmt == "csv" and (rep == 1 or gname == "string-ids" or g.number_of_edges() == 0):
                    # an edge list holds no attributes (one file per graph), no ids with spaces, and
                    # a graph without edges is an empty file, which graph-io refuses as E_EMPTY_INPUT
                    continue
                name = f"{variant}-{gname}-{rep}.{ext}"
                rel = f"{SUBDIR}/{name}"
                path = os.path.join(FIXTURES, fmt, rel)
                try:
                    expected, extra = writer(g, path)
                except Exception as err:  # noqa: BLE001 -- networkx cannot write or read its own file
                    if os.path.exists(path):
                        os.remove(path)
                    print(f"skip {fmt}/{rel}: networkx {type(err).__name__}: {err}")
                    continue
                entry = {
                    "file": rel,
                    "origin": ORIGIN,
                    "license": "BSD-3-Clause (networkx); generated data",
                    "version": "networkx 3.1",
                    "exercises": f"networkx {variant} writer on {gname} ({'multi' if g.is_multigraph() else 'simple'}, "
                    f"{'directed' if g.is_directed() else 'undirected'}, {g.number_of_nodes()} nodes, "
                    f"{g.number_of_edges()} edges) with random attributes{' and viz' if viz else ''}",
                    "oracle": ORACLE,
                    "expected": expected,
                }
                entry.update(extra)
                entries[fmt].append(entry)
    total = 0
    for fmt, new in entries.items():
        manifest = load_manifest(fmt)
        kept = [f for f in manifest["fixtures"] if f.get("oracle") != ORACLE]
        old = {f["file"]: f for f in manifest["fixtures"] if f.get("oracle") == ORACLE}
        for entry in new:
            for key in ("knownFailure", "roundTripFailure"):
                if key in old.get(entry["file"], {}):
                    entry[key] = old[entry["file"]][key]
        manifest["fixtures"] = kept + new
        save_manifest(fmt, manifest)
        total += len(new)
        print(f"{fmt}: {len(new)} networkx-generated fixtures")
    print(f"total {total}")


if __name__ == "__main__":
    main()
