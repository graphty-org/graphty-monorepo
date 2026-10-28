/**
 * @file Every operation of graphty-element reaches the assistant, or is left out on purpose.
 *
 * Every op of the command vocabulary, every door that dispatches or is exempt (and every read of
 * the session), every catalog entry and every option is reached by some generated tool action, or
 * listed in `NOT_FOR_THE_ASSISTANT` with a reason code. The build fails on anything else: a new
 * feature reaches the assistant through the catalog with no code, or is a decision someone writes
 * down. The planted cases prove each rule fails when it should.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { gmlImporter } from "@graphty/graph-io/gml";
import { afterEach, assert, describe, it } from "vitest";

import { COMMANDS } from "../../../commands";
import * as extend from "../../../extend";
import {
    Algorithm,
    type AuthoredLayoutDescriptor,
    type BaseDataSourceConfig,
    DataSource,
    type DataSourceChunk,
    defineAlgorithm,
    defineLayout,
    definePalette,
    type FormatDescriptor,
    LayoutEngine,
    registerCameraView,
    registerFormatWriter,
    registerPalette,
    registerSnapshotLayout,
    SimpleLayoutEngine,
} from "../../../extend";
import { createGraphSession } from "../../../session";
import { CommandRegistry } from "../../../src/ai/commands";
import { type Exclusion, NOT_FOR_THE_ASSISTANT } from "../../../src/ai/tools/exclusions";
import { SETTING_GROUPS } from "../../../src/ai/tools/families/project";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { assistantReach } from "../../../src/ai/tools/reach";
import { buildToolset, type CheckedCall, isAssistantTool } from "../../../src/ai/tools/toolset";
import { ToolRefusal } from "../../../src/ai/tools/types";
import { liveTools } from "../../../src/ai/voice/liveTurns";
import { clearRegisteredCamerasForTesting } from "../../../src/catalog/cameraRegistry";
import { clearRegisteredFormatsForTesting } from "../../../src/catalog/formatRegistry";
import { clearRegisteredLayoutsForTesting } from "../../../src/catalog/layoutRegistry";
import { clearRegisteredPalettesForTesting } from "../../../src/catalog/paletteRegistry";
import { clearRegisteredAlgorithmsForTesting } from "../../../src/catalog/registry";
import { clearRegisteredFormatWritersForTesting } from "../../../src/catalog/writerRegistry";
import { DOOR_ROOTS, type DoorRoot } from "../../../src/session/commands/doors";
import { CONFIG_KEYS } from "../../../src/session/configKeys";
import { coverage } from "./coverage-report";

/** The report for the built-in catalog. */
function report(overrides: { ops?: string[]; doorRoots?: DoorRoot[]; exclusions?: readonly Exclusion[] } = {}) {
    return coverage({
        toolset: buildToolset(createGraphSession()),
        doorRoots: overrides.doorRoots ?? DOOR_ROOTS,
        exclusions: overrides.exclusions ?? NOT_FOR_THE_ASSISTANT,
        ...(overrides.ops === undefined ? {} : { ops: overrides.ops }),
    });
}

describe("what the assistant reaches", () => {
    it("reaches every op, door, catalog entry and option, or excludes it with a reason", () => {
        const { missing, problems, items, reached, excluded } = report();
        assert.deepStrictEqual(missing, [], "neither reached by a tool nor excluded with a reason");
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(items.filter((key) => reached.has(key)).length + excluded.size, items.length);
    });

    it("reaches every catalog entry with a tool, and leaves no op out but the four decided", () => {
        const { items, reached, excluded } = report();
        for (const item of items.filter((key) => key.startsWith("catalog:"))) {
            assert.isTrue(reached.has(item), `${item} is reached`);
        }

        assert.deepStrictEqual([...excluded.keys()].filter((key) => key.startsWith("op:")).sort(), [
            "op:batch",
            "op:layout.transport",
            "op:note.merge",
            "op:style.template",
        ]);
    });

    it("offers every project setting group the session declares, by the session's own schema", () => {
        const groups = new Set([...CONFIG_KEYS.values()].map((key) => key.group));
        assert.deepStrictEqual(Object.keys(SETTING_GROUPS).sort(), [...groups].sort());
    });

    it("excludes nothing without a reason, and every defect has an owner and an expiry", () => {
        for (const row of NOT_FOR_THE_ASSISTANT) {
            assert.isNotEmpty(row.reason);
            if (row.kind === "defect") {
                assert.isString(row.owner);
                assert.match(row.expires ?? "", /^\d{4}-\d{2}-\d{2}$/);
            }
        }
    });
});

