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
