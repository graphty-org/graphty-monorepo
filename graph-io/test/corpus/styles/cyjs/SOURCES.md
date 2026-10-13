# Cytoscape.js stylesheet corpus

Inputs for graph-io's Cytoscape.js style engine (`src/styles/cyjs`), with the values real Cytoscape.js draws for
them. Every file is Cytoscape.js JSON: `{ "elements": [...], "style": [...] }`, where `style` is an array of
`{ selector, style }` or, in a few files, a stylesheet written as text. All files were generated for this project
by seeded scripts; none is taken from elsewhere. License: MIT, like the package.

| Directory | What it holds                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adv/`    | A selector zoo (comparisons with `@` and `!`, `[?a]`, `[^a]`, `[[degree > 2]]`, `[[indegree = 0]]`, states, an invalid `:not()`, `mapData()` with a zero and a reversed range, `50%` and `3em` sizes, colors given as numbers), 500 class rules over 3,000 nodes, and a stylesheet given as text.                                                                                                                   |
| `adv3/`   | 30 and 80 overlapping boolean-column selectors over 400 nodes and 400 edges.                                                                                                                                                                                                                                                                                                                                        |
| `adv4/`   | Opacity-only rules and opacity plus another property, 5 to 160 rules.                                                                                                                                                                                                                                                                                                                                               |
| `adv5/`   | Many small rules per property (opacity, border color, background, label, shape, width, font), 30 and 300 rules.                                                                                                                                                                                                                                                                                                     |
| `adv6/`   | Tiny cascades of two or three rules where a later rule overrides part of an earlier one.                                                                                                                                                                                                                                                                                                                            |
| `adv7/`   | Rule runs whose generated keys could clash with a prefix.                                                                                                                                                                                                                                                                                                                                                           |
| `rules/`  | Written by `graph-io/scripts/cyjs-rules-corpus.mjs` (seeded): sheets for the less common grammar: compound selectors with `>` and the subject `$`, edge selectors (`->`, `<->`), `[[outdegree]]`, nested data paths, escaped ids, numeric ids, bypasses on elements, class arrays, selection and grab flags, every `mapData()` edge case, and text stylesheets with comments and a property that stops the reading. |
| `golden.json.gz` | What Cytoscape.js 3.34.3 reports for every element of every file above (see below). |

`golden.json.gz` holds what Cytoscape.js 3.34.3 reports for every node and edge of every file
(`ele.style(property)` from a headless core with styles on), run-length encoded per property. `"!error"` marks an
element Cytoscape.js itself throws on while styling it (a number where a color is read through `data()`).
`graph-io/scripts/cyjs-golden.cjs` writes it; rerun it after adding or changing a file:

```bash
node graph-io/scripts/cyjs-golden.cjs
```

The test compares graph-io's engine with these values without loading Cytoscape.js. Two constructs are absent on
purpose because Cytoscape.js 3.34 never finishes reading them, so it has no values to compare with: a text
stylesheet holding `/**/` (an empty comment) followed by more text, which sends its comment pattern into
exponential backtracking, and an edge whose source or target names no node (Cytoscape.js throws while adding it).
