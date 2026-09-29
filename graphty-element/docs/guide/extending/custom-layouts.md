# Custom layouts

A layout decides where nodes sit. There are two kinds:

- **A single-pass layout** -- an arrangement computed in one go. Circles, grids, trees and
  spirals are this. Register it with `registerSnapshotLayout`: a descriptor and a function from
  the graph to coordinates. The element's own single-pass layouts are built exactly this way.
- **A live simulation** -- something the element steps every frame until it reports itself
  settled. Force-directed arrangements are this. Extend `LayoutEngine` and register the class with
  `LayoutEngine.register(MyLayout)`.

Either way, from the moment it is registered the layout is in the catalogue a picker reads and is
chosen by its name.

## One key, not two

A layout has exactly one name: `descriptor.id` (and, for a class, `static type`, which must equal
it). Registration refuses a class where the two disagree, because the element derives one from the
other in several places and a mismatch fails silently.

## A single-pass layout

```ts
import { registerSnapshotLayout } from "@graphty/graphty-element/extend";

registerSnapshotLayout({
    descriptor: {
        id: "acme-grid",
        plainName: "Grid",
        technicalName: "Row-and-column placement",
        description: "Puts the nodes in rows, in the order they arrived.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "acme-grid",
        options: [
            {
                name: "columns",
                plainName: "Columns",
                type: "integer",
                default: 3,
                min: 1,
                max: 100,
                description: "How many nodes to a row.",
            },
            {
                name: "gap",
                plainName: "Gap",
                type: "number",
                default: 50,
                min: 1,
                max: 1000,
                description: "Scene units between neighbours.",
            },
        ],
    },
    compute(input) {
        const { graph: snapshot, dimensions, options } = input;
        const columns = options.columns as number;
        const gap = options.gap as number;
        const count = snapshot.nodeCount;
        const out = new Float32Array(dimensions * count);
        for (let row = 0; row < count; row++) {
            out[dimensions * row] = (row % columns) * gap;
            out[dimensions * row + 1] = Math.floor(row / columns) * gap;
        }
        return out;
    },
});
```

`compute` is handed the graph and answers with coordinates. Everything else -- recomputing when the
graph changes, keeping pinned nodes still, publishing into the element's shared position array,
drawing edges between the nodes -- is the element's.

**The answer** is a `Float32Array` of `dimensions` numbers per node, in scene units, where row `i`
is the node whose `index` is `i` (`input.graph.ids.idOf(i)` is its id, `input.graph.ids.indexOf(id)`
its row).
NaN leaves a node unplaced. Return the array directly and the nodes are placed in the same frame;
return a promise (an `async` function, a worker, a GPU dispatch) and the layout stays unsettled
until it resolves.

**What `compute` is handed** (`SnapshotLayoutInput`):

