# Animate a force layout

With `animate: true`, `graphty-forceatlas2` moves the nodes on every frame. `layout.stop()` freezes them, and a second run with `randomize: false` continues from there.

## Start, stop and continue

Save this as an HTML file and open it. It loads the 34-node karate club graph.

```html
<!doctype html>
<html>
    <body>
        <button id="start">Start</button>
        <button id="stop">Stop</button>
        <button id="continue">Continue</button>
        <span id="status"></span>
        <div id="cy" style="width: 800px; height: 600px"></div>
        <script type="module">
            import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
            import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

            cytoscape.use(graphtyCytoscape);
            const cy = cytoscape({ container: document.getElementById("cy") });
            const status = document.getElementById("status");
            let layout = null;
            let running = false;

            function run(randomize) {
                if (running) {
                    return; // two simulations on the same nodes would fight over every frame
                }
                running = true;
                status.textContent = "running";
                layout = cy.layout({
                    name: "graphty-forceatlas2",
                    animate: true, // draw every frame instead of jumping to the end
                    refresh: 2, // iterations per frame
                    maxIter: 400, // iterations per run
                    randomize, // false: start from where the nodes are now
                });
                layout.run();
            }

            // layoutstop fires when the run settles, reaches maxIter, or is stopped
            cy.on("layoutstop", () => {
                running = false;
                status.textContent = "stopped";
            });

            // .then() rather than top-level await: some bundlers leave a module that awaits at the top never finishing
            cy.graphtyDataset("karate").then(() => {
                document.getElementById("start").addEventListener("click", () => run(true));
                document.getElementById("stop").addEventListener("click", () => layout?.stop());
                document.getElementById("continue").addEventListener("click", () => run(false));
            });
        </script>
    </body>
</html>
```

Start places the nodes at random and runs up to 400 iterations, 2 per frame. Stop freezes them. Continue runs again from the frozen positions.

## The options

| Option      | Type      | Default | Meaning                                                            |
| ----------- | --------- | ------- | ------------------------------------------------------------------ |
| `animate`   | `boolean` | `false` | `true` draws every frame; `false` moves the nodes once at the end. |
| `refresh`   | `number`  | `1`     | Iterations per frame.                                              |
| `maxIter`   | `number`  | `100`   | Iterations per run. A run ends sooner once the nodes stop moving.  |
| `randomize` | `boolean` | `true`  | `false` starts from the current positions.                         |

## Stopping

`layout.stop()` ends the run on the next frame and leaves the nodes where that frame drew them. Every run ends with one `layoutstop` event, whether it settled, reached `maxIter` or was stopped. Cytoscape emits it on the layout and on the core. The page uses it to clear `running`, so clicking Start or Continue during a run does nothing.

## Continuing

With `randomize: false` each run starts from the nodes' current positions, including any you dragged by hand, and gets a fresh `maxIter` budget. The run reads the positions at the scale the previous run drew them, so its first frame carries on where the last one stopped instead of jumping.

## Locking a node

A locked node never moves, and the others arrange themselves around it. Add this to the page to pin node `0` at (400, 300):

```js
const hub = cy.$id("0");
hub.position({ x: 400, y: 300 });
hub.lock();
cy.layout({ name: "graphty-forceatlas2", animate: true }).run();
```

While any node is locked, the layout scales the other nodes about it to fill the viewport and leaves the locked node where it is, so `hub` stays at `{ x: 400, y: 300 }`. Call `hub.unlock()` to free it.

## See also

- [Force simulations demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations): ForceAtlas2 and Fruchterman-Reingold on larger graphs.
- [Layouts](../layouts): static layouts, simulations and their events.
- [Layout reference](../../reference/layouts): every ForceAtlas2 option.
