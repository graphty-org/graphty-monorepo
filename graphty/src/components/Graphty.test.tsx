import { describe, expect, it, vi } from "vitest";

import { render } from "../test/test-utils";
import { Graphty } from "./Graphty";

// Mock the graphty-element module
vi.mock("@graphty/graphty-element", () => {
    return {
        default: {},
    };
});

// Mock custom element with graph property that has getLayers method
class MockGraphtyElement extends HTMLElement {
    private _layout?: string;
    // Mock graph property with getLayers method
    graph = {
        getLayers: (): unknown[] => [],
        getStyleManager: () => ({
            getLayers: () => [],
        }),
    };

    connectedCallback(): void {
        // React 19 might set properties instead of attributes for custom elements
        if (this._layout) {
            this.setAttribute("layout", this._layout);
        }
    }

    set layout(value: string | undefined) {
        this._layout = value;
        if (this.isConnected && value) {
            this.setAttribute("layout", value);
        }
    }

    get layout(): string | undefined {
        return this._layout;
    }
}

// Register the mock custom element
if (!customElements.get("graphty-element")) {
    customElements.define("graphty-element", MockGraphtyElement);
}

describe("Graphty", () => {
    it("renders graphty-element", () => {
        const { container } = render(<Graphty layers={[]} />);
        const graphtyElement = container.querySelector("graphty-element");
        expect(graphtyElement).toBeInTheDocument();
    });

    it("sets the layout attribute", async () => {
        const { container } = render(<Graphty layers={[]} />);
        const graphtyElement = container.querySelector("graphty-element") as unknown as MockGraphtyElement;
        // In React 19, properties might be set instead of attributes for custom elements
        await vi.waitFor(() => {
            // Check both property and attribute
            const hasProperty = graphtyElement.layout === "d3";
            const hasAttribute = graphtyElement.getAttribute("layout") === "d3";
            expect(hasProperty || hasAttribute).toBe(true);
        });
    });

    it("has proper styling", () => {
        const { container } = render(<Graphty layers={[]} />);
        const graphtyElement = container.querySelector("graphty-element");
        expect(graphtyElement?.style.width).toBe("100%");
        expect(graphtyElement?.style.height).toBe("100%");
    });
});
