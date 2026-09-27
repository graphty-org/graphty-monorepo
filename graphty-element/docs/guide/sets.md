# Sets

A set is a named group of the nodes and edges of your graph: the suspects, community 3 of a
Louvain run, the shortest route from A to B, everything with a score above 5. You make one once,
and then everything that works on part of the graph -- an algorithm run, a layout, a style layer,
the visibility filter, the selection, the camera -- takes it by reference.

```typescript
const sets = element.session.sets;

// Keep three nodes under a name
const suspects = sets.create({ kind: "fixed", nodes: ["alice", "bob", "carol"], reading: "induced" }, { name: "Suspects" });

// Paint them
await element.session.styles.add({
    name: "Suspects",
    selector: { match: "scope", scope: { set: suspects } },
    set: { "node.color": "#e53935" },
});

// Run PageRank over them alone
await element.run("pagerank", {}, { scope: { set: suspects } });
```

## What a set is

- **It has an id and a name.** `create` returns the id, a string starting `set_`. The id never
  changes and is never handed out again, even after the set is removed; the name can be changed
  with `rename` and must be unique among your sets.
- **It has a definition** of one of three kinds:
  - **fixed** -- a list of node ids (and optionally edges). It never changes unless you change it.
  - **rule** -- a query or a filter tree. It follows the data: change an attribute, and the set
    gains or loses members without being touched.
  - **path** -- an ordered walk of nodes, such as a shortest route.
- **It says which edges come with its nodes** -- its *reading*, below.
- **It records where it came from**: typed in, a selection, a combination of other sets, or a
  run's result (`createdFrom`).
- **It is the same everywhere.** A layer, the filter and a run that name one set see exactly the
  same elements.

Sets may overlap freely. A set never contains another set, but a rule can name another set's
members.

## Creating a set

There are four ways in, each returning the new set's id.

```typescript
const sets = element.session.sets;

// 1. From ids you already have
const team = sets.create({ kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" }, { name: "Team" });

// 2. From a rule, which follows the data
const busy = sets.create({ kind: "rule", where: "data.score > `5`", reading: "induced" }, { name: "Busy" });

// 3. From whatever is selected right now, or any other scope, frozen into a fixed set
const picked = await sets.createFrom("selection", { name: "Picked" });

// 4. From a run's result -- see "Sets a result offers" below
```

Leave out `name` and the element picks "Set 1", "Set 2", and so on.

### Putting edges in a set

A fixed set can hold edges as well as nodes. Name an edge by the id the element gave it -- the
`id` of an edge in `session.selection.edges` or in a click event -- and read the set
`listed`, so the edge itself, not every edge among its ends, is the member:

```typescript
const [edgeId] = element.session.selection.edges;
const link = sets.create({ kind: "fixed", nodes: [], edges: [edgeId], reading: "listed" }, { name: "Link" });
```

That id lasts only as long as the session. The set stores the edge by what survives a reload
instead -- its ends and the file's edge id, or its position among the edges joining the same
two nodes -- so `sets.get(link).definition.edges` hands back objects such as
`{ source: "a", target: "b", ordinal: 0, among: 1 }`. You can pass that form back in too, to any
door that takes edges: `create`, `redefine`, `addMembers`, `removeMembers` and a `path`'s steps.
In an undirected graph the two spellings of one edge, `a` to `b` and `b` to `a`, are the same
member.

A rule can also be a filter tree -- the same tree the visibility filter takes -- which reaches
things a query cannot, such as the top ten by a run's value or one community of a result:

```typescript
const run = element.run("pagerank");
await run;

const top = sets.create(
    { kind: "rule", where: { kind: "threshold", path: `results.${run.id}.value`, top: 10 }, reading: "induced" },
    { name: "Top ten" },
);
```

## Readings: which edges come with the nodes

A set of nodes does not say on its own which edges belong to it, so every definition states it.

