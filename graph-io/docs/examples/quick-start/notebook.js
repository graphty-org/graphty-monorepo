// A notebook cell or a <script type="module">: nothing to install
import { loadFromUrl } from "https://esm.sh/@graphty/graph-io";

const { snapshot, format, report } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-edges.csv",
    // a CSV edge table without a Type column does not say; without this the graph is directed
    { defaultDirected: false },
);
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, directed: ${snapshot.directed}`);
for (const issue of report.issues) {
    console.log(`${issue.code} (line ${issue.line ?? "-"}): ${issue.message}`);
}
