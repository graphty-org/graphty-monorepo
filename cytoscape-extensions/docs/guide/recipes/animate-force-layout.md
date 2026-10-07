# Animate a force layout

With `animate: true`, `graphty-forceatlas2` moves the nodes on every frame. `layout.stop()` freezes them, and a second run with `randomize: false` continues from there.

## Start, stop and continue

Save this as an HTML file and open it. It loads the 34-node karate club graph. Until `@graphty/cytoscape-extensions` is first released, the jsDelivr URL returns 404 ([Installation](../installation)).

```html
<!doctype html>
<html>
    <body>
        <button id="start">Start</button>
        <button id="stop">Stop</button>
        <button id="continue">Continue</button>
        <div id="cy" style="width: 800px; height: 600px"></div>
        <script type="module">
            import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
            import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

            cytoscape.use(graphtyCytoscape);
            const cy = cytoscape({ container: document.getElementById("cy") });
            let layout = null;
            let running = false;

            function run(randomize) {
                if (running) {
                    return; // two simulations on the same nodes would fight over every frame
                }
                running = true;
                layout = cy.layout({
                    name: "graphty-forceatlas2",
                    animate: true,
                    refresh: 2,
                    maxIter: 400,
                    randomize,
                });
                layout.run();
            }

            cy.on("layoutstop", () => {
                running = false;
            });

            cy.graphtyDataset("karate").then(() => {
                document.getElementById("start").addEventListener("click", () => run(true));
                document.getElementById("stop").addEventListener("click", () => layout?.stop());
                document.getElementById("continue").addEventListener("click", () => run(false));
            });
        </script>
    </body>
</html>
```

Stop freezes the nodes on the next frame. Continue runs from the frozen positions, including any node you dragged, with a fresh 400-iteration budget. Every run ends with one `layoutstop` event, which clears `running`.

| Option      | Type      | Default | Meaning                                       |
| ----------- | --------- | ------- | --------------------------------------------- |
| `animate`   | `boolean` | `false` | `true` draws every frame.                     |
| `refresh`   | `number`  | `1`     | Iterations per frame.                         |
| `maxIter`   | `number`  | `100`   | Iterations per run; ends sooner once settled. |
| `randomize` | `boolean` | `true`  | `false` starts from the current positions.    |

## Locking a node

A locked node never moves. To pin node `0` at (400, 300), put these lines at the top of the `.then()` callback:

```js
const hub = cy.$id("0");
hub.position({ x: 400, y: 300 });
hub.lock();
```

While a node is locked, every frame rescales the free nodes about it to fill the viewport. So Continue does not resume where Stop left off: the free nodes jump up to about 300px over two frames, then drift back over about 30. No option turns this off. `hub.unlock()` frees the node.

## See also

- [Force simulations demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations): ForceAtlas2 and Fruchterman-Reingold on larger graphs.
- [Layouts](../layouts): layouts, simulations and their events.
- [Layout reference](../../reference/layouts): every ForceAtlas2 option.
