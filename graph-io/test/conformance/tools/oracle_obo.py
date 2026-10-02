"""OBO oracle for tools/oracle.py: fastobo-py 0.14.1 (MIT; the Rust fastobo 0.15.5 core, a complete
implementation of the OBO 1.4 BNF by a co-author of the specification).

Setup:  python3 -m venv tmp/obo/venv && tmp/obo/venv/bin/pip install fastobo==0.14.1 obonet==1.3.0 networkx==3.1
Run:    tmp/obo/venv/bin/python test/conformance/tools/oracle.py obo

fastobo.load() parses the file; its frames are mapped onto graph-io's model (research-obo.md
section 9; design section 4.2):

- nodes: the Term and Instance frames, frames that share an id merged into one node (spec 4.1.1),
  in first-appearance order, then one placeholder per is_a / relationship / instance_of target
  that no node frame declares;
- edges: the is_a, relationship and instance_of clauses of those frames, child -> target,
  identical clauses (the same tag, value and qualifiers) counted once per merged id;
- Typedef frames are relation metadata, not nodes; obsolete terms are kept;
- column values: for each of def / def.xrefs, synonym, xref, xref.descriptions, subset, alt_id,
  intersection_of and property_value, the whole cell of the first node (declared by one frame
  only) that carries it, and the qualifiers of the first edge that has any, each read from
  fastobo's own clause objects (the definition text, the synonym's scope, type and xrefs, the
  qualifier list), so the lexical layer is checked against an independent parser on real files.

Only fixtures whose "oracle" is "fastobo-0.14.1" or "obonet-1.3.0" are computed; the cases both
reject or misread carry hand-written expectations ("oracle": "spec") and are left alone.

"obonet-1.3.0" (BSD-2-Clause-Patent; `pip install obonet==1.3.0`) is the second reader for the
real files fastobo rejects (an escaped colon in a URL, an unknown tag, an unquoted qualifier, a
1.2 synonym without a scope): read with ignore_obsolete=False, only its node and edge counts and
node ids are used. It keeps the space before a `!` comment in an id and collapses parallel edges
of one relation, so a file where either happens is "spec" instead.

obographs() is the counter oracle_json.py uses for "python-json-obographs" fixtures: the OBO Graphs
JSON Schema and design section 4.6 restated over Python's json module (fastobo.load_graph() turns
untyped nodes into Typedefs, which the schema does not say, so it is the cross-check, not the
oracle).
"""
import collections
import re


def _id(value):
    # fastobo writes an id back with its OBO escapes (CL\:0000023); the id itself has none
    return re.sub(r"\\(.)", r"\1", str(value))


def _name(frame):
    for clause in frame:
        if type(clause).__name__ == "NameClause":
            # fastobo keeps the whitespace before a line end or a ! comment; it is not the name's
            return str(clause.name).strip()
    return None


def _namespace(frame):
    for clause in frame:
        if type(clause).__name__ == "NamespaceClause":
            return str(clause.namespace)
    return None


def _obsolete(frame):
    for clause in frame:
        if type(clause).__name__ == "IsObsoleteClause":
            return bool(clause.obsolete)
    return None


def _qualifiers(clause):
    """A clause's qualifier list as graph-io's record: name to value, a repeated name a list."""
    out = {}
    for q in clause.qualifiers or []:
        key, value = str(q.key), str(q.value)
        if key in out:
            out[key] = (out[key] if isinstance(out[key], list) else [out[key]]) + [value]
        else:
            out[key] = value
    return out


def _with_qualifiers(item, clause):
    q = _qualifiers(clause)
    return dict(item, qualifiers=q) if q else item


