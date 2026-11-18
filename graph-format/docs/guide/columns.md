# Ids and columns

## The id map

Inside a snapshot a node is an index from 0 to `nodeCount - 1`. Your own ids live only in
`snapshot.ids`, a `NodeIdMap`, and are used at the edges of your program: when you look a node up
and when you hand a result on.

| Call                   | Returns                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `ids.idOf(i)`          | the id of node `i`                                               |
| `ids.indexOf(id)`      | the index of `id`, or `INVALID_INDEX` (`0xFFFFFFFF`) when absent |
| `ids.requireIndex(id)` | the index of `id`; throws `E_UNKNOWN_NODE` when absent           |
| `ids.has(id)`          | whether the graph has `id`                                       |
| `ids.indicesOf(ids)`   | a `Uint32Array` of indices                                       |
| `ids.toMap(values)`    | a `Map` from each id to `values[i]`                              |
| `ids.toArray()`        | every id, in index order                                         |

Ids are compared exactly: the number `1` and the string `"1"` are different nodes. When a graph's
ids are `0, 1, 2, ...` in order, the map stores nothing at all.

Edges have indices too (`0` to `edgeCount - 1`, in the order they were added). An edge has an id
only when you gave it one (the `edgeId` option of `fromElements()`, or `edgeIds` of
`fromEdgeArrays()`); `snapshot.edgeIndexOf(id)` then finds it.

## Attribute columns

Node attributes live in `snapshot.nodes`, edge attributes in `snapshot.edges` and graph-level
attributes in `snapshot.graph`. Each is an `AttributeTable` of named columns, one value per row,
and every column has a **dtype**:

| Dtype              | Holds                                           |
| ------------------ | ----------------------------------------------- |
| `f32`, `f64`       | floating-point numbers                          |
| `i32`, `u32`, `u8` | integers                                        |
| `bool`             | true or false                                   |
| `string`           | text                                            |
| `dict`             | text with few distinct values, each stored once |
| `list`             | a list of numbers or strings per row            |
| `json`             | any JSON value                                  |

A numeric column can hold several values per row (`components`), for example a position with
`x`, `y` and `z`. Any row may be unset, which `isSet()` reports.

<<< ../examples/columns.ts

`value(name, row)` reads one value of any column. For speed, `requireTyped(name, dtype)` returns
the column itself, whose `data` is a typed array you can read directly; it throws `E_COLUMN_TYPE`
when the column has another dtype, and `typed(name, dtype)` returns `null` instead.

A column can also carry a **role**, which tells other packages what it means without relying on
its name: `label`, `id`, `weight`, `position`, `color`, `size`, and so on. `byRole("label")` finds
the column holding a role, and a table holds each role at most once.

## Adding columns to a frozen snapshot

A snapshot's graph never changes, but its set of columns does: `set()`, `remove()` and `rename()`
work on a frozen snapshot. A layout, for example, writes positions as a new column. A column
declared `mutable` can also be written in place, which is how a running simulation updates
positions every frame without allocating.

### Sealing

Because anyone holding a snapshot can change its columns, an owner that passes a snapshot to code
it does not trust first attaches its own columns and then calls `snapshot.seal()`:

```ts
snapshot.nodes.set("position", positions, { components: 3 });
snapshot.seal();
snapshot.nodes.value("label", 0); // reads work as before
snapshot.nodes.remove("position"); // throws GraphFormatError E_FROZEN
```

Sealing fixes which columns exist, not what they hold: a column declared `mutable` can still be
written. `seal()` cannot be undone. `withColumns()` on a sealed snapshot returns a snapshot that
shares the graph but has writable tables of its own.
