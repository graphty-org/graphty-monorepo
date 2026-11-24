// Renders every documentation example in docs/examples/ as a reader would run it, so the guide pages that include
// them (`<<< ../examples/<name>.tsx`) cannot drift from the components.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App as ColorInput } from "../docs/examples/color-input";
import { App as GettingStarted } from "../docs/examples/getting-started";
import { App as NodeSizeSection } from "../docs/examples/node-size-section";
import { App as PopoutExample } from "../docs/examples/popout";

describe("documentation examples", () => {
    it("getting-started.tsx renders Mantine's and the package's components", () => {
        render(<GettingStarted />);
        expect(screen.getByRole("textbox", { name: "Project name" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
        expect(screen.getByText("Node size")).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: "Scale with zoom" })).toBeChecked();
    });

    it("node-size-section.tsx renders the whole panel section", () => {
        render(<NodeSizeSection />);
        expect(screen.getByText("Node size")).toBeInTheDocument();
        expect(screen.getByRole("radiogroup", { name: "Scale" })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: "Labels" })).toBeChecked();
        expect(screen.getByRole("checkbox", { name: "Halos" })).not.toBeChecked();
    });

    it("color-input.tsx renders the color field with its default color", () => {
        render(<ColorInput />);
        expect(screen.getByRole("group", { name: "Fill" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Pick fill color" })).toBeInTheDocument();
    });

    it("popout.tsx renders the button that opens the pop-out", () => {
        render(<PopoutExample />);
        expect(screen.getByRole("button", { name: "Display settings" })).toBeInTheDocument();
    });
});
