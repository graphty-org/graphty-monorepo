/**
 * @file Random sequences of edits, transactions, undos, redos and restores, against a model of
 * the history: whatever the order, the state at every history position is the state sealed for
 * it, undoing everything returns to the start, and redoing everything returns to the end. See
 * design/undo/undo-design.md section 12.5.
 *
 * The session runs on a fake clock and a fake queue (`./fakes.ts`), so fast-check decides when
 * time passes and when every scheduled promise settles, and a failure replays from its seed. The
 * model grows with every op a phase ports (design/undo/undo-plan.md, "How to read this plan",
 * rule 3); today it covers the style, visibility, saved-scope, saved-view, settings and data ops.
 *
 * Checked around every action: before it, the live state digest equals the digest recorded for
 * the current position, so a change that records no step fails at the next action; after every
 * history move, the digest equals the one sealed for the position reached.
 *
 * A fixed list of seeds runs in CI, one test per seed. `FC_SEED` runs one seed instead, and
 * `FC_NUM_RUNS` changes how many sequences each seed tries, for a local soak.
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { SessionCommand } from "../../../src/session/planning";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession } from "../../../src/session/types";
import { type FakeClock, fakeClock, fakeScheduler } from "./fakes";
import { fixtureSession } from "./fixture-session";
import { SKYBOX_PNG } from "./fixtures";

/** The seeds CI runs. */
const SEEDS = [1, 17, 4242, 90210, 2026];
/** Sequences tried per seed. */
const NUM_RUNS = Number(process.env.FC_NUM_RUNS ?? 20);
/** Longest sequence tried. */
const MAX_COMMANDS = 30;
/** Per seed: a coverage run of the whole model is slower than the project's 30 s default. */
const SEED_TIMEOUT_MS = 90_000;
/** The history's coalescing window. */
const COALESCE_MS = 1000;

/** What the model knows of the history. */
interface Model {
    /** The state digest sealed for each history position; index 0 is the baseline. */
    digests: string[];
    /** The visible node and edge ids at each history position. */
    visible: string[];
    position: number;
    /** The coalesce key of the top step, while the next edit could still merge into it. */
    mergeKey: string | null;
    /** When the top step last took an edit. */
    lastAt: number;
    /** Whether the top step may still take a merge: false once anything but a record happened. */
    mergeable: boolean;
}

/** What the commands act on. */
interface Real {
    readonly session: GraphSession;
    readonly clock: FakeClock;
}

type Command = fc.AsyncCommand<Model, Real>;

/**
 * The live state digest.
 * @param real - The system.
 * @returns The digest.
 */
function live(real: Real): string {
    return stateDigest(dispatcherOf(real.session).state, { snapshot: real.session.snapshot() });
}

/**
 * The visible ids, once the masks have caught up.
 * @param real - The system.
 * @returns Their canonical text.
 */
function shown(real: Real): string {
    const { visibility } = real.session;
    return JSON.stringify([[...visibility.nodes].map(String).sort(), [...visibility.edges].map(String).sort()]);
}

/**
 * Fail unless the live state is the one sealed for the model's position.
 * @param model - The model.
 * @param real - The system.
 * @param when - What just happened, for the message.
 */
function expectSealed(model: Model, real: Real, when: string): void {
    assert.strictEqual(live(real), model.digests[model.position], `${when}: the state at position ${String(model.position)}`);
}

/**
 * A layer painting every node one colour.
 * @param name - Its name.
 * @param color - Its colour.
 * @returns The specification.
 */
function layer(name: string, color: string): LayerSpec {
    return { name, target: "node", selector: { match: "everything" }, set: { "node.color": color } };
}

/**
 * The consumer's layers now, the ones an edit may name.
 * @param real - The system.
 * @returns Their ids.
 */
function editable(real: Real): string[] {
    return real.session.styles
        .list()
        .filter((each) => !each.locked)
        .map((each) => each.id);
}

