import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../../../../test/test-utils";
import { CANVAS_TOOLBAR_DESKTOP } from "../../constants";
import { ViewsMenu,type ViewsMenuProps } from "../ViewsMenu";

function props(overrides: Partial<ViewsMenuProps> = {}): ViewsMenuProps {
    return {
        opened: true,
        onOpenChange: vi.fn(),
        profile: CANVAS_TOOLBAR_DESKTOP,
        minimapShown: true,
        legendShown: true,
        toolbarShown: true,
        vrSupported: false,
        arSupported: false,
        visibleNodeCount: 20,
        onResetView: vi.fn(),
        onViewPreset: vi.fn(),
        onToggleMinimap: vi.fn(),
        onToggleToolbar: vi.fn(),
        onToggleLegend: vi.fn(),
        onEnterVr: vi.fn(),
        onEnterAr: vi.fn(),
        ...overrides,
    };
}

async function menu(): Promise<HTMLElement> {
    return screen.findByRole("menu", { name: "Views" });
}

async function rowNames(): Promise<string[]> {
    const dropdown = await menu();

    return [...dropdown.querySelectorAll<HTMLElement>("[data-menu-item]")].map((row) => row.textContent ?? "");
}

async function row(label: string): Promise<HTMLElement> {
    const dropdown = await menu();
    const found = [...dropdown.querySelectorAll<HTMLElement>("[data-menu-item]")].find((candidate) =>
        (candidate.textContent ?? "").startsWith(label),
    );

    if (found === undefined) {
        throw new Error(`no menu row starting with "${label}"`);
    }

    return found;
}

