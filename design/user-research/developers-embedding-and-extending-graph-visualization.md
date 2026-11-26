# Developers Who Embed Graph Visualization in Products or Extend It With Plugins

## 1. Summary

This population writes code against a graph visualization library instead of using a finished graph application.
It has six overlapping groups:

1. Front-end and product engineers who put an investigation-style graph view inside a threat intelligence, fraud,
   law-enforcement, graph-database or LLM product (Cytoscape.js, Sigma.js with graphology, vis-network, AntV G6,
   or commercial toolkits such as KeyLines, ReGraph, Ogma and yFiles).
2. Observability and platform engineers who put a live operational graph -- a service map, mesh traffic, network
   topology -- inside a monitoring product. Their graph is generated from metrics or traces and refreshed on a timer,
   and the layout must stay put while numbers on nodes and edges change many times a minute.
3. Developers who embed a 3D or immersive graph (3d-force-graph, react-force-graph, VR and AR variants), mostly
   knowledge-base and personal-network views.
4. Authors of open-source graph libraries who port layouts and algorithms into a host library's extension model.
5. Data scientists who want a metric they already compute in Python to appear in a browser view, often through a
   notebook, Streamlit or Dash wrapper.
6. Domain researchers, mostly in network biology, who write one small reader or score for a tool such as Cytoscape
   Desktop.

Not all of them use React. Angular and Vue product teams, plain-HTML pages, and hosts that wrap a graph as a plugin
of something else (Power BI custom visuals, Grafana panels, Streamlit components, Jupyter widgets) are a large share
of real embeddings. For all six groups the graph library is a component, not a destination. They judge it by:

- how fast they get from install to a data-bound, styled, clickable graph;
- whether it stays fast at the sizes their users load;
- license and bundle cost;
- whether it passes their customer's security review (strict Content Security Policy, offline deployment) and
  accessibility rules;
- whether it can be tested in CI;
- how much code the extension model makes them write.

## 2. Population

**Job titles seen in postings.** These include:

- Senior React Frontend Engineer (Graph / Data Visualization Focus);
- Senior React Developer with Cytoscape.js;
- Sr Frontend Engineer, Graph Data Visualisation (CrowdStrike, which states the team is moving its rendering layer
  to KeyLines);
- Senior Software Engineer Frontend at a graph vendor (GraphAware).

Sources: https://djinni.co/jobs/806184-senior-react-frontend-engineer-graph-data-vis,
https://djinni.co/jobs/851205-senior-react-developer-with-figma-cytoscape-j/,
https://themuse.com/jobs/crowdstrike/sr-frontend-engineer-graph-data-visualisation-remote and
https://graphaware.breezy.hr/p/a278e03099da-senior-software-engineer-frontend.

