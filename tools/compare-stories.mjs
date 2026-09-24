#!/usr/bin/env node
/**
 * @file Find out what actually changed between two versions of a Storybook story.
 *
 * Takes two git references, renders the same stories at both, and answers in three ways at once:
 * the two pictures and a difference image; a reading of the Babylon scene, which is independent
 * of where the camera ended up; and one verdict per story in ordinary words.
 *
 * WHY THE SCENE READING IS THE POINT. The camera auto-frames whatever it is handed, so a graph
 * that moved and was reframed and a graph that did not move can produce pictures that differ by
 * the same handful of anti-aliased pixels. A pixel count cannot tell those apart, and twice in
 * one day it told the wrong story. Node positions read off the scene can: they are in world
 * units and owe nothing to the camera.
 *
 * WHY IT DOES NOT ASK THE VISUAL-REGRESSION SERVICE ANYTHING. That service is where the problem
 * came from. It reports a count and refuses the list to a project token, and it compares each
 * build against the previous build on the same branch rather than against the base -- so a change
 * is mentioned once and then goes quiet. The one thing this tool will accept from it is the
 * commit its baseline came from, which a project token CAN read, and it falls back to `master`
 * the moment that lookup does not work.
 *
 * Usage and the meaning of every number it prints: tools/compare-stories.md
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import {
    createReadStream,
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** pngjs is a devDependency of graphty-element, which is the package whose stories this renders. */
const { PNG } = createRequire(join(ROOT, "graphty-element", "package.json"))("pngjs");
const { chromium } = await import("playwright");

// ---------------------------------------------------------------------------------------------
// What counts as a difference
// ---------------------------------------------------------------------------------------------

/**
 * How far apart two node clouds may be and still count as the same arrangement.
 *
 * The figure it bounds is a per-node distance measured after both clouds have been centred on
 * their own centroid and divided by their own rms radius, so position and scale are already gone
 * and only the shape is left. Two builds that ran the same layout over the same seed agree to
 * floating-point noise, far below this.
 */
const SAME_ARRANGEMENT = 0.01;

/** How much the arrangement figure may move, as a fraction of itself, and still count as equal. */
const SAME_FIGURE = 0.02;

/** How much of the frame may differ before "a few pixels of noise" becomes a picture that moved. */
const NOISE_FRACTION = 0.001;

/** How far a camera may move, in world units, and still count as the same camera. */
const SAME_CAMERA = 1e-3;

/** How long one story gets to reach a final frame. */
const STORY_TIMEOUT_MS = 90000;

/** How long the frozen pass waits for data before giving up on reading a seed. */
const SEED_TIMEOUT_MS = 45000;

/** What the capture tool looks like to a story, which some stories read and behave differently for. */
const CHROMATIC_USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Chromatic";

const VIEWPORT = { width: 1200, height: 900 };

// ---------------------------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------------------------

const USAGE = `
compare-stories -- what changed between two versions of a story

  tools/compare-stories.mjs [<before-ref>] [<after-ref>] [options]

  <before-ref>   the version to compare against, or the word "baseline" to look up the commit
                 the visual-regression service compared <after-ref> with. Default: baseline,
                 falling back to "master" when the lookup does not work.
  <after-ref>    the version under suspicion. Default: HEAD.

  --stories <text,text>  only stories whose id contains one of these pieces of text
  --out <dir>            where the images and the report go. Default: tmp/compare-stories
  --storybook <ref>=<dir>  use a Storybook that is already built, instead of building one
  --no-seed              skip the second pass that measures how far each story moved from
                         the positions it started at
  --self-check           check the arithmetic against hand-worked cases and stop
  --keep                 leave the temporary worktrees in place instead of deleting them
  -h, --help             this
`.trim();

function parseArguments(argv) {
    const options = {
        refs: [],
        stories: null,
        out: null,
        storybooks: new Map(),
        seed: true,
        keep: false,
        selfCheck: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = () => {
            const value = argv[++i];
            if (value === undefined) {
                fail(`${arg} needs a value`);
            }
            return value;
        };

        if (arg === "-h" || arg === "--help") {
            console.log(USAGE);
            process.exit(0);
        } else if (arg === "--stories") {
            options.stories = next().split(",").map((s) => s.trim()).filter(Boolean);
        } else if (arg === "--out") {
            options.out = resolve(next());
        } else if (arg === "--storybook") {
            const value = next();
            const split = value.indexOf("=");
            if (split < 1) {
                fail(`--storybook wants <ref>=<dir>, not "${value}"`);
            }
            options.storybooks.set(value.slice(0, split), resolve(value.slice(split + 1)));
        } else if (arg === "--self-check") {
            options.selfCheck = true;
        } else if (arg === "--no-seed") {
            options.seed = false;
        } else if (arg === "--keep") {
            options.keep = true;
        } else if (arg.startsWith("-")) {
            fail(`unknown option ${arg}`);
        } else {
            options.refs.push(arg);
        }
    }

    if (options.refs.length > 2) {
        fail("two references at most");
    }

    return options;
}

function fail(message) {
    console.error(`compare-stories: ${message}`);
    console.error(`\n${USAGE}`);
    process.exit(2);
}

// ---------------------------------------------------------------------------------------------
// Git, and building a Storybook for one commit
// ---------------------------------------------------------------------------------------------

function git(...args) {
    const result = spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
    if (result.status !== 0) {
        throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || "").trim()}`);
    }
    return result.stdout.trim();
}

/**
 * Run a command, letting its output through, and throw when it fails.
 * @param command - what to run.
 * @param args - its arguments.
 * @param cwd - the directory to run it in.
 */
function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, stdio: "inherit" });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed in ${cwd}`);
    }
}

