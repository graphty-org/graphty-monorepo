# API Reference

Graphty provides two distinct APIs for different use cases.

## Choose Your API

<div class="api-cards">

### [Web Component API](/api/web-component)

**Declarative configuration via HTML attributes and element properties.**

Use this API when you want:

- HTML-based configuration
- Framework integration (React, Vue, Angular, Svelte)
- Reactive property binding
- Simple graphs configured via attributes

```html
<graphty-element
    layout="ngraph"
    view-mode="3d"
    node-data='[{"id": "a"}, {"id": "b"}]'
    edge-data='[{"source": "a", "target": "b"}]'
>
</graphty-element>
```

[View Web Component API →](/api/web-component)

---

### [JavaScript API](/api/javascript)

**Programmatic control via the `Graph` class.**

Use this API when you need:

- Dynamic data manipulation (add/remove nodes at runtime)
- Algorithm execution and result handling
- Camera control and animation
- Custom style layers
- Screenshot and video capture

```typescript
const graph = element.graph;

await graph.addNodes([{ id: "a" }, { id: "b" }]);
await graph.runAlgorithm("graphty", "degree");
graph.zoomToFit();
```

[View JavaScript API →](/api/javascript)

</div>

## Quick Comparison

| Feature              | Web Component            | JavaScript API          |
| -------------------- | ------------------------ | ----------------------- |
| Set initial data     | ✅ `node-data` attribute | ✅ `addNodes()` method  |
| Add data dynamically | ❌ Replaces all data     | ✅ Appends to existing  |
| Set layout           | ✅ `layout` attribute    | ✅ `setLayout()` method |
| Run algorithms       | ❌                       | ✅ `runAlgorithm()`     |
| Camera control       | ✅ Limited via methods   | ✅ Full control         |
| Custom styles        | ✅ `session.styles`      | ✅ `session.styles`     |
| Event handling       | ✅ `addEventListener()`  | ✅ `graph.on()`         |
| Screenshot/Video     | ✅ Via element methods   | ✅ Via graph methods    |

## Configuration Types

### Element properties

The whole picture -- which layout places it, which mode it is drawn in, what it is drawn against:

```typescript
element.layout = "ngraph";
element.layoutConfig = { seed: 42 };
element.viewMode = "2d";
element.background = { backgroundType: "color", color: "#101014" };
element.startingCameraDistance = 60;
```

### LayerSpec

What every node and edge looks like is a stack of layers on `element.session.styles`, and this is
one layer as it is authored:

```typescript
interface LayerSpec {
    name: string;
    target?: "node" | "edge";
    kind?: "base" | "encoding" | "highlight" | "custom";
    selector: Selector;
    set?: StaticStyle; // literal channel values
    encode?: Encoding; // channel values bound to the data
    source?: LayerSource;
    enabled?: boolean;
    userData?: Record<string, unknown>;
}

type Selector =
    | { match: "expression"; where: string }
    | { match: "has"; path: string }
    | { match: "ids"; nodes?: readonly string[]; edges?: readonly string[] }
    | { match: "everything" };
```

A layer is addressed by the id the element mints for it, never by its index. The full vocabulary
of channels, the expression language, and what `set` and `encode` each do are in the
[styling guide](/guide/styling).

## Generated TypeDoc Reference

For complete type definitions auto-generated from TypeScript source:

**Web Component**

- [Graphty Class](/api/generated/index/classes/Graphty.md)

**JavaScript API**

- [Graph Class](/api/generated/index/classes/Graph.md)
- [Node Class](/api/generated/index/classes/Node.md)
- [Edge Class](/api/generated/index/classes/Edge.md)

**Configuration Types**

- [Config Module](/api/generated/index/)
- [Managers Module](/api/generated/index/)

**Extension Base Classes**

- [LayoutEngine](/api/generated/index/classes/LayoutEngine.md)
- [Algorithm](/api/generated/index/classes/Algorithm.md)
- [DataSource](/api/generated/index/classes/DataSource.md)

## Related Guides

- [Getting Started](/guide/getting-started) - Quick introduction
- [Web Component Guide](/guide/web-component) - Usage patterns for declarative API
- [JavaScript API Guide](/guide/javascript-api) - Usage patterns for programmatic API
