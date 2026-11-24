#!/usr/bin/env python3
"""NetworkX bipartite_layout reference positions for the bipartite tests in test/layouts/structural.test.ts.

The suite never runs Python. Run this once, by hand, from layout/, with NetworkX 2.8.8:

    python3 test/fixtures/networkx/generate-bipartite.py

It writes bipartite.json next to itself: per case, the top nodes, the options and networkx's
positions in node-index order. The graph is 7 nodes (edges do not affect the layout).
networkx swaps x and y after adding the centre for align="horizontal", while layout's bipartite
lands the centre where it is asked for, so a horizontal case passes networkx the swapped centre.
"""
import json
import platform
import sys
from pathlib import Path

import networkx as nx

N = 7


def case(name, top, align="vertical", aspect_ratio=4 / 3, scale=1, center=(0, 0)):
    G = nx.Graph()
    G.add_nodes_from(range(N))
    nx_center = center[::-1] if align == "horizontal" else center
    pos = nx.bipartite_layout(G, top, align=align, scale=scale, center=nx_center, aspect_ratio=aspect_ratio)
    return {
        "name": name,
        "top": top,
        "align": align,
        "aspectRatio": aspect_ratio,
        "scale": scale,
        "center": list(center),
        "positions": [list(map(float, pos[u])) for u in range(N)],
    }


cases = [
    case("vertical", [0, 3, 5], scale=2, center=(3, 4)),
    case("horizontal", [0, 3, 5], align="horizontal", aspect_ratio=2, center=(3, 4)),
    case("default", [0, 2, 4, 6]),
    case("one top node", [3]),
]

body = {
    "generator": "layout/test/fixtures/networkx/generate-bipartite.py",
    "networkx": nx.__version__,
    "python": platform.python_version(),
    "cases": cases,
}
out = Path(__file__).parent / "bipartite.json"
out.write_text(json.dumps(body, indent=4) + "\n")
print(out, file=sys.stderr)
