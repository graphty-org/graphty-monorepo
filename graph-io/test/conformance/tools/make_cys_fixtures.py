#!/usr/bin/env python3
"""Write the authored Cytoscape session fixtures (MIT, written for this suite).

Usage (from graph-io/):  python3 test/conformance/tools/make_cys_fixtures.py

Writes:
- test/conformance/fixtures/cys/authored/*.cys: a small 3.x session written from scratch (two
  registered subnetworks sharing nodes, CyCSV tables of every kind, virtual columns, two views,
  styles, app and global tables) and the container, table and session cases of
  design/graph-io/cytoscape-and-obo/research-session-and-style.md sections 7 and 9, each a
  variant of it; a small 2.x session (cysession.xml, one XGMML per network, selection and hidden
  state);
- test/corpus/cys/*.cys: the corpus the fidelity, fuzz and abort audits read;
- test/corpus/malformed/cys/*: the archives the importer must refuse (also written to authored/,
  where the manifest names the code each one fails with).

The design proposed deriving the container cases from the CC0 tutorials session galFiltered.cys;
a session written from scratch is just as freely licensed and keeps each case a few kilobytes.

Every archive is written by the small zip writer below (not Python's zipfile), so the flags,
methods, data descriptors, sizes and CRCs of each entry can be set the way the case needs.
The expectations live in fixtures/cys/manifest.json; this script only writes the files.
"""
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
GRAPH_IO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
AUTHORED = os.path.join(GRAPH_IO, "test", "conformance", "fixtures", "cys", "authored")
CORPUS = os.path.join(GRAPH_IO, "test", "corpus", "cys")
MALFORMED = os.path.join(GRAPH_IO, "test", "corpus", "malformed", "cys")

ROOT = "CytoscapeSession-2026_10_02-12_00/"
DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
NS = ('xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink" '
      'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cy="http://www.cytoscape.org" '
      'xmlns="http://www.cs.rpi.edu/XGMML"')


# ------------------------------------------------------------------------------- the zip writer

def deflate(data):
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return c.compress(data) + c.flush()


def make_zip(entries, zip64=False, prepend=b"", append=b"", comment=b""):
    """entries: list of dicts with name, data, and optional method (8), flags, descriptor,
    crc, size (overrides of what the directory states)."""
    body = bytearray()
    central = bytearray()
    for e in entries:
        name = e["name"].encode("utf-8")
        raw = e["data"] if isinstance(e["data"], bytes) else e["data"].encode("utf-8")
        method = e.get("method", 8)
        data = deflate(raw) if method == 8 else raw
        crc = e.get("crc", zlib.crc32(raw) & 0xFFFFFFFF)
        size = e.get("size", len(raw))
        descriptor = e.get("descriptor", True)
        flags = e.get("flags", 0) | (8 if descriptor else 0)
        offset = len(body)
        body += struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, flags, method, 0, 0x5A21,
                            0 if descriptor else crc, 0 if descriptor else len(data),
                            0 if descriptor else size, len(name), 0)
        body += name + data
        if descriptor:
            body += struct.pack("<IIII", 0x08074B50, crc, len(data), size)
        extra = struct.pack("<HHQQQ", 1, 24, size, len(data), offset) if zip64 else b""
        central += struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 45, 20, flags, method, 0, 0x5A21, crc,
                               0xFFFFFFFF if zip64 else len(data), 0xFFFFFFFF if zip64 else size,
                               len(name), len(extra), 0, 0, 0, 0, 0xFFFFFFFF if zip64 else offset)
        central += name + extra
    cd_offset = len(body)
    out = bytearray(body + central)
    n = len(entries)
    if zip64:
        record = len(out)
        out += struct.pack("<IQHHIIQQQQ", 0x06064B50, 44, 45, 45, 0, 0, n, n, len(central), cd_offset)
        out += struct.pack("<IIQI", 0x07064B50, 0, record, 1)
        out += struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, 0xFFFF, 0xFFFF, 0xFFFFFFFF, 0xFFFFFFFF, len(comment))
    else:
        out += struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, n, n, len(central), cd_offset, len(comment))
    return bytes(prepend) + bytes(out) + comment + bytes(append)


