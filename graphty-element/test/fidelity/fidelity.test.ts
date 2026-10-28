/**
 * The style fidelity harness's graphty side: loads every fidelity sample into a real
 * `<graphty-element>` with the file's own styles, in 2D with a fixed layout seed, and writes what
 * it drew as a scene (`out/<sample>.graphty.json`) and a canvas PNG (`out/<sample>.graphty.png`)
 * for the comparer to score against the committed reference scenes in
 * `graph-io/test/fidelity/scenes/`.
 *
 * Each sample's scene is then scored against its reference scenes by the comparer
 * (`graph-io/test/fidelity/compare.ts`) into `out/<sample>.result.json`, and the test fails when an
 * element fails a property that `baseline-scores.json` does not list for it (`known`); pass rates
 * are reported against its `floors` in `out/gate.txt`, never gated (`oracle/floors.ts`). After the
 * run, `out/report.html` shows every sample with a result, and `npm run fidelity:ratchet` takes
 * what passes now off the known failures and raises the floors.
 *
 *     GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_EGL_LIB_DIR=<libEGL dir> npm run test:fidelity
 *
 * in graphty-element (`-- -t <sample id>` for one sample). Without a GPU, Chromium renders with
 * SwiftShader and the larger samples take a minute each; the annotation session does not settle.
 * The flag set is recorded in each scene's provenance, since a GPU also changes which force layout
 * implementation runs.
 */
import { Color3, Color4, InstancedMesh, type Mesh, StandardMaterial } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it } from "vitest";
import { commands, page } from "vitest/browser";

import { compareSample, compareScenes, type SampleResult } from "../../../graph-io/test/fidelity/compare";
import { SAMPLES } from "../../../graph-io/test/fidelity/samples";
import type { Property, Scene } from "../../../graph-io/test/fidelity/scene";
import type { Graph } from "../../src/Graph";
import { NodeEffects } from "../../src/meshes/NodeEffects";
import { drawnScene, GPU, mountSample, nodeKeys, readJson, referenceScenes, unmount } from "./mount";
import { type Floors, gateMessages, gateReportText, judgeKey, type KeyGate, type KnownFailures } from "./oracle/floors";
import { renderReport, type ReportSample, type SelfCheck } from "./report";

const OUT = "test/fidelity/out";
const BASELINE = "test/fidelity/baseline-scores.json";

/** Per sample, per property: the elements known to fail, and the best pass rate recorded (informational). */
const baseline = (await readJson<{ known?: KnownFailures; floors?: Floors }>(BASELINE)) ?? {};
const gates: KeyGate[] = [];

afterEach(() => {
    unmount();
});

/** A fault planted in the renderer (never in the style), and the scorer that must catch it. */
interface Fault {
    name: string;
    property: Property;
    plant: (graph: Graph, control: Scene) => void;
    /** The sample to plant it in, when not the default one. */
    sample?: string;
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
        // What graphty-element drew before groups were put behind their members: a group's box
        // in front of everything inside it, hiding every member.
        name: "every group drawn in front of its members",
        property: "groups",
        sample: "graphml-yed-voctomix",
        plant: (graph, control) => {
            const { nodes } = graph.getDataManager();
            const front = (id: string | number): number =>
                nodes.get(id)?.mesh.getBoundingInfo().boundingBox.minimumWorld.z ?? Infinity;
            const nearest = Math.min(...[...nodes.keys()].map(front));
            for (const group of control.groups) {
                const node = nodes.get(group.id);
                if (node !== undefined) {
                    node.mesh.position.z -= front(group.id) - nearest + 1;
                    node.mesh.computeWorldMatrix(true);
                }
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
const SELF_CHECK_SAMPLE = "cyjs-genemania";

describe("style fidelity: graphty-element's drawing of each sample", () => {
    // Runs first: each scorer must catch a fault planted in the RENDERER (so the requested style
    // still says the right thing), scoring the faulty drawing against the same graph drawn
    // without it. A scorer that passes its own planted fault is reading the request, not the
    // picture, and every score after it would be meaningless.
    it("self-check: every scorer catches its planted fault", async () => {
        const checks: SelfCheck[] = [];
        for (const fault of FAULTS) {
            const sample = SAMPLES.find((s) => s.id === (fault.sample ?? SELF_CHECK_SAMPLE));
            assert.isDefined(sample);
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
        const refs = await referenceScenes(sample);
        const result = compareSample(id, refs, scene, nodeKeys(element));
        await commands.writeFile(`${OUT}/${id}.result.json`, `${JSON.stringify(result, null, 1)}\n`);

        const { counts } = element.session.status;
        assert.isAbove(scene.nodes.length, 0, `${id}: nothing was drawn`);
        assert.strictEqual(scene.nodes.length, counts.nodes);
        assert.strictEqual(scene.edges.length, counts.edges);

        const rated = Object.entries(result.properties).filter(([, r]) => r.passRate !== null);
        const gate = judgeKey(
            id,
            {
                failures: Object.fromEntries(
                    rated.flatMap(([p, r]) => (r.failing.length === 0 ? [] : [[p, r.failing]])),
                ),
                scores: Object.fromEntries(rated.map(([p, r]) => [p, r.passRate ?? 0])),
            },
            baseline.known?.[id],
            baseline.floors?.[id],
            { gpu: GPU },
        );
        gates.push(gate);
        assert.deepEqual(gateMessages(gate), [], `${id}: an element fails that baseline-scores.json does not list`);
    });

    afterAll(async () => {
        await commands.writeFile(`${OUT}/gate.json`, `${JSON.stringify({ gpu: GPU, baseline: null, keys: gates })}\n`);
        await commands.writeFile(`${OUT}/gate.txt`, gateReportText(gates, GPU, null));
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
