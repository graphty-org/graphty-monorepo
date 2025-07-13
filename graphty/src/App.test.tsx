import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {App} from "./App";

describe("App", () => {
    it("renders the app header", () => {
        render(<App />);
        const header = screen.getByText("Graphty - Graph Visualization");
        expect(header).toBeInTheDocument();
    });

    it("renders the Graphty component", () => {
        render(<App />);
        const graphtyContainer = screen.getByRole("main");
        expect(graphtyContainer).toBeInTheDocument();
    });
});
