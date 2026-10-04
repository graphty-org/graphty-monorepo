import { checkExport, downloadGraph, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://example.com/data/lesmiserables.gexf");

const button = document.querySelector("#save") as HTMLButtonElement;
button.addEventListener("click", async () => {
    const options = { sanitizeIds: "mangle", filename: "les-miserables.net" } as const;
    const notes = checkExport(snapshot, "pajek", options);
    const refused = notes.filter((n) => n.code.startsWith("E_"));
    const lossy = notes.filter((n) => n.code.startsWith("W_"));
    if (refused.length > 0) {
        console.error(refused.map((n) => n.message).join("\n"));
    } else if (lossy.length === 0 || confirm(lossy.map((n) => n.message).join("\n"))) {
        await downloadGraph(snapshot, "pajek", options);
    }
});