def _columns(frame):
    """The cells graph-io writes for one frame's def, synonym, xref, subset, alt_id, intersection_of and property_value clauses."""
    cells = {}
    descriptions = {}

    def describe(xrefs):
        for x in xrefs:
            if x.desc is not None:
                descriptions.setdefault(_id(x.id), str(x.desc))

    for clause in frame:
        ctype = type(clause).__name__
        if ctype == "DefClause" and "def" not in cells:
            cells["def"] = str(clause.definition)
            cells["def.xrefs"] = [_id(x.id) for x in clause.xrefs]
            describe(clause.xrefs)
        elif ctype == "SynonymClause":
            syn = clause.synonym
            item = {
                "text": str(syn.desc),
                "scope": str(syn.scope),
                "type": None if syn.type is None else _id(syn.type),
                "xrefs": [_id(x.id) for x in syn.xrefs],
            }
            cells.setdefault("synonym", []).append(_with_qualifiers(item, clause))
            describe(syn.xrefs)
        elif ctype == "XrefClause":
            xid = _id(clause.xref.id)
            if xid not in cells.setdefault("xref", []):
                cells["xref"].append(xid)
            describe([clause.xref])
        elif ctype in ("SubsetClause", "AltIdClause"):
            name = "subset" if ctype == "SubsetClause" else "alt_id"
            value = _id(clause.subset if ctype == "SubsetClause" else clause.alt_id)
            if value not in cells.setdefault(name, []):
                cells[name].append(value)
        elif ctype == "IntersectionOfClause":
            item = {"relation": None if clause.typedef is None else _id(clause.typedef), "target": _id(clause.term)}
            cells.setdefault("intersection_of", []).append(_with_qualifiers(item, clause))
        elif ctype == "PropertyValueClause":
            pv = clause.property_value
            datatype = getattr(pv, "datatype", None)
            item = {
                "relation": _id(pv.relation),
                "value": str(pv.value) if datatype is not None else _id(pv.value),
                "datatype": None if datatype is None else str(datatype),
            }
            cells.setdefault("property_value", []).append(_with_qualifiers(item, clause))
    if descriptions:
        cells["xref.descriptions"] = descriptions
    return cells


def graph(path):
    """Map a fastobo document onto nodes and edges."""
    import fastobo  # only the OBO fixtures need it; the obographs counter below does not

    doc = fastobo.load(path)
    nodes = collections.OrderedDict()  # id -> {"seen": set, "name", "namespace", "obsolete"}
    default_namespace = None
    for clause in doc.header:
        if type(clause).__name__ == "DefaultNamespaceClause":
            default_namespace = str(clause.namespace)
    edges = []
    frames = collections.Counter(_id(f.id) for f in doc)
    for frame in doc:
        kind = type(frame).__name__
        if kind not in ("TermFrame", "InstanceFrame"):
            continue
        fid = _id(frame.id)
        if frames[fid] == 1:
            nodes.setdefault(fid, {"seen": set(), "name": None, "namespace": None, "obsolete": None})["columns"] = _columns(frame)
        node = nodes.setdefault(fid, {"seen": set(), "name": None, "namespace": None, "obsolete": None})
        node["name"] = node["name"] or _name(frame)
        node["namespace"] = node["namespace"] or _namespace(frame)
        if node["obsolete"] is None:
            node["obsolete"] = _obsolete(frame)
        for clause in frame:
            text = str(clause)
            if text in node["seen"]:
                continue
            node["seen"].add(text)
            ctype = type(clause).__name__
            if ctype == "IsAClause":
                edges.append((fid, "is_a", _id(clause.term), _qualifiers(clause)))
            elif ctype == "RelationshipClause":
                edges.append((fid, _id(clause.typedef), _id(clause.term), _qualifiers(clause)))
            elif ctype == "InstanceOfClause":
                edges.append((fid, "instance_of", _id(clause.term), _qualifiers(clause)))
    declared = list(nodes)
    placeholders = []
    for _, _, target, _ in edges:
        if target not in nodes and target not in placeholders:
            placeholders.append(target)
    for node in nodes.values():
        if node["namespace"] is None:
            node["namespace"] = default_namespace
    return declared, placeholders, nodes, edges


def from_obonet(path):
    """Counts and ids from obonet, for the files fastobo rejects."""
    import obonet

    g = obonet.read_obo(path, ignore_obsolete=False)
    ids = list(g.nodes())
    return {
        "outcome": "pass",
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "directed": True,
        "nodeIds": ids[:5],
    }


def compute(path, fixture):
    if fixture.get("oracle") == "obonet-1.3.0":
        return from_obonet(path)
    if fixture.get("oracle") != "fastobo-0.14.1":
        return None
    declared, placeholders, nodes, edges = graph(path)
    pairs = collections.Counter((s, t) for s, _, t, _ in edges)
    result = {
        "outcome": "pass",
        "nodes": len(declared) + len(placeholders),
        "edges": len(edges),
        "directed": True,
        "nodeIds": (declared[:4] + placeholders[:1])[:5],
    }
    labels = [n["name"] for n in nodes.values() if n["name"]][:3]
    if labels:
        result["labels"] = labels
    attrs = []
    for fid, node in nodes.items():
        if node["namespace"] is not None and len([a for a in attrs if a["column"] == "namespace"]) < 2:
            attrs.append({"id": fid, "column": "namespace", "value": node["namespace"]})
    obsolete = [fid for fid, node in nodes.items() if node["obsolete"]]
    if obsolete:
        attrs.append({"id": obsolete[0], "column": "is_obsolete", "value": True})
    for column in COLUMN_CHECKS:
        for fid, node in nodes.items():
            value = node.get("columns", {}).get(column)
            if value:
                attrs.append({"id": fid, "column": column, "value": value})
                if column == "def":
                    attrs.append({"id": fid, "column": "def.xrefs", "value": node["columns"]["def.xrefs"]})
                break
    if attrs:
        result["nodeAttrs"] = attrs
    if edges:
        result["edgeChecks"] = [{"source": s, "target": t} for s, _, t, _ in edges[:3]]
        single = [(s, r, t, q) for s, r, t, q in edges if pairs[(s, t)] == 1]
        checks = [{"source": s, "target": t, "column": "relation", "value": r} for s, r, t, _ in single[:3]]
        qualified = [(s, t, q) for s, _, t, q in single if q][:1]
        checks += [{"source": s, "target": t, "column": "qualifiers", "value": q} for s, t, q in qualified]
        if checks:
            result["edgeAttrs"] = checks
    return result


