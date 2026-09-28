# Extension point candidates

Status: draft, against graphty-element 2.6.1. Informative: nothing in this document is an official
extension point.

The supported extension points are closed at six -- Palette, File format, Camera, Layout,
Algorithm, Logging -- by the owner's decision of 2026-09-21 ("the others may be added later but
don't need to be supported now"). This document evaluates everything else that looks extensible,
and everything the design-studio personas need that the six do not cover, so that a future
promotion is a decision made with evidence rather than a seam discovered by a third party.

Promoting any candidate to an official point is a one-way door: its registration verb, its
descriptor and its ids become published API that saved documents depend on. Every recommendation
below is therefore a recommendation to the owner, not a decision.

## How to read a verdict

- **Promote**: evidence of need from real workflows, a shape that can reach parity with built-ins,
  and no conflict with the architectural principles. Recommended for an owner decision soon.
- **Later**: real need, but the shape depends on work in flight or the need is weak today.
- **Keep internal**: the seam should stay private; a consumer need, if any, is better met another
  way.
- **Not an extension point**: the need is real but is met by a configuration file or by the element
  shipping the capability.

## Summary

| Candidate | Seam today | Verdict |
| --- | --- | --- |
| Parameterised, service and live data sources, and publishing to a repository | `layoutBehavior.fetchNodes` callbacks; element API design's lazy data source (unbuilt) | Promote (as a seventh point, or as a second half of File format), before the file-format contract is frozen |
| Identifier mappers and enrichment providers | element API design 4.14 (unbuilt) | Later, folded into data sources |
| Format writers | none; `canExport: true` refused | Part of File format; see `file-format.md` section 8 |
| Snapshot-based layouts | none | Part of Layout; see `layout.md` section 7 |
| Scales | `ScaleRegistry.register` (internal, unreachable from outside) | Later |
| Node mesh shapes | `NodeMesh.registerShapeCreator` (internal; shape name is a closed enum) | Keep internal; fix the trap |
| Edge line patterns and arrowheads | closed tables | Keep internal |
| Themes and "Looks" | `CatalogApi.themes()` (deprecated, unimplemented) | Not an extension point: a style file |
| Expression functions | `CatalogApi.functions()` (deprecated, unimplemented) | Later |
| GPU and other accelerators | `registerAccelerator` on `./extend` (documented internal) | Keep internal |
| Camera controllers | internal classes with Babylon.js types | Keep internal |
| Natural-language commands and AI tools | `./ai` exports | Keep internal |
| Image, vector and video exporters | built-in screenshot | Not an extension point: the element ships them |
| Set kinds, rule leaves, scope keywords | reserved in the design framework | Later |
| Attribute value types | closed | Keep closed |
| Annotations and views as extensions | none | Not an extension point: configuration files |
| Lifecycle managers | internal | Keep internal |
| Entity resolution (merging duplicate nodes) | none | Not an extension point: the element ships a merge operation |
| Background layers and basemaps | none | Not an extension point for the drawing; a tile SOURCE is a data source |
| Derived networks (projection, enrichment maps) | none | Not an extension point: an element operation over a pair-list result |
| Network collections (a parent network and its subnetworks) | none | Not an extension point: an element capability, decided with the record formats |
| Edge geometry (waypoints, arcs, great circles, bundling) | none | Undecided: layout-supplied or element-owned |
| Data-driven node charts (pie and donut glyphs) | none | Not an extension point: the element ships it as a style channel |

## 1. Parameterised, service and live data sources

**What it would be.** A source the element reads a graph from that is not a file: a query against
a service (STRING or BioGRID for a gene list, a Neo4j server, a SPARQL endpoint), a refreshing feed
(a SIEM, a transaction stream), or a lazy source that fetches neighbours as the reader expands the
graph.

**Evidence for.**

- `design/designloom/workflows/W20.yaml` (gene list to interaction network): the reader types gene
  symbols and the network comes from STRING or BioGRID, with a confidence threshold -- parameters
  of a query, not of a file.
- `design/designloom/workflows/W07.yaml` and `design/designloom/personas/cybersecurity-analyst.yaml`:
  live SIEM events.
- `design/designloom/workflows/W13.yaml` and `design/designloom/personas/knowledge-engineer.yaml`:
  dozens of source systems.
- The element's own `layoutBehavior.fetchNodes` is a pair of consumer callbacks for lazy
  expansion. By the architectural principle that capabilities live in the element and are reached
  the same way by every consumer, it should be a registered source with a descriptor instead.
