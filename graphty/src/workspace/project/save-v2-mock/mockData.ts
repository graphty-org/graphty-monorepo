/**
 * Static data for the mock of the version 2 save and open dialogs (issue #8029): a presentation
 * mock only, wired to nothing. The project is the card-fraud example of
 * tmp/save-file-mock/mock.graphty.json ("Card fraud, week 46").
 */

/** The seven section names of a version 2 file, in the order the dialogs list them. */
export const SECTIONS = ["data", "style", "recipe", "settings", "results", "notes", "view"] as const;
export type SectionName = (typeof SECTIONS)[number];

/** Each section's name as the dialogs show it. */
export const SECTION_LABELS: Record<SectionName, string> = {
    data: "Data",
    style: "Style",
    recipe: "Recipe",
    settings: "Settings",
    results: "Results",
    notes: "Notes",
    view: "View",
};

/** What each section of the example project holds, as one short line. */
export const SECTION_SUMMARIES: Record<SectionName, string> = {
    data: "3 sources . 5 nodes . 5 edges . 5 types",
    style: "Fraud review style . 6 layers . 1 palette",
    recipe: "Card-testing sweep . 5 steps",
    settings: "Background . run placement . transition . playback",
    results: "3 runs and the layout . PageRank, communities, route",
    notes: "3 notes . M. Okafor",
    view: "Camera . 1 saved view . 2 sets . filter . 2 layers . 3 runs . layout",
};

/** The save presets, one per use case, and the sections each picks. */
export const PRESETS: { value: string; label: string; sections: SectionName[] }[] = [
    { value: "everything", label: "Everything", sections: [...SECTIONS] },
    {
        value: "share",
        label: "Share without notes",
        sections: ["data", "style", "recipe", "settings", "view"],
    },
    { value: "style", label: "Style only", sections: ["style"] },
    { value: "recipe", label: "Recipe only", sections: ["recipe"] },
    { value: "kit", label: "Starting kit", sections: ["style", "recipe", "settings"] },
    { value: "journal", label: "Journal", sections: ["notes", "view"] },
    { value: "record", label: "Record", sections: ["data", "recipe", "results", "view"] },
];

/** A data source of the example project, as the save dialog lists it. */
export interface MockSource {
    id: string;
    label: string;
    detail: string;
    /** How the example file keeps it. */
    storage: "embed" | "reference";
    /** The reader's own operations (merge, remove, add, edit), in the order made: always embedded. */
    reader?: boolean;
}

export const SOURCES: MockSource[] = [
    { id: "reader", label: "Your changes", detail: "1 operation . edit acct-1003", storage: "embed", reader: true },
    { id: "accounts", label: "accounts-2026-11.csv", detail: "CSV . 142 B . 3 accounts", storage: "embed" },
    {
        id: "activity",
        label: "Bank API: card activity, week 46",
        detail: "JSON . api.example-bank.test . 1.9 KB",
        storage: "embed",
    },
];

/** One line of a save or load report: the item, what happened to it and the code it came from. */
export interface ReportLine {
    item: string;
    outcome: string;
    reason: string;
}

/** The report of saving the style section alone. */
export const REPORT_STYLE_ONLY: ReportLine[] = [
    { item: "Suspects (layer)", outcome: "Left out", reason: "Picks acct-1002, acct-1003" },
    { item: "Route from Ben Ode to Cy Lam (layer)", outcome: "Left out", reason: "Reads route, a hand-started run" },
];

/** The report of saving everything while a colleague's newer style section is held. */
export const REPORT_EVERYTHING_HELD: ReportLine[] = [
    { item: "Suspects (layer)", outcome: "Moved to view", reason: "Picks acct-1002, acct-1003" },
    {
        item: "Route from Ben Ode to Cy Lam (layer)",
        outcome: "Moved to view",
        reason: "Reads route, a hand-started run",
    },
    { item: "PageRank, communities (runs)", outcome: "Cannot be replayed", reason: "Ran on the week filter" },
    { item: "Style", outcome: "Kept as opened", reason: "Version 3, newer than this release" },
    { item: "2 style changes", outcome: "Not saved", reason: "Style section held" },
    { item: "Bank API: card activity, week 46", outcome: "Referenced", reason: "Fetched again on open" },
    {
        item: "Selected edge, row 3 of card activity",
        outcome: "Will not bind",
        reason: "Row without an id; embed the source",
    },
];

