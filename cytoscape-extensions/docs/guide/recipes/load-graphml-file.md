# Load a GraphML file

The HTML below opens a GraphML file from disk, draws it, and saves it back. Save it as an `.html` file and open it in a browser.

No GraphML file to try it with? This Node script writes the 34-node karate club network to `karate.graphml`. Run it after `npm install cytoscape @graphty/cytoscape-extensions`:

```js
// make-sample.mjs
import { writeFile } from "node:fs/promises";
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");
await writeFile("karate.graphml", await cy.graphtyExport("graphml"));
```

```html
<!doctype html>
<meta charset="utf-8" />
<input type="file" id="file" />
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
            const { elements, report } = await cy.graphtyImport(await file.text(), "auto", { filename: file.name });
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
            fileName = file.name;
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

`file.text()` reads the file as a string. With `"auto"`, `cy.graphtyImport` detects the format from the content and the `filename` option, so GEXF and DOT files open too.

`cy.elements().remove()` empties the core first: import refuses, adding nothing, when a node id in the file is already in the core.

`report.issues` lists what the parser objected to, each with `severity`, `code`, `message` and `line`. An error on one element does not stop the import: a `<data>` with an undeclared key logs `E_GRAPHML_UNKNOWN_KEY` and the value is dropped. `report.warningCount` leaves those errors out, so count `report.issues`. A file that cannot be parsed rejects with an `ImportError` and adds nothing.

GraphML holds no positions, so every node arrives at (0, 0) and the page runs `graphty-forceatlas2`, which fits the result to the viewport. A file with positions (GEXF, GML, DOT, Cytoscape JSON) keeps them.

`cy.graphtyExport("graphml")` returns the file's text with every data field and edge id. GraphML drops positions; pass `onLoss: (notes) => console.warn(notes)` to hear about it, or export `"gexf"` to keep them.

## Try it

The [export and import demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-graphs--export-and-import) round-trips a graph through every format.

## See also

- [Graphs in and out](../graphs-in-and-out): every format and how data fields map.
- [Layouts](../layouts): the other graphty layouts.
