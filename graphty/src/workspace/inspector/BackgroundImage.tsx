import { ImagePicker } from "@graphty/compact-mantine";
import { prepareBackgroundImage } from "@graphty/graphty-element/session";
import React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { BACKGROUND_SECTION_WORDS } from "../style/words";

/**
 * The background image (compact-mantine's ImagePicker): an address typed in, or an image from this computer, chosen
 * or dropped, prepared by graphty-element and kept in the project as a `data:` address.
 * @param props - Component props
 * @param props.address - the image in effect (an address, or a `data:` address once uploaded), or "" for none
 * @param props.onCommit - writes a new address
 * @returns The field
 */
export function BackgroundImage({
    address,
    onCommit,
}: Readonly<{ address: string; onCommit: (data: string) => void }>): React.JSX.Element {
    const { store } = useWorkspace();
    return (
        <ImagePicker
            label="Sky picture"
            title="Picture"
            value={address === "" ? null : address}
            valueName={address.startsWith("data:") ? "Uploaded picture" : undefined}
            images={[]}
            clearable={false}
            accept="image/*"
            onChange={() => undefined}
            onUrl={onCommit}
            onFiles={([file]) => {
                // graphty-element decodes, turns and scales it; one it cannot use is a failure notice.
                void prepareBackgroundImage(file).then((prepared) => {
                    if (prepared.ok) {
                        onCommit(prepared.data);
                    } else {
                        store.set({
                            notice: { message: BACKGROUND_SECTION_WORDS.notDrawn(prepared.problem), error: true },
                        });
                    }
                });
            }}
        />
    );
}
