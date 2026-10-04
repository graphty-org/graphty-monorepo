import { checkExport, downloadGraph, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://graphty.app/docs/graph-io/samples/got-network.graphml");

// <button id="save">Save as GML</button>
document.querySelector("#save").addEventListener("click", async () => {
    // GML ids are integers and its keys have no spaces: "mangle" rewrites both, keeping the originals
    const options = { sanitizeIds: "mangle", sanitizeKeys: "mangle", filename: "got.gml" };
    const notes = checkExport(snapshot, "gml", options);
    const refused = notes.filter((n) => n.code.startsWith("E_"));
    const lossy = notes.filter((n) => n.code.startsWith("W_"));
    if (refused.length > 0) {
        console.error(refused.map((n) => n.message).join("\n"));
    } else if (lossy.length === 0 || confirm(lossy.map((n) => n.message).join("\n"))) {
        await downloadGraph(snapshot, "gml", options);
    }
});
