# Custom layouts

A layout decides where nodes sit. There are two kinds and you pick one by extending the matching
base class:

- **`LayoutEngine`** -- a simulation the element steps every frame, until it reports itself
  settled. Force-directed arrangements are this.
- **`SimpleLayoutEngine`** -- an arrangement computed in a single pass. Circles, grids, trees and
  spirals are this, and it is much less code.

Both register with `LayoutEngine.register(MyLayout)`, and from that moment the layout is in the
catalogue a picker reads and is chosen by the name you gave it.

## One key, not two

A layout has exactly one name: `static type` on the class, and `descriptor.id` must equal it.
Registration refuses a class where the two disagree, because the element derives one from the
other in several places and a mismatch fails silently.

## A single-pass layout

```ts
import {
    LayoutEngine,
    type LayoutDescriptor,
    type Node,
    SimpleLayoutEngine,
} from "@graphty/graphty-element/extend";

// Declared with its members required and taken as `Partial<GridOptions>` below. A mapped type
// carries an implicit index signature, which is what lets the base class -- whose own options
// type is open -- accept it, and what lets `LayoutEngine.register` accept the class.
interface GridOptions {
    /** Multiplier the base class applies to everything `doLayout` computes. */
    scalingFactor: number;
    /** How many nodes to a row. */
    columns: number;
}

class GridLayout extends SimpleLayoutEngine {
    static override type = "acme-grid";

    /** The most dimensions this layout can draw in. */
    static override maxDimensions: 2 | 3 = 3;

    /** What a picker reads, and the one place this layout's options are declared. */
    static override descriptor: LayoutDescriptor = {
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
        ],
    };

    readonly #columns: number;

    constructor(opts: Partial<GridOptions> = {}) {
        super(opts);
        this.#columns = opts.columns ?? 3;
    }

    /**
     * Put the nodes in rows. The numbers written here are LAYOUT units; the base class
     * multiplies them by `scalingFactor` on the way into the element's position array.
     */
    override doLayout(): void {
        this.positions = {};

        this._nodes.forEach((node: Node, index: number) => {
            this.positions[node.id] = [index % this.#columns, Math.floor(index / this.#columns), 0];
        });
    }
}

LayoutEngine.register(GridLayout);
```

`doLayout` is the only member you have to write. Adding and removing nodes, recomputing when the
graph changes, answering where an edge's two ends are, and publishing into the element's shared
position array are all inherited.

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

| Member | Default | Override when |
| --- | --- | --- |
| `dispose(): void` | does nothing | your engine holds a worker, a timer, a socket or a GPU buffer |
| `removeNode(n: Node): void` | does nothing | your engine keeps its own node list, or it will hold every removed node forever |
| `removeEdge(e: Edge): void` | does nothing | the same, for edges |
| `updatePositions(nodes): void` | steps up to ten times, stopping early if settled | your engine can place a newcomer without re-running the simulation |

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

## Finding it again

```ts
import { layoutDescriptor, layoutIdForEngine } from "@graphty/graphty-element/catalog";

layoutDescriptor("acme-ring")?.plainName;   // "Ring walk"
layoutIdForEngine("acme-ring");              // "acme-ring" -- one key, not two
session.catalog.layouts();                   // every layout a picker may offer
```

## How it is refused

| What is wrong | Code |
| --- | --- |
| No `static type`, no `static descriptor`, or a descriptor `id` that disagrees with `static type` | `E_BAD_COMMAND`, `details.field` naming it |
| A layout id the element itself ships | `E_DUPLICATE_PLUGIN` |
| A layout name nothing registered | `E_UNKNOWN_LAYOUT`, with `details.available` |
| An option the descriptor does not declare | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range | `E_OPTION_RANGE` |

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

**There is no progress and no cancellation** anywhere in the layout path, for a built-in or a
plugin. A single-pass engine that takes a long time holds the frame.

**A saved document's `graph.layout` is inert.** Nothing reads it back yet, for a built-in layout
or a registered one.

**A routed or curved edge path is not available.** Edges are drawn between the two ends
`getEdgePosition` reports, for every engine alike.
