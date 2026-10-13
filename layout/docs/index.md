---
layout: home

hero:
    name: layout
    text: Graph Layouts
    tagline: 15 2D and 3D graph layouts over compact graph snapshots, ported from NetworkX, plus steppable force simulations
    actions:
        - theme: brand
          text: Get Started
          link: ./guide/getting-started
        - theme: alt
          text: API Reference
          link: ./api/
        - theme: alt
          text: Interactive Storybook
          link: https://graphty.app/storybook/layout/

features:
    - title: Getting Started
      details: Install the package, lay out a graph and read the positions by node id.
      link: ./guide/getting-started
      linkText: Start here
    - title: Geometric Layouts
      details: Circular, shell, spiral, grid and random placements that ignore or barely read the edges.
      link: ./guide/geometric
      linkText: Learn more
    - title: Structural Layouts
      details: Bipartite, multipartite, BFS, radial and planar layouts that follow the graph's structure.
      link: ./guide/structural
      linkText: Learn more
    - title: Force-Directed and Spectral
      details: ForceAtlas2, Fruchterman-Reingold, Kamada-Kawai, ARF and spectral embeddings.
      link: ./guide/force-directed
      linkText: Learn more
    - title: Steppable Simulations
      details: Animate ForceAtlas2 and Fruchterman-Reingold frame by frame, pin and drag nodes, stop when settled.
      link: ./guide/simulations
      linkText: Learn more
    - title: 2D and 3D
      details: Every layout returns 2D or 3D rows; which ones fill the third axis and which stay flat.
      link: ./guide/dimensions
      linkText: Learn more
---
