import { GraphFormatError, ImportError, importGraph } from "@graphty/graph-io";

const csv = ["source,target", "a,b", "b", "c,d", "d"].join("\n");

try {
    await importGraph(csv, { format: "csv", errorLimit: 0 }); // stop at the first error
} catch (err) {
    if (err instanceof ImportError) {
        console.log(`${err.code}: ${err.message}`);
        console.log(`stopped by ${err.issue?.code} on line ${err.issue?.line}`);
        console.log(`edges read before it stopped: ${err.report.counts.edges}`);
    } else if (err instanceof GraphFormatError) {
        console.log(`a problem with the call: ${err.code}`);
    } else {
        throw err;
    }
}

// A server error page saved in place of the graph file
try {
    await importGraph("<!DOCTYPE html><html><body>502 Bad Gateway</body></html>", { filename: "graph.graphml" });
} catch (err) {
    if (!(err instanceof ImportError)) {
        throw err;
    }
    switch (err.issue?.code) {
        case "E_UNKNOWN_FORMAT":
            console.log(`not a graph file: ${err.issue.message}`);
            break;
        case "E_FETCH":
            console.log("the download failed");
            break;
        default:
            console.log(err.message);
    }
}
