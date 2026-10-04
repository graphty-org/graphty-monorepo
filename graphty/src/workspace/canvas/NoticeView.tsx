import { Toast } from "@graphty/compact-mantine";
import type React from "react";

import type { Notice } from "../state/store";

/** Props for NoticeView. */
interface NoticeViewProps {
    /** The notice. */
    notice: Notice;
    /** Takes it down. */
    onClose: () => void;
}

/**
 * How one notice looks: compact-mantine's toast with the notice's one action. The Frame's notice
 * slot places it, times it and pauses it on hover; the Canvas package owns its look.
 * @param props - Component props
 * @param props.notice - The notice
 * @param props.onClose - Takes it down
 * @returns The notice
 */
export function NoticeView({ notice, onClose }: Readonly<NoticeViewProps>): React.JSX.Element {
    const { action } = notice;
    return (
        <Toast
            message={notice.message}
            withCloseButton
            onClose={onClose}
            action={
                action === undefined
                    ? undefined
                    : {
                          label: action.label,
                          onClick: () => {
                              action.run();
                              onClose();
                          },
                      }
            }
        />
    );
}
