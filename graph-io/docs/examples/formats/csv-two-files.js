import { GraphFormatError, loadFromFile } from "@graphty/graph-io";

// <input type="file" id="tables" accept=".csv" multiple>: the user picks the edge and node tables together
const input = document.querySelector("#tables");
input.multiple = true;

input.addEventListener("change", async () => {
    const files = [...input.files];
    // tell the tables apart by name; a node table has no source and target columns
    const nodes = files.find((f) => /node/i.test(f.name));
    const edges = files.find((f) => f !== nodes);
    if (!edges) {
        console.error("pick the edge table");
        return;
    }
    try {
        // the node table goes in the `nodes` option, as a File like the edge table
        const { snapshot } = await loadFromFile(edges, { nodes, defaultDirected: false });
        const label = snapshot.nodes.byRole("label");
        console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, first label ${label?.value(0)}`);
    } catch (err) {
        if (err instanceof GraphFormatError) {
            console.error(`Could not read the tables: ${err.message}`);
        } else {
            throw err;
        }
    }
});