/** A column, type, source role or run a reusable section needs, and the open data's candidates. */
export interface MappingRow {
    expected: string;
    needs: string;
    /** The open data's choices for it. */
    options: string[];
    /** The pairing found by name, or null when nothing matched. */
    match: string | null;
    /** What waits while it is unpaired. */
    waiting: string[];
}

/** The open data: transactions-2026-12.csv, met by the fraud team's starting kit. */
export const MAPPING_ROWS: MappingRow[] = [
    {
        expected: "amount",
        needs: "Number . USD",
        options: ["amount_usd", "fee_usd"],
        match: null,
        waiting: ["Big payments (style layer)", "amount > 500 (recipe filter)"],
    },
    {
        expected: "mcc",
        needs: "Category",
        options: ["mcc", "channel"],
        match: "mcc",
        waiting: ["Gift card label (value label)"],
    },
    {
        expected: "time",
        needs: "Date and time",
        options: ["ts", "posted_at"],
        match: null,
        waiting: ["This week only (recipe filter)", "Playback (settings)"],
    },
    {
        expected: "Type merchant",
        needs: "Node type",
        options: ["merchant", "card", "terminal"],
        match: "merchant",
        waiting: ["Merchants (style layer)"],
    },
    {
        expected: "Source accounts",
        needs: "Source role",
        options: ["transactions-2026-12.csv"],
        match: null,
        waiting: ["High-risk accounts (set)"],
    },
];

/** How one dataset-bound section binds to the open data; results bind per run. */
export interface BindRow {
    section: SectionName;
    binding: "Match" | "Partial" | "No match";
    bound: string;
    detail: string;
}

/** Same dataset, refreshed since the file was saved: the accounts file has a new copy id. */
export const BIND_PARTIAL: BindRow[] = [
    {
        section: "results",
        binding: "Partial",
        bound: "3 runs and the layout . stale",
        detail: "Copy id changed: accounts",
    },
    { section: "notes", binding: "Match", bound: "3 of 3 notes", detail: "Unbound target: account acct-1003" },
    { section: "view", binding: "Match", bound: "11 of 12 references", detail: "Unbound, kept in its set: acct-1003" },
];

/** Other data open: the sections bind by key only if the reader says so. */
export const BIND_NONE: BindRow[] = [
    { section: "results", binding: "No match", bound: "3 runs and the layout", detail: "Same copy id: accounts" },
    { section: "notes", binding: "No match", bound: "1 of 3 notes", detail: "Unbound: acct-1002, edge pay-889" },
    { section: "view", binding: "No match", bound: "4 of 12 references", detail: "Unbound: dev-9f3, merch-77, ..." },
];

/** The style section file fraud-look.graphty-style.json, as its apply preview lists it. */
export const STYLE_FILE = {
    fileName: "fraud-look.graphty-style.json",
    name: "Fraud review style",
    modified: "2026-11-12",
    authors: "Fraud analytics team",
    license: "CC-BY-4.0",
    from: "example-bank.test/kits/fraud-team-kit.graphty.json",
    layers: ["Everything", "Merchants", "Big payments", "Device rings", "Risk by PageRank", "Selected"],
    palettes: ["Risk"],
    needs: [
        { expected: "amount", found: "amount", state: "Bound" },
        { expected: "mcc", found: "mcc", state: "Bound" },
        { expected: "Type merchant", found: "merchant", state: "Bound" },
        { expected: "Run pagerank", found: "", state: "Waits for the run" },
        { expected: "Run communities", found: "", state: "Waits for the run" },
    ],
};

/** A view run record, or the layout record, as the open dialog lists it. */
export interface RunRecord {
    id: string;
    label: string;
    detail: string;
    /** False when the run cannot be replayed exactly: its saved results are restored instead. */
    replayable: boolean;
}

/** The example file's view: three runs in the order made, then the layout record. */
export const RUNS: RunRecord[] = [
    {
        id: "card_testing__pagerank",
        label: "PageRank",
        detail: "Card-testing sweep . on the week filter",
        replayable: false,
    },
    {
        id: "card_testing__communities",
        label: "Communities",
        detail: "Card-testing sweep . on the week filter",
        replayable: false,
    },
    { id: "route", label: "Ben Ode to Cy Lam", detail: "Shortest path . started by hand", replayable: true },
    { id: "layout", label: "Layout", detail: "Force . 3D . seed 52211", replayable: true },
];

/** Adding the file's sources to open data: a node key that adds keys to a space another source fills. */
export const SPACE_OVERLAPS: { source: string; space: string; overlap: string }[] = [
    {
        source: "accounts-2026-11.csv",
        space: "account",
        overlap: "3 keys already in account, from accounts-2026-10.csv",
    },
];
