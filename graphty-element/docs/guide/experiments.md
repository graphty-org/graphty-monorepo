# Experiments

Some features land in graphty-element before they are finished. Each one is an **experiment**,
switched off unless the page switches it on. With an experiment off, the element behaves exactly
as it would without that experiment's code.

## Switching experiments on

```html
<graphty-element features="file-styles location-map"></graphty-element>
```

- `features` takes space-separated ids. `all` switches on every experiment this build has.
- From a framework, set the property: `element.features = ["file-styles"]`.
- Without a browser: `createGraphSession({ features: ["file-styles"] })` from
  `@graphty/graphty-element/session`.
- For every element and session on the page that names none of its own, call
  `setDefaultFeatures(["file-styles"])` from `@graphty/graphty-element/extend` before they are created.

The element reads `features` once, when it first renders. A later change applies to the next
session it creates.

## From the page address

The element never reads the page's address itself. To let readers switch experiments on with a
link such as `?features=file-styles`, pass the address to the parser:

```ts
import { featuresFromUrl } from "@graphty/graphty-element/catalog";

document.querySelector("graphty-element").features = featuresFromUrl(location.href);
```

## What was switched on

```ts
element.addEventListener("graphty-features", (event) => {
    console.log(event.detail.enabled, event.detail.unknown);
});
```

`element.enabledFeatures` (or `session.features`) holds the same object: `enabled` lists the
experiments switched on and `unknown` lists the requested ids this build does not have. An unknown
id never throws, so a link made for a newer build still opens on an older one. An id that has
graduated to a normal feature is accepted and changes nothing.

`FEATURES` in `@graphty/graphty-element/catalog` lists the experiments this build has, each with
its id, a default name and the issue that tracks it. `GRADUATED_FEATURES` lists the ids that have
shipped.

### Graduated

- `timeline`: the [Timeline](./timeline) is a normal feature. `session.time` and the time
  attributes work with no `features` set, and `features="timeline"` is accepted and changes
  nothing.

## The experiments in this build

### `file-styles`

Drawing the styles other programs write into graph files, and writing a graph's styles into one: a
load with `styles: "file"`, an export with `styles: true`, and every style channel and value added
to draw those files (flat node shapes, borders, widths and heights, more arrowheads and line
patterns, label boxes and positions, and the rest). See [Styles from Files](./file-styles).

```html
<graphty-element features="file-styles"></graphty-element>
```

With it off:

- A load that asks for `styles: "file"`, by its options or by the source's, refuses with
  `E_FEATURE_OFF` (`{ feature: "file-styles", key: "styles" }`) before reading anything, and an
  export with `styles: true` refuses the same way. `dataSourceConfig: { styles: "file" }` on the
  element loads the data without its styles and lists `styles` in `element.refusedFeatures`.
- A draft's `styles` is null, `lastImport()` has no `styles`, the formats in `session.catalog`
  carry no `styles` and no `styles` writer option, and an export notes no style loss.
- `session.catalog.channels(target)` leaves out the channels the experiment added and the values it
  added to the rest, and a binding that spreads over a channel's values (a number onto node
  shapes, groups onto line patterns) spreads over the values that are left.
- The fixed layout's `edgeRoutes` and `graphvizAttributes` options are left out of
  `session.catalog`, and the recommended layout no longer asks Graphviz to route a placed DOT
  file's edges.
- `data.setStyleValues`, sent through `session.execute` or inside `session.transaction`, refuses with
  `E_FEATURE_OFF`.

A layer that writes one of the experiment's channels or values directly is still accepted and
drawn, and a project saved with the experiment on opens with the styles it was saved with.

## What `@experimental` promises

API marked `@experimental` in the reference may change or disappear in a minor release of
graphty-element. The rule that breaking changes wait for a major release applies only to API that
is not marked.
