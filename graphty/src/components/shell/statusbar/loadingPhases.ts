/**
 * The three loading phases and the completion toast, build spec 02 section 6.
 *
 * The layout slot names the current phase, and while a load is running that slot
 * takes no caret: there is no layout engine to pick until the graph is built. Cancel
 * is present in EVERY phase, stops within 1 s, and leaves `Cancelled at 24%` for a
 * few seconds; where it cannot act it is drawn disabled with its reason rather than
 * tagged Coming.
 *
 * | Phase | String |
 * |---|---|
 * | 1. Reading | `Reading fraud.csv, 48 MB of 210 MB` |
 * | 2. Parsing | `Parsing...` |
 * | 3. Building, total known | `Building graph: 12,400 of 51,000 nodes (24%), about 8 s left` |
 * | 3. Building, total unknown | `Building graph: 12,400 nodes, 98,000 edges so far` |
 *
 * The counts inside a phase sentence are EXACT, with separators at every magnitude:
 * `ExplorerLoading.dc.html` draws `48,000 of about 120,000 nodes` where the counts
 * slot on the same board draws `312k edges`. The compact rule of section 7 governs
 * the counts slot; a phase sentence is a progress reading and keeps its digits.
 */

import { formatExactCount } from "./formatCounts";

/** Bytes per step of the unit ladder. */
const BYTES_PER_STEP = 1024;

/** Below ten seconds an elapsed or remaining time keeps a decimal place. */
const DECIMAL_SECONDS_BELOW = 10;

/** Phase 2. Indeterminate, and drawn for whole-file formats only. */
export const PARSING_PHASE_LABEL = "Parsing...";

/** The disabled Cancel's reason during a load (ExplorerLoading.dc.html). */
export const LOAD_CANCEL_DISABLED_TITLE = "Cannot cancel this load";

/** The disabled Cancel's reason during an algorithm run (spec 02 section 4.2 slot 5). */
export const RUN_CANCEL_DISABLED_TITLE = "Cannot cancel this run";

/** The label every cancel affordance in the bar carries; the verb keeps its text. */
export const CANCEL_LABEL = "Cancel";

/**
 * Formats a byte count for the Reading phase, e.g. `48 MB`.
 *
 * The ladder steps by 1024 and rounds to a whole unit up to GB, which is the drawn
 * form -- `Reading fraud.csv, 48 MB of 210 MB`.
 * @param bytes - The byte count.
 * @returns The byte count with its unit.
 */
export function formatBytes(bytes: number): string {
    const value = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;

    if (value < BYTES_PER_STEP) {
        return `${String(Math.round(value))} B`;
    }

    const kilobytes = value / BYTES_PER_STEP;

    if (kilobytes < BYTES_PER_STEP) {
        return `${String(Math.round(kilobytes))} KB`;
    }

    const megabytes = kilobytes / BYTES_PER_STEP;

    if (megabytes < BYTES_PER_STEP) {
        return `${String(Math.round(megabytes))} MB`;
    }

    return `${(megabytes / BYTES_PER_STEP).toFixed(1)} GB`;
}

/**
 * Formats a duration in seconds, e.g. `34 s`, `12 s`, `1.8 s`.
 *
 * Under ten seconds a fraction is kept to one decimal place, as the Analyze card's
 * `1.8 s` is drawn; at ten and above the reading is whole seconds.
 * @param seconds - The duration in seconds.
 * @returns The duration with its unit.
 */
export function formatSeconds(seconds: number): string {
    const value = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;

    if (value < DECIMAL_SECONDS_BELOW) {
        const rounded = Math.round(value * 10) / 10;

        return Number.isInteger(rounded) ? `${String(rounded)} s` : `${rounded.toFixed(1)} s`;
    }

    return `${String(Math.round(value))} s`;
}

/**
 * Formats a fraction as the whole percentage the bar draws, e.g. `40%`.
 * @param fraction - How far the phase has got, 0 to 1.
 * @returns The percentage, e.g. `40%`.
 */
export function formatPercent(fraction: number): string {
    const value = Number.isFinite(fraction) && fraction > 0 ? Math.min(fraction, 1) : 0;

    return `${String(Math.round(value * 100))}%`;
}

