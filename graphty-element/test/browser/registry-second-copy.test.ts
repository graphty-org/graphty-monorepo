/**
 * A registration made through a second copy of graphty-element reaches the element the first copy
 * defined.
 *
 * A page can evaluate the element's modules twice: the self-contained `./bundle` beside an
 * `./extend` import, two installs of the package, a dev server loading one module under two URLs.
 * Each copy used to keep its registries in its own module-level maps, so a palette registered
 * through one copy was silently missing from the other copy's element. Every registry is now kept
 * once per page.
 *
 * The `?second-copy` query makes the bundler evaluate that module again as a separate module, the
 * same trick `defined-twice.test.ts` uses. The specifier is built at run time because TypeScript
 * cannot resolve a path that carries a query.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import {
    Algorithm,
    type AlgorithmDescriptor,
    type AuthoredLayoutDescriptor,
    clearRegisteredAlgorithmsForTesting,
    clearRegisteredCamerasForTesting,
    clearRegisteredFormatsForTesting,
    clearRegisteredLayoutsForTesting,
    clearRegisteredLogSinksForTesting,
    clearRegisteredPalettesForTesting,
    DataSource,
    type FormatDescriptor,
    LayoutEngine,
    SimpleLayoutEngine,
} from "../../extend";
import { Graph } from "../../index.js";
import type { GraphSession } from "../../session";
import { acceleratorRegistry } from "../../src/acceleration/registry";

/**
 * Evaluate a module a second time, as a second copy of the package would.
 * @param path - The module, relative to this file.
 * @returns The second copy's exports.
 */
async function secondCopy<T>(path: string): Promise<T> {
    const specifier = `${path}?second-copy`;

    return (await import(/* @vite-ignore */ specifier)) as T;
}

type Second<K extends string> = Record<K, (...args: never[]) => unknown>;

const LAYOUT_DESCRIPTOR: AuthoredLayoutDescriptor = {
    id: "second-copy-column",
    plainName: "Second copy column",
    technicalName: "single column placement",
    description: "Registered through a second copy of the element.",
    family: "geometric",
    kind: "batch",
    maxDimensions: 3,
    sizeRating: "any",
    structuralInputs: [],
    engine: "second-copy-column",
    options: [],
};

const FORMAT_DESCRIPTOR: FormatDescriptor = {
    id: "second-copy-roll",
    plainName: "Second copy roll",
    extensions: [".secondroll"],
    mimeTypes: ["text/vnd.second.roll"],
    canImport: true,
    canExport: false,
    options: [],
};

const ALGORITHM_DESCRIPTOR: AlgorithmDescriptor = {
    key: "second-copy-metric",
    plainName: "Second copy metric",
    technicalName: "second copy metric",
    description: "Registered through a second copy of the element.",
    category: "structure",
    shape: "node-metric",
    fields: [
        {
            name: "value",
            plainName: "Value",
            technicalName: "value",
            kind: "node",
            type: "number",
            path: "results.$.value",
        },
    ],
    options: [],
    costClass: "instant",
    complexity: "O(n + m)",
};

