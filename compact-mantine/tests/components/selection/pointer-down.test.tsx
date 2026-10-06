/**
 * Pill tabs and segmented options activate on mouse-down (design/figma-spec.md 5.1, 5.2), and
 * that must not change what click-only code and keyboard users see: one change per activation.
 */
import { MantineProvider, SegmentedControl, Tabs } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src/theme";

function renderTabs(onChange: (value: string | null) => void): void {
    render(
        <MantineProvider theme={compactTheme}>
            <Tabs defaultValue="design" onChange={onChange}>
                <Tabs.List>
                    <Tabs.Tab value="design">Design</Tabs.Tab>
                    <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                    <Tabs.Tab value="off" disabled>
                        Off
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs>
        </MantineProvider>,
    );
}

describe("pill tabs", () => {
    it("select on mouse-down, before the button comes up", () => {
        const onChange = vi.fn();
        renderTabs(onChange);
        const tab = screen.getByRole("tab", { name: "Prototype" });

        fireEvent.mouseDown(tab, { button: 0 });

        expect(tab).toHaveAttribute("aria-selected", "true");
        expect(onChange).toHaveBeenCalledTimes(1);
        fireEvent.click(tab);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("report a full pointer click once", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderTabs(onChange);

        await user.click(screen.getByRole("tab", { name: "Prototype" }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("prototype");
    });

    it("still work for a click with no mouse-down (click-only tests, assistive technology)", () => {
        const onChange = vi.fn();
        renderTabs(onChange);

        fireEvent.click(screen.getByRole("tab", { name: "Prototype" }));

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("ignore the other mouse buttons and a disabled tab", () => {
        const onChange = vi.fn();
        renderTabs(onChange);

        fireEvent.mouseDown(screen.getByRole("tab", { name: "Prototype" }), { button: 2 });
        fireEvent.mouseDown(screen.getByRole("tab", { name: "Off" }), { button: 0 });

        expect(onChange).not.toHaveBeenCalled();
    });

    it("forget a press that never became a click, so the next activation is not swallowed", () => {
        const onChange = vi.fn();
        renderTabs(onChange);
        const design = screen.getByRole("tab", { name: "Design" });
        const prototype = screen.getByRole("tab", { name: "Prototype" });

        fireEvent.mouseDown(prototype, { button: 0 });
        fireEvent.mouseLeave(prototype);
        fireEvent.click(design);
        fireEvent.keyDown(prototype, { key: "Enter" });
        fireEvent.click(prototype);

        expect(onChange.mock.calls.map((call) => call[0])).toEqual(["prototype", "design", "prototype"]);
    });

    it("are one Tab stop, and the arrows move focus and selection together", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderTabs(onChange);

        await user.tab();
        expect(screen.getByRole("tab", { name: "Design" })).toHaveFocus();
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Prototype" })).toHaveFocus();
        expect(onChange).toHaveBeenLastCalledWith("prototype");
        await user.tab();
        expect(document.body).toHaveFocus();
    });

    it("name each tab once: the bold-width reserve is not text and is hidden", () => {
        renderTabs(vi.fn());

        expect(screen.getByRole("tab", { name: "Design" })).toBeInTheDocument();
        expect(screen.getAllByText("Design")).toHaveLength(1);
        const reserve = screen.getByRole("tab", { name: "Design" }).querySelector(".cm-tab-reserve");
        expect(reserve).toHaveAttribute("aria-hidden", "true");
        expect(reserve).toHaveAttribute("data-text", "Design");
        expect(reserve?.textContent).toBe("");
    });
});

describe("segmented options", () => {
    function renderGroup(onChange: (value: string) => void): void {
        render(
            <MantineProvider theme={compactTheme}>
                <SegmentedControl data={["Basic", "Dynamic", "Brush"]} onChange={onChange} />
            </MantineProvider>,
        );
    }

    it("select on mouse-down, and the click that follows changes nothing more", () => {
        const onChange = vi.fn();
        renderGroup(onChange);
        const label = screen.getByText("Dynamic").closest("label") as HTMLElement;

        fireEvent.mouseDown(label, { button: 0 });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("radio", { name: "Dynamic" })).toBeChecked();
        fireEvent.click(label);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("report a full pointer click once", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGroup(onChange);

        await user.click(screen.getByText("Brush"));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("Brush");
    });

    it("move with the arrow keys as native radios do", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGroup(onChange);

        await user.tab();
        await user.keyboard("{ArrowRight}");

        expect(onChange).toHaveBeenLastCalledWith("Dynamic");
    });

    it("leave a group the caller gave its own onMouseDown alone", () => {
        const onChange = vi.fn();
        const onMouseDown = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <SegmentedControl data={["A", "B"]} onChange={onChange} onMouseDown={onMouseDown} />
            </MantineProvider>,
        );

        fireEvent.mouseDown(screen.getByText("B"), { button: 0 });

        expect(onMouseDown).toHaveBeenCalledTimes(1);
        expect(onChange).not.toHaveBeenCalled();
    });
});
