# Re-measuring a build against cosmos.gl

Measures one build of graphty-element against cosmos.gl 3.5.1 with the same harness as the baseline in
`benchmarks/results/baseline/`. Everything below is run from `benchmarks/compare/` unless it says otherwise.

This directory is a standalone package with its own lockfile, outside the pnpm workspace, so cosmos.gl never
reaches a published package. Install it once with `pnpm install --frozen-lockfile`.

| Variable                     | Meaning                                                                                                                                                                                                                                       | Default                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `BENCH_URL`, `BENCH_RESULTS` | The page, and the file a run appends its row to                                                                                                                                                                                               | Required                                                     |
| `BENCH_RENDER_PATH`          | graphty-element's `renderPath` option, recorded in the row as `renderPath`. A build without the option ends the run with a failure instead of measuring its default path                                                                      | Unset: the element's default                                 |
| `BENCH_LIMITS`               | JSON for graphty-element's `limits` option, e.g. `{"renderCeiling":2000000,"edgesDrawn":2000000}`; it applies only under `BENCH_RENDER_PATH=batched`. Recorded in the row as `limits`. A build without the option ends the run with a failure | Unset: the shipped limits                                    |
| `BENCH_RENDERER`             | graphty-element's `renderer` option, recorded in the row as `rendererRequest`                                                                                                                                                                 | Unset: WebGL                                                 |
| `BENCH_ANTIALIAS`            | `false` sets graphty-element's `antialias` to false, before any other option; recorded in the row as `antialias`. A build without the option ends the run with a failure                                                                      | Unset: the element's default (true)                          |
| `BENCH_TOOLS`                | The checkout whose Playwright and `tools/with-browser.sh` run the browser                                                                                                                                                                     | This checkout                                                |
| `BENCH_EGL`                  | The directory of the extracted libEGL                                                                                                                                                                                                         | `tmp/egl/root/usr/lib/x86_64-linux-gnu` in the main checkout |
| `BENCH_DEADLINE_S`           | Seconds before a run ends as `did not finish`                                                                                                                                                                                                 | 570                                                          |

The baseline ran in Chromium 143. To compare with it, run every build in that browser by pointing `BENCH_TOOLS`
at a checkout of the commit it was measured on, from the repository root:

    git worktree add --detach .worktrees/cosmos-bench-baseline 7a09c31e59
    (cd .worktrees/cosmos-bench-baseline && pnpm install --frozen-lockfile)
    export BENCH_TOOLS=$PWD/.worktrees/cosmos-bench-baseline

## 1. Name the build and build it

`LABEL` names the results directory, `SRC` is the checkout to measure. A checkout with uncommitted tracked
changes is recorded as dirty in every row, so commit first.

    LABEL=my-branch
    SRC=<absolute path of the checkout>
    git -C "$SRC" status --short --untracked-files=no
    (cd "$SRC" && pnpm install --frozen-lockfile && tools/low-priority.sh pnpm exec nx run graphty-element:build --skip-nx-cache)
    BENCH_LABEL=$LABEL BENCH_SOURCE=$SRC pnpm exec vite build

The page lands in `builds/$LABEL/` with the commit, source directory name and dist build time baked in. To
measure a commit of master, first run `git worktree add --detach .worktrees/<name> <commit>`.

## 2. Start the page through servherd

Call the servherd MCP tool `servherd_start`, never a shell:

    name:     cosmos-bench-<LABEL>
    cwd:      <this checkout>/benchmarks/compare
    protocol: https
    command:  env BENCH_LABEL=<LABEL> HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} pnpm exec vite preview --port {{port}} --host {{hostname}} --strictPort

It answers with a URL. Then, in every Bash call below:

    export BENCH_URL=<that url> BENCH_RESULTS=$PWD/../results/$LABEL/results.jsonl
    mkdir -p ../results/$LABEL

To measure a render path, also export `BENCH_RENDER_PATH=batched` (or `objects`), and give each path its own
`LABEL`: `summarize.mjs` pools the rows of a file, whatever their path. Under `batched` a graphty run records
`rowCounts` after the load (and `rowCounts-drag` after the drag) and fails if any node is not on a batch.

## 3. Measure

One browser at a time and no other GPU work, so never two of these in parallel. Each line is its own foreground
Bash call with the tool timeout at 600000. No limit below may be raised: a run that cannot finish is a recorded
result (`did not finish in 10 minutes`), and the row keeps every stage it reached.

`run.mjs` voids a run, and marks the row, unless the WebGL renderer names the RTX 4070 SUPER. It sets
`LD_LIBRARY_PATH` to `BENCH_EGL` and `FC_FONTATIONS=1` itself. Do not wrap it in
`tools/low-priority.sh`: niceness would skew the timing.

