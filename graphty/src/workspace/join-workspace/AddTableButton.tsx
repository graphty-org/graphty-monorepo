import { Popout } from "@graphty/compact-mantine";
import { Button, Text, TextInput } from "@mantine/core";
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
    // Why the last load failed: the element's error code, shown until the next try.
    const [failed, setFailed] = useState<string | null>(null);
    const codeOf = (error: unknown): string =>
        typeof error === "object" && error !== null && "code" in error ? String(error.code) : "error";
    const load = (): void => {
        if (url.trim() === "" || loading) {
            return;
        }
        setLoading(true);
        setFailed(null);
        void api
            .addTable(url.trim())
            .then(() => {
                setAsking(false);
                setUrl("");
            })
            .catch((error: unknown) => {
                setFailed(codeOf(error));
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
                                error={failed !== null}
                                onChange={(event) => {
                                    setUrl(event.currentTarget.value);
                                    setFailed(null);
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
                        {failed === null ? null : (
                            <Text size="sm" c="red" role="alert" data-error={failed}>
                                Load failed ({failed})
                            </Text>
                        )}
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
                        setFailed(null);
                        void api.addTable(file).catch((error: unknown) => {
                            setFailed(codeOf(error));
                            setAsking(true);
                        });
                    }
                }}
            />
        </>
    );
}