```text
 the graph           induced            listed             clipped
                     nodes A, B, C      edges A-B, C-D     nodes A, B, C;
                                                           edges A-B, C-D
 A --- B             A --- B            A --- B            A --- B
 | \   |               \   |
 |  \  |                \  |
 D --- C                  C            D --- C                  C
```

| Reading | Holds | Use it for |
| --- | --- | --- |
| `induced` | The nodes, plus every edge between two of them | Groups, communities, a hand-picked team |
| `listed` | The listed edges and their endpoints, plus any listed nodes | Paths, spanning trees, a set of edges |
| `clipped` | The nodes, plus those of the listed edges whose ends are both among the nodes | Rules only: exactly what the visibility filter shows |

A fixed set given `clipped` is stored `listed`, which holds the same members. Change a set's reading
with `redefine`; its stored members are kept.

## Kept sets and inline sets

Everything above makes a **kept** set: it has an id, it is listed by `sets.list()`, and anything
that names it follows it when it is redefined. Anywhere a scope is accepted you can instead give a
definition inline, with `{ define }`, which is used once and kept nowhere:

```typescript
// Kept: named, listed, followed
await element.run("degree", {}, { scope: { set: team } });

// Inline: the same members, once
await element.run("degree", {}, { scope: { define: { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" } } });
```

The short forms from before sets existed still work everywhere, and mean what they always meant:

| Scope | Means |
| --- | --- |
| `"graph"` | Every node and edge |
| `"visible"` | What the visibility filter shows (read `clipped`) |
| `"selection"` | The selected nodes (read `induced`) |
| `"largest-component"` | The largest weakly connected component, recomputed as the data changes |
| `{ set: id }` | A kept set |
| `{ where: "..." }` | An inline rule |
| `{ nodes: [...] }` | An inline fixed set of nodes |
| `{ define: definition }` | An inline set of any kind |

### Checking a definition before using it

`parseSetDefinition` and `parseScope` (from `@graphty/graphty-element/catalog` or `/session`, both
free of Babylon.js and the DOM) check a value from a form, a file or an assistant and return its
canonical form -- members sorted and duplicate-free -- or throw a `GraphtyError` with code
`E_BAD_COMMAND` and a `details.reason` saying what is wrong. They check shape only: whether a set
id or a node exists is checked by the doors, against the session.

```typescript
import { parseSetDefinition } from "@graphty/graphty-element/catalog";

const definition = parseSetDefinition(JSON.parse(userInput)); // throws on anything malformed
element.session.sets.create(definition);
```

## Using a set

**An algorithm run** computes over the set's subgraph, not the whole graph, and says so in its
caveats. Nodes outside the set get no value.

```typescript
const run = element.run("betweenness", {}, { scope: { set: team } });
await run;
console.log(run.caveats.notes); // ["Computed on the induced subgraph of 3 nodes."]
console.log(run.record.scope.set); // { id: "set_team", revision: "r1:..." }
```

A node option such as Dijkstra's `source` must name a node inside the scope, or the run is refused
with `E_OPTION_RANGE`.

**A layout** lays out the set's nodes and holds every other node exactly where it is:

```typescript
await element.setLayout("ngraph", { seed: 7 }, { scope: { set: team } });

// Or as a property, which the next layout change keeps
element.layoutScope = { set: team };
element.layoutScope = undefined; // back to the whole graph
```

The members are captured when the layout starts: a node added later is held too. The physics
layouts (`ngraph`, `d3`, `forceatlas2`, `spring`, `spring-electrical`) accept a scope; any other
refuses one with `E_UNSUPPORTED`. `session.catalog.layouts()` says which, as `scoped`.

**A style layer** paints the set with the selector `{ match: "scope", scope }`. The layer follows
the set: redefine it and the picture moves. A set has no colour of its own; colouring one is an
ordinary layer.

```typescript
await element.session.styles.add({
    name: "Team",
    selector: { match: "scope", scope: { set: team } },
    set: { "node.color": "#1e88e5" },
});
```

**The visibility filter** shows the set with the leaf `{ kind: "scope", scope }`, alone or combined
with other leaves:

