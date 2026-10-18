/**
 * @file Every history step carries a fact: a code from the documented set (`HistoryCode`) and
 * the params that code documents, never words.
 *
 * Table-driven over the round-trip fixtures, which cover every undoable op and every value of its
 * discriminant: `CODES_BY_OP` is keyed by every undoable op in `COMMANDS`, so an op added without
 * an entry here is a compile error, and an op whose step carries a code it does not list fails.
 * `PARAMS` is keyed by every `HistoryCode`, so a code added to the type without its params named
 * here is a compile error too.
 */

import { assert, describe, it } from "vitest";

import { COMMANDS } from "../../../commands";
import type { CodedFact } from "../../../src/session/shared";
import type { HistoryCode, HistoryStep } from "../../../src/session/types";
import { fixtureSession } from "./fixture-session";
import { FIXTURES } from "./fixtures";

/** The undoable ops of the vocabulary. */
type UndoableOp = {
    [Op in keyof typeof COMMANDS]: (typeof COMMANDS)[Op]["undo"] extends "undoable" ? Op : never;
}[keyof typeof COMMANDS];

/** The codes a step of each undoable op may carry. */
const CODES_BY_OP: Readonly<Record<UndoableOp, readonly HistoryCode[]>> = {
    "algo.run": ["algo.run"],
    "algo.legacy": ["algo.legacy"],
    "algo.remove": ["algo.remove"],
    "algo.move": ["algo.move"],
    batch: ["batch", "data.replace-nodes", "data.replace-edges", "data.set", "layout.behavior"],
    "data.apply": [
        "data.add-nodes",
        "data.add-edges",
        "data.remove-nodes",
        "data.remove-edges",
        "data.edit",
        "data.clear",
    ],
    "data.import": ["data.import"],
    "data.expand": ["data.expand"],
    "data.declare": ["data.declare"],
    "data.setSource": ["data.set-source"],
    "style.patch": [
        "style.add-layer",
        "style.update-layer",
        "style.remove-layer",
        "style.move-layer",
        "style.remove-layers",
        "style.highlight",
        "style.fix-channel",
    ],
    "style.encode": ["style.encode"],
    "style.template": ["style.template"],
    "visibility.set": ["visibility.filter", "visibility.clear-filter"],
    "visibility.window": ["visibility.window", "visibility.clear-window"],
    "visibility.context": ["visibility.show-context", "visibility.hide-context"],
    "visibility.steps": [
        "visibility.step-add",
        "visibility.step-edit",
        "visibility.step-on",
        "visibility.step-off",
        "visibility.step-remove",
        "visibility.steps",
    ],
    "set.create": ["set.create"],
    "set.rename": ["set.rename"],
    "set.redefine": ["set.redefine"],
    "set.members": ["set.members"],
    "set.remove": ["set.remove"],
    "set.restore": ["set.restore"],
    "note.add": ["note.add"],
    "note.update": ["note.update"],
    "note.remove": ["note.remove"],
    "note.merge": ["note.merge"],
    "view.save": ["view.save"],
    "view.remove": ["view.remove"],
    "config.set": ["config.set"],
    "positions.set": ["positions.set"],
    "positions.pin": ["positions.pin", "positions.release"],
    "layout.set": ["layout.set"],
    "layout.scope": ["layout.scope", "layout.whole-graph"],
    "view.dimension": ["view.dimension"],
};

/** The params each code documents, by name. */
const PARAMS: Readonly<Record<HistoryCode, readonly string[]>> = {
    "algo.run": ["algorithm"],
    "algo.legacy": ["algorithm"],
    "algo.remove": ["algorithm", "run"],
    "algo.move": ["algorithm", "run"],
    "algo.batch": ["count", "label"],
    "algo.template": [],
    batch: ["label", "steps"],
    "data.add-nodes": ["count"],
    "data.add-edges": ["count"],
    "data.remove-nodes": ["count"],
    "data.remove-edges": ["count"],
    "data.edit": ["count", "target"],
    "data.clear": [],
    "data.set": [],
    "data.replace-nodes": [],
    "data.replace-edges": [],
    "data.import": ["name", "type"],
    "data.expand": ["node"],
    "data.declare": ["column", "kind"],
    "data.set-source": ["name"],
    "style.add-layer": ["layer"],
    "style.update-layer": ["channels", "layer"],
    "style.remove-layer": ["layer"],
    "style.move-layer": ["layer"],
    "style.remove-layers": ["count"],
    "style.highlight": ["run"],
    "style.fix-channel": ["channel", "layer"],
    "style.encode": ["channel", "run"],
    "style.template": [],
    "style.suggested": ["algorithms"],
    "visibility.filter": ["kind"],
    "visibility.clear-filter": [],
    "visibility.window": [],
    "visibility.clear-window": [],
    "visibility.show-context": [],
    "visibility.hide-context": [],
    "visibility.step-add": ["id"],
    "visibility.step-edit": ["id"],
    "visibility.step-on": ["id"],
    "visibility.step-off": ["id"],
    "visibility.step-remove": ["id"],
    "visibility.steps": [],
    "set.create": ["name"],
    "set.rename": ["name", "set"],
    "set.redefine": ["set"],
    "set.members": ["set"],
    "set.remove": ["set"],
    "set.restore": ["set"],
    "note.add": [],
    "note.update": [],
    "note.remove": [],
    "note.merge": ["source"],
    "view.save": ["names"],
    "view.remove": ["names"],
    "view.dimension": ["dimension"],
    "view.immersive": ["mode"],
    "config.set": ["keys"],
    "positions.set": ["count"],
    "positions.pin": ["count"],
    "positions.release": ["count"],
    "node.drag": ["node"],
    "layout.set": ["layout"],
    "layout.behavior": ["layout"],
    "layout.scope": [],
    "layout.whole-graph": [],
    "project.open": ["name"],
    "document.open": [],
    transaction: ["label"],
};

