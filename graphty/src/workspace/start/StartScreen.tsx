import { Anchor } from "@mantine/core";
import type React from "react";

import { Stub } from "../frame/Stub";
import { useWorkspace } from "../state/WorkspaceContext";

/**
 * The start screen (tier1-design.md section 2.11), shown whenever no project is open: Open
 * project or file..., New from data..., Recent projects, Samples and the usage data card.
 *
 * A stub until the Start screen package replaces this file: one gray line with the one way in.
 * @returns One gray line
 */
export function StartScreen(): React.JSX.Element {
    const { run } = useWorkspace();
    return (
        <Stub>
            Start screen.{" "}
            <Anchor
                component="button"
                size="xs"
                onClick={() => {
                    run("project.new");
                }}
            >
                New project
            </Anchor>
        </Stub>
    );
}
