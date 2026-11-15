/**
 * Three small styled files, one per drawing program's format, for the Style panel's stories and
 * tests with the file-styles experiment on. Each is loaded with its styles as a reader's file is:
 * `session.data.import({ type, name, config: { data } }, { styles: "file" })`.
 */

/** A yEd GraphML file: rounded rectangles with a border, a drop shadow and a labelled class, and edges with bends. */
export const YED_GRAPHML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
  <key attr.name="class" attr.type="string" for="node" id="d0"/>
  <key for="node" id="d1" yfiles.type="nodegraphics"/>
  <key attr.name="kind" attr.type="string" for="edge" id="d2"/>
  <key for="edge" id="d3" yfiles.type="edgegraphics"/>
  <graph edgedefault="directed" id="G">
${[
    ["n0", "Tool", "Parse", 0, 0],
    ["n1", "Input", "Source", 200, 0],
    ["n2", "Tool", "Check", 0, 120],
    ["n3", "Output", "Report", 200, 120],
]
    .map(
        ([id, kind, label, x, y]) => `    <node id="${id}">
      <data key="d0">${kind}</data>
      <data key="d1">
        <y:ShapeNode>
          <y:Geometry height="40.0" width="120.0" x="${x}" y="${y}"/>
          <y:Fill color="${kind === "Tool" ? "#FFCC00" : "#99CCFF"}" transparent="false"/>
          <y:BorderStyle color="#000000" type="line" width="1.0"/>
          <y:NodeLabel fontFamily="Dialog" fontSize="12" fontStyle="plain" modelName="internal" modelPosition="c" textColor="#000000" visible="true">${label}</y:NodeLabel>
          <y:Shape type="roundrectangle"/>
          <y:DropShadow color="#B3A691" offsetX="2" offsetY="2"/>
        </y:ShapeNode>
      </data>
    </node>`,
    )
    .join("\n")}
${[
    ["e0", "n0", "n1", "data"],
    ["e1", "n0", "n2", "control"],
    ["e2", "n2", "n3", "data"],
]
    .map(
        ([id, source, target, kind]) => `    <edge id="${id}" source="${source}" target="${target}">
      <data key="d2">${kind}</data>
      <data key="d3">
        <y:PolyLineEdge>
          <y:Path sx="0.0" sy="0.0" tx="0.0" ty="0.0">
            <y:Point x="100.0" y="60.0"/>
          </y:Path>
          <y:LineStyle color="#000000" type="line" width="1.0"/>
          <y:Arrows source="none" target="standard"/>
        </y:PolyLineEdge>
      </data>
    </edge>`,
    )
    .join("\n")}
  </graph>
</graphml>
`;

/** A Cytoscape CX2 network: a double line on some edges, edge width bound to a weight column, sized arrows. */
export const CYTOSCAPE_CX2 = JSON.stringify([
    { CXVersion: "2.0", hasFragments: false },
    {
        metaData: [
            { name: "attributeDeclarations", elementCount: 1 },
            { name: "nodes", elementCount: 4 },
            { name: "edges", elementCount: 4 },
            { name: "visualProperties", elementCount: 1 },
        ],
    },
    {
        attributeDeclarations: [
            { nodes: { name: { d: "string" } }, edges: { interaction: { d: "string" }, weight: { d: "double" } } },
        ],
    },
    {
        nodes: [0, 1, 2, 3].map((id) => ({
            id,
            x: (id % 2) * 160,
            y: Math.floor(id / 2) * 160,
            v: { name: `P${id}` },
        })),
    },
    {
        edges: [
            { id: 10, s: 0, t: 1, v: { interaction: "binds", weight: 1 } },
            { id: 11, s: 1, t: 2, v: { interaction: "binds", weight: 3 } },
            { id: 12, s: 2, t: 3, v: { interaction: "inhibits", weight: 2 } },
            { id: 13, s: 3, t: 0, v: { interaction: "binds", weight: 5 } },
        ],
    },
    {
        visualProperties: [
            {
                default: {
                    node: { NODE_SHAPE: "ellipse", NODE_BACKGROUND_COLOR: "#FFCC99", NODE_WIDTH: 40, NODE_HEIGHT: 40 },
                    edge: {
                        EDGE_LINE_COLOR: "#848484",
                        EDGE_LINE_STYLE: "solid",
                        EDGE_TARGET_ARROW_SHAPE: "triangle",
                        EDGE_TARGET_ARROW_SIZE: 6,
                        EDGE_SOURCE_ARROW_SHAPE: "none",
                    },
                },
                edgeMapping: {
                    EDGE_LINE_STYLE: {
                        type: "DISCRETE",
                        definition: {
                            attribute: "interaction",
                            type: "string",
                            map: [{ v: "inhibits", vp: "double" }],
                        },
                    },
                    EDGE_WIDTH: {
                        type: "PASSTHROUGH",
                        definition: { attribute: "weight", type: "double" },
                    },
                },
            },
        ],
    },
]);

/** A Graphviz DOT file: striped and wedged fills, a seven-sided polygon, a double ring and external labels. */
export const GRAPHVIZ_DOT = `digraph G {
  node [fontname="Times" fontsize=14];
  a [shape=polygon sides=7 orientation=15 label="Seven"];
  b [shape=box style=striped fillcolor="red:green:blue" label="Stripes"];
  c [shape=circle style=wedged fillcolor="gold:navy:gray" label="Wedges"];
  d [shape=doublecircle xlabel="outside" label="Ring"];
  a -> b; b -> c; c -> d; d -> a;
}
`;
