# The dry run

The dry run walks the graphty app the way a user does and checks what the user would then see.
Each **route** starts on the start page and makes real clicks, keystrokes and file choices in a
headless Chromium drawn on this machine's NVIDIA card. When the walk is done, the route's
**outcome checks** read the result through graphty-element's public API (the colors, sizes,
shapes and labels the drawing has; the graph's size) or through the page's accessibility tree. No
model is involved, and no pixels decide a route's result.

The routes began as the success paths of the design studio's tier 3 study
(`design/ui/studio/tier3/answers.md`). Each route names the study task it walks in `from`.

## Running it

`tools/acceptance.mjs` runs the routes a change can affect, or every route. It builds the app first
(nx caches an unchanged tree):

```bash
node tools/acceptance.mjs run                        # the routes this branch's change can affect
node tools/acceptance.mjs run --base origin/master   # measured from another base (default: the push base)
node tools/acceptance.mjs run --all                  # every route
node tools/acceptance.mjs select                     # the selected routes and why; runs nothing
node tools/acceptance.mjs run --all --dist <dir>     # a frozen build, as the design studio runs it
```

A change selects routes by what the app's build runs, read from its source maps: a changed file the
build bundles selects every route, a test, story or doc selects none, code of an app package the build
does not run selects none, and any other file of an app package (CSS, HTML, `public/`, a
`package.json`, a config) selects every route. A changed data file selects only the routes that open
it, and a change to this folder's code or a shared root input selects every route. Nothing runs
automatically: run it yourself on a branch that touches the app, and `--all` after a large change.
It exits 0 when every selected route passed (or none was selected), 1 when one failed, 4 when it
could not run (no build, no GPU). Each run keeps `selection.json` (what changed, which routes and
why), `report.json` and the end screens in the main checkout's `tmp/acceptance/runs/`.

The runner underneath walks the routes it is given:

```bash
pnpm exec nx run graphty:build                  # graphty/dist
node graphty/acceptance/run.mjs                 # every route, on up to 4 browsers
node graphty/acceptance/run.mjs --only t39a,t46 # routes whose id starts with one of these
node graphty/acceptance/run.mjs --workers 1     # one browser
node graphty/acceptance/run.mjs --list          # the routes and their checks; runs nothing
node graphty/acceptance/run.mjs --dist <dir>    # another build of the app
node graphty/acceptance/run.mjs --features cosmograph  # the app opened with an experiment on: tmp/dry-run-cosmograph/
```

`--features` opens the app with experiments on (`?features=...`). With `cosmograph` on, graphty-element draws
with its batched render path, so the same routes walk that path too.

`pnpm run check:quick --with-dry-run` runs the quick check, then builds the app and runs every route. When the
quick check would run whole test shards (a change to root files), `pnpm exec nx run graphty:build` then
`node graphty/acceptance/run.mjs` gets to the routes in minutes.
Nothing runs the dry run automatically: the agent that owns a long-lived branch runs it before opening
the pull request (the root CLAUDE.md, "Shipping a change", step 2, says when).

It prints one line per route as it finishes, then a table of every route's result and time, the
whole run's time and how much of it went to waiting for a browser. It exits 0 when every route
passed and 1 when one failed. `tmp/dry-run/report.json` holds the same results. For each failed
route the reason names the step or check that failed, and `tmp/dry-run/<route>.aria.txt` holds
what the page offered a user at that moment (its accessibility tree), which is usually enough to
see why a step found nothing to click. `tmp/dry-run/<route>.png` is the screen each route ended on,
passed or failed, and `<route>.ui.png` the same with what moves from run to run covered (the drawing,
the status bar); the design studio compares it with the previous pass's (`design/ui/studio/tool/REFERENCE.md`,
"The scripted dry run").

It runs only on this machine's GPU. Each browser checks that it draws with the NVIDIA card and the
route fails loudly if not: a software renderer is never used. The flags come from the design
studio's tool (`design/ui/studio/tool/real.mjs`, "Browsers"), with the extracted `libEGL.so.1` in
the main checkout's `tmp/egl/`. The run holds the machine's one GPU slot for its whole length
(`tools/test-slots.mjs --gpu`), and each browser takes one of the machine's four shared browser slots
(`design/ui/studio/tool/with-browser.sh`). The run takes its first browser slot before the GPU
slot, and its first browser uses it, so it never holds the GPU slot while it waits for a browser. A run
started while those are busy waits for them, and its report says how long.

