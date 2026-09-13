import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../test/test-utils";
import { ACTIVITIES_REQUIRING_DATA } from "../../constants";
import { ActivityRail } from "../ActivityRail";

const RAIL_NAME = "Activity rail";

const EIGHT_LABELS = ["Data", "Explore", "Analyze", "Style", "Present", "AI", "Settings", "Help"];

function rail(): HTMLElement {
    return screen.getByRole("navigation", { name: RAIL_NAME });
}

function item(name: string): HTMLElement {
    return screen.getByRole("button", { name });
}

function mark(name: string, kind: string): HTMLElement | null {
    return item(name).querySelector<HTMLElement>(`[data-rail-mark="${kind}"]`);
}

describe("ActivityRail", () => {
    describe("rendering", () => {
        it("draws the eight rail destinations in order", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));

            expect(names).toEqual([
                "Data",
                "Explore",
                "Analyze",
                "Style",
                "Present",
                "AI",
                "Settings",
                "Help and keyboard shortcuts",
            ]);
        });

        it("prints the eight rail labels, which are floor item 6", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            for (const label of EIGHT_LABELS) {
                expect(screen.getByText(label)).toBeInTheDocument();
            }
        });

        it("uses real buttons, one per destination", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            const buttons = screen.getAllByRole("button");

            expect(buttons).toHaveLength(8);
            for (const button of buttons) {
                expect(button.tagName).toBe("BUTTON");
            }
        });

        it("hides every glyph from assistive technology", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            for (const button of screen.getAllByRole("button")) {
                const glyph = button.querySelector("svg");

                expect(glyph).not.toBeNull();
                expect(glyph).toHaveAttribute("aria-hidden", "true");
            }
        });
    });

    describe("geometry", () => {
        it("is a fixed 48 px column", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            expect(rail().getBoundingClientRect().width).toBe(48);
        });

        it("draws each item 47 x 44", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            const box = item("Data").getBoundingClientRect();

            expect(box.width).toBe(47);
            expect(box.height).toBe(44);
        });

        it("gaps the items by 2 px and pads the rail by 4 px top and bottom", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            const styles = window.getComputedStyle(rail());

            expect(styles.rowGap).toBe("2px");
            expect(styles.paddingTop).toBe("4px");
            expect(styles.paddingBottom).toBe("4px");
            expect(styles.paddingLeft).toBe("0px");
            expect(styles.paddingRight).toBe("0px");
        });

        it("draws the 16 px glyph the register reserves for rail items", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            const glyph = item("Data").querySelector("svg");

            expect(glyph?.getAttribute("width")).toBe("16");
            expect(glyph?.getAttribute("height")).toBe("16");
        });

        it("pushes Settings and Help to the bottom with a growing spacer", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            const ai = item("AI").getBoundingClientRect();
            const settings = item("Settings").getBoundingClientRect();

            expect(settings.top).toBeGreaterThan(ai.bottom);
        });
    });

    describe("the active item", () => {
        it("marks exactly one item active", () => {
            render(<ActivityRail activeActivity="explore" onActivityClick={vi.fn()} />);

            expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
            expect(item("Explore")).toHaveAttribute("aria-pressed", "true");
        });

        it("draws a 2 x 44 bar on the active item's leading edge", () => {
            render(<ActivityRail activeActivity="explore" onActivityClick={vi.fn()} />);

            const bar = mark("Explore", "active");

            expect(bar).not.toBeNull();

            const box = bar!.getBoundingClientRect();

            expect(box.width).toBe(2);
            expect(box.height).toBe(44);
        });

        it("draws no bar on an inactive item", () => {
            render(<ActivityRail activeActivity="explore" onActivityClick={vi.fn()} />);

            expect(mark("Data", "active")).toBeNull();
        });

        it("marks nothing active when no panel is open", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
        });
    });

    describe("disabled activities", () => {
        it("appends the reason to a disabled activity's name", () => {
            render(
                <ActivityRail
                    activeActivity="data"
                    disabledActivities={ACTIVITIES_REQUIRING_DATA}
                    onActivityClick={vi.fn()}
                />,
            );

            expect(item("Explore. Load data first")).toBeInTheDocument();
            expect(item("Analyze. Load data first")).toBeInTheDocument();
            expect(item("Style. Load data first")).toBeInTheDocument();
            expect(item("Present. Load data first")).toBeInTheDocument();
        });

        it("leaves Data, AI, Settings and Help enabled in the Empty state", () => {
            render(
                <ActivityRail
                    activeActivity="data"
                    disabledActivities={ACTIVITIES_REQUIRING_DATA}
                    onActivityClick={vi.fn()}
                />,
            );

            for (const name of ["Data", "AI", "Settings", "Help and keyboard shortcuts"]) {
                expect(item(name)).not.toHaveAttribute("aria-disabled");
            }
        });

        it("marks a disabled activity aria-disabled rather than removing it", () => {
            render(<ActivityRail activeActivity="data" disabledActivities={["explore"]} onActivityClick={vi.fn()} />);

            expect(item("Explore. Load data first")).toHaveAttribute("aria-disabled", "true");
        });

        it("does not report a click on a disabled activity", async () => {
            const onActivityClick = vi.fn();
            const user = userEvent.setup();

            render(
                <ActivityRail
                    activeActivity="data"
                    disabledActivities={["explore"]}
                    onActivityClick={onActivityClick}
                />,
            );

            await user.click(item("Explore. Load data first"));

            expect(onActivityClick).not.toHaveBeenCalled();
        });
    });

    describe("the Data warning dot", () => {
        it("draws an unnumbered 6 px dot when validation produced warnings", () => {
            render(<ActivityRail activeActivity={null} dataHasWarnings onActivityClick={vi.fn()} />);

            const dot = mark("Data", "warning");

            expect(dot).not.toBeNull();
            expect(dot).toBeEmptyDOMElement();

            const box = dot!.getBoundingClientRect();

            expect(box.width).toBe(6);
            expect(box.height).toBe(6);
        });

        it("gives the dot no title of its own, because the status bar chip owns the count", () => {
            render(<ActivityRail activeActivity={null} dataHasWarnings onActivityClick={vi.fn()} />);

            expect(mark("Data", "warning")).not.toHaveAttribute("title");
        });

        it("draws no dot when validation produced nothing", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            expect(mark("Data", "warning")).toBeNull();
        });

        it("draws the dot on Data alone", () => {
            render(<ActivityRail activeActivity={null} dataHasWarnings onActivityClick={vi.fn()} />);

            expect(document.querySelectorAll('[data-rail-mark="warning"]')).toHaveLength(1);
        });
    });

    describe("the Present badge", () => {
        it("prints the sum and carries the breakdown in its title", () => {
            render(
                <ActivityRail
                    activeActivity={null}
                    presentBadge={{ count: 7, title: "4 pinned items, 3 open notes" }}
                    onActivityClick={vi.fn()}
                />,
            );

            const badge = mark("Present", "badge");

            expect(badge).toHaveTextContent("7");
            expect(badge).toHaveAttribute("title", "4 pinned items, 3 open notes");
        });

        it("draws no badge when the sum is zero", () => {
            render(
                <ActivityRail
                    activeActivity={null}
                    presentBadge={{ count: 0, title: "0 pinned items, 0 open notes" }}
                    onActivityClick={vi.fn()}
                />,
            );

            expect(mark("Present", "badge")).toBeNull();
        });

        it("draws no badge when there is none", () => {
            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            expect(document.querySelectorAll('[data-rail-mark="badge"]')).toHaveLength(0);
        });

        it("keeps the badge off every other rail item", () => {
            render(
                <ActivityRail
                    activeActivity={null}
                    presentBadge={{ count: 7, title: "4 pinned items, 3 open notes" }}
                    onActivityClick={vi.fn()}
                />,
            );

            expect(document.querySelectorAll('[data-rail-mark="badge"]')).toHaveLength(1);
        });
    });

    describe("clicks", () => {
        it("reports the clicked activity", async () => {
            const onActivityClick = vi.fn();
            const user = userEvent.setup();

            render(<ActivityRail activeActivity={null} onActivityClick={onActivityClick} />);

            await user.click(item("Analyze"));

            expect(onActivityClick).toHaveBeenCalledWith("analyze");
        });

        it("reports a click on the already-active item, because the store closes the panel", async () => {
            const onActivityClick = vi.fn();
            const user = userEvent.setup();

            render(<ActivityRail activeActivity="explore" onActivityClick={onActivityClick} />);

            await user.click(item("Explore"));

            expect(onActivityClick).toHaveBeenCalledWith("explore");
        });

        it("reports the two pinned destinations by their own ids", async () => {
            const onActivityClick = vi.fn();
            const user = userEvent.setup();

            render(<ActivityRail activeActivity={null} onActivityClick={onActivityClick} />);

            await user.click(item("Settings"));
            await user.click(item("Help and keyboard shortcuts"));

            expect(onActivityClick).toHaveBeenNthCalledWith(1, "settings");
            expect(onActivityClick).toHaveBeenNthCalledWith(2, "help");
        });
    });

    describe("tooltips", () => {
        it("opens the register's Help tooltip, key chip and all", async () => {
            const user = userEvent.setup();

            render(<ActivityRail activeActivity={null} onActivityClick={vi.fn()} />);

            await user.hover(item("Help and keyboard shortcuts"));

            expect(await screen.findByText("Help and keyboard shortcuts (?)")).toBeInTheDocument();
        });

        it("opens a disabled activity's reason on hover", async () => {
            const user = userEvent.setup();

            render(<ActivityRail activeActivity="data" disabledActivities={["explore"]} onActivityClick={vi.fn()} />);

            await user.hover(item("Explore. Load data first"));

            expect(await screen.findByText("Explore. Load data first")).toBeInTheDocument();
        });
    });
});
