# Layout.js

Layout.js is a JavaScript library for node positioning in graphs. It is a JavaScript port of the layout algorithms found in the Python NetworkX library.

## Features

The library offers various graph layout algorithms, including:
- Random Layout
- Circular Layout
- Shell Layout
- Spring Layout (Fruchterman-Reingold)
- Spectral Layout
- Spiral Layout
- Bipartite Layout
- Multipartite Layout
- BFS Layout
- Planar Layout
- Kamada-Kawai Layout
- ForceAtlas2 Layout
- ARF Layout (Attractive and Repulsive Forces)

## How to Use

Import the library into your JavaScript project:

```javascript
import { 
  randomLayout, 
  circularLayout, 
  springLayout,
  // other layout functions...
} from './layout.js';
```

Usage example:

```javascript
// Create a graph (data structure with nodes() and edges())
const graph = { 
  nodes: () => [0, 1, 2, 3], 
  edges: () => [[0, 1], [1, 2], [2, 3], [3, 0]]
};

// Apply a layout
const positions = circularLayout(graph);

// positions will be an object with x,y coordinates for each node
// { 0: [1, 0], 1: [0, 1], 2: [-1, 0], 3: [0, -1] }
```

## Interactive Tests

The repository includes a series of interactive tests for each layout algorithm.

### Running the tests

1. Start a local HTTP server. For example, with Python:
   ```
   python -m http.server 9000
   ```
   or with Python 2:
   ```
   python -m SimpleHTTPServer 9000
   ```

2. Open a browser and go to:
   ```
   http://localhost:9000/index.html
   ```

3. From here, you can access all the interactive tests for each layout algorithm and experiment with the various parameters.

## Requirements

- Modern browser with ES6 support
- Local HTTP server for running tests
