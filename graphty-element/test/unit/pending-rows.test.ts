/**
 * @file The painter's queue of rows waiting to be drawn takes them oldest first, holds each row
 * once, and takes a row again only after it is added again -- the order a Set in insertion order
 * gives, which is what it replaced. Checked against that Set over a seeded random run.
 */

import { assert, describe, it } from "vitest";

import { PendingRows } from "../../src/managers/StylePainter";

/**
 * The order the queue must keep: a Set, taken oldest first.
 */
class SetModel {
    private readonly rows = new Set<number>();

    get size(): number {
        return this.rows.size;
    }

    has(row: number): boolean {
        return this.rows.has(row);
    }

    add(row: number): void {
        this.rows.add(row);
    }

    clear(): void {
        this.rows.clear();
    }

    take(limit: number): number[] {
        const taken: number[] = [];

        for (const row of this.rows) {
            if (taken.length >= limit) {
                break;
            }

            taken.push(row);
        }

        for (const row of taken) {
            this.rows.delete(row);
        }

        return taken;
    }
}

/**
 * A seeded generator, so a failure names a run that repeats.
 * @param seed - The seed.
 * @returns The next value in [0, 1) on each call.
 */
function seeded(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

        return state / 2 ** 32;
    };
}

describe("PendingRows", () => {
    it("takes nothing from an empty queue", () => {
        const rows = new PendingRows();

        assert.deepEqual(rows.take(5), []);
        assert.equal(rows.size, 0);
    });

    it("holds a row once and takes rows in the order they were first added", () => {
        const rows = new PendingRows();

        for (const row of [5, 1, 5, 900, 1, 0]) {
            rows.add(row);
        }

        assert.equal(rows.size, 4);
        assert.isTrue(rows.has(900));
        assert.isFalse(rows.has(2));
        assert.deepEqual(rows.take(2), [5, 1]);
        assert.isFalse(rows.has(5));
        rows.add(5);
        assert.deepEqual(rows.take(Number.POSITIVE_INFINITY), [900, 0, 5]);
        assert.equal(rows.size, 0);
    });

    it("agrees with a Set over a long random run of adds, takes and clears", () => {
        const random = seeded(108);
        const rows = new PendingRows();
        const model = new SetModel();

        for (let step = 0; step < 20_000; step++) {
            const roll = random();

            if (roll < 0.7) {
                const row = Math.floor(random() * (roll < 0.05 ? 50_000 : 300));
                rows.add(row);
                model.add(row);
            } else if (roll < 0.995) {
                const limit = Math.floor(random() * 40);
                assert.deepEqual(rows.take(limit), model.take(limit), `step ${step}`);
            } else {
                rows.clear();
                model.clear();
            }

            assert.equal(rows.size, model.size, `step ${step}`);
        }

        for (let row = 0; row < 300; row++) {
            assert.equal(rows.has(row), model.has(row), `row ${row}`);
        }
    });
});