A route takes 2 to 6 seconds once its browser is up. The routes are spread over the browsers as
each frees up.

## On both render paths

graphty-element draws a graph one of two ways: its default render path, one mesh per node and edge,
and the batched path, which draws every node and edge from tables on the GPU. The app switches to the
batched path only with its `cosmograph` experiment on (`?features=cosmograph`). The dry run, the canvas
test below and the selection workspace's test all take `--features` to open the app with experiments
on, and `compare-reports.mjs` puts two runs side by side: it prints each route or scenario whose result
differs, with both reasons, and exits 1 when one does. A route that passes on the default path and fails
on the batched one is a defect in graphty-element's batched path, fixed there.

```bash
node graphty/acceptance/run.mjs                          # tmp/dry-run/report.json
node graphty/acceptance/run.mjs --features cosmograph    # tmp/dry-run-cosmograph/report.json
node graphty/acceptance/compare-reports.mjs tmp/dry-run/report.json tmp/dry-run-cosmograph/report.json
```

`pnpm run check:quick --with-dry-run` does all of it: the routes both ways and compared, the canvas test
both ways, and the selection workspace's test both ways (in Chromium) and compared. With the app built,
the whole walk takes about ten minutes, most of it the selection workspace's matrix, so it runs before a
pull request that reaches the app or graphty-element's batched path, not on every one.

### Pointing at the canvas: `canvas-uat.mjs`

A route may only click and type (the guard below), so pointing at what the element drew has its own
test, `canvas-uat.mjs`. It walks the same build in the dry run's browser (on the
NVIDIA card, holding a browser slot and the GPU slot), moves and clicks the real mouse, and reads
graphty-element's public API in the page (`nodeScreenPosition`, `elementAt`, `session.selection`):

```bash
node graphty/acceptance/canvas-uat.mjs                          # the default render path: tmp/canvas-uat/
node graphty/acceptance/canvas-uat.mjs --features cosmograph    # the batched render path: tmp/canvas-uat-cosmograph/
node graphty/acceptance/canvas-uat.mjs --only c02               # scenarios whose id starts with this
node graphty/acceptance/compare-reports.mjs tmp/canvas-uat/report.json tmp/canvas-uat-cosmograph/report.json
```

- `c01-point-at-nodes-and-an-edge`: hovers and clicks Valjean, Javert and Fantine in Les Miserables,
  then an edge between its two nodes, and checks the hovered node and the selection after each.
- `c02-edges-follow-an-animating-layout`: in the karate club, changes the layout to Circle with a glide,
  and on every frame the nodes move checks that pointing between each edge's two drawn nodes finds that
  edge or a node, as a hover or click there would.
- `c03-edges-follow-a-running-force-layout`: the same while ForceAtlas2 runs.

`elementAt` measures a straight edge from its two nodes' drawn centers, so the last two check picking
during motion; a line drawn behind its moving nodes shows only in the canvas's pixels, which
graphty-element's own in-motion tests read. It takes about 20 seconds a path, keeps each scenario's last
screen beside its report, and exits 1 when a check failed.

## The selection workspace's acceptance test

`selection-workspace-uat.mjs` tests the selection workspace, one screen in depth, where a route walks
the whole app. It is separate from the dry run and runs against any served build, in Chromium and then
in Playwright's WebKit (Safari's engine) unless `--browser chromium` or `--browser webkit` picks one. Every pull request that affects the graphty app
runs it in both, one CI job per browser (`Selection workspace (chromium)` and `(webkit)`, report-only
for now):

