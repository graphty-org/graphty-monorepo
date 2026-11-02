/*
 * This package must keep "vitest" in its own devDependencies, even though no source file
 * imports it by name. Deleting it brings back a hang that costs days to diagnose.
 *
 * What went wrong: every browser-mode project below -- browser, interactions and storybook --
 * printed the "RUN v3.2.7" banner and then produced no further output, forever. No test names,
 * no failures, no exit. The Node-only projects, default and llm-regression, were unaffected.
 *
 * Why: @vitest/browser injects `resolve: { dedupe: ["vitest"] }` into the Vite server it
 * starts, so the page in Chromium loads whichever copy of the "vitest" package Vite resolves
 * starting from this directory. The Node side, meanwhile, is whichever `vitest` executable the
 * shell found first on PATH. Those are two independent lookups. pnpm's store can legitimately
 * hold more than one instance of the same vitest version -- they differ only in how a
 * transitive peer resolved -- and this package declared no vitest at all, so the executable
 * came from a stray hoisted shim in node_modules/.bin that belonged to a different instance
 * than the package Vite deduped to. Two copies of vitest in one page never complete the
 * tester-to-orchestrator handshake, and a run that never gets an answer never prints and never
 * exits.
 *
 * The fix: declaring vitest here makes pnpm create both node_modules/vitest and
 * node_modules/.bin/vitest from the same instance, so the executable and the deduped package
 * cannot drift apart. Every other package in this monorepo that runs vitest already declares
 * it; this one invoked it from 27 scripts and relied on hoisting.
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

import { withFeaturesOn } from "../tools/features-on.mjs";
import { shardCacheDir } from "../tools/test-slots.mjs";
import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { PRODUCTION, visualStoryTest } from "../visual-review/capture/story-test.mjs";
import { baseTest } from "../vitest.base.mjs";
import { isTileServer, mapTileCommands } from "../vitest.map-tiles.mjs";

/**
 * Each pre-push gate shard's own Vite dependency cache (tools/test-slots.mjs shardCacheDir()), set
 * on every browser project below, since none extends the root. The gate runs several shards of
 * this package side by side in one checkout; sharing a cache, a stale one is re-optimized by every
 * shard at once, each deleting chunks the others load ("error when mocking a module", "The file
 * does not exist ... in the optimize deps directory", issue #3319). Outside the gate, Vite's
 * default directory.
 *
 * Every browser project also sets `optimizeDeps.force`, so each run scans the test files and
 * bundles their dependencies before the first test page loads. Without it Vite trusts a cache an
 * earlier run in the same checkout wrote, as long as the lockfile and this config are unchanged
 * ("Hash is consistent. Skipping."), and a test file or import that arrived since -- by a merge of
 * master, a new test, an edit -- is found mid-run: Vite re-bundles, reloads the page under the
 * running test, and the run stops with "Vite unexpectedly reloaded a test" (#5134). The scan costs
 * a few seconds a run; the shard directories above keep side-by-side runs from deleting each
 * other's bundles.
 */
const SHARD_CACHE_DIR = shardCacheDir();

/**
 * The "minimum-work" project's files: the tests of "the picture is final" written for the issues
 * where work split across frames escaped it (#3287, #3361, #3372, #3527, #3528, #3531, #3533, #4218, #5140),
 * and the frame reads of tests that once read a frame too early (#1473). Not layout-pace.test.ts: it
 * counts a slow frame's layout catch-up rounds, which this mode turns off by design.
 */
const MINIMUM_WORK_TESTS = [
    "test/browser/pending-work-split-across-frames.test.ts",
    "test/browser/stable-frame-waits-for-framing.test.ts",
    "test/browser/stable-frame-waits-for-work-that-came-late.test.ts",
    "test/browser/stable-frame-rechecks-work-after-the-pass.test.ts",
    "test/browser/stable-frame-follows-camera-moves.test.ts",
    "test/browser/a-label-redraws-when-its-font-loads.test.ts",
    "test/browser/a-glyph-and-an-annotation-redraw-when-their-font-loads.test.ts",
    "test/browser/an-image-annotation-is-in-the-stable-frame.test.ts",
    "test/browser/simulation-owed-pre-steps.test.ts",
    "test/browser/camera/owed-fit-reads-late-inputs.test.ts",
    "test/browser/camera/view-insets.test.ts",
    "test/browser/groups-follow-members.test.ts",
    "test/browser/label-declutter.test.ts",
    "test/browser/curves-rest-the-same-however-frames-split.test.ts",
    "test/interactions/stable-frame-waits-for-pending-visuals.test.ts",
    "test/browser/a-layer-added-later-paints.test.ts",
    "test/browser/framing-sizes-screen-labels-for-its-camera.test.ts",
    "test/browser/label-textures-fit-across-frames.test.ts",
];

/**
 * Babylon modules the element imports only for their side effects (see
 * test/packaging/babylon-side-effects.test.ts). Pre-bundled in every browser project: a
 * dependency Vite discovers mid-run makes it reload the page under the test that is running.
 */
const BABYLON_SIDE_EFFECTS = [
    "@babylonjs/core/Meshes/instancedMesh.js",
    "@babylonjs/core/Meshes/thinInstanceMesh.js",
    "@babylonjs/core/Culling/ray.js",
    "@babylonjs/core/Animations/animatable.js",
    // src/meshes/bundledStandardShaders.ts
    "@babylonjs/core/Shaders/default.vertex.js",
    "@babylonjs/core/Shaders/default.fragment.js",
    "@babylonjs/core/ShadersWGSL/default.vertex.js",
    "@babylonjs/core/ShadersWGSL/default.fragment.js",
];

/**
 * The lodash functions the element imports one by one (`lodash/cloneDeep.js`, ...). Pre-bundled
 * in every browser project for the same reason: a dep cache written before an import was added
 * still matches this config's hash, so Vite skips its scan, finds the import mid-run and
 * re-optimizes. That re-optimization deletes the pre-bundled Babylon shader chunks
 * (`default.vertex-<hash>.js`) a running test is about to import, the shader never compiles, and
 * every test waiting on a drawn frame times out. Add a new lodash import here.
 */
const LODASH_FUNCTIONS = [
    "lodash/cloneDeep.js",
    "lodash/debounce.js",
    "lodash/defaultsDeep.js",
    "lodash/get.js",
    "lodash/isEqual.js",
    "lodash/omit.js",
];

