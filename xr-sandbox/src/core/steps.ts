// Step lists (design section 7): the Florentine families journey and short drills, one question
// each. A step says what to do, never how: how is what is being tried. The family, rank and
// threshold come from a seed chosen per run and logged, so a second run measures the technique
// and not the owner's memory of the answer.

/** One step of a list. */
export interface Step {
    id: string;
    text: string;
}

/** The facts the step texts are filled from. */
export interface StepFacts {
    names: readonly string[];
    /** Node indices by PageRank, highest first. */
    pagerankOrder: readonly number[];
    pagerank: Float64Array;
    resultNames: readonly string[];
}

/** The lists the `steps=` parameter accepts. */
export const STEP_LISTS = ["journey", "q2", "q3", "q4", "q6"] as const;

/**
 * A small seeded generator (mulberry32), so a seed gives the same steps on every device.
 * @param seed - any integer
 * @returns a function returning numbers in [0, 1)
 */
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Build a step list.
 * @param list - the list id ("journey", "q2", ...)
 * @param seed - the run's seed
 * @param f - facts about the graph
 * @returns the steps, in order
 */
export function buildSteps(list: string, seed: number, f: StepFacts): Step[] {
    const rnd = seeded(seed);
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
    const family = (): string => f.names[pick(f.pagerankOrder)];
    switch (list) {
        case "q2":
            return ["Neighbors", "Probe", "Note", "Hide", "Select", "Neighbors"].map((verb, i) => ({
                id: `q2-${i + 1}`,
                text: `Open the ${family()}'s menu and choose ${verb}`,
            }));
        case "q3":
            return [1, 2, 3, 4].map((i) => ({
                id: `q3-${i}`,
                text: `Select the ${family()} and everything within 2 hops`,
            }));
        case "q4":
            return [1, 2, 3, 4].map((i) => ({ id: `q4-${i}`, text: `Color by ${pick(f.resultNames)}` }));
        case "q6":
            return [{ id: "q6-1", text: `Write a three-word note on the ${family()}` }];
        default: {
            const fam = family();
            const k = 1 + Math.floor(rnd() * Math.min(5, f.pagerankOrder.length));
            const threshold =
                f.pagerank[f.pagerankOrder[Math.min(f.pagerankOrder.length - 1, 4 + Math.floor(rnd() * 3))]];
            return [
                { id: "orient", text: "Look around the graph" },
                { id: "find", text: `Find the ${fam}` },
                { id: "married", text: `Select the ${fam} and the families they married into` },
                { id: "pagerank", text: "Run PageRank" },
                { id: "read", text: `Which family ranks #${k}?` },
                { id: "color", text: "Color and size the families by PageRank" },
                { id: "keep", text: `Keep only the families with PageRank of at least ${threshold.toFixed(3)}` },
                { id: "note", text: `Write a note on the ${fam}` },
                { id: "undo", text: "Color by degree, then undo it" },
                { id: "save", text: "Save" },
            ];
        }
    }
}
