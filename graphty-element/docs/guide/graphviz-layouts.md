# Graphviz layouts

graphty-element can lay a graph out with [Graphviz](https://graphviz.org)'s own engines: dot,
neato, fdp, sfdp, circo, twopi, osage and patchwork. They are not ports. They are Graphviz's C
code compiled to WebAssembly by the optional package `@hpcc-js/wasm-graphviz`, so a graph drawn
with `graphviz-dot` is placed exactly where Graphviz places it.

## Install

```bash
npm install @graphty/graphty-element @hpcc-js/wasm-graphviz
```

The package is an optional peer dependency. Without it graphty-element works as before, and a
Graphviz layout fails with the code below instead of drawing.

## Use one

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
element.viewMode = "2d";
element.nodeData = [{ id: "start" }, { id: "parse" }, { id: "run" }];
element.edgeData = [
    { src: "start", dst: "parse" },
    { src: "parse", dst: "run" },
];
await element.setLayout("graphviz-dot", { rankdir: "LR" });
```

The layout runs in a Web Worker, so the page stays responsive while Graphviz works.

| Layout id            | Engine    | What it draws                                          |
| -------------------- | --------- | ------------------------------------------------------ |
| `graphviz-dot`       | dot       | Ranks, with edges pointing one way and few crossings   |
| `graphviz-neato`     | neato     | Drawn distances that match graph distances             |
| `graphviz-fdp`       | fdp       | Spring forces                                          |
| `graphviz-sfdp`      | sfdp      | Spring forces, settled coarse to fine for large graphs |
| `graphviz-circo`     | circo     | Each tightly connected part on its own circle          |
| `graphviz-twopi`     | twopi     | Rings around a root                                    |
| `graphviz-osage`     | osage     | A packed array                                         |
| `graphviz-patchwork` | patchwork | Squares tiled into one rectangle                       |

Every Graphviz layout is two-dimensional.

### Options

| Option       | Type                             | Engines          | What it sets                                           |
| ------------ | -------------------------------- | ---------------- | ------------------------------------------------------ |
| `rankdir`    | `"TB"`, `"LR"`, `"BT"` or `"RL"` | dot              | Which way the ranks run                                |
| `nodesep`    | number                           | dot              | Space between nodes in a rank, in scene units          |
| `ranksep`    | number                           | dot              | Space between ranks, in scene units                    |
| `seed`       | number                           | neato, fdp, sfdp | Graphviz's `start`: the same seed, the same drawing    |
| `overlap`    | `"true"`, `"false"` or `"scale"` | neato, fdp, sfdp | Whether nodes may overlap, or how overlaps are removed |
| `maxNodes`   | number                           | all              | The node budget (below)                                |
| `timeoutMs`  | number                           | all              | The time budget (below)                                |
| `attributes` | `Record<string, string>`         | all              | Any other Graphviz graph attribute, as Graphviz text   |

`attributes` is the advanced path: `{ attributes: { splines: "ortho", mclimit: "4" } }` hands
those graph attributes to Graphviz as they are. The typed options win over the same name in
`attributes`.

Each node is given to Graphviz as a circle as wide as graphty-element draws it (one scene unit is
one inch to Graphviz), with no label. Edge routes are not used: graphty-element draws its own
edges between the placed nodes. Two engines do not space nodes by their width, so graphty-element
sizes what they do read: patchwork gets each node an `area` whose cell fits the drawn node, and
twopi's rings are `ranksep` apart scaled to the widest drawn node, unless `attributes` sets
`ranksep`.

## DOT files

A DOT file loaded with `layout: "recommended"` and no coordinates is drawn by the engine it names
in its `layout` attribute, or by dot when it names none. Its layout attributes (`rankdir`,
`nodesep`, `ranksep`, `splines`, `overlap`, `root` and the others Graphviz reads) are passed on.

```ts
await element.session.data.import({ type: "dot", config: { url: "/graphs/pipeline.gv" } }, { layout: "recommended" });
```

A file whose nodes all carry `pos` keeps those positions instead. Only the first graph of a file
holding several is read and laid out.

The recommendation says which rule chose the layout, as a code
(`recommendLayout(...).fact.code`):

| Code                             | When                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `recommend.graphviz-file`        | The file is a Graphviz file with no coordinates; `params.engine` names the engine                                     |
| `recommend.graphviz-unavailable` | The file asked for a Graphviz engine but `@hpcc-js/wasm-graphviz` is not installed, so the next rule's layout is used |

To ask whether the layouts can run on this page:

```ts
import { graphvizAvailability } from "@graphty/graphty-element";

const { available } = await graphvizAvailability();
```

## Budgets

Graphviz itself does not finish some engines on large graphs: at 10,000 nodes dot, neato and
circo run for more than five minutes and fdp crashes. So every engine has a node budget, and a
larger graph fails at once instead of hanging. Every layout also has a time budget of 60 seconds;
past it the Worker is stopped. Neither ever switches to another engine.

| Engine    | Node budget |
| --------- | ----------- |
| dot       | 1,500       |
| neato     | 2,000       |
| fdp       | 1,000       |
| circo     | 500         |
| sfdp      | 20,000      |
| twopi     | 20,000      |
| osage     | 20,000      |
| patchwork | 20,000      |

Raise or lower either with `maxNodes` and `timeoutMs`.

## When a Graphviz layout fails

It fails with a `GraphtyError`. `code` is the element's error code and `details.reason` says what
happened in Graphviz:

| `details.reason`       | `code`               | `details`                  | When                                              |
| ---------------------- | -------------------- | -------------------------- | ------------------------------------------------- |
| `graphviz.unavailable` | `E_MISSING_PACKAGE`  | `package`                  | The package is not installed, or cannot load here |
| `graphviz.syntax`      | `E_PARSE_FAILED`     | `engine`, `line`, `near`   | Graphviz could not read the graph                 |
| `graphviz.error`       | `E_UNSUPPORTED`      | `engine`, `messages`       | Graphviz refused the graph                        |
| `graphviz.crashed`     | `E_EXTENSION_FAILED` | `engine`, `message`        | The engine crashed; the next layout starts fresh  |
| `graphviz.timeout`     | `E_CAP_EXCEEDED`     | `engine`, `ms`             | The time budget ran out                           |
| `graphviz.too-large`   | `E_CAP_EXCEEDED`     | `engine`, `nodes`, `limit` | The graph is over the node budget                 |

Every layout runs in a fresh Worker with a fresh WebAssembly instance, so a crash or a stopped
layout leaves nothing behind for the next one.

## Content Security Policy

A page with a Content Security Policy must allow WebAssembly compilation with
`'wasm-unsafe-eval'` in `script-src`, and allow Workers from its own origin (`worker-src 'self'`).
Without them the layouts report `graphviz.unavailable`.

## Bundlers

Use any bundler that understands `new Worker(new URL("...", import.meta.url))` -- Vite, webpack 5,
Parcel and Rollup with its worker plugin all do -- and the Worker and the package are bundled for
you. The self-contained `@graphty/graphty-element/bundle` file does not include the package, so on
a page with no bundler the Graphviz layouts report `graphviz.unavailable`.

## License

`@hpcc-js/wasm-graphviz` is Apache-2.0, and the Graphviz code inside it is under the Eclipse
Public License 1.0. graphty-element (MIT) does not include it: you install it yourself, and an
application that ships it ships EPL-1.0 code.