describe("ViewsMenu", () => {
    describe("the trigger", () => {
        it("names itself Views and says it opens a menu", () => {
            render(<ViewsMenu {...props({ opened: false })} />);

            const trigger = screen.getByRole("button", { name: "Views" });

            expect(trigger).toHaveAttribute("aria-haspopup", "menu");
            expect(trigger).toHaveAttribute("aria-expanded", "false");
            expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        });

        it("reports itself expanded while the menu is open", async () => {
            render(<ViewsMenu {...props()} />);

            expect(screen.getByRole("button", { name: "Views" })).toHaveAttribute("aria-expanded", "true");
            expect(await menu()).toBeInTheDocument();
        });

        it("is 36 x 28 on the desktop profile", () => {
            render(<ViewsMenu {...props({ opened: false })} />);

            const rect = screen.getByRole("button", { name: "Views" }).getBoundingClientRect();

            expect(Math.round(rect.width)).toBe(CANVAS_TOOLBAR_DESKTOP.viewsButtonWidth);
            expect(Math.round(rect.height)).toBe(CANVAS_TOOLBAR_DESKTOP.itemSize);
        });
    });

    describe("the rows", () => {
        it("draws 5.6's rows in order", async () => {
            render(<ViewsMenu {...props({ vrSupported: true, arSupported: true })} />);

            const names = await rowNames();

            expect(names).toHaveLength(12);
            expect(names[0]).toMatch(/^Reset view/);
            expect(names[1]).toMatch(/^Top/);
            expect(names[2]).toMatch(/^Front/);
            expect(names[3]).toMatch(/^Side/);
            expect(names[4]).toMatch(/^Isometric/);
            expect(names[5]).toMatch(/^Follow selection/);
            expect(names[6]).toMatch(/^Save as view\.\.\./);
            expect(names[7]).toMatch(/^Minimap/);
            expect(names[8]).toMatch(/^Toolbar/);
            expect(names[9]).toMatch(/^Legend/);
            expect(names[10]).toMatch(/^Enter VR/);
            expect(names[11]).toMatch(/^Enter AR/);
        });

        it("separates the four groups", async () => {
            render(<ViewsMenu {...props({ vrSupported: true, arSupported: true })} />);

            expect(within(await menu()).getAllByRole("separator")).toHaveLength(3);
        });

        it("prints each shipped row's binding and leaves the Toolbar row without one", async () => {
            render(<ViewsMenu {...props()} />);

            expect((await row("Reset view")).getAttribute("aria-keyshortcuts")).toBe("Shift+0");
            expect((await row("Top")).getAttribute("aria-keyshortcuts")).toBe("7");
            expect((await row("Front")).getAttribute("aria-keyshortcuts")).toBe("1");
            expect((await row("Side")).getAttribute("aria-keyshortcuts")).toBe("3");
            expect((await row("Minimap")).getAttribute("aria-keyshortcuts")).toBe("M");
            expect((await row("Legend")).getAttribute("aria-keyshortcuts")).toBe("L");
            expect((await row("Toolbar")).getAttribute("aria-keyshortcuts")).toBeNull();
        });

        it("draws each shipped row's chip beside its name", async () => {
            render(<ViewsMenu {...props()} />);

            expect((await row("Reset view")).textContent).toBe("Reset viewShift+0");
            expect((await row("Toolbar")).textContent).toBe("Toolbar");
        });

        it("tags the three unshipped rows and gives them no binding", async () => {
            render(<ViewsMenu {...props()} />);

            for (const label of ["Isometric", "Follow selection", "Save as view..."]) {
                const unshipped = await row(label);

                expect(unshipped.textContent).toContain("Coming");
                expect(unshipped).toHaveAttribute("aria-disabled", "true");
                expect(unshipped).not.toHaveAttribute("aria-keyshortcuts");
            }
        });
    });

    describe("the Show group", () => {
        it("draws the three visibility rows as checkable menu items", async () => {
            render(<ViewsMenu {...props({ minimapShown: true, legendShown: false })} />);

            const dropdown = await menu();

            expect(within(dropdown).getByRole("menuitemcheckbox", { name: "Minimap" })).toHaveAttribute(
                "aria-checked",
                "true",
            );
            expect(within(dropdown).getByRole("menuitemcheckbox", { name: "Toolbar" })).toHaveAttribute(
                "aria-checked",
                "true",
            );
            expect(within(dropdown).getByRole("menuitemcheckbox", { name: "Legend" })).toHaveAttribute(
                "aria-checked",
                "false",
            );
        });

        it("keeps the menu open when the minimap is toggled", async () => {
            const user = userEvent.setup();
            const onToggleMinimap = vi.fn();
            const onOpenChange = vi.fn();

            render(<ViewsMenu {...props({ onToggleMinimap, onOpenChange })} />);

            await user.click(within(await menu()).getByRole("menuitemcheckbox", { name: "Minimap" }));

            expect(onToggleMinimap).toHaveBeenCalledTimes(1);
            expect(onOpenChange).not.toHaveBeenCalled();
        });

        it("closes itself when the toolbar is hidden, because the bar takes this menu with it", async () => {
            const user = userEvent.setup();
            const onToggleToolbar = vi.fn();
            const onOpenChange = vi.fn();

            render(<ViewsMenu {...props({ onToggleToolbar, onOpenChange })} />);

            await user.click(within(await menu()).getByRole("menuitemcheckbox", { name: "Toolbar" }));

            expect(onToggleToolbar).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe("the view presets", () => {
        it("asks for each preset by name", async () => {
            const user = userEvent.setup();
            const onViewPreset = vi.fn();
            const onResetView = vi.fn();

            render(<ViewsMenu {...props({ onViewPreset, onResetView })} />);

            const dropdown = await menu();

            await user.click(within(dropdown).getByRole("menuitem", { name: "Top" }));

            expect(onViewPreset).toHaveBeenCalledWith("top");

            await user.click(within(await menu()).getByRole("menuitem", { name: "Reset view" }));

            expect(onResetView).toHaveBeenCalledTimes(1);
        });

        it("does nothing when an unshipped row is clicked", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();

            render(<ViewsMenu {...props({ onOpenChange })} />);

            await user.click(await row("Isometric"));

            expect(onOpenChange).not.toHaveBeenCalled();
        });
    });

    describe("the XR rows", () => {
        it("omits both rows when the browser reports no session support", async () => {
            render(<ViewsMenu {...props()} />);

            const names = await rowNames();

            expect(names.some((name) => name.startsWith("Enter VR"))).toBe(false);
            expect(names.some((name) => name.startsWith("Enter AR"))).toBe(false);
        });

        it("carries the readiness count on Enter VR and none on Enter AR", async () => {
            render(<ViewsMenu {...props({ vrSupported: true, arSupported: true })} />);

            expect((await row("Enter VR")).textContent).toContain("20 visible nodes");
            expect((await row("Enter AR")).textContent).toBe("Enter AR");
        });

        it("offers the visible subset between the ceiling and 50,000 nodes", async () => {
            render(<ViewsMenu {...props({ vrSupported: true, visibleNodeCount: 20000 })} />);

            const vrRow = await row("Enter VR");

            expect(vrRow.textContent).toContain("Enter VR (visible subset)");
            expect(vrRow.textContent).toContain("Visible subset only");
            expect(vrRow).toHaveAttribute("aria-disabled", "false");
        });

        it("disables entry above 50,000 visible nodes with the reason on the row", async () => {
            const user = userEvent.setup();
            const onEnterVr = vi.fn();

            render(<ViewsMenu {...props({ vrSupported: true, visibleNodeCount: 60000, onEnterVr })} />);

            const vrRow = await row("Enter VR");

            expect(vrRow).toHaveAttribute("aria-disabled", "true");
            expect(vrRow.textContent).toContain("Too many to enter VR");

            await user.click(vrRow);

            expect(onEnterVr).not.toHaveBeenCalled();
        });

        it("opens the flat entry sheet rather than the session", async () => {
            const user = userEvent.setup();
            const onEnterVr = vi.fn();

            render(<ViewsMenu {...props({ vrSupported: true, onEnterVr })} />);

            await user.click(await row("Enter VR"));

            expect(onEnterVr).toHaveBeenCalledTimes(1);
        });
    });
});
