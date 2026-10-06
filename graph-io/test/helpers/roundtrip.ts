/**
 * The export -> import equality checker of design section 16.5: compares two snapshots on ids,
 * topology (rowPtr / colIdx), orientation (edgeList), weights (the role-weight shadow column when
 * both have one, the f32 arc weights otherwise, explicitness included) and the declared columns of
 * every table value by value, returning a list of differences with a description; plus the
 * `roundTrip()` driver that exports a snapshot with one plugin, imports the text with another into
 * a fresh builder and freezes.
 */

import { type FreezeReport, GraphBuilder, type GraphBuilderOptions, type GraphSnapshot } from "@graphty/graph-format";

import { type CompareOptions, compareSnapshots, describeDiffs } from "../../src/common/compare.js";

export {
    type CompareOptions,
    compareSnapshots,
    describeDiffs,
    type SnapshotDiff,
    valuesEqual,
} from "../../src/common/compare.js";

import {
    type CommonExportOptions,
    type CommonImportOptions,
    type GraphExporter,
    type GraphImporter,
    type ImportReport,
    type LossNote,
} from "../../src/types.js";

/**
 * Assert two snapshots are equal, failing with the difference list.
 * @param expected - the reference
 * @param actual - the snapshot under test
 * @param options - what to compare
 */
export function expectSameSnapshot(expected: GraphSnapshot, actual: GraphSnapshot, options: CompareOptions = {}): void {
    const diffs = compareSnapshots(expected, actual, options);
    if (diffs.length > 0) {
        throw new Error(`snapshots differ (${diffs.length} difference(s)):\n${describeDiffs(diffs)}`);
    }
}

/**
 * What roundTrip() returns.
 * Consumed by the per-format test suites under test/formats.
 * @public
 */
export interface RoundTripResult {
    /** The exported document. */
    readonly text: string;
    /** The exporter's pre-flight notes. */
    readonly notes: readonly LossNote[];
    /** The re-imported snapshot. */
    readonly snapshot: GraphSnapshot;
    /** The importer's report. */
    readonly report: ImportReport;
    /** The freeze report of the re-import. */
    readonly freeze: FreezeReport;
}

/**
 * Options of roundTrip().
 * Consumed by the per-format test suites under test/formats.
 * @public
 */
export interface RoundTripOptions<ExportOpts, ImportOpts> {
    /** Options for the exporter. */
    readonly exportOptions?: (ExportOpts & CommonExportOptions) | undefined;
    /** Options for the importer. */
    readonly importOptions?: (ImportOpts & CommonImportOptions) | undefined;
    /** Overrides for the fresh builder the re-import goes into. */
    readonly builder?: Partial<GraphBuilderOptions> | undefined;
}

/**
 * Export a snapshot as text and import it again into a fresh builder (weightDtype "f64" as every
 * importer expects, the importer setting the direction), then freeze.
 * @param snapshot - the snapshot to round-trip
 * @param exporter - the exporter
 * @param importer - the importer
 * @param options - exporter, importer and builder options
 * @returns the text, the notes, the re-imported snapshot and both reports
 */
export async function roundTrip<ExportOpts, ImportOpts>(
    snapshot: GraphSnapshot,
    exporter: GraphExporter<ExportOpts>,
    importer: GraphImporter<ImportOpts>,
    options: RoundTripOptions<ExportOpts, ImportOpts> = {},
): Promise<RoundTripResult> {
    const notes = exporter.check(snapshot, options.exportOptions);
    const text = await exporter.exportToString(snapshot, options.exportOptions);
    const io = options.importOptions;
    const builder = new GraphBuilder({
        directed: snapshot.directed,
        weightDtype: io?.weightDtype ?? "f64",
        addMissingNodes: io?.addMissingNodes ?? true,
        duplicateEdges: io?.duplicateEdges ?? "keep",
        selfLoops: io?.selfLoops ?? "keep",
        ...options.builder,
    });
    const report = await importer.import(text, builder, io);
    const { snapshot: result, report: freeze } = builder.freezeWithReport();
    return { text, notes, snapshot: result, report, freeze };
}