# ------------------------------------------------------------------------------- the base session

def cell(text):
    return '"' + text.replace('"', '""') + '"'


def cytable(columns, types, rows, title, version=1, options=None):
    lines = []
    if version is not None:
        lines.append(f'"CyCSV-Version",{cell(str(version))}')
    lines.append(",".join(cell(c) for c in columns))
    lines.append(",".join(cell(t) for t in types))
    if version == 1:
        lines.append(",".join(cell(o) for o in (options or [""] * len(columns))))
    lines.append(f"{cell(title)},{cell('')}")
    for row in rows:
        lines.append(",".join(cell(v) for v in row))
    return "\n".join(lines) + "\n"


L, S, I, D, B = "java.lang.Long", "java.lang.String", "java.lang.Integer", "java.lang.Double", "java.lang.Boolean"


def lst(t):
    return f"java.util.List<{t}>"


NODE = "org.cytoscape.model.CyNode"
EDGE = "org.cytoscape.model.CyEdge"
NET = "org.cytoscape.model.CyNetwork"

NETWORK_XGMML = (
    f'{DECL}<graph id="10" label="Collection" cy:view="0" cy:registered="0" cy:documentVersion="3.0" {NS}>\n'
    '  <att>\n'
    '    <graph id="20" label="Alpha" cy:registered="1">\n'
    '      <node id="21" label="A"/>\n'
    '      <node id="22" label="B"/>\n'
    '      <node id="23" label="C"/>\n'
    '      <node id="26" label="Group G">\n'
    '        <att>\n'
    '          <graph id="50" label="50" cy:registered="0">\n'
    '            <node xlink:href="#21"/>\n'
    '            <node xlink:href="#22"/>\n'
    '          </graph>\n'
    '        </att>\n'
    '      </node>\n'
    '      <edge id="24" label="A (pp) B" source="21" target="22" cy:directed="1"/>\n'
    '      <edge id="25" label="B (pd) C" source="22" target="23" cy:directed="0"/>\n'
    '    </graph>\n'
    '  </att>\n'
    '  <att>\n'
    '    <graph id="30" label="Beta" cy:registered="1">\n'
    '      <node xlink:href="#21"/>\n'
    '      <node xlink:href="#22"/>\n'
    '      <node id="31" label="D">\n'
    '        <att><graph xlink:href="#20"/></att>\n'
    '      </node>\n'
    '      <edge xlink:href="#24"/>\n'
    '      <edge id="32" label="D (pp) A" source="31" target="21" cy:directed="1"/>\n'
    '    </graph>\n'
    '  </att>\n'
    '  <edge id="40" label="meta" source="26" target="23" cy:directed="1"/>\n'
    '</graph>\n'
)


def view_xgmml(view_id, network_id, positions, style="Sample Style", extra=""):
    nodes = "".join(
        f'  <node id="{view_id}{i}" label="v" cy:nodeId="{nid}">\n'
        f'    <graphics x="{x}" y="{y}" z="{z}" fill="#FF0000" type="ELLIPSE">\n'
        f'      <att name="z" value="{z}" type="string"/>\n'
        f'{lock if lock else ""}'
        f'    </graphics>\n  </node>\n'
        for i, (nid, x, y, z, lock) in enumerate(positions))
    return (f'{DECL}<graph id="{view_id}" label="view" cy:view="1" cy:networkId="{network_id}" '
            f'cy:visualStyle="{style}" cy:documentVersion="3.0" cy:rendererId="org.cytoscape.ding" {NS}>\n'
            '  <graphics>\n    <att name="NETWORK_TITLE" value="Alpha" type="string"/>\n'
            '    <att name="NETWORK_SCALE_FACTOR" value="1.5" type="string"/>\n  </graphics>\n'
            f'{nodes}{extra}</graph>\n')


LOCK = ('      <att name="lockedVisualProperties" type="list">\n'
        '        <att name="NODE_SHAPE" value="TRIANGLE" type="string" cy:type="String"/>\n'
        '      </att>\n')