describe("a second copy of graphty-element", () => {
    let container: HTMLDivElement;
    let graph: Graph;
    let session: GraphSession;
    let layoutClass: unknown;
    let formatClass: unknown;
    let algorithmClass: unknown;

    beforeAll(async () => {
        const palettes = await secondCopy<Second<"registerPalette">>("../../src/catalog/paletteRegistry.ts");
        const cameras = await secondCopy<Second<"registerCameraView">>("../../src/catalog/cameraRegistry.ts");
        const sinks = await secondCopy<Second<"registerLogSink">>("../../src/catalog/logSinkRegistry.ts");
        const layouts = await secondCopy<{ LayoutEngine: typeof LayoutEngine }>("../../src/layout/LayoutEngine.ts");
        const formats = await secondCopy<{ DataSource: typeof DataSource }>("../../src/data/DataSource.ts");
        const algorithms = await secondCopy<{ Algorithm: typeof Algorithm }>("../../src/algorithms/Algorithm.ts");

        (palettes.registerPalette as (d: unknown) => void)({
            id: "second-copy-palette",
            plainName: "Second copy palette",
            kind: "sequential",
            colors: ["#0A2E4F", "#F5C242"],
            capacity: null,
            colorblindSafe: [],
        });
        (cameras.registerCameraView as (r: unknown) => void)({
            descriptor: {
                id: "second-copy-view",
                plainName: "Second copy view",
                description: "Registered through a second copy of the element.",
                modes: ["3d"],
                options: [],
            },
            compute: () => ({ type: "arcRotate", position: { x: 1, y: 1, z: 1 }, target: { x: 0, y: 0, z: 0 } }),
        });
        (sinks.registerLogSink as (r: unknown) => void)({
            descriptor: {
                id: "second-copy-sink",
                plainName: "Second copy sink",
                description: "Registered through a second copy of the element.",
                options: [],
            },
            create: () => ({ name: "second-copy-sink", write: () => undefined }),
        });

        class SecondCopyColumn extends SimpleLayoutEngine {
            static type = "second-copy-column";
            static maxDimensions: 2 | 3 = 3;
            static descriptor = LAYOUT_DESCRIPTOR;

            doLayout(): void {
                this.positions = {};
            }
        }
        layoutClass = layouts.LayoutEngine.register(SecondCopyColumn);

        class SecondCopyRoll extends DataSource {
            static type = "second-copy-roll";
            static descriptor = FORMAT_DESCRIPTOR;

            /** @param _opts - What the host passed the format; this one reads nothing. */
            constructor(_opts: object) {
                super();
            }

            protected getConfig(): { data: string } {
                return { data: "" };
            }

            async *sourceFetchData(): AsyncGenerator<never, void, unknown> {
                // Never read: the test asks only whether the class can be found.
            }
        }
        formatClass = formats.DataSource.register(SecondCopyRoll);

        class SecondCopyMetric extends Algorithm {
            static namespace = "second";
            static type = "second-copy-metric";
            static descriptor = ALGORITHM_DESCRIPTOR;

            async run(): Promise<void> {
                // Never run: the test asks only whether the class can be found.
            }
        }
        algorithmClass = algorithms.Algorithm.register(SecondCopyMetric);

        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();

        clearRegisteredAlgorithmsForTesting();
        clearRegisteredCamerasForTesting();
        clearRegisteredFormatsForTesting();
        clearRegisteredLayoutsForTesting();
        clearRegisteredLogSinksForTesting();
        clearRegisteredPalettesForTesting();
    });

    it("reaches the catalogue of an element the first copy defined, for every extension point", () => {
        const { catalog } = session;

        assert.isDefined(catalog.palettes().find((entry) => entry.id === "second-copy-palette"), "palette");
        assert.isDefined(catalog.cameras().find((entry) => entry.id === "second-copy-view"), "camera view");
        assert.isDefined(catalog.logSinks().find((entry) => entry.id === "second-copy-sink"), "log sink");
        assert.isDefined(catalog.layouts().find((entry) => entry.id === "second-copy-column"), "layout");
        assert.isDefined(catalog.formats().find((entry) => entry.id === "second-copy-roll"), "format");
        assert.isDefined(catalog.algorithms().find((entry) => entry.key === "second-copy-metric"), "algorithm");
    });

    it("hands the first copy the classes the second copy registered, so the element can build them", () => {
        assert.strictEqual(LayoutEngine.getClass("second-copy-column"), layoutClass);
        assert.strictEqual(LayoutEngine.get("second-copy-column")?.constructor, layoutClass);
        assert.include(DataSource.getRegisteredTypes(), "second-copy-roll");
        assert.strictEqual(DataSource.get("second-copy-roll")?.constructor, formatClass);
        assert.strictEqual(Algorithm.getClass("second", "second-copy-metric"), algorithmClass);
    });

    it("lets a second copy's catalogue see what the first copy's classes published", async () => {
        type Descriptors = () => readonly { id?: string; key?: string }[];
        const layouts = await secondCopy<{ registeredLayoutDescriptors: Descriptors }>("../../src/catalog/layoutRegistry.ts");
        const formats = await secondCopy<{ registeredFormatDescriptors: Descriptors }>("../../src/catalog/formatRegistry.ts");
        const algorithms = await secondCopy<{ registeredAlgorithmDescriptors: Descriptors }>("../../src/catalog/registry.ts");

        assert.include(layouts.registeredLayoutDescriptors().map((d) => d.id), "second-copy-column");
        assert.include(formats.registeredFormatDescriptors().map((d) => d.id), "second-copy-roll");
        assert.include(algorithms.registeredAlgorithmDescriptors().map((d) => d.key), "second-copy-metric");
    });

    it("shares the one accelerator registry the ./webgpu entry registers into", async () => {
        const second = await secondCopy<{ acceleratorRegistry: unknown }>("../../src/acceleration/registry.ts");

        assert.strictEqual(second.acceleratorRegistry, acceleratorRegistry);
    });
});