/**
 * Pick one of a list by a generated number.
 * @param list - The list.
 * @param pick - The number.
 * @returns The entry, or undefined for an empty list.
 */
function choose<T>(list: readonly T[], pick: number): T | undefined {
    return list.length === 0 ? undefined : list[pick % list.length];
}

/**
 * Follow one edit: it either recorded a step, merged into the top one, changed nothing, or was
 * refused -- and the history must say which, and agree with the coalescing rule.
 * @param model - The model.
 * @param real - The system.
 * @param label - The edit, for messages.
 * @param key - Its coalesce key, or null.
 * @param act - The edit.
 */
async function edit(model: Model, real: Real, label: string, key: string | null, act: () => PromiseLike<unknown>): Promise<void> {
    expectSealed(model, real, `before ${label}`);
    const { history } = real.session;
    const steps = history.steps.length;
    let refused = false;
    try {
        await act();
    } catch {
        refused = true;
    }

    const now = real.clock.now();
    if (history.position === model.position + 1) {
        assert.isFalse(refused, `${label} was refused and recorded a step`);
        assert.lengthOf(history.steps, model.position + 1, `${label}: recording empties the redo tail`);
        model.digests = [...model.digests.slice(0, model.position + 1), live(real)];
        model.visible = [...model.visible.slice(0, model.position + 1), shown(real)];
        model.position++;
        model.mergeKey = key;
        model.lastAt = now;
        model.mergeable = true;
        return;
    }

    assert.strictEqual(history.position, model.position, `${label} moved the cursor by more than one`);
    assert.lengthOf(history.steps, steps, `${label} changed the history without recording`);
    const merges = !refused && key !== null && model.mergeable && model.mergeKey === key && now - model.lastAt < COALESCE_MS;
    if (merges) {
        model.digests[model.position] = live(real);
        model.visible[model.position] = shown(real);
        model.lastAt = now;
    } else {
        expectSealed(model, real, `${label} recorded nothing, so it changed nothing`);
    }
}

/** A plain edit the model does not need to know the shape of. */
class Edit implements Command {
    constructor(
        private readonly label: string,
        private readonly act: (real: Real) => { key: string | null; run: () => PromiseLike<unknown> } | null,
    ) {}

    check(): boolean {
        return true;
    }

    async run(model: Model, real: Real): Promise<void> {
        const planned = this.act(real);
        if (planned === null) {
            expectSealed(model, real, `before ${this.label} (nothing to name)`);
            return;
        }

        await edit(model, real, this.label, planned.key, planned.run);
    }

    toString(): string {
        return this.label;
    }
}

/** Undo, redo, a restore, or two undos without awaiting the first. */
class Move implements Command {
    constructor(
        private readonly kind: "undo" | "redo" | "restore" | "undo-twice",
        private readonly pick = 0,
    ) {}

    check(): boolean {
        return true;
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before ${this.toString()}`);
        const { session } = real;
        const last = model.digests.length - 1;
        const from = model.position;
        switch (this.kind) {
            case "undo": {
                const outcome = await session.undo();
                assert.strictEqual(outcome.kind, model.position === 0 ? "nothing" : "undone");
                model.position = Math.max(0, model.position - 1);
                break;
            }
            case "redo": {
                const outcome = await session.redo();
                assert.strictEqual(outcome.kind, model.position === last ? "nothing" : "redone");
                model.position = Math.min(last, model.position + 1);
                break;
            }
            case "restore": {
                const target = this.pick % (last + 1);
                await session.history.restoreTo(target === 0 ? null : (session.history.steps[target - 1]?.id ?? null));
                model.position = target;
                break;
            }
            default: {
                const first = session.undo();
                const second = session.undo();
                await Promise.all([first, second]);
                model.position = Math.max(0, model.position - 2);
                break;
            }
        }

        // A move that did nothing (a redo at the end, an undo at the start) leaves the top step
        // open to a merge; one that moved the cursor closes it.
        if (model.position !== from) {
            model.mergeable = false;
        }

        assert.strictEqual(session.history.position, model.position, `${this.toString()} moved the cursor`);
        expectSealed(model, real, `after ${this.toString()}`);
        assert.strictEqual(shown(real), model.visible[model.position], `after ${this.toString()}: the visible ids`);
    }

    toString(): string {
        return this.kind === "restore" ? `restore(${String(this.pick)})` : this.kind;
    }
}

/** Move the clock of the coalescing window. */
class Advance implements Command {
    constructor(private readonly ms: number) {}

    check(): boolean {
        return true;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before advancing ${String(this.ms)} ms`);
        real.clock.advance(this.ms);
        return Promise.resolve();
    }

    toString(): string {
        return `advance(${String(this.ms)})`;
    }
}

