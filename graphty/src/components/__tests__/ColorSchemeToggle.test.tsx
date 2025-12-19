import {describe, expect, it} from "vitest";

import {render, screen} from "../../test/test-utils";
import {ColorSchemeToggle} from "../ColorSchemeToggle";

describe("ColorSchemeToggle", () => {
    it("renders a toggle button", () => {
        render(<ColorSchemeToggle />);

        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
    });

    it("has an accessible label", () => {
        render(<ColorSchemeToggle />);

        const button = screen.getByRole("button");
        expect(button).toHaveAccessibleName(/switch to (light|dark) mode/i);
    });
});