Short configurations, three runs in one call, 190 s for each run:

    BENCH_DEADLINE_S=190 ./matrix.sh cosmos-s 3
    BENCH_DEADLINE_S=190 ./matrix.sh cosmos-m 3
    BENCH_DEADLINE_S=190 ./matrix.sh cosmos-l 3
    BENCH_DEADLINE_S=190 ./matrix.sh cosmos-s-dpr2 3
    BENCH_DEADLINE_S=190 ./matrix.sh cosmos-m-dpr2 3
    BENCH_DEADLINE_S=190 ./matrix.sh cosmos-l-dpr2 3
    BENCH_DEADLINE_S=190 ./matrix.sh lean-s 3
    BENCH_DEADLINE_S=190 ./matrix.sh default-s 3
    BENCH_DEADLINE_S=190 ./matrix.sh lean-s-dpr2 3
    BENCH_DEADLINE_S=190 ./matrix.sh default-s-dpr2 3
    BENCH_DEADLINE_S=190 ./matrix.sh lean-s-labels 3
    BENCH_DEADLINE_S=190 ./matrix.sh lean-s-cpu 3
    BENCH_DEADLINE_S=190 ./matrix.sh default-s-cpu 3
    BENCH_DEADLINE_S=60  ./matrix.sh lean-l 3

If a line above reports `did not finish in 190 s`, run that key again as a long configuration; 190 s is a guard
to fit three runs in a call, not the limit.

Long configurations, one run per call, three calls each, default limit of 570 s. Fewer calls are fine only if a
build gets fast enough that `reps` runs fit inside ten minutes, with `BENCH_DEADLINE_S` set to share them out:

    ./matrix.sh lean-m
    ./matrix.sh default-m
    ./matrix.sh lean-m-dpr2
    ./matrix.sh default-m-dpr2
    ./matrix.sh lean-m-labels
    ./matrix.sh lean-m-cpu

If a long run ends with `did not finish`, its later stages are missing. Run the matching `-tail` key three times
(`lean-m-tail`, `default-m-tail`, `lean-m-dpr2-tail`, `default-m-dpr2-tail`). It is the same run without the
still-frame stage, and `summarize.mjs` pools rows per measure, so a measure reaches three runs. The baseline
needed `lean-m-tail` three times and `lean-m-dpr2-tail` twice.

To see where a frame's CPU goes, set `BENCH_PROFILE=<path prefix>`: the run also profiles 60 still and 60 moving
frames, outside the timed stages, into `<prefix>-still.cpuprofile` and `<prefix>-orbit.cpuprofile`.

The curve target (100,000 curved edges moving) is `lean-s-curves`: 10,000 boxes and 100,000 curves with no caps,
in 3D. Under `batched` it also fails if any edge is an object edge. Run it once per render path, interleaved:

    BENCH_DEADLINE_S=190 ./matrix.sh lean-s-curves 3

The frame floor, where a frame measures the loop's pacing rather than drawing, is `lean-10-few` (10 nodes, 10
edges) beside `lean-s-few` and `lean-m-few`:

    BENCH_DEADLINE_S=190 ./matrix.sh lean-10-few 3

`./matrix.sh list` prints every key. To see why a browser died, run the configuration once with
`DEBUG=pw:browser` and without the `grep` of `matrix.sh`:

    DEBUG=pw:browser "${BENCH_TOOLS:-../..}/tools/with-browser.sh" node run.mjs graphty lean on 100000 1000000 1 skip-layout labels > ../../tmp/labels.log 2>&1

## 4. Summarize and stop

    node summarize.mjs ../results/$LABEL/results.jsonl > ../results/$LABEL/summary.md
    ../../node_modules/.bin/prettier --write ../results/$LABEL/summary.md

Check the header of `summary.md`: one commit, working tree clean, the render path you asked for, the RTX
renderer, 0 void rows. Its last section
compares with section 8.3 of the research document. For a before-and-after, compare with the same tables in
`../results/baseline/summary.md` instead, and read that file's Notes first.

Then call `servherd_stop` with the name `cosmos-bench-<LABEL>`.

## What a row holds

`results.jsonl` has one line per run: `sha`, `source`, `dirty`, `renderPath` (absent when unset), `renderer`, `flags`, `loadavgBefore`, `loadavgAfter` (the one-minute load average as the row was written), `floor` (the
cost of the measurement itself), `load`, `canvas`, `still`, `gpuFrame` (the GPU time of 60 still frames from `EXT_disjoint_timer_query_webgl2`, null without the extension and for cosmos.gl; a serial still frame below it means the stamps ran early), `orbit` (the moving frame), `drag` (a frame with one node moved, null for cosmos.gl), `memory`, `hover`,
`layoutFps`, `layoutSteps` (on the accelerated path also `publish`, one `publishPositions()`, `stepUndrawn`, the step with the frame loop stopped, and `repackUpload`, one row table repack and upload finished on the card, with `rowsCopied`, the fewest rows a timed flush really changed, which should be close to `rows`), and `failure` when it ended early. The order of the stages is fixed: still, moving, drag,
memory, hover, layout. Hover comes before the layout so both libraries hover the same scene.

Screenshots of the last run of each configuration are in `../results/<label>/shots/`, which git ignores.
