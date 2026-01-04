# Installation

## Package Manager

Install `@graphty/algorithms` using your preferred package manager:

::: code-group

```bash [npm]
npm install @graphty/algorithms
```

```bash [pnpm]
pnpm add @graphty/algorithms
```

```bash [yarn]
yarn add @graphty/algorithms
```

:::

## Browser (CDN)

You can also use the library directly in the browser via CDN:

```html
<script type="module">
  import { Graph, bfs, dijkstra } from "https://esm.sh/@graphty/algorithms";

  const graph = new Graph();
  graph.addNode("a");
  graph.addNode("b");
  graph.addEdge("a", "b");

  console.log(bfs(graph, "a"));
</script>
```

## TypeScript Support

The library is written in TypeScript and includes full type definitions. No additional `@types` package is needed.

```typescript
import type { Graph, NodeId, Edge } from "@graphty/algorithms";

// Full IntelliSense support
const graph: Graph<string> = new Graph();
```

## ES Modules

The library is distributed as ES modules. It works with:

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Node.js 18.19.0+
- Bundlers (Vite, Webpack, Rollup, esbuild)

```typescript
// ES module import
import { Graph, bfs } from "@graphty/algorithms";
```

## Requirements

- **Node.js**: 18.19.0 or higher (for Node.js usage)
- **Browser**: Any modern browser with ES2020 support

## Verifying Installation

```typescript
import { Graph, bfs } from "@graphty/algorithms";

const graph = new Graph();
graph.addNode("a");
graph.addNode("b");
graph.addEdge("a", "b");

const result = bfs(graph, "a");
console.log("Installation successful!", result.order);
```
