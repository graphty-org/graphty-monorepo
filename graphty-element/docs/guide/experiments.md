# Experiments

Some features land in graphty-element before they are finished. Each one is an **experiment**,
switched off unless the page switches it on. With an experiment off, the element behaves exactly
as it would without that experiment's code.

## Switching experiments on

```html
<graphty-element features="timeline location-map"></graphty-element>
```

- `features` takes space-separated ids. `all` switches on every experiment this build has.
- From a framework, set the property: `element.features = ["timeline"]`.
- Without a browser: `createGraphSession({ features: ["timeline"] })` from
  `@graphty/graphty-element/session`.
- For every element and session on the page that names none of its own, call
  `setDefaultFeatures(["timeline"])` from `@graphty/graphty-element/extend` before they are created.

The element reads `features` once, when it first renders. A later change applies to the next
session it creates.

## From the page address

The element never reads the page's address itself. To let readers switch experiments on with a
link such as `?features=timeline`, pass the address to the parser:

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

## The experiments in this build

### `timeline`

Time-series playback over a date or number column: `session.time`, the `time:*` events, and the
attributes `node-time-path`, `edge-time-path`, `node-time-end-path`, `edge-time-end-path`,
`node-time-unit` and `edge-time-unit`. See
[Timeline](./timeline).

```html
<graphty-element features="timeline" edge-time-path="sent"></graphty-element>
```

```ts
const { session } = document.querySelector("graphty-element");
const data = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\n";
await session.data.import({ type: "csv", config: { data } });

if (session.features.enabled.includes("timeline")) {
    await session.time.setSettings({ step: "day" });
    session.time.play();
}
```

Instead of the attribute, `await session.time.setField({ edges: { start: "sent" } })` picks the
column from code.

With it off, reading `session.time` answers as it does with no time field: `field` and `current` are
null, `extent()` and `bins()` return null, `candidates()` returns an empty list and `playing` is
false, so a display needs no check. Its actions refuse with `E_FEATURE_OFF` (`details` carry
`{ feature, key }`): `play`, `pause`, `window`, `spanOf` and `committed` throw, while `setField`, `setSettings`, `stepBy`,
`seek` and `commit` return a promise that rejects. Check
`session.features.enabled.includes("timeline")` before an action, as above. A text column of dates
does not measure time. `parse` works either way: it reads text as an instant.

The four attributes change nothing with it off. `element.refusedFeatures` lists each one set to a
value, as `{ code: "E_FEATURE_OFF", params: { feature, key } }` with `key` the property's name, and
it is complete by the time `graphty-features` fires. Clearing an attribute is no refusal.

`session.data.setRole(column, "time")` and a load mapping that newly names `time` or `timeUnit`
refuse with `E_FEATURE_OFF` too. `session.visibility.setWindow` works either way, by its bounds: it
refuses with `E_FEATURE_OFF` a window that names `nodes: "ends"` or `missing: "outside"`, and with
the timeline off its bounds compare with the column's values as they stand, even on a column with a
time role.

A project saved with the timeline on keeps its time settings when it is opened and saved with it
off. Playback settings and a window's `nodes` and `missing` options do nothing meanwhile, and
`project.open` reports each in `problems` as `E_FEATURE_OFF` with `{ feature, key }`. A column's time
role stays and is not reported. A saved window still limits what shows, by its bounds only, and
`session.visibility.setWindow(null)` clears it. `styles.tree()` leaves out the saved Ghost row, and
a saved run's `caveats.window` is left out of what `session.runs` hands over.

Versions 3.31.0 to 3.35.0 had the timeline on for everyone. A page written against them adds
`features="timeline"` to keep it.

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
- `data.setFileStyles`, sent through `session.execute` or inside `session.transaction`, refuses with
  `E_FEATURE_OFF`.

A layer that writes one of the experiment's channels or values directly is still accepted and
drawn, and a project saved with the experiment on opens with the styles it was saved with.

## What `@experimental` promises

API marked `@experimental` in the reference may change or disappear in a minor release of
graphty-element. The rule that breaking changes wait for a major release applies only to API that
is not marked.
