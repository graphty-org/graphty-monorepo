import { importGraph } from "@graphty/graph-io";

// Gephi's visual attributes, in the viz namespace
const gexf = `<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
  <graph defaultedgetype="undirected">
    <nodes>
      <node id="a" label="A">
        <viz:color r="255" g="0" b="0" a="0.5"/><viz:position x="1" y="2" z="0"/><viz:size value="4"/>
      </node>
      <node id="b" label="B"/>
    </nodes>
    <edges><edge source="a" target="b"><viz:thickness value="3"/></edge></edges>
  </graph>
</gexf>`;

const { snapshot } = await importGraph(gexf, { format: "gexf" });
// the columns viz makes, with node a's (and edge 0's) value
for (const [what, table] of [
    ["node", snapshot.nodes],
    ["edge", snapshot.edges],
] as const) {
    for (const name of table.names()) {
        const value = table.value(name, 0);
        const shown = ArrayBuffer.isView(value) ? Array.from(value as Float32Array) : value;
        console.log(`${what} ${name}: ${JSON.stringify(shown)}`);
    }
}
