import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { VariablePill } from "../../../src/components/inputs/VariablePill";

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
        expect(container.querySelector(".cm-var-chit")).toHaveStyle({ background: "#0d99ff" });
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