/**
 * The commit the visual-regression service compared the given commit against.
 *
 * WHAT IS AND IS NOT READABLE. A project token, exchanged for an app token the way the CLI itself
 * does it, can read a build's own `commit` and its `ancestorBuilds`, whose first entry is the
 * build this one was compared against. It CANNOT read `branch`, `baselineBuilds` or `tests`: those
 * answer "Cannot access those build fields when authenticating with app code". So the baseline
 * COMMIT is obtainable and the list of changed stories is not, which is the whole reason this
 * tool renders the stories itself.
 * @param commit - the commit whose build to look up.
 * @returns the baseline commit, or null with a reason on `.why`.
 */
async function baselineCommitFor(commit) {
    const envPath = join(ROOT, ".env");
    if (!existsSync(envPath)) {
        return { commit: null, why: "no .env, so there is no project token to ask with" };
    }

    const match = /^CHROMATIC_PROJECT_TOKEN_ELEMENT=(.*)$/m.exec(readFileSync(envPath, "utf8"));
    if (!match) {
        return { commit: null, why: "no CHROMATIC_PROJECT_TOKEN_ELEMENT in .env" };
    }

    const post = async (query, variables, headers = {}) => {
        const response = await fetch("https://index.chromatic.com/graphql", {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(30000),
        });
        return response.json();
    };

    try {
        const auth = await post("mutation M($t: String!) { appToken: createAppToken(code: $t) }", {
            t: match[1].trim().replace(/^["']|["']$/g, ""),
        });
        const appToken = auth?.data?.appToken;
        if (!appToken) {
            return { commit: null, why: "the project token was refused" };
        }

        const headers = { Authorization: `Bearer ${appToken}` };
        const last = await post("query { app { lastBuild { number } } }", {}, headers);
        const newest = last?.data?.app?.lastBuild?.number;
        if (!newest) {
            return { commit: null, why: "the project has no builds" };
        }

        // Walk back from the newest build until one of them is the commit asked about. Builds are
        // few and the walk is bounded, because a commit with no build at all is the common case.
        for (let number = newest; number > newest - 40; number--) {
            const build = (
                await post(
                    `query B($n: Int!) { app { build(number: $n) {
                        number commit changeCount ancestorBuilds { number commit } } } }`,
                    { n: number },
                    headers,
                )
            )?.data?.app?.build;

            if (build?.commit === commit) {
                const ancestor = build.ancestorBuilds?.[0];
                if (!ancestor) {
                    return { commit: null, why: `build ${build.number} has no ancestor build` };
                }
                return {
                    commit: ancestor.commit,
                    why: `build ${build.number} (${build.changeCount} changes) was compared against build ${ancestor.number}`,
                };
            }
        }

        return { commit: null, why: `no build in the last 40 was made from ${commit.slice(0, 12)}` };
    } catch (error) {
        return { commit: null, why: `the lookup failed: ${String(error && error.message)}` };
    }
}

/**
 * A built Storybook for one commit, building it in a throwaway worktree if there is not one yet.
 *
 * The build is cached under the output directory by commit, so asking the same question twice --
 * or asking a second question about the same pair -- costs nothing the second time.
 * @param commit - the commit to build.
 * @param cacheRoot - where built Storybooks are kept.
 * @param keep - whether to leave the worktree behind.
 * @returns the directory holding index.html and index.json.
 */
function storybookFor(commit, cacheRoot, keep) {
    const short = commit.slice(0, 12);
    const cache = join(cacheRoot, "built", short);
    const built = join(cache, "storybook-static");

    if (existsSync(join(built, "index.json"))) {
        console.log(`  ${short}  reusing the Storybook already built at ${built}`);
        return built;
    }

    const tree = join(cache, "tree");
    mkdirSync(cache, { recursive: true });

    console.log(`  ${short}  building a Storybook (worktree, install, build, build-storybook)`);
    if (!existsSync(tree)) {
        run("git", ["-C", ROOT, "worktree", "add", "--detach", tree, commit], ROOT);
    }
    run("pnpm", ["install", "--frozen-lockfile"], tree);
    run("pnpm", ["exec", "nx", "build", "graphty-element"], tree);
    run("pnpm", ["--filter", "./graphty-element", "run", "build-storybook"], tree);

    rmSync(built, { recursive: true, force: true });
    renameSync(join(tree, "graphty-element", "storybook-static"), built);

    if (!keep) {
        spawnSync("git", ["-C", ROOT, "worktree", "remove", "--force", tree], { stdio: "ignore" });
        rmSync(tree, { recursive: true, force: true });
        spawnSync("git", ["-C", ROOT, "worktree", "prune"], { stdio: "ignore" });
    }

    return built;
}

// ---------------------------------------------------------------------------------------------
// Serving a built Storybook
// ---------------------------------------------------------------------------------------------

const MEDIA_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8",
    ".glb": "model/gltf-binary",
    ".env": "model/vnd.babylon.env",
    ".dds": "image/vnd-ms.dds",
};

/**
 * Serve a directory over http on a port the operating system picks.
 *
 * IT DOES NOT GO THROUGH SERVHERD, AND THAT IS ON PURPOSE. servherd exists because dev servers
 * started by hand outlive the session that started them and nothing reaps them. This server has
 * no life of its own: it is an http listener inside this process, and it stops when the process
 * stops, whether that is a clean finish, an error or a control-C. Anything long-lived -- the real
 * Storybook, a dev server -- still goes through servherd.
 * @param root - the directory to serve.
 * @returns its base url and a function that shuts it down.
 */
async function serve(root) {
    const server = createServer((request, response) => {
        const path = decodeURIComponent((request.url ?? "/").split("?")[0]);
        const target = resolve(root, `.${normalize(path)}`);

        let stats;
        try {
            stats = target.startsWith(root) ? statSync(target) : null;
        } catch {
            stats = null;
        }
        if (!stats) {
            response.writeHead(404).end("not found");
            return;
        }

        const real = stats.isDirectory() ? join(target, "index.html") : target;
        response.writeHead(200, {
            "content-type": MEDIA_TYPES[extname(real).toLowerCase()] ?? "application/octet-stream",
            "cache-control": "no-store",
        });
        createReadStream(real).pipe(response);
    });

    await new Promise((done) => server.listen(0, "127.0.0.1", done));

    return {
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
    };
}

// ---------------------------------------------------------------------------------------------
// Rendering a story and reading its scene
// ---------------------------------------------------------------------------------------------

/** Watch Storybook's own channel, so "the story never rendered" is a fact rather than a timeout. */
function watchStoryOutcome() {
    globalThis.__compareStories = { outcome: null, detail: "" };
    const attach = () => {
        const channel = globalThis.__STORYBOOK_ADDONS_CHANNEL__;
        if (!channel) {
            return false;
        }
        channel.on("storyRendered", () => {
            globalThis.__compareStories.outcome ??= "rendered";
        });
        for (const bad of ["storyThrewException", "storyErrored", "storyMissing", "playFunctionThrewException"]) {
            channel.on(bad, (payload) => {
                globalThis.__compareStories.outcome ??= bad;
                globalThis.__compareStories.detail = String(
                    (payload && (payload.message ?? payload.title)) ?? payload ?? "",
                ).slice(0, 300);
            });
        }
        return true;
    };
    if (!attach()) {
        const timer = setInterval(() => {
            if (attach()) {
                clearInterval(timer);
            }
        }, 5);
    }
}

/**
 * Stop every frame from being drawn, so the layout never gets to run.
 *
 * The element spends its configured pre-steps inside the render loop, just before the frame is
 * drawn, on the first frame that has a node to move. Take the render loop's clock away and the
 * nodes stay exactly where the layout seeded them -- which is the picture the story starts from.
 */
function blockFrames() {
    globalThis.requestAnimationFrame = () => 0;
    globalThis.cancelAnimationFrame = () => undefined;
}

/**
 * Everything one render of one story yields, read off the scene rather than off the picture.
 *
 * TWO SETS OF COORDINATES, AND THE DIFFERENCE MATTERS. `nodes` is where the meshes actually are
 * in the world, which is what got drawn. `seeded` is where the layout engine believes they are,
 * which exists from the moment a node is added and does not wait for a frame. A page on which no
 * frame is ever drawn has an engine full of positions and every mesh still sitting at the origin,
 * so the seed reading has to come from the engine.
 * @returns the node and camera reading, or an object carrying `error` when there is nothing to read.
 */
function readScene() {
    const element = globalThis.document.querySelector("graphty-element");
    if (!element) {
        return { error: "the story put no <graphty-element> on the page" };
    }

    let graph;
    try {
        graph = element.graph;
    } catch (error) {
        return { error: `the element has no graph: ${String(error && error.message)}` };
    }
    if (!graph) {
        return { error: "the element has no graph" };
    }

    const nodes = [];
    for (const node of graph.getNodes()) {
        const mesh = node.mesh;
        if (!mesh || mesh.isDisposed()) {
            continue;
        }
        mesh.computeWorldMatrix(true);
        const at = mesh.absolutePosition;
        nodes.push([String(node.id), at.x, at.y, at.z]);
    }

    const edges = [];
    try {
        for (const edge of graph.getDataManager().edges.values()) {
            edges.push([String(edge.srcId), String(edge.dstId)]);
        }
    } catch {
        // An element that keeps its edges somewhere else still gives a usable node reading.
    }

    const seeded = [];
    let layout = null;
    try {
        const manager = graph.getLayoutManager();
        layout = manager.getStats();
        for (const node of graph.getNodes()) {
            const at = manager.getNodePosition(node);
            if (at) {
                seeded.push([String(node.id), at[0], at[1], at[2]]);
            }
        }
    } catch {
        // No engine reading is a missing line in the report, not a failed run.
    }

    let camera = null;
    try {
        const active = element.getScene().activeCamera;
        if (active) {
            const target = typeof active.getTarget === "function" ? active.getTarget() : null;
            camera = {
                kind: typeof active.getClassName === "function" ? active.getClassName() : "camera",
                position: [active.globalPosition.x, active.globalPosition.y, active.globalPosition.z],
                target: target ? [target.x, target.y, target.z] : null,
                radius: typeof active.radius === "number" ? active.radius : null,
                orthoTop: typeof active.orthoTop === "number" ? active.orthoTop : null,
            };
        }
    } catch {
        // No camera reading is a missing line in the report, not a failed run.
    }

    return { nodes, edges, seeded, layout, camera };
}

/**
 * Render one story and read what it drew.
 * @param context - the browser context to open it in.
 * @param baseUrl - where that reference's Storybook is being served.
 * @param id - the story.
 * @param shotPath - where to write the picture.
 * @returns the scene reading, or `ran: false` and why not.
 */
async function renderLive(context, baseUrl, id, shotPath) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (error) => consoleErrors.push(String(error.message).slice(0, 200)));

    try {
        await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&chromatic=true`, {
            timeout: 30000,
        });

        const handle = await page.waitForFunction(
            () => (globalThis.__compareStories?.outcome ? globalThis.__compareStories : null),
            null,
            { timeout: STORY_TIMEOUT_MS, polling: 100 },
        );
        const seen = await handle.jsonValue();

        if (seen.outcome !== "rendered") {
            return { ran: false, why: `${seen.outcome}${seen.detail ? `: ${seen.detail}` : ""}` };
        }

        // The element's own answer to "is this the finished picture". Waiting on the settle EVENT
        // instead photographs a camera that is still moving.
        const settled = await page.evaluate(async (timeoutMs) => {
            const element = globalThis.document.querySelector("graphty-element");
            if (!element || typeof element.waitForStableFrame !== "function") {
                return "no waitForStableFrame on this element";
            }
            try {
                await element.waitForStableFrame({ timeoutMs });
                return null;
            } catch (error) {
                return String(error && error.message).slice(0, 200);
            }
        }, STORY_TIMEOUT_MS);

        const scene = await readSceneOn(page);
        await page.screenshot({ path: shotPath });

        return { ran: true, unsettled: settled, consoleErrors, ...scene };
    } catch (error) {
        return { ran: false, why: String(error && error.message).split("\n")[0], consoleErrors };
    } finally {
        await page.close();
    }
}

/**
 * Read the same story with no frame ever drawn, which leaves the layout holding what it started with.
 * @param context - a browser context in which no frame is ever drawn.
 * @param baseUrl - where that reference's Storybook is being served.
 * @param id - the story.
 * @returns the scene reading, or an object carrying `error`.
 */
async function renderSeed(context, baseUrl, id) {
    const page = await context.newPage();
    try {
        await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&chromatic=true`, {
            timeout: 30000,
        });
        await page.waitForFunction(
            () => {
                try {
                    const graph = globalThis.document.querySelector("graphty-element").graph;
                    const nodes = graph.getNodes();
                    return nodes.length > 0 && Boolean(graph.getLayoutManager().getNodePosition(nodes[0]));
                } catch {
                    return false;
                }
            },
            null,
            { timeout: SEED_TIMEOUT_MS, polling: 50 },
        );
        // Let the last of the data land; nothing is animating, so this is a fixed short wait.
        await page.waitForTimeout(400);
        return await readSceneOn(page);
    } catch (error) {
        return { error: String(error && error.message).split("\n")[0] };
    } finally {
        await page.close();
    }
}