```typescript
await element.session.visibility.set({ kind: "scope", scope: { set: team } });
await element.session.visibility.set({
    kind: "all",
    of: [{ kind: "scope", scope: { set: team } }, { kind: "degree", min: 2 }],
});
```

**The selection** takes a set as a target, and the camera frames one:

```typescript
await element.session.selection.apply({ scope: { set: team } });
await element.applyCameraView("isometric", { scope: { set: team } });
```

## Counting and reading members

Counting and reading go through the same resolver every other scope does:

```typescript
const count = await element.session.scope.count({ set: team });
console.log(count.nodes, count.edges);
// For a fixed or path set: ids it names that the graph no longer holds
console.log(count.missingNodes, count.missingEdges);

const resolved = await element.session.scope.resolve({ set: team });
for (const id of resolved.nodes) {
    console.log(id);
}
```

To ask the other way round -- which sets hold this node? -- use `containing`. It also lists the
communities and other result groups the node is in:

```typescript
const { sets: holding, items } = await element.session.sets.containing({ node: "a" });
```

`sets.list()` returns every kept set in order and `sets.get(id)` one of them. Both hand out frozen
objects that stay the same object until the set changes, so `===` is a valid change test.

## Status: is the set still what it was?

A fixed set is always current. A set that reads something else -- a run's result, another set --
can fall behind it. `status` says whether it has, without resolving anything, so a panel can call
it for every row:

```typescript
const status = element.session.sets.status({ set: community });
switch (status.freshness) {
    case "current":
        break;
    case "out-of-date": // a run it reads has changed inputs: re-run it
    case "cannot-rerun": // the same, but that algorithm is no longer registered
    case "detached": // a set or run it names was removed
    case "unresolvable": // the rule cannot be evaluated: a cycle, a bad query, a missing capability
        console.log(status.reasons);
}
```

`freshness` may gain values in a minor release, so treat an unknown one as "not current" and show
its `reasons`. `status.earlierRuns` lists runs whose values the set holds from an earlier execution.

`usedBy(id)` lists what names a set -- other sets, layers, the filter, the layout, runs -- so you can
say what removing it will affect. Removing a set never breaks those users: they read it as
detached, and `status` explains why.

## Combining sets

`combine` makes a new fixed set from two or more, of their members right now:

```typescript
const both = await element.session.sets.combine("intersection", [{ set: a }, { set: b }], { name: "A and B" });
const onlyA = await element.session.sets.combine("difference", [{ set: a }, { set: b }]);
```

The operations are `union`, `intersection`, `difference` (the first minus all the rest) and
`symmetric-difference`. When every operand reads `induced`, so does the result; otherwise edges are
combined first and the result keeps their endpoints, so "edges in one spanning tree but not the
other" keeps exactly the differing edges. To test containment, combine: A is inside B when
`difference` of A and B is empty.

## Sets a result offers

A finished run's result offers sets, from its shape: one per community, one per level, one for the
nodes a node-set algorithm chose, one for a path. Metrics offer none -- use a `threshold` rule.

```typescript
const run = element.run("louvain");
await run;

const { offers, more } = element.session.sets.offers(run.id);
console.log(offers.map((offer) => offer.label)); // ["Community 0 (41 nodes)", "Community 3 (17 nodes)", ...]
```

Offers come largest first; a connected-components run's first offer is the largest component.
**Using an offer writes nothing** -- it is usable at once as a scope:

```typescript
await element.run("pagerank", {}, { scope: { define: offers[0].definition } });
```

**Keeping one** makes it a kept set, created from the result:

```typescript
const kept = await element.session.sets.createFrom(offers[1], { name: "Community 3" });
```

A kept offer keeps the members it had in that run: re-run Louvain and the set still holds the old
community, and its status lists the run under `earlierRuns`. A community number means nothing in a
different run, so a community cannot follow re-runs. An offer that can (a path, a chosen node set;
see `offer.followable`) can be kept with `{ follow: true }` and then tracks the latest run.

