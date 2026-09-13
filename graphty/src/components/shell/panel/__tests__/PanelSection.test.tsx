import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { ACTIVITY_PANEL_WIDTH_DEFAULT } from "../../constants";
import { ShellProvider } from "../../ShellContext";
import { ActivityPanel } from "../ActivityPanel";
import { COMING_LABEL, ComingTag, PanelSection, SectionAddButton } from "../PanelSection";

function renderInShell(ui: React.ReactNode) {
    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            {ui}
        </ShellProvider>,
    );
}

function renderInPanel(ui: React.ReactNode) {
    return renderInShell(
        <ActivityPanel
            activity="explore"
            width={ACTIVITY_PANEL_WIDTH_DEFAULT}
            presentation="docked"
            title="Explore"
            onClose={vi.fn()}
        >
            {ui}
        </ActivityPanel>,
    );
}

describe("PanelSection", () => {
    describe("resting state", () => {
        it("defaults to closed", () => {
            renderInShell(
                <PanelSection sectionId="test.closed" label="Filters">
                    <div>row</div>
                </PanelSection>,
            );

            expect(screen.getByRole("button", { name: "Expand Filters" })).toHaveAttribute("aria-expanded", "false");
        });

        it("opens by default when the section asks to", () => {
            renderInShell(
                <PanelSection sectionId="test.open" label="Open file" defaultOpen>
                    <div>row</div>
                </PanelSection>,
            );

            expect(screen.getByRole("button", { name: "Collapse Open file" })).toHaveAttribute(
                "aria-expanded",
                "true",
            );
        });

        it("expands in place from its own header", () => {
            renderInShell(
                <PanelSection sectionId="test.inplace" label="Filters">
                    <div>a row</div>
                </PanelSection>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Expand Filters" }));

            expect(screen.getByRole("button", { name: "Collapse Filters" })).toHaveAttribute("aria-expanded", "true");
        });
    });

    describe("the empty form", () => {
        it("draws one row with no chevron and no content", () => {
            renderInShell(<PanelSection sectionId="test.empty" label="Sets" empty />);

            expect(screen.queryByRole("button", { name: "Expand Sets" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Collapse Sets" })).not.toBeInTheDocument();
        });

        it("draws no zero and no empty-state sentence", () => {
            renderInShell(<PanelSection sectionId="test.empty2" label="Views" empty />);

            expect(screen.queryByText("0")).not.toBeInTheDocument();
            expect(screen.getByTestId("control-section-name")).toHaveTextContent("Views");
        });

        it("renders none of its children", () => {
            renderInShell(
                <PanelSection sectionId="test.empty3" label="Notes" empty>
                    <div>should not be drawn</div>
                </PanelSection>,
            );

            expect(screen.queryByText("should not be drawn")).not.toBeInTheDocument();
        });
    });

    describe("the alt-click sibling rule", () => {
        it("applies one header's toggle to every sibling of the panel", () => {
            renderInPanel(
                <>
                    <PanelSection sectionId="explore.a" label="Alpha">
                        <div>a</div>
                    </PanelSection>
                    <PanelSection sectionId="explore.b" label="Beta">
                        <div>b</div>
                    </PanelSection>
                    <PanelSection sectionId="explore.c" label="Gamma">
                        <div>c</div>
                    </PanelSection>
                </>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Expand Alpha" }), { altKey: true });

            expect(screen.getByRole("button", { name: "Collapse Alpha" })).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByRole("button", { name: "Collapse Beta" })).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByRole("button", { name: "Collapse Gamma" })).toHaveAttribute("aria-expanded", "true");
        });

        it("leaves the siblings alone on a plain click", () => {
            renderInPanel(
                <>
                    <PanelSection sectionId="explore.d" label="Delta">
                        <div>d</div>
                    </PanelSection>
                    <PanelSection sectionId="explore.e" label="Epsilon">
                        <div>e</div>
                    </PanelSection>
                </>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Expand Delta" }));

            expect(screen.getByRole("button", { name: "Collapse Delta" })).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByRole("button", { name: "Expand Epsilon" })).toHaveAttribute("aria-expanded", "false");
        });

        it("collapses every sibling when the alt-clicked header closes", () => {
            renderInPanel(
                <>
                    <PanelSection sectionId="explore.f" label="Zeta" defaultOpen>
                        <div>f</div>
                    </PanelSection>
                    <PanelSection sectionId="explore.g" label="Eta" defaultOpen>
                        <div>g</div>
                    </PanelSection>
                </>,
            );

            fireEvent.click(screen.getByRole("button", { name: "Collapse Zeta" }), { altKey: true });

            expect(screen.getByRole("button", { name: "Expand Zeta" })).toHaveAttribute("aria-expanded", "false");
            expect(screen.getByRole("button", { name: "Expand Eta" })).toHaveAttribute("aria-expanded", "false");
        });
    });

    describe("ComingTag", () => {
        it("draws the one status word", () => {
            render(<ComingTag />);

            expect(screen.getByTestId("coming-tag")).toHaveTextContent(COMING_LABEL);
        });

        it("is a 16 tall pill", () => {
            render(<ComingTag />);

            expect(screen.getByTestId("coming-tag")).toHaveStyle({ height: "16px", borderRadius: "8px" });
        });
    });

    describe("SectionAddButton", () => {
        it("names itself with the saved-thing verb", () => {
            render(<SectionAddButton tooltip="Save as view..." label="Save as view..." onClick={vi.fn()} />);

            expect(screen.getByRole("button", { name: "Save as view..." })).toBeEnabled();
        });

        it("states its reason in its tooltip when it cannot act", () => {
            render(
                <SectionAddButton
                    tooltip="Save as filter... Build a filter first"
                    label="Save as filter... Build a filter first"
                    disabled
                />,
            );

            const add = screen.getByRole("button", { name: "Save as filter... Build a filter first" });

            // `aria-disabled`, not the `disabled` attribute: floor item 4 asks for the
            // reason to be readable, and a real `disabled` button answers no pointer, so
            // its own tooltip could never open.
            expect(add).toHaveAttribute("aria-disabled", "true");
            expect(add).not.toBeDisabled();
            expect(add).toHaveAttribute("title", "Save as filter... Build a filter first");
        });

        it("reports its click", () => {
            const onClick = vi.fn();

            render(<SectionAddButton tooltip="Add a rule" label="Add a rule" onClick={onClick} />);

            fireEvent.click(screen.getByRole("button", { name: "Add a rule" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });
});
