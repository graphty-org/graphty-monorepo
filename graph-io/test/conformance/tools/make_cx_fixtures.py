#!/usr/bin/env python3
"""Write the authored CX version 1 fixtures into fixtures/cx/authored/ (MIT, as authored for graph-io).

Usage (from graph-io/):  python3 test/conformance/tools/make_cx_fixtures.py

The groups set and the malformed / edge-case set of research-cx.md section 8 rows 24 and 25, which
reproduce the cases of Cytoscape's unlicensed `cytoscape/cx` test files without copying them, plus
the cases design.md section 6.4 adds. The expectations are hand-written in
fixtures/cx/manifest.json ("oracle": "spec") or computed by oracle_cx.py ("ndex2-3.12.0").
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "fixtures", "cx", "authored")

VERIFY = {"numberVerification": [{"longNumber": 281474976710655}]}
OK = {"status": [{"error": "", "success": True}]}


def meta(*names):
    return {"metaData": [{"name": n, "version": "1.0"} for n in names]}


def doc(*fragments, verify=True, status=OK):
    members = ([VERIFY] if verify else []) + list(fragments)
    if status is not None:
        members.append(status)
    return members


def text(members):
    return "[\n" + ",\n".join(json.dumps(m, separators=(",", ":")) for m in members) + "\n]\n"


FILES = {}

FILES["groups.cx"] = text(
    doc(
        meta("nodes", "edges", "cyGroups", "cySubNetworks"),
        {"nodes": [{"@id": i, "n": f"n{i}"} for i in range(1, 6)] + [{"@id": 100, "n": "Group One"}, {"@id": 200, "n": "Inner"}]},
        {"edges": [{"@id": 10, "s": 1, "t": 2}, {"@id": 11, "s": 2, "t": 5}, {"@id": 12, "s": 3, "t": 4}]},
        {"cySubNetworks": [{"@id": 50, "nodes": "all", "edges": "all"}]},
        {
            "cyGroups": [
                {"@id": 100, "n": "Group One", "nodes": [1, 2, 200], "internal_edges": [10], "external_edges": [11], "collapsed": True},
                {"@id": 200, "n": "Inner", "nodes": [3, 4, 2], "internal_edges": [12], "external_edges": [], "collapsed": False},
                {"@id": 300, "n": "Missing node", "nodes": [5], "internal_edges": [], "external_edges": []},
                {"@id": 400, "n": "Bad member", "nodes": [999, 1], "internal_edges": [], "external_edges": []},
                {"@id": 1, "n": "Cycle", "nodes": [100], "internal_edges": [], "external_edges": []},
            ]
        },
    )
)

COLLECTION_FRAGMENTS = [
    {"nodes": [{"@id": 1, "n": "a"}, {"@id": 2, "n": "b"}, {"@id": 3, "n": "c"}]},
    {"edges": [{"@id": 10, "s": 1, "t": 2}, {"@id": 11, "s": 2, "t": 3}]},
    {"nodeAttributes": [{"po": 2, "n": "score", "v": "1.0", "d": "double"}, {"po": 2, "n": "score", "v": "2.0", "d": "double", "s": 200}]},
    {"cartesianLayout": [{"node": 1, "x": 1, "y": 1, "view": 1000}, {"node": 2, "x": 2, "y": 2, "view": 1000}, {"node": 2, "x": 20, "y": 20, "view": 2000}, {"node": 3, "x": 30, "y": 30, "view": 2000}]},
    {"networkAttributes": [{"n": "name", "v": "Collection"}, {"n": "shared", "v": "for all"}, {"n": "local", "v": "second only", "s": 200}]},
    {"cySubNetworks": [{"@id": 100, "nodes": [1, 2], "edges": [10]}, {"@id": 200, "nodes": [2, 3], "edges": [11]}]},
    {"cyNetworkRelations": [{"c": 100, "r": "subnetwork", "name": "First"}, {"p": 100, "c": 1000, "r": "view"}, {"c": 200, "r": "subnetwork", "name": "Second"}, {"p": 200, "c": 2000, "r": "view"}]},
]
FILES["collection.cx"] = text(doc(meta("nodes", "edges", "nodeAttributes", "cartesianLayout", "networkAttributes", "cySubNetworks", "cyNetworkRelations"), *COLLECTION_FRAGMENTS))
FILES["collection-chosen-by-name.cx"] = FILES["collection.cx"]
FILES["collection-without-metadata.cx"] = text(doc(*COLLECTION_FRAGMENTS, verify=False))

FILES["attributes-before-nodes.cx"] = text(
    doc(
        meta("nodeAttributes", "cartesianLayout", "nodes", "edges"),
        {"nodeAttributes": [{"po": 1, "n": "score", "v": "0.5", "d": "double"}, {"po": 2, "n": "score", "v": "1.5", "d": "double"}]},
        {"cartesianLayout": [{"node": 1, "x": 10, "y": 20}, {"node": 2, "x": 30, "y": -40}]},
        {"nodes": [{"@id": 1, "n": "a"}, {"@id": 2, "n": "b"}]},
        {"edges": [{"@id": 1, "s": 1, "t": 2}]},
    )
)

FILES["big-id-after-safe-ones.cx"] = text(
    doc({"nodes": [{"@id": i} for i in range(1000)]}, {"edges": [{"@id": i, "s": i, "t": (i + 1) % 1000} for i in range(1000)]})
).replace('{"@id":999}', '{"@id":999},{"@id":18014398509481985}').replace(
    '{"@id":999,"s":999,"t":0}', '{"@id":999,"s":999,"t":0},{"@id":1000,"s":0,"t":18014398509481985}'
)

FILES["string-and-exponent-ids.cx"] = (
    "[\n"
    '{"nodes":[{"@id":"12","n":"twelve"},{"@id":1e3,"n":"thousand"},{"@id":12,"n":"twelve again"},{"@id":-5},{"@id":0}]},\n'
    '{"edges":[{"@id":"1","s":"12","t":1000},{"@id":2.0,"s":0,"t":-5}]}\n'
    "]\n"
)

FILES["null-values.cx"] = text(
    doc(
        meta("nodes", "nodeAttributes", "networkAttributes"),
        {"nodes": [{"@id": 1}, {"@id": 2}]},
        {"nodeAttributes": [{"po": 1, "n": "a", "v": None}, {"po": 2, "n": "a", "v": "kept"}, {"po": 1, "n": "b", "v": None, "d": "double"}]},
        {"networkAttributes": [{"n": "empty", "v": None}]},
    )
)

FILES["single-object-aspects.cx"] = text(
    doc(
        {"nodes": [{"@id": 1}]},
        {"ndexStatus": {"externalId": "x", "published": True, "nodeCount": 1}},
        {"provenanceHistory": [{"entity": {"uri": "https://example.org", "creationEvent": {"eventType": "create"}}}]},
        {"@context": [{"HGNC": "http://identifiers.org/hgnc/"}]},
    )
)

FILES["bypass-name-collision.cx"] = text(
    doc(
        {"nodes": [{"@id": 1}]},
        {"nodeAttributes": [{"po": 1, "n": "NODE_SIZE", "v": "an attribute"}]},
        {"cyVisualProperties": [{"properties_of": "nodes", "applies_to": 1, "properties": {"NODE_SIZE": "40.0", "NODE_FILL_COLOR": "#FF0000"}}]},
    )
)

FILES["duplicate-ids.cx"] = text(
    doc(
        {"nodes": [{"@id": 1, "n": "first"}, {"@id": 2}, {"@id": 1, "r": "HGNC:1"}]},
        {"edges": [{"@id": 7, "s": 1, "t": 2, "i": "kept"}, {"@id": 7, "s": 2, "t": 1, "i": "skipped"}]},
    )
)

FILES["dangling.cx"] = text(
    doc(
        {"nodes": [{"@id": 1}, {"@id": 2}]},
        {"edges": [{"@id": 1, "s": 1, "t": 2}, {"@id": 2, "s": 1, "t": 99}, {"@id": 3, "s": 98, "t": 2}]},
        {"nodeAttributes": [{"po": 97, "n": "a", "v": "x"}]},
        {"edgeAttributes": [{"po": 96, "n": "b", "v": "y"}]},
        {"cartesianLayout": [{"node": 95, "x": 1, "y": 1}]},
    )
)

FILES["number-verification-75.cx"] = text(
    [{"numberVerification": [{"longNumber": 75}]}, {"nodes": [{"@id": 1}]}, OK]
)

FILES["status-failed.cx"] = text(doc({"nodes": [{"@id": 1}]}, status={"status": [{"error": "the upload was interrupted", "success": False}]}))
FILES["status-warning.cx"] = text(doc({"nodes": [{"@id": 1}]}, status={"status": [{"error": "2 aspects were dropped", "success": True}]}))
FILES["status-missing.cx"] = text(doc({"nodes": [{"@id": 1}]}, status=None))
FILES["truncated.cx"] = text(doc({"nodes": [{"@id": 1, "n": "a"}, {"@id": 2, "n": "b"}]}))[:60]
FILES["empty.cx"] = ""
FILES["empty-array.cx"] = "[]\n"
FILES["multi-key-fragment.cx"] = text(doc({"nodes": [{"@id": 1}], "edges": [{"@id": 1, "s": 1, "t": 1}]}, {"nodes": [{"@id": 2}]}))

FILES["typed-values.cx"] = text(
    doc(
        {"nodes": [{"@id": i} for i in range(1, 10)]},
        {
            "nodeAttributes": [
                {"po": 1, "n": "d", "v": "", "d": "double"},
                {"po": 2, "n": "d", "v": "null", "d": "double"},
                {"po": 3, "n": "d", "v": "Null", "d": "double"},
                {"po": 4, "n": "d", "v": "NaN", "d": "double"},
                {"po": 5, "n": "d", "v": "1.0d", "d": "double"},
                {"po": 6, "n": "d", "v": "8.5", "d": "double"},
                {"po": 1, "n": "b", "v": "True", "d": "boolean"},
                {"po": 2, "n": "b", "v": "1", "d": "boolean"},
                {"po": 1, "n": "i", "v": "2147483648", "d": "integer"},
                {"po": 2, "n": "i", "v": "", "d": "integer"},
                {"po": 3, "n": "i", "v": "42", "d": "integer"},
                {"po": 1, "n": "u", "v": "x", "d": "date"},
                {"po": 1, "n": "ls", "v": "not a list", "d": "list_of_string"},
                {"po": 2, "n": "sc", "v": ["a list"], "d": "string"},
                {"po": 1, "n": "ld", "v": ["8.0", "null", "", "NaN"], "d": "list_of_double"},
                {"po": 1, "n": "w", "v": "1", "d": "integer"},
                {"po": 2, "n": "w", "v": "2.5", "d": "double"},
                {"po": 7, "n": "native", "v": 3, "d": "integer"},
                {"po": 8, "n": "native", "v": 4.0, "d": "integer"},
                {"po": 9, "n": "nb", "v": True, "d": "boolean"},
            ]
        },
    )
)

FILES["old-aspect-names.cx"] = text(
    doc(
        {"nodes": [{"@id": 1, "n": "a"}, {"@id": 2, "n": "b"}]},
        {"edges": [{"@id": 3, "s": 1, "t": 2}]},
        {"subNetworks": [{"@id": 50, "nodes": [1, 2], "edges": [3]}]},
        {"networkRelations": [{"c": 50, "name": "Legacy network"}]},
        {"hiddenAttributes": [{"n": "layoutAlgorithm", "v": "Grid Layout"}]},
        {"visualProperties": [{"properties_of": "nodes", "applies_to": 1, "properties": {"NODE_SIZE": "35.0"}}, {"properties_of": "nodes:default", "properties": {"NODE_SHAPE": "ELLIPSE"}}]},
    )
)

FILES["all-members.cx"] = text(
    doc(
        {"nodes": [{"@id": 1}, {"@id": 2}, {"@id": 3}]},
        {"edges": [{"@id": 4, "s": 1, "t": 2}, {"@id": 5, "s": 2, "t": 3}]},
        {"cySubNetworks": [{"@id": 9, "nodes": "all", "edges": "all"}]},
        {"nodeAttributes": [{"po": 1, "n": "scoped", "v": "local", "s": 9}, {"po": 1, "n": "scoped", "v": "shared"}, {"po": 2, "n": "scoped", "v": "shared only"}]},
    )
)

FILES["name-and-n.cx"] = text(
    doc(
        {"nodes": [{"@id": 1, "n": "short"}, {"@id": 2, "n": "same"}]},
        {"edges": [{"@id": 3, "s": 1, "t": 2, "i": "i-field"}]},
        {"nodeAttributes": [{"po": 1, "n": "name", "v": "long name"}, {"po": 2, "n": "name", "v": "same"}]},
        {"edgeAttributes": [{"po": 3, "n": "interaction", "v": "attribute"}]},
    )
)

FILES["views-and-z.cx"] = text(
    doc(
        {"nodes": [{"@id": 1}, {"@id": 2}]},
        {"cySubNetworks": [{"@id": 10, "nodes": "all", "edges": "all"}]},
        {"cyViews": [{"@id": 20, "s": 10}, {"@id": 21, "s": 10}]},
        {"cartesianLayout": [{"node": 1, "x": 5, "y": 6, "z": 32775, "view": 20}, {"node": 2, "x": 0, "y": 0, "view": 20}, {"node": 1, "x": 50, "y": 60, "view": 21}, {"node": 2, "x": 1, "y": 1, "view": 22}]},
    )
)

FILES["provenance.cx"] = text(
    doc(
        {"nodes": [{"@id": 1, "n": "a"}, {"@id": 2, "n": "b"}, {"@id": 3, "n": "complex"}]},
        {"edges": [{"@id": 5, "s": 1, "t": 2, "i": "increases"}]},
        {"citations": [{"@id": 7, "dc:identifier": "pmid:12345", "dc:title": "A paper", "dc:contributor": ["A. Author"], "dc:type": "URI", "attributes": [{"n": "year", "v": "2001", "t": "integer"}]}]},
        {"supports": [{"@id": 8, "citation": 7, "text": "a supporting sentence", "attributes": []}]},
        {"edgeCitations": [{"po": [5], "citations": [7]}]},
        {"edgeSupports": [{"po": [5], "supports": [8]}]},
        {"nodeCitations": [{"po": [1, 2], "citations": [7]}]},
        {"functionTerms": [{"po": 3, "f": "bel:complexAbundance", "args": [{"f": "bel:proteinAbundance", "args": ["HGNC:A"]}, "HGNC:B"]}]},
        {"reifiedEdges": [{"node": 3, "edge": 5}]},
    )
)

FILES["visual-properties.cx"] = text(
    doc(
        {"nodes": [{"@id": 1}, {"@id": 2}]},
        {"edges": [{"@id": 3, "s": 1, "t": 2}]},
        {"cyViews": [{"@id": 40, "s": 30}]},
        {"cySubNetworks": [{"@id": 30, "nodes": "all", "edges": "all"}]},
        {
            "cyVisualProperties": [
                {"properties_of": "network", "applies_to": 40, "view": 40, "properties": {"NETWORK_BACKGROUND_PAINT": "#FFFFFF", "NETWORK_SCALE_FACTOR": "1.0"}},
                {"properties_of": "nodes:default", "applies_to": 40, "view": 40, "properties": {"NODE_SHAPE": "ELLIPSE", "NODE_SIZE": "35.0"}, "dependencies": {"nodeSizeLocked": "true"}, "mappings": {"NODE_LABEL": {"type": "PASSTHROUGH", "definition": "COL=name,T=string"}, "NODE_FILL_COLOR": {"type": "DISCRETE", "definition": "COL=kind,T=string,K=0=a,,b,V=0=#FF0000"}}},
                {"properties_of": "edges:default", "applies_to": 40, "view": 40, "properties": {"EDGE_WIDTH": "2.0"}},
                {"properties_of": "nodes", "applies_to": 1, "view": 40, "properties": {"NODE_FILL_COLOR": "#00FF00", "NODE_LABEL_FONT_FACE": "SansSerif.italic,,plain,,14"}},
                {"properties_of": "edges", "applies_to": 3, "view": 40, "properties": {"EDGE_BEND": "0.5,0.5,0.5"}},
            ]
        },
    )
)

UNICODE = doc({"nodes": [{"@id": 1, "n": "café"}, {"@id": 2, "n": "naïve"}]}, {"edges": [{"@id": 3, "s": 1, "t": 2}]})
UNICODE_TEXT = "[\n" + ",\n".join(json.dumps(m, separators=(",", ":"), ensure_ascii=False) for m in UNICODE) + "\n]\n"
BINARY = {
    "bom.cx": b"\xef\xbb\xbf" + UNICODE_TEXT.encode("utf-8"),
    "latin1.cx": UNICODE_TEXT.encode("latin-1"),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, content in FILES.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
    for name, content in BINARY.items():
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(content)
    print(f"wrote {len(FILES) + len(BINARY)} files to {OUT}")


if __name__ == "__main__":
    main()
