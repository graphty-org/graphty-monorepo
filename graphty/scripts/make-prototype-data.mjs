/**
 * Writes the data management prototype's fixture files into public/prototype-data/
 * (design/ui/data-prototype/spec.md section 6). Every file is built from fixed lists and one
 * seeded random stream, so a rerun writes the same bytes and the counts the spec lists hold:
 *
 * - proteins/tp53-interactions.tsv: 60 symbols, 120 edges, clean
 * - proteins/tumor-expression.tsv: 70 rows; onto the network 52 match, 10 are not in it, 8 nodes
 *   get no value, TP53 is there twice, 6 more match ignoring case and 1 more ignoring spaces
 * - supply-chain/suppliers.csv: 40 suppliers, one name "Acme " with a trailing space
 * - supply-chain/ships-to-2024-09.csv: 150 shipments between them
 * - supply-chain/ships-to-2024-10.csv: the same headers in another order; 3 shipments gone,
 *   12 new, 40 volumes changed
 * - fraud/accounts.csv: 300 rows, 2 repeating an earlier id
 * - fraud/transfers.csv: 450 rows: 18 name an unknown account, 5 repeat an earlier pair, 3 amounts
 *   use a decimal comma, 1 is "N/A", line 412 has one field too many
 * - events/auth-log.csv: 400 sign-ins over 14 days; "admin" is both a user and a host
 * - proteins/biogrid-interactions.tsv, symbol-ensembl.tsv, expression-ensembl.tsv,
 *   supply-chain/contracts-2024-09.csv, suppliers-erp.csv and door-entry/*: for trying each kind
 *   of join; each file's row count is checked below
 *
 * Run: node scripts/make-prototype-data.mjs (from graphty/). `--check` writes nothing and fails
 * when a file on disk differs from what the script would write.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/prototype-data");

/**
 * A seeded random stream (mulberry32), the same numbers on every machine.
 * @param {number} seed - the seed
 * @returns {() => number} a function returning the next number in [0, 1)
 */
