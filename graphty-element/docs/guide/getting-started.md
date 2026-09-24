# Getting Started

Get from zero to a working graph visualization in 5 minutes.

## What is Graphty?

Graphty is a Web Component library for creating interactive 3D and 2D graph visualizations. Built with [Lit](https://lit.dev/) and [Babylon.js](https://www.babylonjs.com/), it provides:

- High-performance 3D rendering with WebGL/WebGPU
- Multiple layout algorithms (force-directed, hierarchical, circular, etc.)
- Rich styling system with CSS-like selectors
- Graph algorithms (centrality, community detection, shortest path, etc.)
- VR/AR support via WebXR
- Extensible plugin architecture

## Quick Start

The fastest way to see Graphty in action:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>My First Graph</title>
        <style>
            graphty-element {
                width: 800px;
                height: 600px;
                display: block;
            }
        </style>
    </head>
    <body>
        <script type="module">
            import "@graphty/graphty-element";
        </script>

        <graphty-element node-data='[{"id": "a"}, {"id": "b"}]' edge-data='[{"source": "a", "target": "b"}]'>
        </graphty-element>
    </body>
</html>
```

## Your First Graph

Let's build a simple social network visualization step by step.

### Step 1: Set Up the Component

First, include the Graphty element:

```html
<graphty-element> </graphty-element>
```

The element is a block that fills its parent (`width: 100%; height: 100%`) and is never shorter
than 400px, so a bare tag in an unsized page draws a full-width graph 400px tall. To choose the
size yourself, size the element or its parent with ordinary CSS:

```html
<graphty-element style="height: 600px"></graphty-element>

<!-- or fill a fixed-size parent -->
<div style="width: 800px; height: 600px">
    <graphty-element></graphty-element>
</div>
```

The 400px floor is a `min-height` on the element, so to make it smaller than that, lower it too:
`style="height: 250px; min-height: 0"`.

### Step 2: Add Nodes

Define the people in your network:

```html
<graphty-element
    node-data='[
    {"id": "alice", "name": "Alice"},
    {"id": "bob", "name": "Bob"},
    {"id": "charlie", "name": "Charlie"}
  ]'
>
</graphty-element>
```

### Step 3: Add Edges

Connect them with relationships:

```html
<graphty-element
    node-data='[
    {"id": "alice", "name": "Alice"},
    {"id": "bob", "name": "Bob"},
    {"id": "charlie", "name": "Charlie"}
  ]'
    edge-data='[
    {"source": "alice", "target": "bob"},
    {"source": "bob", "target": "charlie"},
    {"source": "charlie", "target": "alice"}
  ]'
>
</graphty-element>
```

An edge names its endpoints with `source` and `target`. If your data already spells them `src`
and `dst`, or `from` and `to`, the element reads those too -- it works the spelling out once for a
whole batch of records and tells you which one it used, rather than guessing per record. Data that
answers none of the three stops the load with a message naming the columns it does carry, so you
will never get a canvas of unconnected dots and no explanation. To settle it yourself, set
`edge-src-id-path` and `edge-dst-id-path`.

### Step 4: Choose a Layout

Select how nodes are positioned:

```html
<graphty-element layout="ngraph" node-data="[...]" edge-data="[...]"> </graphty-element>
```

Available layouts include:

- `ngraph` - Force-directed (default, works in 2D and 3D)
- `d3-force` - D3's force simulation (2D)
- `circular` - Nodes in a circle
- `hierarchical` - Tree-like structure
- `grid` - Regular grid pattern

### Step 5: Apply Styling

Set the background from the tag, and say what the nodes look like with a style layer:

```html
<graphty-element
    id="graph"
    layout="ngraph"
    background='{"backgroundType":"color","color":"#101014"}'
    node-data="[...]"
    edge-data="[...]"
>
</graphty-element>
```

```javascript
const element = document.querySelector("#graph");

await element.session.styles.add({
    name: "Nodes",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#8B5CF6", "node.size": 1.5 },
});
```

See the [styling guide](/guide/styling) for the whole vocabulary.

## Interactive Examples

See these concepts in action:

- [Default Graph](https://graphty.app/storybook/element/?path=/story/graphty--graphty) - Basic graph visualization
- [Data Loading](https://graphty.app/storybook/element/?path=/story/data--basic) - Loading data from various sources

## What's Next?

Now that you have a basic graph working, explore:

- [Installation](./installation) - Detailed installation options for different environments
- [Styling](./styling) - Customize colors, shapes, and labels
- [Layouts](./layouts) - Configure layout algorithms
- [Algorithms](./algorithms) - Run graph algorithms and visualize results
