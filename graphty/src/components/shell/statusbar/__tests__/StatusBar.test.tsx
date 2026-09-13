import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { STATUS_BAR_SLOT_ORDER } from "../../constants";
import { LAYOUT_MENU_LABEL } from "../LayoutChipMenu";
import { StatusBar } from "../StatusBar";
import type { StatusBarRegionProps } from "../statusBarModel";

function getBar(container: HTMLElement): HTMLElement {
    const spacer = container.querySelector("[data-status-spacer]");

    if (spacer === null || spacer.parentElement === null) {
        throw new Error("the status bar did not render its spacer");
    }

    return spacer.parentElement;
}

function slotOrder(bar: HTMLElement): (string | null)[] {
    return Array.from(bar.querySelectorAll("[data-status-slot]")).map((slot) => slot.getAttribute("data-status-slot"));
}

const counts = {
    nodes: "20 nodes",
    edges: "29 edges",
    title: "20 nodes. 29 edges",
    onClick: vi.fn(),
};

const layout = {
    label: "Force directed - settled",
    title: "Force directed (ngraph) - settled",
    caret: true,
    onRerun: vi.fn(),
    onStop: vi.fn(),
    onOpenSettings: vi.fn(),
    picks: [],
};

const WIDE_SHELL = 1440;

function renderBar(props: Partial<StatusBarRegionProps> = {}) {
    const { slots, ...rest } = props;

    // The bar takes its width from its parent, and the overflow rule of section 4.3
    // is measured: on a viewport narrower than the bar's content it correctly drops
    // slots. These boards are about what the bar draws with room for everything, so
    // they are given a desktop-width host.
    return render(
        <div style={{ width: WIDE_SHELL }}>
            <StatusBar slots={slots ?? { counts }} {...rest} />
        </div>,
    );
}

