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
    style: "Fraud review style 3.1.0 . 6 layers . 1 palette",
    recipe: "Card-testing sweep 1.2.0 . 5 steps",
    settings: "Background . run placement . transition . playback",
    results: "4 runs . PageRank, communities, route, layout",
    notes: "3 notes . M. Okafor",
    view: "Camera . 1 saved view . 1 set . 2 layers . 1 run",
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
    { value: "record", label: "Record", sections: ["data", "recipe", "results"] },
];

/** A data source of the example project, as the save dialog lists it. */
export interface MockSource {
    id: string;
    label: string;
    detail: string;
    /** How the example file keeps it. */
    storage: "embed" | "reference";
    /** The reader's own edits: always embedded. */
    reader?: boolean;
}

export const SOURCES: MockSource[] = [
    { id: "reader", label: "Your changes", detail: "1 edit", storage: "embed", reader: true },
    { id: "accounts", label: "accounts-2026-11.csv", detail: "CSV . 142 B . 3 accounts", storage: "embed" },
    {
        id: "activity",
        label: "Bank API: card activity, week 46",
        detail: "JSON . api.example-bank.test . 1.9 KB",
        storage: "reference",
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
    { item: "Route from Ben Ode to Cy Lam (layer)", outcome: "Left out", reason: "Run from account acct-1002" },
];

/** The report of saving everything while a colleague's newer style section is held. */
export const REPORT_EVERYTHING_HELD: ReportLine[] = [
    { item: "Suspects (layer)", outcome: "Moved to view", reason: "Picks acct-1002, acct-1003" },
    { item: "Route from Ben Ode to Cy Lam (layer)", outcome: "Moved to view", reason: "Run from account acct-1002" },
    { item: "Route (run)", outcome: "Kept in view", reason: "Option names account acct-1002" },
    { item: "Style", outcome: "Kept as opened", reason: "Version 3, newer than this release" },
    { item: "2 style changes", outcome: "Not saved", reason: "Style section held" },
    { item: "Bank API: card activity, week 46", outcome: "Referenced", reason: "Fetched again on open" },
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

/** How one dataset-bound section binds to the open data. */
export interface BindRow {
    section: SectionName;
    binding: "Match" | "Partial" | "No match";
    bound: string;
    detail: string;
}

/** Same dataset, refreshed since the file was saved: the activity source changed. */
export const BIND_PARTIAL: BindRow[] = [
    { section: "results", binding: "Partial", bound: "4 runs . stale", detail: "Changed: Bank API: card activity" },
    { section: "notes", binding: "Partial", bound: "3 of 3 notes", detail: "" },
    { section: "view", binding: "Partial", bound: "11 of 12 references", detail: "Unbound: payment pay-890" },
];

/** Other data open: the sections bind by key only if the reader says so. */
export const BIND_NONE: BindRow[] = [
    { section: "results", binding: "No match", bound: "4 runs", detail: "Same file: accounts-2026-11.csv" },
    { section: "notes", binding: "No match", bound: "1 of 3 notes", detail: "Unbound: acct-1002, pay-889" },
    { section: "view", binding: "No match", bound: "4 of 12 references", detail: "Unbound: dev-9f3, merch-77, ..." },
];

/** The style section file fraud-look.graphty-style.json, as its apply preview lists it. */
export const STYLE_FILE = {
    fileName: "fraud-look.graphty-style.json",
    name: "Fraud review style",
    revision: "3.1.0",
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
