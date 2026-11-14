import { Popout } from "@graphty/compact-mantine";
import { Button, TextInput } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useJoinWorkspace } from "./context";

/**
 * Table +: holds a table in the recipe, apart from the graph, from a URL or a file picked.
 * @returns the button and its pop-out.
 */
export function AddTableButton(): React.JSX.Element {
    const api = useJoinWorkspace();
    const input = useRef<HTMLInputElement>(null);
    const [asking, setAsking] = useState(false);
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const load = (): void => {
        if (url.trim() === "" || loading) {
            return;
        }
        setLoading(true);
        void api
            .addTable(url.trim())
            .then(() => {
                setAsking(false);
                setUrl("");
            })
            .finally(() => {
                setLoading(false);
            });
    };
    return (
        <>
            <Popout opened={asking} onOpenChange={setAsking}>
                <Popout.Trigger>
                    <Button size="compact-xs" variant="subtle" leftSection={<GLYPHS.add size={14} aria-hidden />}>
                        Table
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={340}
                    placement="bottom"
                    header={{ variant: "title", title: "Table" }}
                    closeLabel="Close Table"
                >
                    <Popout.Content>
                        <form
                            className="jr-row-controls"
                            onSubmit={(event) => {
                                event.preventDefault();
                                load();
                            }}
                        >
                            <TextInput
                                size="xs"
                                aria-label="Table URL"
                                placeholder="https://"
                                value={url}
                                onChange={(event) => {
                                    setUrl(event.currentTarget.value);
                                }}
                            />
                            <Button size="compact-xs" type="submit" loading={loading}>
                                Load
                            </Button>
                            <Button
                                size="compact-xs"
                                variant="default"
                                onClick={() => {
                                    setAsking(false);
                                    input.current?.click();
                                }}
                            >
                                File...
                            </Button>
                        </form>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
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
