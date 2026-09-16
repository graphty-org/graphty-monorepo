import { PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../../../../test/test-utils";
import type { LayerItem } from "../../../layout/LeftSidebar";
import { ShellProvider } from "../../ShellContext";
import { StyleLayerInspector, type StyleLayerSource } from "../StyleLayerInspector";

function Harness({ children }: { children: React.ReactNode }) {
    return (
        <PopoutManager>
            <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                {children}
            </ShellProvider>
        </PopoutManager>
    );
}

const createLayer = (id: string, name: string): LayerItem => ({
    id,
    name,
    styleLayer: {
        node: { selector: "", style: {} },
        edge: { selector: "", style: {} },
    },
});

const source: StyleLayerSource = {
    resultName: "Bridges",
    method: "Betweenness centrality",
    scope: "all 20 visible nodes",
    ranAt: "2 minutes ago",
    onOpenResult: vi.fn(),
};

describe("StyleLayerInspector", () => {
    describe("re-homing the existing panel", () => {
        it("draws the app's own style layer properties panel whole", () => {
            render(
                <Harness>
                    <StyleLayerInspector layer={createLayer("l1", "Base")} />
                </Harness>,
            );

            expect(screen.getByLabelText("Node Selector")).toBeInTheDocument();
            expect(screen.getByLabelText("Edge Selector")).toBeInTheDocument();
        });
    });

    describe("the Source section", () => {
        it("is not drawn when the layer did not come from a run", () => {
            render(
                <Harness>
                    <StyleLayerInspector layer={createLayer("l1", "Base")} />
                </Harness>,
            );

            expect(screen.queryByRole("button", { name: "Collapse Source" })).not.toBeInTheDocument();
        });

        it("names the run the layer came from", () => {
            render(
                <Harness>
                    <StyleLayerInspector layer={createLayer("l1", "Bridges")} source={source} />
                </Harness>,
            );

            expect(screen.getByRole("button", { name: "Collapse Source" })).toBeInTheDocument();
            expect(screen.getByText("Betweenness centrality")).toBeInTheDocument();
            expect(screen.getByText("all 20 visible nodes")).toBeInTheDocument();
        });

        it("carries the Coming tag, because the layer source binding has not shipped", () => {
            render(
                <Harness>
                    <StyleLayerInspector layer={createLayer("l1", "Bridges")} source={source} />
                </Harness>,
            );

            /* Scoped to the Source section. The properties panel below it now draws its
               own per-row Coming tag on the Flat shaded toggle -- `effect.flatShaded` is
               accepted by the element's schema and read by nothing -- so a document-wide
               query for the tag finds two, which is the correct number rather than a
               fault. */
            const sourceSection = screen.getByRole("group", { name: "Source" });

            expect(within(sourceSection).getByTestId("coming-tag")).toBeInTheDocument();
        });
    });
});
