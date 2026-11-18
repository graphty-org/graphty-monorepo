/**
 * graphty-element's code can fail to load (a network error, or a chunk gone after a deploy). The
 * workspace's canvas then says so and offers Retry, which loads it again and draws the graph,
 * instead of an empty canvas forever (issue #7051). This file never imports the element up front:
 * the first load fails, and the element's chunk arrives only on Retry.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { useState } from "react";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { ElementHost } from "../ElementHost";

let loads = 0;

/**
 * Fails the first load, as a lost network would; loads the real element after that.
 * @returns Settles once the element's code has run
 */
async function failFirst(): Promise<void> {
    loads += 1;
    if (loads === 1) {
        throw new TypeError("Failed to fetch dynamically imported module");
    }
    await import("@graphty/graphty-element");
}

/**
 * The element host inside the workspace's context, recording the session it hands up.
 * @param props - Component props
 * @param props.onSession - Called with the session once the element is up
 * @returns The host
 */
function Host({ onSession }: Readonly<{ onSession: (session: GraphSession | null) => void }>): React.JSX.Element {
    const [workspace] = useState(() => makeWorkspaceValue(createWorkspaceStore(), createRegistry([]), null, null));
    return (
        <WorkspaceContext.Provider value={workspace}>
            <ElementHost onReady={(_element, session) => onSession(session)} loadElement={failFirst} />
        </WorkspaceContext.Provider>
    );
}

describe("graphty-element failing to load", () => {
    it("says so on the canvas, and Retry loads it and draws the graph", async () => {
        let session: GraphSession | null = null;
        render(
            <Host
                onSession={(next) => {
                    session = next;
                }}
            />,
        );

        const alert = await screen.findByRole("alert");
        assert.include(alert.textContent, "The graph could not load.");
        assert.isUndefined(customElements.get("graphty-element"));

        await userEvent.click(screen.getByRole("button", { name: "Retry" }));
        await waitFor(() => {
            assert.isNotNull(session);
        });
        assert.equal(loads, 2);
        assert.isNull(screen.queryByRole("alert"));
        assert.isNotNull(document.querySelector("graphty-element"));
    });
});
