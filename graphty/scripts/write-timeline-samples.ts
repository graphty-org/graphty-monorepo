/**
 * Writes the two timed samples into public/samples/ as NetworkX node-link JSON, so the start screen
 * opens them by URL with no network, like the other samples:
 *
 * - office-email.json: a 48-person office over the first half of 2025, one edge per email, each
 *   carrying `sent` (ISO 8601, UTC). Weekday rhythm, quiet weekends, and three bursts: a product
 *   launch (engineering and design, March 10-14), quarter end (sales, March 24-31) and an all-hands
 *   offsite week (June 2-6).
 * - paper-citations.json: 160 papers from 1995 to 2024, each carrying `year` (a number); an edge
 *   runs from the citing paper to an older one it cites. Edges carry no time: they follow their ends.
 *
 * Both are synthetic and seeded (mulberry32), so a rerun writes the same bytes.
 * Run: npm run samples:write-timeline (from graphty/).
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/samples");
const DAY = 86_400_000;

/**
 * A seeded generator of numbers in [0, 1).
 * @param seed - the seed.
 * @returns the generator.
 */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
}

/**
 * A Poisson draw (Knuth), fine for the small rates used here.
 * @param rand - the generator.
 * @param mean - the mean.
 * @returns the count.
 */
function poisson(rand: () => number, mean: number): number {
    const limit = Math.exp(-mean);
    let k = 0;
    let p = rand();
    while (p > limit) {
        k++;
        p *= rand();
    }
    return k;
}

const FIRST_NAMES = [
    "Ada",
    "Ben",
    "Cara",
    "Dev",
    "Eli",
    "Fay",
    "Gus",
    "Hana",
    "Ivan",
    "June",
    "Kai",
    "Lena",
    "Milo",
    "Nia",
    "Owen",
    "Pia",
    "Quin",
    "Rosa",
    "Sam",
    "Tara",
    "Umar",
    "Vera",
    "Wes",
    "Xena",
    "Yuri",
    "Zoe",
    "Abe",
    "Bea",
    "Cole",
    "Dina",
    "Ezra",
    "Flo",
    "Gil",
    "Hugo",
    "Iris",
    "Jon",
    "Kira",
    "Leo",
    "Maya",
    "Ned",
    "Opal",
    "Pete",
    "Rhea",
    "Seth",
    "Tess",
    "Uma",
    "Vic",
    "Wren",
];
const TEAMS = ["Engineering", "Design", "Sales", "Operations"];

/**
 * The office email network.
 * @returns node-link JSON.
 */
function officeEmail(): object {
    const rand = mulberry32(2025);
    // A person is called by their name: `label` is the column graphty-element names a node by.
    const people = FIRST_NAMES.map((label, i) => ({
        id: `p${String(i + 1).padStart(2, "0")}`,
        label,
        team: TEAMS[i % 4],
    }));
    const start = Date.UTC(2025, 0, 1);
    const end = Date.UTC(2025, 6, 1);
    const within = (t: number, from: [number, number], to: [number, number]): boolean =>
        t >= Date.UTC(2025, from[0] - 1, from[1]) && t < Date.UTC(2025, to[0] - 1, to[1]) + DAY;
    const links: { source: string; target: string; sent: string }[] = [];
    for (let day = start; day < end; day += DAY) {
        const weekday = new Date(day).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        for (const sender of people) {
            let rate = weekend ? 0.03 : 0.3;
            if (within(day, [3, 10], [3, 14]) && (sender.team === "Engineering" || sender.team === "Design")) {
                rate *= 4;
            }
            if (within(day, [3, 24], [3, 31]) && sender.team === "Sales") {
                rate *= 3;
            }
            if (within(day, [6, 2], [6, 6])) {
                rate *= 2;
            }
            const count = poisson(rand, rate);
            for (let k = 0; k < count; k++) {
                const sameTeam = rand() < 0.75;
                const pool = people.filter((p) => p !== sender && (p.team === sender.team) === sameTeam);
                const target = pool[Math.floor(rand() * pool.length)];
                // Working hours 08:00-18:00 UTC on weekdays, any daytime hour on weekends.
                const minute = Math.floor((weekend ? 9 * 60 : 8 * 60) + rand() * (weekend ? 12 * 60 : 10 * 60));
                const sent = new Date(day + minute * 60_000 + Math.floor(rand() * 60) * 1000)
                    .toISOString()
                    .replace(".000Z", "Z");
                links.push({ source: sender.id, target: target.id, sent });
            }
        }
    }
    links.sort((a, b) => a.sent.localeCompare(b.sent));
    return { directed: true, multigraph: true, graph: {}, nodes: people, links };
}

const TOPICS = ["graphs", "learning", "systems"];

/**
 * The paper citation network.
 * @returns node-link JSON.
 */
function paperCitations(): object {
    const rand = mulberry32(1995);
    const papers: { id: string; year: number; topic: string }[] = [];
    // More papers each year: weight grows linearly from 1995 to 2024.
    const total = 160;
    const weights = Array.from({ length: 30 }, (_, i) => 1 + i * 0.35);
    const sum = weights.reduce((a, b) => a + b, 0);
    weights.forEach((w, i) => {
        const n = Math.max(1, Math.round((w / sum) * total));
        for (let k = 0; k < n && papers.length < total; k++) {
            papers.push({
                id: `paper-${String(papers.length + 1).padStart(3, "0")}`,
                year: 1995 + i,
                topic: TOPICS[Math.floor(rand() * 3)],
            });
        }
    });
    const cited = new Array<number>(papers.length).fill(0);
    const links: { source: string; target: string }[] = [];
    for (const paper of papers) {
        const older = papers.flatMap((p, j) => (p.year < paper.year ? [j] : []));
        if (older.length === 0) {
            continue;
        }
        const want = Math.min(older.length, 1 + Math.floor(rand() * 5));
        const chosen = new Set<number>();
        while (chosen.size < want) {
            // Preferential attachment, favouring the same topic and recent work.
            const score = older.map(
                (j) =>
                    ((cited[j] + 1) * (papers[j].topic === paper.topic ? 3 : 1)) /
                    (1 + (paper.year - papers[j].year) / 8),
            );
            let r = rand() * score.reduce((a, b) => a + b, 0);
            let pick = older[older.length - 1];
            for (let s = 0; s < older.length; s++) {
                r -= score[s];
                if (r <= 0) {
                    pick = older[s];
                    break;
                }
            }
            chosen.add(pick);
        }
        for (const j of chosen) {
            cited[j]++;
            links.push({ source: paper.id, target: papers[j].id });
        }
    }
    return { directed: true, multigraph: false, graph: {}, nodes: papers, links };
}

const warning =
    "THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graphty/scripts/write-timeline-samples.ts";
for (const [file, graph] of [
    ["office-email.json", officeEmail()],
    ["paper-citations.json", paperCitations()],
] as const) {
    const g = graph as { nodes: unknown[]; links: unknown[]; graph: Record<string, string> };
    g.graph.note = warning;
    writeFileSync(resolve(OUT, file), `${JSON.stringify(g)}\n`);
    console.log(`wrote ${file}: ${String(g.nodes.length)} nodes, ${String(g.links.length)} edges`);
}