VIEW_1 = view_xgmml(40, 20, [("21", "10.0", "20.0", "0.0", None), ("22", "30.5", "-40.0", "2.0", LOCK),
                             ("23", "50.0", "0.0", "0.0", None), ("26", "0.0", "0.0", "0.0", None)],
                    extra=('  <edge id="45" label="e" cy:edgeId="25">\n    <graphics>\n'
                           '      <att name="lockedVisualProperties" type="list">\n'
                           '        <att name="EDGE_WIDTH" value="5.0" type="string"/>\n'
                           '      </att>\n    </graphics>\n  </edge>\n'))
VIEW_2 = view_xgmml(41, 20, [("21", "1.0", "2.0", "0.0", None), ("22", "3.0", "4.0", "0.0", None)], style="Second")
VIEW_BETA = view_xgmml(42, 30, [("21", "-1.0", "-1.0", "0.0", None), ("31", "7.0", "8.0", "0.0", None)])

TABLES = {
    # the subnetwork Alpha's own tables
    "20-Alpha/LOCAL_ATTRS-org.cytoscape.model.CyNode-Alpha+default+node.cytable": cytable(
        ["SUID", "name", "selected", "score", "count", "big", "tags", "flags", "formula", "note"],
        [L, S, B, D, I, L, lst(S), lst(B), D, S],
        [["21", "A", "true", "1.5", "3", "9007199254740993", "x\ny", "true\nfalse", "=$score * 2", "line 1\nline 2"],
         ["22", "B", "false", "NaN", "", "12", "", "", "2.5", ""],
         ["23", "C", "false", "abc", "4", "", "only", "true", "", 'say "hi"'],
         ["26", "Group G", "false", "", "", "", "", "", "", ""]],
        "Alpha default node"),
    "20-Alpha/LOCAL_ATTRS-org.cytoscape.model.CyEdge-Alpha+default+edge.cytable": cytable(
        ["SUID", "name", "interaction", "selected"], [L, S, S, B],
        [["24", "A (pp) B", "pp", "true"], ["25", "B (pd) C", "pd", "false"]], "Alpha default edge"),
    "20-Alpha/LOCAL_ATTRS-org.cytoscape.model.CyNetwork-Alpha+default+network.cytable": cytable(
        ["SUID", "name", "selected"], [L, S, B], [["20", "Alpha", "true"]], "Alpha default network"),
    "20-Alpha/HIDDEN-org.cytoscape.model.CyNode-20+hidden+node.cytable": cytable(
        ["SUID", "__isGroup"], [L, B], [["26", "true"]], "20 hidden node"),
    "20-Alpha/HIDDEN-org.cytoscape.model.CyNetwork-20+hidden+network.cytable": cytable(
        ["SUID", "__layoutAlgorithm"], [L, S], [["20", "force-directed"]], "20 hidden network"),
    "20-Alpha/MYAPP-org.cytoscape.model.CyNode-MyApp+Node+Attributes.cytable": cytable(
        ["SUID", "appScore", "count"], [L, I, S], [["21", "7", "seven"], ["999", "1", "stale"]],
        "MyApp Node Attributes", options=["", "mutable", "mutable"]),
    # the subnetwork Beta's tables (schema version 0: no version line, no column options)
    "30-Beta/LOCAL_ATTRS-org.cytoscape.model.CyNode-Beta+default+node.cytable": cytable(
        ["SUID", "name", "selected"], [L, S, B], [["21", "A", "false"], ["22", "B", "false"], ["31", "D", "true"]],
        "Beta default node", version=None),
    "30-Beta/LOCAL_ATTRS-org.cytoscape.model.CyEdge-Beta+default+edge.cytable": cytable(
        ["SUID", "name", "interaction", "selected"], [L, S, S, B],
        [["24", "A (pp) B", "pp", "false"], ["32", "D (pp) A", "pp", "false"]], "Beta default edge", version=None),
    "30-Beta/LOCAL_ATTRS-org.cytoscape.model.CyNetwork-Beta+default+network.cytable": cytable(
        ["SUID", "name", "selected"], [L, S, B], [["30", "Beta", "false"]], "Beta default network", version=None),
    "30-Beta/HIDDEN-org.cytoscape.model.CyNetwork-30+hidden+network.cytable": cytable(
        ["SUID", "__parentNetwork.SUID"], [L, L], [["30", "20"]], "30 hidden network"),
    # the collection's shared tables and its own default tables
    "10-Collection/SHARED_ATTRS-org.cytoscape.model.CyNode-Collection+root+shared++node.cytable": cytable(
        ["SUID", "shared name", "count", "species"], [L, S, D, S],
        [["21", "A", "1.25", "yeast"], ["22", "B", "2.5", "yeast"], ["23", "C", "", "fly"], ["26", "Group G", "", ""],
         ["31", "D", "", "worm"]],
        "Collection root shared node"),
    "10-Collection/SHARED_ATTRS-org.cytoscape.model.CyEdge-Collection+root+shared++edge.cytable": cytable(
        ["SUID", "shared name", "shared interaction"], [L, S, S],
        [["24", "A (pp) B", "pp"], ["25", "B (pd) C", "pd"], ["32", "D (pp) A", "pp"], ["40", "meta", "meta"]],
        "Collection root shared edge"),
    "10-Collection/LOCAL_ATTRS-org.cytoscape.model.CyEdge-Collection+root+default++edge.cytable": cytable(
        ["SUID", "interaction", "name", "selected"], [L, S, S, B],
        [["24", "pp", "A (pp) B", "false"], ["25", "pd", "B (pd) C", "false"], ["32", "pp", "D (pp) A", "false"]],
        "Collection root default edge"),
    "global/60-Global+Table.cytable": cytable(["ID", "value"], [I, S], [["1", "x"]], "Global Table"),
}