/**
 * Run the scene reading inside the page.
 * @param page - the page holding the story.
 * @returns what `readScene` found.
 */
async function readSceneOn(page) {
    return page.evaluate(readScene);
}

// ---------------------------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------------------------

function centroid(points) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const point of points) {
        x += point[0];
        y += point[1];
        z += point[2];
    }
    return [x / points.length, y / points.length, z / points.length];
}

function rmsRadius(points) {
    const [cx, cy, cz] = centroid(points);
    let squared = 0;
    for (const point of points) {
        squared += (point[0] - cx) ** 2 + (point[1] - cy) ** 2 + (point[2] - cz) ** 2;
    }
    return Math.sqrt(squared / points.length);
}

/**
 * How spread out a graph is, per unit of edge -- the rms radius about its centroid divided by its
 * mean edge length.
 *
 * Both halves scale together, so the figure says nothing about how big the drawing is or where the
 * camera put it, and everything about the arrangement: a layout that never converged and one that
 * did give different figures even when they photograph the same.
 * @param cloud - node id to position.
 * @param edges - source and destination ids.
 * @returns the figure, or null when there are no edges to measure against.
 */
function arrangementFigure(cloud, edges) {
    const points = [...cloud.values()];
    if (points.length === 0) {
        return null;
    }

    let total = 0;
    let counted = 0;
    for (const [source, destination] of edges) {
        const a = cloud.get(source);
        const b = cloud.get(destination);
        if (!a || !b) {
            continue;
        }
        total += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        counted++;
    }

    if (counted === 0 || total === 0) {
        return null;
    }

    return rmsRadius(points) / (total / counted);
}

