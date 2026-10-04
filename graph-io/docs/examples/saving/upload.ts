import { exportGraphToBlob, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

// your server's upload endpoint
const body = new FormData();
body.append("file", await exportGraphToBlob(snapshot, "gexf"), "got.gexf");
await fetch("https://example.com/api/graphs", { method: "POST", body });
