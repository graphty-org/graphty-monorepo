# graph-samples

`@graphty/graph-samples` gives you graphs to try things on:

- **generators**: random graphs that come out the same on every machine for the same seed, and the
  classic families (paths, grids, trees, complete graphs, named graphs);
- **datasets**: well-known real networks (Zachary's karate club, Les Miserables, US college
  football, road and citation networks with hundreds of thousands of nodes), with their known
  groupings where they have one.

A generator returns typed arrays that [graph-format](/graph-format/) turns into a snapshot in one
call; a dataset downloads from graphty.app as a snapshot when you ask for it. No dataset's data is
in the npm package.

## Read next

- [Getting started](./guide/getting-started): install it, generate a graph, load a dataset.
- [Generators](./guide/generators): every generator, seeds, ground truth and weights.
- [Datasets](./guide/datasets): what each dataset is, its size, source and license, and how to
  load it from a mirror of your own.
- [Drawing a sample](./guide/graphty-element): handing a sample to graphty-element and the other
  graphty packages.
- [API reference](./api/): every exported function, constant and type.
