"""Neo4j oracle for tools/oracle.py: no Neo4j runs here, so this is a small reader of the rules the
Neo4j documentation states.

- "neo4j-admin-manual": neo4j-admin import CSV per the Operations Manual header-format page. A
  row whose cells carry `:ID`, `:START_ID` or `:END_ID` starts a section; a node is keyed by its id
  space plus the value of every `:ID` column (composite ids), the first row of a key wins
  (--skip-duplicate-nodes); a relationship counts when both endpoints were declared in the named
  space; a row whose cell count differs from its header is skipped. Bytes are decoded as the
  owner's rule says: the "encoding" option, else a BOM, else UTF-8, else windows-1252.
- "apoc-json-walk": APOC JSON exports (JSON Lines, ARRAY_JSON, {nodes,rels}, JSON_ID_AS_KEYS,
  query records): every object with type "node" is a node (by id), every object with type
  "relationship" an edge (by id), and a relationship's start / end stubs are nodes too.
"""
import codecs
import csv
import io
import json
import re

MARKER = re.compile(r"^[^:{}()]*:\s*(ID|START_ID|END_ID)\s*(\(|\{|$)", re.I)
FIELD = re.compile(r"^[^:]*:\s*([A-Za-z_]+)\s*(?:\(([^)]*)\))?")


def decode(data, options):
    if options.get("encoding"):
        return data.decode(codecs.lookup(options["encoding"]).name)
    for bom, enc in ((codecs.BOM_UTF8, "utf-8"), (codecs.BOM_UTF16_LE, "utf-16-le"), (codecs.BOM_UTF16_BE, "utf-16-be")):
        if data.startswith(bom):
            return data[len(bom):].decode(enc)
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252")


def admin(text):
    first = text.split("\n", 1)[0]
    delimiter = "\t" if first.count("\t") > first.count(",") else ","
    nodes = {}
    edges = 0
    header = None
    for cells in csv.reader(io.StringIO(text, newline=""), delimiter=delimiter):
        if not cells:
            continue
        if any(MARKER.match(c.strip()) for c in cells):
            header = [FIELD.match(c.strip()) for c in cells]
            header = [(m.group(1).upper(), m.group(2)) if m else ("PROPERTY", None) for m in header]
            continue
        if header is None or len(cells) != len(header):
            continue
        kinds = [k for k, _ in header]
        if "ID" in kinds:
            space = next(s for k, s in header if k == "ID")
            key = (space, tuple(c for c, (k, _) in zip(cells, header) if k == "ID"))
            nodes.setdefault(key, len(nodes))
        elif "START_ID" in kinds:
            start = (next(s for k, s in header if k == "START_ID"),
                     tuple(c for c, (k, _) in zip(cells, header) if k == "START_ID"))
            end = (next(s for k, s in header if k == "END_ID"),
                   tuple(c for c, (k, _) in zip(cells, header) if k == "END_ID"))
            if start in nodes and end in nodes:
                edges += 1
    return {"nodes": len(nodes), "edges": edges, "directed": True}


def apoc(text):
    text = text.strip()
    try:
        docs = [json.loads(text)]
    except json.JSONDecodeError:
        docs = [json.loads(line) for line in text.splitlines() if line.strip()]
    nodes = set()
    rels = set()

    def walk(value):
        if isinstance(value, list):
            for v in value:
                walk(v)
        elif isinstance(value, dict):
            if value.get("type") == "node" and "id" in value:
                nodes.add(str(value["id"]))
            elif value.get("type") == "relationship":
                start, end = value["start"]["id"], value["end"]["id"]
                nodes.update((str(start), str(end)))
                rels.add(str(value["id"]) if "id" in value else (value.get("label"), str(start), str(end)))
                return
            for v in value.values():
                walk(v)

    walk(docs)
    return {"nodes": len(nodes), "edges": len(rels), "directed": True}


def compute(path, fixture):
    with open(path, "rb") as f:
        data = f.read()
    text = decode(data, fixture.get("options", {}))
    if fixture["oracle"] == "apoc-json-walk":
        return apoc(text)
    if fixture["oracle"] == "neo4j-admin-manual":
        return admin(text)
    return None