| Member            | What it is                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph`           | The graph as an undirected `GraphSnapshot` (a graph-format snapshot): one edge per connected pair. The layouts of `@graphty/layout` take it directly. |
| `stored`          | The same graph as the element stores it -- directed or not, every parallel and reciprocal edge, and the edge weights. Read weights here.              |
| `dimensions`      | 2 or 3, from the element's view mode or the consumer's `dim` option, capped at `maxDimensions`.                                                       |
| `options`         | The consumer's options, validated and defaulted against `descriptor.options`.                                                                         |
| `fixed`           | `rows` (a `NodeMask`) and their current `positions`: pinned nodes, nodes outside a scope, and after an add every node already drawn.                  |
| `firstRun`        | True until one of this layout's answers has been published since `setLayout` chose it; false for a run that follows a change.                         |
| `initial`         | Every node's current coordinates, NaN for a node nothing has placed yet.                                                                              |
| `added`           | After an add, the new rows (a `NodeMask`); null for a fresh arrangement.                                                                              |
| `scope`           | For a layout run over a set with `setLayout(id, opts, { scope })`, the rows it places; null for the whole graph.                                      |
| `column(option)`  | The node attribute an option names as a dotted path (`"geo.lat"`), one value per row.                                                                 |
| `dataPositions()` | Where each node's own `position` field puts it, scaled by the element's `positionScale`; NaN where a node has none.                                   |
| `signal`          | Aborted when the answer is no longer wanted: the graph changed, the layout was replaced, or the element was disposed.                                 |
| `report(p)`       | Tell the consumer how far you have got: `{ fraction, message? }`, emitted as the element's `layout-progress` event.                                   |

Read a mask with `maskTest(mask, row)`. Import it, and the `GraphSnapshot`, `NodeMask` and `EdgeMask`
types, from `@graphty/graphty-element/extend`, not from `@graphty/graph-format`: they are the
element's own copy, so they always match the snapshots it hands you.

**Rows you cannot move stay put whatever you answer.** A pinned node, a node outside the scope and,
after a reader adds nodes to a finished graph, every node that was already drawn is left where it
is; `fixed` tells you which they are so that you can arrange the rest around them. After an add,
`added` marks the newcomers and `initial` holds where everything is, which is what lets a layout
place a newcomer among its neighbours instead of from scratch. Your answer for the kept nodes can
come back turned, mirrored or rescaled against where they are drawn; the element carries the new
nodes into the drawn frame by the turn (or mirror), scale and shift that best maps your kept rows
onto their drawn places. Only an add is held this way: if any edge between two existing nodes was
removed or rewired in the same change, the whole graph is arranged again.

**A long arrangement should watch `signal`.** When the reader switches layout or the graph changes
before you answer, the signal aborts and whatever you return afterwards is ignored.

**Say whether you read edge weights** with `descriptor.honoursWeights: true`, and whether you can
lay out a set while holding the rest with `descriptor.scoped: true`. Both default to false.

A failure is reported on the element's `error` event with `context: "layout"`; throw a
`GraphtyError` to choose its code.

### Layouts written on `SimpleLayoutEngine`

`SimpleLayoutEngine` -- a class with a `doLayout()` that fills `this.positions` or assigns
`this.result` -- is deprecated in favour of `registerSnapshotLayout` and keeps working through
graphty-element 3.x, registered with `LayoutEngine.register` as before. Moving one over is
mechanical: the body of `doLayout` becomes `compute`, `this.graph` becomes `input.graph`,
`this.sourceGraph` becomes `input.stored`, `this.startPositions(dim)` becomes `input.initial` when
`input.added` is set, and the answer is returned in scene units instead of being multiplied by
`scalingFactor`.

## A live simulation

```ts
import {
    type Edge,
    type EdgePosition,
    LayoutEngine,
    type LayoutDescriptor,
    type Node,
    type Position,
} from "@graphty/graphty-element/extend";

class RingLayout extends LayoutEngine {
    static override type = "acme-ring";
    static override maxDimensions: 2 | 3 = 3;

    static override descriptor: LayoutDescriptor = {
        id: "acme-ring",
        plainName: "Ring walk",
        technicalName: "Ring walk simulation",
        description: "Walks every node outwards to an evenly spaced place on one ring.",
        family: "geometric",
        kind: "live",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "acme-ring",
        options: [
            { name: "radius", plainName: "Ring size", type: "number", default: 120, min: 1, max: 1000 },
            { name: "stride", plainName: "Step size", type: "number", default: 45, min: 1, max: 500 },
        ],
    };

    /** How the element tells a layout which drawing mode it is in. */
    static override getOptionsForDimension(dimension: 2 | 3): object | null {
        return dimension > this.maxDimensions ? null : { dimensions: dimension };
    }

    readonly #radius: number;
    readonly #stride: number;
    readonly #nodes: Node[] = [];
    readonly #edges: Edge[] = [];
    readonly #placed = new Map<Node, { x: number; y: number; z: number }>();
    readonly #pinned = new Set<Node>();
    #arrived = false;

    constructor(opts: { radius?: number; stride?: number } = {}) {
        super();
        this.#radius = opts.radius ?? 120;
        this.#stride = opts.stride ?? 45;
    }

    /** Awaited before the element draws anything: where a worker or a WASM module is set up. */
    async init(): Promise<void> {
        // Nothing to set up.
    }

    addNode(n: Node): void {
        this.#nodes.push(n);
        this.#placed.set(n, { x: 0, y: 0, z: 0 });
        this.#arrived = false;
    }

    addEdge(e: Edge): void {
        this.#edges.push(e);
    }

