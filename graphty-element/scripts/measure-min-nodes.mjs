#!/usr/bin/env node
/**
 * Measures the node count at which an accelerated force layout stops costing more than it saves,
 * which is the number `acceleration.minNodes` defaults to.
 *
 * THE PROTOCOL, so that anyone with a device can regenerate the table in
 * `docs/decisions/G6.md`:
 *
 * - Graphs are seeded and built in the page, at average degree 10 (`edges = 5 * nodes`, since
 *   degree is `2E / N`): one edge out of every node, then distinct random pairs. The default sizes
 *   are 500, 1000, 2000, 5000, 10000 and 20000 nodes. The generator is NOT the one in
 *   `test/helpers/story-graph.ts`, which draws the 150-node picture the stories and the real-GPU
 *   test share: that one's arithmetic loses precision above 2^53 and its stream repeats after
 *   15,824 draws, so asking it for the 10,000 distinct edges of a 2000-node graph never returns.
 *   Repairing it would move every Chromatic baseline and the quantile comparison that is pinned
 *   against it, so the benchmark carries its own seeded generator and the repair is a follow-up.
 * - For each size the element is mounted twice: once with `acceleration="off"`, which runs the CPU
 *   simulation, and once with `acceleration="required"`, which refuses to run at all unless a
 *   device is attached -- so an arm that quietly fell back to the CPU is reported as a failure
 *   rather than measured as a win.
 * - The layout is `forceatlas2`. After the data is in, the script discards the first 30 animation
 *   frames and records the next 300 `requestAnimationFrame` deltas, CLOSING THE WINDOW EARLY when
 *   the layout settles: a frame time measured after the arrangement has come to rest is the idle
 *   renderer's, identical whoever computed the layout, so averaging it in would hide the thing
 *   being measured. No arm recorded so far has actually settled inside its window -- every run
 *   behind the NVIDIA and SwiftShader tables of `docs/decisions/G6.md` printed NOT SETTLED -- so
 *   the early close is a guard that has never yet fired. The frame count that went into each
 *   number is reported beside it either way. The run's number is the median of its
 *   deltas; three runs per arm, and the arm's number is the median of the three.
 * - The crossover is the smallest size at which the accelerated median is at or below the CPU
 *   median. If that is the smallest size measured, the accelerator wins everywhere it was measured
 *   and the default stays 0; otherwise the default is the crossover rounded UP to the nearest 500,
 *   which is a number a reader can type into `acceleration-min-nodes`.
 *
 * A tie counts as a win for the accelerator on purpose: `requestAnimationFrame` is capped by the
 * display interval, so two arms that both fit inside the frame budget both read the interval, and
 * a tie means the accelerator costs nothing extra.
 *
 * WHAT IT PRINTS: one JSON object per size to stdout as that size finishes (so a long run can be
 * split across invocations with `--sizes`), then one final object with the table and the crossover.
 * Everything else goes to stderr.
 *
 * RUNNING IT. The script serves the element's own source through Vite and drives Chromium through
 * Playwright, so none of the package's build outputs has to exist first. It does need the
 * workspace's install: `playwright` and `vite` are devDependencies of the monorepo ROOT rather than
 * of this package, and resolve through the root `node_modules`. Run it from a full `pnpm install`
 * of the monorepo, as this package's other scripts are run:
 *
 * ```
 * node scripts/measure-min-nodes.mjs --adapter nvidia --sizes 500,1000,2000
 * ```
 *
 * `--adapter` names a Chromium flag set (`nvidia` or `swiftshader`) and is required: without a
 * device the `required` arm has nothing to measure. Chromium inherits this process's environment,
 * so on a workstation whose NVIDIA userspace is not where Chromium looks, run it with
 * `LD_LIBRARY_PATH=<the extracted libEGL tree> XDG_RUNTIME_DIR=/tmp` in front (the recipe is
 * `webgpu-graph-algorithms/docs/HEADLESS_GPU_REPORT.md`). A SwiftShader
 * measurement is worth recording for information and must never set the default: software WebGPU
 * is a CPU rasteriser wearing a device's clothes.
 *
 * Other options: `--runs` (default 3), `--frames` (300), `--warmup` (30), `--degree` (10),
 * `--port` (9021, inside the 9000-9099 range this machine allows), `--timeout` (the per-arm budget
 * for getting the data in, default 180000 ms).
 * @module
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";

/** The package root, which is also the Vite root the page's imports resolve against. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The Chromium flag sets that expose WebGPU, copied from `vitest.config.ts`, which copied them
 * from `webgpu-graph-algorithms/vitest.config.ts`.
 */
const FLAGS = {
    nvidia: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--disable-vulkan-surface"],
    swiftshader: [
        "--enable-unsafe-webgpu",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--use-webgpu-adapter=swiftshader",
    ],
};

