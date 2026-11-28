/**
 * Pill tabs and segmented options activate on mouse-down (design/figma-spec.md 5.1, 5.2), and
 * that must not change what click-only code and keyboard users see: one change per activation.
 */
import { MantineProvider, SegmentedControl, Tabs } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { SegmentedControl as CompactSegmentedControl } from "../../../src/components/SegmentedControl";
import { compactTheme } from "../../../src/theme";

// A test that fails while the button is held must not leave it held for the next one.
afterEach(async () => {
    await commands.mouseUp();
});

/**
 * Press the primary mouse button over an element and keep it held.
 * @param element - what the press lands on
 */
async function pressOn(element: Element): Promise<void> {
    await userEvent.hover(element);
    await commands.mouseDown();
}

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
    it("select on mouse-down, before the button comes up", async () => {
        const onChange = vi.fn();
        renderTabs(onChange);
        const tab = screen.getByRole("tab", { name: "Prototype" });

        await pressOn(tab);

        expect(tab).toHaveAttribute("aria-selected", "true");
        expect(onChange).toHaveBeenCalledTimes(1);
        await commands.mouseUp();
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

    it("still work for a click with no mouse-down (click-only tests, assistive technology)", async () => {
        const onChange = vi.fn();
        renderTabs(onChange);

        // Enter on a focused button is the browser's own click with no mouse-down before it.
        screen.getByRole("tab", { name: "Prototype" }).focus();
        await userEvent.keyboard("{Enter}");

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("ignore the other mouse buttons and a disabled tab", async () => {
        const onChange = vi.fn();
        renderTabs(onChange);

        await userEvent.click(screen.getByRole("tab", { name: "Prototype" }), { button: "right" });
        // force: a disabled control fails Playwright's actionability check, but a reader can still press it.
        await userEvent.click(screen.getByRole("tab", { name: "Off" }), { force: true });

        expect(onChange).not.toHaveBeenCalled();
    });

    it("forget a press that never became a click, so the next activation is not swallowed", async () => {
        const onChange = vi.fn();
        renderTabs(onChange);
        const design = screen.getByRole("tab", { name: "Design" });
        const prototype = screen.getByRole("tab", { name: "Prototype" });

        // Pressed on Prototype, dragged off it and released elsewhere: no click.
        await pressOn(prototype);
        await commands.mouseAway();
        await commands.mouseUp();
        await userEvent.click(design);
        prototype.focus();
        await userEvent.keyboard("{Enter}");

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

// A change made on mouse-down can close what holds the control and focus a field elsewhere
// (#8927). The browser's own mouse-down focus step must not then send focus to the page.
describe("an activation that moves focus keeps it", () => {
    /**
     * Shows `control` until it reports a change, then a field that takes focus as it mounts.
     * @param props - Component props
     * @param props.control - draws the control, given what to call on a change
     * @returns the control, or the field that replaced it
     */
    function ReplacedOnChange({
        control,
    }: Readonly<{ control: (onChange: () => void) => React.JSX.Element }>): React.JSX.Element {
        const [changed, setChanged] = useState(false);
        return changed ? (
            <input aria-label="Edge value" ref={(field) => field?.focus()} />
        ) : (
            control(() => {
                setChanged(true);
            })
        );
    }

    it("segmented option", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ReplacedOnChange
                    control={(onChange) => <CompactSegmentedControl data={["All", "Where"]} onChange={onChange} />}
                />
            </MantineProvider>,
        );

        await pressOn(screen.getByText("Where"));
        await commands.mouseUp();

        expect(screen.getByRole("textbox", { name: "Edge value" })).toHaveFocus();
    });

    it("pill tab", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ReplacedOnChange
                    control={(onChange) => (
                        <Tabs defaultValue="design" onChange={onChange}>
                            <Tabs.List>
                                <Tabs.Tab value="design">Design</Tabs.Tab>
                                <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                            </Tabs.List>
                        </Tabs>
                    )}
                />
            </MantineProvider>,
        );

        await pressOn(screen.getByRole("tab", { name: "Prototype" }));
        await commands.mouseUp();

        expect(screen.getByRole("textbox", { name: "Edge value" })).toHaveFocus();
    });

    it("a change that moves no focus still focuses the pressed tab", async () => {
        renderTabs(vi.fn());
        const tab = screen.getByRole("tab", { name: "Prototype" });

        await pressOn(tab);
        await commands.mouseUp();

        expect(tab).toHaveFocus();
    });

    // Focus inside the panel the change closes falls to the page with it: that is not focus the
    // change moved, so the pressed tab still takes it.
    it("a change that removes the focused control still focuses the pressed tab", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Tabs defaultValue="design" keepMounted={false}>
                    <Tabs.List>
                        <Tabs.Tab value="design">Design</Tabs.Tab>
                        <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="design">
                        <input aria-label="Width" />
                    </Tabs.Panel>
                </Tabs>
            </MantineProvider>,
        );
        screen.getByRole("textbox", { name: "Width" }).focus();
        const tab = screen.getByRole("tab", { name: "Prototype" });

        await pressOn(tab);
        await commands.mouseUp();

        expect(tab).toHaveFocus();
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

    it("select on mouse-down, and the click that follows changes nothing more", async () => {
        const onChange = vi.fn();
        renderGroup(onChange);
        const label = screen.getByText("Dynamic").closest("label") as HTMLElement;

        await pressOn(label);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("radio", { name: "Dynamic" })).toBeChecked();
        await commands.mouseUp();
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

    it("leave a group the caller gave its own onMouseDown alone", async () => {
        const onChange = vi.fn();
        const onMouseDown = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <SegmentedControl data={["A", "B"]} onChange={onChange} onMouseDown={onMouseDown} />
            </MantineProvider>,
        );

        await pressOn(screen.getByText("B"));

        expect(onMouseDown).toHaveBeenCalledTimes(1);
        expect(onChange).not.toHaveBeenCalled();
    });

    // One real click is one change whatever the caller does with the value (#2944). A caller
    // that defers or refuses the change keeps the clicked radio unchecked, so the click that
    // follows the mouse-down must not land on it as a second change.
    describe("one real click is one change", () => {
        const data = ["Auto", "Required", "Off"];

        function Controlled({ onChange, follow }: { onChange: (v: string) => void; follow: boolean }) {
            const [value, setValue] = useState("Auto");
            return (
                <CompactSegmentedControl
                    data={data}
                    value={value}
                    onChange={(v) => {
                        onChange(v);
                        if (follow) {
                            setValue(v);
                        }
                    }}
                />
            );
        }

        const setups: [string, (onChange: (v: string) => void) => React.JSX.Element][] = [
            ["controlled, value left unchanged", (onChange) => <Controlled onChange={onChange} follow={false} />],
            ["controlled, value updated in onChange", (onChange) => <Controlled onChange={onChange} follow />],
            [
                "uncontrolled",
                (onChange) => <CompactSegmentedControl data={data} defaultValue="Auto" onChange={onChange} />,
            ],
        ];

        it.each(setups)("%s", async (_name, element) => {
            const onChange = vi.fn();
            render(<MantineProvider theme={compactTheme}>{element(onChange)}</MantineProvider>);

            await userEvent.click(screen.getByText("Required"));

            expect(onChange.mock.calls).toEqual([["Required"]]);
        });

        it("controlled, value left unchanged: a second click is reported again, once", async () => {
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <Controlled onChange={onChange} follow={false} />
                </MantineProvider>,
            );

            await userEvent.click(screen.getByText("Required"));
            await userEvent.click(screen.getByText("Required"));

            expect(onChange.mock.calls).toEqual([["Required"], ["Required"]]);
        });

        it("controlled, value left unchanged: the press reports the change and the release adds nothing", async () => {
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <Controlled onChange={onChange} follow={false} />
                </MantineProvider>,
            );

            await pressOn(screen.getByText("Required"));
            expect(onChange.mock.calls).toEqual([["Required"]]);
            // The caller kept "Auto", so React put the clicked radio back to unchecked.
            expect(screen.getByRole("radio", { name: "Required" })).not.toBeChecked();
            await commands.mouseUp();

            expect(onChange.mock.calls).toEqual([["Required"]]);
        });

        it("a press dragged off its option and released is forgotten", async () => {
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <Controlled onChange={onChange} follow={false} />
                </MantineProvider>,
            );
            const required = screen.getByText("Required");

            await pressOn(required);
            await commands.mouseAway();
            await commands.mouseUp();
            screen.getByRole("radio", { name: "Required" }).focus();
            await userEvent.keyboard(" ");

            expect(onChange.mock.calls).toEqual([["Required"], ["Required"]]);
        });
    });
});
