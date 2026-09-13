/**
 * The AI settings dialog: a Mantine modal around the ONE provider/key form.
 *
 * It draws no form of its own. Spec 5.1 puts AI settings inside Settings and 5.3 AI
 * tier 3 names Settings > AI providers as the destination the assistant's setup
 * prompt opens, so `AiProviderSettings` is where that form lives and this dialog is
 * a second door onto the same component -- for a caller that has no Settings overlay
 * to open, such as a story or an embedding of the graph on its own.
 *
 * It had a second, fuller copy of the form until the pane existed: a provider
 * dropdown, its own key field, its own persistence block and a Save/Cancel pair.
 * That copy is gone rather than kept in step, because two key forms are two places
 * for one secret to be masked, autocompleted and cleared differently -- and because
 * the copy's commit model was the opposite of the overlay's ("Changes save
 * automatically"), so the same key had two save gestures depending on which surface
 * the user found.
 */

import { Modal } from "@mantine/core";
import React from "react";

import { standardModalStyles } from "../../utils/modal-styles";
import { AiProviderSettings, type AiProviderSettingsProps } from "./AiProviderSettings";

/**
 * Props of the AI settings dialog: the key store the form writes to, plus the
 * dialog's own two.
 * @public
 */
export interface AiSettingsModalProps extends AiProviderSettingsProps {
    /** Whether the dialog is open. */
    readonly opened: boolean;
    /** Closes it. A key is already saved by the time this is reached. */
    readonly onClose: () => void;
}

/** The dialog's title. */
const MODAL_TITLE = "AI Settings";

/**
 * The AI settings dialog.
 * @param props - the dialog's own two props, plus the key store the form needs.
 * @returns the dialog.
 */
export function AiSettingsModal(props: AiSettingsModalProps): React.JSX.Element {
    const { opened, onClose, ...providerSettings } = props;

    return (
        <Modal opened={opened} onClose={onClose} title={MODAL_TITLE} size="lg" centered styles={standardModalStyles}>
            <AiProviderSettings {...providerSettings} />
        </Modal>
    );
}
