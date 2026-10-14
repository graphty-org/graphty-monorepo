/**
 * The style fidelity harness's graphty side: loads every fidelity sample into a real
 * `<graphty-element>` with the file's own styles, in 2D with a fixed layout seed, and writes what
 * it drew as a scene (`out/<sample>.graphty.json`) and a canvas PNG (`out/<sample>.graphty.png`)
 * for the comparer to score against the committed reference scenes in
 * `graph-io/test/fidelity/scenes/`.
 *
 * Each sample's scene is then scored against its reference scenes by the comparer
 * (`graph-io/test/fidelity/compare.ts`) into `out/<sample>.result.json`, and the test fails when a
 * property's pass rate drops below the one recorded in `baseline-scores.json`. After the run,
 * `out/report.html` shows every sample with a result. Record new floors (after a fix lands) with
 * GRAPHTY_FIDELITY_RECORD=1.
 *
 *     GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_EGL_LIB_DIR=<libEGL dir> npm run test:fidelity
 *
 * in graphty-element (`-- -t <sample id>` for one sample). Without a GPU, Chromium renders with
 * SwiftShader and the larger samples take a minute each; the annotation session does not settle.
 * The flag set is recorded in each scene's provenance, since a GPU also changes which force layout
 * implementation runs.
 */
import "../../src/graphty-element";

import { Color3, Color4, InstancedMesh, type Mesh, StandardMaterial } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it } from "vitest";
import { commands, page } from "vitest/browser";

import { compareSample, compareScenes, type SampleResult } from "../../../graph-io/test/fidelity/compare";
import { type FidelitySample as Sample, SAMPLES } from "../../../graph-io/test/fidelity/samples";
import type { Property, Scene } from "../../../graph-io/test/fidelity/scene";
import type { Graphty } from "../../index.js";
import packageJson from "../../package.json";
import type { Graph } from "../../src/Graph";
import { NodeEffects } from "../../src/meshes/NodeEffects";
import { readDrawn } from "./drawn-scene";
import { extractScene } from "./extract-scene";
import { renderReport, type ReportSample, type SelfCheck } from "./report";

const OUT = "test/fidelity/out";
const WIDTH = 800;
const HEIGHT = 600;
const SEED = 42;
const PRE_STEPS = 2000;
const GPU = (import.meta.env.GRAPHTY_BROWSER_GPU as string | undefined) || "none";
const RECORD = (import.meta.env.GRAPHTY_FIDELITY_RECORD as string | undefined) === "1";
const BASELINE = "test/fidelity/baseline-scores.json";

/** Per sample, per property: the pass rate a run may not drop below. */
type Baseline = Record<string, Record<string, number>>;

/**
 * Reads a JSON file relative to graphty-element, or null when it does not exist.
 * @param path - the path
 * @returns the parsed value
 */
async function readJson<T>(path: string): Promise<T | null> {
    try {
        return JSON.parse(await commands.readFile(path)) as T;
    } catch {
        return null;
    }
}

const baseline: Baseline = (await readJson<Baseline>(BASELINE)) ?? {};

let mounted: Graphty | null = null;
let blobUrl: string | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
    if (blobUrl !== null) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
    }
});

/**
 * Hex of a byte array.
 * @param bytes - the bytes
 * @returns lowercase hex
 */
