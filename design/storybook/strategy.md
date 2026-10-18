# Storybook strategy

The Storybooks published at https://graphty.app/storybook/ are user documentation. The
graphty-element Storybook is the most important one: for most third parties it is the first place
they see the element working. Each Storybook is also a regression suite, because visual-review
screenshots every story and the Storybook test projects run every play function. This document
says how one build serves both readers and tests, how each Storybook is organized, what every
visible story must meet, and which checks keep it that way.

Two facts constrain everything below:

- visual-review compares every story with an owner-approved image in
  `visual-baselines/<project>/<story id>.png`. A story whose id changes shows up as "removed" plus
  "new" and needs the owner again. So every move in this document keeps story ids, and the few
  that cannot are batched for the owner (section 5).
- Agents never write under `visual-baselines/` and never add or change `parameters.chromatic` to
  hide a story.

## 1. Visibility

### Three kinds of story

| Kind                                          | Who it is for | Tags                                                 | Sidebar | Captured and tested |
| --------------------------------------------- | ------------- | ---------------------------------------------------- | ------- | ------------------- |
| Docs story                                    | readers       | default (`dev`, `test`), plus `autodocs` on the meta | yes     | yes                 |
| Regression story                              | maintainers   | `["regression", "!dev", "!autodocs"]`                | no      | yes                 |
| Internal story (experiments, developer tools) | maintainers   | `["internal", "!dev", "!autodocs"]`                  | no      | yes                 |

A regression story pins a bug, an edge case, an error path or a starting state. If a reader would
learn nothing new from it, it is a regression story. Examples:

- ten of the eleven Undo stories;
- the layer-precedence checks in Styles/Layered;
- the fake-GPU layout stories;
- issue pins;
- "before expanding" states;
- the assertion twin of a visible story whose play function checks results (see section 3,
  standard 9).

### Why tags, and what is proven

The mechanism was proven on a scratch copy of master: two sample story files added to
graphty-element and its full Storybook built (209 stories). Evidence:
`tmp/storybook-overhaul/review-visual/` in the main checkout.

- **`!dev` hides without dropping.** Storybook gives every story the `dev` and `test` tags. The
  sample story tagged `["regression", "!dev", "!autodocs"]` is in the built `index.json` as
  `type: "story"` with tags `test,regression,play-fn`: `dev` is gone and the id is unchanged.
  Visible siblings keep `dev,test,autodocs` and their own Docs page. compact-mantine relies on the
  same thing today: its Menu, Toast and Modal stories tag their interaction twins
  `INTERACTION_TEST_TAGS = ["!dev", "!autodocs"]`, and those twins have 32 approved baselines (for
  example `components-overlays-menu--context-menu-interactions.dark.png`).
- **Capture ignores tags.** visual-review finds stories with `storyIds()` in
  `visual-review/capture/capture.mjs`, which keeps every entry with `type === "story"`.
  `cli.mjs capture --stories <hidden id>` produced the hidden story's PNG. `preview.extract()`,
  which capture uses to read story parameters, does not filter by tags either.
- **Ids do not change.** Tags are not part of the story id.
- **Never use `!test`.** It is the one tag that would stop the test runners.
- **The sidebar drops it, a link still draws it.** Opened headless, the hidden story is missing
  from the tree; `?path=/story/<hidden id>` still renders it, with nothing selected in the sidebar.
- **Rejected: dropping test files from the production build** (Primer's approach, a `stories` glob
  that leaves test files out). Capture reads the production build, so it would lose them.
- **Rejected: a second Storybook composed with `refs`.** It adds a build and changes how capture
  finds stories, for no gain over a tag.

### What runs hidden stories, per package

Capture is not a test: it saved a PNG of the sample story whose play function threw. Every
Storybook therefore needs a test runner that executes play functions, in CI.

