/**
 * Choosing one graph (graphIndex / graphName) on an importer that buffers the input to read it
 * twice: the buffered read honors the abort signal, keeps text chunks as text and accepts a
 * Uint8Array from another realm, exactly as the import without a choice does.
 */

import { runInNewContext } from "node:vm";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { dotImporter } from "../../src/formats/dot/importer.js";
import { chunks } from "../robustness/text-helpers.js";

const CAFE = `caf${String.fromCharCode(0xe9)}`;
const TWO_GRAPHS = `graph { "${CAFE}" } graph { b }`;

/**
 * The first node's id of the graph DOT text imports into a fresh builder.
 * @param input - the input
 * @param options - the import options
 * @returns the id of node 0
 */
async function firstNode(
    input: Parameters<typeof dotImporter.import>[0],
    options: Parameters<typeof dotImporter.import>[2],
): Promise<unknown> {
    const builder = new GraphBuilder({ directed: false });
    await dotImporter.import(input, builder, options);
    return builder.freeze().ids.idOf(0);
}

describe("importChosenGraph", () => {
    it("rejects with the abort reason and cancels a stream aborted while it is buffered", async () => {
        const controller = new AbortController();
        let canceled: unknown = "not canceled";
        const stream = new ReadableStream<Uint8Array>({
            pull(c) {
                c.enqueue(new TextEncoder().encode("graph { a } "));
                controller.abort(new Error("stop"));
            },
            cancel(reason) {
                canceled = reason;
            },
        });
        await expect(
            dotImporter.import(stream, new GraphBuilder({ directed: false }), {
                graphIndex: 1,
                signal: controller.signal,
            }),
        ).rejects.toThrow("stop");
        expect(canceled).toBe(controller.signal.reason);
    });

    it("keeps string chunks as text, so the encoding option does not re-decode them", async () => {
        const text = (): AsyncGenerator<string | Uint8Array> => chunks(TWO_GRAPHS.slice(0, 12), TWO_GRAPHS.slice(12));
        const options = { encoding: "windows-1252" };
        const plain = await firstNode(text(), options);
        expect(plain).toBe(CAFE);
        expect(await firstNode(text(), { ...options, graphIndex: 0 })).toBe(plain);
    });

    it("reads a Uint8Array from another realm", async () => {
        const bytes = runInNewContext("new Uint8Array(b)", {
            b: [...new TextEncoder().encode(TWO_GRAPHS)],
        }) as Uint8Array;
        expect(bytes instanceof Uint8Array).toBe(false);
        expect(await firstNode(bytes, { graphIndex: 0 })).toBe(CAFE);
    });
});
