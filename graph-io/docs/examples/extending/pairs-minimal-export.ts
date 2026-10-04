import {
    capabilities,
    checkCapabilities,
    checkExport,
    type CommonExportOptions,
    DIRECTION_DROPPED_CODE,
    encodeChunks,
    exportGraphToString,
    type GraphExporter,
    type GraphSnapshot,
    importGraph,
    joinText,
    type LossNote,
    pairFolding,
    refusedSave,
    registry,
    resolveExportOptions,
} from "@graphty/graph-io";

// What the file can hold: no direction marker, no attributes, no weights. idCharset "any" refuses no id,
// so this first version writes an id with a space as it is (it reads back as an edge line); the
// complete plugin refuses such ids with a note of its own
const CAPABILITIES = capabilities({ multiEdges: true, selfLoops: true, edgeIds: "none", idCharset: "any" });

function check(snapshot: GraphSnapshot, options?: CommonExportOptions): LossNote[] {
    const notes = checkCapabilities(snapshot, CAPABILITIES, resolveExportOptions(options), {
        attributes: false,
        weights: false,
    });
    if (!snapshot.directed && snapshot.edgeCount > 0) {
        // the format cannot say "undirected"; this is the note the built-in formats give
        notes.push({
            code: DIRECTION_DROPPED_CODE,
            message: "the file has no direction marker; the edges read back as the reader's default direction",
            column: null,
            count: snapshot.edgeCount,
        });
    }
    return notes;
}

function* lines(snapshot: GraphSnapshot, options?: CommonExportOptions): Generator<string> {
    const refused = refusedSave(check(snapshot, options)); // throw for an E_ note, before writing anything
    if (refused !== null) {
        throw refused;
    }
    for (let i = 0; i < snapshot.nodeCount; i++) {
        yield `${String(snapshot.ids.idOf(i))}\n`;
    }
    const folding = pairFolding(snapshot); // an undirected edge of a mixed graph is stored twice: write it once
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!folding.folded(e)) {
            yield `${String(snapshot.ids.idOf(snapshot.edgeSource(e)))} ${String(snapshot.ids.idOf(snapshot.edgeTarget(e)))}\n`;
        }
    }
}

const pairsExporter: GraphExporter = {
    format: "pairs",
    extensions: [".pairs"],
    mimeTypes: [],
    capabilities: CAPABILITIES,
    check,
    export: (snapshot, options) => encodeChunks(lines(snapshot, options)),
    exportToString: (snapshot, options) => joinText(lines(snapshot, options)),
};
registry.registerExporter(pairsExporter);

const { snapshot } = await importGraph("source,target,weight\na,b,2\nb,c,1\n", { format: "csv", defaultDirected: false });
console.log(checkExport(snapshot, "pairs").map((n) => n.code));
console.log(await exportGraphToString(snapshot, "pairs"));
