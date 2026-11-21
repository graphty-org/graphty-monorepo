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
  arrowheads and curves. At 100k + 1M: node color and curves; at 1M + 1M: node color.
- **Layouts** (`layout-*`), at 10k nodes, in 2D and 3D: the GPU force layout (`ngraph` with acceleration on), the
  CPU force layouts (`ngraph-cpu`, `d3`), `forceatlas2`, `circular`, `grid`, `random`, and `circular-glide`
  (circular reached through the glide layout transition). The GPU force layout also at 100k + 1M. Every other
  scenario uses fixed positions.

Left out at the large sizes, because they stress nothing the smaller sizes miss or cannot finish: the default
look (every arrowed edge is an object on both paths, which at a million edges does not finish in ten minutes),
every style but node color and curves, and every layout but the GPU force layout. Labels at 100k nodes can end the
browser (RUNBOOK.md) and are measured at 50k instead.

## The metrics

One row per run, one fresh browser per run. Each metric is the median over the runs of a scenario and path.

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

It fails (exit 1) when, for any scenario and path that is in both the results and the baseline:

- a timed metric's median is worse than the baseline's worst run by more than 25% (`PERF_MARGIN`) plus the metric's
  slack (1 ms for a frame, 2 ms for a landing, 10 ms for hover, 50 ms for a load, restyle, edit or layout start,
  20 MB of heap),
- a counted metric is higher at all,
- a metric the baseline has is missing, or a run failed where the baseline's did not.

Run the gate on three runs of the gate set, as above: one run is too noisy (on reserved cores a 10k first frame
still varied by 40% between runs of the same commit). The baseline's worst run is the reference for the same reason,
so the spread its own runs showed is never read as a regression.

When a change makes things faster, or the machine changes, write a new baseline from three runs of the gate set and
commit it with the change: `node perf-matrix.mjs baseline <file>` (it replaces the entries the file has and keeps the
others).

The gate runs only on this machine: it needs the RTX 4070 SUPER (a run on any other renderer is void), and CI has no
GPU runner. The counted half runs everywhere: `graphty-element/test/browser/fast-path-counts.test.ts` checks the same
styles, actions and layouts for the rows they leave off the batched fast path, in the `browser` and `forced-batched`
test projects.
