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
| Parameterised, service and live data sources | `layoutBehavior.fetchNodes` callbacks; element API design's lazy data source (unbuilt) | Promote (as a seventh point, or as a second half of File format) |
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

**Evidence against.**

- The owner's list does not include it, and the owner said the others need not be supported now.
- A refreshing source raises an unresolved question of how successive versions of the data relate
  (the framework's open door on data versions), which is itself a one-way door.
- A service source sends the reader's query (possibly sensitive identifiers) to a third-party host;
  the framework's rule that nothing fetches before the reader confirms the host must be designed in.

**Shape if promoted.** A class like `DataSource` whose descriptor declares `options` (the query
form), `hosts` (the origins it contacts, shown to the reader before any fetch), and `refresh`
(`"none" | "manual" | "interval"`); the element owns confirmation, retry, cancellation and error
mapping. It would give imports cancellation, which the File format point lacks.

**Verdict: Promote**, as an owner decision: either a seventh point "Data source", or a declared
second kind of File format reader. Recommended: a seventh point, because its security model (hosts
to confirm) and lifecycle (refresh) differ from a file's.

## 2. Identifier mappers and enrichment providers

**What they would be.** Code that maps identifiers between namespaces (gene symbols to Ensembl ids,
UniProt to gene) or attaches external annotations (GO and KEGG terms, druggability) to nodes.

**Evidence for.** `design/designloom/workflows/W20.yaml` (identifier mapping and a match report),
`W21.yaml` (per-cluster GO/KEGG enrichment, a recorded gap), `W22.yaml` (enrichment map), `W08.yaml`
(druggability from outside annotations, a recorded gap). The unbuilt element API design (section
4.14 of `design/element-api/element-api-design.md`) named both kinds.

**Evidence against.** Both are data sources in disguise: they fetch from a service and join by key.
Enrichment statistics over a cluster are an algorithm (a `category-table` result) once the
annotations are loaded.

**Verdict: Later**, folded into the data source point (candidate 1) as a source that joins onto the
loaded graph by key, with enrichment statistics written as an ordinary algorithm plugin.

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
dispatch to it. The interface it implements is `AlgorithmAccelerator` in `@graphty/algorithms`
(about twenty optional methods over a graph-format snapshot), tagged `@public` in that package.

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

**Verdict: Keep internal.** Make sure the built-in commands address every one of the six points by
catalogue key, so plugins are reachable through the assistant without a command extension.

## 11. Image, vector and video exporters

**What it would be.** A writer for a rendered picture: PNG, SVG, PDF, a video of a camera path.

**Evidence for.** `design/designloom/workflows/W15.yaml` (findings communication),
`W21.yaml` (cluster figure with a legend), `W25.yaml` (publication figures); the design framework's
deferred "animate along a path" runs through saved views.

**Evidence against.** These are capabilities every consumer needs; by the architectural principle
they belong in the element, not in a third party's plugin. The formats are few and stable.

**Verdict: Not an extension point.** The element should ship SVG/PDF and video export itself. A
graph file writer is a different thing and is covered by `file-format.md` section 8.

## 12. Set kinds, rule leaves and scope keywords

**What it would be.** New ways to define a set or a scope (a motif match, a k-hop neighbourhood with
edge filters, a list of identifiers from a file).

**Evidence for.** `design/designloom/workflows/W07.yaml` (pattern search, withdrawn for lack of an
element capability); identifier-list sets in the design framework. The framework reserves these for
a future plugin registry.

**Evidence against.** Set definitions are saved in documents and evaluated during repaint; a plugin
set kind has the same missing-plugin fragility as expression functions. A pattern search can be an
algorithm that publishes a `node-set` or `edge-set` result, which the element can already keep as a
set.

**Verdict: Later.** Try the algorithm route first.

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
  unresolved, naming what to install.
- **Annotations** are notes over nodes, edges and regions, independent of the data. No workflow asks
  for a new KIND of annotation from a third party. **Not an extension point.**

## 15. Lifecycle managers

Internal orchestration (`Graph.ts`'s managers). No consumer need. **Keep internal.**

## Does the design framework's ontology cover the extension points?

The owner asked this on 2026-09-27. Not fully. The framework's conceptual model (section 9 of
`design/ui/framework/conceptual-model.md`, in the main checkout and not yet committed) lists "data
source" as an extension point, calls the log destination internal, and says export formats are not
offered. Against the owner's list: Logging is missing from its supported set, data source is extra
(candidate 1 above recommends promoting it, which would make the framework right on that point),
and writers are an open decision rather than "not offered". The framework document should be
corrected to name the six, list the candidates in this file as candidates, and refer to this
directory.
