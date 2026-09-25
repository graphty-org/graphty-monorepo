import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { render } from "../test/test-utils";
import { Graphty, type GraphtyHandle } from "./Graphty";

// Mock the graphty-element module
vi.mock("@graphty/graphty-element", () => {
    return {
        default: {},
    };
});

// Mock custom element with graph property that has getLayers method
class MockGraphtyElement extends HTMLElement {
    private _layout?: string;
    /* The element's headless model, which is the one door to the style stack. */
    graph = {
        getSession: () => ({ styles: { list: (): unknown[] => [] }, on: () => () => undefined }),
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

    it("writes the acceleration policy on the tag", async () => {
        const { container } = render(<Graphty layers={[]} acceleration="off" />);
        const graphtyElement = container.querySelector("graphty-element") as unknown as MockGraphtyElement;

        await vi.waitFor(() => {
            /* The mock defines no `acceleration` accessor, so React writes the attribute;
               the real element defines one and takes the property. Either is the policy
               reaching the element, which is what this board is about. */
            const hasProperty = (graphtyElement as unknown as { acceleration?: string }).acceleration === "off";
            const hasAttribute = graphtyElement.getAttribute("acceleration") === "off";
            expect(hasProperty || hasAttribute).toBe(true);
        });
    });

    it("exposes the element's session through the handle, null until the element has one", () => {
        const ref = createRef<GraphtyHandle>();
        const { container } = render(<Graphty ref={ref} layers={[]} />);

        expect(ref.current?.session).toBeNull();

        const element = container.querySelector("graphty-element");
        const session = { styles: {} };
        Object.defineProperty(element, "session", { configurable: true, value: session });

        expect(ref.current?.session).toBe(session);
    });

    /* The handle loads through the element's own awaited methods: the element detects the
       format, resolves once the data has arrived and rejects when it did not, so the wrapper
       neither sniffs formats nor assigns the data-source pair. */
    it("loads through the element's awaited methods and hands back the load id", async () => {
        const ref = createRef<GraphtyHandle>();
        const { container } = render(<Graphty ref={ref} layers={[]} />);
        const element = container.querySelector("graphty-element");
        const loadFromFile = vi.fn(() => Promise.resolve({ loadId: 7 }));
        const loadFromUrl = vi.fn(() => Promise.resolve({ loadId: 8 }));
        const addDataFromSource = vi.fn(() => Promise.resolve({ loadId: 9 }));

        Object.assign(element as object, { loadFromFile, loadFromUrl, addDataFromSource });

        const file = new File(["{}"], "graph.txt");

        await expect(ref.current?.loadFromFile(file, undefined, { replace: true })).resolves.toEqual({ loadId: 7 });
        expect(loadFromFile).toHaveBeenCalledWith(file, { format: undefined, replace: true });

        await expect(ref.current?.loadFromUrl("https://example.com/g", "gml")).resolves.toEqual({ loadId: 8 });
        expect(loadFromUrl).toHaveBeenCalledWith("https://example.com/g", { format: "gml", replace: undefined });

        await expect(ref.current?.loadData("json", { data: "{}" }, { replace: true })).resolves.toEqual({ loadId: 9 });
        expect(addDataFromSource).toHaveBeenCalledWith("json", { data: "{}" }, { replace: true });
    });

    it("rejects when the element's load rejects", async () => {
        const ref = createRef<GraphtyHandle>();
        const { container } = render(<Graphty ref={ref} layers={[]} />);
        const element = container.querySelector("graphty-element");

        Object.assign(element as object, {
            loadFromFile: vi.fn(() => Promise.reject(new Error("Unexpected end of JSON input"))),
        });

        await expect(ref.current?.loadFromFile(new File(["{"], "g.json"))).rejects.toThrow(
            "Unexpected end of JSON input",
        );
    });

    it("turns on the element's label declutter", async () => {
        const { container } = render(<Graphty layers={[]} />);
        const graphtyElement = container.querySelector("graphty-element") as unknown as {
            layoutBehavior?: { labels?: { declutter?: boolean } };
        };

        await vi.waitFor(() => {
            expect(graphtyElement.layoutBehavior?.labels?.declutter).toBe(true);
        });
    });

    it("has proper styling", () => {
        const { container } = render(<Graphty layers={[]} />);
        const graphtyElement = container.querySelector<HTMLElement>("graphty-element");
        expect(graphtyElement?.style.width).toBe("100%");
        expect(graphtyElement?.style.height).toBe("100%");
    });
});