def virtual(name, target, source, column):
    return (f'        <virtualColumn immutable="false" targetJoinKey="SUID" targetTable="{target}" '
            f'sourceJoinKey="SUID" sourceTable="{source}" sourceColumn="{column}" name="{name}"/>\n')


SHARED_NODE = "10-Collection/SHARED_ATTRS-org.cytoscape.model.CyNode-Collection+root+shared++node.cytable"
SHARED_EDGE = "10-Collection/SHARED_ATTRS-org.cytoscape.model.CyEdge-Collection+root+shared++edge.cytable"
ROOT_EDGE = "10-Collection/LOCAL_ATTRS-org.cytoscape.model.CyEdge-Collection+root+default++edge.cytable"
ALPHA_NODE = "20-Alpha/LOCAL_ATTRS-org.cytoscape.model.CyNode-Alpha+default+node.cytable"
ALPHA_EDGE = "20-Alpha/LOCAL_ATTRS-org.cytoscape.model.CyEdge-Alpha+default+edge.cytable"
BETA_NODE = "30-Beta/LOCAL_ATTRS-org.cytoscape.model.CyNode-Beta+default+node.cytable"


def cytables(extra=""):
    return (f'{DECL}<cyTables>\n    <virtualColumns>\n'
            + virtual("shared name", ALPHA_NODE, SHARED_NODE, "shared name")
            + virtual("species", ALPHA_NODE, SHARED_NODE, "species")
            # a shared column named like a local one: the local one keeps the name
            + virtual("count", ALPHA_NODE, SHARED_NODE, "count")
            + virtual("shared name", BETA_NODE, SHARED_NODE, "shared name")
            # a chain: Alpha's edge column comes from the root's default table, whose own column is virtual
            + virtual("shared interaction", ROOT_EDGE, SHARED_EDGE, "shared interaction")
            + virtual("shared interaction", ALPHA_EDGE, ROOT_EDGE, "shared interaction")
            + extra
            + '    </virtualColumns>\n    <tableViews/>\n</cyTables>\n')


VIZMAP = (f'{DECL}<vizmap id="VizMap-2026" documentVersion="3.1">\n'
          '  <visualStyle name="Sample Style">\n'
          '    <node><visualProperty name="NODE_FILL_COLOR" default="#CCCCCC">\n'
          '      <passthroughMapping attributeName="name" attributeType="string"/>\n'
          '    </visualProperty></node>\n  </visualStyle>\n</vizmap>\n')

