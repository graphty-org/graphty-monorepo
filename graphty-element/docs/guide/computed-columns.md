# Computed Columns

A computed column is a new column whose values are worked out from the columns a graph already has
and from the results of algorithms you ran. You write one expression; graphty-element fills in a
value for every node and keeps it up to date.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { data } = element.session;

await data.addNodes([
    { id: "ada", name: "Ada Lovelace", nickname: "Ada" },
    { id: "bob", name: "Bob Smith" },
]);

await data.derive("display", "data.nickname || data.name");

console.log(data.node("ada")?.display); // "Ada"
console.log(data.node("bob")?.display); // "Bob Smith"
```

The new column is a column like any other: a style can color by it, a filter or a search can test
it, a table lists it, and an export writes it.

## Writing the expression

The expression is the one selectors and filters use. Name a column as `data.<column>`, and put
numbers and other literal values between backticks:

| Expression                            | Each value is                                       |
| ------------------------------------- | --------------------------------------------------- |
| `data.nickname \|\| data.name`        | the nickname, or the name when there is no nickname |
| ``data.age >= `18` ``                 | `true` or `false`                                   |
| `data.country == 'US' && data.active` | whether both hold                                   |
| `data.title`                          | a copy of `title`                                   |
| ``data.weight * `2` ``                | twice the weight                                    |
| `data.in / data.out`                  | the ratio of `in` to `out`                          |

A node with nothing to read gets `null`. Comparing something that is not a number with `<`, `<=`,
`>` or `>=` also gives `null`.

Arithmetic (`+`, `-`, `*`, `/`, a leading minus and parentheses) works on numbers only: if either
side is not a number, or the answer is not a finite number (dividing by zero), the value is `null`.
`*` and `/` bind tighter than `+` and `-`, and all four tighter than the comparisons. See
[the expression language](./styling#the-expression-language).

## Reading an algorithm's result

A result is read the same way, at the path `resultPath` gives for the run. `quotePath` writes
that path so an expression reads it, whatever the algorithm is called:

```ts
import { quotePath, resultPath } from "@graphty/graphty-element/session";

const run = element.run("degree");
await run;
await data.derive("hub", `${quotePath(resultPath(run.id, "value"))} >= \`5\``);
```

## Staying up to date

The values follow what they read. Editing a node, adding nodes, loading more data, running the
algorithm again or removing its run updates the computed values in the same undoable step as the
change that moved them. A computed column can read an earlier computed column.

Calling `derive` again with the same name replaces the expression. `data.derivedColumns()` lists
every computed column with its expression, in the order they were added.

## Edges

Pass `{ kind: "edge" }` for a column on edges:

```ts
await data.derive("heavy", "data.weight >= `10`", { kind: "edge" });
```

## Undo and saving

Adding a computed column is one undoable step: undo removes the column and its values. A project
file saves the expression rather than the values, and opening the project works the values out
again from what it holds.

## When `derive` refuses

`derive` rejects with a `GraphtyError` and adds nothing when:

| `code`                | `details`                | Why                                                       |
| --------------------- | ------------------------ | --------------------------------------------------------- |
| `E_BAD_SELECTOR`      | `reason`, `position`     | the expression does not parse                             |
| `E_UNKNOWN_ATTRIBUTE` | `paths`                  | it reads a column or result that nothing in the graph has |
| `E_BAD_COMMAND`       | `reason: "name-taken"`   | another column of the same kind already has the name      |
| `E_BAD_COMMAND`       | `reason: "empty-name"`   | the name is empty                                         |
| `E_BAD_COMMAND`       | `reason: "reads-itself"` | the expression reads the column it defines                |