/**
 * How differently two graphs are arranged, with position and scale taken out.
 *
 * Each cloud is centred on its own centroid and divided by its own rms radius before they are
 * compared node by node, so a graph that was moved, or drawn twice the size, measures zero. What
 * is left is the shape. Nodes are matched by ID, never by order.
 * @param before - node id to position.
 * @param after - node id to position.
 * @returns the per-node rms distance, or null when the two do not hold the same nodes.
 */
function arrangementDistance(before, after) {
    const shared = [...before.keys()].filter((id) => after.has(id));
    if (shared.length === 0 || shared.length !== before.size || shared.length !== after.size) {
        return null;
    }

    const a = shared.map((id) => before.get(id));
    const b = shared.map((id) => after.get(id));
    const ca = centroid(a);
    const cb = centroid(b);
    const ra = rmsRadius(a) || 1;
    const rb = rmsRadius(b) || 1;

    let squared = 0;
    for (let i = 0; i < a.length; i++) {
        squared +=
            ((a[i][0] - ca[0]) / ra - (b[i][0] - cb[0]) / rb) ** 2 +
            ((a[i][1] - ca[1]) / ra - (b[i][1] - cb[1]) / rb) ** 2 +
            ((a[i][2] - ca[2]) / ra - (b[i][2] - cb[2]) / rb) ** 2;
    }

    return Math.sqrt(squared / a.length);
}