/**
 * The workspace packages, which resolve to their built dist/ outside node_modules. Vitest
 * transforms every module outside node_modules, so in the Node projects it would run each of
 * these packages' megabytes of built code through its transform pipeline on first import; they
 * are loaded as plain Node modules instead, like any other dependency.
 */
const WORKSPACE_DIST = /\/(graph-format|graph-io|graph-samples|algorithms|layout|webgpu-graph-algorithms)\/dist\//;

/**
 * The optional Graphviz package, which only the Graphviz layouts' Worker imports. Discovered
 * there mid-run, Vite re-optimizes its dependencies and deletes the chunks the page already
 * holds, and Babylon's next lazy shader import fails to fetch.
 */
const GRAPHVIZ = ["@hpcc-js/wasm-graphviz"];

/**
 * What the model chunk (src/models/chunk.ts) imports from Babylon.js, pre-bundled for the same
 * reason: the chunk is imported lazily, so Vite would otherwise discover these mid-run.
 */
const MODEL_CHUNK = [
    "@babylonjs/loaders/glTF/2.0/glTFLoader.js",
    "@babylonjs/loaders/glTF/glTFFileLoader.js",
    "@babylonjs/loaders/glTF/glTFValidation.js",
    "@babylonjs/loaders/OBJ/objFileLoader.js",
    "@babylonjs/loaders/STL/stlFileLoader.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_transform.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_unlit.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_pbrSpecularGlossiness.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_clearcoat.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_ior.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_specular.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_sheen.js",
    "@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js",
    "@babylonjs/core/Materials/PBR/pbrMaterial.js",
    "@babylonjs/loaders/glTF/2.0/pbrMaterialLoadingAdapter.js",
    "@babylonjs/core/Animations/animationGroup.js",
    "@babylonjs/loaders/glTF/2.0/glTFLoaderAnimation.js",
    "@babylonjs/core/Shaders/pbr.vertex.js",
    "@babylonjs/core/Shaders/pbr.fragment.js",
    "@babylonjs/core/ShadersWGSL/pbr.vertex.js",
    "@babylonjs/core/ShadersWGSL/pbr.fragment.js",
    "@babylonjs/core/Shaders/rgbdDecode.fragment.js",
    "@babylonjs/core/ShadersWGSL/rgbdDecode.fragment.js",
    "@babylonjs/core/Shaders/postprocess.vertex.js",
    "@babylonjs/core/ShadersWGSL/postprocess.vertex.js",
    "@babylonjs/core/Misc/tools.js",
    "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader.js",
    "@babylonjs/core/Materials/Textures/cubeTexture.js",
    "@babylonjs/core/Materials/Textures/baseTexture.js",
    "@babylonjs/core/Materials/Textures/texture.js",
    "@babylonjs/core/Loading/sceneLoader.js",
    "@babylonjs/core/Loading/sceneLoaderFlags.js",
    // The model template builder and the request guard (src/models/).
    "@babylonjs/core/Maths/math.color.js",
    "@babylonjs/core/Maths/math.vector.js",
    "@babylonjs/core/Meshes/Builders/boxBuilder.js",
    "@babylonjs/core/Meshes/mesh.js",
    "@babylonjs/core/Meshes/mesh.vertexData.js",
    "@babylonjs/core/Meshes/instancedMesh.js",
    "@babylonjs/core/Instrumentation/sceneInstrumentation.js",
];

/**
 * The element's own dependencies, pre-bundled up front by the projects that run other engines:
 * discovered mid-run, Vite re-optimizes and reloads the page under the running test.
 */
const ELEMENT_DEPENDENCIES = [
    "lit",
    "lit/decorators.js",
    "zod",
    "zod/v4",
    "zod/v4/core",
    "jmespath",
    "ngraph.forcelayout",
    "ngraph.graph",
    "ngraph.random",
    "d3-force-3d",
    "colorjs.io",
    "hammerjs",
    "p-queue",
    "toposort",
];

/** Everything the browser projects pre-bundle up front. */
const PREBUNDLED = [...BABYLON_SIDE_EFFECTS, ...LODASH_FUNCTIONS, ...GRAPHVIZ, ...MODEL_CHUNK];

/** The browser tests that exercise WebXR: the "xr" project runs them and "browser" does not. */
const XR_BROWSER_TESTS = [
    "test/browser/xr-session.test.ts",
    "test/browser/XRUIManager.test.ts",
    "test/browser/NodeBehavior-xr-compatibility.test.ts",
];

