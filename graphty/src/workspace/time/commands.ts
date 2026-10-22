import { type CommandContext, defineRegistration } from "../commands/registry";
import { stepWindow, togglePlay } from "./timeActions";

/**
 * Why a timeline command cannot run now, or null.
 * @param ctx - the command context.
 * @param ctx.session - the element's session, or null.
 * @returns the reason, or null.
 */
function noTimeline({ session }: CommandContext): string | null {
    if (session === null) {
        return "The graph is still loading";
    }
    return session.time.field === null ? "No time field is set" : null;
}

/** The timeline's commands: step back and forward (comma, period) and play or pause. */
export const registration = defineRegistration({
    owner: "time",
    commands: [
        {
            id: "time.step-back",
            label: "Step time back",
            group: "View",
            keys: [","],
            keywords: ["timeline", "window", "previous"],
            disabled: noTimeline,
            run: ({ session, workspace }) => {
                if (session !== null) {
                    stepWindow(session, workspace, -1);
                }
            },
        },
        {
            id: "time.step-forward",
            label: "Step time forward",
            group: "View",
            keys: ["."],
            keywords: ["timeline", "window", "next"],
            disabled: noTimeline,
            run: ({ session, workspace }) => {
                if (session !== null) {
                    stepWindow(session, workspace, 1);
                }
            },
        },
        {
            id: "time.play",
            label: "Play or pause time",
            group: "View",
            keywords: ["timeline", "animate", "playback"],
            disabled: noTimeline,
            run: ({ session, workspace }) => {
                if (session !== null) {
                    togglePlay(session, workspace);
                }
            },
        },
    ],
});
