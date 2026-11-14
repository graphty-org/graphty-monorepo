/**
 * @file `session.calibrate()`: measuring this machine once per page so that estimates stop reporting
 * "modelled" and report "calibrated", published through `capabilities.calibration`.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { resetCalibration } from "../../src/session/cost";
import type { SessionCapabilities } from "../../src/session/types";
import { type Harness, makeSession } from "./helpers";

/** A chain of 100 nodes. */
const IDS = Array.from({ length: 100 }, (_, index) => `n${String(index)}`);

/**
 * A session over the chain.
 * @returns The harness.
 */
function chain(): Harness {
    const harness = makeSession();
    harness.add(
        IDS.map((id) => ({ id })),
        IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })),
    );

    return harness;
}

let restoreClock: (() => void) | undefined;

beforeEach(() => {
    resetCalibration();
    // A clock that advances 1 ms on every read, so every workload clears the clock's resolution
    // and the probe measures on any runner.
    let clock = 0;
    const reads = vi.spyOn(performance, "now").mockImplementation(() => clock++);
    restoreClock = () => {
        reads.mockRestore();
    };
});

afterEach(() => {
    restoreClock?.();
    resetCalibration();
});

describe("session.calibrate()", () => {
    it("turns a modelled estimate into a calibrated one", async () => {
        const { session } = chain();
        const before = session.estimate({ op: "algo.run", algorithm: "degree" });
        assert.strictEqual(before.confidence, "modelled");
        assert.strictEqual(session.capabilities.calibration, null, "nothing measured yet");

        const limits = await session.calibrate();

        const { capabilities } = session;
        assert.strictEqual(limits, capabilities.limits, "it resolves with the limits in force");
        assert.strictEqual(capabilities.calibration?.basis, "probe");
        const after = session.estimate({ op: "algo.run", algorithm: "degree" });
        assert.strictEqual(after.confidence, "calibrated");
        assert.include(after.basis, "calibrated");
    });

    it("reports the calibration through capabilities:changed", async () => {
        const { session } = chain();
        const seen: SessionCapabilities[] = [];
        const stop = session.on("capabilities:changed", ({ capabilities }) => {
            seen.push(capabilities);
        });

        await session.calibrate();
        stop();

        assert.lengthOf(seen, 1);
        assert.strictEqual(seen[0], session.capabilities, "the event carries the document capabilities returns");
        assert.isString(seen[0].calibration?.at);
    });

    it("measures once for every session on the page", async () => {
        const first = chain().session;
        const second = chain().session;

        await first.calibrate();

        assert.deepStrictEqual(second.capabilities.calibration, first.capabilities.calibration);
        assert.strictEqual(second.estimate({ op: "algo.run", algorithm: "degree" }).confidence, "calibrated");
    });

    it("rejects at once on a signal that has already fired", async () => {
        const { session } = chain();
        const controller = new AbortController();
        controller.abort();

        const error: unknown = await session
            .calibrate({ signal: controller.signal })
            .catch((caught: unknown) => caught);

        assert.instanceOf(error, DOMException);
        assert.strictEqual(error.name, "AbortError");
        assert.isNull(session.capabilities.calibration, "nothing was measured");
    });

    it("stops waiting when cancelled, while the shared measurement still lands", async () => {
        const { session } = chain();
        const controller = new AbortController();

        const waiting = session.calibrate({ signal: controller.signal }).catch((caught: unknown) => caught);
        controller.abort();
        const error = await waiting;

        assert.strictEqual((error as DOMException).name, "AbortError");
        await session.calibrate();
        assert.strictEqual(session.capabilities.calibration?.basis, "probe");
    });
});
