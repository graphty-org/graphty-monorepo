/**
 * scripts/bench-ab.js: the statistics of the paired base-versus-candidate benchmark, on synthetic samples so no GPU is
 * needed. The samples imitate the Tesla T4 lane's sub-millisecond rows: every process of a round sees the same clock
 * and thermal drift (up to 40 % slower than the best round), each sample carries a few percent of jitter, and some
 * samples land on the 210 MHz idle clock and come out 2.5 times slower. Against that noise the absolute gate of
 * scripts/bench-compare.js cannot see a 15 % slowdown; the paired comparison must.
 */
import { describe, expect, it } from "vitest";

import { makeRandom } from "../benchmarks/harness.js";
import { type AbRound, compareRounds, DEFAULT_THRESHOLD } from "../scripts/bench-ab.js";

/** The true cost of the synthetic row, milliseconds: sub-millisecond, like the roundtrip and small layout rungs. */
const TRUE_MS = 0.4;
/** Rounds and timed runs per process, the defaults of the script. */
const ROUNDS = 4;
const RUNS = 5;

/**
 * Synthetic rounds of one row.
 * @param seed - the random seed
 * @param slowdown - the candidate's true cost over the base's (1 = identical builds)
 * @returns the rounds, in the ABBA order the script runs them
 */
function syntheticRounds(seed: number, slowdown: number): AbRound[] {
    const random = makeRandom(seed);
    const samples = (cost: number, drift: number): number[] =>
        Array.from({ length: RUNS }, () => {
            const clockDrop = random() < 0.2 ? 2.5 : 1;
            return cost * drift * clockDrop * (1 + random() * 0.04);
        });
    const rounds: AbRound[] = [];
    for (let r = 0; r < ROUNDS; r++) {
        const drift = 1 + random() * 0.4; // shared by both builds of the round
        const nudge = (): number => 1 + (random() - 0.5) * 0.04; // what drifts between the two processes of a round
        rounds.push({
            base: [{ group: "roundtrip", name: "row", samples: samples(TRUE_MS, drift * nudge()) }],
            candidate: [{ group: "roundtrip", name: "row", samples: samples(TRUE_MS * slowdown, drift * nudge()) }],
        });
    }
    return rounds;
}

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("scripts/bench-ab.js compareRounds", () => {
    it("flags a 15 % slowdown on a sub-millisecond row", () => {
        for (const seed of SEEDS) {
            const [row] = compareRounds(syntheticRounds(seed, 1.15));
            expect(row.status, `seed ${String(seed)}: ratio ${String(row.ratio)} low ${String(row.low)}`).toBe(
                "REGRESSION",
            );
            expect(row.low).toBeGreaterThan(DEFAULT_THRESHOLD);
        }
    });

    it("passes an identical build", () => {
        for (const seed of SEEDS) {
            const [row] = compareRounds(syntheticRounds(seed, 1));
            expect(row.status, `seed ${String(seed)}: ratio ${String(row.ratio)} low ${String(row.low)}`).toBe("ok");
        }
    });

    it("passes a faster candidate", () => {
        const [row] = compareRounds(syntheticRounds(7, 0.8));
        expect(row.status).toBe("ok");
        expect(row.ratio).toBeLessThan(1);
    });

    it("reports rows present on one side only as new or removed, and one round as too few", () => {
        const rows = compareRounds([
            {
                base: [{ group: "g", name: "gone", samples: [1] }],
                candidate: [{ group: "g", name: "added", samples: [1] }],
            },
        ]);
        expect(rows.map((r) => [r.key, r.status])).toEqual([
            ["g/gone", "removed"],
            ["g/added", "new"],
        ]);
        const single = compareRounds([
            { base: [{ group: "g", name: "x", samples: [1] }], candidate: [{ group: "g", name: "x", samples: [2] }] },
        ]);
        expect(single[0].status).toBe("too few rounds");
    });
});