Contract work also appears on bioinformatics forums ("Looking for a programmer well versed in Cytoscape layouts and
JavaScript", https://www.biostars.org/p/494745). On the research side the titles are staff scientist, postdoc,
bioinformatician and research software engineer.

**What a posting asks for.** One graph-focused posting
(https://djinni.co/jobs/806184-senior-react-frontend-engineer-graph-data-vis) asks for these responsibilities:

- interactive graph visualizations "with filtering, drill-down, property panels, and linked brushing";
- dashboards with PDF/HTML export;
- OAuth2/OIDC and role-based access control;
- "large-scale graph rendering (WebGL where applicable)";
- applied graph algorithms.

It requires "Cytoscape.js, Sigma.js, or similar". The graph view is one deliverable among auth, dashboards and
exports, not the whole job.

**Sectors and products.** These include:

- cyber threat intelligence (EclecticIQ, Core4ce Cyberscape);
- law enforcement (a police contact platform built by Microsoft Services UK, a European police link-analysis
  replacement);
- fraud and due diligence (Cifas, Cerved);
- enterprise AI (C3 AI with ReGraph);
- automotive engineering (Volvo Cars Insight Lab on Ogma).

Sources: https://cambridge-intelligence.com/customer-stories/, https://linkurious.com/ogma/ and
https://linkurious.com/blog/volvo-cars-graph-platform.

Open-source embedders include:

- graph database consoles: Memgraph Lab, Neo4j's NVL (https://neo4j.com/docs/nvl/current/), and Apache AGE Viewer on
  Cytoscape.js
  (https://apache.googlesource.com/age-viewer/+/3b41d0efa4897688b8c33b58c1dd1bd9c7418ba0/frontend/src/components/cytoscape/CypherResultCytoscapeChart.jsx);
- LLM tools: the LightRAG web UI embeds Sigma.js through react-sigma
  (https://huggingface.co/spaces/rm-lht/lightrag/blob/8fa793da7d38c8b7019b27256700ea872837934a/lightrag_webui/src/features/GraphViewer.tsx);
- observability consoles: Grafana's Node Graph panel and Kiali's Istio traffic graph (Section 3.6).

**Rough size, from npm weekly downloads (fetched 2026-11-25 from api.npmjs.org).** These numbers count installs, not
developers, and much of the volume is transitive.

- `cytoscape` has 29.2M, but `mermaid` (28.5M) depends on it, so nearly all Cytoscape.js volume comes from Mermaid
  diagrams.
- Direct-use packages: `graphology` 2.2M, `force-graph` 1.5M, `react-force-graph-2d` 1.35M, `vis-network` 1.1M,
  `3d-force-graph` 851K, `sigma` 655K, `react-force-graph-3d` 408K, `@antv/g6` 386K, `@react-sigma/core` 127K,
  `reagraph` 105K, `react-cytoscapejs` 93K, `@neo4j-nvl/base` 29K, `3d-force-graph-vr` 26K, `3d-force-graph-ar` 25K.
- `react-force-graph-3d` depends on `3d-force-graph`, so part of the 851K is React use.
- Commercial toolkits ship as private tarballs and have no public counts. The ReGraph install is
  `npm install file:<downloaded>.tgz` (https://developers.cambridge-intelligence.com/docs/regraph/getting-started).

**Cytoscape app authors.** The Cytoscape App Store launched with "over 150" apps
(https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3654709/). By 2018 it had "over 330 apps written by over 550 authors"
(https://pmc.ncbi.nlm.nih.gov/articles/PMC6013757). Cytoscape Desktop has "over 300 000 downloads annually"
(https://pmc.ncbi.nlm.nih.gov/articles/PMC12230733/).

**How often they touch graph tools.**

- Product engineers work in the library daily for months, then occasionally for maintenance. EclecticIQ evaluated
  KeyLines in May 2015 and had a beta with customers in October 2015 (https://cambridge-intelligence.com/eclecticiq-case-study/).
  A police link-analysis prototype arrived "within weeks"
  (https://www.casestudies.com/company/cambridge-intelligence/case-study/leading-systems-integrator-company-customer-case-study).
- Observability engineers build the map once and keep tuning it as the platform grows.
- Researchers write one reader or score and stop.
- Library authors work weekly, across years.

**Skill profile.**

- Product and platform engineers: strong TypeScript and build tooling. Their graph literacy ranges from none to
  moderate.
- Library authors: experts in algorithms, typed arrays, workers and profiling.
- Data scientists: expert graph literacy, weak JavaScript.
- Researchers: domain experts who use R or Python, and Java only when Cytoscape Desktop forces it.

**Accessibility and procurement.** The leading buyers (government, law enforcement, intelligence) buy under Section
508 and WCAG rules. The market leader states its limits openly. KeyLines, being "a visual tool," does not support
"many of the accessibility requirements for non-visual representations" in WCAG 2.0 and Section 508
(https://developers.cambridge-intelligence.com/docs/keylines/accessibility). Accessibility is therefore integration
work that the embedding developer carries (Section 5.9).

## 3. Personas

These confirm or deepen the four existing Graphty plugin-author records and add three embedder personas that Graphty
does not have. Each one is a composite grounded in the cited postings, docs and case studies.

### 3.1 Priya Raman -- product engineer embedding a graph view (NEW: `graph-product-frontend-engineer`)

**Role.** Priya is a senior front-end engineer on a cyber threat intelligence SaaS product. Her team owns the
"Investigate" page: a search box, a graph canvas, a properties panel, a time filter and an export button.

**Background.** She has six years of React and TypeScript, has written Cypher and GraphQL, but has never written a
graph algorithm.

**Tools today.**

- Cytoscape.js through `react-cytoscapejs`, using its elements, stylesheet and layout props and a `cy` ref callback
  for events (https://github.com/plotly/react-cytoscapejs).
- The `cytoscape-fcose` and `cytoscape-popper` extensions.
- A Redux store for selection.

Her team is evaluating KeyLines, the same move the CrowdStrike posting describes.

**Data.** Indicators of compromise (IP addresses, domains, file hashes, actors) from many feeds. Core4ce reports "37+
external providers" and "billions of data points" behind a canvas that shows a few hundred at a time
(https://cambridge-intelligence.com/core4ce-cyberscape-the-cyber-security-forensics-platform).

**Goals.** Seed a graph from a search. Expand on double-click without freezing. Color by type and risk. Group
duplicates. Save a workspace. Export a PDF.

**Frustrations.**

- Updating the React wrapper's elements stacks nodes on top of each other unless the layout is re-run
  (https://lightrun.com/answers/plotly-react-cytoscapejs-question-setting-elements-property-via-setstate-causes-graph-nodes-to-stack-on-top-of-each-other).
- Listener cleanup is undocumented (https://github.com/plotly/react-cytoscapejs/issues/28).
- WebGL libraries crash Next.js server rendering with "window is not defined"
  (https://www.github.com/reaviz/reagraph/issues/172).
- Force layouts of a few thousand nodes are slow
  (https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/33272837/rendering-a-large-network-4700-nodes-and-5500-edges).
- Her customers' security reviews and accessibility questionnaires land on her desk (Sections 5.8 and 5.9).

### 3.2 Sofia Marquez -- front-end developer extending the element (existing `plugin-author-frontend-developer`, confirmed and corrected)

The existing record (brand palette from design tokens, telemetry logger, "fit to selection" camera) is plausible.
The evidence shows, however, that front-end developers mostly reach for these as configuration and event wiring, not
as plugins:

- Palettes are style rules: Cytoscape.js stylesheets, ReGraph item props, G6 `palette` options.
- The plugin systems they do meet are UI widgets. Cytoscape.js's 73 listed extensions include context menus, popper
  tooltips, minimaps, lasso and map underlays (https://js.cytoscape.org/#extensions). G6 has a `BasePlugin` class
  for tooltips, minimaps and toolbars (https://g6.antv.antgroup.com/en/manual/plugin/custom-plugin).

Correction: her first "plugin" is more likely a tooltip, context menu or custom node renderer than a palette registry.
G6 ships `@antv/g6-extension-react` so that a React component can be a node
(https://g6.antv.antgroup.com/en/manual/element/node/react-node).

Sofia may work in Angular or Vue. Ogma documents React, Angular and Vue integrations
(https://doc.linkurious.com/ogma/latest/tutorials/react/). For a web component, that means property and event binding
(Section 5.1a).

Add two frustrations to the record:

- Commercial toolkits require obfuscating the library inside your bundle and never shipping source maps (ReGraph,
  https://developers.cambridge-intelligence.com/docs/regraph/getting-started).
- ReGraph "components stop working after a six-week watermark period" when a license expires
  (https://cambridge-intelligence.com/regraph-license-renewal).

### 3.3 Ines Duarte -- graph library author porting a layout (existing `plugin-author-graph-library-author`, confirmed and deepened)

The record matches what library sources show. The graphology ForceAtlas2 package she would port works like this:

- It packs each node into 10 floats and each edge into 3 floats of a `Float32Array`
  (https://raw.githubusercontent.com/graphology/graphology/master/src/layout-forceatlas2/helpers.js).
- It offers a synchronous `forceAtlas2(graph, {iterations, settings})`, an `.assign` variant that writes `x`/`y`, and
  `inferSettings(graph)`.
- It has a worker supervisor, `FA2Layout`, with `start`, `stop`, `kill` and `isRunning`. The worker is built by a
  script that inlines the source into `webworker.js` at publish time
  (https://graphology.github.io/standard-library/layout-forceatlas2.html).

The graphology convention for algorithms is `fn(graph, options)` returning a map, plus `fn.assign` writing a node
attribute. Pagerank's defaults match NetworkX: alpha 0.85, 100 iterations, tolerance 1e-6
(https://raw.githubusercontent.com/graphology/graphology/master/src/metrics/README.md).

A Cytoscape.js layout is a prototype with three parts (https://js.cytoscape.org/#extensions):

- a constructor that receives `options.cy` and `options.eles`;
- `run()`, which either calls `eles.layoutPositions()` or iterates;
- `stop()`.

Leiden already exists in graphology, so her real ask of a new host is parity, not novelty. GPU-first authors go
further. cosmos.gl takes positions and links as flat `Float32Array`s and reports clicks by point index
(https://cdn.jsdelivr.net/npm/@cosmos.gl/graph@2.6.4/README.md).

### 3.4 Marcus Webb -- data scientist porting a metric (existing `plugin-author-data-scientist`, confirmed with a correction)

Correction: today Marcus's usual path is to compute the metric in Python and hand the values to a browser widget,
not to port it to JavaScript.

- ipysigma takes `node_size=nx.eigenvector_centrality(g)` in a notebook (https://pypi.org/project/ipysigma).
- Dash Cytoscape binds `tapNodeData` to Python callbacks (https://dash.plotly.com/cytoscape/events).
- streamlit-agraph wraps vis.js through `react-graph-vis` and takes Python lists of `Node` and `Edge` objects
  (https://github.com/ChrisDelClea/streamlit-agraph).
- pyvis writes vis-network HTML, and users report that it stops loading above about 1,000 nodes in Streamlit
  (https://discuss.streamlit.io/t/streamlit-pyvis-error-when-displaying-large-network/28501).

Each of these is the graph library repackaged as a plugin of another host (Section 5.1a). A requirement follows:
accept a precomputed per-node column as a first-class "metric", with the same color and size treatment as a built-in
algorithm.

### 3.5 Tomasz Kowalczyk -- researcher writing a one-off reader or score (existing `plugin-author-domain-researcher`, confirmed and deepened)

Readers and scores are the classic small Cytoscape app:

- AMatReader reads adjacency matrices. It is about 72 KB of Java, has a preview that "predicts its import settings",
  and wraps its CyREST endpoints in a pip package (https://github.com/idekerlab/aMatReader,
  https://f1000research.com/articles/7-823/v2).
- dot-app imports and exports Graphviz files (https://f1000research.com/articles/5-2543/v2).

The Java route requires Maven, an OSGi bundle and `Embed-Dependency` directives. Apps often get stuck in "Installed"
rather than "Resolved" because of a dependency problem (https://wikiold.cytoscape.org/HowToAddLibraryDependencies,
https://groups.google.com/g/cytoscape-discuss/c/xYU8gO-hRHE).

Because of that cost, most researchers script instead. RCy3 or py4cytoscape loads data frames into a running
Cytoscape with `createNetworkFromDataFrames`
(https://bioconductor.org/packages/release/bioc/vignettes/RCy3/inst/doc/Importing-data.html).

Cytoscape Web lowers the bar further. A "Service App" is a REST service in any language, registered by pasting its
URL (https://cytoscape-web.readthedocs.io/en/latest/Extending.html).

### 3.6 Dana Okafor -- platform engineer embedding a live service map (NEW: `observability-service-map-engineer`)

**Role.** Dana works on the internal developer platform team at a company running about 300 microservices on
Kubernetes. She owns the "Service map" page in the observability console, and on-call engineers open it during
incidents.

**Tools today.** Grafana's Node Graph panel over Tempo service-graph metrics
(https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/). Kiali for the Istio mesh. The older Kiali
UI was built on Cytoscape.js 3.15 with `cytoscape-popper`, and the current Kiali frontend depends on
`@patternfly/react-topology` (https://raw.githubusercontent.com/kiali/kiali-ui/master/package.json,
https://raw.githubusercontent.com/kiali/kiali/master/frontend/package.json).

**Data.** Grafana's Node Graph panel defines a public two-frame data contract
(https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/):

- **Nodes frame:** `id` is required. Optional fields are `title`, `subtitle`, `mainstat`, `secondarystat`, `color`,
  `icon`, `nodeRadius`, `highlighted`, `fixedX`, `fixedY` and `detail__*`.
    - `arc__*` fields draw a colored ring around the node, and "all values in these fields should add up to 1".
    - If you use `fixedX`, "all nodes must provide a value".
    - `detail__*` fields appear in the header of the click menu.
- **Edges frame:** `id`, `source` and `target` are required. Optional fields are `mainstat`, `secondarystat`,
  `thickness`, `color`, `strokeDasharray` and `detail__*`.

Kiali's edges carry `responseTime` in milliseconds, `throughput` in bytes per second, the percentage of traffic over
mutual TLS, and per-protocol `traffic` rates. Its nodes carry `healthData` and compound `parent` boxes
(https://pkg.go.dev/github.com/kiali/kiali/graph/config/cytoscape).

**Encodings she must reproduce.** In Kiali:

- Node color shows health, and edge color shows request health.
- HTTP traffic is drawn as animated dots, with errors as red diamonds: "The more dense the circles and diamonds the
  higher the request rate. The faster the animation the faster the response times."
- The graph "can also be paused to examine a particular state, or replayed to re-examine a particular time period"
  (https://v1-82.kiali.io/docs/features/topology).
- Refresh choices are pause, 10s, 15s, 30s, 1m, 5m and 15m, and 15 seconds is the documented default
  (https://v1-52.kiali.io/docs/configuration/console-customization).

**Sizes.** Grafana "show[s] up to 200 visible nodes by default". Hidden nodes sit behind markers that show a count
and expand on click. The documentation also warns that the "Layered layout can be slow when the graph has more than
500 nodes" (Node Graph page).

**Frustrations.**

- A relayout on every refresh makes the map jump, so on-call engineers lose their place.
- Big meshes cross the 200-node and 500-node limits.
- Grafana allows "only Grafana built in icons".

The first two are inferred from the documented caps and the pause control. No first-person report was found.

### 3.7 Leo Brandt -- developer embedding a 3D graph (NEW: `3d-graph-embedder`)

**Role.** Leo is an independent developer who builds a 3D "explore your notes" view as an Obsidian plugin, and builds
3D network views for clients' websites.

The evidence is mostly open source:

- Obsidian plugins built on 3d-force-graph: obsidian-3d-graph (87 stars) and TagsRoutes (102 stars).
- A Next.js App Router demo that manipulates react-force-graph's three.js objects.
- A Matrix server-statistics 3D map (https://github.com/Apoo711/obsidian-3d-graph,
  https://github.com/kctekn/obsidian-TagsRoutes, https://github.com/mohidmakhdoomi/nextjs-3d-force-graph-impl,
  https://github.com/vasturiano/3d-force-graph/issues/491).

No commercial product built on a 3D graph library was found.

**Workflow choices** (https://github.com/vasturiano/3d-force-graph, https://github.com/vasturiano/react-force-graph):

- Install by script tag from jsDelivr or npm, or use one of the React packages (2D, 3D, VR, AR). They share one
  interface, and the VR and AR versions run on A-Frame and AR.js.
- Pick `controlType`: trackball (the default), orbit or fly.
- Replace node spheres with a custom three.js `Object3d` through `nodeThreeObject`, often text sprites.
- Draw flow with `linkDirectionalParticles`.
- Use `dagMode` for trees.
- Freeze the simulation with `cooldownTicks` or `cooldownTime` (15 s default).
- Reach into `scene()`, `camera()`, `renderer()` and `postProcessingComposer()` for anything else.

**Frustrations** (from GitHub issues):

- Text sprites on 10,000+ nodes are "very slow" (3d-force-graph issue 515).
- The animation loop never stops on graphs over 5,000 nodes, and the view gets slower each time data is replaced
  (issue 479).
- A request to use WebGPU for "200k" elements (issue 491).
- In VR, it is unclear how to detect a controller touching a node, and the camera cannot be reached as it can in
  desktop mode (react-force-graph issues 285 and 243).
- Any React state change re-renders the whole VR graph (issue 581).

No README section covers exporting or sharing a 3D view, and no source was found for how 3D views are shared.

## 4. Use cases (ranked)

| #   | Question or job                                                                                                                       | Who                                   | Frequency                                               | Stakes                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | "Show what is connected to this, let the analyst expand, show details on click" inside a product                                      | Product engineer                      | The core screen of every investigation product          | High: the product's differentiator                                    |
| 2   | "Show live traffic between services, keep it in place while numbers update every 10-60 s, let on-call pause and click into one edge"  | Platform engineer                     | Built once; watched continuously, critical in incidents | High: a jumping or frozen map during an outage costs time to recovery |
| 3   | Which library should we build on? (performance, license, framework fit, 3D, security review)                                          | Tech lead                             | Once per product                                        | High and hard to reverse (Memgraph rewrote its renderer, Section 5.2) |
| 4   | Keep the view responsive at the sizes users load                                                                                      | Product, platform engineers           | Continuous                                              | High: freezing browsers end evaluations                               |
| 5   | Pass the customer's security review and accessibility questionnaire (CSP, offline, Section 508)                                       | Product engineer                      | Every regulated sale                                    | High: a blocker, not a bug                                            |
| 6   | Encode domain meaning: type to color, score to size, icons, grouping, time filter                                                     | Product engineer                      | Every release                                           | Medium                                                                |
| 7   | Save and share; export PDF/PNG reports, often generated on the server                                                                 | Product engineer                      | Every product                                           | Medium-high (evidence in policing)                                    |
| 8   | Package the graph as a plugin of a BI or dashboard host (Power BI visual, Grafana panel, Streamlit, Jupyter) from a fixed table shape | Host-plugin developer, data scientist | Once per host                                           | Medium                                                                |
| 9   | Test the graph view in CI                                                                                                             | Product engineer                      | Every change                                            | Medium                                                                |
| 10  | Embed a 3D or VR graph view                                                                                                           | 3D embedder                           | Per project                                             | Low-medium                                                            |
| 11  | Port a layout or algorithm into a host library                                                                                        | Library author                        | A few per year                                          | Medium                                                                |
| 12  | Show my Python metric on the graph                                                                                                    | Data scientist                        | As needed                                               | Medium                                                                |
| 13  | Read my lab's format or compute my lab's score in a shared tool                                                                       | Researcher                            | One-off, repeated across 330+ Cytoscape apps            | Low per instance                                                      |
| 14  | Add a UI widget: tooltip, context menu, minimap, map underlay                                                                         | Front-end developer                   | Per product                                             | Low-medium                                                            |

## 5. Step-by-step workflows

### 5.1 Install to an embedded, data-bound, styled, interactive graph (React)

Sources: react-cytoscapejs README; Cytoscape.js docs (https://js.cytoscape.org/); sigma.js quickstart
(https://www.sigmajs.org/get-started/quickstart/); react-sigma (https://sim51.github.io/react-sigma/docs/start-setup);
ReGraph getting started; yFiles GraphBuilder (https://docs.yworks.com/yfiles-html/dguide/graph_builder/).

1. **Install.** For open source, `npm install cytoscape react-cytoscapejs` (pin the peer `cytoscape`), or `sigma
graphology @react-sigma/core`. Commercial toolkits mean a sales contact, a downloaded `.tgz`, and for yFiles a
   `license.json` in the source tree.
2. **Give it a box.** Every library needs a container with explicit size ("must have a defined width and height",
   sigma). In Next.js, load it with `next/dynamic` and `ssr: false`, or WebGL code crashes on `window`.
3. **Map application data to the library's model.** This is where the work is.
    - Cytoscape.js wants `{data: {id, source, target}}` elements.
    - Sigma wants a graphology `Graph` filled with `addNode(id, {x, y, size, color})`.
    - ReGraph wants an `items` object keyed by id.
    - yFiles binds "business data" through `createNodesSource` and `createEdgesSource(data, sourceId, targetId)`.

    Decide which backend fields become ids, labels and style inputs. Ids must be stable across fetches, or
    expand-merge duplicates nodes.

4. **Positions.** Sigma draws whatever is in `x`/`y`, so the developer assigns positions and runs ForceAtlas2 in a
   worker, or precomputes them. Cytoscape.js runs a named layout after `cytoscape.use(fcose)`. ReGraph and Ogma lay
   out internally and report positions back.
5. **Style.**
    - Cytoscape.js: a CSS-like stylesheet with `mapData()`. Function values are slow
      (https://js.cytoscape.org/#performance).
    - Sigma: `nodeReducer`/`edgeReducer` plus shader "programs".
    - ReGraph: per-item props.
6. **Events.**
    - Cytoscape.js: `cy.on('tap', 'node', ...)` through a ref, with manual removal on unmount.
    - react-sigma: `useRegisterEvents`, which manages listener lifecycle.
    - ReGraph: `onClick`/`onChange`, with state held by the app and passed back as props.
7. **Wire the product chrome.** A search box, a properties panel bound to the selection, zoom controls, a legend and
   a layout switcher. This is typically more code than the graph itself.
8. **Lifecycle.** Destroy on unmount (`renderer.kill()` in sigma). Keep one instance in a ref, diff incoming
   elements, and re-run layout only for new elements
   (https://gist.github.com/mgaebler/32d904e1a93678c2816f9cc0ad00bfaf).
9. **Hand-off and testing.** See Section 5.10.

Time: the vendor evidence is weeks for a prototype and about five months to beta (EclecticIQ).

### 5.1a Embedding without React: plain HTML, Angular, Vue, and host plugins

Sources: Vue web components guide (https://vuejs.org/guide/extras/web-components.html); Custom Elements Everywhere
(https://custom-elements-everywhere.com/); 3d-force-graph README; Power BI Force-Directed Graph
(https://github.com/microsoft/PowerBI-visuals-ForceGraph); Grafana Node Graph; streamlit-agraph.

1. **Plain HTML.** Add a script tag from a CDN (3d-force-graph documents `//cdn.jsdelivr.net/npm/3d-force-graph`), or
   an ES module import. Cytoscape.js extensions also auto-register when `window.cytoscape` exists.
2. **Vue.** Mark the tag as a custom element with `compilerOptions.isCustomElement`.
    - Vue sets a DOM property when the key exists on the element (`in` check) and an attribute otherwise. Objects and
      arrays must go as properties (`.prop` or the `.` shorthand), because "attributes are always strings".
    - Events are native `CustomEvent`s, read from `event.detail`.
3. **Angular and React 19.** Both score 100% on Custom Elements Everywhere's property and event tests. React 19 "uses
   a runtime heuristic" to choose property or attribute, and earlier React versions are not listed.
4. **Host plugin (BI and dashboards).** The data arrives as a fixed table, not a graph.
    - Microsoft's Force-Directed Graph visual "ideally" needs "two dimensions and one measure (for the weightage)",
      draws a D3 force layout, and lets users drag nodes.
    - Network Navigator uses Source and Target columns. Forum users report that weights do not sum into node sizes
      and that it has not been released since 2018
      (https://www.sqlservercentral.com/blogs/power-bi-with-different-network-visualizations).
    - A Fabric community thread is titled "Nailing down nodes in a force-directed graph"
      (https://community.fabric.microsoft.com/t5/Desktop/Nailing-down-nodes-in-a-force-directed-graph/m-p/488179).
      The page returned 403 to us, so only its title is cited.
    - Grafana panels detect a node graph from frames named `nodes` and `edges`.
    - Streamlit and Jupyter wrappers take Python lists or NetworkX graphs.

    The developer writes the adapter from table rows to nodes and edges, de-duplicating node ids from both columns.

### 5.2 Selecting a library

Sources: the Cylynx comparison (https://dev.to/timlrx/a-comparison-of-javascript-graph-network-visualisation-libraries-34a8);
Memgraph's evaluation (https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool);
the Ogma comparison (https://doc.linkurious.com/ogma/latest/compare/cytoscape.html).

1. **Write the criteria.** Memgraph used popularity and maintenance, documentation quality rated 1 to 5, "should not
   depend on the DOM" (so work can move to Web Workers), and a styling system able to express their own style
   language.
2. **Shortlist by license.** D3 is BSD. vis.js, Sigma.js, G6 and react-force-graph are MIT. KeyLines and Ogma are
   commercial annual subscriptions with unpublished prices (https://cambridge-intelligence.com/pricing/procurement/).
3. **Benchmark with your own data.**
    - Memgraph at 10k nodes and edges: D3 canvas took 27 s to render and 26 s to simulate. vis.js simulation took
      about 15-20 minutes. Sigma.js (WebGL) took 5-10 s and 15 s.
    - yWorks rules of thumb: SVG about 2k nodes, Canvas about 5k, WebGL about 10k.
    - Cytoscape.js WebGL preview: 1,200 nodes and 16,000 edges went from about 20 to over 100 frames per second
      (https://blog.js.cytoscape.org/2025/01/13/webgl-preview/).
4. **Check fit.** Framework story (Section 5.1a), TypeScript types (Cytoscape.js ships `index.d.ts`), algorithms
   included, and 3D.
5. **Security and deployment review** (Section 5.8) and accessibility (Section 5.9). Both are often done late, by
   the customer.
6. **Build, buy or write your own.** Memgraph rejected Cytoscape.js (it depends on the DOM) and Cosmos (too little
   styling). It found Sigma.js fastest but thinly documented, and built Orb, a d3-force simulation in workers with a
   custom canvas renderer. Game of Thrones (3,000 nodes) went from 10 minutes to 15 seconds. Vendors argue the
   reverse: "Cytoscape.js is free -- but development time isn't" (a vendor claim).

### 5.3 Building the query-and-expand investigation view

Sources: Core4ce, EclecticIQ and police case studies; Linkurious admin manual
(https://doc.linkurious.com/admin-manual/latest/advanced-settings/); Neo4j Browser settings
(https://neo4j.com/docs/browser-manual/current/operations/browser-settings/).

1. **Seed** from a search (IP addresses, emails, device IDs). The backend returns first-degree neighbors.
2. **Cap the payload.**
    - Neo4j Browser: `initialNodeDisplay` 300 and `maxNeighbours` 100. Raising it to 1,000 "made the UI
      unresponsive" (https://community.neo4j.com/t/browser-node-relationship-limit/69507).
    - Bloom: 10,000 elements per query.
    - Linkurious: a 10,000-edge supernode threshold and an expand threshold above which the user must refine the
      expand.
3. **Merge and lay out incrementally.** Merge by id and keep existing positions. yFiles recommends incremental
   layouts for new elements (https://docs.yworks.com/yfiles-html/dguide/large_graph_performance/).
4. **Enrich and encode.** Type styles, risk badges, annotations, and a time bar (KeyLines, ReGraph).
5. **Reduce.** Group duplicates (KeyLines combos, Ogma grouping), filter and delete.
6. **Save and share** a serialized workspace (EclecticIQ "Workspace").
7. **Export.** PDF reports (Core4ce), PNG/SVG, CSV/Excel. Server-side rendering (Section 5.10) produces images for
   reports.
8. **Next.** Core4ce lists path finding and centrality as future work, so analytics come after the
   expand-and-annotate loop.

### 5.4 Building a live service map (observability)

Sources: Grafana Node Graph and Tempo service-graph docs; Kiali topology and console customization docs.

1. **Generate the graph from telemetry.** Tempo's metrics-generator (or Grafana Alloy) turns spans into
   `traces_service_graph_request_total` and related metrics in Prometheus. Grafana reads those metrics to draw the
   service graph, and a custom panel can query them with `label_join` copying client and server labels into `source`
   and `target`.
2. **Shape two frames.** Nodes get `mainstat`/`secondarystat` (for example requests per second and p95 latency) and
   `arc__success`/`arc__errors` fractions that sum to 1. Edges get `mainstat`, `thickness` scaled to rate, and `color`
   for errors. Use `fixedX`/`fixedY` when positions come from a known topology.
3. **Choose a layout.** Layered is the default and suits service graphs. Force is for graphs over 500 nodes. Grid
   shows nodes sorted by a stat.
4. **Refresh.** Re-run the query every N seconds (Kiali defaults to 15 s). Node identity must survive refreshes so
   that only attributes change, not positions.
5. **Animate flow.** Kiali draws dots whose density means request rate and whose speed means response time, with red
   diamonds for errors.
6. **Cap and expand.** Above 200 nodes Grafana hides some nodes behind count markers.
7. **Investigate.** Pause on the incident, click a node or edge to open `detail__` fields and links to traces and
   metrics, or replay a past window (Kiali).

### 5.5 Embedding a 3D graph

Sources: 3d-force-graph and react-force-graph READMEs and issues (Section 3.7).

1. Install by script tag or npm. Choose 2D, 3D, VR or AR (same props).
2. Pass `graphData({nodes, links})` or `jsonUrl`. Color with `nodeAutoColorBy`.
3. Choose camera controls and the initial `cameraPosition`.
4. Replace nodes with custom meshes or text sprites. Add particles for flow.
5. Tune for size: `warmupTicks`, `cooldownTicks`, and pausing the animation for a static view. Turning off pointer
   interaction is documented as the biggest performance gain.
6. For VR, switch to the A-Frame package and handle controllers yourself (issue 285).
7. Export or share: no documented route found.

### 5.6 Keeping an embedded graph fast

Sources: Cytoscape.js performance doc; yFiles large-graph guide; visNetwork performance
(https://datastorm-open.github.io/visNetwork/performance.html).

1. Batch mutations (`cy.batch()`).
2. Cheapen edges: straight or haystack edges, opaque rather than semi-transparent ("more than twice as fast"),
   `hideEdgesOnViewport`, and `pixelRatio: 1`.
3. Cheapen labels: `min-zoomed-font-size`, labels on hover, and yFiles level-of-detail styles.
4. Precompute layout: igraph coordinates with `stabilization = FALSE` for visNetwork. yFiles warns that a 10,000-node
   layout means "a waiting time of at least half a minute".
5. Reduce before drawing: fold, filter, group, aggregate.
6. Move to WebGL or GPU. Cytoscape.js `webgl: true` has no dashed lines and spends a few seconds building sprite
   sheets with no progress bar. cosmos.gl runs the simulation on the GPU for "hundreds of thousands of points and
   links" (https://openjsf.org/blog/introducing-cosmos-gl).

### 5.7 Packaging a layout or algorithm as a plugin

Sources: Cytoscape.js extensions; graphology ForceAtlas2; G6 extensions (https://g6.antv.antgroup.com/en/manual/graph/extension);
Gephi plugins (https://github.com/gephi/gephi-plugins).

1. **Scaffold.** Cytoscape.js starts from `rollup-starter-lib`. graphology uses a monorepo folder with `index.js`,
   `worker.js`, `.d.ts` and `bench.js`. Gephi uses `mvn org.gephi:gephi-maven-plugin:generate`.
2. **Implement the contract.**
    - Cytoscape.js: the layout prototype, emitting `layoutstart`, `layoutready` and `layoutstop`.
    - graphology: `fn(graph, options)` plus `.assign`.
    - G6: extend a base class and `register(ExtensionCategory.X, name, Class)`. A second registration of the same name
      is ignored.
    - Gephi statistics: a builder, an `execute()` class and a UI provider.
3. **Workers.** Cytoscape.js leaves workers to the author. graphology inlines a `webworker.js` at publish time.
4. **Benchmark and test** on `prepublishOnly`.
5. **Register** with `register(cytoscape)`, plus auto-registration for script-tag users.
6. **Publish and list** (73 Cytoscape.js extensions are listed). Academic layouts are cited as papers (fCoSE,
   https://unpkg.com/cytoscape-fcose@2.2.0/README.md).

Reported friction:

- Most Cytoscape.js extensions are untyped JavaScript.
- G6 v5 changed which built-in plugins are registered by default (https://www.Github.com/antvis/G6/issues/5700).
- React nodes in G6 lose state styling (https://github.com/antvis/g6/issues/6192).

### 5.8 Security review and deployment (CSP, offline, on-premises)

Sources: AntV issue (https://github.com/antvis/G2/issues/5462); graphology ForceAtlas2 docs; ReGraph getting started.

1. **Strict CSP.** A WordPress plugin team embedding AntV hit "Refused to create a worker from 'blob:...' because it
   violates the following Content Security Policy directive". The worker was created from a blob URL in
   `@antv/algorithm`'s `createWorker`.
    - The team wrote that they would have to tell users to allow `worker-src blob:`, "but this one our users
      justifiably reject on the basis of security". They asked: "Is it somehow possible to 'skip' Web workers when
      they cannot be used?"
    - The maintainers' answer was to upgrade to the next major version.
    - graphology's ForceAtlas2 worker is source inlined into a worker at publish time, the same blob-style pattern.
    - The checklist: `worker-src`, no `eval`, and no inline styles that need `unsafe-inline`.
2. **Offline and air-gapped use.** All assets (fonts, icons, workers, WebAssembly, optional data) must be
   self-hostable, with no CDN, telemetry or runtime downloads. No source found for a published checklist from a
   graph vendor. The requirement comes from the deployment model of the government and police customers in Section 2.
3. **License and code handling.** Commercial toolkits forbid shipping source maps and require obfuscation (ReGraph).
4. **RBAC and data minimization** happen in the backend. The posting lists OIDC and role-based access control beside
   the graph view.

### 5.9 Accessibility

Sources: KeyLines accessibility docs (https://developers.cambridge-intelligence.com/docs/keylines/accessibility) and
guide (https://cambridge-intelligence.com/build-accessible-data-visualization-apps-with-keylines/).

What KeyLines provides: built-in Esc, Delete, arrow keys, Space (time bar) and Ctrl+A, plus a `focus(true)` call.

What it leaves to the embedder:

- "Add a search box that users can Tab to and enter text to find nodes".
- "Add a focus function that users can Tab to and press Enter to give focus to the chart".
- ARIA decisions: label the chart's structure, or "use the aria-hidden attribute to hide it from screen readers".
- Text alternatives: "Create text versions of your charts", a data table or summary, and screen-reader descriptions
  for focused nodes and links. Its docs suggest `chart.serialize` as the starting point.
- Colorblind and high-contrast schemes, never "colour alone", and the ability to turn off animations.

### 5.10 Testing an embedded graph view and rendering it headless

Sources: yFiles testing chapter (https://docs.yworks.com/yfiles-html/dguide/advanced/testing.html); Playwright
snapshots (https://playwright.dev/docs/test-snapshots); cytosnap (https://github.com/cytoscape/cytosnap); Cytoscape.js
headless mode (https://js.cytoscape.org/).

1. **Unit-test the data mapping** in Node. yFiles notes that jsdom and happy-dom "can only be used for basic unit
   tests that do not involve yFiles visualizations". Cytoscape.js runs `headless: true` in Node for graph logic.
2. **Query graph state through the API, not the DOM.** yFiles says to test "the graph structure itself ... rather
   than the DOM". It provides hit testing to find the node at a point.
3. **Drive real input in a real browser** (Playwright, Cypress, WebdriverIO, Vitest browser mode). Send the full
   pointer sequence (move, down, move, up), because "some testing frameworks may not accurately replicate these
   sequences".
4. **Make layout deterministic.** Use a seed or fixed positions, and wait for layout completion (`layoutstop` in
   Cytoscape.js) before asserting.
5. **Visual snapshot.** Playwright `toHaveScreenshot` warns that "browser rendering can vary based on the host OS,
   version, settings, hardware", so baselines must be generated in the same environment that compares them.
6. **Server-side images** for tests and reports. cytosnap "renders images of Cytoscape.js graphs on the server using
   Puppeteer" to PNG or JPG, or returns the computed positions as JSON.

### 5.11 Researcher's one-off reader or score

- **Route A, desktop app** (days to weeks; no source gives the time). Copy `project-template` from cytoscape-samples
  (https://github.com/cytoscape/cytoscape-samples). Implement an `InputStreamTaskFactory`
  (https://cytoscape.org/javadoc/3.10.0/org/cytoscape/io/read/InputStreamTaskFactory.html) and register it from the
  `CyActivator`. Debug "Installed" versus "Resolved" bundles in the OSGi console. Optionally expose CyREST commands,
  submit to the App Store, and write an F1000Research article.
- **Route B, script** (hours). Compute the score as a data-frame column, call `createNetworkFromDataFrames`, and map
  color to the column. Cytoscape must be running locally.
- **Route C, Cytoscape Web Service App.** A REST service in Python or R that returns network updates, registered by
  pasting its URL.

### 5.12 Data scientist's metric to the browser

1. Compute the metric in NetworkX.
2. Pass the dict to a widget (ipysigma, Dash, streamlit-agraph), or export GEXF, GraphML or JSON with the score as a
   node attribute.
3. If porting, translate idioms (`G.neighbors(u)` becomes `graph.forEachNeighbor`) and return a map plus `.assign`.
4. Check parity against NetworkX with matching defaults.

## 6. Data

- **Sources.**
    - Graph databases (Neo4j, Memgraph, Neptune, Apache AGE), REST and GraphQL APIs, threat feeds, and LLM-extracted
      knowledge graphs.
    - Traces and metrics: spans turned into service-graph metrics in Prometheus (Tempo), and Istio telemetry (Kiali).
    - BI tables with source, target and weight columns.
    - Lab files and notebooks.
- **Formats.** Library JSON (Cytoscape.js elements, graphology JSON, ReGraph items), Cypher rows, Grafana node and
  edge data frames, CX/CX2, GEXF, GraphML, DOT, SIF, adjacency matrices, and NetworkX objects.
- **Sizes rendered.** Visible views are small even when the store is huge:
    - 300 initial nodes (Neo4j Browser) and 100 neighbors per expand;
    - 200 visible nodes by default in Grafana, where layered layout is slow above 500;
    - an upper bound of 20,000 edges or 26,000 elements in Cytoscape Web, set by memory per tab;
    - whole-graph overviews of 10k to 100k+ nodes, which need WebGL or GPU rendering.

    3D users report trouble at 5,000 to 10,000 nodes.

- **Update rate.** Investigation views change on user action. Service maps refresh every 10 s to 15 min, and
  positions must persist while attributes change.
- **Identifiers.** Stable ids are required for merge-on-expand and refresh. Index-based GPU libraries (cosmos.gl)
  force the embedder to keep an id-to-index map.
- **Properties.** Directed and multi edges, types, weights, timestamps, geo coordinates, compound nodes, per-edge live
  stats (rate, error rate, latency, throughput, percentage over mutual TLS), node stat rings, and fixed coordinates.
- **Sensitivity.** Law enforcement, intelligence and financial data bring RBAC and OIDC, strict CSP, on-premises and
  air-gapped installs (Section 5.8), and Section 508 and WCAG procurement (Section 5.9).

## 7. Analysis methods

Embedders use few algorithms directly. The investigation loop is expand, filter, group and annotate, with path
finding and centrality added later. The observability loop is threshold coloring of live stats, plus ranking. Kiali
ranks nodes by criteria such as inbound edges, from 1 to 100. Libraries chosen for their algorithms are Cytoscape.js,
graphology (Louvain, Leiden, metrics), KeyLines, Ogma and G6.

Each group validates differently:

- Library authors use benchmarks and parity tests against a reference implementation.
- Data scientists compare against NetworkX.
- Researchers compare against their lab's spreadsheet.

Layout quality is judged by eye.

## 8. Outputs and collaboration

Product engineers hand off a reusable component and the screens built on it. End-user outputs are saved workspaces,
PDF reports, images and spreadsheets, and in policing, admissible evidence (Sistemi & Automazione's TETRAS "turns raw
data into admissible evidence", https://cambridge-intelligence.com/customer-stories/).

Platform engineers hand off a dashboard panel that on-call engineers watch, bookmark or replay (Kiali bookmarks
replays). Library authors publish npm packages, benchmarks and papers. Researchers publish F1000Research articles and
scripts.

On reproducibility, Cytoscape's automation paper says "external workflows enable reproducibility not available using
Cytoscape's standard mouse/keyboard/display interaction mode" (https://pmc.ncbi.nlm.nih.gov/articles/PMC6013757). That
is why scripted APIs, deterministic layouts and headless rendering matter to embedders too.

## 9. Tools landscape and pain points

| Tool                               | Loved for                                                                            | Fails them                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cytoscape.js                       | MIT, algorithms, CSS-like styles, 73 extensions, types, headless mode                | Canvas slow at size; WebGL preview has style gaps; React wrapper diffing                                                                                                               |
| Sigma.js + graphology              | WebGL speed, worker ForceAtlas2                                                      | You place nodes yourself; thin docs; blob-style worker under strict CSP                                                                                                                |
| vis-network                        | Easy start, physics                                                                  | Order of magnitude slower in Memgraph's tests                                                                                                                                          |
| G6                                 | Many algorithms, React nodes                                                         | Some docs only in Chinese; v5 registration changes; blob worker refused under CSP (AntV)                                                                                               |
| react-force-graph / 3d-force-graph | Script-tag or React start, 3D, VR, AR, custom three.js meshes, particles             | Slow labels at 10k; animation loop never idles on large graphs; VR re-renders and controller gaps; no export docs                                                                      |
| Grafana Node Graph                 | Public node and edge frame contract, stat arcs, fixed positions, hidden-node markers | 200-node default view; layered layout slow above 500; only built-in icons                                                                                                              |
| Kiali                              | Traffic animation, health colors, pause and replay                                   | Istio-only; tied to its own console                                                                                                                                                    |
| Power BI force graph visuals       | Drop-in from a table (two dimensions, one measure)                                   | Thin control; Network Navigator unreleased since 2018                                                                                                                                  |
| KeyLines / ReGraph                 | Time bar, combos, support                                                            | Unpublished price, tarball installs, obfuscation, watermark on expiry; "does not support many" WCAG requirements and leaves search, focus, ARIA and text alternatives to the developer |
| Ogma                               | WebGL, grouping, geo, React/Angular/Vue guides                                       | Commercial, private distribution                                                                                                                                                       |
| yFiles                             | Layout depth, data binding, testing guide                                            | Commercial; license file in source tree                                                                                                                                                |
| Cytoscape Desktop and Web apps     | Large audience, App Store, Service Apps in any language                              | Java, Maven and OSGi; Web caps at 26k elements                                                                                                                                         |

## 10. Requirements implied

Graphty's designloom records have personas for plugin authors but no workflows for any of them, and no developer
capabilities. The 61 capabilities in `design/designloom/capabilities` are end-user features. Every requirement below
is uncovered unless noted.

| Requirement                                                                                                                                                                                                                                                                                              | Priority | Covered today?                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| Install-to-graph in about 15 lines from a script tag, an ES module or any framework: plain node and edge arrays with arbitrary fields, and a self-sizing container                                                                                                                                       | Must     | No developer workflow                            |
| Framework-neutral surface: simple options settable as HTML attributes, rich data as DOM properties, all events as DOM `CustomEvent`s with typed `detail`; documented recipes for Vue, Angular, React 19 and plain HTML; SSR-safe import                                                                  | Must     | No                                               |
| Data binding that merges by stable id on update (no re-creation, no duplicates, positions kept), plus incremental layout for new nodes                                                                                                                                                                   | Must     | No                                               |
| Streaming or periodic attribute updates (stats, colors, widths) applied many times a minute without moving nodes or restarting layout; pause and resume of updates                                                                                                                                       | Must     | No                                               |
| Data-supplied fixed or pinned positions per node (like `fixedX`/`fixedY`), honored by every layout                                                                                                                                                                                                       | Must     | No                                               |
| Edge flow encoding bound to data: animated particles whose rate and speed map to fields, plus per-edge width, color and dash from data                                                                                                                                                                   | Must     | No                                               |
| Node stat rings (fractions summing to 1) and main and secondary stat labels from data                                                                                                                                                                                                                    | Should   | No                                               |
| Default visible-node cap with expandable "hidden neighbors" markers showing counts; expand with a cap and a supernode safeguard                                                                                                                                                                          | Must     | Partly (neighborhood-expansion is end-user)      |
| Build a graph from an edge-list table (source column, target column, optional weight column), de-duplicating node ids, for BI, CSV and notebook hosts                                                                                                                                                    | Must     | Partly (CSV import exists; no table-binding API) |
| Works under a strict CSP with a published policy (no `eval`, no blob workers required); detects when workers or WebGPU are blocked and reports a code instead of failing silently                                                                                                                        | Must     | No                                               |
| Every on-demand asset (workers, fonts, datasets, optional packages) can be bundled or self-hosted; no runtime network calls unless configured                                                                                                                                                            | Must     | No (some assets fetched on demand)               |
| Accessibility inside the element: keyboard walk of nodes and edges, a focus model, a built-in find-node entry point, ARIA roles and labels, an element-generated text alternative (table or list of nodes and edges), reduced-motion support, and a published WCAG and Section 508 conformance statement | Must     | No                                               |
| Layout-done event or promise, deterministic layout given a seed, and graph state queryable through the API for tests                                                                                                                                                                                     | Must     | Partly (seed option exists)                      |
| Headless or offscreen rendering to an image (PNG/SVG) for tests and server-side report generation                                                                                                                                                                                                        | Should   | No                                               |
| Style rules from data (type to color, score to size) without learning internals                                                                                                                                                                                                                          | Must     | Partly (end-user style capabilities)             |
| Accept a precomputed node column as a "metric" treated like built-in algorithms                                                                                                                                                                                                                          | Must     | No                                               |
| Performance tools: level-of-detail labels, hiding edges during interaction, WebGPU, worker layouts, layout time caps with progress                                                                                                                                                                       | Must     | Partly                                           |
| 3D embedding parity: camera control modes, custom node meshes, labels that scale to 10k+ nodes, an idle render loop when nothing changes, and XR input that does not re-render on host state changes                                                                                                     | Should   | Partly (3D exists; XR unknown)                   |
| Plugin contract for layouts and algorithms with parity to built-ins (simple `fn(graph, options)` path, typed-array advanced path, progress, cancel, worker and GPU access)                                                                                                                               | Must     | No                                               |
| Plugin contract for file readers with row-level error codes; registration that fails at once, naming the plugin and the bad field                                                                                                                                                                        | Must     | No                                               |
| Published types, API stability, and a version range a plugin can declare                                                                                                                                                                                                                                 | Should   | No                                               |
| A no-JavaScript route for researchers (a service-style plugin or a Python bridge)                                                                                                                                                                                                                        | Should   | No                                               |
| Export hooks (PDF/PNG/SVG/CSV) callable from the host                                                                                                                                                                                                                                                    | Should   | Partly                                           |
| Transparent licensing (no watermark, no obfuscation)                                                                                                                                                                                                                                                     | Should   | Positioning point                                |
| UI widget extension points: tooltip, context menu, minimap, map underlay                                                                                                                                                                                                                                 | Should   | Partly                                           |

## 11. Sources

- https://djinni.co/jobs/806184-senior-react-frontend-engineer-graph-data-vis -- graph front-end posting
- https://djinni.co/jobs/851205-senior-react-developer-with-figma-cytoscape-j/ -- Cytoscape.js posting
- https://themuse.com/jobs/crowdstrike/sr-frontend-engineer-graph-data-visualisation-remote -- CrowdStrike role moving to KeyLines (from search snippet; later 403)
- https://graphaware.breezy.hr/p/a278e03099da-senior-software-engineer-frontend -- graph vendor role (closed)
- https://www.biostars.org/p/494745 -- Cytoscape contract request
- https://api.npmjs.org/downloads/point/last-week/ -- weekly downloads (fetched 2026-11-25)
- https://dev.to/timlrx/a-comparison-of-javascript-graph-network-visualisation-libraries-34a8 -- criteria, licenses, rendering ceilings
- https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool -- Memgraph criteria, benchmarks, Orb
- https://doc.linkurious.com/ogma/latest/compare/cytoscape.html -- Ogma vs Cytoscape.js (vendor)
- https://doc.linkurious.com/ogma/latest/tutorials/react/ -- Ogma framework integrations
- https://linkurious.com/ogma/ -- Ogma customers
- https://linkurious.com/blog/volvo-cars-graph-platform -- Volvo Insight Lab
- https://doc.linkurious.com/admin-manual/latest/advanced-settings/ -- supernode and expand thresholds
- https://cambridge-intelligence.com/customer-stories/ -- KeyLines/ReGraph customer products
- https://cambridge-intelligence.com/core4ce-cyberscape-the-cyber-security-forensics-platform -- Cyberscape features and roadmap
- https://cambridge-intelligence.com/eclecticiq-case-study/ -- EclecticIQ timeline and workspace
- https://www.casestudies.com/company/cambridge-intelligence/case-study/leading-systems-integrator-company-customer-case-study -- police prototype within weeks
- https://developers.cambridge-intelligence.com/docs/regraph/getting-started -- ReGraph install and obfuscation rule
- https://cambridge-intelligence.com/regraph-license-renewal -- watermark after expiry
- https://cambridge-intelligence.com/pricing/procurement/ -- subscription licensing
- https://developers.cambridge-intelligence.com/docs/keylines/accessibility -- KeyLines WCAG/508 statement and built-in keys
- https://cambridge-intelligence.com/build-accessible-data-visualization-apps-with-keylines/ -- accessibility work left to developers
- https://github.com/plotly/react-cytoscapejs -- wrapper props and caveats
- https://github.com/plotly/react-cytoscapejs/issues/28 -- listener cleanup
- https://lightrun.com/answers/plotly-react-cytoscapejs-question-setting-elements-property-via-setstate-causes-graph-nodes-to-stack-on-top-of-each-other -- stacked nodes
- https://gist.github.com/mgaebler/32d904e1a93678c2816f9cc0ad00bfaf -- React hook pattern for layouts
- https://js.cytoscape.org/ -- Cytoscape.js docs: extensions, headless, layouts, performance
- https://blog.js.cytoscape.org/2025/01/13/webgl-preview/ -- WebGL renderer numbers and limits
- https://github.com/cytoscape/cytosnap -- server-side Cytoscape.js images via Puppeteer
- https://docs.yworks.com/yfiles-html/dguide/advanced/testing.html -- yFiles testing chapter
- https://playwright.dev/docs/test-snapshots -- screenshot comparison and environment drift
- https://www.sigmajs.org/get-started/quickstart/ -- sigma quickstart
- https://sim51.github.io/react-sigma/docs/start-setup -- react-sigma setup
- https://huggingface.co/spaces/rm-lht/lightrag/blob/8fa793da7d38c8b7019b27256700ea872837934a/lightrag_webui/src/features/GraphViewer.tsx -- sigma in an LLM product
- https://graphology.github.io/standard-library/layout-forceatlas2.html -- FA2 API and worker
- https://raw.githubusercontent.com/graphology/graphology/master/src/layout-forceatlas2/helpers.js -- typed-array matrices
- https://raw.githubusercontent.com/graphology/graphology/master/src/metrics/README.md -- pagerank defaults
- https://g6.antv.antgroup.com/en/manual/graph/extension -- G6 registration
- https://g6.antv.antgroup.com/en/manual/element/node/react-node -- React nodes in G6
- https://g6.antv.antgroup.com/en/manual/plugin/custom-plugin -- G6 BasePlugin
- https://github.com/antvis/g6/issues/6192 -- React nodes lack state styling
- https://www.Github.com/antvis/G6/issues/5700 -- v5 plugin registration change
- https://github.com/antvis/G2/issues/5462 -- AntV blob worker refused under CSP; request to skip workers
- https://docs.yworks.com/yfiles-html/dguide/graph_builder/ -- yFiles data binding
- https://docs.yworks.com/yfiles-html/dguide/large_graph_performance/ -- yFiles large-graph tactics
- https://neo4j.com/docs/nvl/current/ -- Neo4j Visualization Library
- https://neo4j.com/docs/browser-manual/current/operations/browser-settings/ -- Neo4j Browser caps
- https://community.neo4j.com/t/browser-node-relationship-limit/69507 -- raised caps freeze the UI
- https://apache.googlesource.com/age-viewer/+/3b41d0efa4897688b8c33b58c1dd1bd9c7418ba0/frontend/src/components/cytoscape/CypherResultCytoscapeChart.jsx -- AGE Viewer on Cytoscape.js
- https://www.github.com/reaviz/reagraph/issues/172 -- Next.js SSR crash
- https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/node-graph/ -- Node Graph data contract, caps, layouts
- https://grafana.com/docs/grafana/latest/datasources/tempo/service-graph/ -- Tempo service graph from span metrics
- https://v1-82.kiali.io/docs/features/topology -- Kiali traffic animation, health, pause, replay, ranking
- https://v1-52.kiali.io/docs/configuration/console-customization -- Kiali refresh intervals and default
- https://pkg.go.dev/github.com/kiali/kiali/graph/config/cytoscape -- Kiali node and edge fields
- https://raw.githubusercontent.com/kiali/kiali-ui/master/package.json -- older Kiali UI on Cytoscape.js
- https://raw.githubusercontent.com/kiali/kiali/master/frontend/package.json -- current Kiali on PatternFly Topology
- https://github.com/vasturiano/3d-force-graph -- 3D API (README and issues 479, 491, 515)
- https://github.com/vasturiano/react-force-graph -- 2D/3D/VR/AR React packages (issues 243, 285, 581)
- https://github.com/Apoo711/obsidian-3d-graph -- Obsidian 3D graph plugin
- https://github.com/kctekn/obsidian-TagsRoutes -- Obsidian 3D tags graph
- https://github.com/mohidmakhdoomi/nextjs-3d-force-graph-impl -- react-force-graph in Next.js
- https://vuejs.org/guide/extras/web-components.html -- Vue custom element binding
- https://custom-elements-everywhere.com/ -- framework custom element support scores
- https://github.com/microsoft/PowerBI-visuals-ForceGraph -- Power BI force graph: two dimensions plus one measure
- https://community.fabric.microsoft.com/t5/Desktop/Nailing-down-nodes-in-a-force-directed-graph/m-p/488179 -- pinning nodes request (title only; 403)
- https://www.sqlservercentral.com/blogs/power-bi-with-different-network-visualizations -- Power BI network visuals overview
- https://github.com/ChrisDelClea/streamlit-agraph -- Streamlit graph component on vis.js
- https://cdn.jsdelivr.net/npm/@cosmos.gl/graph@2.6.4/README.md -- cosmos.gl typed-array API
- https://openjsf.org/blog/introducing-cosmos-gl -- cosmos.gl scale claim
- https://datastorm-open.github.io/visNetwork/performance.html -- visNetwork performance
- https://discuss.streamlit.io/t/streamlit-pyvis-error-when-displaying-large-network/28501 -- pyvis limit
- https://pypi.org/project/ipysigma -- Python metrics to sigma
- https://dash.plotly.com/cytoscape/events -- Dash Cytoscape callbacks
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3654709/ -- App Store launch
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6013757 -- 330+ apps; automation for reproducibility
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12230733/ -- Cytoscape Web limits, downloads
- https://cytoscape-web.readthedocs.io/en/latest/Extending.html -- Cytoscape Web Service Apps
- https://github.com/idekerlab/aMatReader -- AMatReader
- https://f1000research.com/articles/7-823/v2 -- AMatReader article
- https://f1000research.com/articles/5-2543/v2 -- dot-app article
- https://github.com/cytoscape/cytoscape-samples -- app template
- https://cytoscape.org/javadoc/3.10.0/org/cytoscape/io/read/InputStreamTaskFactory.html -- reader API
- https://wikiold.cytoscape.org/HowToAddLibraryDependencies -- OSGi dependency embedding
- https://groups.google.com/g/cytoscape-discuss/c/xYU8gO-hRHE -- app stuck in Installed
- https://bioconductor.org/packages/release/bioc/vignettes/RCy3/inst/doc/Importing-data.html -- RCy3 import
- https://github.com/gephi/gephi-plugins -- Gephi plugin environment
- https://unpkg.com/cytoscape-fcose@2.2.0/README.md -- fCoSE