/**
 * A transaction adding layers through `tx`, yielding between them, and maybe throwing.
 *
 * It yields to a microtask, not to a promise the scheduler releases: fast-check releases the next
 * scheduled promise only once the running command's `run` has settled, so a `run` awaiting one of
 * its own would wait for ever.
 */
class Transaction implements Command {
    constructor(
        private readonly colors: readonly string[],
        private readonly throws: boolean,
    ) {}

    check(): boolean {
        return true;
    }

    async run(model: Model, real: Real): Promise<void> {
        await edit(model, real, this.toString(), null, () =>
            real.session.transaction("Several layers", async (tx) => {
                for (const color of this.colors) {
                    await Promise.resolve();
                    const command: SessionCommand = { op: "style.patch", action: "add", spec: layer(`Tx ${color}`, color) };
                    await tx.execute(command);
                }

                if (this.throws) {
                    throw new Error("The transaction failed on purpose.");
                }
            }),
        );
    }

    toString(): string {
        return `transaction(${this.colors.join(",")}${this.throws ? ", throws" : ""})`;
    }
}

/** Clear the history: the state now is the new baseline. */
class Clear implements Command {
    check(): boolean {
        return true;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, "before clear");
        real.session.history.clear();
        model.digests = [live(real)];
        model.visible = [shown(real)];
        model.position = 0;
        model.mergeable = false;
        assert.isFalse(real.session.canUndo);
        return Promise.resolve();
    }

    toString(): string {
        return "clear";
    }
}

const color = fc.constantFrom("#ff0000", "#00ff00", "#0000ff", "#ffff00");
const pick = fc.nat({ max: 7 });

