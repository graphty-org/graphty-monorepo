import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// A GraphML file with one directed and one undirected edge
const graphml = `<graphml><graph edgedefault="undirected">
  <node id="1"/><node id="2"/><node id="3"/>
  <edge source="1" target="2" directed="true"/>
  <edge source="2" target="3"/>
</graph></graphml>`;
const { snapshot } = await importGraph(graphml, { format: "graphml" });

// GML holds one direction per file
console.log(checkExport(snapshot, "gml").map((n) => n.code));
console.log(await exportGraphToString(snapshot, "gml", { onMixedDirection: "directed" }));
