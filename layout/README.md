# NetworkX JavaScript Components

This directory contains JavaScript implementations of various NetworkX algorithms and utilities.

## Layout Algorithms

The `layout.js` file provides JavaScript implementations of the graph layout algorithms that are 
available in the Python version of NetworkX. These algorithms position the nodes of a graph 
in 2D or 3D space for visualization.

### Available Layouts

- `randomLayout`: Position nodes uniformly at random 
- `circularLayout`: Position nodes on a circle
- `shellLayout`: Position nodes in concentric circles
- `springLayout`: Position nodes using Fruchterman-Reingold force-directed algorithm
- `fruchtermanReingoldLayout`: Alias for springLayout
- `spectralLayout`: Position nodes using the eigenvectors of graph Laplacian
- `spiralLayout`: Position nodes in a spiral pattern
- `bipartiteLayout`: Position nodes in two straight lines (bipartite layout)
- `kamadaKawaiLayout`: Position nodes using Kamada-Kawai path-length cost-function
- `forceatlas2Layout`: Position nodes using the ForceAtlas2 force-directed algorithm
- `multipartiteLayout`: Position nodes in layers of straight lines
- `bfsLayout`: Position nodes according to breadth-first search algorithm
- `planarLayout`: Position nodes without edge intersections
- `arfLayout`: Layout algorithm with attractive and repulsive forces
- `rescaleLayout`: Rescale node positions
- `rescaleLayoutDict`: Rescale positions in a dictionary

### Usage

```javascript
import { layout } from 'networkx/drawing/js';

// Create a graph (using your preferred JS graph library)
const graph = createGraph();

// Position nodes using a layout algorithm
const positions = layout.circularLayout(graph);

// Use positions to draw the graph
drawGraph(graph, positions);
```

## Implementation Notes

- The JavaScript implementations aim to produce similar results to their Python counterparts
- Some algorithms are simplified due to lack of specialized libraries like NumPy or SciPy
- The implementations require a graph object with `nodes()` and `edges()` methods

## Contributing

Contributions to improve these JavaScript implementations or add new ones are welcome.