NETWORK_LIST = (f'{DECL}<networkList>\n    <network order="0" id="10"/>\n    <network order="1" id="30"/>\n'
                '    <network order="2" id="20"/>\n</networkList>\n')


def base_entries(root=ROOT, cytables_xml=None, tables=None, network=NETWORK_XGMML, version="3.0.0",
                 views=None, network_list=NETWORK_LIST):
    entries = [{"name": f"{root}{version}.version", "data": "", "descriptor": True}]
    entries.append({"name": f"{root}networks/10-Collection.xgmml", "data": network})
    for path, data in (views if views is not None else [
            ("views/20-40-Alpha.xgmml", VIEW_1), ("views/20-41-Alpha.xgmml", VIEW_2),
            ("views/30-42-Beta.xgmml", VIEW_BETA)]):
        entries.append({"name": f"{root}{path}", "data": data})
    for path, data in (tables if tables is not None else TABLES).items():
        entries.append({"name": f"{root}tables/{path}", "data": data})
    entries.append({"name": f"{root}tables/cytables.xml", "data": cytables_xml or cytables()})
    entries.append({"name": f"{root}session_vizmap.xml", "data": VIZMAP})
    entries.append({"name": f"{root}properties/session_bookmarks.xml", "data": f"{DECL}<bookmarks/>\n"})
    if network_list is not None:
        entries.append({"name": f"{root}apps/org.cytoscape.swing-application/network_list.xml", "data": network_list})
    entries.append({"name": f"{root}apps/org.cytoscape.swing-application/session_state.xml", "data": f"{DECL}<sessionState/>\n"})
    return entries


BASE = make_zip(base_entries())


def with_entry(name_suffix, **changes):
    entries = base_entries()
    for e in entries:
        if e["name"].endswith(name_suffix):
            e.update(changes)
    return make_zip(entries)


def damaged_crc():
    data = bytearray(make_zip(base_entries()))
    # the stored CRC of the network entry in the central directory (and its descriptor)
    entries = base_entries()
    target = entries[1]
    raw = target["data"].encode("utf-8")
    crc = struct.pack("<I", zlib.crc32(raw) & 0xFFFFFFFF)
    bad = struct.pack("<I", (zlib.crc32(raw) + 1) & 0xFFFFFFFF)
    return bytes(data).replace(crc, bad)


# ------------------------------------------------------------------------------- the 2.x session

ROOT2 = "CytoscapeSession-2011_05_01-10_00/"
CYSESSION = (f'{DECL}<cysession documentVersion="0.9" id="CytoscapeSession-2011_05_01-10_00">\n'
             '    <sessionNote>authored for graph-io</sessionNote>\n'
             '    <networkTree>\n'
             '        <network visualStyle="default" viewAvailable="true" id="Main net" filename="Main net.xgmml">\n'
             '            <parent id="Network Root"/>\n'
             '            <child id="Main net--child"/>\n'
             '            <selectedNodes><node id="n1"/><node id="n3"/></selectedNodes>\n'
             '            <hiddenNodes><node id="n2"/></hiddenNodes>\n'
             '            <selectedEdges><edge id="n1 (pp) n2"/></selectedEdges>\n'
             '            <hiddenEdges><edge id="n2 (pp) n3"/></hiddenEdges>\n'
             '        </network>\n'
             '        <network visualStyle="Solid" viewAvailable="false" id="Main net--child" filename="Main net--child.xgmml">\n'
             '            <parent id="Main net"/>\n'
             '        </network>\n'
             '        <network visualStyle="default" viewAvailable="false" id="Gone" filename="Gone.xgmml">\n'
             '            <parent id="Network Root"/>\n'
             '        </network>\n'
             '        <network visualStyle="default" viewAvailable="false" id="Network Root" filename="Network Root.xgmml">\n'
             '            <parent id="NULL"/>\n'
             '        </network>\n'
             '    </networkTree>\n'
             '</cysession>\n')