function stream(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A number with a fixed count of decimals, from a stream.
 * @param {() => number} next - the stream
 * @param {number} low - the lowest value
 * @param {number} high - the highest value
 * @param {number} decimals - decimals to keep
 * @returns {string} the number as text
 */
function between(next, low, high, decimals) {
    return (low + next() * (high - low)).toFixed(decimals);
}

/**
 * One item of a list, from a stream.
 * @template T
 * @param {() => number} next - the stream
 * @param {readonly T[]} list - the list
 * @returns {T} the item
 */
function pick(next, list) {
    return list[Math.floor(next() * list.length)];
}

/**
 * Lines joined into a file's text, with a closing newline.
 * @param {readonly string[]} rows - the lines, header first
 * @returns {string} the text
 */
const lines = (rows) => `${rows.join("\n")}\n`;

// ---------------------------------------------------------------------------------------------
// Proteins: TP53 and 59 genes from its published interaction neighborhood (BioGRID, STRING).

/** TP53 first, then 59 HUGO symbols of its interactors. */
const SYMBOLS = [
    "TP53",
    "MDM2",
    "MDM4",
    "CDKN1A",
    "BAX",
    "BBC3",
    "PMAIP1",
    "ATM",
    "ATR",
    "CHEK1",
    "CHEK2",
    "EP300",
    "CREBBP",
    "KAT5",
    "SIRT1",
    "USP7",
    "HIPK2",
    "TP53BP1",
    "TP53BP2",
    "PPP1R13L",
    "BRCA1",
    "BRCA2",
    "RB1",
    "E2F1",
    "CDK2",
    "CCNA2",
    "CCNE1",
    "GADD45A",
    "SFN",
    "PCNA",
    "FAS",
    "TNFRSF10B",
    "APAF1",
    "CASP3",
    "CASP9",
    "BCL2",
    "BCL2L1",
    "MCL1",
    "PIDD1",
    "ZMAT3",
    "SESN1",
    "SESN2",
    "TIGAR",
    "DRAM1",
    "RRM2B",
    "XPC",
    "DDB2",
    "PLK1",
    "AURKA",
    "HDAC1",
    "PRKDC",
    "XRCC6",
    "UBE2D1",
    "COP1",
    "PIRH2",
    "TRIM24",
    "WWOX",
    "YAP1",
    "PTEN",
    "AKT1",
];

/** Kinds of experimental evidence, as BioGRID names them. */
const EVIDENCE = [
    "two-hybrid",
    "affinity capture-MS",
    "affinity capture-western",
    "reconstituted complex",
    "co-crystal structure",
];

/**
 * 120 interactions: TP53 with 20 partners, a ring through the other 59 and 41 chords across it.
 * @returns {string} the TSV
 */
function interactions() {
    const next = stream(53);
    const pairs = [];
    for (let at = 1; at <= 20; at++) {
        pairs.push([0, at]);
    }
    const others = SYMBOLS.length - 1;
    for (let at = 0; at < others; at++) {
        pairs.push([1 + at, 1 + ((at + 1) % others)]);
    }
    for (let at = 0; at < 41; at++) {
        pairs.push([1 + at, 1 + ((at + 7) % others)]);
    }
    return lines([
        "bait\tprey\tconfidence\tevidence",
        ...pairs.map(
            ([bait, prey]) =>
                `${SYMBOLS[bait]}\t${SYMBOLS[prey]}\t${between(next, 0.4, 0.99, 2)}\t${pick(next, EVIDENCE)}`,
        ),
    ]);
}

/** Ten genes a tumor panel measures that the TP53 network does not hold. */
const NOT_IN_NETWORK = ["EGFR", "KRAS", "MYC", "ERBB2", "PIK3CA", "CDH1", "VHL", "SMAD4", "NOTCH1", "ALK"];

/**
 * 70 rows of tumor expression: the first 52 symbols as the network spells them (TP53 twice), the
 * next 6 in lower case, the next 1 with a trailing space, 10 genes the network lacks; AKT1, the
 * last symbol, has no row.
 * @returns {string} the TSV
 */
function expression() {
    const next = stream(70);
    const row = (symbol) =>
        `${symbol}\t${between(next, -3, 3, 2)}\t${between(next, 0.0001, 0.05, 4)}\t${pick(next, ["lung", "breast", "colon"])}`;
    return lines([
        "symbol\tlog2fc\tpadj\ttissue",
        ...SYMBOLS.slice(0, 52).map(row),
        row("TP53"),
        ...SYMBOLS.slice(52, 58).map((symbol) => row(symbol.toLowerCase())),
        row(`${SYMBOLS[58]} `),
        ...NOT_IN_NETWORK.map(row),
    ]);
}

// ---------------------------------------------------------------------------------------------
// Supply chain: a tiered supplier network and two months of shipments.

/** Forty supplier names; "Acme " keeps the trailing space a hand-typed sheet leaves. */
const SUPPLIER_NAMES = [
    "Acme ",
    "Borealis Metals",
    "Castell Plastics",
    "Dunmore Textiles",
    "Elbe Components",
    "Fenwick Glass",
    "Garonne Foods",
    "Hartmann Gears",
    "Ilsa Chemicals",
    "Juno Packaging",
    "Kestrel Electronics",
    "Loire Fibers",
    "Mosel Castings",
    "Nordwind Rubber",
    "Orly Fasteners",
    "Pilsen Steel",
    "Quimper Paper",
    "Rhein Optics",
    "Saone Ceramics",
    "Tatra Bearings",
    "Ulm Motors",
    "Vistula Cables",
    "Weser Pumps",
    "Xanten Valves",
    "Ystad Timber",
    "Zeeland Coatings",
    "Aube Logistics",
    "Brno Forgings",
    "Cher Adhesives",
    "Drava Wire",
    "Eider Sensors",
    "Fulda Hydraulics",
    "Gard Resins",
    "Havel Springs",
    "Isar Molds",
    "Jura Precision",
    "Kocher Alloys",
    "Lech Filters",
    "Main Seals",
    "Neckar Assemblies",
];

/** Supplier countries, as ISO codes. */
const COUNTRIES = ["DE", "FR", "PL", "CZ", "NL"];

/**
 * A supplier id: s01 to s40.
 * @param {number} at - its place, from zero (wraps)
 * @returns {string} the id
 */
const supplier = (at) => `s${String((at % 40) + 1).padStart(2, "0")}`;

/**
 * The suppliers: a node file.
 * @returns {string} the CSV
 */
function suppliers() {
    return lines([
        "id,name,country,tier",
        ...SUPPLIER_NAMES.map((name, at) => {
            const cell = name === name.trim() ? name : `"${name}"`;
            return `${supplier(at)},${cell},${COUNTRIES[at % COUNTRIES.length]},${String((at % 3) + 1)}`;
        }),
    ]);
}

/**
 * September's 150 shipments, each supplier to the next four, and October's copy of them: the
 * first 3 gone, 40 volumes changed (rows 10 to 49), and 12 new ones (a supplier to the fifth
 * after it).
 * @returns {{ september: string, october: string }} both CSVs
 */
function shipments() {
    const next = stream(2024);
    const september = Array.from({ length: 150 }, (_unused, at) => ({
        from: supplier(Math.floor(at / 4)),
        to: supplier(Math.floor(at / 4) + (at % 4) + 1),
        volume: 100 + Math.floor(next() * 900),
        lead: 2 + Math.floor(next() * 28),
    }));
    const october = [
        ...september
            .map((row, at) =>
                at >= 10 && at < 50 ? { ...row, volume: row.volume + 50 + Math.floor(next() * 400) } : row,
            )
            .slice(3),
        ...Array.from({ length: 12 }, (_unused, at) => ({
            from: supplier(at),
            to: supplier(at + 5),
            volume: 100 + Math.floor(next() * 900),
            lead: 2 + Math.floor(next() * 28),
        })),
    ];
    return {
        september: lines([
            "from,to,volume,lead_days",
            ...september.map((row) => `${row.from},${row.to},${String(row.volume)},${String(row.lead)}`),
        ]),
        october: lines([
            "lead_days,volume,to,from",
            ...october.map((row) => `${String(row.lead)},${String(row.volume)},${row.to},${row.from}`),
        ]),
    };
}

// ---------------------------------------------------------------------------------------------
// Fraud: bank accounts and transfers between them, with the problems a bank export has.

/** How many distinct accounts the accounts file holds. */
const ACCOUNTS = 298;

/**
 * An account id: A001 to A298.
 * @param {number} at - its place, from zero (wraps)
 * @returns {string} the id
 */
const account = (at) => `A${String((at % ACCOUNTS) + 1).padStart(3, "0")}`;

const FIRST = [
    "Ana",
    "Ben",
    "Chen",
    "Dara",
    "Eli",
    "Femi",
    "Gita",
    "Hugo",
    "Ines",
    "Jon",
    "Kemal",
    "Lena",
    "Mia",
    "Noor",
    "Omar",
    "Pia",
    "Ravi",
    "Sara",
    "Tomas",
    "Uma",
];
const LAST = [
    "Abe",
    "Brandt",
    "Costa",
    "Dube",
    "Eriksen",
    "Fischer",
    "Garcia",
    "Haddad",
    "Ito",
    "Jensen",
    "Kowalski",
    "Larsen",
    "Moreau",
    "Nakamura",
    "Okafor",
];

/**
 * The accounts: 300 rows, the last two repeating the ids of rows 10 and 20.
 * @returns {string} the CSV
 */
function accounts() {
    const holder = (at) => `${FIRST[at % FIRST.length]} ${LAST[Math.floor(at / FIRST.length) % LAST.length]}`;
    const rows = Array.from({ length: ACCOUNTS }, (_unused, at) => {
        const day = String((at % 28) + 1).padStart(2, "0");
        return `${account(at)},${holder(at)},2024-01-${day},${at % 3 === 0 ? "yes" : "no"}`;
    });
    rows.push(`${account(9)},${holder(9)},2024-02-01,no`, `${account(19)},${holder(19)},2024-02-02,yes`);
    return lines(["account,holder,opened,flagged", ...rows]);
}

/**
 * The transfers: 450 rows. The first 18 go to an account the bank does not hold, rows 100 to 102
 * write the amount with a decimal comma, row 200's amount is "N/A", line 412 has a fifth field,
 * and the last 5 repeat the pairs of rows 300 to 304.
 * @returns {string} the CSV
 */
function transfers() {
    const next = stream(450);
    const rows = [];
    // One row per pass, so `at` is also the number of rows written.
    for (let at = 0; at < 450; at++) {
        const line = rows.length + 2;
        const from = account(at);
        // Each pair once: (k, k + 1) for the first lap, (k, k + 2) after.
        const to =
            rows.length < 18
                ? `X${String(rows.length + 1).padStart(3, "0")}`
                : account(at + 1 + Math.floor(at / ACCOUNTS));
        const cents = String(Math.floor(next() * 100)).padStart(2, "0");
        const whole = String(10 + Math.floor(next() * 4990));
        let amount = `${whole}.${cents}`;
        if (rows.length >= 100 && rows.length < 103) {
            amount = `"${whole},${cents}"`;
        } else if (rows.length === 200) {
            amount = "N/A";
        }
        const hour = String(8 + Math.floor(next() * 10)).padStart(2, "0");
        const minute = String(Math.floor(next() * 60)).padStart(2, "0");
        const time = `2024-09-${String((at % 28) + 1).padStart(2, "0")}T${hour}:${minute}`;
        rows.push(line === 412 ? `${from},${to},${amount},${time},extra` : `${from},${to},${amount},${time}`);
    }
    for (let back = 0; back < 5; back++) {
        const [from, to] = rows[300 + back].split(",");
        rows[445 + back] = `${from},${to},1.00,2024-10-01T10:00`;
    }
    return lines(["from,to,amount,time", ...rows]);
}

// ---------------------------------------------------------------------------------------------
// Events: a sign-in log, where one name is both a user and a machine.

const USERS = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy", "mallory", "admin"];
const HOSTS = ["web1", "web2", "db1", "db2", "mail1", "vpn1", "build1", "admin"];

/**
 * 400 sign-ins over 14 days from 2024-03-01, in time order: user, host, the address it came from
 * and the result. "admin" is both a user and a host.
 * @returns {string} the CSV
 */
function authLog() {
    const next = stream(14);
    const start = Date.UTC(2024, 2, 1);
    const span = 14 * 24 * 3600 * 1000;
    const times = Array.from({ length: 400 }, () => start + Math.floor((next() * span) / 60000) * 60000).sort(
        (a, b) => a - b,
    );
    return lines([
        "time,user,host,ip,result",
        ...times.map((time) => {
            const user = pick(next, USERS);
            // A user never signs in to a host of its own name, so "admin" stays one shared id.
            const host = pick(
                next,
                HOSTS.filter((each) => each !== user),
            );
            const ip = `10.0.${String(Math.floor(next() * 4))}.${String(10 + Math.floor(next() * 40))}`;
            const result = next() < 0.85 ? "ok" : "fail";
            return `${new Date(time).toISOString().replace(".000Z", "Z")},${user},${host},${ip},${result}`;
        }),
    ]);
}

// ---------------------------------------------------------------------------------------------
// Files for trying each kind of join.

/**
 * A second interaction list: 32 pairs the TP53 network already holds, 40 pairs of its genes it
 * does not, and 8 pairs reaching 4 proteins it lacks.
 * @returns {string} the TSV
 */
function biogrid() {
    const next = stream(481);
    const pairs = [];
    for (let at = 1; at <= 20; at++) {
        pairs.push([SYMBOLS[0], SYMBOLS[at]]);
    }
    for (let at = 1; at <= 12; at++) {
        pairs.push([SYMBOLS[at], SYMBOLS[at + 1]]);
    }
    for (let at = 0; at < 40; at++) {
        pairs.push([SYMBOLS[(at % 58) + 1], SYMBOLS[((at + 13) % 58) + 1]]);
    }
    const added = ["KMT2A", "NCOR1", "SMARCA4", "TP63"];
    for (let at = 0; at < 8; at++) {
        pairs.push([SYMBOLS[at * 3], added[at % added.length]]);
    }
    return lines([
        "symbol_a\tsymbol_b\texperiments",
        ...pairs.map(([a, b]) => `${a}\t${b}\t${String(1 + Math.floor(next() * 12))}`),
    ]);
}

/**
 * A made-up Ensembl id for one of the network's genes.
 * @param {number} at - the gene's place
 * @returns {string} the id
 */
const ensembl = (at) => `ENSG${String(141510 + at * 137).padStart(11, "0")}`;

/**
 * The genes' ids in another system: the network's first 54 symbols.
 * @returns {string} the TSV
 */
function symbolEnsembl() {
    return lines(["symbol\tensembl", ...SYMBOLS.slice(0, 54).map((symbol, at) => `${symbol}\t${ensembl(at)}`)]);
}

/**
 * Expression keyed by Ensembl id: 46 of the mapped genes, then 4 ids no mapping holds.
 * @returns {string} the TSV
 */
function expressionEnsembl() {
    const next = stream(4610);
    const ids = [...Array.from({ length: 46 }, (_unused, at) => ensembl(at)), ...[900, 901, 902, 903].map(ensembl)];
    return lines(["ensembl\ttpm", ...ids.map((id) => `${id}\t${between(next, 0.5, 480, 1)}`)]);
}

/**
 * Contract values on September's shipments, keyed by the from and to pair: every pair but each
 * 15th, then 3 pairs no shipment holds.
 * @param {string} september - September's CSV
 * @returns {string} the CSV
 */
function contracts(september) {
    const next = stream(909);
    const pairs = september
        .trim()
        .split("\n")
        .slice(1)
        .map((row) => row.split(",").slice(0, 2))
        .filter((_pair, at) => at % 15 !== 14);
    return lines([
        "from,to,contract_value",
        ...[...pairs, ["s01", "s10"], ["s05", "s20"], ["s09", "s30"]].map(
            ([from, to]) => `${from},${to},${String(1000 + Math.floor(next() * 90000))}`,
        ),
    ]);
}

/**
 * A second supplier list from another system: 12 of the same ids, 2 with another country, and 3
 * suppliers the first list lacks, in countries it never names.
 * @returns {string} the CSV
 */
function suppliersErp() {
    const next = stream(1542);
    const shared = Array.from({ length: 12 }, (_unused, at) => {
        const country = at === 1 || at === 6 ? "NO" : COUNTRIES[at % COUNTRIES.length];
        return [supplier(at), SUPPLIER_NAMES[at].trim(), country];
    });
    const added = [
        ["s41", "Fjord Metals", "IS"],
        ["s42", "Andes Polymers", "PE"],
        ["s43", "Atlas Forge", "MA"],
    ];
    return lines([
        "id,name,country,rating",
        ...[...shared, ...added].map(([id, name, country]) => `${id},${name},${country},${between(next, 1, 5, 1)}`),
    ]);
}

/** What a person's department can be. */
const DEPARTMENTS = ["Research", "Finance", "Legal", "Facilities"];

/** The buildings a door log covers. */
const BUILDINGS = [
    ["b1", "12 Harbor Way", 4],
    ["b2", "48 Foundry Road", 9],
    ["b3", "7 Orchard Lane", 2],
    ["b4", "230 Summit Avenue", 15],
    ["b5", "91 Canal Street", 6],
    ["b6", "3 Quarry Court", 3],
];

/** A person id: p01 to p24. */
const person = (at) => `p${String(at + 1).padStart(2, "0")}`;

/**
 * The owner's own example: 24 people, 6 buildings and 200 door entries between them, one row
 * repeated and one from a person the list lacks.
 * @returns {{ people: string, buildings: string, entries: string }} the CSVs
 */
function doorEntry() {
    const next = stream(24);
    const start = Date.UTC(2024, 5, 3, 8);
    const rows = Array.from({ length: 198 }, (_unused, at) => [
        person(Math.floor(next() * 24)),
        BUILDINGS[Math.floor(next() * BUILDINGS.length)][0],
        new Date(start + at * 17 * 60000).toISOString().replace(".000Z", "Z"),
    ]);
    return {
        people: lines([
            "person_id,name,department",
            ...Array.from({ length: 24 }, (_unused, at) => {
                const name = `${FIRST[at % FIRST.length]} ${LAST[(at * 3) % LAST.length]}`;
                return `${person(at)},${name},${DEPARTMENTS[at % DEPARTMENTS.length]}`;
            }),
        ]),
        buildings: lines([
            "building_id,address,floors",
            ...BUILDINGS.map(([id, address, floors]) => `${id},${address},${String(floors)}`),
        ]),
        entries: lines([
            "person_id,building_id,time",
            ...[...rows, rows[0], ["p99", BUILDINGS[0][0], "2024-06-06T09:00:00Z"]].map((row) => row.join(",")),
        ]),
    };
}

// ---------------------------------------------------------------------------------------------

/** Every file, by its path under public/prototype-data/. */
function files() {
    const { september, october } = shipments();
    const door = doorEntry();
    return {
        "proteins/tp53-interactions.tsv": interactions(),
        "proteins/tumor-expression.tsv": expression(),
        "proteins/biogrid-interactions.tsv": biogrid(),
        "proteins/symbol-ensembl.tsv": symbolEnsembl(),
        "proteins/expression-ensembl.tsv": expressionEnsembl(),
        "supply-chain/contracts-2024-09.csv": contracts(september),
        "supply-chain/suppliers-erp.csv": suppliersErp(),
        "door-entry/people.csv": door.people,
        "door-entry/buildings.csv": door.buildings,
        "door-entry/door-entries.csv": door.entries,
        "supply-chain/suppliers.csv": suppliers(),
        "supply-chain/ships-to-2024-09.csv": september,
        "supply-chain/ships-to-2024-10.csv": october,
        "fraud/accounts.csv": accounts(),
        "fraud/transfers.csv": transfers(),
        "events/auth-log.csv": authLog(),
    };
}

/** How many data rows each file holds; the app's sample list says the same. */
const ROWS = {
    "proteins/biogrid-interactions.tsv": 80,
    "proteins/symbol-ensembl.tsv": 54,
    "proteins/expression-ensembl.tsv": 50,
    "supply-chain/contracts-2024-09.csv": 143,
    "supply-chain/suppliers-erp.csv": 15,
    "door-entry/people.csv": 24,
    "door-entry/buildings.csv": 6,
    "door-entry/door-entries.csv": 200,
};

const check = process.argv.includes("--check");
let stale = 0;
for (const [path, text] of Object.entries(files())) {
    const target = resolve(OUT, path);
    const rows = text.trimEnd().split("\n").length - 1;
    if (ROWS[path] !== undefined && rows !== ROWS[path]) {
        stale++;
        console.error(`${path} has ${String(rows)} rows, not ${String(ROWS[path])}`);
    }
    if (check) {
        let current = null;
        try {
            current = readFileSync(target, "utf8");
        } catch {
            // missing counts as different
        }
        if (current !== text) {
            stale++;
            console.error(`${path} differs from what the script writes`);
        }
        continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log(`wrote ${path}`);
}
if (stale > 0) {
    process.exit(1);
}
