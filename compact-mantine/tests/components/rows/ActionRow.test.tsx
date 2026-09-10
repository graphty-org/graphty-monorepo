import { DirectionProvider, MantineProvider, UnstyledButton } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { ActionRow } from "../../../src/components/rows/ActionRow";
import { PANEL_GRID, PANEL_INK } from "../../../src/constants/panel";
import { UiGlyph } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render with the text direction reversed, the way a consumer of an
 * Arabic or Hebrew interface consumes it.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}

const originalMatchMedia = window.matchMedia;

/**
 * Make every media query report the given match, so the "(hover: none)" branch
 * can be exercised in jsdom.
 * @param matches - What matchMedia should report for every query
 */
function setMatchMedia(matches: boolean): void {
    window.matchMedia = ((query: string): MediaQueryList =>
        ({
            matches,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => true,
        }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
});

/**
 * A 24px icon-only affordance, the shape most actions on this row take.
 * @param root0 - Component props
 * @param root0.label - The word the glyph replaces: the title and the accessible name
 * @param root0.onClick - What the affordance does
 * @returns The icon button
 */
function GlyphAction({ label, onClick }: { label: string; onClick?: () => void }): React.JSX.Element {
    return (
        <UnstyledButton type="button" title={label} aria-label={label} onClick={onClick}>
            <UiGlyph name="copy" />
        </UnstyledButton>
    );
}

describe("ActionRow", () => {
    describe("anatomy", () => {
        it("reports its state", () => {
            renderRow(<ActionRow state="20 nodes" />);

            expect(screen.getByTestId("action-row-state")).toHaveTextContent("20 nodes");
        });

        it("draws the state at the secondary text colour", () => {
            renderRow(<ActionRow state="20 nodes" />);

            expect(screen.getByTestId("action-row-state").style.color).toBe(PANEL_INK.CHROME);
        });

        it("truncates a state longer than the row rather than wrapping", () => {
            renderRow(<ActionRow state="Betweenness on 20 nodes, weighted by Bridges, ran 2 minutes ago" />);

            expect(screen.getByTestId("action-row-state")).toHaveStyle({
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            });
        });

        it("stands one row pitch tall", () => {
            renderRow(<ActionRow state="20 nodes" />);

            expect(screen.getByTestId("action-row")).toHaveStyle({ height: `${PANEL_GRID.ROW_PITCH}px` });
        });

        it("renders no state slot when there is no state", () => {
            renderRow(<ActionRow actions={<GlyphAction label="Copy reading" />} />);

            expect(screen.queryByTestId("action-row-state")).not.toBeInTheDocument();
        });

        it("renders no affordance cluster when there is nothing to put in it", () => {
            renderRow(<ActionRow state="20 nodes" />);

            expect(screen.queryByTestId("action-row-affordances")).not.toBeInTheDocument();
            expect(screen.queryByTestId("action-row-actions")).not.toBeInTheDocument();
            expect(screen.queryByTestId("action-row-resident-actions")).not.toBeInTheDocument();
        });

        it("renders an empty row when it is given nothing at all", () => {
            renderRow(<ActionRow />);

            expect(screen.getByTestId("action-row")).toBeEmptyDOMElement();
        });

        it("holds the cluster at the row's trailing edge when there is no state", () => {
            renderRow(<ActionRow actions={<GlyphAction label="Copy reading" />} />);

            expect(screen.getByTestId("action-row-affordances")).toHaveStyle({ marginInlineStart: "auto" });
        });
    });

    describe("the reading a reader cannot finish", () => {
        const long = "Betweenness on 20 nodes, weighted by Bridges, force directed layout, ran 2 minutes ago";

        it("shows the whole reading as a tooltip when the state is plain text", () => {
            renderRow(<ActionRow state={long} />);

            expect(screen.getByTestId("action-row-state")).toHaveAttribute("title", long);
        });

        it("keeps the whole reading in the accessibility tree, whatever the ellipsis does to the drawing", () => {
            renderRow(<ActionRow state={long} />);

            // Only CSS truncates it: the text node is complete, so a screen
            // reader reads the whole thing.
            expect(screen.getByTestId("action-row-state")).toHaveTextContent(long);
        });

        it("takes the tooltip from stateTitle when the state is markup rather than text", () => {
            renderRow(
                <ActionRow
                    state={
                        <span>
                            Ran <strong>2 minutes</strong> ago
                        </span>
                    }
                    stateTitle="Betweenness on 20 nodes, ran 2 minutes ago"
                />,
            );

            expect(screen.getByTestId("action-row-state")).toHaveAttribute(
                "title",
                "Betweenness on 20 nodes, ran 2 minutes ago",
            );
        });

        it("lets stateTitle override a plain-text reading", () => {
            renderRow(<ActionRow state="20 nodes" stateTitle="20 nodes, 34 edges, 2 components" />);

            expect(screen.getByTestId("action-row-state")).toHaveAttribute(
                "title",
                "20 nodes, 34 edges, 2 components",
            );
        });

        it("offers no tooltip for markup with no stateTitle, rather than an invented one", () => {
            renderRow(<ActionRow state={<span>Ran 2 minutes ago</span>} />);

            expect(screen.getByTestId("action-row-state")).not.toHaveAttribute("title");
        });

        it("adds nothing to the accessibility tree when the drawn reading is already complete", () => {
            renderRow(<ActionRow state="20 nodes" />);

            // A tooltip that repeats what is already written is noise, so the
            // extra element only exists when the drawing is short of the
            // meaning.
            expect(screen.queryByTestId("action-row-state-full")).not.toBeInTheDocument();
            expect(screen.getByTestId("action-row-state")).not.toHaveAttribute("aria-hidden");
        });

        it("puts the complete reading where a screen reader will find it when the drawing is an abbreviation", () => {
            renderRow(<ActionRow state="20 nodes" stateTitle="20 nodes, 34 edges, 2 components" />);

            const full = screen.getByTestId("action-row-state-full");
            expect(full).toHaveTextContent("20 nodes, 34 edges, 2 components");
            // A title is reachable by neither keyboard nor touch, so it is
            // never the only route to the text.
            expect(screen.getByTestId("action-row-state")).toHaveAttribute("title", "20 nodes, 34 edges, 2 components");
        });

        it("says the complete reading once rather than twice, by hiding the abbreviation it replaces", () => {
            renderRow(<ActionRow state="20 nodes" stateTitle="20 nodes, 34 edges, 2 components" />);

            const drawn = screen.getByText("20 nodes");
            expect(drawn).toHaveAttribute("aria-hidden", "true");
            // The abbreviation is still drawn: only the accessibility tree
            // skips it.
            expect(screen.getByTestId("action-row-state")).toContainElement(drawn);
        });

        it("names the row with the complete reading rather than with the abbreviation", () => {
            renderRow(
                <ActionRow
                    state="20 nodes"
                    stateTitle="20 nodes, 34 edges, 2 components"
                    actions={<GlyphAction label="Copy reading" />}
                />,
            );

            expect(screen.getByRole("group", { name: "20 nodes, 34 edges, 2 components" })).toBe(
                screen.getByTestId("action-row"),
            );
        });

        it("names the row's own button with the complete reading, so markup is no longer a dead end", () => {
            renderRow(
                <ActionRow
                    state={
                        <span>
                            Ran <strong>2 minutes</strong> ago
                        </span>
                    }
                    stateTitle="Betweenness on 20 nodes, ran 2 minutes ago"
                    onClick={vi.fn()}
                />,
            );

            expect(screen.getByRole("button", { name: "Betweenness on 20 nodes, ran 2 minutes ago" })).toBe(
                screen.getByTestId("action-row-state"),
            );
        });

        it("announces the complete reading, not the abbreviation, when the reading is live", () => {
            renderRow(<ActionRow state="40%" stateTitle="Betweenness running, 40% done" live="polite" />);

            const reading = screen.getByTestId("action-row-state");
            expect(reading).toHaveAttribute("aria-live", "polite");
            // The live region is the reading element, and what it announces is
            // its own accessible text: the abbreviation is out of the tree and
            // the complete reading is in it.
            expect(reading).toContainElement(screen.getByTestId("action-row-state-full"));
            expect(screen.getByText("40%")).toHaveAttribute("aria-hidden", "true");
        });
    });

    describe("what the row is called", () => {
        it("names the cluster of controls with the reading, so a copy button says which row it is on", () => {
            renderRow(
                <ActionRow
                    state="Mr_Whiskers"
                    actions={<GlyphAction label="Copy reading" />}
                    residentActions={<GlyphAction label="Pinned to the panel" />}
                />,
            );

            const group = screen.getByRole("group", { name: "Mr_Whiskers" });
            expect(group).toBe(screen.getByTestId("action-row"));
            expect(group).toContainElement(screen.getByRole("button", { name: "Copy reading" }));
        });

        it("still names the cluster when the reading is the row's own button", () => {
            renderRow(
                <ActionRow state="Mr_Whiskers" onClick={vi.fn()} actions={<GlyphAction label="Copy reading" />} />,
            );

            // The name is computed from a referenced element that is itself a
            // control, which the accessible name spec treats as a special case.
            // Checked against Chrome's own accessibility tree over the DevTools
            // protocol as well as here: both resolve it to the button's text.
            expect(screen.getByRole("group", { name: "Mr_Whiskers" })).toBe(screen.getByTestId("action-row"));
        });

        it("is no group when it holds no controls, because there is nothing to group", () => {
            renderRow(<ActionRow state="20 nodes" />);

            expect(screen.queryByRole("group")).not.toBeInTheDocument();
        });

        it("is no group when there is no reading to name it with", () => {
            renderRow(<ActionRow actions={<GlyphAction label="Copy reading" />} />);

            // A group with no accessible name tells a screen reader nothing,
            // so it is worse than no group at all.
            expect(screen.queryByRole("group")).not.toBeInTheDocument();
        });
    });

    describe("a reading that arrives while the reader is elsewhere", () => {
        it("says nothing by default", () => {
            renderRow(<ActionRow state="20 nodes" />);

            // No aria-live at all rather than aria-live="off": the two behave
            // the same, and every announcing component in this library leaves
            // the attribute out when there is nothing to announce.
            const reading = screen.getByTestId("action-row-state");
            expect(reading).not.toHaveAttribute("aria-live");
            expect(reading).not.toHaveAttribute("aria-atomic");
        });

        it("announces politely once the caller says the reading is fed by a job", () => {
            renderRow(<ActionRow state="20 nodes" busy={false} />);

            const reading = screen.getByTestId("action-row-state");
            expect(reading).toHaveAttribute("aria-live", "polite");
            expect(reading).toHaveAttribute("aria-busy", "false");
        });

        it("still answers to the superseded stateLive spelling", () => {
            renderRow(<ActionRow state="Running, 40%" stateLive="assertive" />);

            expect(screen.getByTestId("action-row-state")).toHaveAttribute("aria-live", "assertive");
        });

        it("announces politely when asked to", () => {
            renderRow(<ActionRow state="Running, 40%" live="polite" />);

            const reading = screen.getByTestId("action-row-state");
            expect(reading).toHaveAttribute("aria-live", "polite");
            // The whole reading is replaced at once, so the whole reading is
            // announced rather than the words that changed.
            expect(reading).toHaveAttribute("aria-atomic", "true");
        });

        it("interrupts when asked to", () => {
            renderRow(<ActionRow state="Betweenness failed" live="assertive" />);

            expect(screen.getByTestId("action-row-state")).toHaveAttribute("aria-live", "assertive");
        });

        it("keeps the live region mounted across a change of reading, which is what makes it announce", () => {
            const { rerender } = renderRow(<ActionRow state="Running, 40%" live="polite" />);
            const before = screen.getByTestId("action-row-state");

            rerender(
                <MantineProvider theme={compactTheme}>
                    <ActionRow state="Running, 80%" live="polite" />
                </MantineProvider>,
            );

            expect(screen.getByTestId("action-row-state")).toBe(before);
            expect(before).toHaveTextContent("Running, 80%");
        });
    });

    describe("the hover split", () => {
        it("hides what acts until the row is reached", () => {
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            const actions = screen.getByTestId("action-row-actions");
            expect(actions).toHaveAttribute("data-visible", "false");
            expect(actions).toHaveStyle({ opacity: 0 });
        });

        it("reveals what acts on hover", () => {
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            fireEvent.mouseEnter(screen.getByTestId("action-row"));

            const actions = screen.getByTestId("action-row-actions");
            expect(actions).toHaveAttribute("data-visible", "true");
            expect(actions).toHaveStyle({ opacity: 1 });
        });

        it("hides them again when the pointer leaves", () => {
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            const row = screen.getByTestId("action-row");
            fireEvent.mouseEnter(row);
            fireEvent.mouseLeave(row);

            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
        });

        it("keeps a hidden action mounted, so it keeps its place in the tab order", () => {
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            expect(screen.getByRole("button", { name: "Copy reading" })).toBeInTheDocument();
        });

        it("withdraws pointer events with the ink, so an invisible button cannot be clicked", () => {
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            expect(screen.getByTestId("action-row-actions")).toHaveStyle({ pointerEvents: "none" });

            fireEvent.mouseEnter(screen.getByTestId("action-row"));

            expect(screen.getByTestId("action-row-actions")).not.toHaveStyle({ pointerEvents: "none" });
        });

        it("runs the action when it has been revealed and pressed", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" onClick={onClick} />} />);

            await user.hover(screen.getByTestId("action-row"));
            await user.click(screen.getByRole("button", { name: "Copy reading" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("never hides what reports state", () => {
            renderRow(
                <ActionRow
                    state="Chonky_Boy"
                    actions={<GlyphAction label="Copy reading" />}
                    residentActions={<GlyphAction label="Hidden. Show Chonky_Boy" />}
                />,
            );

            const resident = screen.getByTestId("action-row-resident-actions");
            expect(resident).toBeInTheDocument();
            expect(resident.style.opacity).toBe("");
            expect(resident.style.pointerEvents).toBe("");
        });

        it("leaves what reports state resident while the row is hovered", () => {
            renderRow(
                <ActionRow state="Chonky_Boy" residentActions={<GlyphAction label="Hidden. Show Chonky_Boy" />} />,
            );

            fireEvent.mouseEnter(screen.getByTestId("action-row"));

            expect(screen.getByTestId("action-row-resident-actions").style.opacity).toBe("");
        });

        it("runs a resident action without any hover at all", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <ActionRow
                    state="Chonky_Boy"
                    residentActions={<GlyphAction label="Hidden. Show Chonky_Boy" onClick={onClick} />}
                />,
            );

            await user.click(screen.getByRole("button", { name: "Hidden. Show Chonky_Boy" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("draws both clusters when the row has each kind", () => {
            renderRow(
                <ActionRow
                    state="Mrs_Henderson"
                    actions={<GlyphAction label="Copy reading" />}
                    residentActions={<GlyphAction label="Hidden. Show Mrs_Henderson" />}
                />,
            );

            expect(screen.getByTestId("action-row-actions")).toBeInTheDocument();
            expect(screen.getByTestId("action-row-resident-actions")).toBeInTheDocument();
        });
    });

    describe("holding the actions open", () => {
        it("draws them with no hover and no focus when the caller asks", () => {
            renderRow(
                <ActionRow state="20 nodes" actionsVisible actions={<GlyphAction label="Node options" />} />,
            );

            const actions = screen.getByTestId("action-row-actions");
            expect(actions).toHaveAttribute("data-visible", "true");
            expect(actions).toHaveStyle({ opacity: 1 });
        });

        it("lets them be pressed while held open, which is the point of holding them", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <ActionRow state="20 nodes" actionsVisible actions={<GlyphAction label="Node options" onClick={onClick} />} />,
            );

            await user.click(screen.getByRole("button", { name: "Node options" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("outranks the hover when the caller holds them shut", () => {
            renderRow(
                <ActionRow state="20 nodes" actionsVisible={false} actions={<GlyphAction label="Copy reading" />} />,
            );

            fireEvent.mouseEnter(screen.getByTestId("action-row"));

            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
        });

        it("does not outrank focus, because a focus ring nobody can see is a failure", async () => {
            const user = userEvent.setup();
            renderRow(
                <ActionRow state="20 nodes" actionsVisible={false} actions={<GlyphAction label="Copy reading" />} />,
            );

            await user.tab();

            expect(screen.getByRole("button", { name: "Copy reading" })).toHaveFocus();
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");
            expect(screen.getByTestId("action-row-actions")).toHaveStyle({ opacity: 1 });
        });

        it("holds them shut again once focus has left", async () => {
            const user = userEvent.setup();
            renderRow(
                <ActionRow state="20 nodes" actionsVisible={false} actions={<GlyphAction label="Copy reading" />} />,
            );

            await user.tab();
            await user.tab();

            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
        });
    });

    describe("a pointer that cannot hover", () => {
        it("makes every hidden action resident", () => {
            setMatchMedia(true);
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            const actions = screen.getByTestId("action-row-actions");
            expect(actions).toHaveAttribute("data-visible", "true");
            expect(actions).toHaveStyle({ opacity: 1 });
        });

        it("lets a hidden action be pressed with no hover first", async () => {
            setMatchMedia(true);
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" onClick={onClick} />} />);

            await user.click(screen.getByRole("button", { name: "Copy reading" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("keeps the split on a pointer that can hover", () => {
            setMatchMedia(false);
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
        });
    });

    describe("the keyboard route", () => {
        it("reveals a hidden action when focus reaches it", async () => {
            const user = userEvent.setup();
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            await user.tab();

            expect(screen.getByRole("button", { name: "Copy reading" })).toHaveFocus();
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");
            expect(screen.getByTestId("action-row-actions")).toHaveStyle({ opacity: 1 });
        });

        it("runs a hidden action from the keyboard", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" onClick={onClick} />} />);

            await user.tab();
            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("stays revealed while focus moves between two affordances of the same row", async () => {
            const user = userEvent.setup();
            renderRow(
                <ActionRow
                    state="20 nodes"
                    actions={
                        <>
                            <GlyphAction label="Recompute" />
                            <GlyphAction label="Copy reading" />
                        </>
                    }
                />,
            );

            await user.tab();
            await user.tab();

            expect(screen.getByRole("button", { name: "Copy reading" })).toHaveFocus();
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");
        });

        it("hides them again when focus leaves the row", async () => {
            const user = userEvent.setup();
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            await user.tab();
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");

            await user.tab();

            expect(screen.getByRole("button", { name: "Copy reading" })).not.toHaveFocus();
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
        });

        it("forwards the focus it watches, instead of swallowing it", async () => {
            // React clears `currentTarget` once the handler has returned, so
            // the element the row listened on has to be read inside the
            // handler rather than off the recorded call afterwards. The
            // previous version of this test asserted on it afterwards and was
            // asserting against null.
            const currentTargets: Array<EventTarget | null> = [];
            const onFocus = vi.fn((event: React.FocusEvent<HTMLDivElement>) => {
                currentTargets.push(event.currentTarget);
            });
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <ActionRow
                    state="20 nodes"
                    actions={<GlyphAction label="Copy reading" />}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />,
            );

            await user.tab();

            expect(onFocus).toHaveBeenCalledTimes(1);
            expect(currentTargets[0]).toBe(screen.getByTestId("action-row"));
            // The target is the control focus actually landed on, and unlike
            // the current target it survives the handler.
            expect(onFocus.mock.calls[0]?.[0]).toHaveProperty(
                "target",
                screen.getByRole("button", { name: "Copy reading" }),
            );
            expect(onBlur).not.toHaveBeenCalled();

            await user.tab();

            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("forwards a blur that stays inside the row, so a consumer can tell the two apart", async () => {
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <ActionRow
                    state="20 nodes"
                    actions={
                        <>
                            <GlyphAction label="Recompute" />
                            <GlyphAction label="Copy reading" />
                        </>
                    }
                    onBlur={onBlur}
                />,
            );

            await user.tab();
            await user.tab();

            expect(onBlur).toHaveBeenCalledTimes(1);
            // The row stays revealed, and the consumer still hears about it.
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");
            const [event] = onBlur.mock.calls[0] ?? [];
            expect((event as React.FocusEvent<HTMLDivElement>).relatedTarget).toBe(
                screen.getByRole("button", { name: "Copy reading" }),
            );
        });
    });

    describe("activating the row itself", () => {
        it("leaves the reading as text until it is given something to do", () => {
            renderRow(<ActionRow state="Mr_Whiskers" />);

            expect(screen.queryByRole("button", { name: "Mr_Whiskers" })).not.toBeInTheDocument();
        });

        it("turns the reading into a button named by what it reads", () => {
            renderRow(<ActionRow state="Mr_Whiskers" onClick={vi.fn()} />);

            const button = screen.getByRole("button", { name: "Mr_Whiskers" });
            expect(button).toBe(screen.getByTestId("action-row-state"));
            expect(button).toHaveAttribute("type", "button");
        });

        it("makes the target the whole height of the row rather than one line of text", () => {
            renderRow(<ActionRow state="Mr_Whiskers" onClick={vi.fn()} />);

            expect(screen.getByTestId("action-row-state")).toHaveStyle({
                alignSelf: "stretch",
                lineHeight: `${PANEL_GRID.ROW_PITCH}px`,
            });
        });

        it("reports a pointer activation, with the event", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="Mr_Whiskers" onClick={onClick} />);

            await user.click(screen.getByRole("button", { name: "Mr_Whiskers" }));

            expect(onClick).toHaveBeenCalledTimes(1);
            const [event, meta] = onClick.mock.calls[0] ?? [];
            expect(meta).toEqual({ source: "pointer" });
            expect(event).toHaveProperty("shiftKey", false);
        });

        it("carries the modifier keys a range selection needs", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="Mrs_Henderson" onClick={onClick} />);

            await user.keyboard("{Shift>}");
            await user.click(screen.getByRole("button", { name: "Mrs_Henderson" }));
            await user.keyboard("{/Shift}");

            const [event] = onClick.mock.calls[0] ?? [];
            expect(event).toHaveProperty("shiftKey", true);
        });

        it("reports a keyboard activation as a keyboard one", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="Chonky_Boy" onClick={onClick} />);

            await user.tab();
            expect(screen.getByRole("button", { name: "Chonky_Boy" })).toHaveFocus();
            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
            const [, meta] = onClick.mock.calls[0] ?? [];
            expect(meta).toEqual({ source: "keyboard" });
        });

        it("also activates on Space, because it is a real button", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<ActionRow state="Chonky_Boy" onClick={onClick} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("is not activated by a control in the affordance cluster", async () => {
            const onRowClick = vi.fn();
            const onCopy = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <ActionRow
                    state="Mr_Whiskers"
                    onClick={onRowClick}
                    actions={<GlyphAction label="Copy reading" onClick={onCopy} />}
                />,
            );

            await user.hover(screen.getByTestId("action-row"));
            await user.click(screen.getByRole("button", { name: "Copy reading" }));

            expect(onCopy).toHaveBeenCalledTimes(1);
            expect(onRowClick).not.toHaveBeenCalled();
        });

        it("reveals the hidden actions when the reading itself takes focus", async () => {
            const user = userEvent.setup();
            renderRow(
                <ActionRow state="Mr_Whiskers" onClick={vi.fn()} actions={<GlyphAction label="Copy reading" />} />,
            );

            await user.tab();

            expect(screen.getByRole("button", { name: "Mr_Whiskers" })).toHaveFocus();
            expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");
        });

        it("says so in development when it is asked to act with nothing to name the button", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            renderRow(<ActionRow onClick={vi.fn()} actions={<GlyphAction label="Copy reading" />} />);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0]?.[0]).toContain("ActionRow was given onClick but no state");
        });

        it("keeps quiet when the row has a reading to name its button", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            renderRow(<ActionRow state="Mr_Whiskers" onClick={vi.fn()} />);

            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe("text that runs the other way", () => {
        it("writes no physical margin anywhere in the row", () => {
            renderRow(
                <ActionRow
                    state="20 nodes"
                    actions={<GlyphAction label="Copy reading" />}
                    residentActions={<GlyphAction label="Pinned to the panel" />}
                />,
            );

            for (const testId of [
                "action-row",
                "action-row-state",
                "action-row-affordances",
                "action-row-actions",
                "action-row-resident-actions",
            ]) {
                const { style } = screen.getByTestId(testId);
                expect(style.marginLeft).toBe("");
                expect(style.marginRight).toBe("");
                expect(style.left).toBe("");
                expect(style.right).toBe("");
            }
        });

        it("holds the cluster at the trailing edge under a reversed direction too", () => {
            renderRtl(<ActionRow actions={<GlyphAction label="Copy reading" />} />);

            // One logical property does both directions: nothing here is
            // recomputed when the text runs the other way.
            expect(screen.getByTestId("action-row-affordances")).toHaveStyle({ marginInlineStart: "auto" });
        });

        it("aligns an activatable reading to the start of the text rather than to the left", () => {
            renderRtl(<ActionRow state="Mr_Whiskers" onClick={vi.fn()} />);

            // Mantine's own UnstyledButton sets `text-align: left`, which is
            // physical; the row overrides it with the logical keyword.
            expect(screen.getByTestId("action-row-state")).toHaveStyle({ textAlign: "start" });
        });
    });

    describe("accessible names", () => {
        it("keeps the word of every icon-only control as its accessible name", () => {
            renderRow(
                <ActionRow
                    state="Mr_Whiskers"
                    actions={
                        <>
                            <GlyphAction label="Recompute" />
                            <GlyphAction label="Copy reading" />
                        </>
                    }
                    residentActions={<GlyphAction label="Pinned to the panel" />}
                />,
            );

            expect(screen.getByRole("button", { name: "Recompute" })).toHaveAttribute("title", "Recompute");
            expect(screen.getByRole("button", { name: "Copy reading" })).toHaveAttribute("title", "Copy reading");
            expect(screen.getByRole("button", { name: "Pinned to the panel" })).toHaveAttribute(
                "title",
                "Pinned to the panel",
            );
        });

        it("leaves a hidden action in the accessibility tree and in the tab order", () => {
            renderRow(<ActionRow state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

            // Opacity is the only thing hiding it: `visibility`, `display` or
            // `aria-hidden` would take the accessible name and the keyboard
            // route with them, which is the failure this row type cannot have.
            const actions = screen.getByTestId("action-row-actions");
            expect(actions).not.toHaveAttribute("aria-hidden");
            expect(actions.style.visibility).toBe("");
            expect(actions).toHaveStyle({ display: "flex" });

            // getByRole returns only what assistive technology can reach.
            const action = screen.getByRole("button", { name: "Copy reading" });
            act(() => {
                action.focus();
            });

            expect(action).toHaveFocus();
        });
    });
});
