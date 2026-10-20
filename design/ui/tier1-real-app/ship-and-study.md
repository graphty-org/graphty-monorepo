# Shipping the tier 1 app to graphty.app, and studying it

This document answers two questions for the tier 1 build of the graphty app (a first-time
user's core path, from an empty app to a saved project):

1. How does the graphty app reach https://graphty.app today, and what has to change so it
   goes live only "after a successful build and release", as the owner asked?
2. How can the next round of the design study drive the real app instead of the clickable
   mock, with the same kinds of sessions (think-aloud with clicks, typing and keys; tree
   test; first click)?

Sources read: `.github/workflows/deploy-pages.yml`, `ci.yml`, `release.yml`,
`tools/assemble-pages-site.sh`, `graphty/vite.config.ts`, `graphty/src/App.tsx`,
`graphty/src/data/sampleManifest.ts`, the mock study tool
(`design/ui/prototype/app-b/study.mjs` on the design branch) and the study workflow
(`tmp/design-study-round-v3.js` on the design branch). The live site was probed with curl on
2026-10-02.

---

## 1. How the app reaches graphty.app

### What happens today after a merge to master

1. The merge commit is pushed to master. `ci.yml` runs on it.
2. CI's Build job runs `nx run-many -t build` with `VITE_BASE_PATH=/` and the Sentry
   variables, so `graphty/dist/` is a production build at the site root. The app depends on
   `@graphty/graphty-element` as `workspace:*`, so it is built against the element SOURCE at
   that commit, not against a version on npm.
3. CI uploads `graphty/dist/` as the artifact `build-graphty` (kept 1 day), beside every other
   package build, the five Storybooks, the unified docs and the algorithms and layout example
   pages (all kept 1 day).
4. When CI completes with success on master, two workflows start independently:
    - `deploy-pages.yml` downloads that CI run's artifacts, builds the graph-samples hosted
      datasets, runs `tools/assemble-pages-site.sh ./public` and deploys the whole site to
      GitHub Pages. `graphty/dist` becomes the site root (`/`); docs, Storybooks and data sit
      under `/docs/`, `/storybook/...` and `/data/graph-samples/v1/`.
    - `release.yml` starts its gate. It also starts on GPU and Hosts completions, and releases
      only the newest commit on which CI, the GPU lane (about 40 minutes, a T4) and Hosts (when
      it ran) are all green. It versions every project with nx release (the app is
      `"private": true`, so it gets a version and a changelog but is never published to npm),
      lands a `chore(release): publish ... [skip ci]` commit on master and publishes the public
      packages.
5. The release commit carries `[skip ci]`, so it never triggers CI or a deploy.

So today the app goes live about when CI finishes, before the GPU lane and before the
release. Nothing ties the deploy to the release: a commit whose GPU lane later fails, and
which the release therefore passes over, is still what graphty.app serves.

### What "after a successful build and release" requires

The deploy has to move behind the release, and deploy exactly the commit the release
released:

- **Run the deploy as a job of `release.yml`**, after the `release` job
  (`needs: [gate, release]`), downloading every artifact from `needs.gate.outputs.ci_run_id`.
  The gate already computes that run id, and the CI artifacts of that run are the build of
  the released tree. The cleanest shape is to turn `deploy-pages.yml` into a reusable
  workflow (`on: workflow_call` with a `run-id` input) and call it from `release.yml`;
  drop its `workflow_run: CI` trigger. The calling job needs `pages: write`,
  `id-token: write` and `actions: read`.
- **Extend the gate's artifact check.** `artifacts_ok` in `release.yml` checks only the
  `build-<package>` artifacts. The deploy also needs `build-storybook-element`,
  `build-storybook-app`, `build-storybook-compact-mantine`, `build-storybook-algorithms`,
  `build-storybook-layout`, `build-docs`, `build-ghpages-algorithms`, `build-ghpages-layout`
  and `build-graph-format`. All are kept 1 day, like the package builds, so the same check
  covers them; without it a late release would fail in the deploy with "Artifact not found".
- **Accept the consequence for docs and Storybooks.** GitHub Pages publishes one artifact
  for the whole site, so the docs and Storybooks move behind the release too (about 40 to 60
  minutes after a merge instead of about 15). Deploying the app alone is not possible on one
  Pages site.
- **Check the `github-pages` environment rules** allow a deployment from a `workflow_run`
  job on master (they allow `deploy-pages.yml` today, which is the same event and branch).
- **Decide what a release with nothing to version does.** When the gate finds a green commit
  but nx release has no version bump to make (for example a commit that only changed CI),
  the release job should still succeed and the deploy should still run; confirm this on the
  first such commit.

### Gaps in the app itself (none blocks tier 1)

- **Base path: fine at the root.** CI builds with `VITE_BASE_PATH=/` and the app is served at
  `/`. The sample files are fetched as site-root paths (`/samples/karate.gml`,
  `/samples/football.gml` in `sampleManifest.ts`, served from `graphty/public/samples/`),
  which ignore Vite's `base`. That works at graphty.app and breaks only if the app is ever
  served under a sub-path (a pull-request preview, a second copy for a study). Building the
  URL from `import.meta.env.BASE_URL` closes it for free; do it when tier 1 touches the
  sample picker.
- **404 route: not needed while state stays in the query or the hash.** The app routes only
  by query parameters (`?demo`, `?test`), so every URL is `/` and Pages serves
  `index.html`. If tier 1 adds path routes (`/project/...`), the assemble script must also
  write `404.html` as a copy of the app's `index.html`, or a reload on such a URL is a
  GitHub 404. Recommendation: keep any URL state in query parameters.
- **Sample data hosting: covered.** The tier 1 samples ship in the app bundle
  (`/samples/*.gml`, both return 200 on graphty.app today). Larger datasets are published by
  the same deploy at `/data/graph-samples/v1/` (200 today), and graph-samples'
  `fetchDataset()` reads them from that absolute URL.
- **No build stamp.** Nothing on the deployed page says which commit it is. A study needs to
  record the exact build each session saw, and a bug report needs it too. A build-time
  constant (the commit SHA and the app version) in a `<meta name="graphty-build">` tag, shown
  in the app's About or Help, is enough.
- **Telemetry.** The production build sends errors to Sentry (`graphty/src/lib/sentry.ts`).
  Study sessions against graphty.app would land there among real users' errors; run studies
  against a local build without `VITE_SENTRY_DSN`, or tag study traffic.

---

## 2. Driving the real app in a user study

### What carries over unchanged

The study workflow's method does not depend on the mock: personas, the tier 1 and tier 2
coverage keys, the wording rule (no UI words in prompts), the success targets, graders who
alone hold the success definition, skeptic verification of insights, focus groups and the
browser-slot gate (`kit/with-browser.sh`, four browsers at once). The tree test is a text
outline and does not touch the app at all. What changes is the tool the participants and
pilots act through, and how a task names where it starts.

### What has to change

A new tool beside `study.mjs` (call it `real.mjs`), with the same participant-facing steps
(`--click`, `--rclick`, `--dblclick`, `--shift-click`, `--ctrl-click`, `--alt-click`,
`--hover`, `--hover-at`, `--hover-icon`, `--key`, `--type`, `--wait`, `--expect`,
`--expect-not`), so session prompts barely change. The mock-only modes (`--list`,
`--check`, `--matrix`, `--counts`, `--fixes`, `--fresh`) have no real-app meaning and are
dropped; their job (proving the path works before sessions) moves to the app's own
end-to-end tests and to the pilot walks.

**1. What it serves.** The mock tool serves files from a throwaway loopback server. The real
tool should do the same with a production build of the exact commit under study
(`graphty/dist/` from `nx run graphty:build`, Sentry variables unset), served at `/` so
`/samples/*.gml` resolve. Record the commit SHA in every session transcript.
Studying graphty.app directly is possible (`--base https://graphty.app/`) but a deploy
during a round would change the app under half the participants, so use it only for a
smoke check that the deployed build matches the studied one.

**2. Knowing the page is ready.** The mock waits for `window.AB`. The real app is ready when
`graphty-element` is defined and the shell has rendered; after a load or any step that
changes the drawing, the tool awaits the element's `waitForStableFrame({ timeoutMs })`
(it resolves once the layout has converged and the camera has finished framing). A step
that leaves the layout still running is a real state, not an error: print "the drawing is
still moving" and continue.

**3. Live sessions, not replays.** Each mock `--try` restarts from the start screen and
replays every step. That cannot work on the real app: most graphty-element layouts default
to `seed: null`, so a replay puts the nodes somewhere else and a click aimed from the
previous screenshot misses; replays also re-run analyses and layouts, which take seconds
each. The tool should hold one live browser per session:
`real.mjs --start <session dir> task:<id>` launches Chromium with a remote-debugging port
inside a browser slot and saves `01.png`; each `real.mjs --step <session dir> <steps...>`
connects to it (`chromium.connectOverCDP`), acts, waits as above and saves the next PNG;
`--end` closes it and releases the slot. The slot is held for the whole session, so at four
slots about 150 sessions of about six minutes take about four hours; raise
`BROWSER_SLOTS` only after measuring one real-app browser's memory.

**4. How a task names its start.** The mock names a start state as a route
(`app-b/#/graph-place/at-rest`). The real app has no such routes, and it should not grow
study-only ones. A task's start is instead:

- `empty` -- the app at `/` with clean storage. Every tier 1 task starts here, as the owner
  decided ("tested from an empty app").
- `setup` -- a list of the same steps a participant can take, run before `01.png` and never
  shown to the participant (for example: open the sample "Karate Club", run PageRank). This
  covers every mid-path start of a tier 2 task with no app change, and it fails loudly when a
  setup step stops working, which is itself a finding.
- `project` -- a saved project file, opened through the app's own Open project control in a
  setup step. Once tier 1 save and reopen exist, this is how a task starts on a prepared
  state, and it exercises the real reopen path.
  A URL parameter such as `?sample=karate` is optional convenience, not required by the study;
  if added, it is app chrome (pick a sample from the manifest and hand its URL to the element)
  and must load through the same path as the picker.

Each browser context starts with empty localStorage and IndexedDB, so nothing from one
session leaks into the next (the mock cleared its own keys; a fresh context does this for
the real app). First-launch moments (the usage-data opt-in, the empty start screen) then
appear in every session, which is what tier 1 wants.

**5. Finding controls.** The mock's `find()` (accessible role and name, then label, then
text; `name#n`; `role=<role>:<name>`; "ambiguous" warnings) works on the real DOM as is,
with two edits: tooltips are Mantine's (`[role=tooltip]`) instead of `.ab-tip`, and the
icon-only list (`--hover-icon`) reads controls with an `aria-label` and no text instead of
`[data-tip]`. Exclude the element's canvas from text matching.