    /** One frame of the simulation. Do NOT publish positions -- the element does that for you. */
    step(): void {
        let moved = false;

        this.#nodes.forEach((node, index) => {
            if (this.#pinned.has(node)) {
                return;
            }

            const angle = (index / this.#nodes.length) * Math.PI * 2;
            const goal = { x: Math.cos(angle) * this.#radius, y: 0, z: Math.sin(angle) * this.#radius };
            const at = this.#placed.get(node) ?? { x: 0, y: 0, z: 0 };
            const next = {
                x: approach(at.x, goal.x, this.#stride),
                y: approach(at.y, goal.y, this.#stride),
                z: approach(at.z, goal.z, this.#stride),
            };

            moved ||= next.x !== at.x || next.y !== at.y || next.z !== at.z;
            this.#placed.set(node, next);
        });

        this.#arrived = !moved;
    }

    getNodePosition(n: Node): Position {
        return this.#placed.get(n) ?? { x: 0, y: 0, z: 0 };
    }

    /** Called when the reader drags a node and drops it. */
    setNodePosition(n: Node, p: Position): void {
        this.#placed.set(n, { x: p.x, y: p.y, z: p.z ?? 0 });
    }

    getEdgePosition(e: Edge): EdgePosition {
        return { src: this.getNodePosition(e.srcNode), dst: this.getNodePosition(e.dstNode) };
    }

    pin(n: Node): void {
        this.#pinned.add(n);
    }

    unpin(n: Node): void {
        this.#pinned.delete(n);
    }

    get nodes(): Iterable<Node> {
        return this.#nodes;
    }

    get edges(): Iterable<Edge> {
        return this.#edges;
    }

    /** The element stops stepping and announces `graph-settled` when this turns true. */
    get isSettled(): boolean {
        return this.#arrived;
    }
}

function approach(from: number, to: number, maxDelta: number): number {
    const delta = to - from;

    return Math.abs(delta) <= maxDelta ? to : from + Math.sign(delta) * maxDelta;
}

LayoutEngine.register(RingLayout);
```

## Using it

```ts
await graph.setLayout("acme-ring", { radius: 200 });
```

```html
<graphty-element layout="acme-ring"></graphty-element>
```

## Four optional members, each with a working default

Override one only if your engine needs it. Each is declared on the base class, so your editor
offers it and the element calls it by name.

| Member                         | Default                                          | Override when                                                                   |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `dispose(): void`              | does nothing                                     | your engine holds a worker, a timer, a socket or a GPU buffer                   |
| `removeNode(n: Node): void`    | does nothing                                     | your engine keeps its own node list, or it will hold every removed node forever |
| `removeEdge(e: Edge): void`    | does nothing                                     | the same, for edges                                                             |
| `updatePositions(nodes): void` | steps up to ten times, stopping early if settled | your engine can place a newcomer without re-running the simulation              |

## Positions are the element's job

The element copies your coordinates into its shared position array after the pre-steps and after
every step batch. Do not call `publishPositions()` yourself: forgetting it used to render
perfectly and leave `session.positions` unfilled for every node, with no symptom until a drag, a
re-freeze or an accelerator read the array.

## A pinned node is not yours to move, and you do not have to know that

A reader who drags a node pins it, and a pin now survives a layout change, a 2D/3D toggle and a
template apply. The refusal lives in the element, on the write your coordinates pass through, so
an engine that has never heard of pinning honours pins anyway: your arrangement is computed over
every node, and the write onto a pinned row is dropped.

The one thing you must not do is write positions by some other route. Everything you place goes
through `publishPositions()` -- which is called for you -- or through `setNodePosition`, which the
element calls when the reader drops a node and which is a deliberate placement rather than a
layout opinion.

Read the pin with `session.positions.isPinned(index)` if your engine wants to, for instance to
treat pinned nodes as fixed anchors rather than computing a position it knows will be dropped.

## Say whether you read edge weights

```ts
class RingWalk extends LayoutEngine {
    static type = "acme-ring";
    static honoursWeights = true;
}
```

`honoursWeights` defaults to `false`, and false is right for most layouts: of the element's own
sixteen only Kamada-Kawai and ForceAtlas2 have a weight channel at all. Declaring it `true` puts
`honoursWeights: true` on your descriptor in `session.catalog.layouts()`, which is how a settings
panel decides whether to offer a "use edge weights" control for your layout. Declaring it on a
layout that ignores weights advertises a control that changes nothing.

Likewise, you do not have to assign `this.config`. The element rebuilds your engine from the
options the consumer actually gave when the drawing mode changes.

## Laying out one set while holding the rest

A consumer can ask a layout to move only some nodes -- `setLayout(type, opts, { scope })` -- and
hold every other node still. An engine is refused that request (`E_UNSUPPORTED`) unless its class
says it can:

```ts
class RingWalk extends LayoutEngine {
    static type = "acme-ring";
    static scoped = true;
}
```

Declaring it publishes `scoped: true` on your descriptor in `session.catalog.layouts()`, and
signs you up for one contract:

- **The element hands you the hold** through `setHoldMask(mask, rows)` after `init()` and again
  whenever the graph's rows are renumbered. A set bit is a row to hold; a row at or past `rows`
  belongs to a node that arrived later, and is held too. `null` holds nothing.
- **A held node never moves, whatever you do.** The element drops a layout write onto a held row
  that already has a position, the way it drops one onto a pinned row. A held node with no position
  yet takes your first write, so a newcomer is drawn somewhere.
- **You must treat held nodes as fixed in your own state.** A simulation that keeps integrating a
  held body computes every force on the members against a position that is never drawn. Override
  `setHoldMask`, call `super.setHoldMask(mask, rows)` first, then fix the held rows in your own
  terms -- a fixed-node mask, `fx`/`fy`, a pinned body -- and read `this.isHeld(index)` for a node
  that arrives later or that a reader unpins while it is held.

```ts
override setHoldMask(mask: NodeMask | null, rows: number): void {
    super.setHoldMask(mask, rows);
    for (const body of this.bodies) {
        body.fixed = this.isHeld(body.index);
    }
}
```

The hold is never a pin: it is not saved as one and unpinning does not release it. `holdMask`
reads the current mask back.

## Finding it again

```ts
import { layoutDescriptor, layoutIdForEngine } from "@graphty/graphty-element/catalog";

layoutDescriptor("acme-ring")?.plainName; // "Ring walk"
layoutIdForEngine("acme-ring"); // "acme-ring" -- one key, not two
session.catalog.layouts(); // every layout a picker may offer
```

## How it is refused

| What is wrong                                                                                    | Code                                          |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| No `static type`, no `static descriptor`, or a descriptor `id` that disagrees with `static type` | `E_BAD_COMMAND`, `details.field` naming it    |
| A layout id the element itself ships                                                             | `E_DUPLICATE_PLUGIN`                          |
| A layout name nothing registered                                                                 | `E_UNKNOWN_LAYOUT`, with `details.available`  |
| An option the descriptor does not declare                                                        | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range                                                       | `E_OPTION_RANGE`                              |

A failure thrown from your constructor or from `init()` arrives at the caller as a `GraphtyError`
and is announced on the graph's error event; throw a `GraphtyError` of your own and the code you
chose survives the trip.

```ts
import { GraphtyError } from "@graphty/graphty-element/extend";

constructor(opts: { radius?: number } = {}) {
    super();

    if (opts.radius !== undefined && opts.radius <= 0) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: "a ring needs a positive radius",
            source: "layout",
            details: { option: "radius", value: opts.radius },
        });
    }
}
```

## Deliberate limits

**A layout cannot add an engine to an existing arrangement.** A third force-directed
implementation cannot register under `force`: the arrangement table is the element's editorial
judgement about which of its own engines to prefer, which is not a judgement a third party can
make on the element's behalf. Register your own key.

**A live simulation has no progress and no cancellation**, for a built-in or a plugin. A
single-pass layout has both (`report` and `signal`), and one that answers with a promise does not
hold the frame.

**A saved document's `graph.layout` is inert.** Nothing reads it back yet, for a built-in layout
or a registered one.

**A registered layout is not accelerated.** Your engine's own code runs on the CPU, even when
the element has a GPU accelerator attached. Only the element's built-in simulation layouts
(`forceatlas2`, `spring` and `spring-electrical`) run on an accelerator.

**A routed or curved edge path is not available.** Edges are drawn between the two ends
`getEdgePosition` reports, for every engine alike.
