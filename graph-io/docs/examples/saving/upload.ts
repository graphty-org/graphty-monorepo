import { exportGraphToBlob, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://example.com/data/karate.gml");

const body = new FormData();
body.append("file", await exportGraphToBlob(snapshot, "graphml"), "karate.graphml");
await fetch("https://example.com/api/graphs", { method: "POST", body });
