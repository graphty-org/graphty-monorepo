#!/usr/bin/env python3
"""Write the authored OBO and OBO Graphs conformance fixtures.

Usage (from graph-io/):  python3 test/conformance/tools/make_obo_fixtures.py

Writes fixtures/obo/authored/*.obo and fixtures/json/obographs/authored/*.json, byte for byte.
The OBO cases are the 44 reader probes of the OBO research (research-obo.md section 5, one case
per row of its reader-behavior table) plus the cases section 10 #23 asks to generate: Instance
frames (the 1.4 guide's john / heather example), the OBO 1.0 legacy tags, UTF-16 and windows-1252
encodings, truncated files, form feed and lone CR line ends, and the error rows of section 6 that
no real file shows. Their expectations are in fixtures/obo/manifest.json: from fastobo through
oracle_obo.py where fastobo reads the file, hand-written from the specification ("oracle":
"spec") where it does not. Authored content, MIT like the package.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(os.path.dirname(HERE), "fixtures")
OBO_DIR = os.path.join(FIXTURES, "obo", "authored")
JSON_DIR = os.path.join(FIXTURES, "json", "obographs", "authored")

H = "format-version: 1.4\nontology: test\n\n"

# the 44 probes of research-obo.md section 5 (tmp/samples-obo/scripts/probe.py)
PROBES = {
    "minimal": H + "[Term]\nid: X:1\nname: a\n\n[Term]\nid: X:2\nis_a: X:1 ! a\n",
    "no_header": "[Term]\nid: X:1\n",
    "empty": "",
    "no_blank_between_frames": H + "[Term]\nid: X:1\n[Term]\nid: X:2\nis_a: X:1\n",
    "dangling_isa": H + "[Term]\nid: X:1\nis_a: X:99\n",
    "undeclared_relation": H + "[Term]\nid: X:1\nrelationship: part_of X:2\n\n[Term]\nid: X:2\n",
    "duplicate_frame_merge": H + "[Term]\nid: X:1\nname: a\n\n[Term]\nid: X:1\nis_a: X:2\n\n[Term]\nid: X:2\n",
    "same_id_term_and_typedef": H + "[Term]\nid: R:1\n\n[Typedef]\nid: R:1\n",
    "two_names": H + "[Term]\nid: X:1\nname: a\nname: b\n",
    "missing_id": H + "[Term]\nname: a\n",
    "id_not_first": H + "[Term]\nname: a\nid: X:1\n",
    "unknown_tag": H + "[Term]\nid: X:1\nfoo_bar: baz\n",
    "unknown_stanza": H + "[Annotation]\nid: X:1\n",
    "unknown_header_tag": "format-version: 1.4\nmy-tag: x\n\n[Term]\nid: X:1\n",
    "escapes": H + '[Term]\nid: X:1\nname: a\\nb \\! c \\{d\\} \\W e\ndef: "q \\"x\\" y" []\n',
    "qualifiers": H
    + '[Term]\nid: X:1\nrelationship: part_of X:2 {cardinality="2", gci_relation="part_of", gci_filler="T:1"} ! two\n\n'
    + "[Term]\nid: X:2\n\n[Typedef]\nid: part_of\n",
    "unquoted_qualifier": H + "[Term]\nid: X:1\nis_a: X:2 {source=PMID:1}\n\n[Term]\nid: X:2\n",
    "synonym_forms": H
    + '[Term]\nid: X:1\nsynonym: "s1" EXACT []\nsynonym: "s2" BROAD UK_SPELLING [A:1, B:2 "desc"]\n'
    + 'synonym: "s3" []\nexact_synonym: "s4" []\n',
    "bad_synonym_scope": H + '[Term]\nid: X:1\nsynonym: "s1" WRONG []\n',
    "def_without_xrefs": H + '[Term]\nid: X:1\ndef: "text"\n',
    "unterminated_quote": H + '[Term]\nid: X:1\ndef: "text []\n',
    "obsolete": H + "[Term]\nid: X:1\nis_obsolete: true\nreplaced_by: X:2\nconsider: X:3\n\n[Term]\nid: X:2\n\n[Term]\nid: X:3\n",
    "bad_bool": H + "[Term]\nid: X:1\nis_obsolete: yes\n",
    "intersection_union": H
    + "[Term]\nid: X:1\nintersection_of: X:2\nintersection_of: part_of X:3\n\n[Term]\nid: X:4\nunion_of: X:2\n"
    + "union_of: X:3\n\n[Term]\nid: X:2\n\n[Term]\nid: X:3\n\n[Typedef]\nid: part_of\n",
    "single_intersection": H + "[Term]\nid: X:1\nintersection_of: X:2\n\n[Term]\nid: X:2\n",
    "instance": H
    + '[Term]\nid: C:1\n\n[Instance]\nid: I:1\ninstance_of: C:1\nproperty_value: shoe_size "8" xsd:positiveInteger\n'
    + "relationship: knows I:2\n\n[Instance]\nid: I:2\n",
    "property_value_forms": H
    + '[Term]\nid: X:1\nproperty_value: IAO:0000589 "label" xsd:string\nproperty_value: seeAlso X:2\n'
    + 'property_value: foo "1.5"  xsd:decimal {q="1"}\n',
    "url_ids": H + "[Term]\nid: http://example.org/a\nis_a: https://example.org/b\n\n[Term]\nid: https://example.org/b\n",
    "unprefixed_ids": H + "[Term]\nid: alpha\nis_a: beta\n\n[Term]\nid: beta\n",
    "crlf": (H + "[Term]\nid: X:1\nname: a\n").replace("\n", "\r\n"),
    "bom": "\ufeff" + H + "[Term]\nid: X:1\n",
    "trailing_ws_and_tabs": H + "[Term]  \nid:\tX:1   \nname:   a  \t\n",
    "header_after_frame": H + "[Term]\nid: X:1\n\nformat-version: 1.2\n",
    "date_formats": "format-version: 1.4\nontology: test\ndate: 17:04:2012 15:38\n\n"
    + "[Term]\nid: X:1\ncreation_date: 2009-04-13T01:32:36Z\n\n[Term]\nid: X:2\ncreation_date: 2009-04-13\n",
    "bad_date": "format-version: 1.4\ndate: 2012-04-17\n\n[Term]\nid: X:1\n",
    "self_loop_and_parallel": H
    + "[Term]\nid: X:1\nis_a: X:1\nis_a: X:2\nis_a: X:2\nrelationship: part_of X:2\n\n[Term]\nid: X:2\n\n"
    + "[Typedef]\nid: part_of\n",
    "typedef_props": H
    + "[Typedef]\nid: part_of\nname: part of\nis_transitive: true\ninverse_of: has_part\ntransitive_over: part_of\n"
    + "holds_over_chain: part_of part_of\nequivalent_to_chain: part_of part_of\ndomain: X:1\nrange: X:2\n"
    + "is_a: overlaps\nxref: BFO:0000050\n\n[Typedef]\nid: has_part\n\n[Typedef]\nid: overlaps\n",
    "owl_axioms_header": "format-version: 1.4\nontology: t\nowl-axioms: Prefix(:=<http://x/>)\n\n[Term]\nid: X:1\n",
    "comment_line_inside_frame": H + "[Term]\nid: X:1\n! a comment line\nname: a\n",
    "backslash_continuation": H + "[Term]\nid: X:1\nname: a \\\n b\n",
    "non_ascii": H + "[Term]\nid: X:1\nname: caf\u00e9 \u03b1\n",
    "relationship_three_values": H + "[Term]\nid: X:1\nrelationship: part_of X:2 X:3\n",
    "header_import": "format-version: 1.4\nontology: t\nimport: http://purl.obolibrary.org/obo/bfo.owl\n\n[Term]\nid: X:1\n",
    "treat_xrefs_macros": "format-version: 1.4\nontology: t\ntreat-xrefs-as-is_a: CL\ntreat-xrefs-as-equivalent: UBERON\n\n"
    + "[Term]\nid: X:1\nxref: CL:0000001\n",
}

# research-obo.md section 10 #23 and the section 6 rows no real file shows
EXTRA = {
    # the 1.4 guide's Instance example (no surveyed real file has an Instance frame)
    "instance_john_heather": "format-version: 1.4\nontology: people\n\n"
    + "[Term]\nid: person\nname: person\n\n[Typedef]\nid: married_to\nname: married to\nis_symmetric: true\n\n"
    + "[Typedef]\nid: shoe_size\nname: shoe size\nis_metadata_tag: true\n\n"
    + '[Instance]\nid: john\nname: John Day\ninstance_of: person\nproperty_value: shoe_size "8" xsd:positiveInteger\n'
    + "relationship: married_to heather\n\n"
    + '[Instance]\nid: heather\nname: Heather Day\ninstance_of: person\nproperty_value: shoe_size "6" xsd:positiveInteger\n'
    + "relationship: married_to john\n",
    # OBO 1.0: typeref, version, the four synonym tags, xref_analog / xref_unknown, use_term
    "legacy_1_0": "format-version: GO_1.0\nversion: 3.1\ntyperef: relationship.obo\ndate: 02:06:2004 12:00\n"
    + "saved-by: curator\n\n[Term]\nid: GO:0000001\nname: old term\nexact_synonym: \"e\" [A:1]\n"
    + 'related_synonym: "r" []\nnarrow_synonym: "n" []\nbroad_synonym: "b" []\nxref_analog: B:1\n'
    + "xref_unknown: C:1\nis_obsolete: true\nuse_term: GO:0000002\n\n[Term]\nid: GO:0000002\nname: new term\n",
    # line ends the 1.4 grammar counts and LineReader does not split on its own
    "form_feed": H + "[Term]\nid: X:1\fname: a\f\f[Term]\nid: X:2\nis_a: X:1\n",
    "cr_only": (H + "[Term]\nid: X:1\n[Term]\nid: X:2\nis_a: X:1\n").replace("\n", "\r"),
    # truncated files: mid-line, mid-quote, mid-frame (the last complete clause is kept)
    "truncated_mid_line": H + "[Term]\nid: X:1\nname: a\n\n[Term]\nid: X:2\nis_a: X:1\nname: cut in the mid",
    "truncated_mid_quote": H + '[Term]\nid: X:1\ndef: "a definition cut in the mid',
    # a frame header cut before its closing bracket is not a header: a line without a colon
    "truncated_mid_frame": H + "[Term]\nid: X:1\n\n[Term]\nid: X:2\nis_a: X:1\n\n[Term",
    "second_id_clause": H + "[Term]\nid: X:1\nid: X:9\nname: a\n",
    "qualifier_not_a_block": H + "[Term]\nid: X:1\nname: set {a}\ncomment: see P{GawB} here\n",
    "qualifier_forms": H
    + '[Term]\nid: X:1\nis_a: X:2 {a="1"}{b="2"}\nis_a: X:3 {a="1",b="x, y"}\n'
    + 'relationship: part_of X:2 {http://purl.obolibrary.org/obo/IAO_0010000="ax"}\n'
    + 'is_a: X:3 {a="1",b="x, y"}\n\n[Term]\nid: X:2\n\n[Term]\nid: X:3\n\n[Typedef]\nid: part_of\n',
    "alt_id_target": H + "[Term]\nid: X:1\nalt_id: X:7\n\n[Term]\nid: X:2\nis_a: X:7\n",
    "obsolete_with_edges": H + "[Term]\nid: X:1\nis_obsolete: true\nis_a: X:2\n\n[Term]\nid: X:2\nreplaced_by: X:1\n",
    "relation_by_xref": H + "[Term]\nid: X:1\nrelationship: BFO:0000050 X:2\n\n[Term]\nid: X:2\n\n"
    + "[Typedef]\nid: part_of\nxref: BFO:0000050\n",
    "relationship_in_typedef": H + "[Typedef]\nid: part_of\nrelationship: inverse_of has_part\n\n[Typedef]\nid: has_part\n\n"
    + "[Term]\nid: X:1\nrelationship: part_of X:2\n\n[Term]\nid: X:2\n",
    "definitional_expression": H + "[Term]\nid: X:1\nis_a: GO:0005737^part_of(CL:0000023)\n",
    "id_mapping_headers": "format-version: 1.2\ndefault-relationship-id-prefix: OBO_REL\nid-mapping: part_of BFO:0000050\n"
    + "idspace: GO http://purl.obolibrary.org/obo/GO_ \"Gene Ontology\"\n\n[Term]\nid: X:1\n",
    "synonym_type_scope": "format-version: 1.2\nsynonymtypedef: systematic \"Systematic\" EXACT\n\n"
    + '[Term]\nid: X:1\nsynonym: "a" systematic []\nsynonym: "c" NARROW systematic []\nsynonym: "d" []\n',
    "language_tag": H + "[Term]\nid: X:1\nname: chat@fr\n",
    "unknown_escape": H + "[Term]\nid: X:1\nname: a\\zb\\(c\\)\n",
    "header_only": "format-version: 1.2\nremark: no frames in this file\n",
    "comments_only": "! a file of comments\n! and nothing else\n",
    "id_kind_clash_instance": H + "[Term]\nid: X:1\nname: term\n\n[Instance]\nid: X:1\nname: instance\n",
    # the two OBO options, read with them in the manifest
    "typedefs_as_nodes": H + "[Term]\nid: X:1\nrelationship: part_of X:2\n\n[Term]\nid: X:2\n\n"
    + "[Typedef]\nid: part_of\nname: part of\nis_transitive: true\nis_a: overlaps\n\n[Typedef]\nid: overlaps\n",
    "obsolete_dropped": H + "[Term]\nid: X:1\nis_obsolete: true\nreplaced_by: X:2\n\n[Term]\nid: X:2\nis_a: X:1\n\n"
    + "[Term]\nid: X:3\nis_a: X:2\n",
}

# encodings: the same text as bytes
ENCODED = {
    "utf16le_bom": ("\ufeff" + H + "[Term]\nid: X:1\nname: caf\u00e9\n").encode("utf-16-le"),
    "utf16be_bom": ("\ufeff" + H + "[Term]\nid: X:1\nname: caf\u00e9\n").encode("utf-16-be"),
    "windows1252": (H + "[Term]\nid: X:1\nname: caf\u00e9 \u201cquoted\u201d\n").encode("cp1252"),
}

# OBO Graphs JSON cases (fixtures/json/obographs/authored)
PURL = "http://purl.obolibrary.org/obo/"
JSON_CASES = {
    # the README's outdated edge key
    "subj_key": {
        "graphs": [
            {
                "id": PURL + "test.owl",
                "nodes": [
                    {"id": PURL + "X_1", "lbl": "one", "type": "CLASS"},
                    {"id": PURL + "X_2", "lbl": "two", "type": "CLASS"},
                ],
                "edges": [{"subj": PURL + "X_2", "pred": "is_a", "obj": PURL + "X_1"}],
            }
        ]
    },
    # two graphs: import() reads the first, listGraphs() names both
    "two_graphs": {
        "graphs": [
            {"id": PURL + "a.owl", "nodes": [{"id": PURL + "A_1", "lbl": "a", "type": "CLASS"}]},
            {
                "id": PURL + "b.owl",
                "nodes": [
                    {"id": PURL + "B_1", "lbl": "b1", "type": "CLASS"},
                    {"id": PURL + "B_2", "lbl": "b2", "type": "CLASS"},
                ],
                "edges": [{"sub": PURL + "B_2", "pred": "is_a", "obj": PURL + "B_1"}],
            },
        ]
    },
    # an edge endpoint missing from nodes: a placeholder node
    "dangling_endpoint": {
        "graphs": [
            {
                "nodes": [{"id": PURL + "X_1", "lbl": "one", "type": "CLASS"}],
                "edges": [{"sub": PURL + "X_1", "pred": "is_a", "obj": PURL + "UBERON_0000001"}],
            }
        ]
    },
}


def main():
    os.makedirs(OBO_DIR, exist_ok=True)
    os.makedirs(JSON_DIR, exist_ok=True)
    for name, text in {**PROBES, **EXTRA}.items():
        with open(os.path.join(OBO_DIR, name + ".obo"), "wb") as f:
            f.write(text.encode("utf-8"))
    for name, data in ENCODED.items():
        with open(os.path.join(OBO_DIR, name + ".obo"), "wb") as f:
            f.write(data)
    for name, doc in JSON_CASES.items():
        with open(os.path.join(JSON_DIR, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2, ensure_ascii=True)
            f.write("\n")
    print(f"{len(PROBES) + len(EXTRA) + len(ENCODED)} OBO and {len(JSON_CASES)} OBO Graphs fixtures written")


if __name__ == "__main__":
    main()