def xgmml2(label, nodes, edges):
    body = "".join(
        f'  <node label="{n}" id="-{i + 1}"><att type="string" name="canonicalName" value="{n}"/>'
        f'<att type="real" name="score" value="{i}.5"/>'
        f'<graphics type="ELLIPSE" h="30.0" w="30.0" x="{10 * i}" y="{20 * i}" fill="#ff0000"/></node>\n'
        for i, n in enumerate(nodes))
    body += "".join(
        f'  <edge label="{a} (pp) {b}" source="-{nodes.index(a) + 1}" target="-{nodes.index(b) + 1}">'
        '<att type="string" name="interaction" value="pp"/></edge>\n'
        for a, b in edges)
    return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<graph label="{label}" {NS} directed="1">\n'
            '  <att name="documentVersion" value="1.1"/>\n'
            '  <att type="string" name="backgroundColor" value="#ffffff"/>\n'
            f'{body}</graph>\n')


SESSION_2X = make_zip([
    {"name": f"{ROOT2}Main+net--child.xgmml", "data": xgmml2("Main net--child", ["n1", "n2"], [("n1", "n2")])},
    {"name": f"{ROOT2}Main+net.xgmml", "data": xgmml2("Main net", ["n1", "n2", "n3"], [("n1", "n2"), ("n2", "n3")])},
    {"name": f"{ROOT2}Orphan.xgmml", "data": xgmml2("Orphan", ["z"], [])},
    {"name": f"{ROOT2}cysession.xml", "data": CYSESSION},
    {"name": f"{ROOT2}session_vizmap.props", "data": "nodeAppearanceCalculator.default.defaultNodeShape=ellipse\n"},
    {"name": f"{ROOT2}session_cytoscape.props", "data": "defaultVisualStyle=default\n"},
    {"name": f"{ROOT2}plugins/SomePlugin/state.props", "data": "x=1\n"},
])

PRERELEASE = make_zip([
    {"name": f"{ROOT2}net.xgmml", "data": xgmml2("net", ["a"], [])},
    {"name": f"{ROOT2}cysession.xml", "data": CYSESSION.replace('documentVersion="0.9"', 'documentVersion="3.0"')},
])


def renamed_root(root):
    return make_zip(base_entries(root=root))


def two_roots():
    second = [dict(e, name=e["name"].replace(ROOT, "CytoscapeSession-2026_10_03-09_00/")) for e in base_entries()]
    return make_zip(base_entries() + second)


def noise():
    entries = base_entries()
    entries.insert(0, {"name": ROOT, "data": "", "method": 0, "descriptor": False})
    entries.insert(1, {"name": f"{ROOT}networks/", "data": "", "method": 0, "descriptor": False})
    entries.append({"name": f"__MACOSX/{ROOT}._3.0.0.version", "data": b"\x00\x05\x16\x07resourcefork", "method": 0})
    entries.append({"name": f"{ROOT}.DS_Store", "data": b"\x00\x00\x00\x01Bud1"})
    entries.append({"name": f"{ROOT}session_thumbnail.png", "data": b"\x89PNG\r\n\x1a\n"})
    return make_zip(entries)


def stored():
    return make_zip([dict(e, method=0) for e in base_entries()])


def duplicate():
    entries = base_entries()
    copy = dict(entries[1], data=entries[1]["data"].replace('label="Alpha"', 'label="Imposter"'))
    entries.insert(2, copy)
    return make_zip(entries)


def ratio_bomb():
    entries = base_entries()
    padding = " " * (40 * 1024 * 1024)
    entries[1] = dict(entries[1], data=NETWORK_XGMML.replace("</graph>\n", f"{padding}</graph>\n")[::1])
    return make_zip(entries)


def tables_with(changes):
    tables = dict(TABLES)
    tables.update(changes)
    return make_zip(base_entries(tables=tables))


