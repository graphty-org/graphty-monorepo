# React

`<graphty-element>` is a custom element, and React 19 renders custom elements directly: no
wrapper, no adapter. This page covers React 19. React 18 cannot pass arrays, objects or event
handlers to a custom element; see [React 18](#react-18) at the end.

## A typed graph in one line

```bash
npm install @graphty/graphty-element react react-dom
npm install -D @types/react
```

```tsx
import "@graphty/graphty-element";
import type {} from "@graphty/graphty-element/jsx";

export function GraphView() {
    return (
        <graphty-element
            nodeData={[{ id: "a" }, { id: "b" }]}
            edgeData={[{ source: "a", target: "b" }]}
            algorithmsOnLoad={["degree", { algorithm: "pagerank", style: { size: [1, 5] } }]}
            runAlgorithmsOnLoad
            acceleration="auto"
            style={{ display: "block", height: 500 }}
            ongraphty-node-click={(event) => console.log("clicked", event.detail.nodeId)}
        />
    );
}
```

The first import defines the element. The second is the opt-in to its JSX types: it carries no
JavaScript, the compiler erases it, and it declares `<graphty-element>` for every file in your
program. Write it once, anywhere -- next to the first import is a good place.

If you would rather not have an import for it, put the entry in `tsconfig.json` instead:

```json
{
    "compilerOptions": {
        "types": ["@graphty/graphty-element/jsx"]
    }
}
```

Importing `@graphty/graphty-element` alone never declares the tag. A JSX declaration is global, and
which shape it should take depends on your React version, so the package leaves the choice to
you.

## What the types cover

Every public property, attribute and DOM event of the element, generated from its custom elements
manifest when the package is built, so they cannot drift from the element you installed:

- **Properties, with their real types.** React 19 assigns a prop whose name is a property of the
  element as that property, so `nodeData`, `edgeData`, `algorithmsOnLoad`, `layoutBehavior`,
  `background`, `xr` and the rest take arrays and objects, not JSON strings. A wrong value is a
  compile error: `acceleration="sometimes"` is rejected because the policy is `"auto"`, `"off"` or
  `"required"`.
- **Attributes,** under their HTML names (`node-data`, `layout-2d`, `auto-frame`). React sets these
  as attributes, so they take strings, or `true` / `false` for an on-or-off attribute. Prefer the
  property: `nodeData={nodes}` over `node-data={JSON.stringify(nodes)}`.
- **Events,** as `on` followed by the exact DOM event name: `ongraphty-node-click`,
  `ongraph-settled`, `ongraphty-selection-change`. That is how React 19 binds a listener on a
  custom element, and each handler receives the event with its typed `detail`. The full list is in
  [Events](../events).

`ref` is typed as the element itself: with `const ref = useRef<Graphty>(null)` (`Graphty` is
exported by `@graphty/graphty-element`), `ref.current.session`, `ref.current.zoomToFit()` and the
rest of the [JavaScript API](../javascript-api) need no cast.

## Why `acceleration` belongs on the tag

Set the acceleration policy as a JSX prop, not from an effect:

```tsx
// Right: in force before the element looks for a GPU.
<graphty-element acceleration={policy} />;

// Wrong: the element has already started looking by the time this runs.
useEffect(() => {
    ref.current!.acceleration = policy;
}, [policy]);
```

The element looks for an accelerator in `connectedCallback`, the moment it is inserted into the
page. React 19 assigns a custom element's props after creating it and before inserting it, so a
policy written on the tag is in force when that search starts. An effect runs after insertion:
by then the search has begun under the default policy, `auto`, and a reader who chose `off` has
already been probed. Changing the prop later is fine -- the element applies a new policy at once --
it is only the first value that must be on the tag.

The same holds for anything you want in place before the first load: give `nodeData`,
`algorithmsOnLoad` and `layout` as props rather than setting them afterwards.

## Load the element before React renders it

React 19 sets a prop as a property only if the element is already defined when React renders it.
If `@graphty/graphty-element` is loaded lazily (a dynamic `import()`, a code-split route), React can
render the tag first and then writes every prop as an attribute: `nodeData={nodes}` becomes
`nodedata="[object Object]"`, the data is lost, and the graph comes up empty. The element reports
this on the console when it sees it.

Import it statically, as above, or wait for the definition before rendering the tag:

```tsx
import { useEffect, useState } from "react";

function LazyGraph({ nodes }: { nodes: Record<string, unknown>[] }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        void import("@graphty/graphty-element");
        void customElements.whenDefined("graphty-element").then(() => setReady(true));
    }, []);

    return ready ? <graphty-element nodeData={nodes} /> : null;
}
```

## Other JSX frameworks

The opt-in declares the tag in React's JSX namespace. The props themselves are published as one
interface, `GraphtyElementJSXProps`, so a framework with its own JSX namespace can declare the tag
with it:

```ts
import type { GraphtyElementJSXProps } from "@graphty/graphty-element/jsx";
```

## React 18

React 18 turns every prop on a custom element into a string attribute and does not bind `on...`
props as listeners, so give the element its rich values and listeners through a ref:

```jsx
import "@graphty/graphty-element";
import { useEffect, useRef } from "react";

function GraphView({ nodes }) {
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        const onClick = (event) => console.log("clicked", event.detail.nodeId);
        element.nodeData = nodes;
        element.addEventListener("graphty-node-click", onClick);
        return () => element.removeEventListener("graphty-node-click", onClick);
    }, [nodes]);

    return <graphty-element ref={ref} acceleration="auto" />;
}
```

The JSX types on this page describe React 19's behavior and are not meant for React 18. Typed
React 18 wrappers are planned for `@graphty/graphty-element/react`.
