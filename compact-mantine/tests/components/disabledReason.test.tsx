import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
    CompactColorInput,
    compactTheme,
    PopoutManager,
    StyleNumberInput,
    StyleSelect,
    ToggleRow,
    ToggleWithContent,
} from "../../src";
import { LabelsProvider } from "../../src/i18n";

// What this file holds the line on, and the defect it was written for.
//
// Five controls in this library take `disabled`, and until U6 of the shell
// repair not one of them could say WHY it was off. A dimmed, silent control is
// read as a broken application rather than as a state of the reader's own data:
// the shell's "Show legend" toggle is off whenever nothing is encoded, and a
// reader who could not press it had no route at all to that sentence. spec:6641
// ("DISABLED ink, with the one reason appended to its own title after a full
// stop") fixes both halves of it, and the shell already writes exactly that
// shape by hand elsewhere -- "Export. Load data first", "Note. Select something
// first".
//
// ToggleRow was the sharper case: it hardcoded `wrapperProps = {title: label}`,
// so a call site could not append a reason even by hand. That is the house rule
// in action -- the shared component was wrong, so the shared component is fixed
// and every caller gets the fix.
//
// The table below is deliberately one table rather than five suites, because the
// whole value of the contract is that the five controls spell it IDENTICALLY. A
// per-component test would let one of them drift into a colon, or into a
// tooltip that never reaches a screen reader, without anything failing.

/**
 * Every provider the five controls need between them.
 * @param props - Component props
 * @param props.children - The control under test
 * @returns The wrapped tree
 */
function TestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return (
        <DirectionProvider initialDirection="ltr" detectDirection={false}>
            <MantineProvider theme={compactTheme}>
                <PopoutManager>{children}</PopoutManager>
            </MantineProvider>
        </DirectionProvider>
    );
}

/**
 * What the disabled-reason contract needs to know about one control to exercise
 * it.
 */
interface ReasonCase {
    /** The component's name, used only to name the test. */
    name: string;
    /** The control's own word, which the reason is appended to. */
    label: string;
    /** The sentence the caller supplies. */
    reason: string;
    /**
     * Renders the control, disabled or not.
     * @param props - Whether the control is off, and why
     * @returns The control
     */
    render: (props: { disabled?: boolean; disabledReason?: string }) => React.JSX.Element;
    /**
     * Finds the element whose accessible description must carry the reason.
     * @returns The control a screen reader lands on
     */
    described: () => HTMLElement;
    /**
     * The title the control draws while it is usable, when it draws one.
     *
     * Only the two toggles do: they repeat their word for a pointer user who
     * has no room for all of it. The other four draw no tooltip at rest, and
     * adding a reason must not sprout tooltips on every screen that uses them.
     */
    enabledTitle?: string;
}

const CASES: ReasonCase[] = [
    {
        name: "StyleSelect",
        label: "Shape",
        reason: "Load data first",
        render: (props) => (
            <StyleSelect
                label="Shape"
                defaultValue="sphere"
                options={[
                    { value: "sphere", label: "Sphere" },
                    { value: "box", label: "Box" },
                ]}
                {...props}
            />
        ),
        // The Select's input is a combobox (it opens a listbox).
        described: () => screen.getByRole("combobox", { name: "Shape" }),
    },
    {
        name: "StyleNumberInput",
        label: "Size",
        reason: "Load data first",
        render: (props) => <StyleNumberInput label="Size" defaultValue={1} {...props} />,
        // A scrubbable number field is a spinbutton (spec 6.1), not a plain textbox.
        described: () => screen.getByRole("spinbutton", { name: "Size" }),
    },
    {
        name: "CompactColorInput",
        label: "Fill",
        reason: "Load data first",
        render: (props) => <CompactColorInput label="Fill" defaultColor="#FF0000" {...props} />,
        described: () => screen.getByRole("button", { name: /swatch/i }),
    },
    {
        name: "ToggleRow",
        label: "Legend",
        reason: "Nothing is encoded yet",
        render: (props) => <ToggleRow label="Legend" {...props} />,
        described: () => screen.getByRole("checkbox", { name: "Legend" }),
        enabledTitle: "Legend",
    },
    {
        name: "ToggleWithContent",
        label: "Glow",
        reason: "Glow is not drawn yet",
        render: (props) => (
            <ToggleWithContent label="Glow" {...props}>
                <StyleNumberInput label="Strength" defaultValue={1} />
            </ToggleWithContent>
        ),
        described: () => screen.getByRole("checkbox", { name: "Glow" }),
        enabledTitle: "Glow",
    },
];

