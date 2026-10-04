#!/usr/bin/env python3
"""Regenerate the oracle-derived expectations of the conformance manifests.

Usage (from graph-io/):  python3 test/conformance/tools/oracle.py [format ...]

For every fixture of fixtures/<format>/manifest.json whose "oracle" is not "spec" (hand-written
from the specification) or "networkx-differential" (written by differential.py), the module oracle_<format>.py next to this script is asked for the
expected values: compute(path, fixture) returns a dict of Expected fields ("outcome", "nodes",
"edges", "directed", "nodeIds", "labels", "nodeAttrs", "edgeChecks", "graphs", ...) or None to
leave the fixture alone. The returned keys replace the ones in "expected"; every other key
(hand-written warnings, codes, knownFailure markers) is kept. The manifest is rewritten in place.

Oracles: networkx 3.1 (GML, GraphML, GEXF, Pajek, node-link JSON), Graphviz 2.43 gvpr (DOT),
Python's json and csv modules (JSON layer, CSV), Cytoscape 3.10.5 through CyREST (XGMML, .cys;
oracle_cytoscape.py, run by .github/workflows/conformance-cytoscape-oracle.yml).

--include-spec also asks the oracle about the "spec" fixtures (the first run of an oracle that
replaces hand-written expectations); a computed "_oracle" key becomes the fixture's "oracle".
"""
import importlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(os.path.dirname(HERE), "fixtures")
sys.path.insert(0, HERE)


def regenerate(fmt, include_spec=False):
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
        if fixture.get("oracle") == "networkx-differential" or (fixture.get("oracle") == "spec" and not include_spec):
            continue  # owned by differential.py, or hand-written
        path = os.path.join(FIXTURES, fmt, fixture["file"])
        computed = oracle.compute(path, fixture)
        if computed is None:
            continue
        oracle_name = computed.pop("_oracle", None)
        if oracle_name is not None:
            fixture["oracle"] = oracle_name
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
    args = sys.argv[1:]
    include_spec = "--include-spec" in args
    args = [a for a in args if a != "--include-spec"]
    formats = args or sorted(
        d for d in os.listdir(FIXTURES) if os.path.isdir(os.path.join(FIXTURES, d))
    )
    for fmt in formats:
        regenerate(fmt, include_spec)


if __name__ == "__main__":
    main()
