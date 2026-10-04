# Load a GraphML file

This HTML page opens a GraphML file from disk, draws it, and saves it back. Save it as an `.html` file and open it in a browser.

`@graphty/cytoscape-extensions` has not had its first release yet, so until then the jsDelivr URL below returns 404 ([Installation](../installation)).

```html
<!doctype html>
<meta charset="utf-8" />
<input type="file" id="file" accept=".graphml,.gexf,.gml,.dot" />
<button id="save" disabled>Save as GraphML</button>
<p id="status"></p>
<div id="cy" style="width: 800px; height: 600px"></div>
<script type="module">
    import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
    import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

    cytoscape.use(graphtyCytoscape);
    const cy = cytoscape({ container: document.getElementById("cy") });
    const status = document.getElementById("status");
    const save = document.getElementById("save");
    let fileName = "graph.graphml";

    document.getElementById("file").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file === undefined) {
            return;
        }
        cy.elements().remove();
        try {
            const { elements, format, report } = await cy.graphtyImport(await file.text(), "auto");
            if (format === "csv" || elements.length === 0) {
                elements.remove();
                status.textContent = `${file.name} is not a graph file (read as ${format})`;
                return;
            }
            for (const issue of report.issues) {
                console.warn(`${issue.severity} ${issue.code} (line ${issue.line}): ${issue.message}`);
            }
            status.textContent = `${elements.nodes().length} nodes, ${report.issues.length} problems`;
            const placed = elements.nodes().some((n) => n.position("x") !== 0 || n.position("y") !== 0);
            if (placed) {
                cy.fit();
            } else {
                cy.layout({ name: "graphty-forceatlas2" }).run();
            }
            fileName = file.name.replace(/\.[^.]*$/, "") + ".graphml";
            save.disabled = false;
        } catch (err) {
            status.textContent = `Could not read ${file.name}: ${err.message}`;
        }
    });

    save.addEventListener("click", async () => {
        const text = await cy.graphtyExport("graphml");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([text], { type: "application/xml" }));
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    });
</script>
```

## How it works

With `"auto"`, `cy.graphtyImport` detects the format from the content, so GEXF, GML and DOT files open too. Most text that is not a graph file still reads as CSV, so the page drops any `"csv"` or empty result. Pass `"graphml"` instead of `"auto"` to reject non-GraphML files.

The page empties the core first because import adds nothing when a node id in the file is already there. `report.issues` lists what the parser objected to; an error on one element drops that value and the import goes on. Broken markup rejects with an `ImportError`, which the `catch` block reports.

GraphML holds no positions, so every node arrives at (0, 0) and the page runs `graphty-forceatlas2`. For the same reason, the saved file loses positions; export `"gexf"` to keep them.

## See also

- [Graphs in and out](../graphs-in-and-out): every format, the import report, and how data fields map.
