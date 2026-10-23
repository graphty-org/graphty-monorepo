#!/usr/bin/env python3
"""Measures every color Graphviz documents (graphviz-vocabulary.json: X11, SVG, Brewer) with Graphviz itself: one
filled node per color, dot -Tjson, the fill Graphviz draws. Writes graphviz-colors.json beside it, which
graph-io/test/formats/dot/color-names.test.ts checks graph-io's color tables against.

    python3 graphviz_colors.py <graphviz bin dir>     (Graphviz 14.1.2: <main checkout>/tmp/style-fidelity/tools/conda-graphviz/bin)

Any Graphviz warning (an unknown color) fails the run.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
binDir = sys.argv[1]
out = os.path.join(HERE, "graphviz-colors.json")
v = json.load(open(os.path.join(HERE, "graphviz-vocabulary.json")))["colorSchemes"]
names = [("x11", n) for n in v["x11"]] + [("svg", n) for n in v["svg"]]
names += [(s, str(i)) for s, k in v["brewer"].items() for i in range(1, k + 1)]
lines = ["digraph g {"]
for i, (s, n) in enumerate(names):
    lines.append(f'n{i} [style=filled fillcolor="/{s}/{n}" label=""]')
lines.append("}")
version = subprocess.run([os.path.join(binDir, "dot"), "-V"], capture_output=True, text=True).stderr.strip()
r = subprocess.run([os.path.join(binDir, "dot"), "-Tjson"], input="\n".join(lines), capture_output=True, text=True)
if r.stderr.strip():
    raise SystemExit(r.stderr)
objs = {o["name"]: o for o in json.loads(r.stdout)["objects"]}
res = {"about": "Every documented Graphviz color as Graphviz draws it (written by graphviz_colors.py)",
       "program": version}
for i, (s, n) in enumerate(names):
    col = [d["color"] for d in objs[f"n{i}"]["_draw_"] if d["op"] == "C"][0]
    res.setdefault(s if s in ("x11", "svg") else "brewer", {})[n if s in ("x11", "svg") else f"{s}/{n}"] = col.lower()
with open(out, "w", encoding="ascii") as f:
    json.dump(res, f, indent=1, sort_keys=True)
    f.write("\n")
print({k: len(x) for k, x in res.items()})
