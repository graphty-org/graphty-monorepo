import type { Meta, StoryObj } from "@storybook/react";

import { Graphty } from "../components/Graphty";

// Mock the graphty-element module for Storybook
if (typeof window !== "undefined" && !window.customElements.get("graphty-element")) {
    class MockGraphtyElement extends HTMLElement {
        connectedCallback(): void {
            this.innerHTML = `<div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f0f0f0;
                border: 2px dashed #ccc;
                color: #666;
                font-family: system-ui;
            ">
                <div style="text-align: center;">
                    <h3 style="margin: 0 0 1rem 0;">Graphty Element Mock</h3>
                    <p style="margin: 0;">Layout: ${this.getAttribute("layout") ?? "default"}</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.7;">
                        (graphty-element will be loaded from @graphty/graphty-element)
                    </p>
                </div>
            </div>`;
        }
    }

    window.customElements.define("graphty-element", MockGraphtyElement);
}

const meta: Meta<typeof Graphty> = {
    title: "Components/Graphty",
    component: Graphty,
    parameters: {
        layout: "centered",
    },
    args: {
        // Provide default empty layers array to prevent "e is not iterable" error
        layers: [],
    },
    decorators: [
        (Story) => (
            <div style={{ width: "800px", height: "600px" }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: "400px", height: "300px" }}>
                <Story />
            </div>
        ),
    ],
};

export const Large: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: "1200px", height: "800px" }}>
                <Story />
            </div>
        ),
    ],
};
