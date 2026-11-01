import { it } from "vitest";
import { createGraphSession } from "../../src/session";
import { dispatcherOf } from "../../src/session/GraphSession";
it("apply beside import", async () => {
    const session = createGraphSession();
    await dispatcherOf(session).dispatchNow({
        op: "batch",
        fact: { code: "data.import", params: { name: null, type: "csv" } },
        steps: [
            {
                op: "data.import",
                source: { type: "csv", config: { data: "source,target\nA,B\n" }, name: "f.csv" },
                mode: "merge",
            },
            { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "X" }, { id: "Y" }] } },
        ],
    } as never);
    console.log(JSON.stringify(session.data.sources().map((s) => [s.name, s.added, s.counts])));
    console.log(JSON.stringify(session.data.nodes().map((n) => n.id)));
});
