#!/usr/bin/env python3
"""NetworkX Kamada-Kawai reference layouts for test/kamada-kawai-networkx.test.ts.

The suite never runs Python. Run this once, by hand, from layout/:

    python3 test/fixtures/networkx/generate-kamada-kawai.py

It writes one JSON file per case next to itself: the node order, the edges with the
distance each one asks for, and networkx's own kamada_kawai_layout output (circular
start, scale 1, centre 0, 2D). The layout package's port is held against these up to
rotation, reflection and scale, because a Kamada-Kawai cost is unchanged by all three.

- karate-unweighted: Zachary's karate club, every edge one unit long.
- lesmis-weighted: Les Miserables co-occurrences, each edge 1 / count long -- the
  distance graphty-element hands the solver, and the case where the port used to
  diverge (counts run 1..31, so the first gradient from the circle is large).
"""
import json
import platform
import sys
from pathlib import Path

import networkx as nx


def write(name, G, weight):
    order = list(G.nodes())
    pos = nx.kamada_kawai_layout(G, weight=weight)
    edges = [[u, v, (d[weight] if weight else 1)] for u, v, d in G.edges(data=True)]
    body = {
        "generator": "layout/test/fixtures/networkx/generate-kamada-kawai.py",
        "networkx": nx.__version__,
        "python": platform.python_version(),
        "nodes": order,
        "edges": edges,
        "positions": [list(map(float, pos[n])) for n in order],
    }
    out = Path(__file__).parent / f"kamada-kawai-{name}.json"
    out.write_text(json.dumps(body) + "\n")
    print(out, file=sys.stderr)


karate = nx.karate_club_graph()
write("karate-unweighted", nx.Graph(karate.edges()), None)

lesmis = nx.les_miserables_graph()
for _, _, d in lesmis.edges(data=True):
    d["distance"] = 1 / d["weight"]
write("lesmis-weighted", lesmis, "distance")
