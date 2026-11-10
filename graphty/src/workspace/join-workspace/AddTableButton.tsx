import { Button } from "@mantine/core";
import React, { useRef } from "react";

import { GLYPHS } from "../glyphs";
import { useJoinWorkspace } from "./context";

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