/** The page the measurement runs in: the element, the WebGPU entry point, and the generator. */
const PAGE = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>measure-min-nodes</title></head>
  <body style="margin: 0">
    <div id="host" style="width: 1200px; height: 800px"></div>
    <script type="module">
      import "/src/graphty-element.ts";
      import "/webgpu.ts";

      // The seeded graph: node-0 .. node-(n-1), one edge out of every node so nothing floats
      // off alone, then distinct random pairs up to the edge count. Seeded, so the same size is
      // the same graph on every machine and on every run.
      function seededGraph(nodeCount, edgeCount) {
        let state = 42;
        const random = () => {
          state = (state + 0x6d2b79f5) >>> 0;
          let x = Math.imul(state ^ (state >>> 15), state | 1);
          x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
          return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
        };
        const pick = () => Math.floor(random() * nodeCount);
        const edges = [];
        const seen = new Set();
        const add = (src, dst) => {
          const key = src + "-" + dst;
          if (src === dst || seen.has(key)) { return false; }
          seen.add(key);
          edges.push({ src: "node-" + src, dst: "node-" + dst });
          return true;
        };
        for (let i = 0; i < nodeCount; i += 1) { add(i, pick()); }
        let attempts = 0;
        while (edges.length < edgeCount) {
          add(pick(), pick());
          attempts += 1;
          if (attempts > 100 * edgeCount) {
            throw new Error("could not draw " + edgeCount + " distinct edges over " + nodeCount + " nodes");
          }
        }
        return {
          nodes: Array.from({ length: nodeCount }, (value, index) => ({ id: "node-" + index })),
          edges,
        };
      }

      window.__measureArm = async function (job) {
        const host = document.getElementById("host");
        host.replaceChildren();
        const graph = seededGraph(job.nodes, job.edges);
        const element = document.createElement("graphty-element");
        element.style.cssText = "width: 100%; height: 100%; display: block";
        element.setAttribute("acceleration", job.policy);
        element.nodeData = graph.nodes;
        element.edgeData = graph.edges;
        element.layout = "forceatlas2";
        host.appendChild(element);
        await element.updateComplete;

        const started = performance.now();
        const deadline = started + job.timeout;
        const loaded = () => element.graph.getDataManager().nodes.size === job.nodes;
        while (!loaded()) {
          if (performance.now() > deadline) {
            throw new Error("timed out loading " + job.nodes + " nodes under " + job.policy);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        const loadMs = performance.now() - started;

        // The window closes at the graph-settled event: a frame time measured after the
        // arrangement has come to rest is the idle renderer's, the same number whoever computed
        // the layout, and averaging it in would hide the thing being measured.
        const deltas = [];
        const states = new Set();
        let settled = false;
        element.addEventListener("graph-settled", () => { settled = true; }, { once: true });

        await new Promise((resolve) => {
          let last = performance.now();
          let seen = 0;
          const tick = (now) => {
            const delta = now - last;
            last = now;
            seen += 1;
            if (seen > job.warmup) {
              deltas.push(delta);
              states.add(element.session.capabilities.acceleration.state);
            }
            if (settled || deltas.length >= job.frames) { resolve(); } else { requestAnimationFrame(tick); }
          };
          requestAnimationFrame(tick);
        });

        const status = element.session.capabilities.acceleration;
        host.replaceChildren();
        return {
          deltas,
          loadMs,
          settled,
          active: states.has("active"),
          state: status.state,
          vendor: status.vendor ?? "",
          reason: status.reason ?? "",
        };
      };
    </script>
  </body>
</html>
`;

/**
 * Reads the command line.
 * @returns The options, with the defaults of the protocol filled in.
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        adapter: "",
        sizes: [500, 1000, 2000, 5000, 10000, 20000],
        runs: 3,
        frames: 300,
        warmup: 30,
        degree: 10,
        port: 9021,
        timeout: 180000,
    };

    for (let i = 0; i < args.length; i += 2) {
        const name = args[i].replace(/^--/, "");
        const value = args[i + 1];
        if (value === undefined) {
            throw new Error(`--${name} needs a value`);
        }

        if (name === "adapter") {
            options.adapter = value;
        } else if (name === "sizes") {
            options.sizes = value.split(",").map((size) => Number.parseInt(size, 10));
        } else if (name in options) {
            options[name] = Number.parseInt(value, 10);
        } else {
            throw new Error(`unknown option --${name}`);
        }
    }

    if (!(options.adapter in FLAGS)) {
        throw new Error(`--adapter must be ${Object.keys(FLAGS).join(" or ")}`);
    }

    return options;
}

/**
 * The median of a list of numbers.
 * @param {number[]} values - The samples; at least one.
 * @returns {number} The middle value, or the mean of the middle two.
 */
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = sorted.length >> 1;
    return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Rounds a node count up to the nearest 500, which is the granularity a reader types.
 * @param {number} value - The crossover as measured.
 * @returns {number} The default to ship.
 */
function roundUp(value) {
    return Math.ceil(value / 500) * 500;
}

/**
 * Serves the element's source on `--port`, with the measurement page as an extra route.
 * @param {number} port - The port to listen on.
 * @returns {Promise<object>} The running Vite server.
 */
async function serve(port) {
    const server = await createServer({
        root: ROOT,
        logLevel: "warn",
        server: { port, strictPort: true },
        plugins: [
            {
                name: "measure-min-nodes-page",
                configureServer(vite) {
                    vite.middlewares.use((request, response, next) => {
                        if (request.url?.split("?")[0] !== "/measure.html") {
                            next();
                            return;
                        }

                        vite.transformIndexHtml(request.url, PAGE).then((html) => {
                            response.setHeader("Content-Type", "text/html");
                            response.end(html);
                        }, next);
                    });
                },
            },
        ],
    });

    await server.listen();
    return server;
}

/**
 * Runs one arm three (or `--runs`) times and reduces it to one number.
 * @param {object} page - The Playwright page.
 * @param {object} options - The parsed command line.
 * @param {number} nodes - The graph size.
 * @param {"off" | "required"} policy - Which path the element is told to take.
 * @returns {Promise<object>} The arm's median, its per-run medians and what the element reported.
 */
async function measureArm(page, options, nodes, policy) {
    const medians = [];
    const frames = [];
    let last = null;

    for (let run = 0; run < options.runs; run += 1) {
        const job = {
            nodes,
            edges: (nodes * options.degree) / 2,
            policy,
            frames: options.frames,
            warmup: options.warmup,
            timeout: options.timeout,
        };
        // A fresh page per run: an element that has been removed still leaves a renderer's worth
        // of GPU objects behind until the tab's next collection, and at these sizes the next
        // mount in the same page measures that backlog rather than the layout.
        await page.reload({ waitUntil: "load" });
        await page.waitForFunction(() => typeof window.__measureArm === "function", null, { timeout: 120000 });
        last = await page.evaluate((argument) => window.__measureArm(argument), job);
        medians.push(median(last.deltas));
        frames.push(last.deltas.length);
        process.stderr.write(
            `  ${policy} ${nodes} run ${run + 1}: ${medians[run].toFixed(2)} ms over` +
                ` ${last.deltas.length} working frames (load ${Math.round(last.loadMs)} ms,` +
                ` acceleration ${last.active ? "active" : last.state}` +
                `${last.settled ? "" : ", NOT SETTLED"})\n`,
        );
    }

    return {
        ms: median(medians),
        runs: medians.map((value) => Number(value.toFixed(2))),
        frames: median(frames),
        active: last.active,
        state: last.state,
        vendor: last.vendor,
        reason: last.reason,
    };
}

/**
 * Measures every size on both arms and prints the table and the crossover.
 */
async function main() {
    const options = parseArgs();
    const server = await serve(options.port);
    const browser = await chromium.launch({ args: FLAGS[options.adapter] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (error) => process.stderr.write(`  page error: ${error.message}\n`));

    const rows = [];

    try {
        await page.goto(`http://127.0.0.1:${options.port}/measure.html`);
        await page.waitForFunction(() => typeof window.__measureArm === "function", null, { timeout: 120000 });

        for (const nodes of options.sizes) {
            const cpu = await measureArm(page, options, nodes, "off");
            const gpu = await measureArm(page, options, nodes, "required");
            const row = { nodes, edges: (nodes * options.degree) / 2, cpu, gpu, ratio: gpu.ms / cpu.ms };
            rows.push(row);
            process.stdout.write(`${JSON.stringify(row)}\n`);
        }
    } finally {
        await browser.close();
        await server.close();
    }

    const accelerated = rows.filter((row) => row.gpu.active);
    const crossing = accelerated.find((row) => row.gpu.ms <= row.cpu.ms);
    const smallest = accelerated[0];
    const crossover = crossing === undefined ? null : crossing.nodes;
    const proposed = crossing === undefined || smallest === undefined ? null : crossing === smallest ? 0 : roundUp(crossover);

    process.stdout.write(
        `${JSON.stringify({
            adapter: options.adapter,
            protocol: { degree: options.degree, frames: options.frames, warmup: options.warmup, runs: options.runs },
            table: rows.map((row) => ({
                nodes: row.nodes,
                cpuMs: Number(row.cpu.ms.toFixed(2)),
                gpuMs: Number(row.gpu.ms.toFixed(2)),
                ratio: Number(row.ratio.toFixed(3)),
                cpuFrames: row.cpu.frames,
                gpuFrames: row.gpu.frames,
                gpuActive: row.gpu.active,
            })),
            crossover,
            accelerationMinNodesDefault: proposed,
        })}\n`,
    );
}

await main();