function toCloud(scene) {
    const cloud = new Map();
    for (const [id, x, y, z] of scene?.nodes ?? []) {
        cloud.set(id, [x, y, z]);
    }
    return cloud;
}

function toSeedCloud(scene) {
    const cloud = new Map();
    for (const [id, x, y, z] of scene?.seeded ?? []) {
        cloud.set(id, [x, y, z]);
    }
    return cloud;
}

/**
 * How far a story travelled from the positions it started at, said in words.
 *
 * WHY THIS IS NOT ALWAYS A NUMBER. A one-shot layout has finished placing its nodes before a
 * frame is ever drawn, so its start and its end are the same and the distance is zero -- which
 * reads as "it never ran" if you only look at the number. A simulation has the opposite shape:
 * before the first frame every node sits on a single point, and a distance measured from a cloud
 * with no size at all is arithmetic rather than information. Both are answers to "did it run",
 * and both need saying rather than scoring.
 * @param seedScene - the story read with no frame ever drawn.
 * @param liveScene - the same story read once it settled.
 * @returns a sentence, and the distance when there is one.
 */
function movementFromSeed(seedScene, liveScene) {
    const seed = toSeedCloud(seedScene);
    const live = toSeedCloud(liveScene);

    if (live.size === 0) {
        return { distance: null, said: "the layout engine reported no positions at all" };
    }
    if (seed.size === 0) {
        return { distance: null, said: "the layout engine held nothing before the first frame" };
    }

    const spread = rmsRadius([...live.values()]);
    if (rmsRadius([...seed.values()]) === 0) {
        return {
            distance: null,
            said: `every node sat on one point until a frame ran, then spread to a radius of ${spread.toFixed(1)}`,
        };
    }

    const distance = arrangementDistance(seed, live);
    if (distance === null) {
        return { distance: null, said: "the two readings hold different nodes" };
    }
    if (distance < SAME_ARRANGEMENT) {
        return { distance, said: "placed before the first frame, and not moved since" };
    }

    return { distance, said: `moved ${distance.toFixed(4)} from where it started` };
}

function cameraMove(before, after) {
    if (!before?.camera || !after?.camera) {
        return null;
    }

    const span = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : null);

    return {
        position: span(before.camera.position, after.camera.position),
        target: span(before.camera.target, after.camera.target),
        radius:
            before.camera.radius !== null && after.camera.radius !== null
                ? Math.abs(before.camera.radius - after.camera.radius)
                : null,
    };
}

/**
 * Two pictures, the pixels where they disagree, and an image marking those pixels in red.
 * @param beforePath - the picture at the first reference.
 * @param afterPath - the picture at the second.
 * @param diffPath - where to write the difference image.
 * @returns how many pixels differ, out of how many.
 */
function comparePictures(beforePath, afterPath, diffPath) {
    const before = PNG.sync.read(readFileSync(beforePath));
    const after = PNG.sync.read(readFileSync(afterPath));

    if (before.width !== after.width || before.height !== after.height) {
        return { differing: null, total: null, note: "the two pictures are different sizes" };
    }

    const diff = new PNG({ width: before.width, height: before.height });
    let differing = 0;

    for (let i = 0; i < before.data.length; i += 4) {
        const same =
            before.data[i] === after.data[i] &&
            before.data[i + 1] === after.data[i + 1] &&
            before.data[i + 2] === after.data[i + 2] &&
            before.data[i + 3] === after.data[i + 3];

        if (same) {
            // The unchanged picture, washed out, so the red has something to sit on.
            const grey = before.data[i] * 0.299 + before.data[i + 1] * 0.587 + before.data[i + 2] * 0.114;
            const faded = Math.round(255 - (255 - grey) * 0.18);
            diff.data[i] = faded;
            diff.data[i + 1] = faded;
            diff.data[i + 2] = faded;
        } else {
            differing++;
            diff.data[i] = 255;
            diff.data[i + 1] = 32;
            diff.data[i + 2] = 32;
        }
        diff.data[i + 3] = 255;
    }

    writeFileSync(diffPath, PNG.sync.write(diff));

    return { differing, total: before.width * before.height };
}

/**
 * One story's verdict, in ordinary words.
 *
 * The scene decides it and the pixels only describe it. A picture that differs while the nodes
 * sit in the same arrangement is the camera having reframed the same graph, which is the trap
 * that made a real movement look like anti-aliasing and anti-aliasing look like a real movement.
 * @param reading - what the two renders produced.
 * @returns "did not run", "identical", "moved but equivalently arranged" or "genuinely different".
 */
function verdictFor(reading) {
    if (!reading.before.ran || !reading.after.ran) {
        return "did not run";
    }

    const emptyBefore = (reading.before.nodes ?? []).length === 0;
    const emptyAfter = (reading.after.nodes ?? []).length === 0;
    const fraction = reading.pixels.total ? reading.pixels.differing / reading.pixels.total : 0;

    // Drew a graph at one reference and none at the other: something stopped working.
    if (emptyBefore !== emptyAfter) {
        return "did not run";
    }

    // Drew no graph at EITHER, which is not a failure -- plenty of stories are a panel, a
    // swatch grid or a control. There is no scene to read, so the picture is all there is,
    // and the report says so rather than pretending a scene reading happened.
    if (emptyBefore) {
        return fraction > NOISE_FRACTION ? "genuinely different" : "identical";
    }

    const moved = reading.distance === null || reading.distance > SAME_ARRANGEMENT;

    const figureMoved =
        reading.figureBefore !== null &&
        reading.figureAfter !== null &&
        Math.abs(reading.figureAfter - reading.figureBefore) / Math.max(reading.figureBefore, 1e-9) > SAME_FIGURE;

    if (moved || figureMoved) {
        return "genuinely different";
    }

    return fraction > NOISE_FRACTION ? "moved but equivalently arranged" : "identical";
}

