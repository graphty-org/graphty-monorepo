/**
 * The slider wrappers in a real browser: the `aria-valuetext` a caller gives each thumb through
 * `thumbProps` is what the browser's accessibility tree speaks, after mount and after the caller's
 * value changes (Mantine drops that prop from its thumbs, so the wrapper puts it on them).
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { compactTheme, RangeSlider } from "../../src";

/**
 * A range slider whose value the caller holds, spoken in its own words.
 * @param props - Component props
 * @param props.value - the range
 * @returns the harness
 */
function Harness({ value }: Readonly<{ value: [number, number] }>): React.JSX.Element {
    return (
        <MantineProvider theme={compactTheme}>
            <RangeSlider
                min={0}
                max={1}
                step={0.01}
                label={null}
                thumbFromLabel="From"
                thumbToLabel="To"
                value={value}
                thumbProps={(index) => ({ "aria-valuetext": `about ${value[index].toFixed(2)}` })}
            />
        </MantineProvider>
    );
}

/**
 * What a screen reader speaks for a slider thumb, from the accessibility tree.
 * @param name - the thumb's name
 * @returns its value text
 */
const spoken = async (name: string): Promise<string | undefined> =>
    (await commands.axNodes(name)).find((node) => node.role === "slider")?.valueText;

describe("RangeSlider's spoken value", () => {
    it("is the caller's words, never the raw number, after mount and after the value changes", async () => {
        const { rerender } = render(<Harness value={[0.0033783784601837397, 0.5]} />);
        expect(await spoken("From")).toBe("about 0.00");
        expect(await spoken("To")).toBe("about 0.50");
        rerender(<Harness value={[0.25, 0.75]} />);
        expect(await spoken("From")).toBe("about 0.25");
        expect(await spoken("To")).toBe("about 0.75");
    });
});
