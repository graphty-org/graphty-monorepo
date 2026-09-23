#!/usr/bin/env python3
"""Regenerate the oracle-derived expectations of the conformance manifests.

Usage (from graph-io/):  python3 test/conformance/tools/oracle.py [format ...]

For every fixture of fixtures/<format>/manifest.json whose "oracle" is not "spec" (hand-written
from the specification), the module oracle_<format>.py next to this script is asked for the
expected values: compute(path, fixture) returns a dict of Expected fields ("outcome", "nodes",
"edges", "directed", "nodeIds", "labels", "nodeAttrs", "edgeChecks", "graphs", ...) or None to
leave the fixture alone. The returned keys replace the ones in "expected"; every other key
(hand-written warnings, codes, knownFailure markers) is kept. The manifest is rewritten in place.

Oracles: networkx 3.1 (GML, GraphML, GEXF, Pajek, node-link JSON), Graphviz 2.43 gvpr (DOT),
Python's json and csv modules (JSON layer, CSV).
"""
import importlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(os.path.dirname(HERE), "fixtures")
sys.path.insert(0, HERE)


def regenerate(fmt):
    manifest_path = os.path.join(FIXTURES, fmt, "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    try:
        oracle = importlib.import_module("oracle_" + fmt)
    except ModuleNotFoundError:
        print(f"{fmt}: no oracle module, skipped")
        return
    changed = 0
    for fixture in manifest["fixtures"]:
        if fixture.get("oracle") == "spec":
            continue
        path = os.path.join(FIXTURES, fmt, fixture["file"])
        computed = oracle.compute(path, fixture)
        if computed is None:
            continue
        expected = dict(fixture.get("expected", {}))
        before = json.dumps(expected, sort_keys=True)
        expected.update(computed)
        fixture["expected"] = expected
        if json.dumps(expected, sort_keys=True) != before:
            changed += 1
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=True)
        f.write("\n")
    print(f"{fmt}: {len(manifest['fixtures'])} fixtures, {changed} expectation(s) changed")


def main():
    formats = sys.argv[1:] or sorted(
        d for d in os.listdir(FIXTURES) if os.path.isdir(os.path.join(FIXTURES, d))
    )
    for fmt in formats:
        regenerate(fmt)


if __name__ == "__main__":
    main()
