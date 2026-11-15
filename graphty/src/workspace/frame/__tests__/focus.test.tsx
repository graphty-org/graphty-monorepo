/**
 * The workspace's focus guard (focus.ts), driven by real keys: focus never falls to the page.
 * Tab rounds the page (and an open dialog) instead of leaving it; a control removed while it held
 * focus hands it to the same control drawn again, else to the control that had focus before it;
 * F6 moves between panels, back to the control each panel last had.
 */
import React, { useState } from "react";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { cyclePanel, focusOpenedGraphLater, INSPECTOR_TITLE_ID, installFocusGuard } from "../focus";

let stop: () => void = () => undefined;

beforeEach(() => {
    stop = installFocusGuard();
});

afterEach(() => {
    stop();
});

/**
 * A field keyed by its value, as the style fields are: a commit draws a new element.
 * @returns the field and a button that opens and closes a box.
 */
function Page(): React.JSX.Element {
    const [value, setValue] = useState("a");
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button type="button">First</button>
            <label>
                Name
                <input
                    key={value}
                    defaultValue={value}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            setValue(event.currentTarget.value);
                        }
                    }}
                />
            </label>
            <button
                type="button"
                onClick={() => {
                    setOpen(true);
                }}
            >
                Open
            </button>
            {open ? (
                <div role="dialog" aria-label="Box">
                    <button type="button">Inside</button>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                        }}
                    >
                        Done
                    </button>
                </div>
            ) : null}
            <button type="button">Last</button>
        </div>
    );
}

describe("the focus guard", () => {
    it("Tab past the last control goes to the first, Shift+Tab before the first to the last", async () => {
        render(<Page />);
        screen.getByRole("button", { name: "Last" }).focus();
        await userEvent.keyboard("{Tab}");
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "First" }));
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Last" }));
    });

    it("Tab rounds within an open dialog", async () => {
        render(<Page />);
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        screen.getByRole("button", { name: "Done" }).focus();
        await userEvent.keyboard("{Tab}");
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Inside" }));
    });

    it("a control removed while it held focus hands focus to the control before it", async () => {
        render(<Page />);
        await userEvent.click(screen.getByRole("button", { name: "Open" }));
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Open" }));
        });
    });

    it("a field drawn again by its commit takes focus back", async () => {
        render(<Page />);
        await userEvent.click(screen.getByRole("textbox", { name: "Name" }));
        await userEvent.keyboard("b{Enter}");
        await waitFor(() => {
            const field = screen.getByRole("textbox", { name: "Name" });
            assert.equal((field as HTMLInputElement).value, "ab");
            assert.strictEqual(document.activeElement, field);
        });
    });

    it("F6 moves between panels, to the control each last had", () => {
        render(
            <div>
                <aside className="ws-left">
                    <button type="button">Tree</button>
                    <button type="button">Row</button>
                </aside>
                <aside className="ws-right">
                    <button type="button">Title</button>
                </aside>
            </div>,
        );
        screen.getByRole("button", { name: "Row" }).focus();
        cyclePanel(1);
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Title" }));
        cyclePanel(-1);
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Row" }));
    });
});

describe("focus after a graph opens", () => {
    /**
     * The graph's heading in the inspector, and a control the reader can go to while it loads.
     * @returns the page.
     */
    function Opened(): React.JSX.Element {
        return (
            <div>
                <button type="button">Elsewhere</button>
                <div data-inspected="graph">
                    <h2 id={INSPECTOR_TITLE_ID} tabIndex={-1}>
                        Les Miserables
                    </h2>
                </div>
            </div>
        );
    }

    it("goes to the graph's heading when the reader did nothing while it loaded", () => {
        render(<Opened />);
        const focusLater = focusOpenedGraphLater();
        focusLater();
        assert.equal(document.activeElement, screen.getByRole("heading", { name: "Les Miserables" }));
    });

    it("stays where the reader went while it loaded", async () => {
        render(<Opened />);
        const focusLater = focusOpenedGraphLater();
        await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
        focusLater();
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Elsewhere" }));
    });

    it("goes where the open says (a reopened tab's main heading) when the reader did nothing", () => {
        render(<Opened />);
        const focusLater = focusOpenedGraphLater(() => {
            screen.getByRole("button", { name: "Elsewhere" }).focus();
        });
        focusLater();
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Elsewhere" }));
    });

    it("leaves the open's own target alone when the reader went somewhere while it loaded", async () => {
        render(<Opened />);
        const heading = screen.getByRole("heading", { name: "Les Miserables" });
        const focusLater = focusOpenedGraphLater(() => {
            heading.focus();
        });
        await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
        focusLater();
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Elsewhere" }));
    });
});
