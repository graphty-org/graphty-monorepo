#!/usr/bin/env node
/**
 * A SYNTHETIC bank transaction network with planted fraud, seeded so every run writes the same file.
 * No real person, account or transaction is in it; the video says so.
 *
 *   node tools/demo-video/data/round2/make-fraud.mjs                       # the story file (about 500 accounts),
 *                                                                            # with transfers.csv and watchlist.csv
 *   node tools/demo-video/data/round2/make-fraud.mjs --accounts 50000 --out <file>   # the scale chapter
 *
 * Ordinary customers live in eight cities and pay people in their own circle (a few dozen people who
 * know each other), so communities are real structure. Planted on top:
 *  - a fraud ring: 12 accounts opened within a week, sharing two phones and one address, cycling
 *    transfers of $9,000-9,900 (just under the $10,000 reporting line) among themselves in the
 *    last two weeks, then paying out to one cash-out account;
 *  - a mule network: 24 customers scammed in a three-day window each pay one of five mule accounts,
 *    which forward the money abroad to one collector.
 * Only shared homes and devices are nodes (a household, a family tablet, the ring's phones and flat).
 * Node kinds: account, device, address. Edge kinds: transfer (amount, time), uses, lives at.
 * The `case` column holds the ground truth ("ring", "mule", "victim", "collector", "cash-out", "").
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const { values: o } = parseArgs({
    options: {
        accounts: { type: "string", default: "480" },
        seed: { type: "string", default: "2026" },
        out: { type: "string", default: join(import.meta.dirname, "fraud-network.json") },
    },
});
const ACCOUNTS = Number(o.accounts);

// mulberry32: small, seeded, the same on every platform
let state = Number(o.seed) >>> 0;
function rand() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (lo, hi) => lo + rand() * (hi - lo);
const money = (x) => Math.round(x * 100) / 100;

const CITIES = [
    { city: "Chicago", country: "United States", latitude: 41.8781, longitude: -87.6298 },
    { city: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832 },
    { city: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276 },
    { city: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405 },
    { city: "Madrid", country: "Spain", latitude: 40.4168, longitude: -3.7038 },
    { city: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
    { city: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198 },
    { city: "Sao Paulo", country: "Brazil", latitude: -23.5505, longitude: -46.6333 },
];
const ABROAD = { city: "Riga", country: "Latvia", latitude: 56.9496, longitude: 24.1052 };

const START = Date.UTC(2026, 5, 1); // 2026-06-01
const DAYS = 90;
const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 19) + "Z";
const day = (t) => new Date(t).toISOString().slice(0, 10);
const at = (d0, d1) => START + Math.floor(between(d0, d1) * DAY);

const nodes = [];
const byId = new Map();
function add(n) {
    nodes.push(n);
    byId.set(n.id, n);
    return n.id;
}
const links = [];
let nextId = 1000;
function account(place, extra = {}) {
    const id = `ACC-${nextId++}`;
    return add({ id, label: id, kind: "account", ...place, opened: day(at(-900, -30)), case: "", ...extra });
}
function thing(kind, id, label, place) {
    return add({ id, label, kind, ...place, case: "" });
}
const transfer = (source, target, amount, t) =>
    links.push({ source, target, kind: "transfer", amount: money(amount), time: iso(t) });
const uses = (a, d) => links.push({ source: a, target: d, kind: "uses" });
const livesAt = (a, h) => links.push({ source: a, target: h, kind: "lives at" });

// ordinary customers, in circles of about 30 inside a city
const CIRCLE = 30;
const circles = [];
for (let i = 0; i < ACCOUNTS; i++) {
    const c = Math.floor(i / CIRCLE);
    if (!circles[c]) circles[c] = { place: CITIES[c % CITIES.length], members: [] };
    const { place } = circles[c];
    const id = account(place);
    circles[c].members.push(id);
    // only shared things are nodes: about one customer in six shares a home, one in ten a tablet,
    // with the customer before them in the circle
    const prev = circles[c].members.at(-2);
    if (prev && rand() < 0.17) {
        const home = `ADDR-${prev.slice(4)}`;
        if (!byId.has(home)) livesAt(prev, thing("address", home, `${place.city} address ${prev.slice(4)}`, place));
        livesAt(id, home);
    } else if (prev && rand() < 0.12) {
        const tablet = `DEV-${prev.slice(4)}`;
        uses(prev, thing("device", tablet, `Tablet ${prev.slice(4)}`, place)); // where its owners live, so a map places it
        uses(id, tablet);
    }
}
const everyone = circles.flatMap((c) => c.members);
const byCity = Map.groupBy(everyone, (id) => byId.get(id).city);
for (const { members, place } of circles)
    for (const a of members) {
        const n = 2 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
            // nineteen payments in twenty stay in the circle; most of the rest stay in the city
            const r = rand();
            let pool = everyone;
            if (r < 0.95) pool = members;
            else if (r < 0.995) pool = byCity.get(place.city);
            const b = pick(pool);
            if (b !== a) transfer(a, b, Math.exp(between(Math.log(15), Math.log(600))), at(0, DAYS));
        }
    }

// the fraud ring: twelve new accounts in one city, two shared phones, one shared address
const ringPlace = CITIES[0];
const opened = at(DAYS - 30, DAYS - 23);
const ring = [];
const phones = [thing("device", "DEV-R1", "Phone R1", ringPlace), thing("device", "DEV-R2", "Phone R2", ringPlace)];
const flat = thing("address", "ADDR-R", `${ringPlace.city} address R`, ringPlace);
for (let i = 0; i < 12; i++) {
    const id = account(ringPlace, { opened: day(opened + i * 0.5 * DAY), case: "ring" });
    ring.push(id);
    uses(id, phones[i % 2]);
    livesAt(id, flat);
}
// a few small ordinary payments each, so the ring looks like customers at a glance
for (const a of ring) for (let k = 0; k < 2; k++) transfer(a, pick(everyone), between(20, 150), at(DAYS - 23, DAYS));
for (let round = 0; round < 3; round++)
    for (let i = 0; i < ring.length; i++)
        transfer(ring[i], ring[(i + 1) % ring.length], between(9000, 9900), at(DAYS - 14, DAYS - 2));
const cashOut = account(ABROAD, { case: "cash-out" });
for (const a of ring) transfer(a, cashOut, between(9000, 9900), at(DAYS - 2, DAYS));

// the mule network: scam victims in a three-day window, five mules, one collector abroad
const collector = account(ABROAD, { case: "collector" });
const mules = CITIES.slice(0, 5).map((place) =>
    account(place, { case: "mule", opened: day(at(DAYS - 45, DAYS - 40)) }),
);
const victims = new Set();
while (victims.size < 24) victims.add(pick(everyone));
for (const v of victims) {
    byId.get(v).case = "victim";
    const m = pick(mules);
    transfer(v, m, between(800, 4500), at(DAYS - 20, DAYS - 17));
}
for (const m of mules) transfer(m, collector, between(12000, 30000), at(DAYS - 16, DAYS - 15));

writeFileSync(
    o.out,
    JSON.stringify({
        directed: true,
        multigraph: true,
        graph: {
            note: "SYNTHETIC: generated by tools/demo-video/data/round2/make-fraud.mjs; no real person, account or transaction",
            seed: Number(o.seed),
        },
        nodes,
        links,
    }) + "\n",
);
console.log(`${nodes.length} nodes, ${links.length} edges -> ${o.out}`);

// The story file also gets two spreadsheets for the "bring your own files" chapter, as an analyst
// would keep them (no random draws here, so the network above is the same with or without them):
//  - transfers.csv: the money that matters, as a payments export (from, to, amount, time): the
//    scam victims to the mules, the mules to the collector, the ring's payouts to the cash-out;
//  - watchlist.csv: accounts an investigator flagged (account, risk, reason), joined onto that graph.
if (o.accounts === "480") {
    const dir = dirname(o.out);
    const ids = new Set([...victims, ...mules, collector, ...ring, cashOut]);
    const rows = links
        .filter((l) => l.kind === "transfer" && ids.has(l.source) && ids.has(l.target) && l.amount >= 800)
        .toSorted((a, b) => a.time.localeCompare(b.time));
    writeFileSync(
        join(dir, "transfers.csv"),
        ["from,to,amount,time", ...rows.map((l) => [l.source, l.target, l.amount.toFixed(2), l.time].join(","))].join(
            "\n",
        ) + "\n",
    );
    const watch = [
        ...mules.map((m) => [m, "high", "Forwards money abroad"]),
        [collector, "high", "Collects from new accounts"],
        ...ring.slice(0, 4).map((a) => [a, "medium", "Shares an address"]),
    ];
    writeFileSync(
        join(dir, "watchlist.csv"),
        ["account,risk,reason", ...watch.map((w) => w.join(","))].join("\n") + "\n",
    );
    console.log(`${rows.length} transfers, ${watch.length} watched accounts -> ${dir}`);
}
