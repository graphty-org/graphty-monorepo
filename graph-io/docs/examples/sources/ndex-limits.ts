import { ImportError, loadFromSource } from "@graphty/graph-io";

// PCNet 2.2 is a 690 MB download; the summary NDEx keeps stops the load before its first byte
try {
    await loadFromSource(
        "ndex",
        { uuid: "8b4b54fa-e87d-11ee-9621-005056ae23aa" },
        { limits: { maxBytes: 100_000_000 } },
    );
} catch (err) {
    if (err instanceof ImportError) {
        console.log(err.issue?.code, err.issue?.params);
    }
}
