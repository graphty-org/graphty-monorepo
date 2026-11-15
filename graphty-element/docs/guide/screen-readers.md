# Screen Readers

The drawing is a canvas, so a screen reader hears nothing from it on its own. graphty-element
gives the canvas a role and a description, announces the selection, and can add a list of nodes a
keyboard walks. It supplies the facts -- how many nodes and edges, what the colors and sizes mean,
what is selected and its neighbors -- and your page supplies every word, in its own language.

## Quick start

```html
<graphty-element id="g" aria-label="Florentine families" accessible-node-list></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const element = document.getElementById("g");
    element.accessibleDescription = ({ nodes, edges }) => `${nodes} families, ${edges} marriages`;
    element.accessibleAnnouncement = ({ params }) =>
        params.count === 1
            ? `${params.nodes[0].name}, married into ${params.neighbors.map((n) => n.name).join(", ")}`
            : `${params.count} families selected`;
    element.nodeData = [{ id: "Medici" }, { id: "Albizzi" }, { id: "Strozzi" }];
    element.edgeData = [{ src: "Medici", dst: "Albizzi" }];
</script>
```

A screen reader now reads "Florentine families, image, 3 families, 1 marriages" on the canvas,
says the selection whenever it changes, and the next Tab stop is a list of the families: Up and
Down move through it, Enter selects one.

## What each part does

- **`aria-label`** on the element names the canvas. While the canvas is named it has the role
  `img`; an unnamed canvas has no role.
- **`accessibleDescription`** is a function from the facts to the description. It runs again when
  the data, the styling or the selection changes. Unset, the canvas has no description.
- **`accessibleAnnouncement`** words what a live region says when the selection changes. It gets
  `{ code: "selection", params }`, where `params` holds the selected nodes by name, how many are
  selected, and, when one node is selected, its neighbors. Unset, the announcement is the selected
  names, separated by commas.
- **`accessible-node-list`** (`accessibleNodeList`) adds an off-screen list of the visible nodes,
  named by the element's `aria-label`. Off by default. It is never drawn; to show it while it has
  focus, style it from the page:

    ```css
    graphty-element::part(node-list):focus {
        position: absolute;
        inset: 8px auto auto 8px;
        width: auto;
        height: auto;
        clip-path: none;
        max-height: 50%;
        overflow: auto;
        background: white;
    }
    ```

- **`accessibleFacts()`** reads the same facts the description gets, for a page that writes its
  summary somewhere of its own: `nodes`, `edges`, `legend` (as `session.styles.legend()`) and
  `selection`.

Node names come from the data: the node's label column, else its id.
