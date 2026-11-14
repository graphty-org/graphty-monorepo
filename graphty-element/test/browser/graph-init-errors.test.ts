/**
 * A graph that cannot start reports a coded error (issue #7131): the constructor names a missing
 * host element with `E_HOST_NOT_FOUND`, `init` rethrows a coded failure with its code intact, and
 * a mounted element whose init fails reports it through the `error` event without leaving an
 * unhandled rejection (test/setup.ts fails the test on one).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { GraphtyError, isGraphtyError } from "../../extend";
import { Graph } from "../../src/Graph.js";

/** A refusal the renderer could raise while opening, standing in for a WebGPU one. */
function refusal(): GraphtyError {
    return new GraphtyError({ code: "E_NO_ADAPTER", message: "no adapter", source: "acceleration" });
}

/** Make the next renderer opening fail with a coded error. */
function failRendererOpening(error: GraphtyError): void {
    vi.spyOn(Graph.prototype as unknown as { openRenderer: () => Promise<void> }, "openRenderer").mockRejectedValue(
        error,
    );
}

afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});

describe("graph start-up errors", () => {
    it("names a missing host element with E_HOST_NOT_FOUND", () => {
        let thrown: unknown;
        try {
            new Graph("no-such-element");
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown));
        assert.strictEqual((thrown as GraphtyError).code, "E_HOST_NOT_FOUND");
        assert.strictEqual((thrown as GraphtyError).details.id, "no-such-element");
    });

    it("rethrows a coded init failure with its code", async () => {
        const error = refusal();
        failRendererOpening(error);
        const host = document.createElement("div");
        document.body.append(host);
        const graph = new Graph(host);

        let thrown: unknown;
        try {
            await graph.init();
        } catch (caught) {
            thrown = caught;
        } finally {
            graph.dispose();
        }

        assert.strictEqual(thrown, error);
    });

    it("reports a failed element init through the error event, with no unhandled rejection", async () => {
        const error = refusal();
        failRendererOpening(error);
        const element = document.createElement("graphty-element");
        const reported = new Promise<unknown>((resolve) => {
            element.addEventListener("error", (event) => {
                // An event named "error" reaching the window reads as an uncaught error to the runner.
                event.stopPropagation();
                resolve((event as CustomEvent<{ error: unknown }>).detail.error);
            });
        });

        document.body.append(element);

        assert.strictEqual(await reported, error);
        element.remove();
    });
});
