/**
 * @file The re-freeze model over the Node data layer, 1,000 sequences (design/sets/sets-design.md
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
 * About 20,000 commands over 1,000 sequences, each followed by a freeze when it changed the graph
 * and a full comparison of every kept set. What is left is the data layer's own work (freezes,
 * store builds, set doors), so it is not made cheaper further. Measured: 3.3-3.9 s alone at a
 * load average of about 13, and up to 9.9 s beside the default project at about 45. Under several
 * concurrent pre-push gates it ran past the 30 s default (issue #1269), hence 60 s.
 */
const TIMEOUT_MS = 60_000;

describe("every kept set survives any sequence of edits and re-freezes", () => {
    it(
        "matches the model after every command",
        async () => {
            const ops = opsFor({ embed: true, declared: true }).map((arb) => arb.map((op) => new Step(op)));
            const { hits } = cacheCounters;
            await fc.assert(
                guardedAsyncProperty(fc.commands(ops, { maxCommands: 40, size: "+1" }), async (commands) => {
                    await fc.asyncModelRun(() => ({ model: new Model(), real: new TestGraph() }), commands);
                }),
                fcParams(1000),
            );
            // The served-equals-fresh check is vacuous unless something was served.
            assert.isAbove(cacheCounters.hits - hits, 0);
        },
        TIMEOUT_MS,
    );
});
