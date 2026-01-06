import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme, StatRow } from "../../src";

describe("StatRow", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StatRow label="Nodes" value={100} />
            </MantineProvider>,
        );
        expect(screen.getByText("Nodes")).toBeInTheDocument();
    });

    it("renders numeric value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StatRow label="Nodes" value={100} />
            </MantineProvider>,
        );
        expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("renders string value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StatRow label="Status" value="Active" />
            </MantineProvider>,
        );
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("converts number to string for display", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StatRow label="Count" value={0} />
            </MantineProvider>,
        );
        expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("displays large numbers correctly", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StatRow label="Total" value={1000000} />
            </MantineProvider>,
        );
        expect(screen.getByText("1000000")).toBeInTheDocument();
    });

    it("renders with special characters in label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StatRow label="Nodes (Active)" value={50} />
            </MantineProvider>,
        );
        expect(screen.getByText("Nodes (Active)")).toBeInTheDocument();
    });
});
