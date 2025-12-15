import {describe, expect, it} from "vitest";

import {render, screen} from "../../../../test/test-utils";
import {StatRow} from "../StatRow";

describe("StatRow", () => {
    it("renders label and value", () => {
        render(<StatRow label="Nodes" value="100" />);

        expect(screen.getByText("Nodes")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("renders numeric values correctly", () => {
        render(<StatRow label="Edge Count" value={250} />);

        expect(screen.getByText("Edge Count")).toBeInTheDocument();
        expect(screen.getByText("250")).toBeInTheDocument();
    });

    it("renders decimal values correctly", () => {
        render(<StatRow label="Density" value="0.0505" />);

        expect(screen.getByText("Density")).toBeInTheDocument();
        expect(screen.getByText("0.0505")).toBeInTheDocument();
    });

    it("renders both label and value in the same row", () => {
        render(<StatRow label="Count" value="42" />);

        // Both label and value should be visible in the same component
        expect(screen.getByText("Count")).toBeInTheDocument();
        expect(screen.getByText("42")).toBeInTheDocument();
    });
});
