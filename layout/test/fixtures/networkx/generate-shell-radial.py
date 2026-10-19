#!/usr/bin/env python3
"""NetworkX shell_layout reference positions for test/shell-radial-networkx.test.ts.

The suite never runs Python. Run this once, by hand, from layout/, with NetworkX 2.8.8:

    python3 test/fixtures/networkx/generate-shell-radial.py

It writes shell-radial.json next to itself. Each case records a graph (node count and
edges, nodes 0 .. n - 1), the shells handed to nx.shell_layout (scale 1, centre 0), and
networkx's positions for an explicit rotate and for its default rotate (pi / shells).

- "shell" cases hold shell() to shell_layout with the same nlist.
- "radial" cases hold radial() to shell_layout over the breadth-first rings from the
  root (neighbours in edge order, unreachable nodes on one extra ring), stretched by
  m / (m - 1) for m rings, because radial puts its outermost ring at scale where
  shell_layout puts it at scale (m - 1) / m.
"""
import json
import platform
import sys
from pathlib import Path

import networkx as nx

ROTATE = 0.4


def bfs_rings(n, edges, root):
    G = nx.Graph()
    G.add_nodes_from(range(n))
    G.add_edges_from(edges)
    seen = {root}
    rings = [[root]]
    while True:
        nxt = []
        for u in rings[-1]:
            for v in G.adj[u]:
                if v not in seen:
                    seen.add(v)
                    nxt.append(v)
        if not nxt:
            break
        rings.append(nxt)
    rest = [u for u in range(n) if u not in seen]
    if rest:
        rings.append(rest)
    return rings


def case(kind, name, n, edges, nlist, root=None):
    G = nx.Graph()
    G.add_nodes_from(range(n))
    listed = lambda pos: [list(map(float, pos[u])) for u in range(n)]
    return {
        "kind": kind,
        "name": name,
        "n": n,
        "edges": edges,
        "root": root,
        "nlist": nlist,
        "rotate": ROTATE,
        "positions": listed(nx.shell_layout(G, nlist=nlist, rotate=ROTATE)),
        "defaultRotate": listed(nx.shell_layout(G, nlist=nlist)),
    }


cases = [
    case("shell", "one shell of seven", 7, [], [list(range(7))]),
    case("shell", "centre and two shells", 8, [], [[0], [1, 2, 3], [4, 5, 6, 7]]),
    case("shell", "three shells, no centre", 10, [], [[0, 1], [2, 3, 4], [5, 6, 7, 8, 9]]),
]
# a tree whose edge order differs from node order, plus an isolated node 7
tree = [[0, 4], [0, 2], [2, 5], [0, 1], [1, 6], [4, 3]]
cases.append(case("radial", "tree with an unreachable node", 8, tree, bfs_rings(8, tree, 0), root=0))
# a graph with cycles
cyc = [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 5], [4, 6], [5, 6], [6, 7], [7, 8], [8, 9], [9, 6]]
cases.append(case("radial", "graph with cycles", 10, cyc, bfs_rings(10, cyc, 0), root=0))
cases.append(case("radial", "graph with cycles from node 6", 10, cyc, bfs_rings(10, cyc, 6), root=6))

body = {
    "generator": "layout/test/fixtures/networkx/generate-shell-radial.py",
    "networkx": nx.__version__,
    "python": platform.python_version(),
    "cases": cases,
}
out = Path(__file__).parent / "shell-radial.json"
out.write_text(json.dumps(body) + "\n")
print(out, file=sys.stderr)