const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * First in the setupFiles of every browser project that runs one file at a time under --coverage:
 * frees the previous test files' pages, which V8 precise coverage otherwise keeps alive for the
 * whole run (issue #2247).
 */
const BROWSER_COVERAGE_SETUP = path.join(dirname, "../vitest.browser-coverage-setup.ts");

/**
 * In every browser project's `setupFiles`, with `mapTileCommands` in its `commands`: map tiles come
 * from a local fixture, never a tile server (vitest.map-tiles.mjs).
 */
const MAP_TILES_SETUP = path.join(dirname, "../vitest.map-tiles-setup.ts");

/** A request held open: the part of a Playwright route these commands use. */
interface HeldRoute {
    continue(): Promise<void>;
    abort(code?: string): Promise<void>;
}

/**
 * Answers a held request as it was released.
 * @param route - the request.
 * @param refuse - whether to refuse it, as an unreachable server does.
 * @returns when it is answered.
 */
const answer = (route: HeldRoute, refuse: boolean): Promise<void> =>
    refuse ? route.abort("connectionrefused") : route.continue();

/** The requests a test holds open, by the piece of URL it named, until it lets them go. */
const held = new Map<
    string,
    {
        matches: (url: URL) => boolean;
        routes: HeldRoute[];
        arrived: Promise<void>;
        refuse: boolean | null;
    }
>();

/**
 * The commands that hold requests open until a test lets them go, so a test orders two loads by
 * the page's own requests rather than by a clock. In the `interactions` project's `commands`.
 */
const heldRequestCommands: {
    holdRequests: BrowserCommand<[fragment: string]>;
    releaseRequests: BrowserCommand<[fragment: string, refuse: boolean]>;
} = {
    /**
     * Holds every request whose URL holds `fragment`, unanswered, until it is released.
     * @param ctx - the browser command context.
     * @param fragment - a piece of the URL.
     */
    async holdRequests(ctx, fragment) {
        const routes: HeldRoute[] = [];
        let arrive = (): void => undefined;
        const arrived = new Promise<void>((resolve) => {
            arrive = resolve;
        });
        const matches = (url: URL): boolean => url.href.includes(fragment);
        const entry = { matches, routes, arrived, refuse: null as boolean | null };
        held.set(fragment, entry);
        await ctx.page.route(matches, async (route) => {
            if (entry.refuse === null) {
                routes.push(route);
                arrive();
            } else {
                // Asked for after the release: answered the same way at once.
                await answer(route, entry.refuse);
            }
        });
    },
    /**
     * Once a held request has come, lets every one go: answered as the page asked, or refused as an
     * unreachable server refuses it. Later ones are no longer held.
     * @param ctx - the browser command context.
     * @param fragment - the piece of the URL they were held by.
     * @param refuse - whether to refuse them.
     */
    async releaseRequests(ctx, fragment, refuse) {
        const entry = held.get(fragment);
        if (entry === undefined) {
            return;
        }

        held.delete(fragment);
        await entry.arrived;
        entry.refuse = refuse;
        await Promise.all(entry.routes.map((route) => answer(route, refuse)));
        await ctx.page.unroute(entry.matches);
    },
};

/**
 * The pictures the style fidelity samples name by a URL on the internet (a Cytoscape custom graphic or image
 * annotation pointing at the cytoscape.js logo), each answered from a copy committed beside the samples
 * (graph-io/test/fidelity/pictures/), so what graphty draws, and how it scores, never depends on the network. Any
 * other internet request a fidelity run makes is refused, and the harness fails the sample naming the URL.
 */
const SAMPLE_PICTURES: Readonly<Record<string, string>> = {
    "https://raw.githubusercontent.com/cytoscape/cytoscape.js/master/documentation/img/cytoscape-logo.png":
        "../graph-io/test/fidelity/pictures/cytoscape-logo.png",
};

/** Hosts the test server answers itself: never the internet. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/**
 * Whether a request goes to the internet.
 * @param url - the request's URL.
 * @returns true for an http(s) URL on a host other than the test server's.
 */
const isInternet = (url: URL): boolean =>
    (url.protocol === "http:" || url.protocol === "https:") && !LOCAL_HOSTS.has(url.hostname);

/** A picture's media type, from its file's extension. */
const PICTURE_TYPES: Readonly<Record<string, string>> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
};

/**
 * The browser contexts the sample pictures are served in, and the unmapped internet URLs each refused; `null` while
 * no sample is loading, when the route leaves every unmapped request to the routes before it (the browser project
 * shares one context across its files, and the map tile guard must keep seeing its own requests).
 */
const refusedPictures = new WeakMap<object, string[] | null>();

/**
 * The commands the style fidelity harness (test/fidelity/mount.ts) runs around loading a sample, in the `fidelity`
 * and `browser` projects' `commands`.
 */
const samplePictureCommands: {
    serveSamplePictures: BrowserCommand<[]>;
    takeRefusedSamplePictures: BrowserCommand<[]>;
} = {
    /**
     * Answers every sample picture's URL from its committed copy, and refuses (and records) any other request to the
     * internet, until `takeRefusedSamplePictures` ends the load; a map tile server is left to the map tile fixture
     * (vitest.map-tiles.mjs). The route is installed once per browser context.
     * @param ctx - the browser command context.
     */
    async serveSamplePictures(ctx) {
        const installed = refusedPictures.has(ctx.context);
        refusedPictures.set(ctx.context, []);
        if (installed) {
            return;
        }
        const pictures = new Map(
            Object.entries(SAMPLE_PICTURES).map(([url, file]) => [
                url,
                {
                    body: readFileSync(path.resolve(dirname, file)),
                    contentType: PICTURE_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
                },
            ]),
        );
        await ctx.context.route(isInternet, (route) => {
            const url = route.request().url();
            const picture = pictures.get(url);
            if (picture !== undefined) {
                return route.fulfill({ status: 200, ...picture });
            }
            const refused = refusedPictures.get(ctx.context);
            if (!refused || isTileServer(url)) {
                return route.fallback();
            }
            refused.push(url);
            return route.abort("blockedbyclient");
        });
    },
    /**
     * Ends a sample's load: the internet requests refused during it. Requests after it are no longer refused.
     * @param ctx - the browser command context.
     * @returns their URLs.
     */
    takeRefusedSamplePictures(ctx) {
        const urls = refusedPictures.get(ctx.context) ?? [];
        refusedPictures.set(ctx.context, null);
        return urls;
    },
};

/**
 * The package's published names, resolved to its own source. The docs' examples
 * (docs/examples/) import `@graphty/graphty-element`, `/extend` and `/logging` exactly as a reader
 * copies them, and the tests that run those examples must run the code under test, not a stale
 * dist/.
 */
const OWN_ENTRY_POINTS = {
    "@graphty/graphty-element/extend": path.resolve(dirname, "extend.ts"),
    "@graphty/graphty-element/logging": path.resolve(dirname, "logging.ts"),
    // Last, so the subpaths above match first.
    "@graphty/graphty-element": path.resolve(dirname, "index.ts"),
};

/**
 * The Chromium flag sets that expose WebGPU to the `browser` project.
 *
 * Copied from `webgpu-graph-algorithms/vitest.config.ts`, where they are the measured answer to
 * "which switches make headless Chromium hand back an adapter": `nvidia` reaches the card through
 * ANGLE's Vulkan backend, `swiftshader` names the software adapter explicitly because the two
 * ANGLE switches alone left `requestAdapter()` null on one host, and `metal` and `warp` are the
 * macOS and Windows legs of the host-matrix workflow.
 *
 * This table must know EVERY value any workflow puts in GRAPHTY_BROWSER_GPU, whether or not that
 * job runs the element's tests. `.github/workflows/hosts.yml` sets the variable for the whole job
 * -- `metal` on macOS, `warp` on Windows -- and Nx loads every project's config to build its
 * project graph, so an unknown value threw here and took down `nx run-many -t build` for two
 * packages that have nothing to do with this one (pull request #21, run 35966670855: "failed to
 * load config from ...graphty-element/vitest.config.ts", then "Failed to process project graph",
 * on macOS and Windows only). `test/config/vitest-config-loads-with-ci-gpu-values.test.ts` loads
 * this file under each of those values so the next one is caught on Linux.
 *
 * With GRAPHTY_BROWSER_GPU unset the project launches with NO flags, which is what the five CI
 * shards do and why they see no WebGPU at all: the element's browser tests run against the fake
 * accelerator, and only `test/browser/webgpu-layout.test.ts` asks for a real one.
 */
