# Using @graphty/graphty-element (for coding agents)

`<graphty-element>` is a web component that draws a graph in 3D or 2D. It renders with
Babylon.js, so it needs a browser; the parts that describe the graph rather than draw it are
published separately and run in Node.

```bash
npm install @graphty/graphty-element @babylonjs/core lit
```

`@babylonjs/core` and `lit` are peer dependencies and must be installed alongside.

## Put a graph on a page

```html
<script type="module">
    import "@graphty/graphty-element";
</script>

<graphty-element id="graph" style="display: block; width: 100%; height: 600px"></graphty-element>

<script type="module">
    const el = document.querySelector("#graph");

    el.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
    el.edgeData = [
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ];

    el.addEventListener("node-click", (event) => {
        console.log(event.detail);
    });
</script>
```

For a page with no build step, `@graphty/graphty-element/bundle` is one self-contained file that
can be loaded straight from a `<script type="module" src="...">` tag; it defines the tag and
needs no import map.

## The six things generated code gets wrong

1. **No height.** `<graphty-element>` is `display: inline` with no intrinsic size, so it renders
   at zero height and looks broken. Always set `display: block` and a height.
2. **Edge endpoint fields are `src` and `dst`, and a node's identity is `id`.** `source`/`target`
   is not accepted. Point the element at other field names with the `node-id-path`,
   `edge-src-id-path` and `edge-dst-id-path` attributes rather than reshaping the data.
3. **Rich values are properties, never attributes.** `el.nodeData = [...]`, not
   `node-data='[...]'`. The same goes for `edgeData`, `layoutConfig`, `dataSourceConfig`,
   `background` and `xr`. The attributes are strings, numbers and booleans; the complete list,
   with types, is in `dist/custom-elements.json`.
4. **The `layout` attribute takes an engine name, not a catalogue id.** Working values today are
   `ngraph`, `d3`, `forceatlas2`, `spring`, `kamada-kawai`, `arf`, `circular`, `shell`, `spiral`,
   `spectral`, `planar`, `random`, `bfs`, `bipartite`, `multipartite` and `fixed`. The catalogue
   describes layouts under stable ids (`force`, `hierarchical`, `layers`, ...) and lists the
   engines that serve each one under `implementations[].engine`; four of the ids are not
   themselves accepted by the attribute, so read the engine name out of the catalogue rather than
   passing the id.
5. **DOM events are unprefixed.** They are named `node-click`, `node-hover`, `graph-settled`,
   `data-loaded`, `selection-changed` and so on -- the element forwards every internal graph
   event to the DOM under its own name. The one exception is `graphty-capabilities-change`. All
   fifty-one are listed in `dist/custom-elements.json`.
6. **Never deep-import `@graphty/graphty-element/dist/...`.** Use the entry points below; the
   layout of `dist/` is not API.

## Entry points

| Import | What it carries | Runs in Node |
| --- | --- | --- |
| `@graphty/graphty-element` | The custom element. Importing it defines the tag and registers the built-in layouts, data sources and algorithms. Pulls in Babylon.js and Lit. | No |
| `@graphty/graphty-element/schema` | Palettes, `NodeShapes`, `EdgeLineTypes`, `EdgeArrowTypes`, `defaultNodeStyle`, `defaultEdgeStyle`, `defaultRichTextLabelStyle`, the style config types and the colour helpers (`interpolatePalette`, `hexToRgb`, the colour-vision simulators). | Yes |
| `@graphty/graphty-element/catalog` | Plain-JSON descriptors for every algorithm, layout, file format, palette and scale, with the options each accepts. Build an options form from these instead of hard-coding a list. | Yes |
| `@graphty/graphty-element/extend` | The registration surface: `Algorithm`, `LayoutEngine`, `DataSource`, `registerAccelerator`, `registerLogSink`, `GraphtyError`. | Yes |
| `@graphty/graphty-element/format` | The read-only half of the graph-format vocabulary: `isGraphSnapshot`, the mask helpers, `expandEdges`, `foldArcs`, the gather/scatter/remap helpers. | Yes |
| `@graphty/graphty-element/session` | The error model (`GraphtyError`, `GRAPHTY_ERROR_CODES`, `isGraphtyError`) and the identity and result-shape types. | Yes |
| `@graphty/graphty-element/logging` | `GraphtyLogger`, `LogLevel`, `LogRecord`, `Sink`, the console and remote destinations, `formatLogRecord`, the stored configuration, `parseLoggingURLParams` and `lazy`. Register a destination by name with `registerLogSink` from `/extend`. | Yes |
| `@graphty/graphty-element/webgpu` | A side-effect import that registers the WebGPU accelerator. It is the only module that touches the optional `@graphty/webgpu-graph-algorithms` peer, so a consumer that never imports it never needs that package installed. | No |
| `@graphty/graphty-element/ai` | The natural-language layer and its LLM SDKs, behind optional peers. | No |
| `@graphty/graphty-element/bundle` | One self-contained file for a `<script>` tag. | No |

"Runs in Node" means the module resolves with no Babylon.js, no Lit and no DOM anywhere in its
import graph, which is what makes it usable in a test, a build step or a server.

## Machine-readable files

Both ship inside the installed package, so they can be read from `node_modules` with no network.

- `dist/custom-elements.json` -- the custom elements manifest: every attribute with its type,
  every public member, and all fifty-one DOM events, almost all of them with the type of their
  `detail`. `package.json` points at it through the standard `customElements` field, so editors
  and manifest-aware tooling find it on their own. It is also reachable through the exports map,
  at `@graphty/graphty-element/custom-elements.json`.
- `dist/graphty-catalog.json` -- every algorithm, layout, file format, palette and scale the
  element offers, with each one's options, defaults, ranges and result fields, plus the list of
  error codes. Reachable through the exports map, at
  `@graphty/graphty-element/graphty-catalog.json`. This is the file to
  read when deciding what to offer a user; it is the same data `@graphty/graphty-element/catalog`
  exports, so nothing has to parse TypeScript.

Prose and the generated type reference are at <https://graphty.app/docs/graphty-element/>.

## Not built yet -- do not write code against these

The published API is the element, its attributes, its DOM events, the entry points above, and
the headless session reached through `element.session` or `createGraphSession`. The session
carries the graph data, the runs and their results, scope, selection, visibility and the style
layer stack -- write against those freely.

What follows is designed and NOT implemented. Code written against it will not compile, or will
silently do nothing:

- **Neighbour pages.** The session's data surface answers one node and one edge by id, and has
  no verb for "the neighbours of this node". Walking the records yourself is the only route.
- **`session.calibrate()`.** The limits a session publishes are shipped defaults, not measured
  ones; nothing times this machine yet.
- **Counting what a `{ where }` scope matches.** A scope that names an expression is refused
  rather than resolved, so "how many nodes would this selector pick" has no answer.
- **A time role.** Nothing infers that an attribute is a timestamp, so there is no way to ask
  whether a graph can be played over time.
- **The command union and the journal.** `@graphty/graphty-element/commands` exports nothing
  and is deprecated: it is removed at the next major release unless the command union lands
  there first. Do not import it; read `@graphty/graphty-element/catalog` for the vocabulary.
- **The React wrappers.** `@graphty/graphty-element/react` currently exports nothing. In React 19
  use the tag directly, which assigns matching props as properties.

If a task needs one of these, say it is not available rather than inventing it. Inventing a
plausible call against a surface that does not exist is the most expensive mistake available
here, because it type-checks against nothing and fails only at run time.
