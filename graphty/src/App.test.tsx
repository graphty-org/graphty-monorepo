import {describe, expect, it} from "vitest";

import {App} from "./App";
import {render, screen} from "./test/test-utils";

describe("App", () => {
    it("renders the app header", () => {
        render(<App />);
        const header = screen.getByText("Graphty");
        expect(header).toBeInTheDocument();
    });

    it("renders the Graphty component", () => {
        render(<App />);
        const graphtyContainer = screen.getByRole("main");
        expect(graphtyContainer).toBeInTheDocument();
    });
});
