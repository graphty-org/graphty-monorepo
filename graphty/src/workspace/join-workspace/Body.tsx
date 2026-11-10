import { Button } from "@mantine/core";
import React, { useRef } from "react";

import { GLYPHS } from "../glyphs";
import { useJoinWorkspace } from "./context";
import { PreviewPane } from "./PreviewPane";
import { RowsPane } from "./RowsPane";

/**
 * The workspace's body, under its title bar. THE EXTENSION POINT: each build of the join
 * workspace replaces this file with its own layout (the recipe's cards, the model canvas), using
 * `useJoinWorkspace()` and the panes. The shell's own body: an empty left column with Table +,
 * the preview over the paged rows on the right.
 * @returns the body.
 */
export function JoinBody(): React.JSX.Element {
    return (
        <div className="jw-body">
            <div className="jw-left">
                <AddTableButton />
            </div>
            <div className="jw-right">
                <PreviewPane />
                <RowsPane />
            </div>
        </div>
    );
}

/**
 * Table +: picks a file and holds it in the recipe as a table, apart from the graph.
 * @returns the button.
 */
export function AddTableButton(): React.JSX.Element {
    const api = useJoinWorkspace();
    const input = useRef<HTMLInputElement>(null);
    return (
        <>
            <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<GLYPHS.add size={14} aria-hidden />}
                onClick={() => input.current?.click()}
            >
                Table
            </Button>
            <input
                ref={input}
                type="file"
                hidden
                aria-label="Table file"
                onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file !== undefined) {
                        void api.addTable(file);
                    }
                }}
            />
        </>
    );
}
