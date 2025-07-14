import {Box} from "@mantine/core";
import React, {useState} from "react";

import {Graphty} from "../Graphty";
import {BottomToolbar} from "./BottomToolbar";
import {LeftSidebar} from "./LeftSidebar";
import {RightSidebar} from "./RightSidebar";
import {TopMenuBar} from "./TopMenuBar";

interface AppLayoutProps {
    className?: string;
}

export function AppLayout({className}: AppLayoutProps): React.JSX.Element {
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
    const [toolbarVisible, setToolbarVisible] = useState(true);

    // Force desktop layout regardless of screen size
    const getGridCols = (): string => {
        if (leftSidebarVisible && rightSidebarVisible) {
            return "280px 1fr 320px";
        }

        if (leftSidebarVisible && !rightSidebarVisible) {
            return "280px 1fr";
        }

        if (!leftSidebarVisible && rightSidebarVisible) {
            return "1fr 320px";
        }

        return "1fr";
    };

    return (
        <Box
            className={className}
            style={{
                height: "100vh",
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "48px 1fr",
                gridTemplateColumns: getGridCols(),
                gridTemplateAreas: (() => {
                    if (leftSidebarVisible && rightSidebarVisible) {
                        return "\"header header header\" \"left-sidebar canvas right-sidebar\"";
                    }

                    if (leftSidebarVisible && !rightSidebarVisible) {
                        return "\"header header\" \"left-sidebar canvas\"";
                    }

                    if (!leftSidebarVisible && rightSidebarVisible) {
                        return "\"header header\" \"canvas right-sidebar\"";
                    }

                    return "\"header\" \"canvas\"";
                })(),
            }}
        >
            {/* Header */}
            <TopMenuBar
                style={{gridArea: "header"}}
                onToggleLeftSidebar={() => {
                    setLeftSidebarVisible(!leftSidebarVisible);
                }}
                onToggleRightSidebar={() => {
                    setRightSidebarVisible(!rightSidebarVisible);
                }}
                onToggleToolbar={() => {
                    setToolbarVisible(!toolbarVisible);
                }}
            />

            {/* Left Sidebar */}
            {leftSidebarVisible && (
                <LeftSidebar
                    style={{gridArea: "left-sidebar"}}
                />
            )}

            {/* Main Canvas Area */}
            <Box
                component="main"
                style={{
                    gridArea: "canvas",
                    overflow: "hidden",
                    backgroundColor: "var(--mantine-color-dark-8)",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                }}
            >
                <Graphty />

                {/* Floating Centered Toolbar */}
                {toolbarVisible && (
                    <Box
                        style={{
                            position: "absolute",
                            bottom: "80px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 20,
                        }}
                    >
                        <BottomToolbar />
                    </Box>
                )}
            </Box>

            {/* Right Sidebar */}
            {rightSidebarVisible && (
                <RightSidebar
                    style={{gridArea: "right-sidebar"}}
                />
            )}
        </Box>
    );
}
