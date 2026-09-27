/**
 * @file Every command declares how it behaves under undo, and every undoable one is covered.
 *
 * `satisfies` in `commands.ts` makes an op with no `COMMANDS` entry a compile error; this checks
 * the rest at run time: the published table and the dispatcher's definitions agree op for op,
 * exempt ops say why, and every undoable op has a round-trip fixture for every value of its
 * argument's discriminant (read from the definition's `variants`, never written again here),
 * with a renderer fixture when it changes what is drawn (only that, for an op that runs only on a
 * renderer, which a session must refuse). An op whose every door is still `knownGap` is not
 * reachable through the history yet, and fails here naming the phase that ports it; no check
 * skips (`./no-skips.test.ts`).
 */

import { assert, describe, it } from "vitest";
import { z } from "zod/v4";

import { type CommandMeta, COMMANDS } from "../../../commands";
import { DataConfig } from "../../../src/config/DataConfig";
import { CONFIG_KEYS } from "../../../src/session/commands/config";
import { DEFINITIONS } from "../../../src/session/commands/index";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { SessionCommand } from "../../../src/session/planning";
import { stateDigest } from "../../../src/session/project/digest";
import type { ElementSession } from "../../../src/session/types";
import { fixtureSession } from "./fixture-session";
import { FIXTURES } from "./fixtures";
import { pendingPhase } from "./pending-ops";

/** The published table, as entries. */
const PUBLISHED = Object.entries(COMMANDS) as [string, CommandMeta][];

