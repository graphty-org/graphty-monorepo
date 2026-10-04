import { exportGraphToBlob, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://graphty.app/docs/graph-io/samples/got-network.graphml");

// your server's upload endpoint
const body = new FormData();
body.append("file", await exportGraphToBlob(snapshot, "gexf"), "got.gexf");
await fetch("https://example.com/api/graphs", { method: "POST", body });