describe("the coverage test fails when it should", () => {
    it("fails on a new op no tool reaches", () => {
        const { missing } = report({ ops: ["data.teleport", ...Object.keys(COMMANDS)] });
        assert.deepStrictEqual(missing, ["op:data.teleport"]);
    });

    it("fails on a new public member that dispatches, on a root no exclusion covers", () => {
        const planted: DoorRoot = {
            name: "TeleportApi",
            file: "src/teleport.ts",
            half: "session",
            doors: { teleport: { kind: "dispatches", op: "data.apply", call: { kind: "call", args: [] }, expect: [] } },
        };
        const { missing } = report({ doorRoots: [...DOOR_ROOTS, planted] });
        assert.deepStrictEqual(missing, ["door:TeleportApi.teleport"]);
    });

    it("fails on a new mutating member of a root excluded member by member", () => {
        const roots = DOOR_ROOTS.map((root) =>
            root.name === "LayoutEngine"
                ? { ...root, doors: { ...root.doors, teleport: { kind: "exempt", reason: "planted" } as const } }
                : root,
        );
        const { problems } = report({ doorRoots: roots });
        assert.isTrue(
            problems.some((problem) => problem.includes("door:LayoutEngine.teleport")),
            problems.join("\n"),
        );
    });

    it("fails on an exclusion of something that does not exist, and on something both reached and excluded", () => {
        const { problems } = report({
            exclusions: [
                ...NOT_FOR_THE_ASSISTANT,
                { door: "GraphSession.teleport", reason: "mechanism", kind: "by-design" },
                { op: "algo.run", reason: "mechanism", kind: "by-design" },
            ],
        });
        assert.isTrue(problems.some((problem) => problem.includes("door:GraphSession.teleport")));
        assert.isTrue(problems.some((problem) => problem.includes("op:algo.run is both reached")));
    });

    it("fails on a covered-by row whose action does not dispatch the door's op, or is another tool's", () => {
        const exclusions = NOT_FOR_THE_ASSISTANT.map((row) =>
            row.root === "DataManager" && row.by === "edit_data.add_nodes" ? { ...row, by: "view.save" } : row,
        );
        const { problems } = report({ exclusions });
        assert.isTrue(
            problems.some((problem) => problem.includes("covered by view.save, which does not dispatch data.apply")),
            problems.join("\n"),
        );

        // The action named, not anything of its tool: sets.list dispatches nothing sets.remove does.
        const listed = report({
            exclusions: NOT_FOR_THE_ASSISTANT.map((row) =>
                row.root === "ScopeApi" && row.by === "sets.remove" ? { ...row, by: "sets.list" } : row,
            ),
        });
        assert.isTrue(
            listed.problems.some((problem) => problem.includes("door:ScopeApi.remove is covered by sets.list")),
            listed.problems.join("\n"),
        );

        // A door with no op is covered only by an action of its effect: camera verbs by no notes action.
        const camera = report({
            exclusions: NOT_FOR_THE_ASSISTANT.map((row) =>
                row.root === "Graph" && row.by === "view.camera" ? { ...row, by: "notes.list" } : row,
            ),
        });
        assert.isTrue(
            camera.problems.some((problem) =>
                problem.includes("(exempt) is covered by notes.list, whose effect is read"),
            ),
            camera.problems.join("\n"),
        );

        // A tool alone names no action.
        const whole = report({
            exclusions: NOT_FOR_THE_ASSISTANT.map((row) =>
                row.root === "Node" && row.by === "layout.pin" ? { ...row, by: "layout" } : row,
            ),
        });
        assert.isTrue(whole.problems.some((problem) => problem.includes("names no tool action")));
    });

    it("fails on an entry that names one option twice", () => {
        try {
            registerSnapshotLayout({
                descriptor: {
                    id: "acme-twice",
                    plainName: "Twice",
                    technicalName: "Twice layout",
                    description: "Names one option twice.",
                    family: "geometric",
                    kind: "batch",
                    maxDimensions: 2,
                    sizeRating: "any",
                    structuralInputs: [],
                    options: [
                        { name: "gap", plainName: "Gap", type: "number", default: 1 },
                        { name: "gap", plainName: "Gap again", type: "number", default: 2 },
                    ],
                    engine: "acme-twice",
                },
                compute: () => ({ positions: new Float32Array(0), dim: 2 }) as never,
            });
            const { problems } = report();
            assert.isTrue(
                problems.some((problem) => problem.includes("layouts/acme-twice lists the option gap twice")),
            );
        } finally {
            clearRegisteredLayoutsForTesting();
        }
    });

    it("fails on a root excluded whole while it has doors that change things", () => {
        const { problems } = report({
            exclusions: [
                ...NOT_FOR_THE_ASSISTANT.filter((row) => row.root !== "LayoutEngine"),
                { root: "LayoutEngine", reason: "internal-handle", kind: "by-design" },
            ],
        });
        assert.isTrue(problems.some((problem) => problem.includes("root LayoutEngine lists no members")));
    });
});