const BROWSER_GPU_FLAGS: Readonly<Record<string, readonly string[]>> = {
    nvidia: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--disable-vulkan-surface"],
    swiftshader: [
        "--enable-unsafe-webgpu",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--use-webgpu-adapter=swiftshader",
    ],
    // The host matrix on macOS: Dawn's Metal backend when headless Chromium reaches the VM's
    // device with the blocklist ignored, SwiftShader otherwise.
    metal: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--use-angle=metal"],
    // The host matrix on Windows: Dawn's D3D12 backend on WARP, Microsoft's software rasterizer.
    // An ANGLE override hides WARP even in the full Chromium build, so this set names none.
    warp: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"],
};

/**
 * Flag sets that need a Playwright channel rather than its default headless shell.
 *
 * Measured in `webgpu-graph-algorithms/vitest.config.ts`: on windows-latest the headless shell
 * hands back no adapter under the `warp` flags, and the full Chromium build is the only one that
 * grants WARP. Without this the `browser` project would launch, see no WebGPU, and fail
 * `test/browser/webgpu-layout.test.ts` -- which runs whenever the variable is set at all.
 */
const BROWSER_GPU_CHANNEL: Readonly<Record<string, string>> = { warp: "chromium" };

/** Which flag set was asked for, or "" for none -- also what the test file reads to skip itself. */
const browserGpu = process.env.GRAPHTY_BROWSER_GPU ?? "";

/**
 * The environment of the Chromium child.
 *
 * On a workstation whose NVIDIA userspace is not where Chromium looks, headless Chromium finds
 * the card only with an extracted libEGL tree ahead of it on LD_LIBRARY_PATH.
 * GRAPHTY_EGL_LIB_DIR names that tree; unset, Playwright inherits the environment untouched.
 * @returns The environment map for `launchOptions.env`, or undefined to inherit.
 */
function browserLaunchEnv(): Record<string, string> | undefined {
    const eglDir = process.env.GRAPHTY_EGL_LIB_DIR;
    if (eglDir === undefined || eglDir === "") {
        return undefined;
    }

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
            env[key] = value;
        }
    }

    env.LD_LIBRARY_PATH = [eglDir, process.env.LD_LIBRARY_PATH]
        .filter((value) => value !== undefined && value !== "")
        .join(":");

    return env;
}

/** One Playwright Chromium entry for a browser project's `instances`. */
interface ChromiumInstance {
    /** The browser to launch. */
    browser: "chromium";
    /** The provider carrying Playwright's launch options: the switches, the build and the environment. */
    provider?: ReturnType<typeof playwright>;
}

/**
 * The `browser` project's Chromium instance, with the requested flag set when there is one.
 * @returns The single instance entry.
 */
function browserInstance(): ChromiumInstance {
    if (browserGpu === "") {
        return { browser: "chromium" };
    }

    const args = BROWSER_GPU_FLAGS[browserGpu];
    if (args === undefined) {
        // A typo would otherwise launch Chromium with no flags while the test file still believes
        // it is on a GPU lane, and the suite would die on "an accelerator to attach" naming
        // nothing. Say which value was not understood instead.
        throw new Error(
            `GRAPHTY_BROWSER_GPU="${browserGpu}" names no flag set; use ${Object.keys(BROWSER_GPU_FLAGS).join(" or ")}, or leave it unset to run without WebGPU`,
        );
    }

    return {
        browser: "chromium",
        provider: playwright({
            launchOptions: { args: [...args], channel: BROWSER_GPU_CHANNEL[browserGpu], env: browserLaunchEnv() },
        }),
    };
}

/**
 * Where a failing browser test's screenshot goes.
 *
 * Vitest saves a PNG for every browser-mode failure, and its default place for one is a
 * `__screenshots__` directory beside the test file. That put roughly fifteen of them under
 * `test/`, which this package's CLAUDE.md forbids: a directory under `test/` is for files
 * meant to be committed, and these are not -- they are failure diagnostics, looked at once
 * and thrown away, and the root .gitignore has had to ignore every `__screenshots__` directory
 * in the repository to keep them out of a commit.
 *
 * So they go to `tmp/` instead, which is where this repository keeps every other scratch
 * artifact and which .gitignore already covers. Absolute, because vitest resolves a relative
 * screenshot directory against the PROCESS working directory, and that is this package under
 * `npx vitest` but the repository root under an Nx run.
 */
const FAILURE_SCREENSHOT_DIR = path.resolve(dirname, "tmp/vitest-screenshots");

/**
 * Append a `bench-browser` timing row to `benchmarks/results/browser-<host>.jsonl`. Every other
 * console line is left to the reporter.
 * @param log - one console line from a test
 * @returns undefined, so the line is still printed
 */
function appendBenchRow(log: string): undefined {
    const prefix = "bench-row ";
    if (log.startsWith(prefix)) {
        const dir = path.resolve(dirname, "benchmarks/results");
        mkdirSync(dir, { recursive: true });
        appendFileSync(path.join(dir, `browser-${hostname()}.jsonl`), `${log.slice(prefix.length).trim()}\n`);
    }

    return undefined;
}

/**
 * Screenshots taken inside the story tests (visual-review's story-test harness), off unless
 * VISUAL_REVIEW_STORY_OUT names the directory this run's partial capture goes to: the storybook
 * project then runs with production semantics, shoots every story and mode at the end of its test
 * and compares it with its baseline, as `visual-review capture` does with the built Storybook.
 */
const VISUAL = process.env.VISUAL_REVIEW_STORY_OUT
    ? visualStoryTest({ project: "graphty-element", out: path.resolve(process.env.VISUAL_REVIEW_STORY_OUT) })
    : null;

/**
 * The version a project file's `generator` names (src/session/runs/engine.ts), as the builds set
 * it. Every project sets it, since an inline project does not inherit the root's `define`, and each
 * gets its own copy, since vitest deletes the keys from the object it is handed.
 */
const define = {
    __GRAPHTY_ELEMENT_VERSION__: JSON.stringify(
        (JSON.parse(readFileSync(path.join(dirname, "package.json"), "utf8")) as { version: string }).version,
    ),
};

