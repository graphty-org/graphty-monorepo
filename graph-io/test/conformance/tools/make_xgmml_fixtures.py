#!/usr/bin/env python3
"""Write the authored XGMML fixtures (MIT, written for this suite).

Usage (from graph-io/):  python3 test/conformance/tools/make_xgmml_fixtures.py

Writes:
- test/conformance/fixtures/xgmml/authored/*.xgmml: the XGMML 1.0 draft examples D.1 to D.4
  re-authored from the specification's structure (no prose copied), the edge cases of
  design/graph-io/cytoscape-and-obo/research-xgmml.md section 7 #22, and session network and view
  equivalents of Cytoscape's subnetworks.cys and nestedGroups_expanded.cys (whose repository states
  no license, so their structure is reproduced, not their bytes);
- test/corpus/xgmml/*.xgmml: the small corpus the format tests and the fidelity audits read;
- test/corpus/malformed/xgmml/*: the files the importer must refuse.

The expectations live in fixtures/xgmml/manifest.json ("oracle": "spec"); this script only
writes the files. Rerun it after changing it and commit its output.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GRAPH_IO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
AUTHORED = os.path.join(GRAPH_IO, "test", "conformance", "fixtures", "xgmml", "authored")
CORPUS = os.path.join(GRAPH_IO, "test", "corpus", "xgmml")
MALFORMED = os.path.join(GRAPH_IO, "test", "corpus", "malformed", "xgmml")

DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
NS = ('xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink" '
      'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cy="http://www.cytoscape.org" '
      'xmlns="http://www.cs.rpi.edu/XGMML"')
DOCTYPE_PUBLIC = ('<!DOCTYPE graph PUBLIC "-//John Punin//DTD graph description//EN" '
                  '"http://www.cs.rpi.edu/~puninj/XGMML/xgmml.dtd">\n')


def cy3(body, root='id="1" label="Network" directed="1" cy:documentVersion="3.0"'):
    return f"{DECL}<graph {root} {NS}>\n{body}</graph>\n"


def draft(body, root='id="1" label="Draft"'):
    return f'<?xml version="1.0"?>\n{DOCTYPE_PUBLIC}<graph {root}>\n{body}</graph>\n'


AUTHORED_FILES = {
    # ------------------------------------------------------------- the draft's examples
    "draft-d1-simple.xgmml": draft(
        '  <node id="1" label="node 1" weight="0"/>\n'
        '  <node id="2" label="node 2" weight="0"/>\n'
        '  <node id="3" label="node 3" weight="0"/>\n'
        '  <edge source="1" target="2" weight="0"/>\n'
        '  <edge source="2" target="3" weight="0"/>\n',
        root='id="1" label="Simple" directed="1" Vendor="graph-io" Layout="points" graphic="1"',
    ),
    "draft-d2-attributes.xgmml": draft(
        '  <att name="description" value="typed attributes of the draft" type="string"/>\n'
        '  <node id="1" label="A">\n'
        '    <att name="size" value="12" type="integer"/>\n'
        '    <att name="score" value="0.5" type="real"/>\n'
        '    <att name="tags" type="list"><att value="x" type="string"/><att value="y" type="string"/></att>\n'
        '  </node>\n'
        '  <node id="2" label="B"><att name="size" value="7" type="integer"/></node>\n'
        '  <edge source="1" target="2" label="A-B"><att name="kind" value="link"/></edge>\n',
        root='id="2" label="Attributes" directed="0"',
    ),
    "draft-d3-multigraph.xgmml": draft(
        '  <node id="1" label="1" weight="-1"><graphics type="rhombus" x="20" y="30"/></node>\n'
        '  <node id="2" label="2" weight="-1"><graphics type="circle" x="60" y="30"/></node>\n'
        '  <node id="3" label="3" weight="-1"><graphics type="box" x="40" y="80"/></node>\n'
        '  <edge source="1" target="1" weight="0"/>\n'
        '  <edge source="1" target="3" weight="0"/>\n'
        '  <edge source="1" target="3" weight="2"/>\n'
        '  <edge source="2" target="3" weight="0"/>\n',
        root='id="3" label="Self-loop and parallel edges" directed="1"',
    ),
    "draft-d4-subgraphs.xgmml": draft(
        '  <node id="1" label="cluster 1">\n'
        '    <att><graph id="g1" label="inside 1">\n'
        '      <node id="11" label="11"/><node id="12" label="12"/>\n'
        '      <edge source="11" target="12"/>\n'
        '    </graph></att>\n'
        '  </node>\n'
        '  <node id="2" label="cluster 2">\n'
        '    <att><graph id="g2" label="inside 2"><node id="21" label="21"/></graph></att>\n'
        '  </node>\n'
        '  <edge source="12" target="21"/>\n'
        '  <edge source="1" target="2"/>\n',
        root='id="4" label="Subgraphs"',
    ),
    # ------------------------------------------------------------- ids, nodes and edges
    "ids-numeric-spellings.xgmml": cy3(
        '  <node id="1" label="one"/>\n  <node id="01" label="zero one"/>\n  <node id=" 1 " label="spaced"/>\n'
        '  <node id="-1" label="minus"/>\n'
        '  <edge source="1" target="01" cy:directed="1"/>\n  <edge source="01" target=" 1 " cy:directed="1"/>\n'),
    "node-without-id-and-label.xgmml": cy3(
        '  <node label="labelled only"/>\n  <node><att name="x" value="1" type="integer"/></node>\n'
        '  <node id="b" label="B"/>\n'),
    "duplicate-node-id.xgmml": cy3(
        '  <node id="a" label="A"><att name="x" value="1" type="integer" cy:type="Integer"/></node>\n'
        '  <node id="a" label="A again"><att name="x" value="2" type="integer" cy:type="Integer"/>'
        '<att name="y" value="kept" type="string" cy:type="String"/></node>\n'),
    "duplicate-edge-id.xgmml": cy3(
        '  <node id="a"/><node id="b"/>\n'
        '  <edge id="e" source="a" target="b" cy:directed="1"/>\n  <edge id="e" source="b" target="a" cy:directed="1"/>\n'),
    "dangling-endpoint.xgmml": cy3(
        '  <node id="a"/>\n  <edge id="e1" source="a" target="ghost" cy:directed="1"/>\n'),
    "missing-target.xgmml": cy3(
        '  <node id="a" label="A"/>\n  <edge id="e1" label="no alias here" source="a" cy:directed="1"/>\n'),
    "label-alias.xgmml": cy3(
        '  <node id="1" label="YAL001"/>\n  <node id="2" label="YAL002"/>\n'
        '  <edge id="e1" label="YAL001 (pp) YAL002" cy:directed="1"/>\n'
        '  <edge id="e2" label="1 (pd) 2" source="99" target="2" cy:directed="1"/>\n'),
    "edge-before-nodes.xgmml": cy3(
        '  <edge id="e" source="-1" target="-2" cy:directed="1"/>\n  <node id="-1" label="one"/>\n  <node id="-2" label="two"/>\n'),
    "directed-true.xgmml": draft(
        '  <node id="a"/><node id="b"/>\n  <edge source="a" target="b"/>\n', root='id="t" directed="true"'),
    "directed-bad.xgmml": draft(
        '  <node id="a"/><node id="b"/>\n  <edge source="a" target="b"/>\n', root='id="t" directed="2"'),
    "mixed-direction.xgmml": cy3(
        '  <node id="a"/><node id="b"/><node id="c"/>\n'
        '  <edge id="d" source="a" target="b" cy:directed="1"/>\n  <edge id="u" source="b" target="c" cy:directed="0"/>\n'
        '  <edge id="t" source="c" target="a" cy:directed="true"/>\n'),
    "no-namespace.xgmml": '<graph label="bare">\n  <node id="a"/>\n  <node id="b"/>\n  <edge source="a" target="b"/>\n</graph>\n',
    "prefixed-root.xgmml": ('<xgmml:graph xmlns:xgmml="http://www.cs.rpi.edu/XGMML" label="prefixed">\n'
                            '  <xgmml:node id="a"/><xgmml:node id="b"/>\n  <xgmml:edge source="a" target="b"/>\n</xgmml:graph>\n'),
    "empty-graph.xgmml": "<graph/>\n",
    "one-line.xgmml": (f'<graph {NS} directed="1">' + "".join(f'<node id="n{i}"/>' for i in range(300))
                       + "".join(f'<edge source="n{i}" target="n{i + 1}"/>' for i in range(299)) + "</graph>"),
    "unknown-wrapper.xgmml": cy3(
        '  <foo><node id="inside"/></foo>\n  <desc>a description</desc>\n  <node id="a"/>\n'),
    # ------------------------------------------------------------- attribute values
    "integer-overflow.xgmml": cy3(
        '  <node id="a"><att name="n" value="2147483648" type="integer"/></node>\n'
        '  <node id="b"><att name="n" value="7" type="integer"/></node>\n'),
    "real-specials.xgmml": cy3(
        '  <node id="a"><att name="r" value="1e400" type="real" cy:type="Double"/></node>\n'
        '  <node id="b"><att name="r" value="NaN" type="real" cy:type="Double"/></node>\n'
        '  <node id="c"><att name="r" value="-Infinity" type="real" cy:type="Double"/></node>\n'
        '  <node id="d"><att name="r" value=" 5.373E-8 " type="real" cy:type="Double"/></node>\n'),
    "bad-values.xgmml": cy3(
        '  <node id="a"><att name="i" value="abc" type="integer"/><att name="r" value="1.0d" type="real"/>'
        '<att name="h" value="0x1p3" type="real"/></node>\n'
        '  <node id="b"><att name="i" value=" 5 " type="integer"/><att name="r" value="2.5" type="real"/></node>\n'),
    "booleans.xgmml": cy3(
        '  <node id="a"><att name="b" value="yes" type="boolean"/></node>\n'
        '  <node id="b"><att name="b" value="TRUE" type="boolean"/></node>\n'
        '  <node id="c"><att name="b" value="0" type="boolean"/></node>\n'
        '  <node id="d"><att name="b" value="2" type="boolean"/></node>\n'),
    "document-version-unparseable.xgmml": cy3('  <node id="a"/>\n', root='id="v" cy:documentVersion="3.x"'),
    "mixed-list.xgmml": cy3(
        '  <node id="a"><att name="m" type="list"><att value="1" type="integer"/><att value="x" type="string"/></att></node>\n'),
    "record-list.xgmml": draft(
        '  <node id="a"><att name="person" type="list">'
        '<att name="name" value="John" type="string"/><att name="ssn" value="123" type="string"/>'
        '<att name="e-mail" value="j@example.org" type="string"/></att></node>\n'),
    "list-of-lists.xgmml": cy3(
        '  <node id="a"><att name="lol" type="list"><att type="list"><att value="1" type="integer"/></att>'
        '<att type="list"><att value="2" type="integer"/></att></att></node>\n'),
    "map-2x.xgmml": (f'{DECL}<graph label="maps" {NS} directed="1">\n  <att name="documentVersion" value="1.1"/>\n'
                     '  <node id="-1" label="a"><att name="m" type="map"><att name="k" value="v" type="string"/>'
                     '<att name="n" value="2" type="integer"/></att></node>\n</graph>\n'),
    "rdf-in-node.xgmml": draft(
        '  <node id="a"><att name="card"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" '
        'xmlns:v="http://www.w3.org/2006/vcard/ns#"><rdf:Description rdf:about="#a"><v:fn>A &amp; B</v:fn>'
        '</rdf:Description></rdf:RDF></att></node>\n'),
    "equation.xgmml": cy3(
        '  <node id="a"><att name="x" value="-3" type="real" cy:type="Double"/>'
        '<att name="absx" value="=ABS($x)" type="string" cy:type="String" cy:equation="1"/></node>\n'),
    "literal-escapes.xgmml": cy3(
        '  <node id="a"><att name="text" value="line one\\nline two\\tend" type="string" cy:type="String"/></node>\n'),
    "hidden-spellings.xgmml": cy3(
        '  <node id="a"><att name="h1" value="x" type="string" cy:hidden="true"/>'
        '<att name="h2" value="x" type="string" cy:hidden="TRUE"/><att name="h3" value="x" type="string" cy:hidden="yes"/>'
        '<att name="v" value="x" type="string" cy:hidden="0"/></node>\n'),
    "malformed-atts.xgmml": cy3(
        '  <node id="a">\n    <att name="l" type="list" value="ignored"><att value="x" type="string"/></att>\n'
        '    <att name="s" type="string" value="v"><att value="child" type="string"/></att>\n'
        '    <att type="string" value="nameless"/>\n  </node>\n'),
    "unknown-type-and-duplicate-att.xgmml": cy3(
        '  <node id="a"><att name="f" value="1.5" type="float"/><att name="d" value="1" type="string"/>'
        '<att name="d" value="2" type="string"/></node>\n'),
    "empty-lists.xgmml": cy3(
        '  <att name="untyped" type="list"/>\n  <att name="typed" type="list" cy:elementType="String"/>\n'
        '  <att name="childless" type="list"><att type="string"/></att>\n'
        '  <att name="one_empty_string" type="list"><att value="" type="string"/></att>\n'),
    # ------------------------------------------------------------- graphics
    "center-and-line.xgmml": draft(
        '  <node id="a"><graphics type="oval"><center x="1" y="2" z="3"/></graphics></node>\n'
        '  <node id="b"><graphics type="oval"><center x="4" y="5" z="6"/></graphics></node>\n'
        '  <edge source="a" target="b"><graphics width="1"><Line><point x="1" y="2"/><point x="4" y="5"/></Line></graphics></edge>\n'),
    "two-graphics.xgmml": cy3(
        '  <node id="a"><graphics x="1" y="1" fill="#000000"/><graphics y="2" fill="#111111"/></node>\n'),
    "graphics-3x.xgmml": cy3(
        '  <graphics><att name="NETWORK_SCALE_FACTOR" value="0.67" type="string"/>'
        '<att name="NETWORK_BACKGROUND_PAINT" value="#FFFFFF" type="string"/></graphics>\n'
        '  <node id="a" label="A"><graphics type="ELLIPSE" x="10" y="20" z="32768" w="40" h="40" fill="#EFF5FC">'
        '<att name="NODE_LABEL" value="A" type="string"/><att name="lockedVisualProperties" type="list">'
        '<att name="NODE_SHAPE" value="TRIANGLE" type="string"/></att></graphics></node>\n'
        '  <node id="b" label="B"><graphics type="ELLIPSE" x="-5" y="0" z="0"/></node>\n'
        '  <edge id="e" source="a" target="b" cy:directed="1"><graphics width="2.0" fill="#999999">'
        '<att name="EDGE_BEND" value="" type="string"/></graphics></edge>\n'),
    # ------------------------------------------------------------- nested graphs
    "edge-nested-graph.xgmml": cy3(
        '  <node id="a"/>\n  <edge id="e" source="a" target="a" cy:directed="1"><att><graph><node id="nowhere"/></graph></att></edge>\n'),
    "unresolved-href.xgmml": draft(
        '  <node id="a"/>\n  <att><graph id="s"><node xlink:href="#ghost" xmlns:xlink="http://www.w3.org/1999/xlink"/></graph></att>\n'),
    "cross-file-href.xgmml": cy3(
        '  <node id="a" label="A"><att><graph xlink:href="other.xgmml#223"/></att></node>\n'),
    "pointer-cycle-3x.xgmml": cy3(
        '  <node id="1" label="Node 1"><att><graph id="200" label="Nb" cy:registered="1">\n'
        '    <node id="6" label="Node 6"><att><graph xlink:href="#100"/></att></node>\n'
        '  </graph></att></node>\n  <node id="2" label="Node 2"/>\n'
        '  <edge id="9" label="Node 1 (pp) Node 2" source="1" target="2" cy:directed="1"/>\n',
        root='id="100" label="Na" directed="1" cy:documentVersion="3.0"'),
    "group-cycle.xgmml": draft(
        '  <node id="a"><att><graph><node id="b"><att><graph><node xlink:href="#a" '
        'xmlns:xlink="http://www.w3.org/1999/xlink"/></graph></att></node></graph></att></node>\n'),
    "group-multi-parent-3x.xgmml": cy3(
        '  <node id="g1" label="G1"><att name="__isGroup" value="1" type="boolean" cy:type="Boolean" cy:hidden="1"/>'
        '<att><graph id="sg1"><node id="m" label="M"/></graph></att></node>\n'
        '  <node id="g2" label="G2"><att name="__isGroup" value="1" type="boolean" cy:type="Boolean" cy:hidden="1"/>'
        '<att><graph id="sg2"><node xlink:href="#m"/></graph></att></node>\n'),
    "root-subgraphs.xgmml": draft(
        '  <att><graph id="s1"><node id="a"/></graph></att>\n  <node id="b"/>\n'
        '  <att><graph id="s2"><node xlink:href="#a" xmlns:xlink="http://www.w3.org/1999/xlink"/>'
        '<node xlink:href="#b" xmlns:xlink="http://www.w3.org/1999/xlink"/></graph></att>\n'),
    # ------------------------------------------------------------- session documents
    "session-network-subnetworks.xgmml": (
        f'{DECL}<graph id="155" label="Set 1" cy:view="0" cy:registered="0" cy:documentVersion="3.0" {NS}>\n'
        '  <att>\n    <graph id="171" label="Na" cy:registered="1">\n'
        '      <node id="183" label="Node 1"><att><graph xlink:href="207-Set+2.xgmml#223"/></att></node>\n'
        '      <node id="182" label="Node 2"/>\n'
        '      <node id="181" label="Node 3"><att><graph xlink:href="#186"/></att></node>\n'
        '      <edge id="185" label="Node 1 (interaction) Node 2" source="183" target="182" cy:directed="1"/>\n'
        '      <edge id="184" label="Node 2 (interaction) Node 3" source="182" target="181" cy:directed="1"/>\n'
        '    </graph>\n  </att>\n'
        '  <att>\n    <graph id="186" label="Na.1" cy:registered="1">\n'
        '      <node xlink:href="#181"/>\n      <node xlink:href="#182"/>\n'
        '      <node id="196" label="Node 4"><att><graph xlink:href="#197"/></att></node>\n'
        '      <edge xlink:href="#184"/>\n      <edge id="199" label="Node 4 (interaction) Node 4" source="196" target="196" cy:directed="1"/>\n'
        '    </graph>\n  </att>\n'
        '  <att>\n    <graph id="197" label="Na.1.1" cy:registered="1">\n      <node xlink:href="#196"/>\n'
        '    </graph>\n  </att>\n</graph>\n'),
    "session-network-nested-groups.xgmml": (
        f'{DECL}<graph id="36" label="Network" cy:view="0" cy:registered="0" cy:documentVersion="3.0" {NS}>\n'
        '  <att>\n    <graph id="52" label="Network" cy:registered="1">\n'
        '      <node id="62" label="G1"><att><graph id="63" label="63" cy:registered="0">\n'
        '        <node id="74" label="Node 2"/>\n        <node id="73" label="Node 1"/>\n'
        '        <edge id="75" label="Node 1 (interaction) Node 2" source="73" target="74" cy:directed="1"/>\n'
        '      </graph></att></node>\n'
        '      <node id="76" label="G2"><att><graph id="77" label="77" cy:registered="0">\n'
        '        <node xlink:href="#62"/>\n        <node id="87" label="Node 3"/>\n'
        '        <edge id="88" label="meta-null" source="62" target="87" cy:directed="1"/>\n'
        '      </graph></att></node>\n'
        '      <node xlink:href="#73"/>\n      <node xlink:href="#74"/>\n      <node xlink:href="#87"/>\n'
        '      <node id="89" label="Node 4"/>\n      <edge xlink:href="#75"/>\n'
        '      <edge id="92" label="Node 2 (interaction) Node 3" source="74" target="87" cy:directed="1"/>\n'
        '      <edge id="91" label="Node 3 (interaction) Node 4" source="87" target="89" cy:directed="1"/>\n'
        '    </graph>\n  </att>\n'
        '  <edge id="90" label="meta-null" source="76" target="89" cy:directed="1"/>\n'
        '  <edge id="93" label="93" source="62" target="89" cy:directed="1"/>\n</graph>\n'),
    "session-view.xgmml": (
        f'{DECL}<graph id="82" label="Na" cy:view="1" cy:networkId="52" cy:visualStyle="default" cy:documentVersion="3.0" {NS}>\n'
        '  <graphics><att name="NETWORK_TITLE" value="Na" type="string"/></graphics>\n'
        '  <node id="84" label="Node 1" cy:nodeId="64"><graphics z="0.0" x="-188.1" y="32.5"><att name="z" value="0.0" type="string"/></graphics></node>\n'
        '  <node id="86" label="Node 3" cy:nodeId="62"><graphics z="0.0" x="171.8" y="50.5">'
        '<att name="lockedVisualProperties" type="list"><att name="NODE_SHAPE" value="TRIANGLE" type="string"/></att></graphics></node>\n'
        '  <edge id="88" label="Node 2 (interaction) Node 3" cy:edgeId="65"><graphics><att name="lockedVisualProperties" type="list">'
        '<att name="EDGE_WIDTH" value="5.0" type="string"/></att></graphics></edge>\n</graph>\n'),
    # ------------------------------------------------------------- XML layer
    "latin1-declared.xgmml": ('<?xml version="1.0" encoding="ISO-8859-1"?>\n<graph label="caf\xe9">\n'
                              '  <node id="caf\xe9" label="na\xefve"/>\n</graph>\n').encode("latin-1"),
    "latin1-undeclared.xgmml": '<graph label="x">\n  <node id="caf\xe9"/>\n</graph>\n'.encode("latin-1"),
    "utf16-bom.xgmml": ("\ufeff" + cy3('  <node id="a" label="\u00e9t\u00e9"/>\n')).encode("utf-16-le"),
    "surrogate-pairs-repaired.xgmml": cy3('  <node id="a" label="smile &#xd83d;&#xde00;"/>\n'),
    "bare-ampersands-repaired.xgmml": cy3(
        '  <att type="string" name="&net_att_1" value="&ABC"/>\n'
        '  <node label="node1" id="1"><att type="string" name="node_att_$1" value="CDE&" /></node>\n'),
    "external-dtd.xgmml": ('<?xml version="1.0"?>\n<!DOCTYPE graph SYSTEM "file:///etc/passwd">\n'
                           '<graph label="never fetched">\n  <node id="a"/>\n</graph>\n'),
    "xhtml-embedded.xgmml": ('<html xmlns="http://www.w3.org/1999/xhtml" xmlns:xgmml="http://www.cs.rpi.edu/XGMML">\n'
                             '<body><p>A graph:</p><xgmml:graph label="embedded"><xgmml:node id="a"/></xgmml:graph></body></html>\n'),
}

MALFORMED_FILES = {
    "empty.xgmml": "",
    "whitespace-only.xgmml": "   \n\t\n",
    "truncated.xgmml": cy3('  <node id="a" label="A"/>\n  <node id="b" label="B"/>\n')[:-40],
    "not-xml.xgmml": "this is not XML at all\n",
    "billion-laughs.xgmml": ('<?xml version="1.0"?>\n<!DOCTYPE graph [\n <!ENTITY a "aaaaaaaaaa">\n'
                             ' <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">\n <!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">\n]>\n'
                             '<graph label="&c;"><node id="a"/></graph>\n'),
    "external-entity.xgmml": ('<?xml version="1.0"?>\n<!DOCTYPE graph [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n'
                              '<graph label="&xxe;"><node id="a"/></graph>\n'),
    "undeclared-entity.xgmml": cy3('  <node id="a" label="&nbsp;"/>\n'),
    "surrogate-pairs.xgmml": cy3('  <node id="a" label="smile &#xd83d;&#xde00;"/>\n'),
    "lone-surrogate.xgmml": cy3('  <node id="a" label="half &#xd83d;"/>\n'),
    "control-reference.xgmml": cy3('  <node id="a" label="bell &#x1;"/>\n'),
    "bare-ampersands.xgmml": cy3('  <att type="string" name="&net_att_1" value="&ABC"/>\n  <node id="1"/>\n'),
    "mismatched-tags.xgmml": cy3('  <node id="a"></edge>\n'),
    "not-a-graph.xgmml": '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph/></graphml>\n',
    "view-document.xgmml": AUTHORED_FILES["session-view.xgmml"],
    "missing-edge-target.xgmml": cy3('  <node id="a"/>\n  <edge id="e" source="a" cy:directed="1"/>\n'),
    "dangling-edge.xgmml": cy3('  <node id="a"/>\n  <edge id="e" source="a" target="b" cy:directed="1"/>\n'),
    "node-without-id.xgmml": cy3('  <node><att name="x" value="1" type="integer"/></node>\n  <node id="b"/>\n'),
    "bad-integer.xgmml": cy3('  <node id="a"><att name="i" value="abc" type="integer"/></node>\n'),
}

CORPUS_FILES = {
    "cytoscape3-small.xgmml": cy3(
        '  <att name="name" value="small" type="string" cy:type="String"/>\n'
        '  <node id="1" label="A"><att name="name" value="A" type="string" cy:type="String"/>'
        '<att name="score" value="0.5" type="real" cy:type="Double"/><att name="degree" value="2" type="integer" cy:type="Integer"/>'
        '<graphics type="ELLIPSE" x="10" y="20" z="0" fill="#FF0000"/></node>\n'
        '  <node id="2" label="B"><att name="name" value="B" type="string" cy:type="String"/>'
        '<att name="score" value="1.5" type="real" cy:type="Double"/><att name="degree" value="1" type="integer" cy:type="Integer"/>'
        '<graphics type="ELLIPSE" x="30" y="40" z="0" fill="#00FF00"/></node>\n'
        '  <node id="3" label="C"><att name="name" value="C" type="string" cy:type="String"/>'
        '<att name="degree" value="1" type="integer" cy:type="Integer"/><graphics type="RECTANGLE" x="50" y="0" z="0"/></node>\n'
        '  <edge id="4" label="A (pp) B" source="1" target="2" cy:directed="1"><att name="interaction" value="pp" type="string" cy:type="String"/></edge>\n'
        '  <edge id="5" label="A (pd) C" source="1" target="3" cy:directed="1"><att name="interaction" value="pd" type="string" cy:type="String"/></edge>\n'),
    "draft-weighted.xgmml": AUTHORED_FILES["draft-d3-multigraph.xgmml"],
    "groups-2x.xgmml": (
        f'{DECL}<graph label="Network 0" {NS} directed="1">\n  <att name="documentVersion" value="1.1"/>\n'
        '  <node label="node0" id="-1"><att type="string" name="canonicalName" value="node0"/></node>\n'
        '  <node label="node1" id="-2"><att type="string" name="canonicalName" value="node1"/></node>\n'
        '  <node label="node2" id="-3"><att type="string" name="canonicalName" value="node2"/></node>\n'
        '  <node label="metanode 1" id="-4"><att type="integer" name="__groupState" value="1" cy:hidden="true"/>\n'
        '    <att><graph><att type="string" name="gr_att_1" value="Lorem Ipsum"/>\n'
        '      <node xlink:href="#-2"/><node xlink:href="#-1"/>\n'
        '      <edge label="node0 (DirectedEdge) node1" source="-1" target="-2"/>\n'
        '    </graph></att>\n  </node>\n'
        '  <edge label="node0 (DirectedEdge) node1" source="-1" target="-2"><att type="string" name="interaction" value="DirectedEdge"/></edge>\n'
        '  <edge label="node1 (DirectedEdge) node2" source="-2" target="-3"><att type="string" name="interaction" value="DirectedEdge"/></edge>\n'
        '</graph>\n'),
}


def karate():
    """Zachary's karate club (test/corpus/gml/karate.gml, Newman's copy) as a Cytoscape 3 export."""
    import re
    with open(os.path.join(GRAPH_IO, "test", "corpus", "gml", "karate.gml"), encoding="utf-8") as f:
        gml = f.read()
    nodes = re.findall(r"node\s*\[\s*id (\d+)", gml)
    edges = re.findall(r"edge\s*\[\s*source (\d+)\s*target (\d+)", gml)
    body = "".join(f'  <node id="{n}" label="{n}"><att name="name" value="{n}" type="string" cy:type="String"/></node>\n'
                   for n in nodes)
    body += "".join(f'  <edge id="e{i}" label="{a} (interacts with) {b}" source="{a}" target="{b}" cy:directed="0">'
                    '<att name="interaction" value="interacts with" type="string" cy:type="String"/></edge>\n'
                    for i, (a, b) in enumerate(edges))
    return cy3(body)


CORPUS_FILES["karate.xgmml"] = karate()


def write(directory, files):
    os.makedirs(directory, exist_ok=True)
    for name, content in files.items():
        data = content if isinstance(content, bytes) else content.encode("utf-8")
        with open(os.path.join(directory, name), "wb") as f:
            f.write(data)


def main():
    write(AUTHORED, AUTHORED_FILES)
    write(CORPUS, CORPUS_FILES)
    write(MALFORMED, MALFORMED_FILES)
    print(f"{len(AUTHORED_FILES)} authored fixtures, {len(CORPUS_FILES)} corpus files, "
          f"{len(MALFORMED_FILES)} malformed files")


if __name__ == "__main__":
    main()
