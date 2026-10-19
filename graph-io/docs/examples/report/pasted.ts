import { GraphFormatError, importGraph } from "@graphty/graph-io";

/**
 * Read text a user pasted, refusing text that only looks like a graph by its shape.
 * @param text - what the user pasted
 * @returns a message for the user
 */
async function readPasted(text: string): Promise<string> {
    try {
        const { snapshot, report, format, sniff } = await importGraph(text);
        // content below 0.5: no format recognized the text, it only has the shape of an edge list
        if (sniff !== null && sniff.content < 0.5) {
            return `this looks like plain text, not a graph; choose its format if it is one`;
        }
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
console.log(await readPasted("source,target\na,b\nb,c\n"));
console.log(await readPasted("Please find the network attached."));
console.log(await readPasted("hello world"));
console.log(await readPasted("hello world\ngoodbye world\n"));
console.log(await readPasted("source,target\na,b\nc\n"));