const config = defineConfig({
    test: {
        ...baseTest({ reporters: ["default", ...(VISUAL ? [VISUAL.reporter] : [])] }),
        onConsoleLog: appendBenchRow,
        // Vitest 4 also copies each failure screenshot into an attachments directory, by default
        // .vitest-attachments/ beside this file. Same diagnostics, same place as the screenshots.
        attachmentsDir: path.resolve(dirname, "tmp/vitest-attachments"),
        projects: [
            {
                define: { ...define },
                test: {
                    // Timing benchmarks, kept out of the coverage-collecting "default" project
                    // because instrumentation makes a stopwatch measure the instrumentation. Run
                    // with: npx vitest run --project=bench. They gate no push: CI runs them in
                    // ci.yml's advisory "performance" job, because a stopwatch on a busy machine
                    // measures the machine.
                    //
                    // What keeps them uninstrumented is that no coverage script names this
                    // project -- every one of them lists --project=default --project=mesh. A
                    // `coverage: { enabled: false }` used to sit here saying so, but coverage is a
                    // root-only option: vitest ignored it at run time and its types rejected it.
                    name: "bench",
                    setupFiles: ["./test/setup.ts"],
                    include: ["test/**/*.bench.test.ts"],
                    // One file at a time: a benchmark timed beside another measures the other.
                    fileParallelism: false,
                    // A browser benchmark needs a page, which this project has not got: it runs in
                    // "browser-bench" below.
                    exclude: ["test/browser/**", "**/node_modules/**"],
                },
            },
            {
                define: { ...define },
                resolve: { alias: OWN_ENTRY_POINTS },
                test: {
                    name: "default",
                    server: { deps: { external: [WORKSPACE_DIST] } },
                    setupFiles: ["./test/setup.ts"],
                    include: ["test/**/*.test.ts", "test/unit/**/*.test.ts", "test/integration/**/*.test.ts"],
                    exclude: [
                        // Timing benchmarks, which run as their own project -- see "bench" above.
                        // CI runs this project with --coverage, and v8 coverage instruments this
                        // package's own source while leaving node_modules alone. That breaks a
                        // benchmark in both directions at once: absolute milliseconds stop meaning
                        // milliseconds, and a ratio against a reference living in node_modules
                        // flatters the reference, because only the measured side is instrumented.
                        // There is no runtime signal a test could branch on -- the v8 provider sets
                        // no environment variable and no global -- so the split is structural.
                        "test/**/*.bench.test.ts",
                        // These tests require DOM APIs and should run in browser environment
                        "test/managers/DataManager.test.ts",
                        "test/managers/LayoutManager.test.ts",
                        "test/managers/LifecycleManager.test.ts",
                        "test/managers/UpdateManager.test.ts",
                        "test/managers/SelectionManager.test.ts",
                        // The mesh lane runs as the "mesh" project below, not here, because it needs a
                        // document and this project has no DOM. RichTextLabel measures text through
                        // document.createElement("canvas"), so a mesh test that drives the real classes
                        // dies here with `ReferenceError: document is not defined` at
                        // RichTextLabel._calculateDimensions (reproduced 2026-09-21: 43 of the 59 cases in
                        // real-mesh-simple.test.ts, which is why that one file used to be the only
                        // exclusion). The rest of test/mesh-testing/ passed here only because it drove
                        // mocks that never imported src/meshes at all; as those are re-pointed at the real
                        // classes they need a document too, so the whole directory moves together.
                        "test/mesh-testing/**/*.test.ts",
                        // Edge tests require browser (hammerjs dependency)
                        "test/Edge.bezier.test.ts",
                        "test/edge-cases/**/*.test.ts",
                        "test/integration/Edge.integration.test.ts",
                        // Browser-only tests
                        "test/browser/**/*.test.ts",
                        "test/fidelity/fidelity.test.ts",
                        "test/fidelity/oracle-report.test.ts",
                        "test/fidelity/mutants.test.ts",
                        // Interaction tests require browser environment
                        "test/interactions/**/*.test.ts",
                        // Performance tests need DOM and should run in browser
                        "test/performance/**/*.test.ts",
                        // Examples that need browser environment
                        "test/examples/**/*.test.ts",
                        // LLM regression tests run via dedicated project
                        "test/ai/llm-regression/**/*.test.ts",
                        // Lifecycle tests launch their own browsers: see the "lifecycle" project
                        "test/lifecycle/**",
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                },
            },
            {
                // The mesh lane: Babylon's NullEngine in Node, driving the real NodeMesh, EdgeMesh,
                // MeshCache and RichTextLabel. It is a project of its own for two reasons.
                //
                // It needs a canvas and a document, which the "default" project has not got, and it must
                // load test/mesh-testing/test-setup.ts INSTEAD OF ./test/setup.ts rather than as well as:
                // test/setup.ts's global afterEach calls document.querySelectorAll("canvas") behind a
                // `typeof document !== "undefined"` guard, and the minimal document this setup installs
                // defines no querySelectorAll, so loading both fails every test in the project with
                // `document.querySelectorAll is not a function`.
                //
                // It replaces test/mesh-testing/vitest-mesh.config.ts, a second config nothing in CI,
                // tools/, nx.json or project.json referenced. Under it these 601 cases ran only when
                // somebody typed `npm run test:mesh` by hand; the 542 that drove mocks also ran inside
                // "default", in an environment with no document, which is the split that made the one
                // file driving real classes the one file no gate ran. One home now: --project=mesh, the
                // pre-push gate (tools/prepush.sh), and CI's graphty-element-default shard.
                //
                // test/mesh-testing/real-mesh-simple.test.ts deliberately ALSO runs in the "browser"
                // project. Here its canvas is the polyfill, whose measureText is text.length * 8; there it
                // is a real Chromium canvas. Neither reading replaces the other.
                define: {
                    // Carried over verbatim from the config this replaces, and load-bearing rather than
                    // decorative: `global` -> `globalThis` is what lets the setup file install its
                    // polyfills, and `window` -> `globalThis` is what makes that file's
                    // `typeof window === "undefined"` guard false so it does not install a second, thinner
                    // window over the real global.
                    global: "globalThis",
                    window: "globalThis",
                    ...define,
                },
                test: {
                    name: "mesh",
                    server: { deps: { external: [WORKSPACE_DIST] } },
                    environment: "node",
                    setupFiles: ["./test/mesh-testing/test-setup.ts"],
                    include: ["test/mesh-testing/**/*.test.ts"],
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                },
            },
            {
                define: { ...define },
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in browser tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                        ...OWN_ENTRY_POINTS,
                    },
                },
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: PREBUNDLED, force: true },
                test: {
                    // The contract lane: the handful of browser tests that read what the element actually
                    // PAINTED -- pixels in the frame buffer, the order style layers landed in, whether a
                    // story's setup was applied at all. They are the tests that would have caught the
                    // labels and the layered styles going missing, and they are named one by one here
                    // rather than matched by a glob because membership is a deliberate decision: this is
                    // the only browser lane the pre-push gate runs, and it is worth about 25 seconds.
                    //
                    // Every file below is ALSO matched by the "browser" project's globs, so CI keeps
                    // running them inside its five browser shards and nothing needs adding there. The
                    // duplication is only visible to a bare `vitest run`, which runs every project.
                    //
                    // Adding a file here costs little -- roughly half of the 25 seconds is the fixed price
                    // of starting a browser project at all -- but a file that needs a settled physics
                    // layout or a video encode does not belong in a gate a person waits on.
                    name: "contract",
                    setupFiles: [MAP_TILES_SETUP, "./test/setup.ts"],
                    include: [
                        "test/browser/label-paint.test.ts",
                        "test/browser/style-layer-ordering.test.ts",
                        "test/browser/first-paint-after-load.test.ts",
                        "test/browser/story-contract.test.ts",
                        // Every story the visual capture snapshots is seeded, pre-stepped and settled. It
                        // imports every story module, which is why it is here and not in "default".
                        "test/browser/story-determinism.test.ts",
                        // Proves a channel the table calls renderable really changes the picture,
                        // which the table-reads-the-table check in
                        // test/session/styles/channels.test.ts cannot: that one asserts the table
                        // said what it said, and is how two tooltip channels came to be published
                        // as drawable and sold in the styling guide while nothing drew them.
                        "test/browser/channel-paints.test.ts",
                        // Reads the shading on a node's surface, which nothing else in the
                        // package can see: the style model, the instance buffer and the mesh all
                        // report the right colour while the lit half of the node is drawn flat.
                        // It is also the only thing that notices if a Babylon upgrade moves the
                        // line of the stock shader that src/meshes/InstanceColorShading.ts
                        // rewrites -- the rewrite then matches nothing, silently.
                        "test/browser/lit-node-is-shaded-not-flooded.test.ts",
                        // The two history twins every undo phase grows: each door of the element,
                        // Graph and managers called with a spy on the dispatcher, and every
                        // renderer round-trip fixture checked against a scene digest. They lay
                        // out in one pass, so they stay inside this lane's budget.
                        "test/browser/doors.test.ts",
                        "test/browser/history-round-trip.test.ts",
                    ],
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    // Disable file parallelism to prevent route.fulfill errors
                    // when browser contexts are garbage collected during parallel execution
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: mapTileCommands,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                define: { ...define },
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in browser tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                        ...OWN_ENTRY_POINTS,
                    },
                },
                // WebXR, in its own project so the pre-push gate can run it without the rest of the
                // browser lane. It starts real immersive VR and AR sessions on an emulated headset
                // (IWER) and checks the element's XR buttons and UI. About a second of tests plus
                // the fixed cost of starting a browser project. These files are excluded from
                // "browser" below, so CI runs them once, through this project, in its browser shards.
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: ["iwer", ...PREBUNDLED], force: true },
                test: {
                    name: "xr",
                    setupFiles: [BROWSER_COVERAGE_SETUP, MAP_TILES_SETUP, "./test/setup.ts"],
                    include: XR_BROWSER_TESTS,
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: mapTileCommands,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                define: { ...define },
                // Timing benchmarks on a real graph in the browser, kept out of "browser" for the
                // reason "bench" is kept out of "default": nothing here runs under coverage, which
                // would time the instrumentation. Like "bench", it gates no push: CI runs it in
                // ci.yml's advisory "performance" job, and by hand with:
                // npx vitest run --project=browser-bench. Not "bench-browser": that is the
                // sets timing rows' project below, which never runs in CI.
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: PREBUNDLED, force: true },
                test: {
                    name: "browser-bench",
                    setupFiles: [MAP_TILES_SETUP, "./test/setup.ts"],
                    include: ["test/browser/**/*.bench.test.ts"],
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: mapTileCommands,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        // `--expose-gc` gives the page `gc()`, which history-scale.bench.test.ts calls
                        // before each timed step so the step is not charged for a collection that
                        // the steps before it made due. Its header has the numbers.
                        // `--enable-precise-memory-info` makes performance.memory exact rather than
                        // bucketed, for the restore memory peak in autosave-write.bench.test.ts.
                        // GRAPHTY_BROWSER_GPU picks the renderer as it does for "browser" (unset: the
                        // software one CI draws with), so a benchmark can be timed on both.
                        provider: playwright({
                            launchOptions: {
                                args: [
                                    ...(BROWSER_GPU_FLAGS[browserGpu] ?? []),
                                    "--js-flags=--expose-gc",
                                    "--enable-precise-memory-info",
                                ],
                                env: browserLaunchEnv(),
                            },
                        }),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                define: { ...define },
                // The env vars that cross into the page. The first is which flag set the run asked for.
                // Naming it as a prefix is what puts it on `import.meta.env` in the browser --
                // Vite copies every matching variable out of the process environment -- and
                // test/browser/webgpu-layout.test.ts skips itself when it is absent, so the five
                // CI shards never try to use a WebGPU that is not there. GRAPHTY_FC_ carries a
                // property test's reproduction seed and path (test/helpers/fc-params.ts).
                // GRAPHTY_UPDATE_RENDER_BUDGET makes test/browser/render-budget.test.ts rewrite its
                // baseline instead of checking against it.
                envPrefix: [
                    "VITE_",
                    "GRAPHTY_BROWSER_GPU",
                    "GRAPHTY_FC_",
                    "GRAPHTY_UPDATE_RENDER_BUDGET",
                    "GRAPHTY_FIDELITY_RECORD",
                ],
                // Pre-bundle IWER up front: discovered mid-run, Vite re-optimizes and reloads the
                // page under the running test (test/browser/xr-session.test.ts imports it).
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: ["iwer", ...PREBUNDLED], force: true },
                resolve: { alias: OWN_ENTRY_POINTS },
                test: {
                    name: "browser",
                    setupFiles: [BROWSER_COVERAGE_SETUP, MAP_TILES_SETUP, "./test/setup.ts"],
                    include: [
                        "test/browser/**/*.test.ts",
                        "test/managers/DataManager.test.ts",
                        "test/managers/LayoutManager.test.ts",
                        "test/managers/LifecycleManager.test.ts",
                        "test/managers/UpdateManager.test.ts",
                        "test/managers/SelectionManager.test.ts",
                        "test/mesh-testing/real-mesh-simple.test.ts",
                        "test/performance/**/*.test.ts",
                        "test/examples/**/*.test.ts",
                        // Edge tests require browser (hammerjs dependency)
                        "test/Edge.bezier.test.ts",
                        "test/edge-cases/**/*.test.ts",
                        "test/integration/Edge.integration.test.ts",
                        // Interaction tests moved to dedicated 'interactions' project
                    ],
                    exclude: [
                        // Interaction tests have their own project
                        "test/interactions/**/*.test.ts",
                        // So do the WebXR tests: see the "xr" project
                        ...XR_BROWSER_TESTS,
                        // And the timing benchmarks: see "browser-bench"
                        "test/browser/**/*.bench.test.ts",
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    // Disable file parallelism to prevent route.fulfill errors
                    // when browser contexts are garbage collected during parallel execution
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: { ...mapTileCommands, ...samplePictureCommands },
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [browserInstance()],
                    },
                },
            },
            {
                // The tests that pin "the picture is final" again, under the minimum-work-per-frame
                // test mode (src/managers/minimumWork.ts, issue #4218): one paint batch and one
                // layout round per frame, every other render tick skipped. A fast machine fits most
                // split work into one frame, so a wait that reads half-finished work is caught here
                // rather than when a slow runner happens to split it. They also run in "browser" and
                // "interactions" at full speed. A new test that reads the final picture of work the
                // element splits across frames belongs in this list too.
                define: { ...define },
                envPrefix: ["VITE_", "GRAPHTY_BROWSER_GPU"],
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: ["iwer", ...PREBUNDLED], force: true },
                resolve: { alias: OWN_ENTRY_POINTS },
                test: {
                    name: "minimum-work",
                    setupFiles: [
                        BROWSER_COVERAGE_SETUP,
                        MAP_TILES_SETUP,
                        "./test/setup.ts",
                        "./test/setup-minimum-work.ts",
                    ],
                    include: MINIMUM_WORK_TESTS,
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: { ...mapTileCommands, ...heldRequestCommands },
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [browserInstance()],
                    },
                },
            },
            {
                // Autosave storage in the engines the "browser" project does not run: the IndexedDB
                // store's contract, aborts and connection closing in Firefox and WebKit, whose
                // IndexedDB differs from Chromium's in exactly the places autosave depends on (where
                // a quota error is reported, how a close treats a running transaction). Chromium
                // runs the same files through "browser", with coverage; v8 coverage cannot
                // instrument these two engines, so this project runs without it. The element's
                // own dependencies are pre-bundled up front, as for "browser": discovered mid-run,
                // Vite re-optimizes and reloads the page under the running test.
                define: { ...define },
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: [...PREBUNDLED, ...ELEMENT_DEPENDENCIES], force: true },
                resolve: { alias: OWN_ENTRY_POINTS },
                test: {
                    name: "autosave-engines",
                    // Beside autosave: graphs that compiled shaders give their contexts back.
                    include: ["test/browser/autosave/**/*.test.ts", "test/browser/shaders/dispose-engines.test.ts"],
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: mapTileCommands,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [
                            {
                                browser: "firefox",
                                // Headless Firefox has no WebGL on a machine whose GL is NVIDIA's
                                // or absent, and the element's tests here need a canvas: Mesa's
                                // software GL through EGL draws it (probed on this repository's
                                // workstation; tmp/work-protection/step5/ffprobe2.mjs).
                                provider: playwright({
                                    launchOptions: {
                                        firefoxUserPrefs: {
                                            "webgl.force-enabled": true,
                                            // persist() waits on a permission prompt nobody answers
                                            // headless; Firefox's own tests answer it this way.
                                            "dom.storageManager.prompt.testing": true,
                                            "dom.storageManager.prompt.testing.allow": true,
                                        },
                                        env: {
                                            ...process.env,
                                            LIBGL_ALWAYS_SOFTWARE: "1",
                                            __GLX_VENDOR_LIBRARY_NAME: "mesa",
                                            __EGL_VENDOR_LIBRARY_FILENAMES:
                                                "/usr/share/glvnd/egl_vendor.d/50_mesa.json",
                                            MOZ_WEBGL_FORCE_EGL: "1",
                                        },
                                    },
                                }),
                            },
                            { browser: "webkit" },
                        ],
                    },
                },
            },
            {
                // The model chunk's request guard in WebKit (test/browser/models/): loading a model
                // must fetch nothing from Babylon's CDN or a lazily split file, and Safari is where
                // such a fetch has failed before. Chromium runs the same files through "browser",
                // with coverage; v8 coverage cannot instrument WebKit, so this project runs without.
                define: { ...define },
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: [...PREBUNDLED, ...ELEMENT_DEPENDENCIES], force: true },
                resolve: { alias: OWN_ENTRY_POINTS },
                test: {
                    name: "models-webkit",
                    setupFiles: ["./test/setup.ts"],
                    include: ["test/browser/models/**/*.test.ts"],
                    // Timing benchmarks belong to "browser-bench" (Chromium, CDP input), never here.
                    exclude: ["test/**/*.bench.test.ts"],
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [{ browser: "webkit" }],
                    },
                },
            },
            {
                // The style fidelity harness's graphty side (graph-io/test/fidelity/): loads every
                // fidelity sample with its file styles and writes what was drawn to
                // test/fidelity/out/. It fails a sample only for an element failing that the known
                // failures do not list (test/fidelity/oracle/floors.ts); a sample's layout can take
                // longer than the browser project's budget to settle, and so it is in no CI shard and
                // not in the pre-push gate. Run with: npm run test:fidelity, and on this workstation
                // with GRAPHTY_BROWSER_GPU=nvidia (and GRAPHTY_EGL_LIB_DIR): under SwiftShader the
                // annotation session draws about one frame a second and does not settle.
                // GRAPHTY_ORACLE_BASELINE=<an earlier run's tmp/oracle-report> judges that run's
                // drawings again with this comparator; npm run fidelity:ratchet applies a run.
                define: { ...define },
                envPrefix: ["VITE_", "GRAPHTY_BROWSER_GPU", "GRAPHTY_ORACLE_BASELINE"],
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: PREBUNDLED, force: true },
                resolve: { alias: OWN_ENTRY_POINTS },
                test: {
                    name: "fidelity",
                    setupFiles: [MAP_TILES_SETUP, "./test/setup.ts"],
                    include: [
                        "test/fidelity/fidelity.test.ts",
                        "test/fidelity/oracle-report.test.ts",
                        "test/fidelity/mutants.test.ts",
                    ],
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: { ...mapTileCommands, ...samplePictureCommands },
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [browserInstance()],
                    },
                },
            },
            {
                define: { ...define },
                // Browser timing rows for the sets work (design/sets/sets-plan.md 1.4): rows that need
                // the element's store, a DataManager or a run, which the Node runner in benchmarks/
                // cannot reach. Never asserts, never in CI or the pre-push gate, and its suffix is one
                // no other project includes. Run with: npx vitest run --project=bench-browser, and
                // GRAPHTY_BENCH_SCALE=large for the 1M and 10M rows. A row is a console line starting
                // "bench-row ", appended to benchmarks/results/browser-<host>.jsonl by the root
                // onConsoleLog below (vitest reads that hook from the root config only).
                envPrefix: ["VITE_", "GRAPHTY_BENCH_SCALE"],
                test: {
                    name: "bench-browser",
                    include: ["test/bench-browser/**/*.bench-browser.ts"],
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: mapTileCommands,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                define: { ...define },
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { include: ["iwer", ...PREBUNDLED], force: true },
                test: {
                    name: "interactions",
                    setupFiles: [BROWSER_COVERAGE_SETUP, MAP_TILES_SETUP, "./test/setup.ts"],
                    include: ["test/interactions/**/*.test.ts"],
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    // Disable file parallelism to prevent race conditions and flaky tests
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: { ...mapTileCommands, ...heldRequestCommands },
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
            {
                // With screenshots on, what build-storybook builds: production mode and NODE_ENV.
                define: { ...define, ...(VISUAL && PRODUCTION.define) },
                extends: "vite.config.ts",
                plugins: [
                    // The plugin will run tests for the stories defined in your Storybook config
                    // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                    storybookTest({
                        configDir: path.join(dirname, ".storybook"),
                        // Use STORYBOOK_URL env var or default to Storybook's default port (6006)
                        storybookUrl: process.env.STORYBOOK_URL ?? "https://localhost:6006",
                    }),
                ],
                ...(VISUAL && { mode: PRODUCTION.mode, appType: PRODUCTION.appType }),
                cacheDir: SHARD_CACHE_DIR,
                optimizeDeps: { force: true },
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in storybook tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                        ...OWN_ENTRY_POINTS,
                    },
                },
                test: {
                    name: "storybook",
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    // Disable file parallelism to prevent route.fulfill errors
                    // when browser contexts are garbage collected during parallel execution
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        commands: mapTileCommands,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: playwright(VISUAL?.providerOptions),
                        instances: [{ browser: "chromium" }],
                        // addon-vitest 9.1.21 turns write and exec off unless set; test/helpers/real-input.ts cdp() needs them. Loopback only: server.host is true.
                        api: { host: "127.0.0.1", allowWrite: true, allowExec: true },
                        ...(VISUAL && {
                            viewport: VISUAL.viewport,
                            commands: { ...mapTileCommands, ...VISUAL.commands },
                        }),
                    },
                    setupFiles: [
                        BROWSER_COVERAGE_SETUP,
                        MAP_TILES_SETUP,
                        ...(VISUAL ? [".storybook/vitest.setup.visual.ts"] : []),
                        ".storybook/vitest.setup.ts",
                    ],
                },
            },
            // Autosave lifecycle tests (design/work-protection/plan.md, step 6): every test that reloads,
            // closes or kills a page or a browser, which an in-page test cannot do to its own page. Node,
            // no Vite in the page: each test launches its own Chromium, Firefox or WebKit through
            // Playwright's library API, or Chrome for Testing over the raw DevTools protocol
            // (test/lifecycle/cdp-harness.ts), and serves the fixture page from the built ./bundle, so
            // run `npm run build` first. One file at a time: the kill tests find their browser's
            // processes by profile, and two files' browsers would compete for the CPU they measure
            // nothing about. CI runs it as the graphty-element-lifecycle shard; GRAPHTY_LIFECYCLE_FULL=1
            // (the release train) adds the 50,000- and 100,000-node runs.
            {
                test: {
                    name: "lifecycle",
                    environment: "node",
                    include: ["test/lifecycle/**/*.test.ts"],
                    // The benchmark beside these tests runs in "bench".
                    exclude: ["**/*.bench.test.ts", "**/node_modules/**"],
                    fileParallelism: false,
                },
            },
            // LLM Regression Tests - Tests real LLM API calls for tool calling verification.
            //
            // Every case makes a paid API call, so this project runs in no pull-request or merge-queue
            // job. The release train runs it on every release candidate (release.yml's "LLM regression"
            // job). LLM_REGRESSION_PROVIDER picks the provider (google by default, as the release job
            // runs; openai and anthropic also work) and its key variable (GOOGLE_API_KEY, ...; never VITE_-prefixed,
            // which the browser project's envPrefix would put on import.meta.env). Its seven real test
            // files sit inside describe.skipIf(skipIfNoApiKey()), so without a key they skip; the release
            // job checks the key is set first and fails if it is not.
            {
                define: { ...define },
                test: {
                    name: "llm-regression",
                    setupFiles: ["./test/ai/llm-regression/setup.ts"],
                    include: ["test/ai/llm-regression/**/*.test.ts"],
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    // Run tests sequentially to avoid rate limits
                    pool: "forks",
                    fileParallelism: false,
                },
            },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            // Allow override via COVERAGE_DIR env var for sharded coverage runs
            reportsDirectory: process.env.COVERAGE_DIR || "coverage",
            include: ["src/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "**/*.test.ts",
                "**/*.spec.ts",
                "**/types/**",
                // Test doubles, not product code: measuring them against the package's thresholds
                // would demand coverage of branches only a future test is meant to reach.
                "src/testing/**",
            ],
        },
        // dangerouslyIgnoreUnhandledErrors: true,
        slowTestThreshold: 60000,
    },
});

// Each listed project again as "<name>-features-on", with every experiment switched on, once
// graphty-element declares one (tools/features-on.mjs); until then the list is exactly the one above.
config.test = {
    ...config.test,
    projects: withFeaturesOn(
        config.test?.projects ?? [],
        ["default", "mesh", "browser", "interactions", "xr", "storybook"],
        "./test/setup-features-on.ts",
    ),
};

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
