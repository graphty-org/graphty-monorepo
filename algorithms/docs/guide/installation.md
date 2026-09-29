# Installation

## Package Manager

Install `@graphty/algorithms` and `@graphty/graph-format`, which provides the graph snapshot every algorithm runs over,
using your preferred package manager:

::: code-group

```bash [npm]
npm install @graphty/algorithms @graphty/graph-format
```

```bash [pnpm]
pnpm add @graphty/algorithms @graphty/graph-format
```

```bash [yarn]
yarn add @graphty/algorithms @graphty/graph-format
```

:::

## Browser (CDN)

You can also use the library directly in the browser via a CDN:

```html
<script type="module">
    import { GraphBuilder } from "https://esm.sh/@graphty/graph-format";
    import { indexed } from "https://esm.sh/@graphty/algorithms";

    const builder = new GraphBuilder({ directed: false });
    builder.addEdge("a", "b");
    const graph = builder.freeze();

    console.log(indexed.breadthFirstSearch(graph, 0).visitedCount);
</script>
```

## TypeScript Support

The library is written in TypeScript and includes full type definitions. No additional `@types` package is needed.

<!-- doc-check -->

```typescript
import type { GraphSnapshot } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

// Full IntelliSense support: every option and result is typed
function rank(graph: GraphSnapshot): indexed.PageRankResult {
    return indexed.pageRank(graph, { dampingFactor: 0.85 });
}
console.log(typeof rank); // function
```

## ES Modules

The library is distributed as ES modules. It works with:

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Node.js 18.19.0+
- Bundlers (Vite, Webpack, Rollup, esbuild)

## Requirements

- **Node.js**: 18.19.0 or higher (for Node.js usage)
- **Browser**: Any modern browser with ES2020 support

## Verifying Installation

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
const graph = builder.freeze();

const result = indexed.breadthFirstSearch(graph, graph.ids.requireIndex("a"));
console.log("Installation successful!", result.visitedCount); // Installation successful! 2
```
