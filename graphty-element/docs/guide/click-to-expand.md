# Click to Expand

> **Experimental.** Click-to-expand, the `_source.` attributes and the events below may change in a
> minor release while network sources settle.

A graph loaded from a network source does not have to be loaded whole. The element can ask the
source for a node's neighbors when the reader clicks or double-clicks it, and merge them into the
graph as one undoable step. Nothing is fetched until you switch it on.

## Switch it on

```ts
const element = document.querySelector("graphty-element");

element.layoutBehavior = { expand: { trigger: "double-click" } };
```

| Option              | Values                                | Default                    |
| ------------------- | ------------------------------------- | -------------------------- |
| `trigger`           | `"none"`, `"click"`, `"double-click"` | `"none"`                   |
| `depth`             | hops to fetch                         | `1`                        |
| `direction`         | `"out"`, `"in"`, `"both"`             | `"both"`                   |
| `limit`             | at most this many new nodes           | none (the source's paging) |
| `relationshipTypes` | only these edge types                 | every type                 |
| `layout`            | `"continue"`, `"none"`                | `"continue"`               |

`layout: "continue"` plays the layout so it places the new nodes; `"none"` leaves it as it is. New
nodes start next to the node they were fetched for. If you set `fetchNodes` and `fetchEdges` on
`layoutBehavior`, those hooks still answer a double-click, as before.

## From code

```ts
await element.session.data.expand(["2680"], { depth: 1, limit: 50 });
const result = await element.session.data.collapse("2680");
```

`expand` finds the load that brought the node, asks that source with the load's endpoint and
parameters, and merges what comes back: new nodes are added, nodes already in the graph take the
incoming attributes. Pass `credential` to use a credential for this call. A node with more to
fetch continues from where its last expansion stopped, and a second expansion of a node that is
still running joins it instead of fetching twice.

A node loaded from a file has no source to ask: `expand` rejects with a `GraphtyError` whose code
is `E_SOURCE_UNSUPPORTED` and whose `details.feature` is `"expand"`.

`collapse` removes what that node's expansions alone brought. A node another load or expansion
also brought stays, and so does a node the reader pinned or edited; `result.kept` lists those as
`{ code: "W_COLLAPSE_KEPT", params: { ids, reason } }` with `reason` `"pinned"` or `"edited"`.
Undo puts everything back.

## What each node says about itself

The element writes neutral facts as `_source.` attributes on every node a source load brings or an
expansion touches; a node no expansion has fetched around reads `_source.expansion: "none"`. It ships
no style for them; what to emphasize is your choice.

| Path                | Meaning                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `_source.loads`     | the keys of every load and expansion that brought the node             |
| `_source.expansion` | `"none"`, `"partial"` (more to fetch) or `"complete"`                  |
| `_source.degree`    | the node's degree at the source, when the source gives it; else `null` |
| `_source.hidden`    | `degree` minus the neighbors loaded; `null` when the degree is unknown |
| `_source.next`      | where a partial expansion continues                                    |

To mark nodes with more to fetch, add your own layer:

```ts
await element.session.styles.add({
    name: "More to fetch",
    target: "node",
    selector: { match: "expression", where: "data._source.expansion == 'partial'" },
    set: { "node.color": "#e8590c" },
});
```

## Events

| Session event          | DOM event                      | Carries                                                                            |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `source:expand-start`  | `graphty-source-expand-start`  | `{ seeds }`                                                                        |
| `source:expanded`      | `graphty-source-expanded`      | `{ code: "I_SOURCE_EXPANDED", params: { seeds, added: [nodes, edges], partial } }` |
| `source:expand-failed` | `graphty-source-expand-failed` | `{ code, params }`: the source's code, such as `E_SOURCE_AUTH`, and its values     |

```ts
element.session.on("source:expanded", ({ params }) => {
    console.log(`added ${String(params.added)}`, params.partial ? "with more to fetch" : "");
});
```
