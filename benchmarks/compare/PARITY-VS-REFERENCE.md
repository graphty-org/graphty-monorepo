# Checking a build against the one from before the renderer optimizations

`parity-vs-reference.mjs` compares graphty-element at a commit (by default `origin/master`) with commit
`57c0ee700e`, the build from before the row renderer (`renderPath: "batched"`) and the frame-cost work. Those
changes also rewrote code the default `objects` path runs every frame (UpdateManager, DataManager,
LayoutManager, Edge, Node, style painting, the layout engines). A test that compares the two render paths of
one build cannot see a regression they share; this script compares with the old build instead.

It is run by hand before a release, never in CI: it builds two checkouts, captures every story twice, and
holds the machine's GPU lock while it reads frames. Each stage writes its findings to `summary.json` in its
own directory and exits 1 when it found something to review.

## Run it

From `benchmarks/compare/`. Output goes to `REFDIFF_OUT` (default `<main checkout>/tmp/parity/refdiff`).

1. Build both. `--head-checkout <dir>` uses a checkout you already built (a worktree of your branch)
   instead of a scratch worktree of `origin/master`. The reference gets a detached scratch worktree in
   `REFDIFF_OUT/ref`.

        node parity-vs-reference.mjs build [--head-checkout <dir>]

2. Serve the two benchmark pages through servherd, as in `RUNBOOK.md` section 2, with
   `BENCH_LABEL=refdiff-ref` and `BENCH_LABEL=refdiff-head`, and export their URLs as `REFDIFF_REF_URL` and
   `REFDIFF_HEAD_URL`.

3. Run the stages, each as its own call (they take 5 to 40 minutes):

        node parity-vs-reference.mjs pictures [--stories <prefix,...>] [--with-baselines]
        node parity-vs-reference.mjs behavior [<test file> ...]
        node parity-vs-reference.mjs loosened [--only <regex>]
        node parity-vs-reference.mjs frames [--only <regex>] [--frames <k>]
        node parity-vs-reference.mjs report > report.md

4. Stop the two servers.

The script's own logic has checks that need no browser: `node --test parity-vs-reference.test.mjs`.

## What each stage checks

**pictures.** Builds both Storybooks and captures every story of each with HEAD's
`visual-review` capture tool on this machine (SwiftShader, 1200 x 900 at scale 2, each story shot twice), then
compares the two captures. A story whose picture differs while its stories file is the same at both commits is
a regression candidate; one whose stories file changed is listed apart; a story unstable within one build
(its two shots differ) says nothing. The reference's committed baselines are not the oracle: they were made by
CI's capture, and a local capture differs from them, and from HEAD's own baselines, in most stories whatever
the build. `--with-baselines` still compares HEAD's capture with them (`pictures/vs-baselines`), for reading.

**behavior.** Runs the same test files on both builds and diffs each test's outcome: HEAD's versions of the
files (and its test helpers) are copied over the reference checkout, run there under the `browser` and
`interactions` projects, and put back. On HEAD they run under the same projects and under `forced-batched`.
A test that passes on the reference and fails on HEAD is a regression. A file that needs an API the reference
lacks fails to load there and shows as "pass on HEAD only". With no files named it runs the tests of the
reported risks (edges during transitions, hover and click, `elementAt`, pointer on rows), and the suite files
of the parity plan once they land (`BEHAVIOR_FILES`).

**loosened.** Every test file under `test/browser` and `test/interactions` that HEAD changed since the
reference and whose change removed an assertion line runs in its reference version on HEAD, beside HEAD's
version under the name `<name>.refcopy.test.ts` (deleted afterwards), on objects and on forced-batched. Tests of
AI commands, screenshots, video and the export list are left out. A failure is either an assertion that was
loosened to let a regression through, or an intended change in behavior: read it against HEAD's version.

**frames.** Edges following their nodes while a layout runs, read from the drawn frames, at the performance
matrix's layout sizes (1,000 to 100,000 nodes), on the reference and on HEAD's two paths. The benchmark
page's `frame-check` mode (`run.mjs ... frame-check`) gives 200 nodes and 200 edges marker colors, starts the
layout, and reads every drawn frame inside the frame. For each marker edge that moved at least 5 px across its
own line within the last 30 drawn frames it records whether the marker is at the midpoint of its two ends in
this frame (`nodeScreenPosition`), or at its midpoint in that earlier frame. An edge that follows its nodes is
found on this frame's midpoint far more often than on the old one; an edge left behind is not. The verdict
compares that margin with the reference's, so it does not depend on how crowded the picture is. Node marker
ink at the reported center is checked too. WebGL only.

## Reading a result

`report` prints every stage as Markdown. Each finding is a defect to fix (an `objects` regression goes back
to its behavior at `57c0ee700e`; a batched one is fixed under `renderPath: "batched"`), or an intended change
to record, never a test to loosen.