// ---------------------------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------------------------

const show = (value, places = 3) => (value === null || value === undefined ? "-" : value.toFixed(places));

function describe(story) {
    const lines = [`${story.id}   ${story.title}`];
    const line = (label, text) => lines.push(`  ${label.padEnd(14)}${text}`);

    line("verdict", story.verdict);

    if (story.verdict === "did not run") {
        const why = (reading) => {
            if (!reading.ran) {
                return reading.why;
            }
            if (reading.error) {
                return `it rendered, but the scene could not be read: ${reading.error}`;
            }
            return `it rendered and drew ${String((reading.nodes ?? []).length)} nodes`;
        };
        line("before", why(story.before));
        line("after", why(story.after));
        return lines.join("\n");
    }

    if ((story.before.nodes ?? []).length === 0) {
        line("scene", "this story draws no graph, so only the picture could be compared");
        line(
            "pixels",
            story.pixels.differing === null
                ? story.pixels.note
                : `${story.pixels.differing} of ${story.pixels.total} differ ` +
                  `(${((story.pixels.differing / story.pixels.total) * 100).toFixed(2)}%)`,
        );
        line("images", `${story.id}-before.png  ${story.id}-after.png  ${story.id}-diff.png`);

        return lines.join("\n");
    }

    line(
        "arrangement",
        story.figureBefore === null
            ? "no edges to measure against"
            : `${show(story.figureBefore)} -> ${show(story.figureAfter)}` +
              "   (spread per unit of edge; the camera cannot change it)",
    );
    line(
        "node shape",
        story.distance === null
            ? "the two versions drew different nodes, so the arrangements cannot be compared"
            : `${show(story.distance, 4)} apart   (0 = arranged the same, once position and scale are removed)`,
    );

    if (story.camera) {
        const still =
            (story.camera.position ?? 0) < SAME_CAMERA &&
            (story.camera.target ?? 0) < SAME_CAMERA &&
            (story.camera.radius ?? 0) < SAME_CAMERA;
        line(
            "camera",
            still
                ? "in the same place"
                : `moved ${show(story.camera.position)} units, looking ${show(story.camera.target)} units away` +
                  (story.camera.radius === null ? "" : `, ${show(story.camera.radius)} nearer or further`),
        );
    }

    line(
        "pixels",
        story.pixels.differing === null
            ? story.pixels.note
            : `${story.pixels.differing} of ${story.pixels.total} differ ` +
              `(${((story.pixels.differing / story.pixels.total) * 100).toFixed(2)}%)`,
    );

    for (const [which, reading] of [["before", story.before], ["after", story.after]]) {
        const stats = reading.layout;
        if (stats && (stats.isSettled === false || stats.nodeCount === 0)) {
            line(
                `layout ${which}`,
                `${stats.layoutType ?? "none"}: ${stats.nodeCount} nodes in the engine, ` +
                    `${stats.isSettled ? "settled" : "STILL MOVING"}`,
            );
        }
    }

    if (story.seedBefore) {
        line("did it run", `before: ${story.seedBefore.said}`);
        line("", `after:  ${story.seedAfter.said}`);
    }

    for (const [which, complaint] of [["before", story.before.unsettled], ["after", story.after.unsettled]]) {
        if (complaint) {
            line("still moving", `at ${which}, the element never called the picture final: ${complaint}`);
        }
    }

    line("images", `${story.id}-before.png  ${story.id}-after.png  ${story.id}-diff.png`);

    return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// The arithmetic, checked against cases worked out by hand
// ---------------------------------------------------------------------------------------------

/**
 * Prove the measurements mean what the report says they mean.
 *
 * Every number this tool prints comes from three small functions, and a mistake in any of them
 * would be invisible: the report would still be full of plausible figures. So each one is held
 * to a case whose answer is known without running anything.
 */
function selfCheck() {
    const near = (got, want, slack, what) => {
        if (!(Math.abs(got - want) <= slack)) {
            throw new Error(`${what}: got ${String(got)}, expected ${String(want)}`);
        }
        console.log(`  ok  ${what} = ${got.toFixed(4)}`);
    };

    // A square of side 2 centred on the origin, joined round its rim. Every node is sqrt(2) from
    // the centre and every edge is 2 long, so the figure is sqrt(2) / 2.
    const square = new Map([
        ["a", [-1, -1, 0]],
        ["b", [1, -1, 0]],
        ["c", [1, 1, 0]],
        ["d", [-1, 1, 0]],
    ]);
    const rim = [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "a"],
    ];
    near(arrangementFigure(square, rim), Math.SQRT2 / 2, 1e-12, "the figure of a unit square");

    // The same square moved far away and drawn seven times the size is the same arrangement.
    const moved = new Map([...square].map(([id, [x, y, z]]) => [id, [x * 7 + 100, y * 7 - 40, z * 7]]));
    near(arrangementDistance(square, moved), 0, 1e-12, "a square against itself, moved and scaled");
    near(arrangementFigure(moved, rim), Math.SQRT2 / 2, 1e-12, "the figure survives moving and scaling");

    // One corner pulled in to the centre is a different arrangement, and the figure moves with it.
    const dented = new Map([...square, ["c", [0, 0, 0]]]);
    if (!(arrangementDistance(square, dented) > SAME_ARRANGEMENT)) {
        throw new Error("a square with a corner pulled in should not count as the same arrangement");
    }
    console.log(`  ok  a dented square is ${arrangementDistance(square, dented).toFixed(4)} away`);

    // Nodes are matched by ID, never by the order they came back in.
    const shuffled = new Map([...square].reverse());
    near(arrangementDistance(square, shuffled), 0, 1e-12, "the same square, read back in another order");

    // The four verdicts, each from the reading that should produce it.
    const reading = (overrides) => ({
        before: { ran: true, nodes: [1] },
        after: { ran: true, nodes: [1] },
        distance: 0,
        figureBefore: 2,
        figureAfter: 2,
        pixels: { differing: 0, total: 1000000 },
        ...overrides,
    });
    const verdicts = [
        [reading({}), "identical"],
        [reading({ pixels: { differing: 300, total: 1000000 } }), "identical"],
        [reading({ pixels: { differing: 40000, total: 1000000 } }), "moved but equivalently arranged"],
        [reading({ distance: 0.5 }), "genuinely different"],
        [reading({ figureAfter: 2.9 }), "genuinely different"],
        [reading({ after: { ran: false, why: "it threw" } }), "did not run"],
        [reading({ after: { ran: true, nodes: [] } }), "did not run"],
        // A story with no graph at EITHER reference is a panel or a swatch grid, not a failure.
        [reading({ before: { ran: true, nodes: [] }, after: { ran: true, nodes: [] } }), "identical"],
        [
            reading({
                before: { ran: true, nodes: [] },
                after: { ran: true, nodes: [] },
                pixels: { differing: 40000, total: 1000000 },
            }),
            "genuinely different",
        ],
    ];
    for (const [input, expected] of verdicts) {
        const got = verdictFor(input);
        if (got !== expected) {
            throw new Error(`verdict: got "${got}", expected "${expected}"`);
        }
    }
    console.log(`  ok  all ${verdicts.length} verdicts`);

    console.log("the arithmetic holds");
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

async function main() {
    const options = parseArguments(process.argv.slice(2));

    if (options.selfCheck) {
        selfCheck();
        return;
    }

    // No reference at all means "explain the build I am standing on": HEAD against whatever the
    // visual-regression service compared it with. One reference names the BEFORE, two name both.
    const afterRef = options.refs[1] ?? "HEAD";
    const afterCommit = git("rev-parse", `${afterRef}^{commit}`);

    let beforeRef = options.refs[0] ?? null;
    let beforeCommit = null;
    let beforeNote = "";

    if (beforeRef === null || beforeRef === "baseline") {
        const baseline = await baselineCommitFor(afterCommit);
        if (baseline.commit) {
            beforeRef = "the visual-regression baseline";
            beforeCommit = baseline.commit;
            beforeNote = baseline.why;
        } else {
            beforeRef = "master";
            beforeNote = `no baseline from the visual-regression service -- ${baseline.why}`;
        }
    }
    beforeCommit ??= git("rev-parse", `${beforeRef}^{commit}`);

    // The built Storybooks are keyed on the commit and live in one place whatever --out says, so
    // asking a second question with a different output directory does not rebuild them.
    const buildCache = join(ROOT, "tmp", "compare-stories");
    const outDir = join(
        options.out ?? buildCache,
        `${beforeCommit.slice(0, 12)}..${afterCommit.slice(0, 12)}`,
    );
    mkdirSync(outDir, { recursive: true });

    const subject = (commit) => git("log", "-1", "--format=%s", commit).slice(0, 72);

    console.log("Comparing stories");
    console.log(`  before   ${beforeCommit.slice(0, 12)}  ${beforeRef}`);
    console.log(`           ${subject(beforeCommit)}`);
    if (beforeNote) {
        console.log(`           ${beforeNote}`);
    }
    console.log(`  after    ${afterCommit.slice(0, 12)}  ${afterRef}`);
    console.log(`           ${subject(afterCommit)}`);
    console.log(`  output   ${outDir}`);
    console.log("");

    const dirFor = (ref, commit) => {
        const supplied =
            options.storybooks.get(ref) ??
            options.storybooks.get(commit) ??
            options.storybooks.get(commit.slice(0, 12));

        if (supplied) {
            // Said out loud because nothing checks that the directory holds what the commit says:
            // --storybook is a promise the caller is making.
            console.log(`  ${commit.slice(0, 12)}  using the Storybook you supplied at ${supplied}`);
            return supplied;
        }

        return storybookFor(commit, buildCache, options.keep);
    };

    const beforeDir = dirFor(beforeRef, beforeCommit);
    const afterDir = dirFor(afterRef, afterCommit);

    const idsIn = (dir) => {
        const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
        return new Map(
            Object.values(index.entries)
                .filter((entry) => entry.type === "story")
                .map((entry) => [entry.id, `${entry.title} ${entry.name}`]),
        );
    };

    const beforeIds = idsIn(beforeDir);
    const afterIds = idsIn(afterDir);

    const onlyBefore = [...beforeIds.keys()].filter((id) => !afterIds.has(id));
    const onlyAfter = [...afterIds.keys()].filter((id) => !beforeIds.has(id));

    let ids = [...beforeIds.keys()].filter((id) => afterIds.has(id));
    if (options.stories) {
        ids = ids.filter((id) => options.stories.some((piece) => id.includes(piece)));
    }

    if (ids.length === 0) {
        console.error("compare-stories: nothing to compare -- no story matched, or the two have none in common");
        process.exit(1);
    }

    const beforeServer = await serve(beforeDir);
    const afterServer = await serve(afterDir);
    const browser = await chromium.launch();

    const makeContext = async (frozen) => {
        const context = await browser.newContext({
            userAgent: CHROMATIC_USER_AGENT,
            viewport: VIEWPORT,
            deviceScaleFactor: 1,
        });
        await context.addInitScript(watchStoryOutcome);
        if (frozen) {
            await context.addInitScript(blockFrames);
        }
        return context;
    };

    const live = await makeContext(false);
    const frozen = options.seed ? await makeContext(true) : null;

    const stories = [];

    try {
        for (const [position, id] of ids.entries()) {
            const started = Date.now();
            const before = await renderLive(live, beforeServer.url, id, join(outDir, `${id}-before.png`));
            const after = await renderLive(live, afterServer.url, id, join(outDir, `${id}-after.png`));

            const beforeCloud = toCloud(before);
            const afterCloud = toCloud(after);

            const story = {
                id,
                title: beforeIds.get(id),
                before,
                after,
                figureBefore: before.ran ? arrangementFigure(beforeCloud, before.edges ?? []) : null,
                figureAfter: after.ran ? arrangementFigure(afterCloud, after.edges ?? []) : null,
                distance: before.ran && after.ran ? arrangementDistance(beforeCloud, afterCloud) : null,
                camera: cameraMove(before, after),
                pixels:
                    before.ran && after.ran
                        ? comparePictures(
                              join(outDir, `${id}-before.png`),
                              join(outDir, `${id}-after.png`),
                              join(outDir, `${id}-diff.png`),
                          )
                        : { differing: null, total: null, note: "one of the two never rendered" },
            };

            // A story that drew no graph has no layout to ask about, and asking costs the seed
            // pass its full timeout twice: 90 wasted seconds per panel or swatch grid.
            if (frozen && beforeCloud.size > 0 && afterCloud.size > 0) {
                // Both sides of this are ENGINE coordinates: a page with no frames has no mesh
                // anywhere but the origin, and comparing engine against mesh would be comparing
                // two different spaces.
                story.seedBefore = movementFromSeed(await renderSeed(frozen, beforeServer.url, id), before);
                story.seedAfter = movementFromSeed(await renderSeed(frozen, afterServer.url, id), after);
            }

            story.verdict = verdictFor(story);
            stories.push(story);

            console.log(
                `[${String(position + 1).padStart(3)}/${ids.length}] ${String(Math.round((Date.now() - started) / 1000)).padStart(3)}s  ` +
                    `${story.verdict.padEnd(31)} ${id}`,
            );
        }
    } finally {
        await live.close();
        if (frozen) {
            await frozen.close();
        }
        await browser.close();
        await beforeServer.close();
        await afterServer.close();
    }

    const order = ["did not run", "genuinely different", "moved but equivalently arranged", "identical"];
    console.log("\n" + "=".repeat(96));

    for (const verdict of order) {
        const group = stories.filter((story) => story.verdict === verdict);
        if (group.length === 0) {
            continue;
        }
        console.log(`\n${verdict.toUpperCase()}  --  ${group.length} ${group.length === 1 ? "story" : "stories"}\n`);
        for (const story of group) {
            console.log(describe(story));
            console.log("");
        }
    }

    console.log("=".repeat(96));
    for (const verdict of order) {
        const count = stories.filter((story) => story.verdict === verdict).length;
        console.log(`  ${String(count).padStart(4)}  ${verdict}`);
    }
    if (onlyBefore.length > 0) {
        console.log(`  ${String(onlyBefore.length).padStart(4)}  only at ${beforeCommit.slice(0, 12)}: ${onlyBefore.slice(0, 6).join(" ")}`);
    }
    if (onlyAfter.length > 0) {
        console.log(`  ${String(onlyAfter.length).padStart(4)}  only at ${afterCommit.slice(0, 12)}: ${onlyAfter.slice(0, 6).join(" ")}`);
    }

    // The coordinates themselves are left out: a suite of this size carries hundreds of thousands
    // of them, and every question the report answers is answered by the readings.
    const readings = stories.map((story) => ({
        id: story.id,
        title: story.title,
        verdict: story.verdict,
        arrangementFigure: { before: story.figureBefore, after: story.figureAfter },
        arrangementDistance: story.distance,
        movedFromSeed: { before: story.seedBefore ?? null, after: story.seedAfter ?? null },
        layout: { before: story.before.layout ?? null, after: story.after.layout ?? null },
        camera: story.camera,
        pixels: story.pixels,
        nodes: { before: (story.before.nodes ?? []).length, after: (story.after.nodes ?? []).length },
        edges: { before: (story.before.edges ?? []).length, after: (story.after.edges ?? []).length },
        rendered: { before: story.before.ran ? null : story.before.why, after: story.after.ran ? null : story.after.why },
        stillMoving: { before: story.before.unsettled ?? null, after: story.after.unsettled ?? null },
    }));

    writeFileSync(
        join(outDir, "report.json"),
        `${JSON.stringify({ before: beforeCommit, after: afterCommit, note: beforeNote, stories: readings }, null, 2)}\n`,
    );
    console.log(`\n  the full reading, story by story: ${join(outDir, "report.json")}`);
}

await main();
