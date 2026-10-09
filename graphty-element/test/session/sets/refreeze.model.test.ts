/**
 * @file The re-freeze model over the Node data layer, 250 sequences a run (design/sets/sets-design.md
 * sections 4.2, 4.4 and 12.3). The model itself is in `refreeze-model.ts`; the browser variant
 * drives the same model through the real `DataManager`.
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import { cacheCounters } from "../../../src/session/sets/cache";
import { guardedAsyncProperty } from "../../helpers/caught-errors";
import { fcParams } from "../../helpers/fc-params";
import { TestGraph } from "./graphs";
import { Model, opsFor, Step } from "./refreeze-model";

/**
 * Sequences per run. Each is up to 40 commands, each followed by a freeze when it changed the
 * graph and a full comparison of every kept set, and that is the data layer's own work (freezes,
 * store builds, set doors), so a sequence is not made cheaper. 1,000 a run took 3.3-3.9 s alone
 * and 28 s in a busy pre-push gate, against the 30 s default. The seed is new every run
 * (fc-params.ts), so the generators reach as many sequences over a few runs as they did in one,
 * and a quarter of the work keeps one run well inside the default however busy the machine is.
 */
const SEQUENCES = 250;

describe("every kept set survives any sequence of edits and re-freezes", () => {
    it("matches the model after every command", async () => {
        const ops = opsFor({ embed: true, declared: true }).map((arb) => arb.map((op) => new Step(op)));
        const { hits } = cacheCounters;
        await fc.assert(
            guardedAsyncProperty(fc.commands(ops, { maxCommands: 40, size: "+1" }), async (commands) => {
                await fc.asyncModelRun(() => ({ model: new Model(), real: new TestGraph() }), commands);
            }),
            fcParams(SEQUENCES),
        );
        // The served-equals-fresh check is vacuous unless something was served.
        assert.isAbove(cacheCounters.hits - hits, 0);
    });
});
