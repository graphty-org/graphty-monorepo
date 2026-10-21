import { ModalFooter } from "@graphty/compact-mantine";
import type { NetworkRequest } from "@graphty/graphty-element/session";
import { Button, Modal, Stack, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import {
    OPEN_PROJECT_URLS,
    readPreference,
    readProjectHosts,
    rememberProjectHost,
    writePreference,
} from "../settings/preferences";
import { useWorkspace } from "../state/WorkspaceContext";

/** What each kind of fetch is, in the question. */
const KIND_WORDS: Readonly<Record<string, string>> = {
    model: "a 3D model",
    texture: "a picture",
    source: "a data source",
};

/**
 * The file an address names, for the question about a part the reader supplied by address.
 * @param url - the address as the element shows it (origin and path).
 * @returns its last path segment, else the address.
 */
function partName(url: string): string {
    try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "") || url;
    } catch {
        return url;
    }
}

/**
 * The question before a project opens a web address it names (a model, a picture, a data
 * source): graphty-element holds every such fetch in `session.network` until it is answered, and
 * this asks the reader, one address at a time. Continue opens it (and the rest of that site, this
 * session); Cancel does not. Both "don't ask" choices are the reader's own, kept in this browser
 * and never in the project file: "Don't ask again for this project" remembers the site for the
 * element's `session.project.id`, handed back through `session.network.setProjectHosts` whenever
 * a project opens; "Don't ask again" is handed to the element on every project.
 * @returns The dialog
 */
export function NetworkPrompt(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [waiting, setWaiting] = useState<readonly NetworkRequest[]>([]);

    useEffect(() => {
        if (session === null) {
            setWaiting([]);
            return undefined;
        }
        session.network.setPolicy(readPreference(OPEN_PROJECT_URLS));
        session.network.setProjectHosts(readProjectHosts);
        setWaiting(session.network.pending());
        const stop = session.on("network:pending", () => {
            setWaiting(session.network.pending());
        });
        return () => {
            stop();
            session.network.setProjectHosts(null);
        };
    }, [session]);

    if (session === null) {
        return null;
    }
    const [request] = waiting;
    const settle = (answer: () => void | Promise<void>): void => {
        void Promise.resolve(answer())
            .catch(() => undefined)
            .finally(() => {
                setWaiting(session.network.pending());
            });
    };

    return (
        <Modal
            opened={request !== undefined}
            onClose={() => {
                settle(() => {
                    session.network.deny(request.params.id);
                });
            }}
            title="Open a web address?"
        >
            {request === undefined ? null : (
                <Stack gap="xs">
                    {request.params.by === "supplied" ? (
                        // The reader typed this address for a part of a model: it is theirs, not
                        // the project's, and nothing is known of it until it is fetched.
                        <Text size="sm">
                            Load a part of this model from {request.params.host}? It is {partName(request.params.url)}.
                        </Text>
                    ) : (
                        <>
                            <Text size="sm">This project wants to open {request.params.url}. Continue?</Text>
                            <Text size="xs" c="dimmed">
                                It is {KIND_WORDS[request.params.kind] ?? "a file"} on {request.params.host}. Continue
                                opens it and anything else this project names on that site.
                            </Text>
                        </>
                    )}
                    <ModalFooter mt="md">
                        <Button
                            variant="default"
                            onClick={() => {
                                settle(() => {
                                    session.network.deny(request.params.id);
                                });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                rememberProjectHost(session.project.id, request.params.host);
                                settle(() => session.network.allow(request.params.id));
                            }}
                        >
                            Don&apos;t ask again for this project
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => {
                                writePreference(OPEN_PROJECT_URLS, "allow");
                                settle(() => {
                                    session.network.setPolicy("allow");
                                });
                            }}
                        >
                            Don&apos;t ask again
                        </Button>
                        <Button
                            data-autofocus
                            onClick={() => {
                                settle(() => session.network.allow(request.params.id));
                            }}
                        >
                            Continue
                        </Button>
                    </ModalFooter>
                </Stack>
            )}
        </Modal>
    );
}
