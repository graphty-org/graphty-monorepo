import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { VariablePill } from "../../../src/components/inputs/VariablePill";
import { TOOLTIP_WAIT } from "../../waits";

function renderPill(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("VariablePill", () => {
    it("draws the value as a pill named for the variable", () => {
        renderPill(<VariablePill name="rsu/radius-sm" value="4" />);
        expect(screen.getByRole("button", { name: "4, variable rsu/radius-sm" })).toHaveTextContent("4");
    });

    it("clicking the pill calls onClick; Detach calls onDetach", async () => {
        const onClick = vi.fn();
        const onDetach = vi.fn();
        renderPill(<VariablePill name="rsu/radius-sm" value="4" onClick={onClick} onDetach={onDetach} />);
        await userEvent.click(screen.getByRole("button", { name: /rsu\/radius-sm/ }));
        expect(onClick).toHaveBeenCalledTimes(1);
        await userEvent.click(screen.getByRole("button", { name: "Detach variable", hidden: true }));
        expect(onDetach).toHaveBeenCalledTimes(1);
    });

    it("has no Detach button without onDetach", () => {
        renderPill(<VariablePill name="rsu/radius-sm" value="4" />);
        expect(screen.queryByRole("button", { name: "Detach variable", hidden: true })).not.toBeInTheDocument();
    });

    it("with a swatch it is the bound fill row: a chit and the name", () => {
        const { container } = renderPill(<VariablePill swatch="#0d99ff" name="rsu/brand" />);
        expect(screen.getByRole("button", { name: "rsu/brand" })).toHaveTextContent("rsu/brand");
        expect(container.querySelector(".cm-var-chit")).toHaveStyle({ backgroundColor: "#0d99ff" });
    });

    it("tone=component marks only the name, in the fill row and the pill", () => {
        const { container } = renderPill(
            <VariablePill swatch="#0d99ff" name="Layer" tone="component" aria-describedby="more" />,
        );
        expect(container.querySelector(".cm-var-name")).toHaveAttribute("data-tone", "component");
        expect(container.querySelector(".cm-var-chit")).not.toHaveAttribute("data-tone");
        expect(container.querySelector(".cm-var-fill")).not.toHaveAttribute("data-tone");
        expect(screen.getByRole("button", { name: "Layer" })).toHaveAttribute("aria-describedby", "more");
        renderPill(<VariablePill name="Layer" tone="component" />);
        expect(screen.getAllByRole("button", { name: "Layer" })[1]).toHaveAttribute("data-tone", "component");
    });

    it("draws a wider swatch for a ramp or several colors when given swatchWidth", () => {
        const { container } = renderPill(
            <VariablePill swatch="linear-gradient(to right, #000, #fff)" swatchWidth={36} name="Degree" />,
        );
        expect(container.querySelector(".cm-var-chit")).toHaveStyle({ width: "36px" });
    });

    it("takes a caller's accessible name for the pill and the fill row, and a fill row's tooltip says the name whole", async () => {
        renderPill(<VariablePill name="Degree rank" value="1 to 3" aria-label="Node size: Degree rank, 1 to 3" />);
        expect(screen.getByRole("button", { name: "Node size: Degree rank, 1 to 3" })).toHaveTextContent("1 to 3");
        renderPill(<VariablePill swatch="#0d99ff" name="Edge betweenness" aria-label="Edge color: Edge betweenness" />);
        const fill = screen.getByRole("button", { name: "Edge color: Edge betweenness" });
        await userEvent.hover(fill);
        // The theme opens tooltips after a delay and mounts them hidden first.
        await waitFor(() => {
            expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Edge betweenness");
        }, TOOLTIP_WAIT);
    });

    it("takes the tooltip's words from the caller", async () => {
        renderPill(<VariablePill swatch="#0d99ff" name="<Layer>" tooltip={"Layer\nEach layer's own value"} />);
        await userEvent.hover(screen.getByRole("button", { name: "<Layer>" }));
        await waitFor(() => {
            const tip = screen.getByRole("tooltip", { hidden: true });
            expect(tip).toHaveTextContent("Layer Each layer's own value");
            expect(tip.textContent).not.toContain("<");
        }, TOOLTIP_WAIT);
    });

    it("the property chip carries its kind", () => {
        const { container } = renderPill(<VariablePill kind="property" name="Label" />);
        expect(container.querySelector(".cm-var-fill-button")).toHaveAttribute("data-kind", "property");
    });

    it("takes a caller's Detach name", () => {
        renderPill(<VariablePill name="x" value="1" onDetach={vi.fn()} detachLabel="Unbind" />);
        expect(screen.getByRole("button", { name: "Unbind", hidden: true })).toBeInTheDocument();
    });

    it("with onValueCommit the rest of the field takes a literal: Enter and blur report it, Escape drops it", async () => {
        const onValueCommit = vi.fn();
        renderPill(<VariablePill name="rsu/radius-sm" value="4" onValueCommit={onValueCommit} />);
        const input = screen.getByRole("textbox", { name: "Value" });
        await userEvent.type(input, "12{Enter}");
        expect(onValueCommit).toHaveBeenLastCalledWith("12", expect.anything());
        expect(input).toHaveValue("");
        await userEvent.type(input, "9{Escape}");
        expect(input).toHaveValue("");
        expect(onValueCommit).toHaveBeenCalledTimes(1);
        await userEvent.type(input, "7");
        await userEvent.tab();
        expect(onValueCommit).toHaveBeenLastCalledWith("7", expect.anything());
    });

    it("without onValueCommit there is no input after the pill", () => {
        renderPill(<VariablePill name="rsu/radius-sm" value="4" />);
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
});