/**
 * Phase 1. Bytes are always known, so this phase always carries both numbers.
 * @param fileName - The file being read, e.g. `fraud.csv`.
 * @param bytesRead - How many bytes have been read.
 * @param bytesTotal - How many bytes the file holds.
 * @returns The phase sentence, e.g. `Reading fraud.csv, 48 MB of 210 MB`.
 */
export function readingPhaseLabel(fileName: string, bytesRead: number, bytesTotal: number): string {
    return `Reading ${fileName}, ${formatBytes(bytesRead)} of ${formatBytes(bytesTotal)}`;
}

/**
 * What the Building phase knows. The count form appears only when the total is known,
 * estimated from file size or Content-Length and never by bytes; without a total there
 * is no percentage and no estimate.
 *
 * {@link buildingPhaseLabel}'s one parameter.
 * @public
 */
export interface BuildingPhaseFacts {
    /** Nodes built so far. */
    readonly nodes: number;
    /** Edges built so far; drawn only in the total-unknown form. */
    readonly edges?: number;
    /** The node total, when it is known. */
    readonly totalNodes?: number;
    /** Whether that total is an estimate, which adds the `about` hedge. */
    readonly totalEstimated?: boolean;
    /** Seconds left, when they can be estimated. */
    readonly secondsLeft?: number;
}

/**
 * Phase 3, in both of its forms.
 * @param facts - What the build knows so far.
 * @returns The phase sentence, e.g.
 * `Building graph: 48,000 of about 120,000 nodes (40%), about 12 s left` or
 * `Building graph: 12,400 nodes, 98,000 edges so far`.
 */
export function buildingPhaseLabel(facts: BuildingPhaseFacts): string {
    const { nodes, edges, totalNodes, totalEstimated, secondsLeft } = facts;

    if (totalNodes === undefined || totalNodes <= 0) {
        return `Building graph: ${formatExactCount(nodes)} nodes, ${formatExactCount(edges ?? 0)} edges so far`;
    }

    const hedge = totalEstimated === true ? "about " : "";
    const percent = formatPercent(nodes / totalNodes);
    const head = `Building graph: ${formatExactCount(nodes)} of ${hedge}${formatExactCount(totalNodes)} nodes (${percent})`;

    if (secondsLeft === undefined) {
        return head;
    }

    return `${head}, about ${formatSeconds(secondsLeft)} left`;
}

/**
 * What a cancelled load leaves in the slot for a few seconds.
 * @param fraction - How far the load had got, 0 to 1.
 * @returns The sentence, e.g. `Cancelled at 24%`.
 */
export function cancelledPhaseLabel(fraction: number): string {
    return `Cancelled at ${formatPercent(fraction)}`;
}

/**
 * One role mapping named by the completion toast's added clause. Named in
 * {@link LoadCompletionFacts.mappings}, which the caller fills in.
 * @public
 */
export interface LoadRoleMapping {
    /** The column that was mapped, e.g. `amount`. */
    readonly column: string;
    /** The role it was mapped to, e.g. `weight`. */
    readonly role: string;
}

/**
 * What the completion toast reports. {@link loadCompleteMessage}'s one parameter.
 * @public
 */
export interface LoadCompletionFacts {
    /** Nodes loaded. */
    readonly nodes: number;
    /** Edges loaded. */
    readonly edges: number;
    /** How long the load took, in seconds. */
    readonly seconds: number;
    /** Roles that were guessed or changed in the Import options dialog. */
    readonly mappings?: readonly LoadRoleMapping[];
}

/**
 * The completion toast's sentence.
 * @param facts - What the finished load reports.
 * @returns The sentence, e.g. `Loaded 51,000 nodes and 212,000 edges in 34 s.`, with
 * ` Mapped amount to weight, ts to time.` appended when roles were guessed or changed.
 */
export function loadCompleteMessage(facts: LoadCompletionFacts): string {
    const { nodes, edges, seconds, mappings } = facts;
    const loaded = `Loaded ${formatExactCount(nodes)} nodes and ${formatExactCount(edges)} edges in ${formatSeconds(seconds)}.`;

    if (mappings === undefined || mappings.length === 0) {
        return loaded;
    }

    const clause = mappings.map((mapping) => `${mapping.column} to ${mapping.role}`).join(", ");

    return `${loaded} Mapped ${clause}.`;
}
