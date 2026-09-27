/**
 * @file The re-freeze model over the Node data layer, 1,000 sequences (design/sets/sets-design.md
 * sections 4.2, 4.4 and 12.3). The model itself is in `refreeze-model.ts`; the browser variant
 * drives the same model through the real `DataManager`.
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import { cacheCounters } from "../../../src/session/sets/cache";
import { fcParams } from "../../helpers/fc-params";
import { TestGraph } from "./graphs";
import { Model, opsFor, Step } from "./refreeze-model";

describe("every kept set survives any sequence of edits and re-freezes", () => {
    it("matches the model after every command", async () => {
        const ops = opsFor({ embed: true, declared: true }).map((arb) => arb.map((op) => new Step(op)));
        const { hits } = cacheCounters;
        await fc.assert(
            fc.asyncProperty(fc.commands(ops, { maxCommands: 40, size: "+1" }), async (commands) => {
                await fc.asyncModelRun(() => ({ model: new Model(), real: new TestGraph() }), commands);
            }),
            fcParams(1000),
        );
        // The served-equals-fresh check is vacuous unless something was served.
        assert.isAbove(cacheCounters.hits - hits, 0);
    });
});
