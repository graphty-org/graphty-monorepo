import { FormatRegistry } from "@graphty/graph-io";
import { csvExporter, csvImporter } from "@graphty/graph-io/csv";

const io = new FormatRegistry().registerImporter(csvImporter).registerExporter(csvExporter);
const { snapshot } = await io.loadFromUrl("https://graphty.app/docs/graph-io/samples/got-edges.csv", {
    defaultDirected: false, // the table has no Type column; these edges are undirected
});

// <button id="save">Save as CSV</button>
document.querySelector("#save").addEventListener("click", async () => {
    const blob = await io.exportGraphToBlob(snapshot, "csv");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "edges.csv";
    link.click();
    // let the browser start the download before the URL goes away
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
});