describe("the vocabulary", () => {
    it("has a definition for every published op, and a published entry for every definition", () => {
        const defined = DEFINITIONS.map((definition) => definition.op).sort();
        const published = PUBLISHED.map(([op]) => op).sort();

        assert.deepEqual(defined, published);
        assert.strictEqual(new Set(defined).size, defined.length, "one definition per op");
    });

    it("agrees with each definition on whether the op is undoable", () => {
        for (const definition of DEFINITIONS) {
            assert.strictEqual(COMMANDS[definition.op].undo, definition.undo.kind, definition.op);
        }
    });

    it("gives every exempt op a reason, in the table and in its definition", () => {
        for (const [op, meta] of PUBLISHED) {
            if (meta.undo === "exempt") {
                assert.isNotEmpty(meta.reason.trim(), op);
            }
        }

        for (const definition of DEFINITIONS) {
            if (definition.undo.kind === "exempt") {
                assert.isNotEmpty(definition.undo.reason.trim(), definition.op);
            }
        }
    });

    it("has fixtures only for ops in the vocabulary and values of their discriminant", () => {
        for (const fixture of FIXTURES) {
            const definition = DEFINITIONS.find((each) => each.op === fixture.command.op);
            assert.isDefined(definition, `${fixture.name} runs an op outside the vocabulary`);
            if (definition.variants !== undefined) {
                assert.include(definition.variants, fixture.variant, fixture.name);
            }
        }
    });

    for (const definition of DEFINITIONS.filter((each) => each.undo.kind === "undoable")) {
        const pending = pendingPhase(definition.op);
        const variants = definition.variants ?? [undefined];
        const covers = (tag: "session" | "renderer"): (string | undefined)[] =>
            variants.filter(
                (variant) =>
                    !FIXTURES.some(
                        (fixture) =>
                            fixture.command.op === definition.op &&
                            fixture.variant === variant &&
                            fixture.tags.includes(tag),
                    ),
            );

        const fixtureTitle = `${definition.op} has a round-trip fixture for every value of its discriminant`;
        if (pending === null && definition.renderer === true) {
            it(`${definition.op} runs only on a renderer, and a session refuses it`, async () => {
                const session = await fixtureSession();
                const refused = await Promise.resolve(
                    dispatcherOf(session).dispatch({ op: definition.op } as SessionCommand),
                ).then(
                    () => undefined,
                    (error: unknown) => error,
                );
                assert.propertyVal(refused, "code", "E_UNSUPPORTED");
                session.dispose();
            });
        } else {
            it(fixtureTitle, () => {
                assert.isNull(pending, `${definition.op}: no door dispatches it until issue ${String(pending)} is fixed`);
                assert.deepEqual(covers("session"), [], `${definition.op}: values with no session fixture`);
            });
        }

        if (definition.draws === true) {
            it(`${definition.op} changes what is drawn, so it has a renderer fixture for every value`, () => {
                assert.isNull(pending, `${definition.op}: no door dispatches it until issue ${String(pending)} is fixed`);
                assert.deepEqual(covers("renderer"), [], `${definition.op}: values with no renderer fixture`);
            });
        }
    }

    it("exempt ops leave the state digest unchanged when dispatched", async () => {
        // One command per exempt op; an exempt op with none here fails below.
        const cases: Readonly<Record<string, SessionCommand>> = {
            "view.camera": { op: "view.camera", position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } },
            "layout.transport": { op: "layout.transport", action: "play" },
            "view.immersive": { op: "view.immersive", mode: "vr" },
        };
        const session = await fixtureSession();
        const dispatcher = dispatcherOf(session as ElementSession);
        const carried: unknown[] = [];
        dispatcher.services.camera = {
            move: (command) => {
                carried.push(command);
                return Promise.resolve();
            },
        };
        dispatcher.services.layout = {
            apply: () => Promise.resolve(),
            transport: (action) => {
                carried.push(action);
            },
            immersive: (mode) => {
                carried.push(mode);
                return Promise.resolve();
            },
        };

        for (const definition of DEFINITIONS.filter((each) => each.undo.kind === "exempt")) {
            const command = cases[definition.op];
            assert.isDefined(command, `${definition.op} has no case here`);
            const before = stateDigest(dispatcher.state);
            const steps = session.history.steps.length;

            await session.execute(command);

            assert.strictEqual(stateDigest(dispatcher.state), before, `${definition.op} changed project state`);
            assert.strictEqual(session.history.steps.length, steps, `${definition.op} recorded a step`);
        }

        assert.deepEqual(carried, [cases["view.camera"], "play", "vr"], "the renderer carried each one out");
        session.dispose();
    });

    it("refuses view.camera on a session that draws nothing", async () => {
        const session = await fixtureSession();
        const refused = await session.execute({ op: "view.camera", preset: "fitToGraph" }).then(
            () => null,
            (error: unknown) => (error as { code?: string }).code,
        );

        assert.strictEqual(refused, "E_UNSUPPORTED");
        session.dispose();
    });

    it("config.set names only ProjectConfig keys, and each exempt layout-behaviour key leaves the digest unchanged", async () => {
        const session = await fixtureSession();
        const dispatcher = dispatcherOf(session as ElementSession);
        // The layout-behaviour settings that are preferences of the view, not project settings
        // (design/undo/undo-design.md section 3.2), under the names config.set would give them,
        // and a key that names nothing at all.
        const outside: readonly unknown[] = [
            { layoutBehavior: { maxInFlight: 3 } },
            { layoutBehavior: { iterationsPerStep: 4 } },
            { layoutBehavior: { zoomStepInterval: 2 } },
            { layoutBehavior: { type: "circular" } },
            { layoutBehavior: { declutter: true } },
            { layoutBehavior: { pinOnDrag: false } },
            { labels: { declutter: true } },
            { node: { pinOnDrag: false } },
            { startingCameraDistance: 30 },
            { data: { knownFields: { nope: "x" } } },
        ];

        for (const values of outside) {
            const before = stateDigest(dispatcher.state);
            const steps = session.history.steps.length;
            const code = await session
                .execute({ op: "config.set", values } as SessionCommand)
                .then(
                    () => null,
                    (error: unknown) => (error as { code?: string }).code,
                );

            assert.strictEqual(code, "E_BAD_COMMAND", JSON.stringify(values));
            assert.strictEqual(stateDigest(dispatcher.state), before, `${JSON.stringify(values)} changed state`);
            assert.strictEqual(session.history.steps.length, steps, `${JSON.stringify(values)} recorded a step`);
        }

        session.dispose();
    });

    it("every leaf of the DataConfig schema is a config slice key or exempt with a reason", () => {
        // Walked here rather than read from the command module, so a leaf the module's own walk
        // missed fails. No leaf is exempt today: every data setting is saved in a project.
        const exempt: Readonly<Record<string, string>> = {};
        const leaves = (schema: z.ZodType, path: string): string[] => {
            let inner = schema;
            while ("innerType" in inner.def) {
                inner = inner.def.innerType as z.ZodType;
            }

            return inner instanceof z.ZodObject
                ? Object.entries(inner.shape as Record<string, z.ZodType>).flatMap(([name, child]) =>
                      leaves(child, `${path}.${name}`),
                  )
                : [path];
        };
        const found = leaves(DataConfig, "data");

        assert.include(found, "data.knownFields.nodeIdPath", "the walk reaches the known fields");
        assert.deepEqual(
            found.filter((path) => !CONFIG_KEYS.has(path) && (exempt[path] ?? "").trim() === ""),
            [],
            "leaves neither a slice key nor exempt with a reason",
        );
    });

    it("view.immersive from 2D and from 3D, and layout.transport, leave the state digest unchanged", async () => {
        const session = await fixtureSession();
        const dispatcher = dispatcherOf(session as ElementSession);
        dispatcher.services.layout = {
            apply: () => Promise.resolve(),
            transport: () => undefined,
            immersive: () => Promise.resolve(),
        };

        for (const dimension of ["2d", "3d"] as const) {
            await session.layout.setDimension(dimension);
            for (const command of [
                { op: "view.immersive", mode: "ar" },
                { op: "view.immersive", mode: null },
                { op: "layout.transport", action: "pause" },
            ] as const) {
                const before = stateDigest(dispatcher.state);
                const steps = session.history.steps.length;
                await session.execute(command);
                assert.strictEqual(stateDigest(dispatcher.state), before, `${JSON.stringify(command)} in ${dimension}`);
                assert.strictEqual(session.history.steps.length, steps);
            }
        }

        session.dispose();
    });

    it("refuses the layout's exempt ops on a session that draws nothing", async () => {
        const session = await fixtureSession();
        for (const command of [
            { op: "layout.transport", action: "play" },
            { op: "view.immersive", mode: "vr" },
        ] as const) {
            const refused = await session.execute(command).then(
                () => null,
                (error: unknown) => (error as { code?: string }).code,
            );
            assert.strictEqual(refused, "E_UNSUPPORTED", command.op);
        }

        session.dispose();
    });

    it("the dimension fields of Styles.config.graph are written only by the layout hook", () => {
        // `graph.viewMode` and `graph.twoD` are computed from the `layout` slice in the merged
        // configuration and stored nowhere, so the one field to police is the scene's record of
        // the dimension, which the edge meshes read. `test/browser/history-layout.test.ts` checks
        // that every reading agrees with the slice after each switch and its undo.
        const sources = import.meta.glob<string>("../../../src/**/*.ts", {
            query: "?raw",
            import: "default",
            eager: true,
        });
        const writers = Object.entries(sources).flatMap(([file, text]) =>
            [...text.matchAll(/metadata\??\.twoD\s*=[^=]/g)].map(() => file),
        );
        assert.deepEqual(writers, ["../../../src/Graph.ts"], "only Graph writes scene.metadata.twoD");

        const graph = sources["../../../src/Graph.ts"];
        const writer = graph.slice(graph.indexOf("private writeSceneDimension("));
        assert.match(writer.slice(0, writer.indexOf("\n    }\n")), /metadata\.twoD = twoD/, "inside writeSceneDimension");
        assert.notMatch(graph, /settings\.graph\.(viewMode|twoD)\s*=/, "no view setting holds the dimension");
    });
});