| Package              | Runs play functions today                                                                  | CI shard                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graphty-element      | Vitest Storybook addon, project `storybook` (`include: ["test"]`)                          | `graphty-element-storybook-1` to `-5`                                                                                                                                         |
| graphty              | Vitest Storybook addon, project `storybook`                                                | `graphty-storybook`                                                                                                                                                           |
| compact-mantine      | its own runner, `tests/stories/play.storybook.test.tsx`, which keeps `test`-tagged stories | `compact-mantine`                                                                                                                                                             |
| layout               | nothing                                                                                    | none -- add project `storybook` and shard `layout-storybook`                                                                                                                  |
| algorithms           | nothing                                                                                    | none -- add project `storybook` and shard `algorithms-storybook` (the algorithms shards pass explicit `--project` flags, so a new project runs nowhere without its own shard) |
| cytoscape-extensions | nothing                                                                                    | none -- add project `storybook` and shard `cytoscape-extensions-storybook`                                                                                                    |

The three new shards join the `small-browser` group in `tools/ci-test-matrix.mjs`. Until they
exist, layout, algorithms and cytoscape-extensions must not hide any story: a hidden story there
would be captured and never tested.

### Docs pages show the primary story only

graphty-element's `.storybook/preview.ts` sets `docs.page: DocumentationTemplate`, which renders
Title, Subtitle, Description, Primary and Controls -- no `<Stories/>` block. That stays: every
graphty-element story starts its own Babylon engine, and a Docs page with 10 or more inline WebGL
canvases hits Chrome's limit of about 16 WebGL contexts. Docs pages are never captured, so nothing
would notice. Consequences:

- The component description (`parameters.docs.description` on the meta) is the Docs page's text.
- A story's own reader text goes in its canvas caption (section 3, standard 2), where readers and
  the capture both see it. A per-story `parameters.docs.description` would be shown nowhere.

### Experiments and prototypes

- **Experiment with a baseline:** tag it `internal`. It is not deleted, because deleting a story
  removes an approved image, and only the owner can approve that.
