import { GraphFormatError, listFormats, loadFromFile } from "@graphty/graph-io";

const input = document.querySelector("#graph-file") as HTMLInputElement;
input.accept = listFormats()
    .filter((f) => f.canImport)
    .flatMap((f) => f.extensions)
    .join(",");

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
        return;
    }
    try {
        const { snapshot, report } = await loadFromFile(file);
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