```bash
tools/with-browser.sh node graphty/acceptance/selection-workspace-uat.mjs --dist graphty/dist          # serves the build itself
tools/with-browser.sh node graphty/acceptance/selection-workspace-uat.mjs --url "https://<host>:<port>/"
tools/with-browser.sh node graphty/acceptance/selection-workspace-uat.mjs --dist graphty/dist --browser webkit
tools/with-browser.sh node graphty/acceptance/selection-workspace-uat.mjs --url <url> --only m012,settings   # some scenarios, by id or words
node graphty/acceptance/selection-workspace-uat.mjs --list                                                   # the matrix, nothing run
tools/with-browser.sh node graphty/acceptance/selection-workspace-uat.mjs --dist graphty/dist --browser chromium \
    --features cosmograph --report tmp/sw-batched.json                                                       # on the batched render path
```

`--features` opens the app with experiments on (`cosmograph` draws with the batched render path), and
`--report <file>` writes every scenario's result as JSON, for `compare-reports.mjs` beside a run without.

It drives real clicks, drags and keys over a pairwise matrix of card kinds, verbs, starts, card shapes,
entry points, datasets, edits and ways of leaving, then named scenarios (a slider's exact ends, settings
then ticks, popovers closing on an outside click, order after a delete). What a selection should hold is
worked out from the graph and the runs' results, and compared with the title bar, the cards, the table,
the drawing and what is saved. The matrix's rows run as a reader who prefers reduced motion (the graph
is drawn once its layout settles, which is most of a row's CPU on a software GPU); the named scenarios
keep every transition. It prints a table of results, exits 1 when a scenario failed, and keeps a
failed scenario's screenshot under `--out` (default `tmp/selection-workspace-uat`).

## Every route ends with a reload

Once a route's checks pass, the runner reloads the page the way Safari brings back a background tab it
ended: it waits for graphty-element's autosave to keep the work, empties session storage and
`window.name`, reloads, and waits for the same screen. The screen is `screen-fingerprint.mjs`: open
dialogs, lists and named regions, pressed buttons, selected tabs, tree items and options, the current
item, expanded sections, and the values of the fields inside what is open. A menu or a picker's list held
open over the page is left out: a reload closes it as a click elsewhere does. Anything gone or changed fails
the route. The real-element tests' `reload()` (`src/test/reload.tsx`) reads the same fingerprint.

A route with a loss that cannot be fixed yet names it, with the open issue that tracks it:

```js
reloadLoses: [{ what: "expanded: Fill", issue: 1234 }],
```

The run refuses to start when such an issue is closed, so an excuse cannot outlive its bug.

The `reload-sweep` route (`reload-sweep.mjs`) needs no list at all: it opens a sample, adds a layer named
"test", then clicks every enabled control it finds by role (button, tab, tree item, menu item, option,
switch), and every control that click brought up, reloading after each. It fails once, listing every
control whose reload changed the screen. It never clicks a control whose name says it opens, closes,
deletes, saves, exports or undoes something.

## Adding a route

Add an object to the `routes` list in `routes.mjs`. A feature added to the app adds a route, and a
defect the design studio finds becomes one.

```js
{
    id: "t42a-number-at-or-over-orange",      // unique; --only matches its start
    feature: "Color the nodes at or over a number",
    from: "T42 A",                            // the study task it came from, or the issue
    async walk(u) {
        await openFile(u, "volunteers.graphml");
        await newLayer(u);
        await addCondition(u, "hours");
        await u.type("20");
        await u.key("Enter");
        await fill(u, "orange");
    },
    checks: {
        "exactly the 11 with 20 or more hours are orange": (g) =>
            onlyTheseColored(g, (n) => Number(n.hours) >= 20, "#FFA500", 11),
    },
},
```

### The user's hands: `u`

A walk does only what a user can do, from the start page: never a URL of its own, never a call
into the app or the element. The guard (below) holds walks and steps to that: it refuses one that
calls `evaluate`, `goto`, `route`, `addInitScript`, `exposeFunction`, `setContent`, `context` or
another way past the page's controls, computes a property name, reads `assert`, `routes` or
anything else a check uses, or writes to anything it did not declare itself.

