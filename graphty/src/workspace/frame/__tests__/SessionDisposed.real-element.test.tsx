/**
 * graphty-element disposes its session when the element leaves the page, and React does not always
 * take it off: a story's page emptied under a mounted root, a host that moves the tag (issue #3521).
 * A panel rendered again after that read a disposed session and threw `E_DISPOSED` in render. The
 * frame drops the session when the element says it was disposed, so a reader renders without it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { ElementHost } from "../ElementHost";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Records a render error instead of letting it unmount the tree. */
class Catch extends React.Component<{ readonly children: React.ReactNode }, { message: string | null }> {
    override state: { message: string | null } = { message: null };

    static getDerivedStateFromError(error: unknown): { message: string } {
        return { message: error instanceof Error ? error.message : "a value that is not an Error" };
    }

    override render(): React.ReactNode {
        return this.state.message === null ? this.props.children : `threw: ${this.state.message}`;
    }
}

/**
 * Reads the session in render, as the legend and the style rows do.
 * @param props - Component props
 * @param props.session - the session, or null
 * @returns what it read
 */
function Reader({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    return (
        <p data-testid="reader">{session === null ? "no session" : `${session.data.readableValues().length} values`}</p>
    );
}

/**
 * The element, in a place of the page React does not own, a reader of its session and a control
 * that renders the reader again.
 * @param props - Component props
 * @param props.place - where the element goes
 * @returns the host
 */
function Host({ place }: Readonly<{ place: HTMLElement }>): React.JSX.Element {
    const [session, setSession] = useState<GraphSession | null>(null);
    const [renders, setRenders] = useState(0);
    const [workspace] = useState(() => makeWorkspaceValue(createWorkspaceStore(), createRegistry([]), null, null));
    const onReady = useCallback((_element: unknown, next: GraphSession | null) => {
        setSession(next);
    }, []);
    return (
        <WorkspaceContext.Provider value={workspace}>
            {createPortal(<ElementHost onReady={onReady} />, place)}
            <Catch>
                <Reader session={session} />
            </Catch>
            <button type="button" onClick={() => setRenders(renders + 1)}>
                Render again {renders}
            </button>
        </WorkspaceContext.Provider>
    );
}

describe("a disposed session", () => {
    it("is dropped, so a reader rendered again after its element left the page does not throw", async () => {
        const place = document.createElement("div");
        document.body.append(place);
        render(<Host place={place} />);
        await waitFor(() => assert.match(screen.getByTestId("reader").textContent ?? "", /values$/), {
            timeout: TIMEOUT_MS,
        });

        // The page loses the element without React unmounting it: its session is disposed.
        const element = place.querySelector("graphty-element");
        assert.isNotNull(element);
        place.remove();
        assert.isFalse(element.session.status.ready);

        await userEvent.click(screen.getByRole("button", { name: /Render again/ }));
        await waitFor(() => assert.include(screen.getByRole("button", { name: /Render again/ }).textContent, "1"));
        assert.equal(screen.getByTestId("reader").textContent, "no session");
    });
});
