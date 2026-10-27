import { type CommandContext, defineRegistration } from "../commands/registry";
import { seekEdge, stepWindow, togglePlay } from "./timeActions";

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

/** The timeline's commands: show or hide it (T), step back and forward (comma, period), jump to either end (Shift with them) and play or pause. */
export const registration = defineRegistration({
    owner: "time",
    commands: [
        {
            id: "timeline.toggle",
            label: "Timeline",
            group: "View",
            keys: ["T"],
            keywords: ["time", "playback", "window", "dock"],
            description: "Show or hide the timeline",
            // Only with a time field: without one there is no timeline to show.
            shown: ({ session }) => session !== null && session.time.field !== null,
            run: ({ workspace }) => {
                workspace.set((state) => ({ timelineOpen: !state.timelineOpen }));
            },
        },
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
            id: "time.start",
            label: "Jump time to the start",
            group: "View",
            // Shift+comma: the key it types, whatever the layout calls it.
            keys: ["<"],
            keywords: ["timeline", "window", "first", "beginning"],
            disabled: noTimeline,
            run: ({ session, workspace }) => {
                if (session !== null) {
                    seekEdge(session, workspace, "start");
                }
            },
        },
        {
            id: "time.end",
            label: "Jump time to the end",
            group: "View",
            // Shift+period.
            keys: [">"],
            keywords: ["timeline", "window", "last"],
            disabled: noTimeline,
            run: ({ session, workspace }) => {
                if (session !== null) {
                    seekEdge(session, workspace, "end");
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
