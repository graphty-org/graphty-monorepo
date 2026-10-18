# Installation

## Package Manager

Install `@graphty/layout` and `@graphty/graph-format`, which builds the graph snapshot every layout reads:

::: code-group

```bash [npm]
npm install @graphty/layout @graphty/graph-format
```

```bash [pnpm]
pnpm add @graphty/layout @graphty/graph-format
```

```bash [yarn]
yarn add @graphty/layout @graphty/graph-format
```

:::

The guide's examples also use [`@graphty/graph-samples`](https://www.npmjs.com/package/@graphty/graph-samples) to
generate test graphs (a grid, a tree, a scale-free network). Install it if you want to run them as they are; any
snapshot works the same way.

```bash
npm install @graphty/graph-samples
```

## Browser (CDN)

You can also load the library directly in a browser from a CDN:

```html
<script type="module">
    import { GraphBuilder } from "https://esm.sh/@graphty/graph-format";
    import { circular } from "https://esm.sh/@graphty/layout";

    const builder = new GraphBuilder({ directed: false });
    builder.addEdge("a", "b");
    builder.addEdge("b", "c");
    const graph = builder.freeze();

    console.log(circular(graph).positions);
</script>
```

## TypeScript Support

The package is written in TypeScript and ships its own type definitions. No `@types` package is needed. Every layout's
options have an exported type:

<!-- doc-check -->

```typescript
import type { GraphSnapshot } from "@graphty/graph-format";
import { shell, type LayoutResult, type ShellLayoutOptions } from "@graphty/layout";

function rings(graph: GraphSnapshot, options: ShellLayoutOptions): LayoutResult {
    return shell(graph, { ...options, scale: 50 });
}
console.log(typeof rings); // function
```

## ES Modules

The package is distributed as an ES module. It works with:

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Node.js, as an ES module
- Bundlers (Vite, Webpack, Rollup, esbuild)

It has no dependency besides `@graphty/graph-format` and runs the same in a browser, in a Web Worker and in Node.

## Verifying Installation

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { circular } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
const graph = builder.freeze();

console.log("Installation successful!", circular(graph).n); // Installation successful! 2
```