AUTHORED_FILES = {
    # the base session and its readable variants
    "base-3x.cys": BASE,
    "zip64.cys": make_zip(base_entries(), zip64=True),
    "stored-with-descriptor.cys": stored(),
    "trailing-junk.cys": make_zip(base_entries(), append=b"JUNK AFTER THE ARCHIVE" * 3),
    "self-extracting-stub.cys": make_zip(base_entries(), prepend=b"#!/bin/sh\necho stub\nexit 0\n" + b"\x00" * 64),
    "archive-comment.cys": make_zip(base_entries(), comment=b"saved by a tool that writes a comment" * 10),
    "duplicate-entry.cys": duplicate(),
    "no-root-folder.cys": renamed_root(""),
    "two-root-folders.cys": two_roots(),
    "macosx-noise.cys": noise(),
    "no-network-list.cys": make_zip(base_entries(network_list=None)),
    "no-views.cys": make_zip(base_entries(views=[])),
    "utf8-entry-names.cys": make_zip([dict(e, flags=0x800) for e in base_entries(root="CytoscapeSession-caf\u00e9/")]),
    # tables
    "cycsv-unknown-version.cys": tables_with({ALPHA_NODE: TABLES[ALPHA_NODE].replace('"CyCSV-Version","1"', '"CyCSV-Version","7"')}),
    "cycsv-unknown-class.cys": tables_with({ALPHA_NODE: TABLES[ALPHA_NODE].replace('"java.lang.Double","java.lang.Integer"', '"java.awt.Color","java.lang.Integer"')}),
    "cycsv-bad-rows.cys": tables_with({
        "20-Alpha/LOCAL_ATTRS-org.cytoscape.model.CyEdge-Alpha+default+edge.cytable": cytable(
            ["SUID", "name", "interaction", "selected"], [L, S, S, B],
            [["24", "A (pp) B", "pp", "true"], ["24", "repeat", "xx", "false"], ["25", "B (pd) C"],
             ["777", "stale", "x", "false"]], "Alpha default edge")
        + '"25","B (pd) C","pd","false","extra cell"\n'}),
    "virtual-column-broken.cys": make_zip(base_entries(cytables_xml=cytables(
        virtual("ghost", ALPHA_NODE, "10-Collection/NOPE.cytable", "x")
        + virtual("missing column", ALPHA_NODE, SHARED_NODE, "no such column")
        + virtual("loop a", ALPHA_EDGE, ALPHA_EDGE, "loop b")
        + virtual("loop b", ALPHA_EDGE, ALPHA_EDGE, "loop a")))),
    "table-for-missing-network.cys": tables_with({
        "99-Gone/LOCAL_ATTRS-org.cytoscape.model.CyNode-Gone+default+node.cytable": cytable(
            ["SUID", "name"], [L, S], [["1", "x"]], "Gone default node")}),
    # the network file and views
    "dangling-href.cys": make_zip(base_entries(network=NETWORK_XGMML.replace('<node xlink:href="#22"/>\n      <node id="31"', '<node xlink:href="#404"/>\n      <node id="31"'))),
    "view-for-missing-network.cys": make_zip(base_entries(views=[
        ("views/20-40-Alpha.xgmml", VIEW_1), ("views/77-78-Nowhere.xgmml", view_xgmml(78, 77, [("1", "0", "0", "0", None)]))])),
    "edge-outside-network.cys": make_zip(base_entries(network=NETWORK_XGMML.replace(
        '<edge id="32" label="D (pp) A" source="31" target="21" cy:directed="1"/>',
        '<edge id="32" label="D (pp) C" source="31" target="23" cy:directed="1"/>'))),
    # sessions of other eras
    "session-2x.cys": SESSION_2X,
}

