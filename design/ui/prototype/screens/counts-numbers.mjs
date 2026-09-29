#!/usr/bin/env node
// Writes fixtures.scenarios.onScreen: counts the screens show that are derived from other fixture
// values (a path's other proteins, the qPCR rows matched by hand, the zeros of a run, the kinds of a
// hop's accounts, the proteins a selection holds), so the scope formatter can bind every count a
// participant reads to kit/fixtures.json (kit/README.md, "The scope formatter"). Everything here is
// computed from the fixtures, kit/alerts.json or a drawing; nothing is typed.
// Run from design/ui/prototype/ after kit/gen-canvas.mjs: node screens/counts-numbers.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "../kit/fixtures.json");
const fx = JSON.parse(readFileSync(FIX, "utf8"));
const al = JSON.parse(readFileSync(join(here, "../kit/alerts.json"), "utf8")).august;
const { ppi: P, lesmis: L, transactions: T } = fx.datasets;
const count = (xs, f) => xs.filter(f).length;

// The protein path TP53 to SMAD3 (datasets.ppi.encodings.path): the proteins it leaves alone.
const pathNodes = P.encodings.path.nodes;
// The qPCR file (datasets.ppi.expression): one more gene matched by hand (Mdm2, the binding step).
const E = P.expression;
if (!E.unmatched.some((g) => /^mdm2$/i.test(String(g.symbol ?? g)))) throw new Error("Mdm2 is not among the unmatched qPCR rows");
// The TP53 partners set is TP53 and its neighbors (datasets.ppi.tp53Slice).
const partners = new Set([P.tp53Slice.anchor.id, ...P.tp53Slice.neighborsOf.TP53.map((n) => n.id ?? n)]);
const moduleOf = new Map([...pathNodes, P.inspector.tp53, P.inspector.brca1].map((n) => [n.id, n.module]));
for (const id of P.inspector.trio.ids) if (!moduleOf.has(id)) moduleOf.set(id, P.inspector.trio.sharedModule);
const selection = (ids) => ({
    ids,
    nodes: ids.length,
    communities: new Set(ids.map((id) => P.louvain.community[id])).size,
    dnaRepair: count(ids, (id) => moduleOf.get(id) === "DNA repair"),
    tp53Partners: count(ids, (id) => partners.has(id)),
});
// Betweenness zeros: the full Les Miserables run, and the run on the first filter step's 60.
const step1 = L.filterSteps.betweennessOnStep1.map((r) => r.betweenness);
const zerosStep1 = count(step1, (v) => v === 0);
// Labels the frame's drawing keeps after the collision cull, counted from the drawing itself.
const drawn = (d) => (readFileSync(join(here, "../kit", d.replace("{theme}", "light")), "utf8").match(/<text\b/g) ?? []).length;
const labels = Object.fromEntries(["lesmis", "ppi", "ppiEvidence"].map((ds) => {
    const f = fx.datasets[ds].frame;
    const kept = drawn(f.drawing);
    return [ds, { budget: f.labelBudget, drawn: kept, hidden: f.labelBudget - kept }];
}));
// August: the alert's own account (ACC-365386) and the tuition case's first hop, by kind.
const kinds = (nodes) => nodes.reduce((o, n) => ((o[n.kind] = (o[n.kind] ?? 0) + 1), o), {});
const seedHop1 = al.seed.hop1.nodes.filter((n) => n.id !== al.seed.id);
const tuition = al.tuitionCase.hop1.nodes.filter((n) => n.id !== al.tuitionCase.id);
// March: the two equally short routes ACC-271813 to ACC-233575 (datasets.transactions.setsAndPaths.path).
const routes = T.setsAndPaths.path.routes;
const pathAccounts = new Set(routes.flatMap((r) => r.accounts)).size;
const pathTransfers = new Set(routes.flatMap((r) => r.transfers.map((t) => `${t.source}>${t.target}@${t.timestamp}`))).size;

fx.scenarios.onScreen = {
    generatedBy: "screens/counts-numbers.mjs -- regenerate instead of editing by hand",
    note: "counts the screens show that are derived from other fixture values; each is computed here from kit/fixtures.json, kit/alerts.json or a drawing",
    ppiPath: { nodes: pathNodes.length, otherNodes: P.nodes - pathNodes.length },
    qpcr: { matched: E.matched, networkWithoutMatch: P.nodes - E.matched, matchedWithHand: E.matched + 1, unmatchedAfterHand: E.unmatchedCount - 1 },
    selections: {
        tp53Smad3: selection(["TP53", "SMAD3"]),
        tp53Brca1: selection(["TP53", "BRCA1"]),
        trio: selection(P.inspector.trio.ids),
    },
    lesmisBetweenness: {
        zerosFull: count(L.rows, (r) => r.betweenness === 0),
        step1Nodes: step1.length,
        zerosStep1,
        zeroRankStep1: step1.length - zerosStep1 + 1,
    },
    frameLabels: labels,
    // kinds: of the step's accounts, the seed included, as the step's table and legend count them
    // bandNeighbors: its counterparties over transfers of 9,000 to 9,999 USD (the rule's band), every one
    // of which is inside its second hop (alerts.json august.seed.hop2.bandTransfers)
    augustSeed: { id: al.seed.id, neighbors: seedHop1.length, bandNeighbors: new Set(al.seed.hop2.bandTransfers.flatMap((t) => (t.source === al.seed.id ? [t.target] : t.target === al.seed.id ? [t.source] : []))).size, kinds: kinds(al.seed.hop1.nodes) },
    augustTuition: { id: al.tuitionCase.id, accounts: al.tuitionCase.hop1.nodes.length, counterparties: tuition.length, kinds: kinds(al.tuitionCase.hop1.nodes) },
    marchPath: { routes: routes.length, accounts: pathAccounts, transfers: pathTransfers },
    // the dated trace (scenarios.alertTriage.trace): the seed's neighbors on its first hop
    augustTrace: { seedNeighbors: fx.scenarios.alertTriage.trace.hops[0].nodes - 1 },
    // the next alert's account (ACC-492465): its neighbors, from its first hop
    augustNext: { id: al.nextCase.id, neighbors: al.nextCase.hops[0].nodes - 1 },
    // the ring set's file names its members and their counterparties
    augustRing: { members: al.ringSet.members.length, counterparties: al.ringSet.counterparties.count, accountsNamed: al.ringSet.members.length + al.ringSet.counterparties.count },
};
writeFileSync(FIX, JSON.stringify(fx, null, 1));
console.log(JSON.stringify(fx.scenarios.onScreen, null, 1));
