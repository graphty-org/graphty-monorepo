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
import {
    cyclePanel,
    focusMainHeading,
    focusOpenedGraph,
    focusOpenedGraphLater,
    INSPECTOR_TITLE_ID,
    installFocusGuard,
} from "../focus";

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

/**
 * The places rail with the Graph place open, its left panel, and the place's list once it is drawn.
 * @param props - the page.
 * @param props.rows - whether the place's list is drawn yet.
 * @returns the page.
 */
function Place({ rows }: { readonly rows: boolean }): React.JSX.Element {
    return (
        <div>
            <nav className="ws-rail">
                <button type="button" aria-current="page">
                    Graph
                </button>
                <button type="button">Data</button>
            </nav>
            <aside className="ws-left">
                {rows ? (
                    <div role="tree" aria-label="Layers">
                        <div role="treeitem" aria-selected="false" tabIndex={0}>
                            Everything
                        </div>
                    </div>
                ) : null}
            </aside>
        </div>
    );
}

describe("focus after a graph opens with no heading to take it", () => {
    it("goes to the open place's list when the inspector shows no graph heading", () => {
        render(<Place rows />);
        focusOpenedGraph();
        assert.equal(document.activeElement, screen.getByRole("treeitem", { name: "Everything" }));
    });

    it("waits on the rail's open place, then goes to the list's first row once it is drawn", async () => {
        const view = render(<Place rows={false} />);
        focusOpenedGraph();
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Graph" }));
        view.rerender(<Place rows />);
        await waitFor(() => {
            assert.equal(document.activeElement, screen.getByRole("treeitem", { name: "Everything" }));
        });
    });

    it("stays where the reader went from the rail before the list was drawn", async () => {
        const view = render(<Place rows={false} />);
        focusOpenedGraph();
        await userEvent.keyboard("{Tab}");
        const data = screen.getByRole("button", { name: "Data" });
        assert.equal(document.activeElement, data);
        view.rerender(<Place rows />);
        assert.isNotNull(screen.queryByRole("treeitem", { name: "Everything" }));
        assert.equal(document.activeElement, data, "the drawn list does not take focus from the reader");
    });

    it("leaves focus alone when there is no list and no open place on the rail", () => {
        render(<button type="button">Elsewhere</button>);
        const before = document.activeElement;
        focusOpenedGraph();
        assert.equal(document.activeElement, before);
    });

    it("leaves focus in a dialog the reader is in", () => {
        render(
            <div>
                <div data-inspected="graph">
                    <h2 id={INSPECTOR_TITLE_ID} tabIndex={-1}>
                        Karate
                    </h2>
                </div>
                <div role="dialog" aria-label="Settings">
                    <button type="button">Close</button>
                </div>
            </div>,
        );
        const close = screen.getByRole("button", { name: "Close" });
        close.focus();
        focusOpenedGraph();
        assert.equal(document.activeElement, close);
    });
});

/**
 * The workspace with its main heading drawn or not yet.
 * @param props - the page.
 * @param props.title - whether the inspector's title is drawn.
 * @returns the page.
 */
function Reopened({ title }: { readonly title: boolean }): React.JSX.Element {
    return (
        <div>
            <button type="button">Elsewhere</button>
            {title ? (
                <h2 id={INSPECTOR_TITLE_ID} tabIndex={-1}>
                    Karate
                </h2>
            ) : null}
        </div>
    );
}

describe("focus on a reopened tab's main heading", () => {
    it("goes to the heading at once when it is drawn", () => {
        render(<Reopened title />);
        focusMainHeading();
        assert.equal(document.activeElement, screen.getByRole("heading", { name: "Karate" }));
    });

    it("waits for the heading to be drawn", async () => {
        const view = render(<Reopened title={false} />);
        focusMainHeading();
        view.rerender(<Reopened title />);
        await waitFor(() => {
            assert.equal(document.activeElement, screen.getByRole("heading", { name: "Karate" }));
        });
    });

    it("stays where the reader went before the heading was drawn", async () => {
        const view = render(<Reopened title={false} />);
        focusMainHeading();
        await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
        view.rerender(<Reopened title />);
        assert.isNotNull(screen.queryByRole("heading", { name: "Karate" }));
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Elsewhere" }));
    });
});

/**
 * The workspace's panels, with the selection workspace open over the left panel or not, and the
 * drawing as an unregistered element with the drawing's tag.
 * @param props - the page.
 * @param props.workspace - whether the selection workspace is open.
 * @param props.modal - whether a modal dialog is open.
 * @returns the page.
 */
function Panels({
    workspace,
    modal = false,
}: {
    readonly workspace: boolean;
    readonly modal?: boolean;
}): React.JSX.Element {
    return (
        <div>
            <aside className="ws-left">
                <button type="button">Layers</button>
            </aside>
            {workspace ? (
                <div className="sel-ws">
                    <div className="sel-ws-head">
                        <button type="button">Done</button>
                    </div>
                    <div className="sel-ws-body">
                        <button type="button">Step</button>
                    </div>
                </div>
            ) : null}
            <aside className="ws-right">
                <button type="button">Title</button>
            </aside>
            <div className="ws-canvas">
                {React.createElement("graphty-element", {
                    tabIndex: 0,
                    "aria-label": "Drawing",
                    style: { display: "block", width: 20, height: 20 },
                })}
            </div>
            {modal ? (
                <div role="dialog" aria-modal="true" aria-label="Open">
                    <button type="button">Cancel</button>
                </div>
            ) : null}
        </div>
    );
}

describe("F6 between panels", () => {
    it("puts the drawing right after the selection workspace while it is open", () => {
        render(<Panels workspace />);
        screen.getByRole("button", { name: "Step" }).focus();
        cyclePanel(1);
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Drawing");
        cyclePanel(1);
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Title" }));
    });

    it("from nowhere in a panel starts at the first with F6 and the last with Shift+F6", () => {
        render(<Panels workspace={false} />);
        cyclePanel(1);
        assert.equal(document.activeElement, screen.getByRole("button", { name: "Layers" }));
        (document.activeElement as HTMLElement).blur();
        cyclePanel(-1);
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Drawing");
    });

    it("does nothing while a modal dialog is open", () => {
        render(<Panels workspace={false} modal />);
        const cancel = screen.getByRole("button", { name: "Cancel" });
        cancel.focus();
        cyclePanel(1);
        assert.equal(document.activeElement, cancel);
    });

    it("does nothing on a page with no panels", () => {
        render(<button type="button">Alone</button>);
        const alone = screen.getByRole("button", { name: "Alone" });
        alone.focus();
        cyclePanel(1);
        assert.equal(document.activeElement, alone);
    });
});
