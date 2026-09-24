#!/usr/bin/env python3
"""Validate graph-io's exports against the formats' official schemas.

Usage: python3 validate_exports.py <dir>   (needs lxml and jsonschema: pip install lxml jsonschema)

Every file under <dir> is validated by its extension: .graphml against the GraphML 1.0 XSD,
.gexf against the GEXF 1.2draft or 1.3 XSD (chosen by the root's namespace), .jgf.json against
the JSON Graph Format v2 JSON Schema, and .gv by Graphviz itself when gvpr is on the PATH (DOT
has no schema; the reference parser must read the file without an error and, for the files
<dir>/expected-counts.json lists, with the same node and edge counts). The conformance suite (conformance.test.ts) writes the files
-- every GraphML, GEXF and JGF text graph-io exported during the run -- and runs this script when
GRAPH_IO_SCHEMA_PYTHON names an interpreter that has both modules.

Prints one JSON object: {"checked": {kind: count}, "invalid": [{"file", "kind", "errors": [...],
"nested" (GraphML: whether a node holds a graph)}]}.

The schemas under ../schemas are unmodified copies:
- graphml-1.0/: http://graphml.graphdrawing.org/xmlns/1.0/<name>.xsd (graphml.graphdrawing.org,
  CC-BY-3.0). They name each other by absolute URL; the resolver below maps those URLs to the
  local copies, so nothing is fetched.
- gexf-1.2draft/, gexf-1.3/: https://github.com/gephi/gexf specs/<version>/<name>.xsd
  (CC-BY-4.0).
- jgf/json-graph-schema_v2.json: https://github.com/jsongraph/json-graph-specification (MIT).
"""
import json
import os
import shutil
import subprocess
import sys

import jsonschema
from lxml import etree

SCHEMAS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schemas")
GRAPHML_URL = "http://graphml.graphdrawing.org/xmlns/1.0/"
# Graphviz's node and edge count of the first graph of a file
GVPR_COUNTS = 'BEG_G { printf("%d %d\\n", nNodes($G), nEdges($G)); exit(0); }'


class LocalResolver(etree.Resolver):
    """Serve the GraphML schema URLs from the local copies."""

    def resolve(self, url, public_id, context):
        if url.startswith(GRAPHML_URL):
            return self.resolve_filename(os.path.join(SCHEMAS, "graphml-1.0", url[len(GRAPHML_URL):]), context)
        return None


def xml_schema(path):
    parser = etree.XMLParser(no_network=True)
    parser.resolvers.add(LocalResolver())
    return etree.XMLSchema(etree.parse(path, parser))


def graphviz_errors(path, expected):
    """Graphviz's own reading of a DOT file: its syntax errors, and the node / edge counts when known."""
    run = subprocess.run(["gvpr", GVPR_COUNTS, path], capture_output=True, timeout=60, check=False)
    stderr = run.stderr.decode("utf-8", "replace").strip()
    if stderr:
        return [f"graphviz: {stderr.splitlines()[0]}"]
    got = [int(x) for x in run.stdout.split()[:2]]
    if expected is not None and got != expected:
        return [f"graphviz counts: expected {expected[0]} nodes / {expected[1]} edges, read {got[0]} / {got[1]}"]
    return []


def leaf_errors(error):
    """The innermost errors under a JSON Schema error (a oneOf / anyOf failure keeps its branches in context)."""
    if not error.context:
        return [error]
    return [leaf for sub in error.context for leaf in leaf_errors(sub)]


def main():
    root = sys.argv[1]
    xsd = {
        "graphml": xml_schema(os.path.join(SCHEMAS, "graphml-1.0", "graphml.xsd")),
        "gexf-1.2draft": xml_schema(os.path.join(SCHEMAS, "gexf-1.2draft", "gexf.xsd")),
        "gexf-1.3": xml_schema(os.path.join(SCHEMAS, "gexf-1.3", "gexf.xsd")),
    }
    with open(os.path.join(SCHEMAS, "jgf", "json-graph-schema_v2.json"), encoding="utf-8") as f:
        jgf = jsonschema.Draft7Validator(json.load(f))
    checked, invalid = {}, []
    counts_path = os.path.join(root, "expected-counts.json")
    counts = {}
    if os.path.exists(counts_path):
        with open(counts_path, encoding="utf-8") as f:
            counts = json.load(f)
    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name)
        if name.endswith(".jgf.json"):
            kind = "jgf"
            with open(path, encoding="utf-8") as f:
                leaves = [leaf for e in jgf.iter_errors(json.load(f)) for leaf in leaf_errors(e)]
            # the deepest leaf names the offending value (a oneOf failure alone names the whole document)
            worst = max(leaves, key=lambda e: len(e.absolute_path), default=None)
            errors = [] if worst is None else [f"{'/'.join(map(str, worst.absolute_path))}: {worst.message}"]
        elif name.endswith((".graphml", ".gexf")):
            doc = etree.parse(path, etree.XMLParser(no_network=True, huge_tree=True))
            if name.endswith(".graphml"):
                kind = "graphml"
            else:
                kind = "gexf-1.3" if doc.getroot().tag.startswith("{http://gexf.net/1.3}") else "gexf-1.2draft"
            schema = xsd[kind]
            schema.validate(doc)
            # every distinct message (line numbers dropped), so each problem of a file is classified
            errors = sorted({f"{e.type_name}: {e.message}" for e in schema.error_log})
        elif name.endswith(".gv"):
            if shutil.which("gvpr") is None:
                continue
            kind = "dot"
            errors = graphviz_errors(path, counts.get(name))
        else:
            continue
        checked[kind] = checked.get(kind, 0) + 1
        if errors:
            entry = {"file": name, "kind": kind, "errors": [e[:400] for e in errors[:8]]}
            if kind == "graphml":
                # a graph inside a node: the case the XSD's per-graph node keys cannot express
                entry["nested"] = doc.find(".//{http://graphml.graphdrawing.org/xmlns}node/{http://graphml.graphdrawing.org/xmlns}graph") is not None
            invalid.append(entry)
    print(json.dumps({"checked": checked, "invalid": invalid}))


if __name__ == "__main__":
    main()