# the columns compute() checks on the first node that carries each (def brings def.xrefs along)
COLUMN_CHECKS = ("def", "synonym", "xref", "xref.descriptions", "subset", "alt_id", "intersection_of", "property_value")


PURL = "http://purl.obolibrary.org/obo/"
SHORTHAND = "http://www.geneontology.org/formats/oboInOwl#shorthand"
BUILTIN = {"is_a": "is_a", "subPropertyOf": "is_a", "type": "instance_of", "inverseOf": "inverse_of"}


def compact(iri):
    """The OBO 1.4 IRI rule, read backwards: .../obo/GO_0008150 is GO:0008150, .../obo/go#x is x."""
    if not iri.startswith(PURL):
        return iri
    rest = iri[len(PURL):]
    if "#" in rest:
        head, local = rest.split("#", 1)
        return local if local and "/" not in head else iri
    if "_" not in rest or "/" in rest or rest.index("_") == 0 or rest.endswith("_"):
        return iri
    prefix, local = rest.split("_", 1)
    return prefix + ":" + local


def graph_name(g):
    for key in ("id", "label", "lbl"):
        if isinstance(g, dict) and isinstance(g.get(key), str):
            return g[key]
    return None


def obographs(doc):
    """Nodes and edges of the first graph of an OBO Graphs document (typedefs "metadata")."""
    graphs = doc["graphs"]
    g = graphs[0]
    nodes_in = [n for n in g.get("nodes") or [] if isinstance(n, dict) and isinstance(n.get("id"), str)]
    properties = {n["id"] for n in nodes_in if n.get("type") == "PROPERTY"}
    shorthand = {}
    for n in nodes_in:
        for pv in (n.get("meta") or {}).get("basicPropertyValues") or []:
            if n["id"] in properties and pv.get("pred") == SHORTHAND:
                shorthand[n["id"]] = pv["val"]

    def ident(iri):
        return shorthand.get(iri) or compact(iri)

    nodes, labels = [], []
    for n in nodes_in:
        if n["id"] in properties or ident(n["id"]) in nodes:
            continue
        nodes.append(ident(n["id"]))
        if isinstance(n.get("lbl"), str):
            labels.append(n["lbl"])
    edges, placeholders = [], []
    for e in g.get("edges") or []:
        sub = e.get("sub", e.get("subj"))
        obj, pred = e.get("obj"), e.get("pred")
        if not isinstance(sub, str) or not isinstance(obj, str):
            continue
        if pred in ("subPropertyOf", "inverseOf") or sub in properties or obj in properties:
            continue
        for end in (sub, obj):
            if ident(end) not in nodes and ident(end) not in placeholders:
                placeholders.append(ident(end))
        relation = BUILTIN.get(pred) or shorthand.get(pred) or compact(pred)
        edges.append((ident(sub), relation, ident(obj)))
    pairs = collections.Counter((s, t) for s, _, t in edges)
    result = {
        "outcome": "pass",
        "nodes": len(nodes) + len(placeholders),
        "edges": len(edges),
        "directed": True,
        "nodeIds": (nodes[:4] + placeholders[:1])[:5],
    }
    if labels:
        result["labels"] = labels[:3]
    if edges:
        result["edgeChecks"] = [{"source": s, "target": t} for s, _, t in edges[:3]]
        single = [(s, r, t) for s, r, t in edges if pairs[(s, t)] == 1][:3]
        if single:
            result["edgeAttrs"] = [{"source": s, "target": t, "column": "relation", "value": r} for s, r, t in single]
    if len(graphs) > 1:
        result["graphs"] = len(graphs)
        result["graphNames"] = [graph_name(x) for x in graphs]
    return result
