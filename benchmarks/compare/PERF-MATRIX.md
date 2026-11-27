# Performance matrix of graphty-element's two render paths

`perf-matrix.mjs` times graphty-element on both render paths, `"objects"` (the default) and `"batched"`, across graph
sizes, layouts and style properties, and fails when a change makes a metric worse than the committed baseline
(`perf-baseline.json`). It drives the same bench page and runner as the cosmos.gl comparison (`RUNBOOK.md`): build
the page and start it through servherd as sections 1 and 2 there say, then export `BENCH_URL`.

## The axes

`node perf-matrix.mjs list` prints every scenario; `--gate-set` only the ones the gate runs.

- **Sizes** (`size-*`), with edges at ten per node: 100, 1k, 10k and 50k nodes, in two looks, `plain` (the
  element's own node look and plain edges) and `default` (the element's defaults, arrowheads included); 100k nodes
  with 1M edges and 1M nodes with 1M edges, plain only.
- **Styles** (`style-*`), on the plain look, one at a time at 1k and 10k nodes: node color, size, shape, border,
  opacity, label and image; edge color, width, opacity, arrowhead, dash and curve; a hover layer; one node selected
  (the default Selected layer); one node pinned (the default Pinned layer). At 50k: node color, border and label,
  arrowheads and curves. The node label restyle again at 10k and 50k with `layoutBehavior.labels.labelText:
"glyphs"` (`style-node-label-glyphs-*`), every label drawn from one shared atlas instead of its own texture. At 100k + 1M: node color and curves; at 1M + 1M: node color.
- **Layouts** (`layout-*`), at 10k nodes, in 2D and 3D: the GPU force layout (`ngraph` with acceleration on), the
  CPU force layouts (`ngraph-cpu`, `d3`), `forceatlas2`, `circular`, `grid`, `random`, and `circular-glide`
  (circular reached through the glide layout transition). The GPU force layout also at 100k + 1M. Every other
  scenario uses fixed positions.

Left out at the large sizes, because they stress nothing the smaller sizes miss or cannot finish: the default
look (every arrowed edge is an object on both paths, which at a million edges does not finish in ten minutes),
every style but node color and curves, and every layout but the GPU force layout. At 1M nodes the batched runs ask
for a node ceiling of 1M (`limits.renderCeiling`), which the batched path honors; objects keeps the shipped
100k-node ceiling whatever is asked, so its 1M rows record the refusal. Labels at 100k nodes can end the
browser (RUNBOOK.md) and are measured at 50k instead.

## The metrics

One row per run, one fresh browser per run. The report shows each metric's median over the runs of a scenario and
path; the gate compares best runs.

| Metric                       | What it is                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `firstFrameMs`               | From handing over the data to the first frame that holds every node and edge                      |
| `readyMs`                    | From handing over the data to the first stable frame                                              |
| `restyleMs`                  | From the style call (or the select or pin) to the stable frame that shows it                      |
| `stillMs`                    | A still frame, each followed by a one-pixel readback (CPU and GPU time)                           |
| `orbitMs`                    | A frame while the camera moves                                                                    |
| `dragMs`                     | A frame while one node moves                                                                      |
| `hoverMs`                    | From a real pointer move onto a node to the element's hover event                                 |
| `editMs`                     | One node's values changed (`session.data.updateNodes`) to the stable frame                        |
| `layoutStartMs`              | From `setLayout` to the first landing of a simulation, or to the stable frame of a placing layout |
| `layoutFrameMs`              | A frame while a simulation runs                                                                   |
| `landingMs`                  | The time between two GPU layout batches landing (on the CPU, a frame)                             |
| `heapMB`                     | The page's JavaScript heap after a forced collection                                              |
| `objectNodes`, `objectEdges` | Batched only: rows drawn as objects after the load and the style. Counted, not timed              |

## Running it

Every run holds the machine's GPU lock (`tmp/cosmos-impl/gpu-bench.lock` in the main checkout, `PERF_LOCK`) and
starts only once the one-minute load average is at most 12 (`PERF_MAX_LOAD`). Never wrap it in
`tools/low-priority.sh`: niceness would skew the timing.

`PERF_WRAP` names a command prefix that each run goes through instead of the load wait, inside its browser slot,
so it covers the timed run and nothing else. On this machine it gives each run reserved CPU cores for exactly its
length (`PERF_WRAP="<main checkout>/tmp/bench-cores/bench-cores.sh run"`). Each row records the CPUs it ran on
(`cpus`), and the gate fails a scenario whose CPUs differ from its baseline's: numbers taken on reserved cores and
on the shared machine are not comparable.

    node perf-matrix.mjs run ../results/<label>/matrix.jsonl                     # the whole matrix, once
    node perf-matrix.mjs run ../results/<label>/gate.jsonl --gate-set --reps 3   # the gate's scenarios
    node perf-matrix.mjs run <file> --only '^style-node' --paths batched          # a part of it

`node perf-matrix.mjs report <file>` prints the results as a Markdown table.

## The gate

    node perf-matrix.mjs gate ../results/<label>/gate.jsonl

It fails (exit 1) when:

- a timed metric's best run (the fastest of the results' runs) is slower than the baseline's best run by more than
  30% (`PERF_MARGIN`) plus the metric's slack (0.3 ms for a frame, a landing or a hover, 5 ms for a load, restyle,
  edit or layout start, 2 MB of heap),
- a counted metric is higher at all,
- a metric the baseline has is missing, or a run failed where the baseline's did not,
- a gate-set scenario the baseline has is missing from the results on either path, or has fewer than three runs
  there: a run that crashed, died before writing its row, or landed on another renderer (a void row) fails the gate
  instead of dropping out of it.

Run the gate on three runs of the gate set, as above. The best run is what is compared because noise only ever adds
time: on reserved cores the median of one scenario moved by up to 2.9x between two sessions of the same commit, and
the best of three by at most 1.26x. The margin sits just above that, so the same commit passes, and the slack only
covers the timer's resolution at small values. Measured on two sessions' runs of the same commit, the gate fails a
sustained slowdown of 2x on every timed metric of the gate set, of 1.5x on 229 of 252 and of 1.4x on 217; a
slowdown of 1.3x or less is within the noise and is not reliably caught.

When a change makes things faster, or the machine changes, write a new baseline from three runs of the gate set and
commit it with the change: `node perf-matrix.mjs baseline <file>` (it replaces the entries the file has and keeps the
others).

The gate runs only on this machine: it needs the RTX 4070 SUPER (a run on any other renderer is void), and CI has no
GPU runner. The counted half runs everywhere: `graphty-element/test/browser/fast-path-counts.test.ts` checks the same
styles, actions and layouts for the rows they leave off the batched fast path, in the `browser` and `forced-batched`
test projects. `node --test perf-matrix.test.mjs` checks the gate itself and what each run is handed, with no GPU.