describe("disabledReason", () => {
    describe.each(CASES)("$name", (testCase: ReasonCase) => {
        it("appends its disabledReason to its title after a full stop", () => {
            render(
                <TestWrapper>{testCase.render({ disabled: true, disabledReason: testCase.reason })}</TestWrapper>,
            );

            expect(screen.getByTitle(`${testCase.label}. ${testCase.reason}`)).toBeInTheDocument();
        });

        it("puts the reason in the accessible description", () => {
            render(
                <TestWrapper>{testCase.render({ disabled: true, disabledReason: testCase.reason })}</TestWrapper>,
            );

            expect(testCase.described()).toHaveAccessibleDescription(testCase.reason);
        });

        it("draws no reason while the control is enabled", () => {
            render(<TestWrapper>{testCase.render({ disabledReason: testCase.reason })}</TestWrapper>);

            expect(screen.queryByTitle(`${testCase.label}. ${testCase.reason}`)).not.toBeInTheDocument();
            expect(screen.queryByTitle(testCase.reason)).not.toBeInTheDocument();
            expect(testCase.described()).toHaveAccessibleDescription("");
        });

        // A control that has no tooltip today must not grow one just because a
        // reason prop exists. Only the two toggles repeat their word at rest.
        it("keeps the tooltip it draws at rest", () => {
            render(<TestWrapper>{testCase.render({})}</TestWrapper>);

            if (testCase.enabledTitle === undefined) {
                expect(screen.queryByTitle(testCase.label)).not.toBeInTheDocument();
            } else {
                expect(screen.getByTitle(testCase.enabledTitle)).toBeInTheDocument();
            }
        });

        // A disabled control with nothing to say is still allowed: the reason
        // is the caller's to supply, and the library never invents one.
        it("says nothing when it is disabled without a reason", () => {
            render(<TestWrapper>{testCase.render({ disabled: true })}</TestWrapper>);

            expect(testCase.described()).toHaveAccessibleDescription("");
        });
    });

    // The wording is the contract: a full stop, one space, the sentence. It is
    // asserted once, exactly, rather than with a regular expression, because a
    // colon or a dash here would quietly stop matching the shell's own
    // hand-written "Export. Load data first".
    it("writes the reason in exactly the shape the spec fixes", () => {
        render(
            <TestWrapper>
                <ToggleRow label="Show legend (L)" disabled disabledReason="Nothing is encoded yet" />
            </TestWrapper>,
        );

        expect(screen.getByTitle("Show legend (L). Nothing is encoded yet")).toBeInTheDocument();
    });

    // A label already ending a sentence must not come back with two full stops.
    it("does not double the full stop on a name that already ends one", () => {
        render(
            <TestWrapper>
                <ToggleRow label="Snap to grid?" disabled disabledReason="Load data first" />
            </TestWrapper>,
        );

        expect(screen.getByTitle("Snap to grid? Load data first")).toBeInTheDocument();
    });
});

// A boolean channel can follow a data attribute just as a numeric one can, and
// PanelField was the only control in the library able to say so -- which is why
// a bound boolean had to be drawn as a number field or not drawn at all. These
// mirror the PanelField bound tests byte for byte in what they assert.
describe("bound toggles", () => {
    it("draws the bound marker and announces it on ToggleRow", () => {
        const { container } = render(
            <TestWrapper>
                <ToggleRow label="Labels" bound />
            </TestWrapper>,
        );

        expect(container.querySelector("[data-glyph=\"attribute\"]")).toHaveAttribute("data-filled", "true");
        expect(screen.getByTestId("toggle-row")).toHaveAttribute("data-bound", "true");
        expect(screen.getByRole("checkbox", { name: "Labels" })).toHaveAccessibleDescription(
            "Bound to a data attribute",
        );
    });

    it("draws the bound marker and announces it on ToggleWithContent", () => {
        const { container } = render(
            <TestWrapper>
                <ToggleWithContent label="Glow" bound>
                    <StyleNumberInput label="Strength" defaultValue={1} />
                </ToggleWithContent>
            </TestWrapper>,
        );

        expect(container.querySelector("[data-glyph=\"attribute\"]")).toHaveAttribute("data-filled", "true");
        expect(screen.getByTestId("toggle-with-content")).toHaveAttribute("data-bound", "true");
        expect(screen.getByRole("checkbox", { name: "Glow" })).toHaveAccessibleDescription(
            "Bound to a data attribute",
        );
    });

    it("draws no marker and says nothing when the value is set by hand", () => {
        const { container } = render(
            <TestWrapper>
                <ToggleRow label="Labels" />
            </TestWrapper>,
        );

        expect(container.querySelector("[data-glyph=\"attribute\"]")).toBeNull();
        expect(screen.getByTestId("toggle-row")).not.toHaveAttribute("data-bound");
        expect(screen.getByRole("checkbox", { name: "Labels" })).toHaveAccessibleDescription("");
    });

    it("lets the caller reword what a bound toggle announces", () => {
        render(
            <TestWrapper>
                <ToggleRow label="Labels" bound boundDescription="Follows the Degree attribute" />
            </TestWrapper>,
        );

        expect(screen.getByRole("checkbox", { name: "Labels" })).toHaveAccessibleDescription(
            "Follows the Degree attribute",
        );
    });

    it("says nothing about a bound toggle given an empty description", () => {
        render(
            <TestWrapper>
                <ToggleWithContent label="Glow" bound boundDescription="">
                    <StyleNumberInput label="Strength" defaultValue={1} />
                </ToggleWithContent>
            </TestWrapper>,
        );

        expect(screen.getByRole("checkbox", { name: "Glow" })).toHaveAccessibleDescription("");
    });

    it("takes the default bound wording from the label set", () => {
        render(
            <DirectionProvider initialDirection="ltr" detectDirection={false}>
                <MantineProvider theme={compactTheme}>
                    <LabelsProvider labels={{ fieldBound: "Suit une donnee" }}>
                        <ToggleRow label="Labels" bound />
                    </LabelsProvider>
                </MantineProvider>
            </DirectionProvider>,
        );

        expect(screen.getByRole("checkbox", { name: "Labels" })).toHaveAccessibleDescription("Suit une donnee");
    });

    // Both sentences, in one description, in the order a reader needs them:
    // what the value follows, and then why they cannot change it.
    it("announces the bound state and the disabled reason together", () => {
        render(
            <TestWrapper>
                <ToggleRow label="Labels" bound disabled disabledReason="This layer computes it" />
            </TestWrapper>,
        );

        expect(screen.getByRole("checkbox", { name: "Labels" })).toHaveAccessibleDescription(
            "Bound to a data attribute. This layer computes it",
        );
        expect(screen.getByTitle("Labels. This layer computes it")).toBeInTheDocument();
    });
});
