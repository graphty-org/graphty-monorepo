#!/usr/bin/env python3
"""Write the authored CX2 fixtures into fixtures/cx2/authored/ (MIT, as authored for graph-io).

Usage (from graph-io/):  python3 test/conformance/tools/make_cx2_fixtures.py

One file per feature or error of research-cx2.md that no real file shows (its section 6.1 list,
plus the cases design.md section 6.4 adds). The expectations are hand-written in
fixtures/cx2/manifest.json ("oracle": "spec") or computed by oracle_cx2.py ("ndex2-3.12.0").
Rerun this script after changing it; it only rewrites the files it owns.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "fixtures", "cx2", "authored")

DESCRIPTOR = {"CXVersion": "2.0", "hasFragments": False}
OK = {"status": [{"error": "", "success": True}]}


def doc(*blocks, descriptor=DESCRIPTOR, status=OK):
    members = [descriptor, *blocks]
    if status is not None:
        members.append(status)
    return members


def text(members):
    return "[\n" + ",\n".join(json.dumps(m, separators=(",", ":")) for m in members) + "\n]\n"


FILES = {}

FILES["fragments.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"name": {"d": "string", "a": "n"}}}]},
        {"nodes": [{"id": 1, "v": {"n": "a"}}, {"id": 2, "v": {"n": "b"}}]},
        {"edges": [{"id": 10, "s": 1, "t": 2}]},
        {"attributeDeclarations": [{"edges": {"interaction": {"d": "string", "a": "i"}}}]},
        {"nodes": [{"id": 3, "v": {"n": "c"}}]},
        {"edges": [{"id": 11, "s": 2, "t": 3, "v": {"i": "binds"}}]},
        {"nodes": [{"id": 4, "v": {"n": "d"}}]},
        descriptor={"CXVersion": "2.0", "hasFragments": True},
    )
)

FILES["fragments-undeclared.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"name": {"d": "string", "a": "n"}}}]},
        {"nodes": [{"id": 1, "v": {"n": "a"}}]},
        {"nodes": [{"id": 2, "v": {"n": "b"}}]},
        {"edges": [{"id": 1, "s": 1, "t": 2}]},
    )
)

ALL_TYPES = {
    "s": {"d": "string"},
    "l": {"d": "long"},
    "i": {"d": "integer"},
    "f": {"d": "double"},
    "b": {"d": "boolean"},
    "ls": {"d": "list_of_string"},
    "ll": {"d": "list_of_long"},
    "li": {"d": "list_of_integer"},
    "lf": {"d": "list_of_double"},
    "lb": {"d": "list_of_boolean"},
}
FILES["all-types.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"networkAttributes": ALL_TYPES, "nodes": ALL_TYPES, "edges": ALL_TYPES}]},
        {
            "networkAttributes": [
                {"s": "net", "l": 3, "i": -1, "f": 0.5, "b": True, "ls": ["x"], "ll": [], "li": [1], "lf": [2.5], "lb": [False]}
            ]
        },
        {
            "nodes": [
                {"id": 1, "v": {"s": "one", "l": 4294967296, "i": 7, "f": 1.25, "b": False, "ls": ["a", "b"], "ll": [1, 2], "li": [], "lf": [0.5, -1], "lb": [True, False]}},
                {"id": 2, "v": {"s": "", "l": -5, "i": 0, "f": -0.0, "b": True, "ls": [], "ll": [], "li": [3], "lf": [], "lb": []}},
            ]
        },
        {"edges": [{"id": 1, "s": 1, "t": 2, "v": {"s": "e", "l": 1, "i": 2, "f": 3.5, "b": True, "ls": ["p"], "ll": [9], "li": [8], "lf": [7.5], "lb": [True]}}]},
    )
)

FILES["defaults-falsy.cx2"] = text(
    doc(
        {
            "attributeDeclarations": [
                {
                    "nodes": {
                        "count": {"d": "integer", "v": 0},
                        "flag": {"d": "boolean", "v": False},
                        "note": {"d": "string", "v": ""},
                        "tags": {"d": "list_of_string", "v": []},
                        "label": {"d": "string", "v": "none"},
                    }
                }
            ]
        },
        {"nodes": [{"id": 1}, {"id": 2, "v": {"count": 5, "flag": True, "note": "x", "tags": ["t"], "label": "two"}}]},
    )
)

FILES["alias-edge-cases.cx2"] = text(
    doc(
        {
            "attributeDeclarations": [
                {
                    "networkAttributes": {"title": {"d": "string", "a": "t", "v": "untitled"}},
                    "nodes": {
                        "n": {"d": "string", "a": "n"},
                        "full": {"d": "string", "a": "f"},
                        "other": {"d": "string", "a": "n"},
                        "clash": {"d": "string", "a": "full"},
                    },
                }
            ]
        },
        {"networkAttributes": [{"title": "Aliases"}]},
        {"nodes": [{"id": 1, "v": {"n": "one", "full": "by full name"}}, {"id": 2, "v": {"f": "by alias", "full": "both"}}]},
    )
)

FILES["long-ids.cx2"] = (
    "[\n"
    '{"CXVersion":"2.0","hasFragments":false},\n'
    '{"attributeDeclarations":[{"nodes":{"big":{"d":"long"}}}]},\n'
    '{"nodes":[{"id":0},{"id":-7},{"id":9007199254740993,"v":{"big":12345678901234567891}},{"id":9223372036854775807}]},\n'
    '{"edges":[{"id":9007199254740995,"s":9007199254740993,"t":9223372036854775807},{"id":0,"s":0,"t":-7}]},\n'
    '{"status":[{"error":"","success":true}]}\n'
    "]\n"
)

FILES["big-id-after-safe-ones.cx2"] = text(
    doc(
        {"nodes": [{"id": i} for i in range(1000)]},
        {"edges": [{"id": i, "s": i, "t": (i + 1) % 1000} for i in range(1000)]},
    )
).replace(
    '{"id":999,"s":999,"t":0}', '{"id":999,"s":999,"t":0},{"id":1000,"s":0,"t":18014398509481985}'
).replace('{"id":999}', '{"id":999},{"id":18014398509481985}')

FILES["value-mismatch.cx2"] = (
    "[\n"
    '{"CXVersion":"2.0","hasFragments":false},\n'
    '{"attributeDeclarations":[{"nodes":{"d":{"d":"double"},"i":{"d":"integer"},"b":{"d":"boolean"},'
    '"l":{"d":"list_of_double"},"s":{"d":"string","v":"default"}}}]},\n'
    '{"nodes":[{"id":1,"v":{"d":"3.5"}},{"id":2,"v":{"i":3.7}},{"id":3,"v":{"i":2147483648}},'
    '{"id":4,"v":{"b":"true"}},{"id":5,"v":{"l":1.5}},{"id":6,"v":{"l":[1,"2"]}},{"id":7,"v":{"d":"NaN","s":"NaN"}},'
    '{"id":8,"v":{"s":null,"d":null}},{"id":9,"v":{"i":3.0,"d":-0}}]},\n'
    '{"status":[{"error":"","success":true}]}\n'
    "]\n"
)

FILES["undeclared-type.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"ratio": {"d": "float"}, "when": {"d": "date"}, "plain": {"a": "p"}}}]},
        {"nodes": [{"id": 1, "v": {"ratio": 0.5, "when": "2026-10-02", "p": "text"}}, {"id": 2, "v": {"ratio": 2}}]},
    )
)

FILES["python-types.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"a": {"d": "str"}, "b": {"d": "int"}, "c": {"d": "bool"}, "e": {"d": "float"}}}]},
        {"nodes": [{"id": 1, "v": {"a": "x", "b": 1, "c": True, "e": 2.5}}]},
    )
)

FILES["status-failed.cx2"] = text(
    doc({"nodes": [{"id": 1}]}, status={"status": [{"error": "the server ran out of memory", "success": False}]})
)
FILES["status-warning.cx2"] = text(
    doc({"nodes": [{"id": 1}]}, status={"status": [{"error": "3 edges were dropped", "success": True}]})
)
FILES["status-malformed.cx2"] = text(doc({"nodes": [{"id": 1}]}, status={"status": [{"success": "yes"}, {}]}))
FILES["status-missing.cx2"] = text(doc({"nodes": [{"id": 1}]}, status=None))

FILES["coordinates.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"x": {"d": "string"}}}]},
        {
            "nodes": [
                {"id": 1, "x": 10.5, "y": 20, "z": 3, "v": {"x": "an attribute named x"}},
                {"id": 2},
                {"id": 3, "x": 4},
                {"id": 4, "z": 7},
                {"id": 5, "x": "12.5", "y": "1"},
                {"id": 6, "x": -3, "y": 0},
            ]
        },
    )
)

FILES["cartesian-layout-legacy.cx2"] = text(
    doc(
        {"nodes": [{"id": 1}, {"id": 2}]},
        {"cartesianLayout": [{"node": 1, "x": 5, "y": 6}, {"node": 2, "x": -1, "y": -2, "z": 4}]},
    )
)
FILES["cartesian-layout-ignored.cx2"] = text(
    doc({"nodes": [{"id": 1, "x": 0, "y": 0}]}, {"cartesianLayout": [{"node": 1, "x": 5, "y": 6}]})
)

FILES["version-2.1.cx2"] = text(doc({"nodes": [{"id": 1}]}, descriptor={"CXVersion": "2.1", "hasFragments": False}))
FILES["version-number.cx2"] = text(doc({"nodes": [{"id": 1}]}, descriptor={"CXVersion": 2, "hasFragments": False}))
FILES["version-3.cx2"] = text(doc({"nodes": [{"id": 1}]}, descriptor={"CXVersion": "3.0"}))
FILES["cx1-named-cx2.cx2"] = text(
    [
        {"numberVerification": [{"longNumber": 281474976710655}]},
        {"metaData": [{"name": "nodes", "version": "1.0", "elementCount": 1}]},
        {"nodes": [{"@id": 1, "n": "a"}]},
        {"status": [{"error": "", "success": True}]},
    ]
)
FILES["descriptor-key-order.cx2"] = text(
    doc({"nodes": [{"id": 1}]}, descriptor={"hasFragments": False, "CXVersion": "2.0"})
)

UNICODE = doc(
    {"attributeDeclarations": [{"nodes": {"name": {"d": "string"}}}]},
    {"nodes": [{"id": 1, "v": {"name": "café"}}, {"id": 2, "v": {"name": "naïve"}}]},
    {"edges": [{"id": 1, "s": 1, "t": 2}]},
)
UNICODE_TEXT = "[\n" + ",\n".join(json.dumps(m, separators=(",", ":"), ensure_ascii=False) for m in UNICODE) + "\n]\n"
BINARY = {
    "bom.cx2": b"\xef\xbb\xbf" + UNICODE_TEXT.encode("utf-8"),
    "utf16.cx2": b"\xff\xfe" + UNICODE_TEXT.encode("utf-16-le"),
    "latin1.cx2": UNICODE_TEXT.encode("latin-1"),
}

FILES["editor-properties-flat.cx2"] = text(
    doc(
        {"nodes": [{"id": 1}]},
        {
            "visualEditorProperties": [
                {
                    "nodeSizeLocked": True,
                    "arrowColorMatchesEdge": False,
                    "tableDisplayConfiguration": {
                        "nodeTable": {"columnConfiguration": [{"attributeName": "name", "visible": True}], "sortColumn": "name", "sortDirection": "ascending"}
                    },
                }
            ]
        },
    )
)

FILES["dangling-bypass.cx2"] = text(
    doc(
        {"nodes": [{"id": 1}, {"id": 2}]},
        {"edges": [{"id": 5, "s": 1, "t": 2}]},
        {"nodeBypasses": [{"id": 1, "v": {"NODE_FILL_COLOR": "#FF0000"}}, {"id": 99, "v": {"NODE_FILL_COLOR": "#00FF00"}}]},
        {"edgeBypasses": [{"id": 5, "v": {"EDGE_WIDTH": 2}}, {"id": 77, "v": {"EDGE_WIDTH": 9}}]},
    )
)

FILES["edges-before-nodes.cx2"] = text(
    doc(
        {"edges": [{"id": 1, "s": 1, "t": 2}, {"id": 2, "s": 2, "t": 3}]},
        {"nodes": [{"id": 1}, {"id": 2}, {"id": 3}]},
    )
)

FILES["declarations-after-nodes.cx2"] = text(
    doc(
        {"nodes": [{"id": 1, "v": {"n": "late", "score": 2}}]},
        {"attributeDeclarations": [{"nodes": {"name": {"d": "string", "a": "n"}, "score": {"d": "double"}}}]},
    )
)

FILES["one-and-string-one.cx2"] = text(
    doc({"nodes": [{"id": 1, "v": {"a": 1}}, {"id": "1", "v": {"b": 2}}, {"id": 2}]}, {"edges": [{"id": "7", "s": "1", "t": 2}]})
)

FILES["unknown-element-key.cx2"] = text(
    doc({"nodes": [{"id": 1, "label": "a", "selected": True}, {"id": 2, "label": "b"}]}, {"edges": [{"id": 1, "s": 1, "t": 2, "w": 1}]})
)

FILES["dangling-edge.cx2"] = text(doc({"nodes": [{"id": 1}, {"id": 2}]}, {"edges": [{"id": 1, "s": 1, "t": 2}, {"id": 2, "s": 1, "t": 99}]}))

FILES["mangled-ids.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"graphty:originalId": {"d": "string"}, "name": {"d": "string"}}}]},
        {"nodes": [{"id": 0, "v": {"graphty:originalId": "GO:0008150", "name": "biological_process"}}, {"id": 1, "v": {"graphty:originalId": "GO:0009987"}}, {"id": 2}]},
        {"edges": [{"id": 0, "s": 1, "t": 0}, {"id": 1, "s": 2, "t": 0}]},
    )
)

FILES["empty-network.cx2"] = text(doc())

FILES["block-errors.cx2"] = text(
    doc(
        {"nodes": [{"id": 1}], "edges": [{"id": 1, "s": 1, "t": 1}]},
        {"notAnAspect": 1},
        {"nodes": [2, {"id": 3}]},
        {"ndexStatus": {"published": True, "nodeCount": 2}},
    )
)

FILES["order-and-counts.cx2"] = text(
    doc(
        {"metaData": [{"name": "nodes", "elementCount": 5}, {"name": "edges", "elementCount": 0}]},
        {"nodes": [{"id": 1}, {"id": 2}]},
        {"metaData": [{"name": "nodes", "elementCount": 2}]},
        {"edges": [{"id": 1, "s": 1, "t": 2}]},
    )
)

FILES["style-rules.cx2"] = text(
    doc(
        {"attributeDeclarations": [{"nodes": {"name": {"d": "string", "a": "n"}, "level": {"d": "integer"}}}]},
        {"nodes": [{"id": 1, "x": 0, "y": 0, "v": {"n": "a", "level": 1}}, {"id": 2, "x": 100, "y": 50, "v": {"n": "b", "level": 3}}]},
        {"edges": [{"id": 1, "s": 1, "t": 2}]},
        {
            "visualProperties": [
                {
                    "default": {"network": {"NETWORK_BACKGROUND_COLOR": "#FFFFFF"}, "node": {"NODE_SHAPE": "ellipse", "NODE_SIZE": 35}, "edge": {"EDGE_WIDTH": 2}},
                    "nodeMapping": {
                        "NODE_LABEL": {"type": "PASSTHROUGH", "definition": {"attribute": "name"}},
                        "NODE_FILL_COLOR": {"type": "DISCRETE", "definition": {"attribute": "level", "map": [{"v": 1, "vp": "#FF0000"}]}},
                    },
                    "edgeMapping": {},
                }
            ]
        },
        {"visualEditorProperties": [{"properties": {"nodeSizeLocked": True, "NETWORK_SCALE_FACTOR": 1.2}}]},
        {"nodeBypasses": [{"id": 2, "v": {"NODE_LABEL_FONT_FACE": {"FONT_FAMILY": "serif", "FONT_STYLE": "normal", "FONT_WEIGHT": "bold"}, "NODE_SIZE": 60}}]},
        {"cyHiddenAttributes": [{"n": "layoutAlgorithm", "v": "Prefuse Force Directed Layout"}]},
    )
)


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
