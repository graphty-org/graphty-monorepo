/**
 * The rendered height of every multi-value and native input follows its size prop.
 *
 * MultiSelect, TagsInput and PillsInput used to pin their field at a static
 * 24px min-height whatever size they were given, and NativeSelect and
 * ColorInput had no compact extension here at all (the graphty app styled
 * them itself, at one frozen size). Each is measured at every size token:
 * the height must rise from xs to md to xl, and the default must be the
 * compact 24px.
 */
import {
    ColorInput,
    MantineProvider,
    type MantineSize,
    MultiSelect,
    NativeSelect,
    PillsInput,
    TagsInput,
} from "@mantine/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

type Sized = (size: MantineSize | undefined) => React.ReactElement;

const components: [string, Sized][] = [
    ["MultiSelect", (size) => <MultiSelect size={size} label="Field" data={["A", "B"]} />],
    ["TagsInput", (size) => <TagsInput size={size} label="Field" />],
    [
        "PillsInput",
        (size) => (
            <PillsInput size={size} label="Field">
                <PillsInput.Field />
            </PillsInput>
        ),
    ],
    ["NativeSelect", (size) => <NativeSelect size={size} label="Field" data={["A", "B"]} />],
    ["ColorInput", (size) => <ColorInput size={size} label="Field" />],
];

/**
 * Render one component and measure its field box.
 * @param name - the Mantine component name, which prefixes its static class
 * @param ui - the element to render
 * @returns the rendered height of the component's input box, in px
 */
function measure(name: string, ui: React.ReactElement): number {
    const { container } = render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
    const input = container.querySelector(`.mantine-${name}-input`);
    expect(input).not.toBeNull();
    const height = input?.getBoundingClientRect().height ?? 0;
    cleanup();
    return height;
}

describe("multi-value and native inputs follow the size scale (Browser)", () => {
    afterEach(() => {
        cleanup();
    });

    for (const [name, sized] of components) {
        it(`${name} renders 24px at the default size`, () => {
            expect(measure(name, sized(undefined))).toBe(24);
        });

        it(`${name} grows from xs to md to xl`, () => {
            const xs = measure(name, sized("xs"));
            const md = measure(name, sized("md"));
            const xl = measure(name, sized("xl"));
            expect(xs).toBe(20);
            expect(md).toBe(30);
            expect(xl).toBe(44);
        });
    }

    it("a field holding a pill keeps its size's height", () => {
        for (const [size, px] of [["xs", 20], [undefined, 24], ["xl", 44]] as const) {
            expect(measure("MultiSelect", <MultiSelect size={size} label="Field" data={["A", "B"]} value={["A"]} />)).toBe(px);
            expect(measure("TagsInput", <TagsInput size={size} label="Field" value={["A"]} />)).toBe(px);
        }
    });
});
