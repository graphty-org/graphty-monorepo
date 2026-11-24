# Label Size on Screen and Numbers in Labels

Two label options make labels easy to read whatever the zoom and whatever the data:

- `sizeMode: "screen"` in a label style measures its size in CSS pixels, so a 14 px label stays
  14 px tall as the reader zooms. The default, `"world"`, measures it in the scene, so the label
  grows and shrinks with its node.
- `format` on a binding that writes a number as text rounds it, using the options of
  `Intl.NumberFormat`. Without it a number is written in full, so a betweenness score reads
  `129.64334674418717`.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.addNodes([
    { id: "a", score: 129.64334674418717 },
    { id: "b", score: 0.012345678 },
    { id: "c", score: 1504.5 },
]);
await session.styles.add({
    name: "Scores",
    target: "node",
    selector: { match: "everything" },
    set: { "node.labelStyle": { enabled: true, sizePx: 14, sizeMode: "screen" } },
    encode: {
        "node.label": { by: "data.score", format: { maximumSignificantDigits: 3, locale: "en-US" } },
    },
});

for (const id of ["a", "b", "c"]) {
    console.log(session.styles.explain({ node: id }).merged["node.label"]);
}
```

This prints:

```text
130
0.0123
1,500
```

## Size

`sizePx` is the label's size; `sizeMode` says what it is measured in. With `"screen"`, the label's
place beside its node, the pass that hides overlapping labels, and a pulse all follow the size it
is drawn at. The same unit applies to a bound label size channel such as `node.labelSize`.
`LABEL_STYLE_DEFAULTS` lists the value of every label style field when nothing sets it, including
`sizeMode: "world"`.

## Number format

`format` takes these fields, each the `Intl.NumberFormat` option of the same name unless noted:

| Field                      | Example                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `maximumFractionDigits`    | `2` writes 129.64334 as 129.64                                                                       |
| `minimumFractionDigits`    | `2` writes 34 as 34.00                                                                               |
| `maximumSignificantDigits` | `3` writes 129.64334 as 130, 0.0123456 as 0.0123                                                     |
| `useGrouping`              | `false` writes 12345 as 12345                                                                        |
| `style`                    | `"percent"` writes 0.25 as 25%; `"currency"` with `currency: "USD"` writes 12.5 as $12.50            |
| `notation`                 | `"compact"` writes 12345 as 12K, `"scientific"` as 1.235E4                                           |
| `signDisplay`              | `"always"` writes 3 as +3                                                                            |
| `prefix`, `suffix`         | text around the number (not an Intl option): `{ prefix: "#" }` writes #3                             |
| `date`                     | an instant as a date, in UTC: `{ style: "absolute", dateStyle: "short" }` or `{ style: "relative" }` |
| `locale`                   | `"de-DE"` writes 1504.5 as 1.504,5                                                                   |

`formatValue(value, format)` from `@graphty/graphty-element/catalog` is the same formatter, for an
editor that previews a format.

Without `locale`, the runtime's own locale chooses the decimal and grouping marks. Text values are
never reformatted, and `format` is ignored on channels that do not carry text. A format that
`Intl.NumberFormat` refuses is refused when the layer is written. The same option works on a
tooltip or an edge caption bound to a number.

More on labels is in [Labels](./labels).
