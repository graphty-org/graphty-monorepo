/**
 * @file Every refusal of `session.data.import()` is a coded `GraphtyError`, never a plain Error
 * whose English message is the only information: a malformed file of each format, an unknown
 * format, a missing input, a reader that threw, a failed or timed-out fetch, an unreadable file,
 * and an aborted load, which rejects with the caller's own reason (#879).
 */

import { gmlImporter } from "@graphty/graph-io/gml";
import { afterEach, assert, describe, it, vi } from "vitest";

import { defineSource, registerSource } from "../../session";
import { DataSource } from "../../src/data/DataSource";
import { type GraphtyError, isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";

/**
 * What an import was refused with, which must be a coded error.
 * @param promise - The import.
 * @returns The error.
 */
async function refusal(promise: Promise<unknown>): Promise<GraphtyError> {
    const error = await promise.then(
        () => null,
        (thrown: unknown) => thrown,
    );
    assert.isTrue(isGraphtyError(error), `a coded error, not ${String(error)}`);
    return error as GraphtyError;
}

/** A malformed file of each of the element's formats, and whether graph-io read it. */
const BAD_FILES: { type: string; data: string; graphIo: boolean }[] = [
    { type: "json", data: '{"nodes": [{"id": "a"}, ', graphIo: false },
    { type: "csv", data: 'source,target\n"a,b\n', graphIo: true },
    { type: "graphml", data: '<?xml version="1.0"?><graphml><graph><node id="a">', graphIo: true },
    { type: "gexf", data: '<?xml version="1.0"?><gexf version="1.3"><graph><nodes><node id="a">', graphIo: true },
    { type: "gml", data: "graph [ node [ id 1 ", graphIo: true },
    { type: "dot", data: "digraph { a -> ", graphIo: true },
    { type: "pajek", data: "*Nonsense\n1 2\n", graphIo: true },
];

DataSource.register(
    DataSource.fromImporter(
        {
            ...gmlImporter,
            import: () => Promise.reject(new Error("the reader broke")),
        },
        {
            id: "broken-reader-879",
            plainName: "Broken",
            extensions: [".broken879"],
            mimeTypes: ["text/vnd.broken879"],
            canImport: true,
            canExport: false,
            options: [],
        },
    ),
);

// A network source, whose load honors the caller's signal.
registerSource(
    defineSource({
        id: "abortable-879",
        descriptor: { plainName: "Abortable", params: [] },
        records() {
            return Promise.resolve({ nodes: [{ id: "a" }] });
        },
    }),
);

describe("data.import() refusals are coded (#879)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    for (const { type, data, graphIo } of BAD_FILES) {
        it(`refuses a malformed ${type} file with E_PARSE_FAILED`, async () => {
            const session = createGraphSession();
            const error = await refusal(session.data.import({ type, config: { data } }));

            assert.strictEqual(error.code, "E_PARSE_FAILED");
            assert.strictEqual(error.details.format, type);
            if (graphIo) {
                assert.match(String(error.details.issue), /^E_/, "graph-io's own code for what stopped it");
            }
            session.dispose();
        });
    }

    it("refuses a format nobody registered with E_UNKNOWN_FORMAT", async () => {
        const session = createGraphSession();
        const error = await refusal(session.data.import({ type: "no-such-format", config: { data: "x" } }));

        assert.strictEqual(error.code, "E_UNKNOWN_FORMAT");
        session.dispose();
    });

    it("refuses a source with no data, file or url with E_OPTION_RANGE", async () => {
        const session = createGraphSession();
        const error = await refusal(session.data.import({ type: "json", config: {} }));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        session.dispose();
    });

    it("codes a reader that threw an uncoded error as E_PARSE_FAILED, keeping it as the cause", async () => {
        const session = createGraphSession();
        const error = await refusal(session.data.import({ type: "broken-reader-879", config: { data: "x" } }));

        assert.strictEqual(error.code, "E_PARSE_FAILED");
        assert.strictEqual(error.details.format, "broken-reader-879");
        assert.strictEqual((error.cause as Error).message, "the reader broke");
        session.dispose();
    });

    it("refuses a URL that answers 404 with E_FETCH_FAILED and the status", async () => {
        const fetched: string[] = [];
        vi.stubGlobal("fetch", (url: string) => {
            fetched.push(url);
            return Promise.resolve(new Response("", { status: 404 }));
        });
        const session = createGraphSession();
        const error = await refusal(
            session.data.import({ type: "json", config: { url: "https://example.test/g.json" } }),
        );

        assert.strictEqual(error.code, "E_FETCH_FAILED");
        assert.strictEqual(error.details.status, 404);
        assert.strictEqual(error.details.url, "https://example.test/g.json");
        assert.strictEqual(fetched.length, 1, "a client error is not retried");
        session.dispose();
    });

    it("refuses a URL whose every request runs out of time with E_FETCH_FAILED and the timeout", async () => {
        vi.stubGlobal("fetch", () => Promise.reject(new DOMException("The request was aborted.", "AbortError")));
        const session = createGraphSession();
        const error = await refusal(
            session.data.import({ type: "json", config: { url: "https://example.test/slow.json" } }),
        );

        assert.strictEqual(error.code, "E_FETCH_FAILED");
        assert.strictEqual(error.details.timeoutMs, 30000);
        assert.strictEqual(error.details.attempts, 3);
        session.dispose();
    });

    it("refuses a file the browser cannot read with E_FETCH_FAILED and the file's name", async () => {
        const file = new File(["{}"], "locked.json");
        file.arrayBuffer = (): Promise<ArrayBuffer> =>
            Promise.reject(new DOMException("The file could not be read.", "NotReadableError"));
        const session = createGraphSession();
        const error = await refusal(session.data.import({ type: "json", config: { file } }));

        assert.strictEqual(error.code, "E_FETCH_FAILED");
        assert.strictEqual(error.details.file, "locked.json");
        session.dispose();
    });

    it("rejects an aborted load with the caller's own reason, unchanged", async () => {
        const session = createGraphSession();
        const reason = new DOMException("The reader cancelled.", "AbortError");
        const thrown = await session.data
            .import({ source: "abortable-879", config: {} }, { signal: AbortSignal.abort(reason) })
            .then(
                () => null,
                (error: unknown) => error,
            );

        assert.strictEqual(thrown, reason);
        assert.strictEqual(session.data.statistics().nodeCount, 0);
        session.dispose();
    });
});