/** Every command the model generates. */
const COMMANDS = [
    color.map((value) => new Edit(`add ${value}`, (real) => ({ key: null, run: () => real.session.styles.add(layer("Layer", value)) }))),
    fc.tuple(pick, color).map(
        ([at, value]) =>
            new Edit(`update ${String(at)} to ${value}`, (real) => {
                const id = choose(editable(real), at);
                return id === undefined
                    ? null
                    : { key: `style:${id}:set`, run: () => real.session.styles.update(id, { set: { "node.color": value } }) };
            }),
    ),
    pick.map(
        (at) =>
            new Edit(`remove ${String(at)}`, (real) => {
                const id = choose(editable(real), at);
                return id === undefined ? null : { key: null, run: () => real.session.styles.remove(id) };
            }),
    ),
    fc.tuple(pick, fc.option(pick)).map(
        ([at, before]) =>
            new Edit(`move ${String(at)} below ${String(before)}`, (real) => {
                const id = choose(editable(real), at);
                const below = before === null ? null : (choose(editable(real), before) ?? null);
                return id === undefined ? null : { key: null, run: () => real.session.styles.move(id, below) };
            }),
    ),
    fc.constant(
        new Edit("sweep the user's layers", (real) => ({
            key: null,
            run: () => real.session.styles.removeBySource((source) => source.by === "user"),
        })),
    ),
    fc.constantFrom("node.color", "node.size").map(
        (channel) =>
            new Edit(`encode ${channel}`, (real) => ({ key: null, run: () => real.session.styles.encode({ run: "deg", channel }) })),
    ),
    fc.constant(new Edit("highlight the route", (real) => ({ key: null, run: () => real.session.styles.highlight({ run: "route" }) }))),
    pick.map(
        (at) =>
            new Edit(`fix colour on ${String(at)}`, (real) => {
                const id = choose(editable(real), at);
                return id === undefined ? null : { key: null, run: () => real.session.styles.resolveToStatic(id, "node.color") };
            }),
    ),
    fc.array(color, { minLength: 1, maxLength: 3 }).map(
        (colors) =>
            new Edit(`template of ${String(colors.length)}`, (real) => ({
                key: null,
                run: () =>
                    real.session.styles.applyTemplate({ version: 1, layers: colors.map((value) => layer("Doc", value)) }),
            })),
    ),
    fc.tuple(fc.array(color, { minLength: 1, maxLength: 3 }), fc.boolean()).map(
        ([colors, throws]) => new Transaction(colors, throws),
    ),
    fc.option(fc.nat({ max: 3 })).map(
        (min) =>
            new Edit(`filter degree >= ${String(min)}`, (real) => ({
                key: "filter",
                run: () => real.session.visibility.set(min === null ? null : { kind: "degree", min }),
            })),
    ),
    fc.option(fc.nat({ max: 3 })).map(
        (to) =>
            new Edit(`window to ${String(to)}`, (real) => ({
                key: "window",
                run: () => real.session.visibility.setWindow(to === null ? null : { attribute: "data.t", from: 0, to: to + 1 }),
            })),
    ),
    fc.boolean().map(
        (show) =>
            new Edit(`context ${String(show)}`, (real) => ({
                key: null,
                run: async () => {
                    real.session.visibility.showContext = show;
                    await real.session.styles.settled();
                },
            })),
    ),
    fc.tuple(fc.constantFrom("Hubs", "Leaves", "Route"), fc.subarray(["n1", "n2", "n3"], { minLength: 1 })).map(
        ([name, nodes]) =>
            new Edit(`save scope ${name}`, (real) => ({
                key: null,
                // Synchronous, and refused at once when the name is taken.
                run: () => {
                    real.session.scope.save(name, { nodes });
                    return Promise.resolve();
                },
            })),
    ),
    pick.map(
        (at) =>
            new Edit(`remove scope ${String(at)}`, (real) => {
                const saved = choose(real.session.scope.list(), at);
                return saved === undefined
                    ? null
                    : {
                          key: null,
                          run: () => {
                              real.session.scope.remove(saved.id);
                              return Promise.resolve();
                          },
                      };
            }),
    ),
    fc.tuple(fc.constantFrom("Front", "Top"), fc.nat({ max: 4 })).map(
        ([name, zoom]) =>
            new Edit(`save view ${name} at ${String(zoom)}`, (real) => ({
                key: null,
                run: () => real.session.views.save([{ name, camera: { zoom } }]),
            })),
    ),
    pick.map(
        (at) =>
            new Edit(`remove view ${String(at)}`, (real) => {
                const name = choose([...real.session.views.keys()], at);
                return name === undefined ? null : { key: null, run: () => real.session.views.remove([name]) };
            }),
    ),
    fc.constantFrom("name", "label", null).map(
        (path) =>
            new Edit(`label path ${String(path)}`, (real) => ({
                key: "config:data.knownFields.nodeLabelPath",
                run: () => real.session.config.set({ data: { knownFields: { nodeLabelPath: path ?? undefined } } }),
            })),
    ),
    fc.tuple(color, fc.boolean()).map(
        ([background, skybox]) =>
            new Edit(`background ${skybox ? "skybox" : background}`, (real) => ({
                key: "config:background",
                run: () =>
                    real.session.config.set({
                        background: skybox
                            ? { backgroundType: "skybox", data: SKYBOX_PNG }
                            : { backgroundType: "color", color: background },
                    }),
            })),
    ),
    fc.tuple(fc.nat({ max: 3 }), fc.nat({ max: 3 })).map(
        ([preSteps, minDelta]) =>
            new Edit(`pre-steps ${String(preSteps)} and min delta ${String(minDelta)}`, (real) => ({
                key: "config:layoutBehavior.minDelta,layoutBehavior.preSteps",
                run: () => real.session.config.set({ layoutBehavior: { preSteps, minDelta } }),
            })),
    ),
    fc.tuple(fc.constantFrom("n4", "n5", "n6"), fc.nat({ max: 3 })).map(
        ([id, t]) =>
            new Edit(`add node ${id}`, (real) => ({
                key: null,
                run: () => real.session.data.addNodes([{ id, t }]),
            })),
    ),
    fc.tuple(fc.constantFrom("n1", "n2", "n3", "n4", "n7"), fc.constantFrom("n1", "n2", "n3", "n5", "n8")).map(
        ([src, dst]) =>
            new Edit(`add edge ${src} -> ${dst}`, (real) => ({
                key: null,
                run: () => real.session.data.addEdges([{ src, dst }]),
            })),
    ),
    fc.tuple(fc.constantFrom("n1", "n2", "n3", "n4"), fc.nat({ max: 3 })).map(
        ([id, t]) =>
            new Edit(`set t of ${id} to ${String(t)}`, (real) => ({
                key: null,
                run: () => real.session.data.updateNodes([{ id, values: { t } }]),
            })),
    ),
    fc.nat({ max: 3 }).map(
        (weight) =>
            new Edit(`tag every node with ${String(weight)}`, (real) => ({
                key: null,
                run: () =>
                    real.session.execute({
                        op: "data.apply",
                        mutation: { kind: "set-attributes", target: "node", ids: ["n1", "n2", "n3"], values: { weight } },
                    }),
            })),
    ),
    fc.constant(new Move("undo")),
    fc.constant(new Move("redo")),
    fc.constant(new Move("undo-twice")),
    pick.map((at) => new Move("restore", at)),
    fc.constantFrom(16, 400, 5000).map((ms) => new Advance(ms)),
    fc.constant(new Clear()),
];