**6. Acting on canvas nodes.** The mock clicks a node by the label drawn on its picture. In
the real app the canvas is Babylon.js; nothing on it is in the DOM. Two steps:

- `--click-at x,y` (and `--rclick-at`, `--dblclick-at`, `--hover-at`): the participant names
  a point on the last screenshot, as a person points. This works for every node, labeled or
  not, and is the general mechanism.
- `--click "<node name>"` falls back, when no control has that name, to a node whose label is
  drawn and visible on screen, clicked at its center, as the mock does. Today this needs the
  element's `getNodes()`, `node.mesh.position` and `worldToScreen()`, plus the canvas offset
  and device pixel ratio, because `worldToScreen` returns render pixels relative to the
  canvas. Reaching into `node.mesh` is a Babylon internal; see the element issue below.
- `--drag x1,y1 x2,y2` and `--wheel x,y,delta` for pan, zoom and moving a node, which a
  "make the drawing readable" task needs.

**7. Files in and out.** Tier 1 has four file moments the mock only pictured:

- Bringing in your own file: `--upload <file>` answers the next file chooser
  (`page.waitForEvent('filechooser')` then `setFiles`), and `--drop <file>` drops it on the
  app. The study keeps a small set of participant files (a links spreadsheet as CSV, a GML,
  a file that will not read), each named in the task's materials.
