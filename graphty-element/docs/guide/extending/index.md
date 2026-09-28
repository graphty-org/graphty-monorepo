# Extension points

Six things can be brought to graphty-element from outside. The list is closed: it is what a third
party may build against, and what the element promises not to break.

| Extension point | What you bring | Guide |
| --- | --- | --- |
| Palette | A named set of colour anchors a style layer ramps through | [Custom palettes](./custom-palettes) |
| File format | A reader for a graph file the element does not ship | [Custom file formats](./custom-data-sources) |
| Camera | A way of deciding where the viewer stands and what they look at | [Custom camera views](./custom-cameras) |
| Layout | An engine that decides where nodes sit | [Custom layouts](./custom-layouts) |
| Algorithm | Something computed over the graph that publishes a result | [Custom algorithms](./custom-algorithms) |
| Logging | A destination the element's log records are delivered to | [Custom log destinations](./custom-log-destinations) |

## The promise

**An extension can do everything its built-in equivalent can.** Whatever the element's own
palettes, importers, cameras, layouts, algorithms and log destinations can do, yours can do by the
same route and with types you can import. Concretely, every one of the six:

- appears in `session.catalog`, so a picker can offer it beside the element's own;
- is addressable by the key you choose, wherever a built-in name is accepted;
- is configured through one options mechanism, the plain-JSON `OptionDescriptor` list the
  catalogue already publishes;
- reports failure as a `GraphtyError` carrying a code you can switch on;
- is written in TypeScript against a published entry point, with no cast, no re-declared type and
  no reach into the package's source.

## Two tiers: start simple

Available from graphty-element 2.7.

Every extension point has two tiers. **The simple tier** is one function per point that takes a
plain object: an id and the one or two functions that are your own logic. The element fills in
everything else -- the catalogue entry, the options form, progress, cancellation and the coded
errors. **The advanced tier** is the registration each guide below describes: a descriptor and a
base class or a registration object, for when you need speed, a result shape the simple tier does
not produce, or full control.

| Point | Simple tier | Guide |
| --- | --- | --- |
| Algorithm | `defineAlgorithm({ id, node })` -- or `edge`, `nodes`, `groups` | [Custom algorithms](./custom-algorithms) |
| Layout | `defineLayout({ id, place })` | [Custom layouts](./custom-layouts) |
| Palette | `definePalette({ id, kind, colors })` | [Custom palettes](./custom-palettes) |
| Logging | `defineLogDestination({ id, write })` | [Custom log destinations](./custom-log-destinations) |

A whole working page, with no build step:

```html
<graphty-element id="graph" sample="karate"></graphty-element>
<script type="module">
    import { defineAlgorithm } from "https://cdn.jsdelivr.net/npm/@graphty/graphty-element@2/dist/graphty.bundle.js";

    defineAlgorithm({ id: "acme-degree", node: (node) => node.degree });
    document.getElementById("graph").run("acme-degree", {}, { as: "degree" });
</script>
```

With a bundler, import the same name from `@graphty/graphty-element/extend`. A simple extension is
an ordinary extension once it is defined: it appears in the catalogue beside the built-ins, and
you can later rewrite it in the advanced tier under the same id without breaking anything a reader
saved.

**An id** is lower-case words joined by hyphens, led by your own prefix: `acme-degree`. It is saved
in documents and result paths, so it is permanent. Anything else is refused at once with
`E_BAD_COMMAND`, and so is a definition with a missing or mistyped member; the message names the
member and what was expected:

```text
defineLayout("acme-tiers"): "place" must be a function; got undefined.
```

**A throw from your own function** is reported as `E_EXTENSION_FAILED`, naming your extension, the
function and the node or edge it was working on, with your original error kept as `cause`:

```text
acme-share: edge() threw for edge "17" (TypeError: Cannot read properties of undefined).
```

### The graph an algorithm or a layout reads

An algorithm's `node`, `edge`, `nodes` or `groups` function and a layout's `place` function
receive the graph as nodes and edges with their real ids:

| Member | What it gives |
| --- | --- |
| `graph.nodes()`, `graph.edges()` | every node and every edge; parallel edges are separate edges with their own ids |
| `graph.node(id)`, `graph.edge(id)` | one node or edge by id, or `undefined` |
| `graph.groupBy(path)` | the nodes grouped by an attribute's value, groups in readable order ("2" before "10") |
| `node.id`, `node.degree` | the id as the data spelled it; the number of edges touching the node |
| `node.neighbors()`, `node.edges()` | the adjacent nodes (each once, never the node itself) and the touching edges |
| `node.outNeighbors()`, `inNeighbors()`, `outEdges()`, `inEdges()` | the directed forms, only with `direction: "directed"` in the definition |
| `edge.id`, `edge.source`, `edge.target` | the element's edge id and its two ends |
| `edge.other(node)` | the far end seen from `node` -- the way to walk from a node along its edges |
| `node.edgesTo(other)`, `node.weightTo(other, path)` | the edges between two nodes, and their summed weight |
| `edge.weight(path)`, `node.strength(path)` | an edge's weight, and a node's summed edge weight |
| `node.attr(path)`, `edge.attr(path)` | an attribute, or a finished run's result (`"results.degree.value"`) |
| `node.number(path)`, `edge.number(path)` | the same, when it is a number; `undefined` otherwise |

