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

## What `@experimental` promises

API marked `@experimental` in the reference may change or disappear in a minor release of
graphty-element. The rule that breaking changes wait for a major release applies only to API that
is not marked.