- Saving a picture, sending numbers to a spreadsheet, saving the project: the context runs
  with `acceptDownloads: true`; every download is saved into the session folder and printed
  ("a file was saved: karate.png, 1920 x 1080"), so the participant knows it happened and the
  grader can open it.
- Reopening the project: the participant `--upload`s the file they saved earlier in the same
  session.

**8. What a session prints.** As in the mock: the PNG path, the tooltip on hover, misses
("nothing on screen is called ..."), ambiguity, script errors and failed requests. Add:
downloads, the drawing still moving, and any `console.error`, which in the real app is a
real defect worth a bug report.

**9. Pilot walks.** The workflow's pilot (walk every task's success path through the tool
before sessions run) becomes more important, not less: it is the only check that the real
app still lets a participant reach each end state. A task's success path is no longer a list
of routes; it is a list of steps plus what must be on screen at the end (`--expect`), which
the grader also uses.

**10. Grading.** Graders compare what ended on screen, and the files the participant saved,
with the success definition. There are no route renders of the success path; the pilot's
screenshots stand in for them.

**11. Tree test and first click.** The tree test is unchanged: an outline written from the
real app's navigation (rail, menus, toolbar tooltip names, inspector tabs). An accessibility
snapshot of the real DOM (`page.accessibility` or Playwright's aria snapshot) gives a
starting outline to edit. A first-click screen is a screenshot of the real app in a start
state (empty, or a setup list), graded by the control under the named point.

**12. Prompts in the workflow.** Replace "node app-b/study.mjs --try ... task:<id>" with
the start/step/end commands, tell participants they may point at the screenshot with
`--click-at`, and keep the off-limits rule (participants never read the app's source, the
task file or other sessions).

### graphty-element issues this exposes

These come from what the study tool needs; each is something any consumer would need too
(an app tooltip, a screenshot tool, an accessible node list), so it belongs in the element.

- **Screen position of a node, in CSS pixels, with visibility.** Today a consumer must read
  `node.mesh.position` (a Babylon internal) and convert `worldToScreen`'s render pixels by
  the device pixel ratio and the canvas offset. Wanted: `element.getNodeScreenPosition(id)`
  returning CSS pixels relative to the element, and whether the node is on screen and not
  covered.
- **The node under a point.** Wanted: `element.nodeAt(x, y)` (and `edgeAt`), so a click at a
  point can be told what it hit without simulating input.
- **A node's displayed label text.** The label is computed from style layers inside
  `Node.ts` and is not readable; finding a node by what the reader sees needs it.
- **An accessible representation of the graph.** Nothing on the canvas is reachable by a
  screen reader; a tier 1 study includes a screen-reader persona, and that persona cannot
  find a node by name at all today.
- **Deterministic default layout.** With `seed: null` by default, the same file draws
  differently on each load; a seeded default (overridable) would make screenshots, bug
  reports and study replays reproducible.

### Checklist before the first real-app round

- [ ] Deploy runs from `release.yml` after the release, on the gate's CI run, with the
      artifact check extended.
- [ ] Build stamp in the page; study transcripts record it.
- [ ] `real.mjs` with live sessions, `empty` / `setup` / `project` starts, `--click-at`,
      `--drag`, `--wheel`, `--upload`, `--drop`, downloads saved and printed.
- [ ] Participant files: a links spreadsheet (CSV), a GML file, a file that will not read.
- [ ] Every tier 1 task piloted end to end on the exact build under study.
- [ ] Element issues above filed at high priority.
