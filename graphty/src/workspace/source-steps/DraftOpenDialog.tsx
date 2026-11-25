import { ModalFooter } from "@graphty/compact-mantine";
import { Button, Modal } from "@mantine/core";
import React from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { commitWorkspace } from "./actions";
import { PREVIEW_WORDS, STAGED_WORDS } from "./words";

/**
 * The question a data write meets while a source draft is open (`E_DRAFT_OPEN`, the
 * source-steps experiment): Commit the draft or Discard it, then make the write; or Cancel the
 * write and keep the draft.
 * @returns the dialog
 */
export function DraftOpenDialog(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const asked = useWorkspaceState((state) => state.draftOpen);
    if (session === null) {
        return null;
    }
    const close = (): void => {
        store.set({ draftOpen: null });
    };
    const then = async (settle: () => Promise<void> | void): Promise<void> => {
        close();
        await settle();
        if (asked !== null && session.data.currentDraft() === null) {
            await asked.retry();
        }
    };
    return (
        <Modal opened={asked !== null} onClose={close} title={PREVIEW_WORDS.draftOpen}>
            <ModalFooter>
                <Button variant="default" onClick={close} data-autofocus>
                    {STAGED_WORDS.cancel}
                </Button>
                <Button
                    variant="default"
                    onClick={() => {
                        void then(() => {
                            session.data.currentDraft()?.dispose();
                        });
                    }}
                >
                    {PREVIEW_WORDS.discard}
                </Button>
                <Button
                    onClick={() => {
                        void then(async () => {
                            const draft = session.data.currentDraft();
                            if (draft !== null) {
                                await commitWorkspace(store, session, draft);
                            }
                        });
                    }}
                >
                    {PREVIEW_WORDS.commit}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