/**
 * The step a command just recorded.
 * @param steps - The history's steps.
 * @param position - How many are applied.
 * @returns The top applied step.
 */
function topOf(steps: readonly HistoryStep[], position: number): HistoryStep {
    const step = steps[position - 1];
    assert.isDefined(step, "a step was recorded");
    return step;
}

/**
 * Check a fact against the documented set: a known code, and exactly its params, each a plain value.
 * @param fact - The fact.
 * @param where - What it belongs to, for the message.
 */
function assertDocumented(fact: CodedFact<HistoryCode>, where: string): void {
    assert.property(PARAMS, fact.code, `${where}: ${fact.code} is not a documented code`);
    assert.deepEqual(
        Object.keys(fact.params).sort(),
        [...PARAMS[fact.code]].sort(),
        `${where}: params of ${fact.code}`,
    );
    assert.isTrue(Object.isFrozen(fact) && Object.isFrozen(fact.params), `${where}: frozen`);
    assert.deepEqual(JSON.parse(JSON.stringify(fact)), fact, `${where}: plain values`);
}

describe("history step facts", () => {
    it("lists every undoable op of COMMANDS, and no other", () => {
        const undoable = Object.entries(COMMANDS)
            .filter(([, meta]) => meta.undo === "undoable")
            .map(([op]) => op)
            .sort();
        assert.deepEqual(Object.keys(CODES_BY_OP).sort(), undoable);
    });

    for (const fixture of FIXTURES.filter((each) => each.tags.includes("session"))) {
        it(fixture.name, async () => {
            const session = await fixtureSession();
            await fixture.before?.(session);
            const before = session.history.steps.at(session.history.position - 1);

            await session.execute(fixture.command);

            const step = topOf(session.history.steps, session.history.position);
            assert.notStrictEqual(step, before, "the command recorded a step of its own");
            assertDocumented(step.fact, fixture.name);
            assert.include(
                CODES_BY_OP[fixture.command.op as UndoableOp],
                step.fact.code,
                `${fixture.command.op} carries a code listed for it`,
            );
            session.dispose();
        });
    }

    it("says what was done with its values, not words", async () => {
        const session = await fixtureSession();
        const facts: CodedFact<HistoryCode>[] = [];
        const record = (): void => {
            facts.push(topOf(session.history.steps, session.history.position).fact);
        };

        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        record();
        await session.data.removeEdges(["0"]);
        record();
        await session.transaction("Mine", async (tx) => {
            await tx.data.addNodes([{ id: "d" }]);
        });
        record();
        await session.execute({
            op: "batch",
            steps: [
                { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "e" }] } },
                { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "f" }] } },
            ],
        });
        record();
        await session.execute({ op: "positions.pin", ids: ["a", "b"], pinned: true });
        record();

        assert.deepEqual(facts, [
            { code: "data.add-nodes", params: { count: 3 } },
            { code: "data.remove-edges", params: { count: 1 } },
            { code: "transaction", params: { label: "Mine" } },
            { code: "batch", params: { label: null, steps: 2 } },
            { code: "positions.pin", params: { count: 2 } },
        ]);
        for (const fact of facts) {
            assertDocumented(fact, fact.code);
        }

        session.dispose();
    });

    it("names the channels a layer update changes", async () => {
        const session = await fixtureSession();
        const layer = await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.update(layer.id, { set: { "node.color": "#ff0000", "node.size": 2 } });
        const sized = topOf(session.history.steps, session.history.position).fact;
        await session.styles.update(layer.id, { name: "Renamed" });
        const renamed = topOf(session.history.steps, session.history.position).fact;

        assert.deepEqual(sized, { code: "style.update-layer", params: { layer: "Mine", channels: ["node.size"] } });
        assert.deepEqual(renamed, { code: "style.update-layer", params: { layer: "Mine", channels: [] } });
        session.dispose();
    });

    it("gives a pending step the fact it will have", async () => {
        const session = await fixtureSession();
        const seen: CodedFact<HistoryCode>[] = [];
        await session.transaction("Pending", async (tx) => {
            seen.push(...session.history.pending.map((item) => item.fact));
            await tx.data.addNodes([{ id: "p" }]);
        });

        assert.deepEqual(seen, [{ code: "transaction", params: { label: "Pending" } }]);
        assert.deepEqual(topOf(session.history.steps, session.history.position).fact, seen[0]);
        session.dispose();
    });
});