A toy example: on the path `a - b - c` with a self-loop on `c`,

```ts
defineAlgorithm({
    id: "acme-loops",
    node: (node) => node.edgesTo(node).length, // 1 for c, 0 for a and b
});
```

`c.degree` is 2 (the loop counts once), `c.neighbors()` is `[b]` (never `c` itself) and
`b.neighbors()` is `[a, c]`. The rules that keep those numbers honest:

- **Order is the ids'.** Nodes come numbers first, ascending, then text; edges by edge id. A result
  never depends on the order the records were loaded in. `compareNodeIds` is that order.
- **Direction is never guessed.** Without `direction: "directed"`, the directed forms throw and
  name the fix, so a plugin cannot read a direction the graph was not read with.
- **Walk with `edge.other(node)`.** In an undirected graph `edge.source` is just the end the data
  named first, not the node you came from.
- **A missing weight is never a zero.** `edge.weight("confidence")` is `undefined` for an edge with
  no number there, and `strength` and `weightTo` leave such an edge out. The run finishes with a
  warning that counts them. With the weight unbound (`undefined`) every edge counts 1.
- **A misspelt attribute fails loudly.** The first read of a path no node carries throws
  `E_OPTION_RANGE` and lists what the nodes do carry, instead of reading `undefined` everywhere.
- **The number 0 is an id like any other.** `graph.node(0)` and `graph.node("0")` are two nodes.

## Where to import from

Everything an extension author needs comes from three subpaths:

```ts
import { registerPalette, LayoutEngine, DataSource } from "@graphty/graphty-element/extend";
import { paletteDescriptor, cameraDescriptor } from "@graphty/graphty-element/catalog";
import { GraphtyLogger, LogLevel } from "@graphty/graphty-element/logging";
```

`@graphty/graphty-element/extend` is the registration surface: the verb that files your extension,
and the types it takes. `@graphty/graphty-element/catalog` is what the element can do, as plain
JSON -- the descriptor tables and the lookups a picker reads.
`@graphty/graphty-element/logging` is the logger's own vocabulary, which a log destination needs
and nothing else does.

All three resolve in Node with no Babylon.js, no Lit and no DOM in their import graph, so a plugin
can be written, type-checked and published without a browser anywhere in the loop.

A page that loads the self-contained `@graphty/graphty-element/bundle` with no build step can
import `registerPalette`, `registerCameraView`, `registerLogSink`, `Algorithm`, `LayoutEngine` and
`DataSource` from the bundle itself. Registrations are kept once per page rather than once per
copy of the package, so a plugin registered through `./extend` also reaches an element that the
bundle, or any other copy of graphty-element on the same page, defined.

## Two registration shapes, and one question decides which

> Does the element construct the thing?

**It does** for an algorithm, a layout and a file format's reader: the element builds one per run,
per `setLayout`, per load. Those are classes, and they register through a static `register` on the
base class you extend.

```ts
Algorithm.register(MyAlgorithm);
LayoutEngine.register(MyLayout);
DataSource.register(MyReader);
```

**It does not** for a palette, a camera view or a log destination: a palette has no code to run, a
view is a pure function, a destination is something you already hold. Those are values, and they
register through a free function.

```ts
registerPalette(myPalette);
registerCameraView({ descriptor, compute });
registerLogSink({ descriptor, create });
```

## What registration means

**It is global, and there is no unregister.** A descriptor becomes public API the moment something
records it: a layer's source names your palette, a saved document references your format, a run's
result path is built from your algorithm's key. Every registry does ship a
`clearRegistered<Kind>ForTesting()` so a test suite can leave the registries as it found them; the
name is deliberate, and it is not part of the contract.

**Registering the same implementation twice is a no-op**, because a module a bundler re-evaluates
must not become two extensions. Registering a *different* implementation under a name already
taken replaces it and warns once; pass `{ strict: true }` to make that throw `E_DUPLICATE_PLUGIN`
instead.

**A name the element itself ships is reserved.** Registering anything under a built-in id throws
`E_DUPLICATE_PLUGIN` whatever you pass, because a document that painted with `viridis` yesterday
has to paint with `viridis` today.

**A malformed registration is refused at the door**, with `E_BAD_COMMAND` and a `details.field`
naming what is wrong -- at the line that made the mistake, rather than inside somebody else's
repaint an hour later.

## Registering only adds

A page that imports no plugin sees exactly what it saw before. The element's own descriptor tables
are frozen constants and nothing appends to them; composition happens where the catalogue is read.
Your code runs only when your key is named -- a registered layout lays nothing out, a registered
palette paints nothing and a registered reader reads no file until a consumer asks for it.

Two exceptions, both contained and both deliberate. A registered log destination starts receiving
records immediately, because that is what a destination is. And a registered format's `detect`
runs on every detection -- but strictly after every built-in detector, so your format can only
claim a file the element could not already read, and a detector that throws is treated as "no".

## What is not an extension point

Scale plugins, node mesh shapes, lifecycle managers, natural-language commands and hardware
accelerators all have registration machinery inside the package. None of them is a supported
extension point today. They may be promoted later; until then nothing is obliged to keep them
working, and a bug report about one is a feature request.
