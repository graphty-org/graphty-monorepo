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

Build the app first, then run every route, or only some:

```bash
pnpm exec nx run graphty:build                         # graphty/dist
node graphty/dry-run/run.mjs                           # every route, on up to 4 browsers
node graphty/dry-run/run.mjs --only t39a,t46           # routes whose id starts with one of these
node graphty/dry-run/run.mjs --workers 1               # one browser
node graphty/dry-run/run.mjs --list                    # the routes and their checks; runs nothing
node graphty/dry-run/run.mjs --dist <dir>              # another build of the app
```

`pnpm run check:quick --with-dry-run` runs the quick check, then builds the app and runs every route.
Nothing runs the dry run automatically: the agent that owns a long-lived branch runs it before opening
the pull request (the root CLAUDE.md, "Shipping a change", step 2, says when).

It prints one line per route as it finishes, then a table of every route's result and time, the
whole run's time and how much of it went to waiting for a browser. It exits 0 when every route
passed and 1 when one failed. `tmp/dry-run/report.json` holds the same results. For each failed
route the reason names the step or check that failed, and `tmp/dry-run/<route>.aria.txt` holds
what the page offered a user at that moment (its accessibility tree), which is usually enough to
see why a step found nothing to click. `tmp/dry-run/<route>.png` is the screen each route ended on,
passed or failed, and `<route>.ui.png` the same with what moves from run to run covered (the drawing,
the status bar); the design studio compares it with the previous pass's (`design/ui/studio/tool/README.md`,
"The scripted dry run").

It runs only on this machine's GPU. Each browser checks that it draws with the NVIDIA card and the
route fails loudly if not: a software renderer is never used. The flags come from the design
studio's tool (`design/ui/studio/tool/real.mjs`, "Browsers"), with the extracted `libEGL.so.1` in
the main checkout's `tmp/egl/`. The run holds the machine's one GPU slot for its whole length
(`tools/test-slots.mjs --gpu`), and each browser takes one of the machine's four shared browser slots
(`design/ui/studio/tool/with-browser.sh`). A run started
while those are busy waits for them, and its report says how long.

A route takes 2 to 6 seconds once its browser is up. The routes are spread over the browsers as
each frees up.

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
control to appear (up to 20 seconds), so a walk never waits on a clock. `openSample` and `openFile`
wait until the Everything layer counts the graph's nodes: the layer shows "0 nodes" before the data
arrives, and a walk that went on then acted on an empty graph.

### Reading the outcome: `g`

A check is a function of `g` that throws (with `assert`) when the outcome is wrong. It is retried
every 250 ms until it passes or 15 seconds pass, because the app reaches its state on its own time.

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
it failed on, holding only that change: every file its commits change is under `graphty/dry-run/`,
and every commit says why in a trailer. Merge commits, such as a merge of `origin/master`, need no trailer, and commits already on `origin/master` are not counted.

```
fix(graphty): read a team's name from its label column

Dry-run-check-change: College football keeps team names in label, not name
```

`node tools/dry-run-check-guard.mjs --self-test` checks the guard itself.
