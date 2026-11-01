/**
 * A style line's focus ask (useFocusLine) belongs to the session it was made in: a Style tab of
 * another session -- a project opened since, a story rendered again in the same page -- never takes
 * focus for it, even where it draws a line of the same name. Two real graphty-element sessions with
 * no view; the ask is made by a click, as a pick in a menu makes it.
 */
import type { Channel } from "@graphty/graphty-element/schema";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import React from "react";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen } from "../../../test/test-utils";
import { focusLineNext, useFocusLine } from "../useFocusLine";

/** The line the ask names. */
const COLOR = "node.color" as Channel;

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A new session, disposed after the test.
 * @returns the session.
 */
function sessionOf(): GraphSession {
    const session = createGraphSession();
    sessions.push(session);
    return session;
}

/**
 * A Style tab of one session: an Add color button that asks focus for the Color line (its write
 * has not drawn the line yet), and the lines it draws.
 * @param props - the tab's session, its name and its lines.
 * @param props.session - the session.
 * @param props.name - the tab's name.
 * @param props.lines - the lines drawn.
 * @returns the tab.
 */
function Tab({
    session,
    name,
    lines,
}: Readonly<{ session: GraphSession; name: string; lines: readonly Channel[] }>): React.JSX.Element {
    const scope = useFocusLine<HTMLDivElement>(session, "row");
    return (
        <div ref={scope} aria-label={name} role="group">
            <section data-section="fill">
                <button
                    type="button"
                    onClick={() => {
                        focusLineNext(session, COLOR);
                    }}
                >
                    Add color
                </button>
                {lines.map((line) => (
                    <div key={line} data-line={line}>
                        <input aria-label={`${name} ${line}`} />
                    </div>
                ))}
            </section>
        </div>
    );
}

/**
 * The page: a control the reader can go to, and one tab.
 * @param props - the tab.
 * @param props.tab - the tab.
 * @returns the page.
 */
function Page({ tab }: Readonly<{ tab: React.JSX.Element }>): React.JSX.Element {
    return (
        <div>
            <button type="button">Elsewhere</button>
            {tab}
        </div>
    );
}

describe("a style line's focus ask", () => {
    it("is answered by the tab of the session that asked, once it draws the line", async () => {
        const a = sessionOf();
        const view = render(<Page tab={<Tab key="a" session={a} name="A" lines={[]} />} />);
        await userEvent.click(screen.getByRole("button", { name: "Add color" }));
        view.rerender(<Page tab={<Tab key="a" session={a} name="A" lines={[COLOR]} />} />);
        assert.equal(document.activeElement, screen.getByRole("textbox", { name: `A ${COLOR}` }));
    });

    it("is never answered by another session's tab drawing the same line", async () => {
        const a = sessionOf();
        const b = sessionOf();
        const view = render(<Page tab={<Tab key="a" session={a} name="A" lines={[]} />} />);
        // The ask is made in A; before its line is drawn, the reader goes elsewhere and another
        // session's tab comes up with a Color line of its own.
        await userEvent.click(screen.getByRole("button", { name: "Add color" }));
        await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
        view.rerender(<Page tab={<Tab key="b" session={b} name="B" lines={[COLOR]} />} />);
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Elsewhere" }));
    });
});
