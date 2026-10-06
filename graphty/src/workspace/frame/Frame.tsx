import "./frame.css";

import { ResizeHandle } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import type React from "react";

import { CanvasOverlays } from "../canvas/CanvasOverlays";
import { DataPage } from "../data-page/DataPage";
import { DataPlace } from "../data-place/DataPlace";
import { GraphPlace } from "../graph-place/GraphPlace";
import { Inspector } from "../inspector/Inspector";
import { DOCK_MAX, DOCK_MIN, PANEL_MAX, PANEL_MIN } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { TableDock } from "../table/TableDock";
import { WorkspaceToolbar } from "../toolbar/WorkspaceToolbar";
import { ElementHost } from "./ElementHost";
import { Header } from "./Header";
import { NoticeSlot } from "./NoticeSlot";
import { Rail } from "./Rail";

/** Props for Frame. */
interface FrameProps {
    /** Called with the element and its session once it has come up, and with nulls when it goes. */
    onElementReady: (element: GraphtyElement | null, session: GraphSession | null) => void;
}

/**
 * The workspace frame (tier1-design.md section 2): the header across the top; under it the rail,
 * the left panel, the canvas with the toolbar floating at its foot, and the inspector; the table
 * dock along the canvas's foot. The Data page takes the area right of the rail while the element
 * stays mounted underneath.
 * @param props - Component props
 * @param props.onElementReady - Called with the element and its session
 * @returns The frame
 */
export function Frame({ onElementReady }: Readonly<FrameProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const projectId = useWorkspaceState((state) => state.project?.id ?? 0);
    const page = useWorkspaceState((state) => state.page);
    const place = useWorkspaceState((state) => state.place);
    const leftWidth = useWorkspaceState((state) => state.leftWidth);
    const rightWidth = useWorkspaceState((state) => state.rightWidth);
    const dockOpen = useWorkspaceState((state) => state.dockOpen);
    const dockHeight = useWorkspaceState((state) => state.dockHeight);
    const panels = page === "panels";

    return (
        <div className="ws-app">
            <Header />
            <div
                className="ws-body"
                style={
                    {
                        "--ws-left": `${String(leftWidth)}px`,
                        "--ws-right": `${String(rightWidth)}px`,
                    } as React.CSSProperties
                }
            >
                <Rail />
                <aside className="ws-left" aria-label="Left panel" hidden={!panels}>
                    {place === "graph" ? <GraphPlace /> : <DataPlace />}
                    <ResizeHandle
                        edge="end"
                        label="Resize left panel"
                        value={leftWidth}
                        defaultValue={PANEL_MIN}
                        min={PANEL_MIN}
                        max={PANEL_MAX}
                        onChange={(value) => {
                            store.set({ leftWidth: value });
                        }}
                    />
                </aside>
                <main className="ws-main" aria-label="Graph" hidden={!panels}>
                    <div className="ws-canvas">
                        <ElementHost key={projectId} onReady={onElementReady} />
                        <div className="ws-canvas-overlays">
                            <CanvasOverlays />
                            <div className="ws-toolbar-dock">
                                <WorkspaceToolbar />
                            </div>
                            <NoticeSlot />
                        </div>
                    </div>
                    {dockOpen ? (
                        <section className="ws-dock" aria-label="Table" style={{ height: dockHeight }}>
                            <ResizeHandle
                                edge="top"
                                label="Resize table"
                                value={dockHeight}
                                defaultValue={240}
                                min={DOCK_MIN}
                                max={DOCK_MAX}
                                onChange={(value) => {
                                    store.set({ dockHeight: value });
                                }}
                            />
                            <TableDock />
                        </section>
                    ) : null}
                </main>
                <aside className="ws-right" aria-label="Inspector" hidden={!panels}>
                    <Inspector />
                    <ResizeHandle
                        edge="start"
                        label="Resize inspector"
                        value={rightWidth}
                        defaultValue={PANEL_MIN}
                        min={PANEL_MIN}
                        max={PANEL_MAX}
                        onChange={(value) => {
                            store.set({ rightWidth: value });
                        }}
                    />
                </aside>
                {panels ? null : (
                    <div className="ws-page">
                        <DataPage />
                    </div>
                )}
            </div>
        </div>
    );
}