describe("a live connection reaches every tool", () => {
    /**
     * The tools a live declaration leaves unreachable: those it does not declare, unless it declares `call`.
     * @param declared - The names it declares.
     * @param registry - Every tool.
     * @returns The names it cannot reach.
     */
    function unreachable(declared: readonly string[], registry: CommandRegistry): string[] {
        return declared.includes("call") ? [] : registry.getNames().filter((name) => !declared.includes(name));
    }

    it("declares call beside the always-loaded tools, so every on-demand tool is one call away", () => {
        const registry = new CommandRegistry();
        installAssistantTools(registry, createGraphSession());
        const declared = liveTools(registry, "standard").map((tool) => tool.name);
        assert.deepStrictEqual(unreachable(declared, registry), []);
        assert.include(declared, "call");
    });

    it("fails when the live set drops call", () => {
        const registry = new CommandRegistry();
        installAssistantTools(registry, createGraphSession());
        const declared = liveTools(registry, "standard")
            .map((tool) => tool.name)
            .filter((name) => name !== "call");
        assert.includeMembers(unreachable(declared, registry), ["sets", "notes", "import_data", "capture"]);
    });
});

describe("registration paths reach the assistant", () => {
    afterEach(() => {
        clearRegisteredAlgorithmsForTesting();
        clearRegisteredLayoutsForTesting();
        clearRegisteredPalettesForTesting();
        clearRegisteredFormatWritersForTesting();
        clearRegisteredCamerasForTesting();
        clearRegisteredFormatsForTesting();
    });

    /** Register through one path; return the kind and name catalog finds it by, and a call the owning tool must accept. */
    const PATHS: Record<string, () => { kind: string; name: string; tool: string; args: Record<string, unknown> }> = {
        defineAlgorithm: () => {
            defineAlgorithm({
                id: "acme-essentiality",
                name: "Essentiality score",
                description: "How strongly each protein is tied to the rest.",
                options: { weight: { type: "attribute", on: "edge", default: "confidence" } },
                node: (node, { options }) => node.strength(options.weight),
            });
            return {
                kind: "algorithm",
                name: "acme-essentiality",
                tool: "run_algorithm",
                args: { name: "acme-essentiality", options: { weight: "w" } },
            };
        },
        defineLayout: () => {
            defineLayout({
                id: "acme-tiers",
                dimensions: 2,
                options: { spacing: 2 },
                place: () => new Map(),
            });
            return {
                kind: "layout",
                name: "acme-tiers",
                tool: "layout",
                args: { action: "set", name: "acme-tiers", options: { spacing: 3 } },
            };
        },
        definePalette: () => {
            definePalette({ id: "acme-brand", kind: "categorical", colors: ["#0B1D51", "#1B7F79", "#F2A65A"] });
            return {
                kind: "palette",
                name: "acme-brand",
                tool: "style",
                args: { action: "encode", encode: { channel: "node.color", attribute: "type", palette: "acme-brand" } },
            };
        },
        registerPalette: () => {
            registerPalette({
                id: "acme-ramp",
                plainName: "Acme ramp",
                kind: "sequential",
                colors: ["#ffffff", "#000000"],
            });
            return {
                kind: "palette",
                name: "acme-ramp",
                tool: "style",
                args: { action: "encode", encode: { channel: "node.color", attribute: "type", palette: "acme-ramp" } },
            };
        },
        registerFormatWriter: () => {
            registerFormatWriter({
                descriptor: {
                    id: "acme-lines",
                    plainName: "Acme Lines",
                    extensions: [".acmelines"],
                    mimeTypes: ["text/plain"],
                    canImport: false,
                    canExport: true,
                    options: [],
                },
                exporter: {
                    format: "acme-lines",
                    capabilities: {} as never,
                    check: () => [],
                    export: () => ({
                        [Symbol.asyncIterator]: () => ({
                            next: () => Promise.resolve({ done: true as const, value: undefined }),
                        }),
                    }),
                    exportToString: () => Promise.resolve(""),
                },
            });
            return { kind: "format", name: "acme-lines", tool: "export_graph", args: { format: "acme-lines" } };
        },
        registerSnapshotLayout: () => {
            registerSnapshotLayout({
                descriptor: {
                    id: "acme-line",
                    plainName: "Line",
                    technicalName: "Line layout",
                    description: "Every node on one line.",
                    family: "geometric",
                    kind: "batch",
                    maxDimensions: 2,
                    sizeRating: "any",
                    structuralInputs: [],
                    options: [{ name: "gap", plainName: "Gap", type: "number", default: 1, min: 0 }],
                    engine: "acme-line",
                },
                compute: () => ({ positions: new Float32Array(0), dim: 2 }) as never,
            });
            return {
                kind: "layout",
                name: "acme-line",
                tool: "layout",
                args: { action: "set", name: "acme-line", options: { gap: 2 } },
            };
        },
        "Algorithm.register": () => {
            // A class with no descriptor: the catalog knows nothing of it, but it runs by its address.
            Algorithm.register(
                class LegacyRank extends Algorithm {
                    static namespace = "acme";
                    static type = "legacy-rank";
                    async run(): Promise<void> {
                        await Promise.resolve();
                    }
                },
            );
            return {
                kind: "algorithm",
                name: "acme:legacy-rank",
                tool: "run_algorithm",
                args: { name: "acme:legacy-rank" },
            };
        },
        "LayoutEngine.register": () => {
            class Stack extends SimpleLayoutEngine {
                static type = "acme-stack";
                static maxDimensions = 3;
                static descriptor: AuthoredLayoutDescriptor = {
                    id: "acme-stack",
                    plainName: "Stack",
                    technicalName: "Stack layout",
                    description: "Every node stacked in one column.",
                    family: "special",
                    kind: "batch",
                    maxDimensions: 3,
                    sizeRating: "any",
                    structuralInputs: [],
                    engine: "acme-stack",
                    options: [{ name: "gap", plainName: "Gap", type: "number", default: 1, min: 0 }],
                };

                doLayout(): void {
                    this.positions = {};
                }
            }
            LayoutEngine.register(Stack);
            return {
                kind: "layout",
                name: "acme-stack",
                tool: "layout",
                args: { action: "set", name: "acme-stack", options: { gap: 2 } },
            };
        },
        "DataSource.register": () => {
            class Lines extends DataSource {
                static override readonly type = "acme-lines-in";
                static override descriptor: FormatDescriptor = {
                    id: "acme-lines-in",
                    plainName: "Acme Lines",
                    extensions: [".acmelinesin"],
                    mimeTypes: ["text/vnd.acme.lines"],
                    canImport: true,
                    canExport: false,
                    options: [{ name: "separator", plainName: "Separator", type: "string", default: " " }],
                };

                readonly #config: BaseDataSourceConfig;

                constructor(config: BaseDataSourceConfig) {
                    super(config.errorLimit, config.chunkSize);
                    this.#config = config;
                }

                protected getConfig(): BaseDataSourceConfig {
                    return this.#config;
                }

                async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
                    await this.getContent();
                    yield* this.chunkData([], []);
                }
            }
            DataSource.register(Lines);
            return {
                kind: "format",
                name: "acme-lines-in",
                tool: "import_data",
                args: { action: "import", format: "acme-lines-in", text: "a b", options: { separator: " " } },
            };
        },
        "DataSource.fromImporter": () => {
            DataSource.register(
                DataSource.fromImporter(gmlImporter, {
                    id: "acme-gml",
                    plainName: "Acme GML",
                    extensions: [".acmegml"],
                    mimeTypes: ["text/vnd.acme.gml"],
                    canImport: true,
                    canExport: false,
                    options: [],
                }),
            );
            return {
                kind: "format",
                name: "acme-gml",
                tool: "import_data",
                args: { action: "import", format: "acme-gml", text: "graph [ ]" },
            };
        },
        registerCameraView: () => {
            registerCameraView({
                descriptor: {
                    id: "acme-corner",
                    plainName: "Corner",
                    description: "From a corner of the box.",
                    modes: ["3d"],
                    options: [],
                },
                compute: () => ({ position: { x: 1, y: 1, z: 1 }, target: { x: 0, y: 0, z: 0 } }),
            });
            return {
                kind: "camera",
                name: "acme-corner",
                tool: "view",
                args: { action: "camera", preset: "acme-corner" },
            };
        },
    };

    for (const [path, register] of Object.entries(PATHS)) {
        it(`finds, describes and accepts an entry registered with ${path} after the assistant was enabled`, async () => {
            const session = createGraphSession();
            await session.data.addNodes([{ id: "a", type: "x" }]);
            const registry = new CommandRegistry();
            installAssistantTools(registry, session);
            const { kind, name, tool, args } = register();
            // The next message rebuilds the tools from the catalog.
            installAssistantTools(registry, session);
            const toolset = buildToolset(session);
            assert.isTrue(
                toolset.index.search(name, { kind: kind as never }).some((hit) => hit.name === name),
                `catalog search finds ${name}`,
            );
            const owner = registry.get(tool);
            assert.isTrue(isAssistantTool(owner));
            let checked: CheckedCall | undefined;
            try {
                checked = isAssistantTool(owner) ? owner.check(args) : undefined;
            } catch (error) {
                assert.fail(
                    `${tool} refused the call: ${error instanceof ToolRefusal ? `${error.code} ${JSON.stringify(error.params)}` : String(error)}`,
                );
            }

            assert.exists(checked);
            const catalog = registry.get("catalog");
            const described = isAssistantTool(catalog) ? catalog.check({ action: "describe", kind, name }) : undefined;
            assert.exists(described, "catalog describe accepts it");
            // Coverage holds with the plugin registered: its options convert, and it is reached.
            const { missing } = coverage({ toolset, doorRoots: DOOR_ROOTS, exclusions: NOT_FOR_THE_ASSISTANT });
            assert.deepStrictEqual(missing, []);
        });
    }

    it("reports an algorithm class registered with no descriptor, and runs it by its address", () => {
        PATHS["Algorithm.register"]();
        assert.deepStrictEqual(assistantReach(), [{ code: "ai.no-descriptor", params: { entry: "acme:legacy-rank" } }]);
    });

    it("reports a registered camera view's options as reached, and passes them", () => {
        registerCameraView({
            descriptor: {
                id: "acme-orbit",
                plainName: "Orbit",
                description: "Orbits the graph at an angle.",
                modes: ["3d"],
                options: [{ name: "angle", plainName: "Angle", type: "number", default: 30 }],
            },
            compute: () => ({ position: { x: 1, y: 1, z: 1 }, target: { x: 0, y: 0, z: 0 } }),
        });
        assert.deepStrictEqual(assistantReach(), []);
        const { missing } = report();
        assert.notInclude(missing, "option:cameras/acme-orbit/angle");
        const registry = new CommandRegistry();
        installAssistantTools(registry, createGraphSession());
        const view = registry.get("view");
        assert.isTrue(isAssistantTool(view));
        assert.exists(
            isAssistantTool(view)
                ? view.check({ action: "camera", preset: "acme-orbit", options: { angle: 45 } })
                : undefined,
        );
    });

    it("covers every register* and define* export of ./extend, and every class's static registration, or says why it does not apply", () => {
        const source = readFileSync(join(__dirname, "..", "..", "..", "extend.ts"), "utf8");
        // The static verbs of the exported classes: Algorithm.register, DataSource.fromImporter...
        const statics = Object.entries(extend).flatMap(([name, value]) =>
            typeof value === "function"
                ? (["register", "fromImporter"] as const)
                      .filter((verb) => typeof (value as unknown as Record<string, unknown>)[verb] === "function")
                      .map((verb) => `${name}.${verb}`)
                : [],
        );
        const exported = [
            ...new Set([...(source.match(/\b(register|define)[A-Z][A-Za-z]*/g) ?? []), ...statics]),
        ].sort();
        const notApplicable = {
            defineLogDestination: "logging: a log destination is not a graph operation",
            registerLogSink: "logging: a log destination is not a graph operation",
            registerAccelerator: "a machine preference: acceleration is not the assistant's to choose",
            defineOptionsSchema: "a helper that builds an options schema, registering nothing",
            "DeclaredAlgorithm.register": "the same verb as Algorithm.register, inherited",
            "SimpleLayoutEngine.register": "the same verb as LayoutEngine.register, inherited",
        };
        const covered = [...Object.keys(PATHS), ...Object.keys(notApplicable)].sort();
        assert.deepStrictEqual(exported, covered);
    });
});
