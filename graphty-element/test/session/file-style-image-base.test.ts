/**
 * @file A picture a file names by a relative path is resolved against the URL the load says the file came from
 * (`styleOptions.imageBaseUrl`): a DOT node's `image` sits beside its `.gv`, not beside the page. Without one, the
 * path is drawn as the file wrote it.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const DOT = `digraph { a [image="img/a.png"]; b [image="https://other.test/b.png"]; }`;

/**
 * What a node is drawn with on a channel.
 * @param session - The session.
 * @param node - The node.
 * @param channel - The channel.
 * @returns The value.
 */
function drawn(session: GraphSession, node: string, channel: string): unknown {
    return (session.styles.explain({ node }).merged as Record<string, unknown>)[channel];
}

/**
 * The pictures of nodes a and b, after loading the file with the given base.
 * @param imageBaseUrl - The base, or undefined.
 * @returns Their URLs.
 */
async function pictures(imageBaseUrl?: string): Promise<unknown[]> {
    const session = createGraphSession();
    await session.data.import(
        { type: "dot", config: { data: DOT } },
        { styles: "file", layout: "recommended", styleOptions: imageBaseUrl === undefined ? {} : { imageBaseUrl } },
    );
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    const out = [drawn(session, "a", "node.image"), drawn(session, "b", "node.image")];
    session.dispose();
    return out;
}

describe("a file's picture paths", () => {
    it("are resolved against the file's location when the load gives one", async () => {
        assert.deepEqual(await pictures("https://example.test/sheets/one.gv"), [
            "https://example.test/sheets/img/a.png",
            "https://other.test/b.png",
        ]);
    });

    it("are drawn as the file wrote them when it gives none", async () => {
        assert.deepEqual(await pictures(), ["img/a.png", "https://other.test/b.png"]);
    });
});