MALFORMED_FILES = {
    "not-a-zip.cys": b"this is a text file, not a session\n",
    "empty.cys": b"",
    "truncated.cys": BASE[: len(BASE) // 2],
    "no-end-record.cys": BASE[: BASE.rfind(b"PK\x05\x06")],
    "crc-mismatch.cys": damaged_crc(),
    "encrypted.cys": with_entry("networks/10-Collection.xgmml", flags=1),
    "deflate64.cys": with_entry("networks/10-Collection.xgmml", method=9),
    "bzip2.cys": with_entry("networks/10-Collection.xgmml", method=12),
    "version-4.cys": make_zip(base_entries(version="4.0.0")),
    "not-a-session.zip": make_zip([{"name": "graph.graphml", "data": '<?xml version="1.0"?><graphml/>'},
                                   {"name": "readme.txt", "data": "hello"}]),
    "prerelease-3.0.cys": PRERELEASE,
    "ratio-bomb.cys": ratio_bomb(),
    "network-not-xml.cys": with_entry("networks/10-Collection.xgmml", data="<graph><node id='1'></graph>"),
}

def karate_session():
    """Zachary's karate club (test/corpus/gml/karate.gml) as a 3.x session: one subnetwork, its
    node and edge tables and a view, so the audits have a session with dozens of edges."""
    import re
    with open(os.path.join(GRAPH_IO, "test", "corpus", "gml", "karate.gml"), encoding="utf-8") as f:
        gml = f.read()
    nodes = [int(n) for n in re.findall(r"node\s*\[\s*id (\d+)", gml)]
    edges = [(int(a), int(b)) for a, b in re.findall(r"edge\s*\[\s*source (\d+)\s*target (\d+)", gml)]
    suid = {n: 100 + n for n in nodes}
    body = "".join(f'      <node id="{suid[n]}" label="{n}"/>\n' for n in nodes)
    body += "".join(f'      <edge id="{200 + i}" label="{a} (interacts with) {b}" source="{suid[a]}" target="{suid[b]}" cy:directed="0"/>\n'
                    for i, (a, b) in enumerate(edges))
    network = (f'{DECL}<graph id="1" label="Karate" cy:view="0" cy:registered="0" cy:documentVersion="3.0" {NS}>\n'
               f'  <att>\n    <graph id="2" label="karate" cy:registered="1">\n{body}    </graph>\n  </att>\n</graph>\n')
    view = view_xgmml(3, 2, [(str(suid[n]), str(10.0 * n), str(5.0 * (n % 7)), "0.0", None) for n in nodes], style="default")
    node_table = cytable(["SUID", "name", "club"], [L, S, S],
                         [[str(suid[n]), str(n), "Mr. Hi" if n < 18 else "Officer"] for n in nodes], "karate default node")
    edge_table = cytable(["SUID", "name", "interaction"], [L, S, S],
                         [[str(200 + i), f"{a} (interacts with) {b}", "interacts with"] for i, (a, b) in enumerate(edges)],
                         "karate default edge")
    return make_zip([
        {"name": f"{ROOT}3.0.0.version", "data": ""},
        {"name": f"{ROOT}networks/1-Karate.xgmml", "data": network},
        {"name": f"{ROOT}views/2-3-karate.xgmml", "data": view},
        {"name": f"{ROOT}tables/2-karate/LOCAL_ATTRS-org.cytoscape.model.CyNode-karate+default+node.cytable", "data": node_table},
        {"name": f"{ROOT}tables/2-karate/LOCAL_ATTRS-org.cytoscape.model.CyEdge-karate+default+edge.cytable", "data": edge_table},
        {"name": f"{ROOT}session_vizmap.xml", "data": VIZMAP},
    ])


CORPUS_FILES = {
    "karate-3x.cys": karate_session(),
    "authored-3x.cys": BASE,
    "authored-2x.cys": SESSION_2X,
}


def write(directory, files):
    os.makedirs(directory, exist_ok=True)
    for name, data in files.items():
        with open(os.path.join(directory, name), "wb") as f:
            f.write(data)


def main():
    # the archives the importer refuses are conformance fixtures (with their expected code) and
    # the malformed corpus of the fuzz audits alike
    write(AUTHORED, {**AUTHORED_FILES, **MALFORMED_FILES})
    write(CORPUS, CORPUS_FILES)
    write(MALFORMED, MALFORMED_FILES)
    print(f"{len(AUTHORED_FILES)} authored fixtures, {len(CORPUS_FILES)} corpus files, "
          f"{len(MALFORMED_FILES)} malformed files")


if __name__ == "__main__":
    main()
