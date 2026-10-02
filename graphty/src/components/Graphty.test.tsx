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

// A stand-in for the element: the session the wrapper reads, and the one property it writes.
class MockGraphtyElement extends HTMLElement {
    session = {
        styles: { list: (): unknown[] => [] },
        on: () => () => undefined,
        data: {
            nodes: () => [{ id: 1, label: "one" }],
            edges: () => [{ id: "0", source: 1, target: 1 }],
        },
    };
    /* Declared so React writes the property rather than an attribute, as it does on the real element. */
    layoutBehavior: unknown = undefined;
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

    it("exposes the element and its session through the handle", () => {
        const ref = createRef<GraphtyHandle>();
        const { container } = render(<Graphty ref={ref} layers={[]} />);
        const element = container.querySelector("graphty-element") as unknown as MockGraphtyElement;

        expect(ref.current?.element).toBe(element);
        expect(ref.current?.session).toBe(element.session);
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

    it("leaves the element's size to the element, which fills the sized container", () => {
        const { container } = render(<Graphty layers={[]} />);
        const graphtyElement = container.querySelector<HTMLElement>("graphty-element");
        expect(graphtyElement?.getAttribute("style")).toBeNull();
    });
});
