# Rules and Text Matching

A layer's selector says which elements it paints. `{ match: "rule", where }` takes a rule: a
condition on the elements' values, or several combined. A rule is re-checked as the data changes,
so a layer for "name contains Bob" picks up a Bob added later.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: 1, name: "Bob Smith" },
    { id: 2, name: "Alice" },
    { id: 3, name: "bobby" },
    { id: 4, name: "Carol" },
]);

// Every node whose name contains "bob", in any case.
const bobs = await session.styles.add({
    name: "Bobs",
    target: "node",
    selector: { match: "rule", where: { kind: "text", reads: "data.name", mode: "substring", text: "bob" } },
    set: { "node.color": "#d55e00" },
});

// Every node whose id ends in an odd digit: the id is a value a rule can read.
const odd = await session.styles.add({
    name: "Odd ids",
    target: "node",
    selector: { match: "rule", where: { kind: "text", reads: "id", mode: "regex", text: "[13579]$" } },
    set: { "node.size": 2 },
});

console.log(session.styles.counts(bobs.id).matched, session.styles.counts(odd.id).matched); // 2 2
```

## Matching text

A `text` condition reads one value (`"id"` for the element's id, `"data.<column>"` for a column,
`"results.<run>.<field>"` for a run's value) and tests it with a `mode`:

| `mode`          | Holds an element when its value |
| --------------- | ------------------------------- |
| `"substring"`   | contains the text               |
| `"exact"`       | is the text                     |
| `"starts-with"` | starts with the text            |
| `"ends-with"`   | ends with the text              |
| `"regex"`       | matches the regular expression  |

Case does not count unless you pass `caseSensitive: true`; accents and runs of spaces are folded
the same way. A number or yes-or-no value is read as its text, and an element without the value
never matches. This is the same matcher `session.find()` uses, so a layer and a search agree on
what "contains bob" means. Each value row `find()` returns carries the rule that holds its
elements, as `row.rule`, ready to put in a layer:

```ts
const [row] = session.find("bob").values;
await session.styles.add({
    name: String(row.value),
    target: "node",
    selector: { match: "rule", where: row.rule },
    set: { "node.size": 2 },
});
```

## Other conditions

| Condition                                   | Holds                                                       |
| ------------------------------------------- | ----------------------------------------------------------- |
| `{ kind: "range", attribute, min?, max? }`  | values between `min` and `max`, both ends included          |
| `{ kind: "categories", attribute, values }` | one of the listed values                                    |
| `{ kind: "threshold", path, top }`          | the top `top` elements by any number, a column's or a run's |
| `{ kind: "degree", min?, max? }`            | nodes with that many edges                                  |
| `{ kind: "member", of }`                    | the members of a set                                        |
| `{ kind: "all", of: [...] }`                | elements every listed condition holds                       |
| `{ kind: "any", of: [...] }`                | elements at least one listed condition holds                |

The same conditions describe a visibility filter (`session.visibility.set`), so a rule that paints
some nodes can hide them too.

## Which edges

For a rule about nodes, `edges` says which edges come with them: `"incident"` for the edges
touching a matched node, `"induced"` for the edges between two matched nodes, and `"clipped"` (the
default) for the edges between them as the visibility filter reads it. See
[One Row for Nodes and Edges](./style-rows-both-kinds.md) for a row that paints both.
