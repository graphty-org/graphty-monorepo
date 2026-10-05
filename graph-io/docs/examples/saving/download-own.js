import { FormatRegistry } from "@graphty/graph-io";
import { csvExporter, csvImporter } from "@graphty/graph-io/csv";

const io = new FormatRegistry().registerImporter(csvImporter).registerExporter(csvExporter);
const { snapshot } = await io.loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-edges.csv",
    {
        defaultDirected: false, // the table has no Type column; these edges are undirected
    },
);

// <button id="save">Save as CSV</button>
document.querySelector("#save").addEventListener("click", async () => {
    await io.downloadGraph(snapshot, "csv", { filename: "edges.csv" });
});