function hex(bytes: ArrayBuffer): string {
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Reads a sample file as stored, its sha256, and its bytes as the element should see them:
 * gunzipped when stored compressed, since nothing in graphty-element unzips a `.gz`.
 * @param file - the sample's path under graph-io/test/
 * @returns the stored file's hash and the bytes to load
 */
async function readSample(file: string): Promise<{ sha256: string; data: Blob }> {
    const base64 = await commands.readFile(`../graph-io/test/${file}`, { encoding: "base64" });
    const stored = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const sha256 = hex(await crypto.subtle.digest("SHA-256", stored));
    const blob = new Blob([stored]);
    const data = file.endsWith(".gz")
        ? await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob()
        : blob;
    return { sha256, data };
}

/**
 * Mounts a fresh element, loads a sample into it with its file styles and waits for a stable frame.
 * @param sample - the sample
 * @returns the element, the sample's hash and how it was loaded
 */
async function mountSample(sample: Sample): Promise<{ element: Graphty; sha256: string; command: string }> {
    mounted?.remove();
    const { sha256, data } = await readSample(sample.file);
    if (blobUrl !== null) {
        URL.revokeObjectURL(blobUrl);
    }
    blobUrl = URL.createObjectURL(data);

    await page.viewport(WIDTH, HEIGHT);
    const element = document.createElement("graphty-element");
    document.body.style.margin = "0";
    element.style.cssText = `display:block;width:${String(WIDTH)}px;height:${String(HEIGHT)}px`;
    element.viewMode = "2d";
    element.layoutConfig = { seed: SEED };
    // Run the layout before the first frame, as the File Styles stories do: drawing every step
    // of a few hundred nodes in a software-rendered Chromium does not settle in
    // waitForStableFrame's 30 seconds.
    element.layoutBehavior = { layout: { preSteps: PRE_STEPS } };
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;

    // session.data.import rather than loadFromUrl, for two reasons. loadFromUrl has no layout
    // option, so a file's own coordinates were thrown away for the seeded force layout and
    // every position scored 0 against references that keep them; `layout: "recommended"` is
    // the public way to keep them (graphty-element picks "fixed" when every node carries a
    // coordinate, else a computed layout). And loadFromUrl always passes the element's
    // nodeIdPath ("id" by default) to the JSON reader, which then skips its Cytoscape.js
    // dialect and loads nothing (E_EMPTY_LOAD): a graphty-element defect.
    const route = `session.data.import({ type: "${sample.format}", config: { url } }, { styles: "file", layout: "recommended" })`;
    await element.session.data.import(
        { type: sample.format, config: { url: blobUrl } },
        { styles: "file", layout: "recommended" },
    );
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    // Which layout drew it, and how many nodes the file placed: a position score is only
    // meaningful when the layout is "fixed" (every node carried a coordinate).
    const placement = `layout ${String(element.layout)}, ${String(element.session.seededNodeCount)} of ${String(element.session.status.counts.nodes)} nodes placed by the file`;
    const command = `${route}; ${placement}, url = ${sample.file}${sample.file.endsWith(".gz") ? " gunzipped" : ""}; 2D, ${String(WIDTH)}x${String(HEIGHT)}, layoutConfig.seed ${String(SEED)}, layout preSteps ${String(PRE_STEPS)}, GRAPHTY_BROWSER_GPU=${GPU}`;
    return { element, sha256, command };
}

/**
 * The scene a mounted element drew, read off its renderer.
 * @param element - the element
 * @param sha256 - the sample's hash
 * @param command - how it was loaded
 * @returns the scene
 */
function drawnScene(element: Graphty, sha256: string, command: string): Scene {
    return extractScene(element, readDrawn(element.graph), {
        version: `${packageJson.version} (source)`,
        command,
        sourceSha256: sha256,
    });
}

/** A fault planted in the renderer (never in the style), and the scorer that must catch it. */
interface Fault {
    name: string;
    property: Property;
    plant: (graph: Graph, control: Scene) => void;
}

const MAGENTA = new Color3(1, 0, 1);
const GREEN = new Color3(0, 1, 0);

const FAULTS: readonly Fault[] = [
    {
        name: "every fill drawn in another color",
        property: "fill",
        plant: (graph, control) => {
            const fills = new Map(control.nodes.map((n) => [n.id, n.fill]));
            for (const [id, node] of graph.getDataManager().nodes) {
                const color = fills.get(String(id)) === "#ff00ff" ? GREEN : MAGENTA;
                const { mesh } = node;
                const source = (mesh instanceof InstancedMesh ? mesh.sourceMesh : mesh) as Mesh;
                if (mesh instanceof InstancedMesh && source.instancedBuffers?.color !== undefined) {
                    // The base material times this buffer is the drawn color, so pin the base to
                    // white and draw the planted color through the buffer.
                    mesh.instancedBuffers.color = new Color4(color.r, color.g, color.b, 1);
                    const { material } = source;
                    if (material instanceof StandardMaterial) {
                        material.unfreeze();
                        material.emissiveColor = Color3.White();
                        material.diffuseColor = Color3.White();
                    }
                } else if (source.material instanceof StandardMaterial) {
                    source.material.unfreeze();
                    source.material.emissiveColor = color;
                    source.material.diffuseColor = color;
                }
            }
        },
    },
    {
        name: "every node scaled to 1%",
        property: "size",
        plant: (graph) => {
            for (const node of graph.getDataManager().nodes.values()) {
                node.mesh.scaling.scaleInPlace(0.01);
            }
        },
    },
    {
        name: "a glow turned on around every node",
        property: "borderWidth",
        plant: (graph) => {
            for (const node of graph.getDataManager().nodes.values()) {
                NodeEffects.applyGlowEffect(node.mesh, { glow: { color: "#ff00ff", strength: 1 } });
            }
        },
    },
];

/** The sample the self-check plants its faults in: filled, visible, un-outlined nodes. */
const SELF_CHECK_SAMPLE = "cyjs-handmade";

describe("style fidelity: graphty-element's drawing of each sample", () => {
    // Runs first: each scorer must catch a fault planted in the RENDERER (so the requested style
    // still says the right thing), scoring the faulty drawing against the same graph drawn
    // without it. A scorer that passes its own planted fault is reading the request, not the
    // picture, and every score after it would be meaningless.
    it("self-check: every scorer catches its planted fault", async () => {
        const sample = SAMPLES.find((s) => s.id === SELF_CHECK_SAMPLE);
        assert.isDefined(sample);
        const checks: SelfCheck[] = [];
        for (const fault of FAULTS) {
            const { element, sha256, command } = await mountSample(sample);
            const control = drawnScene(element, sha256, command);
            const clean = compareScenes(control, control).properties[fault.property];
            fault.plant(element.graph, control);
            element.graph.getScene().render();
            const faulty = drawnScene(element, sha256, command);
            const caught = compareScenes(control, faulty).properties[fault.property];
            checks.push({
                fault: fault.name,
                property: fault.property,
                sample: sample.id,
                cleanPassRate: clean.passRate,
                faultyPassRate: caught.passRate,
                worst: caught.worst.slice(0, 2),
                caught: clean.passRate === 1 && caught.passRate === 0,
            });
        }
        await commands.writeFile(`${OUT}/self-check.json`, `${JSON.stringify(checks, null, 1)}\n`);
        assert.deepEqual(
            checks
                .filter((c) => !c.caught)
                .map(
                    (c) =>
                        `${c.property} (${c.fault}): clean ${String(c.cleanPassRate)}, faulty ${String(c.faultyPassRate)}`,
                ),
            [],
            "a scorer missed its planted fault",
        );
    });

    it.each(SAMPLES.map((s) => [s.id, s] as const))("%s", async (id, sample) => {
        const { element, sha256, command } = await mountSample(sample);
        const scene = drawnScene(element, sha256, command);
        await commands.writeFile(`${OUT}/${id}.graphty.json`, `${JSON.stringify(scene, null, 1)}\n`);

        // The browser's own screenshot of the viewport, which the element fills: test/setup.ts
        // stubs the element's captureScreenshot, and an element screenshot waits for two equal
        // frames, which a few hundred nodes in a software-rendered Chromium do not give it in time.
        const png = await page.screenshot({ save: false });
        await commands.writeFile(`${OUT}/${id}.graphty.png`, png, { encoding: "base64" });

        // Routes that name nodes by a column (Cytoscape's `name`, the GML label) are matched through
        // the same column of graphty-element's records.
        const name = new Map<string, string>();
        const label = new Map<string, string>();
        for (const record of element.session.data.nodes()) {
            if (typeof record.name === "string" || typeof record.name === "number") {
                name.set(String(record.id), String(record.name));
            }
            if (typeof record.label === "string" || typeof record.label === "number") {
                label.set(String(record.id), String(record.label));
            }
        }
        const refs = await Promise.all(
            sample.routes.map(async (r) => {
                const ref = await readJson<Scene>(`../graph-io/test/fidelity/scenes/${id}/${r}.ref.json`);
                assert.isNotNull(ref, `${id}: no committed reference scene for ${r}`);
                return ref;
            }),
        );
        const result = compareSample(id, refs, scene, { name, label });
        await commands.writeFile(`${OUT}/${id}.result.json`, `${JSON.stringify(result, null, 1)}\n`);

        const { counts } = element.session.status;
        assert.isAbove(scene.nodes.length, 0, `${id}: nothing was drawn`);
        assert.strictEqual(scene.nodes.length, counts.nodes);
        assert.strictEqual(scene.edges.length, counts.edges);

        const floors = baseline[id] ?? {};
        if (RECORD) {
            baseline[id] = Object.fromEntries(
                Object.entries(result.properties).flatMap(([p, r]) => (r.passRate === null ? [] : [[p, r.passRate]])),
            );
            return;
        }
        const dropped = Object.entries(floors).filter(([p, floor]) => {
            const rate = result.properties[p as keyof SampleResult["properties"]].passRate;
            return rate === null || rate < floor - 1e-9;
        });
        assert.deepEqual(
            dropped.map(
                ([p, floor]) =>
                    `${p}: ${String(result.properties[p as keyof SampleResult["properties"]].passRate)} < ${String(floor)}`,
            ),
            [],
            `${id}: pass rates fell below baseline-scores.json`,
        );
    });

    afterAll(async () => {
        if (RECORD) {
            await commands.writeFile(BASELINE, `${JSON.stringify(baseline, null, 4)}\n`);
        }
        const samples: ReportSample[] = [];
        for (const s of SAMPLES) {
            const result = await readJson<SampleResult>(`${OUT}/${s.id}.result.json`);
            const reference = await readJson<Scene>(`../graph-io/test/fidelity/scenes/${s.id}/${s.routes[0]}.ref.json`);
            const graphty = await readJson<Scene>(`${OUT}/${s.id}.graphty.json`);
            if (result && reference && graphty) {
                samples.push({ result, reference, graphty, png: `${s.id}.graphty.png`, file: s.file });
            }
        }
        const selfCheck = (await readJson<SelfCheck[]>(`${OUT}/self-check.json`)) ?? [];
        await commands.writeFile(`${OUT}/report.html`, renderReport(samples, selfCheck, new Date().toISOString()));
    });
});