- **No baseline and no test value:** delete it.
- **Working application-sized demo:** an example, such as graphty-element's AI Control. It stays
  visible under Examples, and its canvas says what it needs ("needs an API key", "needs a
  headset").

### Deep links

A story that the docs or a README link to stays visible. The link would still draw a hidden story,
but the reader would land on a page with no sidebar entry and nothing around it to explore.
`tools/check-storybook-links.mjs` enforces this (section 4).

## 2. Organization

### Rules for every Storybook

1. **The tree follows reader tasks, not source folders.**
    - It opens with an Introduction made of MDX pages: a Welcome page, Getting started (install and a
      first working example), and whatever concepts the package needs.
    - It closes with Examples, then Performance where the package has one.
2. **Every top-level section opens with an `Overview` MDX page.** The page says what the section
   covers, shows the smallest code that uses it, links to its stories, and links every story
   elsewhere that finishes the same task (a palette page links Custom palette; a WebGPU page links
   Performance). It ends with a "Reference" line linking the matching guide page and API page on
   https://graphty.app/docs/.
3. **Within one component the order is Default, then Playground (all controls), then one story per
   feature.** Stories keep their file's export order (no `method: "alphabetical"`), and each
   package's `storySort.order` is built in `preview.ts` from the section list it imports from
   `tools/storybook-taxonomy.json`, so the list lives in one place.
4. **Labels use real product names, never auto-split identifiers or internal terms:** "Neo4j CSV",
   "D3 JSON", "GraphML", "Click to expand"; never "Csv Neo 4 J", "Mode 2 D" or "Simple tier". A
   section or algorithm label must not reuse a front-end term (Components, Props, Events) for a
   graph concept: "Connected components", not "Components".
5. **Ids stay stable.** A story id is the component id (the meta's `id`, or else the kebab-cased
   `title`) plus `--` plus the kebab-cased export name.
    - When a title changes, set the meta's `id` to the old component id.
    - When a display name changes, set the story's `name` and keep the export.
    - Display text can drop British spelling baked into an id: "In its own colors" over the id
      `...in-its-own-colours`.
    - Several files may share a title or a meta id. A build of both cases showed what Storybook does:
      two files with one title and different ids give two "Docs" items under one sidebar entry; two
      files with one meta id and different titles give a single `<id>--docs` entry under the first
      file's title, and the other title gets no Docs page, with no build error. So **of the files
      that share a title or a meta id, exactly one declares `autodocs`; the others set meta
      `tags: ["!autodocs"]`, and the section's Overview links their stories.** Where that still reads
      badly, use distinct leaf titles ("Styling/Layers/Basics", "Styling/Layers/Combining").
    - Moves that need a new id go to the owner as one batch (section 5).

### graphty-element

Top level: Introduction, Data, Layout, Styling, Algorithms, Interaction, XR, Configuration,
Extending, Performance, Examples. The right column lists the old component ids, which each meta
keeps as its `id`.

| Section                                                              | Contents                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Introduction / Welcome                                               | MDX: what graphty-element is; links to the guide (https://graphty.app/docs/graphty-element/), the API reference, npm, and the entry-point map (`.`, `./session`, `./schema`, `./catalog`, `./extend`, `./format`, `./logging`, `./bundle`)                                    |
| Introduction / Getting started                                       | MDX with two complete examples, each in its own source block: (a) one self-contained HTML file that loads `@graphty/graphty-element/bundle` from a CDN, with no build step; (b) the npm and Vite version. Embeds First graph with `<Canvas of=...>`                           |
| Introduction / First graph                                           | `graphty` (`stories/Graphty.stories.ts`, the six-node graph in the element's own look). `title: "Introduction/First graph"`, `id: "graphty"`, export `graphty` with `name: "Default"`. docs/guide/getting-started.md and web-component.md already link `graphty--graphty`     |
| Introduction / Concepts, Using with React                            | MDX: data, layout, styles, algorithms; the React wrapper                                                                                                                                                                                                                      |
| Data / Overview                                                      | MDX: the three ways in -- inline arrays, a URL, a file -- each with its code                                                                                                                                                                                                  |
| Data / Your own data                                                 | `data--basic` (shown as "Inline nodes and edges") and `data--modified-json`. Shares `id: "data"` with Formats; this file declares `autodocs`                                                                                                                                  |
| Data / Formats                                                       | the rest of `data`: every file format, one story each, captioned with what was read (node count, edge count, attributes). `id: "data"`, `tags: ["!autodocs"]`; the Data Overview lists every format story                                                                     |
| Data / From a server                                                 | `network-sources-sources`, `network-sources-source-chooser`, `network-sources-errors`; each error drawn as a readable message, not raw JSON. **Lands with feat/network-sources**: these ids are not on master                                                                 |
| Data / From a server / Click to expand                               | `network-sources-click-to-expand` and `data-click-to-expand`. **Lands with feat/network-sources**: merge the two components on that branch before its baselines are approved, or keep both ids. "Before expanding" becomes a regression story                                 |
| Data / Sample graphs                                                 | stories over graph-samples generators and datasets                                                                                                                                                                                                                            |
| Layout / Overview, 2D, 3D                                            | `layout-2d`, `layout-3d`                                                                                                                                                                                                                                                      |
| Layout / WebGPU                                                      | `layout-gpu`: the real WebGPU story stays visible and says on the canvas when WebGPU is missing; the two "Fake" stories become regression stories. Links Performance                                                                                                          |
| Styling / Nodes, Edges, Labels, Graph                                | `styles-node` (NodeStyles and AllNodeShapes), `styles-edge` (EdgeStyles, ArrowText, BezierEdges, BidirectionalArrows), `styles-label`, `styles-graph` (except `--layers`). One file per shared id declares `autodocs`                                                         |
| Styling / Layers                                                     | `styles-graph--layers` plus 4 of `styles-layered` (two-layer node colors, three-layer sizes, shape and color, complex multi-property). The other 11 become regression stories. `styles-graph--layers` keeps its id, so this title spans two ids: one file declares `autodocs` |
| Styling / Tooltips, Selection highlight                              | `styles-node-tooltip`, `styles-selection-highlight`                                                                                                                                                                                                                           |
| Styling / Palettes                                                   | `algorithms-palette-picker`. Its description's first sentence links Extending / Custom palette                                                                                                                                                                                |
| Algorithms / Centrality                                              | `algorithms-centrality`                                                                                                                                                                                                                                                       |
| Algorithms / Communities                                             | `algorithms-community`, including K-core shown as "K-core (dense cores)"                                                                                                                                                                                                      |
| Algorithms / Connected components                                    | `algorithms-component`                                                                                                                                                                                                                                                        |
| Algorithms / Paths                                                   | `algorithms-shortest-path` and `algorithms-traversal` (two ids, one title: one declares `autodocs`)                                                                                                                                                                           |
| Algorithms / Spanning trees, Flow                                    | `algorithms-spanning-tree`, `algorithms-flow`                                                                                                                                                                                                                                 |
| Algorithms / Link prediction                                         | `algorithms-combined--link-prediction` (shared id with Combining: one declares `autodocs`)                                                                                                                                                                                    |
| Algorithms / Combining algorithms                                    | the rest of `algorithms-combined`                                                                                                                                                                                                                                             |
| Interaction / Selection                                              | `selection--mode-2-d`, `selection--mode-3-d`                                                                                                                                                                                                                                  |
| Interaction / Saved selections (sets)                                | `sets-kept-sets`                                                                                                                                                                                                                                                              |
| Interaction / Undo                                                   | `undo`: one visible story (style edit then undo), whose caption lists what undo covers; the other ten become regression stories                                                                                                                                               |
| Interaction / Camera and views                                       | `camera-controls`, `viewmode` ("View modes"), `screenshot` ("Screenshots and video")                                                                                                                                                                                          |
| XR                                                                   | `xr`, `selection--mode-ar`, `selection--mode-vr`, each captioned "needs a VR or AR device". The AR and VR stories share `id: "selection"` with Interaction / Selection: only one file declares `autodocs`                                                                     |
| Configuration / Logging                                              | `logging` (`Logging.stories.ts`) and `Logging.mdx` (no baseline, so it can move freely). Links Extending / Logging                                                                                                                                                            |
| Extending / Overview                                                 | MDX: every extension point exported from `@graphty/graphty-element/extend` (Algorithm, registerSnapshotLayout, LayoutEngine, DataSource, DataSource.fromImporter, registerFormatWriter, palettes, log sinks), each with a simple path and an advanced path                    |
| Extending / Custom algorithm, Custom layout, Custom palette          | `extending-simple-tier-algorithm`, `-layout`, `-palette`                                                                                                                                                                                                                      |
| Extending / Logging                                                  | `extending-simple-tier-logging`: only the custom destination (`registerLogSink`). Links Configuration / Logging                                                                                                                                                               |
| Extending / Custom file reader                                       | new: `DataSource.fromImporter` over a TSV file with custom column names                                                                                                                                                                                                       |
| Extending / Advanced / Iterative layout engine, Reading the snapshot | new MDX pages, each linking the API reference                                                                                                                                                                                                                                 |
| Performance / Overview                                               | MDX opening with "Turning on WebGPU": install the optional `@graphty/webgpu-graph-algorithms`, no code needed; links Layout / WebGPU and Large graph                                                                                                                          |
| Performance / Large graph                                            | `performance-large-graph`                                                                                                                                                                                                                                                     |
| Examples                                                             | `ai-control` (captioned with what it needs), plus any later application-sized demos                                                                                                                                                                                           |

Features the docs describe that have no story yet: find, neighbors, what is under a point and
on-screen position; project files, load preview, journal and notes; renderer choice and custom
cameras. Each guide on the docs site links to its stories.

### Other Storybooks

- **compact-mantine:** keep its September organization (`compact-mantine/design/storybook-ia.md`).
    - Move `stories/theme/NativeSelect.stories.tsx` into Components/Inputs/Select with its old `id`,
      and re-key any `OFF_BY_DESIGN` entry in `tests/a11y/axe.ts` the move touches (it is keyed by
      title).
    - Set display `name`s that follow rule 4.
    - Add `.storybook/manager.ts` branding.
    - Align `@storybook/addon-a11y` (^8.6.12) with Storybook 9.
    - The hidden-twin split of the 54 visible stories that assert on load is picture-changing work:
      see section 5, item 4.
- **graphty app:**
    - Sections: Introduction, Workspace, Components, Examples. Introduction is MDX: the app, its main
      tasks, keyboard use and the accepted file formats.
    - Fix the sort order so the Storybook opens on Introduction.
    - Tag the old Shell and DataView stories `regression` until #3055 deletes the old shell.
    - Tag the Compact section `internal` (compact-mantine's own Storybook documents those
      components), and Sentry too.
    - Fix CopyButton so it shows its value.
    - Add a decorator that clears the usage-data answer before every story, so stories stop leaking
      state into each other.
    - Where several stories show the same state, keep one visible and make the rest regression
      stories.
- **layout:**
    - Sections: Introduction, Geometric, Structural, Force-directed, Simulations, matching the docs.
    - Keep `id: "layout2d"` / `"layout3d"`, with display names that match the API: "Spring
      (Fruchterman-Reingold)", "Circular in 3D".
    - Fix Random's scale.
    - Add grid, radial, the step-by-step simulations and the `LAYOUTS` catalog.
    - Add the `storybook` Vitest project and shard before hiding anything.
- **algorithms:**
    - Sections: Introduction, then plural groups (Centrality, Communities, Connected components,
      Paths, Spanning trees, Flow, Matching, Link prediction).
    - Keep every id: `algorithms/scripts/build-gh-pages.js` redirects old example URLs to them.
    - Fix Ford Fulkerson's last layer to `actualNodeCount - 1 - nodeId`.
    - Draw arrows on directed graphs.
    - Pass `uniquePairs: true` to link prediction.
    - Every story shows its call and the shape of its result.
    - Add the `storybook` Vitest project and shard before hiding anything.
- **cytoscape-extensions:**
    - Replace the single `Gallery` root with: Introduction (registering the extensions, choosing a
      backend, `configureWebGpu`); Layouts; Algorithms (the six algorithm folders); Data (Generators
      grouped by family, Datasets, Formats); Performance (Large graphs).
    - `test/demo-catalog.test.ts` writes the new titles and keeps the old ids.
    - Every tile shows its call.
    - A missing WebGPU is reported as one short sentence, not the raw error chain.
    - Add the `storybook` Vitest project and shard before hiding anything.

## 3. The standard for a visible story

1. **Consumer code in the Code panel.** Every visible story sets `parameters.docs.source.code`
   (through one shared helper per package) to the exact `<graphty-element ...>` markup or JS a
   consumer would write to get the same picture, not the `renderFn` / `storySetup` /
   `eventWaitingDecorator` plumbing that the auto-generated source shows. `preview.ts` turns on
   `docs.codePanel` so the source is shown beside the canvas, not only on the Docs page.
2. **The canvas reads on its own** at 1200 x 900:
    - a caption naming what is shown and how to get it (this is the story's reader text, see
      section 1);
    - a legend wherever color or size carries meaning;
    - labels big enough to read;
    - the graph filling the frame, with nothing clipped.
3. **The component description** in the meta's `parameters.docs.description` says what the reader
   sees and how to get it. It leaves out issue numbers, design-doc paths, how pixels are measured
   and 1.x history; those belong in a code comment or a regression story.
4. **Controls come from `args` and `argTypes`** rather than buttons and selects built inside the
   story. A review guideline, not a lint: actions no `arg` can trigger are allowed (Screenshots and
   video), and so are application-sized demos under Examples.
5. **Real data, with its source named** (dataset name and origin) in the caption or description.
6. **No console errors or page errors.** A story that fails on purpose is a regression story and
   lists the expected message in `parameters.expectedConsoleErrors`.
7. **Accessible names** on every control.
8. **Nothing depends on the viewer's machine:** no emoji-only labels or icons, and any hardware or
   API-key requirement is stated on the canvas.
9. **A visible play function demonstrates; it does not assert.** A play function that drives the
   demo through real input (pointer events, clicks) is fine and is how an interaction story reaches
   its state. Assertions (`expect`, `waitFor(... toBe ...)`) go in a hidden `*Interactions` twin
   tagged `regression`, the pattern compact-mantine already uses.
10. **A baseline** approved by the owner.

Copy-and-run test for the Introduction: a reader can paste the Getting started HTML block into an
empty file, open it, and see the First graph story.

MDX pages are docs entries, which capture ignores, so they never need a baseline.

## 4. Quality checks

### 4.1 `tools/check-storybooks.mjs <package>`

Reads a built `index.json`, the MDX files it names (by `importPath`), the package's baselines (read
only) and `tools/storybook-taxonomy.json`. It fails when:

- a title's top-level section is not in the package's list in `tools/storybook-taxonomy.json`;
- a top-level section has no `Overview` docs entry, or the package has no Introduction;
- an Overview MDX has no link to `https://graphty.app/docs/`;
- two entries share a title and name, docs entries included (two "Docs" under one title);
- one component id's stories appear under more than one title and any of those titles has no docs
  entry;
- a story tagged `regression` or `internal` still has `dev` or `autodocs`, or lacks `test`;
- a visible name looks auto-split (`/\b[A-Z] \d|\d [A-Z]\b|\b[A-Z] [A-Z]\b/`);
- within a component, a story named Default or Playground is not first or second;
- **a baselined id is missing from the build.** The id is a baseline file's name before its first
  `.` (`<id>.png`, `<id>.dark.png`). An id that is a `from` in `visual-baselines/<project>/renames.json`
  is satisfied when its `to` is in the build. The message says to keep the old `meta.id` or ask the
  owner for a rename record. This catches a changed id before the push instead of in the visual
  gate;
- the package's accessibility violation count, read from the Vitest addon's a11y reports, is above
  the number recorded for it in `tools/storybook-taxonomy.json`. The number is lowered by hand as
  fixes land; at 0 the package's `parameters.a11y.test` moves from `"todo"` to `"error"`;
- the package has a Storybook but no CI shard in `tools/ci-test-matrix.mjs` that runs its stories.

No `index.json` for an affected package is a failure that says "no build", never a silent pass.

Where it runs:

- **CI:** in ci.yml's `Links` job, which already downloads the Storybook artifacts for
  `check-storybook-links.mjs`. (The `Checks` job has no Storybook build.)
- **Pre-push:** in `tools/prepush.sh`, after the background screenshot capture has built the
  affected Storybooks, reading those builds. It skips packages the push does not affect and prints
  that it skipped them.

### 4.2 `tools/check-storybook-links.mjs`, one new rule

A deep link (`?path=/story/<id>`) whose `index.json` entry is a story without the `dev` tag fails
with "links to a hidden story". The link rules stay in this one tool.

### 4.3 Story lint (ESLint, every package with stories)

`eslint-plugin-storybook`'s recommended rules, plus a local rule `local/storybook-docs` in
`tools/eslint-rules/` that fails when:

- a meta has no `parameters.docs.description`;
- a story without `!dev` has no `parameters.docs.source.code`;
- a description contains `#<number>`, a `design/` path or "1.x";
- a meta declares neither `autodocs` nor `!autodocs` with the `regression` or `internal` tag;
- a story without `!dev` has a `play` that calls `expect` or `waitFor(... toBe ...)`. The message
  points to the hidden-twin pattern. Existing violators go in an allowlist that only shrinks
  (their split changes pictures, section 5 item 4); a new one fails at once.

### 4.4 Story tests, console errors and accessibility

- **Story test projects:** a `storybook` Vitest project in layout, algorithms and
  cytoscape-extensions, with shards `layout-storybook`, `algorithms-storybook` and
  `cytoscape-extensions-storybook` in `tools/ci-test-matrix.mjs` and its `small-browser` group.
  layout and algorithms have none today, which is how Ford Fulkerson shipped broken.
- **Console errors:** added to each package's existing `.storybook/vitest.setup.ts` (graphty-element
  already has one), never a second setup file. It fails a story on `console.error` or an uncaught
  error unless the message is in `parameters.expectedConsoleErrors` or a package-wide list of known
  messages. It starts in report-only mode, because graphty-element's five Storybook shards will
  report Babylon and WebGPU noise on day one; it fails once that list is settled. (visual-review's
  capture also records console lines per story and supports `failOnConsole`; this is the test-side
  counterpart, which runs play functions.)
- **Accessibility:** `@storybook/addon-a11y` in every Storybook at `parameters.a11y.test: "todo"`,
  ratcheted by the count in 4.1.

### 4.5 graphty-element's own story contracts

`test/contracts/story-source.ts`, `stories/story-roster.json` and `story-roster.test.ts` key a
story on `<meta title>::<export name>` and say that pair is the baseline key, which is wrong once a
meta sets `id`. `story-demonstrates-its-subject.test.ts` matches story names to its vocabulary by
title (`Styles/Layered`, `Algorithms/Centrality`, `Data`, `Layout/2D`). Every retitle would fail
them. Before any retitle:

- `story-source.ts` keys a story on its Storybook id (`meta.id` or the kebab-cased title, plus `--`
  and the kebab-cased export);
- `story-roster.json` is rewritten once with those ids (one to one, since ids do not change);
- the subject vocabulary points at component ids instead of titles.

The roster test then also guards id stability before any build.

### 4.6 Unchanged

The dead-link check (`tools/check-links.sh`, `tools/check-storybook-links.mjs`) and the visual-review
gate. Neither ci.yml's `visual` job nor its gate step changes.

## 5. Rollout

1. **graphty-element first,** in this order:
    - re-key the story contracts on ids (4.5);
    - add the tags;
    - change the titles, keeping the old meta `id`s, and set `!autodocs` on all but one file per
      shared title or id;
    - add the Introduction, Overview and new Extending pages and the source helper;
    - rewrite the descriptions and captions for readers.

    Ids do not change, so baselines need no re-approval except for stories whose picture changes.
    The Network sources rows land on feat/network-sources, not here.

2. **Checks:** land in report-only mode; each fails once its package passes it.
3. **The other Storybooks:** one pull request each. layout, algorithms and cytoscape-extensions add
   their story test project and shard first.
4. **Picture-changing fixes are batched,** so the owner reviews each package once:
    - readable canvases, captions and legends;
    - the fixes for Random, Ford Fulkerson and CopyButton;
    - the hidden-twin split: compact-mantine's 54 visible stories that assert on load lose their play
      (54 changed images) and gain 54 `*Interactions` twins (54 new ids), about 108 items for the
      owner; graphty-element's allowlisted violators follow the same pattern;
    - moving the remote-logger console button out of the published and captured build, which
      changes every graphty-element image.

Decisions only the owner can make:

- writing `renames.json` records under `visual-baselines/`;
- approving new or changed images;
- deleting any story that has a baseline (the Sentry helper story, any experiment);
- whether to remove `chromatic.disableSnapshot` from algorithms' Ford Fulkerson, Bellman Ford and
  Floyd Warshall so they get baselines. Agents may not change `parameters.chromatic`.
