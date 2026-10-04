import { GraphFormatError, listFormats, loadFromFile } from "@graphty/graph-io";

// <input type="file" id="graph-file">
const input = document.querySelector("#graph-file");
const extensions = listFormats()
    .filter((f) => f.canImport)
    .flatMap((f) => f.extensions);
input.accept = [...new Set(extensions)].join(",");

input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) {
        return;
    }
    try {
        const { snapshot, report } = await loadFromFile(file);
        if (snapshot.nodeCount === 0) {
            // a text file that is not a graph can still read as an empty CSV table
            console.error(`${file.name} holds no graph`);
            return;
        }
        console.log(`${file.name}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
        if (report.errorCount > 0) {
            console.warn(`${report.errorCount} elements could not be read and were skipped`);
        }
    } catch (err) {
        if (err instanceof GraphFormatError) {
            console.error(`Could not read ${file.name}: ${err.message}`);
        } else {
            throw err;
        }
    }
});