/**
 * Run the model for one seed.
 * @param seed - The seed.
 * @param numRuns - How many sequences to try.
 */
async function runSeed(seed: number, numRuns: number): Promise<void> {
    await fc.assert(
        fc.asyncProperty(fc.scheduler(), fc.commands(COMMANDS, { maxCommands: MAX_COMMANDS }), async (s, commands) => {
            let real: Real | undefined;
            let model: Model | undefined;
            await fc.scheduledModelRun(
                s,
                async () => {
                    const clock = fakeClock();
                    const session = await fixtureSession({ now: clock.now, scheduler: fakeScheduler(s) });
                    await session.runs.start("degree", {}, { as: "deg", style: false });
                    await session.runs.start("shortest-path", { source: "n1", target: "n3" }, { as: "route", style: false });
                    real = { session, clock };
                    model = {
                        digests: [live(real)],
                        visible: [shown(real)],
                        position: 0,
                        mergeKey: null,
                        lastAt: 0,
                        mergeable: false,
                    };
                    return { model, real };
                },
                commands,
            );

            assert.isDefined(real);
            assert.isDefined(model);
            const { session } = real;
            await session.history.restoreTo(null);
            assert.strictEqual(live(real), model.digests[0], "undoing everything returns to the start");
            const top = session.history.steps.at(-1);
            if (top !== undefined) {
                await session.history.restoreTo(top.id);
            }

            assert.strictEqual(live(real), model.digests.at(-1), "redoing everything returns to the end");
            session.dispose();
        }),
        { seed, numRuns, endOnFailure: true },
    );
}

describe("random sequences of style, visibility, scope, view, settings and data edits and history moves", () => {
    const only = process.env.FC_SEED;
    for (const seed of only === undefined ? SEEDS : [Number(only)]) {
        it(`holds for seed ${String(seed)}`, () => runSeed(seed, NUM_RUNS), SEED_TIMEOUT_MS);
    }
});
