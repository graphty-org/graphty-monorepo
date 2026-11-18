/**
 * The data management prototype's fixture files (design/ui/data-prototype/spec.md section 6),
 * served from public/prototype-data/ and written by scripts/make-prototype-data.mjs, which
 * guarantees the counts below. Tests and stories load them as a reader drops a file; the Samples
 * dialog does not list them, since it lists only the start page's library.
 */

/** One fixture file. */
export interface PrototypeSample {
    /** Its path under prototype-data/, which is also its id. */
    readonly path: string;
    /** The heading it is listed under. */
    readonly group: "Proteins" | "Supply chain" | "Fraud" | "Events" | "Door entries";
    /** Rows in the file. */
    readonly rows: number;
    /** Nodes it draws alone, where that is a fixed fact of the file. */
    readonly nodes?: number;
    /** Edges it draws alone, where that is a fixed fact of the file. */
    readonly edges?: number;
}

export const PROTOTYPE_SAMPLES: readonly PrototypeSample[] = [
    { path: "proteins/tp53-interactions.tsv", group: "Proteins", rows: 120, nodes: 60, edges: 120 },
    { path: "proteins/tumor-expression.tsv", group: "Proteins", rows: 70 },
    { path: "supply-chain/suppliers.csv", group: "Supply chain", rows: 40, nodes: 40 },
    { path: "supply-chain/ships-to-2024-09.csv", group: "Supply chain", rows: 150, edges: 150 },
    { path: "supply-chain/ships-to-2024-10.csv", group: "Supply chain", rows: 159, edges: 159 },
    { path: "fraud/accounts.csv", group: "Fraud", rows: 300 },
    { path: "fraud/transfers.csv", group: "Fraud", rows: 450 },
    { path: "events/auth-log.csv", group: "Events", rows: 400 },
    { path: "proteins/biogrid-interactions.tsv", group: "Proteins", rows: 80 },
    { path: "proteins/symbol-ensembl.tsv", group: "Proteins", rows: 54 },
    { path: "proteins/expression-ensembl.tsv", group: "Proteins", rows: 50 },
    { path: "supply-chain/contracts-2024-09.csv", group: "Supply chain", rows: 143 },
    { path: "supply-chain/suppliers-erp.csv", group: "Supply chain", rows: 15 },
    { path: "door-entry/people.csv", group: "Door entries", rows: 24, nodes: 24 },
    { path: "door-entry/buildings.csv", group: "Door entries", rows: 6, nodes: 6 },
    { path: "door-entry/door-entries.csv", group: "Door entries", rows: 200 },
];

/**
 * A fixture's file name, which is also its source's name once loaded.
 * @param sample - the fixture.
 * @returns the name, such as "suppliers.csv".
 */
export function sampleName(sample: PrototypeSample): string {
    return sample.path.slice(sample.path.lastIndexOf("/") + 1);
}

/**
 * Where the app serves a fixture.
 * @param sample - the fixture.
 * @returns its address under the app's base URL.
 */
export function sampleUrl(sample: PrototypeSample): string {
    return new URL(`${import.meta.env.BASE_URL}prototype-data/${sample.path}`, globalThis.location.href).href;
}
