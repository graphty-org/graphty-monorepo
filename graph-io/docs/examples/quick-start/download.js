import { checkExport, downloadGraph, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

// <button id="save">Save as GML</button>
document.querySelector("#save").addEventListener("click", async () => {
    const options = {
        sanitizeIds: "mangle", // any format: rewrite ids the format cannot hold (GML ids are integers)
        sanitizeKeys: "mangle", // GML only: rewrite attribute names with spaces ("Edge Label")
        filename: "got.gml", // downloadGraph() only: the saved file's name
    };
    const notes = checkExport(snapshot, "gml", options);
    const refused = notes.filter((n) => n.code.startsWith("E_"));
    const lossy = notes.filter((n) => n.code.startsWith("W_"));
    if (refused.length > 0) {
        console.error(refused.map((n) => n.message).join("\n"));
    } else if (lossy.length === 0 || confirm(lossy.map((n) => n.message).join("\n"))) {
        await downloadGraph(snapshot, "gml", options);
    }
});
