#!/usr/bin/env python3
"""NetworkX Kamada-Kawai reference layouts for test/kamada-kawai-networkx.test.ts.

The suite never runs Python. Run this once, by hand, from layout/:

    python3 test/fixtures/networkx/generate-kamada-kawai.py

It writes one JSON file per case next to itself: the node order, the edges with the
distance each one asks for, and networkx's own kamada_kawai_layout output (its default
start, scale 1, centre 0, 2D unless the name says 3D). The layout package's port is held
against these up to rotation, reflection and scale, because a Kamada-Kawai cost is
unchanged by all three.

- karate-unweighted: Zachary's karate club, every edge one unit long.
- lesmis-weighted: Les Miserables co-occurrences, each edge 1 / count long -- the
  distance graphty-element hands the solver, and the case where the port used to
  diverge (counts run 1..31, so the first gradient from the circle is large).
- karate-3d: karate in 3D. networkx starts 3D from an unseeded random_layout, so the
  file records ten seeded starts ("runs", each with its "start" and networkx's
  "positions") and the test hands each start to the port as pos.
"""
import json
import platform
import sys
from pathlib import Path

import networkx as nx


def write(name, G, weight, dim=2):
    order = list(G.nodes())
    edges = [[u, v, (d[weight] if weight else 1)] for u, v, d in G.edges(data=True)]
    body = {
        "generator": "layout/test/fixtures/networkx/generate-kamada-kawai.py",
        "networkx": nx.__version__,
        "python": platform.python_version(),
        "nodes": order,
        "edges": edges,
    }
    listed = lambda pos: [list(map(float, pos[n])) for n in order]
    if dim == 2:
        body["positions"] = listed(nx.kamada_kawai_layout(G, weight=weight))
    else:
        starts = [nx.random_layout(G, dim=dim, seed=seed) for seed in range(1, 11)]
        body["runs"] = [
            {"start": listed(s), "positions": listed(nx.kamada_kawai_layout(G, weight=weight, pos=s, dim=dim))}
            for s in starts
        ]
    out = Path(__file__).parent / f"kamada-kawai-{name}.json"
    out.write_text(json.dumps(body) + "\n")
    print(out, file=sys.stderr)


karate = nx.karate_club_graph()
write("karate-unweighted", nx.Graph(karate.edges()), None)
write("karate-3d", nx.Graph(karate.edges()), None, dim=3)

lesmis = nx.les_miserables_graph()
for _, _, d in lesmis.edges(data=True):
    d["distance"] = 1 / d["weight"]
write("lesmis-weighted", lesmis, "distance")