| `u.`                     | What it does                                                                |
| ------------------------ | --------------------------------------------------------------------------- |
| `page`                   | Playwright's page, for `page.getByRole(role, { name })` and the like        |
| `click(name)`            | Clicks the button with exactly that accessible name (or a locator you pass) |
| `button(name)`           | The button with exactly that name, as a locator                             |
| `upload(control, file)`  | Clicks a control that opens the file chooser and picks a file in it         |
| `file(name)`             | The path of a data file in `design/ui/studio/tool/files/`                   |
| `type(text)`, `key(key)` | Types into what has focus; presses a key or chord (`Enter`, `Control+z`)    |

Name controls the way a screen reader hears them: `page.getByRole("treeitem", { name:
/^Everything,/ })`, `page.getByRole("option", { name: /^hours(,|$)/ })`. `routes.mjs` has steps many
routes share (`openSample`, `openFile`, `newLayer`, `addCondition`, `match`, `fill`, `analyze`,
`line`); use them, and add one when a second route needs the same steps. A step waits for its
control to appear, with no deadline but the repository's one hang guard (`tools/test-wait-guard.mjs`),
so a walk never waits on a clock. `openSample` and `openFile`
wait until the Everything layer counts the graph's nodes: the layer shows "0 nodes" before the data
arrives, and a walk that went on then acted on an empty graph.

### Reading the outcome: `g`

A check is a function of `g` that throws (with `assert`) when the outcome is wrong. It is retried
after every page frame until it passes, because the app reaches its state on its own time; only the
hang guard ends a check that never passes, and a route that hangs as a whole.

The looks the checks read are the style graphty-element resolved for each node and edge
(`session.styles.explain()`), not the pixels on the canvas. A defect where the style resolves
correctly and the drawing is still wrong is outside what the dry run can see.

| `g.`                 | What it reads                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `counts()`           | `{ nodes, edges }` of the open graph                                                                 |
| `nodeLook(channel)`  | Each node's drawn value: `"node.color"` (`"#RRGGBB"`), `"node.size"`, `"node.shape"`, `"node.label"` |
| `edgeLook(channel)`  | Each edge's drawn value: `"edge.color"`, `"edge.width"`                                              |
| `nodes()`, `edges()` | Every record: its `id` and its columns                                                               |
| `layers()`           | The style layers' names                                                                              |
| `selection()`        | `{ hovered, nodes, edges }`: the node under the pointer and what is selected, as ids                 |
| `recorded()`         | What the walk recorded in the page (`globalThis.acceptanceRecord`), for what happened mid-walk       |
| `page`               | The page, for what is on screen: `g.page.getByRole("group", { name: "Highest" })`                    |

The readers live in `readers.mjs`. Check the outcome itself, not that something happened: "exactly
these 8 nodes are blue and every other node keeps the starting color", not "a layer exists". A
check that would pass whatever the app did is no check.

## Changing a check

The author of a UI change may re-record a route's steps: its `walk`, and any function in
`routes.mjs` that only walks use. Everything that decides whether a route passes is protected:
every check, a route's other properties, the imports, top-level statements and every declaration of
`routes.mjs` a check uses (directly or through another), and all of `readers.mjs` and `run.mjs`. An
addition to any of the three files counts as a change when it runs on its own or reaches outside
itself: a new import, a new top-level statement, or new code that writes to something it did not
declare (`Object.assign(assert, ...)`, `routes.splice(1)`) or reaches `eval`, `globalThis` or a
dynamic `import()`. CI's Checks job runs
`pnpm run check:dry-run-checks`, which compares them, without comments or layout, with the merge
base with `origin/master`, and refuses a branch that removes or changes one. Adding routes, checks,
helpers and readers that keep to themselves is free. A walk or a step that goes past the user's
hands (above) is always refused.

When a check is wrong, change it on a branch of its own, from a different session than the change
it failed on, holding only that change: every file its commits change is under `graphty/acceptance/`,
and every commit says why in a trailer. Merge commits, such as a merge of `origin/master`, need no trailer, and commits already on `origin/master` are not counted.

```
fix(graphty): read a team's name from its label column

Dry-run-check-change: College football keeps team names in label, not name
```

`node tools/dry-run-check-guard.mjs --self-test` checks the guard itself.
