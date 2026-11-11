---
title: webgpu-graph-algorithms
layout: home

hero:
    text: Graph Algorithms on the GPU
    tagline: WebGPU-accelerated force layouts and graph algorithms over compact graph snapshots, in Node and in the browser
    actions:
        - theme: brand
          text: Get Started
          link: ./guide/getting-started
        - theme: alt
          text: API Reference
          link: ./api/

features:
    - title: Getting Started
      details: Install the package, open a GPU context and run PageRank and connected components.
      link: ./guide/getting-started
      linkText: Start here
    - title: Node and Browser Setup
      details: Dawn in Node, WebGPU in Chromium, and one call that finds a working GPU or says why there is none.
      link: ./guide/setup
      linkText: Learn more
    - title: Algorithms
      details: PageRank, HITS, eigenvector and Katz centrality, connected components, traversals and more.
      link: ./guide/algorithms
      linkText: Learn more
    - title: Layouts
      details: ForceAtlas2, Fruchterman-Reingold and spring-electrical simulations, from a script or a frame loop.
      link: ./guide/layouts
      linkText: Learn more
    - title: Errors
      details: Every failure is a WebGpuGraphError with a stable code. There is no silent CPU fallback.
      link: ./guide/errors
      linkText: Learn more
    - title: With graphty-element
      details: graphty-element uses this package as an optional accelerator, switched on with one import.
      link: ./guide/graphty-element
      linkText: Learn more
---
