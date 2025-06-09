# Layout.js

Layout.js is a JavaScript library for node positioning in graphs. It is a JavaScript port of the [layout algorithms](https://networkx.org/documentation/stable/reference/drawing.html) found in the Python [NetworkX library](https://networkx.org/documentation/stable/).

## Features

The library offers various graph layout algorithms, including:

- [Random Layout](https://graphty-org.github.io/layout/examples/random-layout.html)
- [Circular Layout](https://graphty-org.github.io/layout/examples/circular-layout.html)
- [Shell Layout](https://graphty-org.github.io/layout/examples/shell-layout.html)
- [Spring Layout (Fruchterman-Reingold)](https://graphty-org.github.io/layout/examples/spring-layout.html)
- [Spectral Layout](https://graphty-org.github.io/layout/examples/spectral-layout.html)
- [Spiral Layout](https://graphty-org.github.io/layout/examples/spiral-layout.html)
- [Bipartite Layout](https://graphty-org.github.io/layout/examples/bipartite-layout.html)
- [Multipartite Layout](https://graphty-org.github.io/layout/examples/multipartite-layout.html)
- [BFS Layout](https://graphty-org.github.io/layout/examples/bfs-html)
- [Planar Layout](https://graphty-org.github.io/layout/examples/planar.html)
- [Kamada-Kawai Layout](https://graphty-org.github.io/layout/examples/kamada-kawai-layout.html)
- [ForceAtlas2 Layout](https://graphty-org.github.io/layout/examples/forceatlas2-layout.html)
- [ARF Layout (Attractive and Repulsive Forces)](https://graphty-org.github.io/layout/examples/arf-layout.html)

## How to Use

Import the library into your JavaScript project:

```javascript
import {
  randomLayout,
  circularLayout,
  springLayout
  // other layout functions...
} from './layout.js'
```

Usage example:

```javascript
// Create a graph (data structure with nodes() and edges())
const graph = {
  nodes: () => [0, 1, 2, 3],
  edges: () => [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ]
}

// Apply a layout
const positions = circularLayout(graph)

// positions will be an object with x,y coordinates for each node
// { 0: [1, 0], 1: [0, 1], 2: [-1, 0], 3: [0, -1] }
```

## Requirements

- Modern browser with ES6 support
