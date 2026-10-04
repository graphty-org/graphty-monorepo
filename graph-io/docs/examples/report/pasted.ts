import { GraphFormatError, importGraph } from "@graphty/graph-io";

/**
 * Read text a user pasted, accepting only input that is clearly a graph.
 * @param text - what the user pasted
 * @returns a message for the user
 */
async function readPasted(text: string): Promise<string> {
    try {
        const { snapshot, report, format } = await importGraph(text);
        if (snapshot.nodeCount === 0 || report.errorCount > 0) {
            return `read as ${format}, but: ${report.issues.map((i) => i.message).join("; ") || "no nodes"}`;
        }
        return `${format}: ${snapshot.nodeCount} nodes`;
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return err.message;
        }
        throw err;
    }
}

console.log(await readPasted("graph { a -- b }"));
console.log(await readPasted("Please find the network attached."));
console.log(await readPasted("source,target\na,b\nc\n"));