An offer from a run that has since been re-run is refused with `E_BAD_COMMAND`, reason
`stale-offer`: ask for the offers again.

### One result item inside a rule

An offer's definition is a rule with one `item` leaf: "this item of this run's result". The leaf
can be used in any rule, so a community can be combined with other conditions. Here, the
high-PageRank nodes of community 3, held at the execution the offer came from:

```typescript
const community = offers[1].item; // { run, key: { field: "group", value: 3 }, execution }
const pagerank = element.run("pagerank");
await pagerank;

const hubs = element.session.sets.create(
    {
        kind: "rule",
        where: {
            kind: "all",
            of: [
                { kind: "item", item: community },
                { kind: "threshold", path: `results.${pagerank.id}.value`, top: 10 },
            ],
        },
        reading: "induced",
    },
    { name: "Hubs of community 3" },
);
```

An item without `execution` follows the run's latest result. That is refused for a community
number, which means nothing in another run, and allowed for fields that mean the same in every run
(`onPath`, a category, a level).

## Paths

A path set keeps its walk in order. Keep a shortest-path result as one with `createPath`:

```typescript
const run = element.run("shortest-path", { source: "a", target: "f" });
await run;

const [offer] = element.session.sets.offers(run.id).offers;
const route = await element.session.sets.createPath(offer, { name: "Route" });

element.session.sets.get(route)?.definition; // { kind: "path", nodes: ["a", "c", "d", "f"], edges: [...] }
element.session.sets.pathKind(route); // "simple"
```

`createPath("selection")` orders the selected edges into a walk instead, and refuses a selection
that is not one open chain with `E_BAD_COMMAND`, reason `ambiguous-path`, saying why in
`details.why` (`branch`, `cycle`, `disconnected` and others).

`pathKind` is `simple` (no node repeats), `cycle` (it returns to its start and repeats nothing
else), `trail` (no edge repeats) or `walk` (anything else). As a scope, a path holds its distinct
nodes and the edges it steps along, read `listed`.

## Changing and removing a set

```typescript
const sets = element.session.sets;
sets.rename(team, "Core team");
sets.redefine(team, { kind: "rule", where: "data.role == 'lead'", reading: "induced" });
sets.addMembers(picked, { nodes: ["d"] });
sets.removeMembers(picked, { nodes: ["a"] }); // also removes a's edges from the set
sets.remove(picked);
```

`addMembers` and `removeMembers` work on fixed sets only. Every change is one step, and a change
that changes nothing does nothing.

## Hearing about changes

The session emits `set:changed` once per set a write touched, after the layers and the filter
naming it have repainted:

```typescript
const stop = element.session.on("set:changed", ({ id, change, fields, set }) => {
    // change: "created" | "updated" | "removed"; fields: which ones an update touched
    console.log(id, change, fields, set?.name);
});
```

Membership and freshness have no event: a rule set's members move with the data, and a panel that
shows them re-reads on the events it already watches.

## Replacing the old scope verbs

Before sets, a named scope was saved through `session.scope` and a selection kept through
`selection.promote`. Those four calls still work -- they now create and list sets -- but are
deprecated:

| Deprecated | Use instead |
| --- | --- |
| `session.scope.save(name, spec)` | `session.sets.create(definition, { name })` |
| `session.scope.list()` | `session.sets.list()`, which returns the definitions |
| `session.scope.remove(id)` | `session.sets.remove(id)` |
| `session.selection.promote(name)` | `session.sets.createFrom("selection", { name })`, which also keeps the selected edges |

A scope saved the old way is a set: its id works as `{ set: id }` exactly as before.

## Interactive Examples

- [Colour a set](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--color-a-set)
- [Combine two sets](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--combine-two-sets)
- [A rule set follows the data](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--rule-set-follows-data)
- [Filter to a set](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--filter-to-a-set)
- [Lay out one set](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--layout-one-set)
- [Keep a community](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--keep-a-community)
- [A shortest path as a set](https://graphty.app/storybook/graphty-element/?path=/story/sets-kept-sets--shortest-path-as-a-set)