describe("StatusBar", () => {
    describe("geometry", () => {
        it("stands 24 px tall with 12 px padding and a 12 px slot gap", () => {
            const { container } = renderBar();
            const style = getComputedStyle(getBar(container));

            expect(style.height).toBe("24px");
            expect(style.paddingLeft).toBe("12px");
            expect(style.paddingRight).toBe("12px");
            expect(style.columnGap).toBe("12px");
        });

        it("sets its type at 11 px", () => {
            const { container } = renderBar();

            expect(getComputedStyle(getBar(container)).fontSize).toBe("11px");
        });

        it("draws a 1 px top border", () => {
            const { container } = renderBar();

            expect(getComputedStyle(getBar(container)).borderTopWidth).toBe("1px");
        });

        it("draws the chip atom 16 px tall at radius 8 and 10 px / 500", () => {
            renderBar({ slots: { counts, layout } });

            const body = screen.getByRole("button", { name: "Force directed - settled" });
            const chip = body.parentElement;

            if (chip === null) {
                throw new Error("the layout chip did not render");
            }

            const style = getComputedStyle(chip);

            expect(style.height).toBe("16px");
            expect(style.borderRadius).toBe("8px");
            expect(style.fontSize).toBe("10px");
            expect(style.fontWeight).toBe("500");
        });

        it("gives the caret half a 24 px hit area without growing the chip", () => {
            renderBar({ slots: { counts, layout } });

            const caret = screen.getByRole("button", { name: LAYOUT_MENU_LABEL });
            const box = caret.getBoundingClientRect();

            expect(box.width).toBe(24);
            expect(box.height).toBe(24);

            const body = screen.getByRole("button", { name: "Force directed - settled" });

            expect(body.parentElement?.getBoundingClientRect().height).toBe(16);
        });

        it("rules 1 x 12 between counts and zoom", () => {
            const { container } = renderBar({ slots: { counts, zoom: { label: "Zoom 100%", onClick: vi.fn() } } });
            const bar = getBar(container);
            const zoom = bar.querySelector('[data-status-slot="zoom"]');
            const rule = zoom?.previousElementSibling;

            if (!(rule instanceof HTMLElement)) {
                throw new Error("no rule was drawn before the zoom slot");
            }

            const style = getComputedStyle(rule);

            expect(style.width).toBe("1px");
            expect(style.height).toBe("12px");
        });
    });

    describe("the slot table", () => {
        it("does not render a slot the session has not filled", () => {
            renderBar();

            expect(screen.queryByRole("button", { name: "Zoom 100%" })).toBeNull();
            expect(screen.queryByRole("button", { name: LAYOUT_MENU_LABEL })).toBeNull();
        });

        it("draws the slots it has in STATUS_BAR_SLOT_ORDER", () => {
            const { container } = renderBar({
                slots: {
                    ai: { label: "AI: Anthropic ready", state: "ready" },
                    counts,
                    issues: { notes: { label: "5 notes", onClick: vi.fn() } },
                    layout,
                    running: { label: "Computing Bridges (betweenness)... 42%", cancellable: true, percentLabel: "42%" },
                    selection: { label: "1 selected" },
                    viewing: { label: "Viewing: 2026-01-05 to 2026-02-04" },
                    xr: { mode: "VR", onExit: vi.fn() },
                    zoom: { label: "Zoom 100%", onClick: vi.fn() },
                },
            });

            expect(slotOrder(getBar(container))).toEqual([...STATUS_BAR_SLOT_ORDER]);
        });

        it("puts the spacer between the issues slot and the AI slot", () => {
            const { container } = renderBar({
                slots: {
                    ai: { label: "AI: Anthropic ready", state: "ready" },
                    counts,
                    issues: { notes: { label: "5 notes", onClick: vi.fn() } },
                },
            });
            const ai = getBar(container).querySelector('[data-status-slot="ai"]');

            expect(ai?.previousElementSibling).toHaveAttribute("data-status-spacer", "true");
        });
    });

    describe("slot 1, counts", () => {
        it("draws the two spans and opens the data table drawer", () => {
            const onClick = vi.fn();

            renderBar({ slots: { counts: { ...counts, onClick } } });
            fireEvent.click(screen.getByRole("button", { name: /20 nodes/ }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("keeps the exact values in its tooltip", () => {
            renderBar();

            expect(screen.getByRole("button", { name: /20 nodes/ })).toHaveAttribute("title", "20 nodes. 29 edges");
        });

        it("carries the sample line in the subset state", () => {
            renderBar({ slots: { counts: { ...counts, sample: "Sample: 50,000 of 1,000,000" } } });

            expect(screen.getByText("Sample: 50,000 of 1,000,000")).toBeInTheDocument();
        });
    });

    describe("slot 2, zoom", () => {
        it("opens the zoom menu", () => {
            const onClick = vi.fn();

            renderBar({ slots: { counts, zoom: { label: "Zoom 100%", onClick } } });

            const zoom = screen.getByRole("button", { name: "Zoom 100%" });

            expect(zoom).toHaveAttribute("aria-haspopup", "menu");
            fireEvent.click(zoom);
            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("slot 3, the XR mode chip", () => {
        it("renders only while a session is running, and ends it", () => {
            const onExit = vi.fn();

            renderBar({ slots: { counts, xr: { mode: "VR", onExit } } });
            expect(screen.getByText("VR")).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Exit" }));
            expect(onExit).toHaveBeenCalledTimes(1);
        });

        it("is absent when no session is running", () => {
            renderBar();

            expect(screen.queryByRole("button", { name: "Exit" })).toBeNull();
        });
    });

    describe("slot 4, the layout chip", () => {
        it("draws the state without a Layout: label", () => {
            const { container } = renderBar({ slots: { counts, layout } });

            expect(screen.getByRole("button", { name: "Force directed - settled" })).toBeInTheDocument();
            expect(getBar(container).textContent).not.toContain("Layout:");
        });

        it("keeps the technical name in the chip's own tooltip and nowhere else in the bar", () => {
            const { container } = renderBar({ slots: { counts, layout } });

            expect(screen.getByRole("button", { name: "Force directed - settled" })).toHaveAttribute(
                "title",
                "Force directed (ngraph) - settled",
            );
            expect(getBar(container).textContent).not.toContain("ngraph");
        });

        it("re-runs the layout when the chip body is clicked", () => {
            const onRerun = vi.fn();

            renderBar({ slots: { counts, layout: { ...layout, onRerun } } });
            fireEvent.click(screen.getByRole("button", { name: "Force directed - settled" }));

            expect(onRerun).toHaveBeenCalledTimes(1);
        });

        it("opens the layout menu from the caret half", async () => {
            renderBar({ slots: { counts, layout } });
            fireEvent.click(screen.getByRole("button", { name: LAYOUT_MENU_LABEL }));

            expect(await screen.findByRole("menuitem", { name: "Layout settings..." })).toBeInTheDocument();
        });

        it("draws no caret when the model asks for none", () => {
            renderBar({ slots: { counts, layout: { ...layout, caret: false } } });

            expect(screen.queryByRole("button", { name: LAYOUT_MENU_LABEL })).toBeNull();
        });
    });

    describe("slot 5, algorithm progress", () => {
        it("draws the progress, Cancel and the queue suffix", () => {
            const onCancel = vi.fn();

            renderBar({
                slots: {
                    counts,
                    running: {
                        label: "Computing Bridges (betweenness)... 42%",
                        percentLabel: "42%",
                        queued: "and 2 queued",
                        cancellable: true,
                        onCancel,
                    },
                },
            });

            expect(screen.getByText("Computing Bridges (betweenness)... 42%")).toBeInTheDocument();
            expect(screen.getByText("and 2 queued")).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        it("shows elapsed time and no percentage until the run reports progress", () => {
            renderBar({
                slots: {
                    counts,
                    running: { label: "Computing Bridges (betweenness)...", elapsed: "1.8 s", cancellable: true },
                },
            });

            expect(screen.getByText("1.8 s")).toBeInTheDocument();
            expect(screen.queryByText(/%/)).toBeNull();
        });

        it("disables Cancel with its reason while the run reports no progress", () => {
            const onCancel = vi.fn();

            renderBar({
                slots: {
                    counts,
                    running: { label: "Computing Bridges (betweenness)...", cancellable: true, onCancel },
                },
            });

            const cancel = screen.getByRole("button", { name: "Cancel" });

            expect(cancel).toHaveAttribute("aria-disabled", "true");
            expect(cancel).toHaveAttribute("title", "Cannot cancel this run");

            fireEvent.click(cancel);
            expect(onCancel).not.toHaveBeenCalled();
        });

        it("compacts to the percentage alone while the running card is in view", () => {
            renderBar({
                slots: {
                    counts,
                    running: {
                        label: "Computing Bridges (betweenness)... 42%",
                        percentLabel: "42%",
                        cancellable: true,
                        compact: true,
                    },
                },
            });

            expect(screen.getByText("42%")).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
        });
    });

    describe("slot 6, Viewing", () => {
        it("reads out the time window", () => {
            renderBar({ slots: { counts, viewing: { label: "Viewing: 2026-01-05 to 2026-02-04" } } });

            expect(screen.getByText("Viewing: 2026-01-05 to 2026-02-04")).toBeInTheDocument();
        });
    });

    describe("slot 7, the issues slot", () => {
        it("names kinds first and counts the instances in parentheses", () => {
            const onClick = vi.fn();

            renderBar({
                slots: {
                    counts,
                    issues: {
                        validation: { label: "4 issue types (27)", title: "4 issue types, 27 issues", onClick },
                    },
                },
            });

            const chip = screen.getByRole("button", { name: "4 issue types (27)" });

            expect(chip).toHaveAttribute("title", "4 issue types, 27 issues");
            fireEvent.click(chip);
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("opens Explore at its Notes section from the notes chip", () => {
            const onClick = vi.fn();

            renderBar({ slots: { counts, issues: { notes: { label: "5 notes", onClick } } } });
            fireEvent.click(screen.getByRole("button", { name: "5 notes" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("hides the notes chip while Explore is open with Notes expanded", () => {
            renderBar({
                exploreNotesExpanded: true,
                slots: { counts, issues: { notes: { label: "5 notes", onClick: vi.fn() } } },
            });

            expect(screen.queryByRole("button", { name: "5 notes" })).toBeNull();
        });

        it("names the label cap only and keeps the rule list in its tooltip", () => {
            const title =
                "Performance mode: 20 labels, hover and tooltips off, edges capped at 500k, uniform node size. On above about 18,000 nodes, measured on this machine. Settings > Performance";
            const onClick = vi.fn();

            renderBar({
                slots: {
                    counts,
                    issues: { performance: { label: "Performance mode: labels 20", title, onClick } },
                },
            });

            const chip = screen.getByRole("button", { name: "Performance mode: labels 20" });

            expect(chip).toHaveAttribute("title", title);
            fireEvent.click(chip);
            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("slots 8 and 9, AI status and the selection count", () => {
        it("draws the AI status only when the model carries one", () => {
            renderBar({ slots: { ai: { label: "AI: Anthropic ready", state: "ready" }, counts } });

            expect(screen.getByText("AI: Anthropic ready")).toBeInTheDocument();
        });

        it("draws the selection count only when the selection is non-zero", () => {
            renderBar({ slots: { counts, selection: { label: "7 nodes, 4 edges selected" } } });

            expect(screen.getByText("7 nodes, 4 edges selected")).toBeInTheDocument();
        });
    });

    describe("the overflow rule", () => {
        it("drops AI status first", () => {
            renderBar({
                droppedSlots: ["ai"],
                slots: { ai: { label: "AI: Anthropic ready", state: "ready" }, counts },
            });

            expect(screen.queryByText("AI: Anthropic ready")).toBeNull();
        });

        it("drops the layout NAME but keeps the chip and its caret", () => {
            renderBar({ droppedSlots: ["ai", "layout"], slots: { counts, layout } });

            expect(screen.queryByText("Force directed - settled")).toBeNull();
            expect(screen.getByRole("button", { name: LAYOUT_MENU_LABEL })).toBeInTheDocument();
        });

        it("drops zoom and Viewing", () => {
            renderBar({
                droppedSlots: ["ai", "layout", "zoom", "viewing"],
                slots: {
                    counts,
                    viewing: { label: "Viewing: 2026-01-05 to 2026-02-04" },
                    zoom: { label: "Zoom 100%", onClick: vi.fn() },
                },
            });

            expect(screen.queryByRole("button", { name: "Zoom 100%" })).toBeNull();
            expect(screen.queryByText("Viewing: 2026-01-05 to 2026-02-04")).toBeNull();
        });

        it("never drops counts, the running slot or the issues chip, whatever it is told", () => {
            renderBar({
                droppedSlots: ["counts", "running", "issues"],
                slots: {
                    counts,
                    issues: { performance: { label: "Performance mode: labels 20", title: "rules", onClick: vi.fn() } },
                    running: { label: "Applying filter... 40%", percentLabel: "40%", cancellable: true },
                },
            });

            expect(screen.getByRole("button", { name: /20 nodes/ })).toBeInTheDocument();
            expect(screen.getByText("Applying filter... 40%")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Performance mode: labels 20" })).toBeInTheDocument();
        });
    });

    describe("the three loading phases", () => {
        it("takes over the layout slot and draws no caret", () => {
            renderBar({
                loading: { label: "Parsing...", cancellable: true },
                slots: { counts, layout },
            });

            expect(screen.getByText("Parsing...")).toBeInTheDocument();
            expect(screen.queryByText("Force directed - settled")).toBeNull();
            expect(screen.queryByRole("button", { name: LAYOUT_MENU_LABEL })).toBeNull();
        });

        it("draws Cancel in the reading phase", () => {
            const onCancel = vi.fn();

            renderBar({
                loading: { label: "Reading fraud.csv, 48 MB of 210 MB", progress: 0.23, cancellable: true, onCancel },
                slots: { counts },
            });

            fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        it("draws the building phase with its progress bar", () => {
            renderBar({
                loading: {
                    label: "Building graph: 48,000 of about 120,000 nodes (40%), about 12 s left",
                    progress: 0.4,
                    cancellable: true,
                    onCancel: vi.fn(),
                },
                slots: { counts },
            });

            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
        });

        it("disables Cancel with its reason where it cannot act", () => {
            renderBar({
                loading: { label: "Parsing...", cancellable: false },
                slots: { counts },
            });

            const cancel = screen.getByRole("button", { name: "Cancel" });

            expect(cancel).toHaveAttribute("aria-disabled", "true");
            expect(cancel).toHaveAttribute("title", "Cannot cancel this load");
        });
    });

    describe("the completion toast", () => {
        it("reports the load and offers Details", () => {
            const onDetails = vi.fn();

            renderBar({
                completion: { message: "Loaded 51,000 nodes and 212,000 edges in 34 s.", onDetails },
                slots: { counts },
            });

            expect(screen.getByText("Loaded 51,000 nodes and 212,000 edges in 34 s.")).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Details" }));
            expect(onDetails).toHaveBeenCalledTimes(1);
        });

        it("is absent until a load finishes", () => {
            renderBar();

            expect(screen.queryByRole("button", { name: "Details" })).toBeNull();
        });
    });
});