- The design-studio framework lists "data source" as its own extension point, and its feature-fit
  notes ask for a "Service" import tab whose fields come from option descriptors the source
  publishes.
- Without this point there is NO supported route for any service: a file reader may fetch only its
  own `url` and cannot set request headers (an `Accept` type, a bearer token), and an algorithm may
  contact nothing. The only route left is for the consumer to call the service and pass the text as
  `data`, which is the consumer-side integration the architectural principles forbid, and nothing
  records the query or the endpoint, so the graph cannot be refreshed or cited.
- `design/designloom/workflows/W25.yaml` (publishing): uploading a network with its metadata to a
  repository such as NDEx, with a private reviewer link and a DOI, falls between every point --
  writers are pure exporters, and no point fetches outward. It is the same trust and host model in
  the other direction.
- `design/designloom/personas/ml-engineer-recsys.yaml`: scoring through an internal model server
  (graph neural network inference) is a service call too, and has no home today.
- `design/designloom/workflows/W13.yaml`: SPARQL endpoints and database-backed APIs, behind
  credentials.

**Evidence against.**

- The owner's list does not include it, and the owner said the others need not be supported now.
- A refreshing source raises an unresolved question of how successive versions of the data relate
  (the framework's open door on data versions), which is itself a one-way door.
- A service source sends the reader's query (possibly sensitive identifiers) to a third-party host;
  the framework's rule that nothing fetches before the reader confirms the host must be designed in.

**Shape if promoted.** A class like `DataSource` whose descriptor declares `options` (the query
form), `hosts` (the origins it contacts, checked against the embedder's allowlist and shown to the
reader before any fetch), and `refresh` (`"none" | "manual" | "interval" | "stream"`, the last for
pushed feeds over WebSocket or server-sent events); a credential slot whose values the element
keeps and never logs or serialises; the service release it queried and the query parameters,
recorded as provenance; a found and not-found identifier report; and a `publish` direction for
upload. The element owns confirmation, retry, cancellation, rate limiting, caching and error
mapping. A refresh keeps the reader's state (runs, sets, positions) and never silently replaces
the graph -- but "add or merge" alone is not enough, for three reasons the shape must answer:

- **Retention.** A live feed (SIEM events over the last 24 hours) grows without limit under
  add-only refreshes, and a canvas past a few hundred thousand events is unusable. The source
  contract needs an element-owned retention policy -- a time window on a declared timestamp
  attribute, a maximum element count -- and removal records in the stream (a remove or tombstone
  record), with a stated rule for runs, sets and annotations that name an evicted element (kept,
  and reported as unresolved). The window is part of the recorded provenance.
- **Identifier resolution.** A service resolves identifiers ambiguously (one gene symbol to several
  proteins, aliases, pseudogenes). The report needs an `ambiguous` category with the candidate
  matches beside found and not-found, and the resolution the reader accepted is recorded and
  reused on replay.
- **Releases.** A service defaults to its latest release, so a replay six months later queries a
  different network. A `release` option pinned by default, recorded as provenance, and a replay
  against a different release reads as unresolved.

A source whose service returns a document in a format a registered reader handles (a SPARQL
CONSTRUCT answering `text/turtle`) SHOULD hand the body and its media type to the format registry
rather than bundle its own parser, so the same bytes are read one way whether they came from a
file or a query; that needs media-type detection (`file-format.md` section 4 item 9), and the
reader's id and version go into the source's provenance. The point would give imports
cancellation, which the File format point lacks.

**Verdict: Promote**, as an owner decision (README open decision 15), taken before the file-format
contract is frozen: either a seventh point "Data source", or a declared second kind of File format
reader. Recommended: a seventh point, because its security model (hosts to confirm) and lifecycle
(refresh, publish) differ from a file's. Until then, the file-format specification does not claim
the service and knowledge-graph workflows as served.

## 2. Identifier mappers and enrichment providers

**What they would be.** Code that maps identifiers between namespaces (gene symbols to Ensembl ids,
UniProt to gene) or attaches external annotations (GO and KEGG terms, druggability) to nodes.

**Evidence for.** `design/designloom/workflows/W20.yaml` (identifier mapping and a match report),
`W21.yaml` (per-cluster GO/KEGG enrichment, a recorded gap), `W22.yaml` (enrichment map), `W08.yaml`
(druggability from outside annotations, a recorded gap). The unbuilt element API design (section
4.14 of `design/element-api/element-api-design.md`) named both kinds.

**Evidence against.** Both are data sources in disguise: they fetch from a service and join by key.
Enrichment statistics over a cluster are an algorithm once the annotations are loaded -- but NOT a
`category-table` one, as an earlier draft said: that shape puts one category, score and rank on
each NODE, while per-cluster enrichment produces, for each GROUP, many terms with an FDR, a gene
count and the member genes. It needs a per-group result table (open decision 18, widened from
per-group labels to rows of terms per group), plus the `dataset` and `"partition"` inputs of open
decisions 22 and 17. Running one scoped run per cluster is exactly the manual work
`design/designloom/workflows/W21.yaml` names as the pain.

**But nothing loads annotations that are not a graph.** Offline enrichment needs a gene-set file
(GMT) or an identifier map as input. It is not a graph, so no reader applies; no option type can
hand a file or a table to an algorithm; and bundling an ontology release into plugin code freezes a
version nobody can see in the run record. So "an ordinary algorithm plugin once annotations are
loaded" is not achievable today. A `dataset` option type that references a loaded, versioned table
and records its name and version in the run record is part of README open decision 22, and reading
the loaded annotation columns is open decision 17.

**Verdict: Later**, folded into the data source point (candidate 1) as a source that joins onto the
loaded graph by key; offline reference files made first-class through the `dataset` option type;
enrichment statistics written as an ordinary algorithm plugin once both exist.

## 3. Scales

**What it would be.** A mapping from a domain of values to a channel's range, beyond the built-in
linear, log, neglog10, sqrt, pow, bins, quantile, ordinal and passthrough.

**Evidence for.** `Binding.scale` is already an open union; `E_UNKNOWN_SCALE` exists;
`ScaleDescriptor` and `session.catalog.scales()` exist; the element API design sketched
`defineScale`. Domain conventions exist that the built-ins approximate (asinh for count data,
symmetric log for fold changes).

**Evidence against.** No persona workflow names a scale the built-ins cannot express; `neglog10`,
`pow`, `clamp`, `midpoint` and `bins` cover the recorded needs. A scale runs inside the repaint
loop for every element, so a slow or throwing scale degrades every layer.

**Verdict: Later.** If promoted, a scale should be a pure function with a descriptor, validated
like a camera view (pure, synchronous, finite outputs).

## 4. Node mesh shapes

**What it would be.** A new node shape (a gene glyph, a server icon, a map pin).

**Evidence for.** Domain glyphs are common in the Cytoscape ecosystem the genomics personas come
from (`design/designloom/personas/genomics-cytoscape-user.yaml`).

**Evidence against.** `NodeMesh.registerShapeCreator` succeeds, but the shape name a style may use
is a closed schema enum, so a registered shape can never be selected: a trap for anyone who finds
it. The creator's signature takes Babylon.js types; publishing it would make every renderer change
a breaking change for plugins, which is what happened to every custom node program in sigma.js
version 3. Node rendering is also the element's hottest path (instanced meshes).

**Verdict: Keep internal, and fix the trap** (make `registerShapeCreator` unreachable, or make it
refuse names outside the enum). If glyph demand becomes real, promote a DECLARATIVE shape
descriptor (a 2D outline path or a small mesh as plain arrays), never a creator function.

## 5. Edge line patterns and arrowheads

Closed tables today. No workflow records a need beyond the built-ins. **Keep internal.**

## 6. Themes and "Looks"

**What it would be.** A named whole look: a style document, or (in the design framework's proposal)
a palette substitution applied over a style.

**Evidence.** `CatalogApi.themes()` is declared, deprecated and unimplemented. The owner asked for
"load style" and for communities to share starting points without data (2026-09-26 and
2026-09-27). `design/designloom/capabilities/style-presets.yaml` asks for Print, Colour-blind safe,
High contrast and Presentation presets.

**Verdict: Not an extension point.** A theme is DATA -- a style file -- and belongs to the
configuration-file specifications (styles, recipes, annotations, views), which third parties can
write without code. Palettes a theme needs travel inside it (`palette.md` section 5). Keeping themes
as files keeps them safe to load (README section 9.2).

## 7. Expression functions

**What it would be.** A function a selector, filter or formula can call.

**Evidence for.** `FunctionDescriptor` is declared; domain formulas exist (a fold-change threshold,
a z-score).

**Evidence against.** `CatalogApi.functions()` is unimplemented and deprecated. Expressions appear in
saved documents; a document that calls a plugin function becomes unreadable where the plugin is
missing, which is exactly the fragility the configuration files are meant to avoid. A formula can
usually be replaced by an algorithm that publishes a field.

**Verdict: Later.** If promoted: pure, synchronous, total functions with declared arity and return
type, and a saved document naming one reads as unresolved (never failing) where it is absent.

## 8. GPU and other accelerators

**What it is.** `registerAccelerator` on `./extend` registers a factory; the element's own `./webgpu`
entry point uses it to register the WebGPU accelerator, and algorithms and simulation layouts
dispatch to it. What the factory returns is the element's own `GraphAccelerator`
(`graphty-element/src/acceleration/types.ts`): `name`, `backend`, an optional `device`, `lost`,
`precision`, `verify` and `dispose`, plus an index signature `[algorithmOrLayout: string]:
unknown`. The element narrows that value internally (`src/acceleration/narrow.ts`) to
`@graphty/algorithms`' `AlgorithmAccelerator` (about twenty optional methods over a graph-format
snapshot, tagged `@public` in that package) and the layout accelerator interface. So the contract a
third party would implement, and what promoting it would freeze, is the element-owned
`GraphAccelerator`, not the algorithms package's interface alone.

**Evidence for.** It is a working, structurally typed contract with a clear no-silent-fallback rule
(`algorithms/src/indexed/accelerator.ts`). A third party with a different backend (a WebAssembly
build, a native Node addon, a remote GPU service) could implement it.

**Evidence against.** The contract is still moving with the WebGPU work (new capabilities, cost
model, device-loss semantics). Promoting it would freeze the method set. The accuracy and
precision obligations (single-precision caveats, device-loss errors) are hard for a third party to
meet and hard for the element to verify. No persona needs it; `design/designloom/personas/ml-engineer-recsys.yaml`
needs scale, which the element's own accelerator is for.

**Verdict: Keep internal**, and move its exports off `./extend` (README open decision 11) so
`./extend` means "the six". Revisit when `@graphty/webgpu-graph-algorithms` reaches 1.0.

## 9. Camera controllers

Orbit, fly and 2D controllers are Babylon.js cameras plus input models. Publishing them would put
Babylon.js types in the contract (`camera.md` section 1). XR input is handled by the element.
**Keep internal.** A need for a new framing is met by a camera view.

## 10. Natural-language commands and AI tools

**What it is.** `./ai` publishes `GraphCommand`, `CommandContext` and the AI manager; commands are
registered internally.

**Evidence for.** An embedder might want the assistant to operate a domain plugin ("run MCODE on
this cluster").

**Evidence against.** Every command today is a thin wrapper over element API; a plugin algorithm,
layout or view is already reachable by the built-in commands that address those kinds by name. The
AI surface is changing quickly. `all-extension-points.test.ts` lists commands as an explicit
exclusion.

**Verdict: Keep internal.** The built-in commands SHOULD address Palette, Camera, Layout and
Algorithm by catalogue key, so plugins of those points are reachable through the assistant without
a command extension. They MUST NOT configure log destinations, change logger policy or load from a
URL: the assistant reads graph content as model input (`sampleData`, `queryGraph`), so a node label
written as an instruction ("configure logging with sink remote at https://...") could otherwise
turn on egress through the model, which README section 9.2 item 3 forbids a file to do directly. A
load command, if one is ever added, takes only files the user picked or URLs on the embedder's
allowlist, after a confirmation the model cannot answer. Command arguments derived from graph
content are untrusted, and runs the assistant starts count against the run budget of open
decision 16.

## 11. Image, vector and video exporters

**What it would be.** A writer for a rendered picture: PNG, SVG, PDF, a video of a camera path.

**Evidence for.** `design/designloom/workflows/W15.yaml` (findings communication),
`W21.yaml` (cluster figure with a legend), `W25.yaml` (publication figures); the design framework's
deferred "animate along a path" runs through saved views.

**Evidence against.** These are capabilities every consumer needs; by the architectural principle
they belong in the element, not in a third party's plugin. The formats are few and stable.

**Verdict: Not an extension point.** The element should ship SVG/PDF and video export itself. A
graph file writer is a different thing and is covered by `file-format.md` section 8. Publication
export needs a specification of its own before it ships, above all of what the exported legend
states (each layer, its column, the palette anchors, the midpoint, the missing-value colour and
the domain), because that legend is what a figure caption cites; no document defines it today.

## 12. Set kinds, rule leaves and scope keywords

**What it would be.** New ways to define a set or a scope (a motif match, a k-hop neighbourhood with
edge filters, a list of identifiers from a file).

**Evidence for.** `design/designloom/workflows/W07.yaml` (pattern search, withdrawn for lack of an
element capability); identifier-list sets in the design framework. The framework reserves these for
a future plugin registry.

**Evidence against.** Set definitions are saved in documents and evaluated during repaint; a plugin
set kind has the same missing-plugin fragility as expression functions.

**The algorithm route does not work yet.** A pattern search returns many matches, each a binding of
pattern roles (the attacker account, the first host, the pivot) to nodes and edges, each with its
own score. A flat `node-set` or `edge-set` loses which elements belong to which match, which role
each plays, and the per-match score, and a plugin may not invent a shape. On an event multigraph
the pivot is often one of hundreds of parallel edges, which a snapshot-only plugin cannot name
(README open decision 5). **Pattern search is not achievable as an extension today.**

Three further dependencies were not stated in the first draft. An exponential match search
declares `costClass: "unbounded"`, so at the 100,000-node scale of
`design/designloom/workflows/W07.yaml` it is refused with `E_CAP_EXCEEDED`, and no per-run override
exists. A partial result (the first N matches) is allowed only when a caller-set limit stops the
run, but `timeBox` is not forwarded, so a plugin can never legally return partial matches. And
the default `simplify: "sum"` merges parallel events, erasing the individual logon edge that is
the pivot.

**Verdict: Later.** The algorithm route needs, together: a `match-list` result shape (README open
decision 18(b)), the edge identity accessor (open decision 5), forwarded `timeBox` and a cap
override the reader confirms (open decision 16), and `simplify: "none"`. A saved hunt needs the
recipe and filter file formats too. Try the route when all of them exist, before any set-kind
extension; the conformance kit then adds "a match-list run stopped by its time box publishes
partial matches marked with `caveats.partialReason`".

## 13. Attribute value types

The owner mentioned "data types" among earlier extension considerations (2026-09-27). Read as file
formats and data sources, that is covered by candidates 1 and the File format point. Read as
attribute VALUE types (dates, geographic points, lists), the design framework keeps them closed,
because every scale, formatter, filter and exporter must understand every type. **Keep closed**;
confirm with the owner that "data types" meant formats and sources.

## 14. Annotations and views

The owner listed the configuration files the element should read and write: styles, recipes
(analysis sequences), data, annotations and maybe views, alone or combined in one file. Those are
DATA formats, specified separately. Do they need extension points?

- **Views** reference a camera view by id (a Camera extension) and a layout by id (a Layout
  extension). They need no new point, but they need the persistence decision in README open
  decision 8.
- **Recipes** reference algorithms by key and version (Algorithm extensions) and layouts; they need
  no new point. A recipe naming a plugin algorithm that is not installed MUST be kept and read as
  unresolved, naming the missing id; the package the file names is shown only as the file
  author's claim, never as an install instruction (README section 9.2 item 2).
- **Annotations** are notes over nodes, edges and regions, independent of the data. No workflow asks
  for a new KIND of annotation from a third party. **Not an extension point.**

## 15. Lifecycle managers

Internal orchestration (`Graph.ts`'s managers). No consumer need. **Keep internal.**

## 16. Entity resolution

**What it would be.** Merging nodes that name the same real thing ("Acme Corp" and "ACME
Corporation"), a core step in `design/designloom/workflows/W13.yaml` (node merging, a merge dialog).

**Evidence.** An algorithm plugin can already score duplicate pairs and publish them as a
`pair-list`. Nothing then applies an accepted merge: no route merges the nodes, keeps an alias from
the old id to the new, reconciles attributes and edges, or keeps saved selections, annotations and
results that named the old id pointing at the merged node. The only workaround is to rewrite the
source files and reload, losing every computed result.

**Verdict: Not an extension point.** The element should ship a merge operation that consumes a
pair list, records id aliases that saved documents resolve through, and has a declared
attribute-merge policy. Scoring pairs stays an ordinary algorithm plugin. The alias record is a
saved-document format and therefore a one-way door for the owner.

## 17. Background layers and basemaps

**What it would be.** Map tiles, coastlines or region outlines drawn under the graph.

**Evidence.** `design/designloom/personas/supply-chain-analyst.yaml` names limited geographic views
as a frustration; a geographic layout and a north-up camera view without a map behind them leave
that unmet (a cluster on one flood-prone delta is not visible as such).

**Verdict: Not an extension point for the drawing** -- every consumer with geographic data needs
it, so the element should ship it. A third-party tile SOURCE contacts a host and belongs with data
sources (candidate 1), declaring its hosts. It depends on the published scene convention (README
open decision 27).

## 18. Derived networks

**What it would be.** A new network computed from the loaded one: a bipartite user-item graph
projected onto an item-item similarity network, an enrichment map of gene sets joined by overlap,
the union or intersection of two networks.

**Evidence.** `design/designloom/workflows/W16.yaml`, `W22.yaml`, `W24.yaml`. An algorithm can
return the new edges only as a `pair-list`, which the element shows as a table; no shape turns it
into a network that can be laid out, clustered or exported.

**Verdict: Not an extension point.** The element should ship an explicit "apply as edges"
operation over a pair-list result (or a load of it as a separate network), carrying the run record
with it. README open decision 18 item (d). An earlier draft said that until then the route is to
export the pairs and import them as a file. That route does not exist: there is no writer seam
(README open decision 1), and even with one a pair list is a graph-level table that no node or
edge writer has a place for (`file-format.md` section 8.1). So today NO route turns a pair list
into a network, and `design/designloom/workflows/W22.yaml` (an enrichment map from gene-set
overlap) cannot be reached until "apply as edges", or the table export of open decision 24,
exists. The rest of that route needs no new option type: a GMT reader yielding a bipartite
gene-set-to-gene graph conforms today, Jaccard between gene-set nodes is a `pair-list` plugin, and
joining the enrichment table onto the gene-set nodes is open decision 19. So "apply as edges" and
the join, not the `dataset` option type of open decision 22, are what block that workflow, and
specifying "apply as edges" ahead of decision 22 would unblock it.

## 19. Network collections

**What it would be.** Several networks in one session: a parent network and derived subnetworks
(the largest component made the working network, each cluster laid out as its own subnetwork), each
with its own runs, layouts and views, saved together in one project.

**Evidence.** `design/designloom/workflows/W20.yaml` (make the largest component the working
network), `W21.yaml` (lay out each cluster as its own subnetwork), `W25.yaml` (one session file with
every network in the collection). Every point assumes one graph per element, and no record says
which network a run, load or layout belonged to.

**Verdict: Not an extension point**, but an element capability that changes the record formats:
it would add a network id to `RunRecord`, `LoadReport`, the layout record and
`CameraViewReference`. Decide it with README open decision 8 and the project file format, before
those records are frozen.

## 20. Edge geometry

**What it would be.** Edges drawn as something other than a straight segment: waypoints, arcs, a
great-circle route, a route along a shipping lane, bundling.

**Evidence.** `design/designloom/personas/supply-chain-analyst.yaml` and
`design/designloom/workflows/W11.yaml`: a geographic layout whose straight chords misstate which
regions a route crosses, and cut through the sphere on a 3D globe. A layout controls only the two
ends (`EdgePosition { src, dst }`, `layout.md` section 11).

**Verdict: Undecided**, with two shapes to choose between: layout-supplied geometry (a curve kind
or waypoints on `EdgePosition`, which widens the layout contract) or an element-owned edge-routing
style (a great-circle or arc mode that any layout gets). Recommended: element-owned, because every
geographic layout would otherwise reimplement it. Until then a geographic layout author should know
edges are straight.

## 21. Data-driven node charts

**What it would be.** A node drawn as a pie or donut whose slices come from data (the enriched GO
terms a protein belongs to, `design/designloom/workflows/W21.yaml`).

**Evidence against a plugin.** The proposed declarative shape descriptor for node meshes (section 4)
is a static outline and cannot carry slices sized by data, and a mesh plugin would expose renderer
internals.

**Verdict: Not an extension point.** The element ships it as a style channel: a pie or donut
encoding bound to a list or partition column, so it works with every palette and travels in style
documents.

## Does the design framework's ontology cover the extension points?

The owner asked this on 2026-09-27. Not fully. The framework's conceptual model (section 9 of
`design/ui/framework/conceptual-model.md`, in the main checkout and not yet committed) lists "data
source" as an extension point, calls the log destination internal, and says export formats are not
offered. Against the owner's list: Logging is missing from its supported set, data source is extra
(candidate 1 above recommends promoting it, which would make the framework right on that point),
and writers are an open decision rather than "not offered". The framework document should be
corrected to name the six, list the candidates in this file as candidates, and refer to this
directory.
