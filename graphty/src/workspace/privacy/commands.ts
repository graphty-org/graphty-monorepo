import { defineRegistration } from "../commands/registry";
import { readUsageAnswer } from "./usageData";

/**
 * The usage data package's commands: Settings > Privacy (the privacy chip's door) and Report a
 * problem, the feedback widget that is part of usage data.
 */
export const registration = defineRegistration({
    owner: "privacy",
    commands: [
        {
            id: "settings.privacy",
            label: "Privacy settings",
            group: "Settings and help",
            keywords: ["usage data"],
            run: ({ workspace }) => {
                workspace.set({ dialog: "settings:privacy" });
            },
        },
        {
            id: "help.report",
            label: "Report a problem",
            group: "Settings and help",
            disabled: () =>
                readUsageAnswer() === "share" ? null : "Turn on usage data in Settings > Privacy to send a report",
            run: ({ workspace }) => {
                workspace.set({ dialog: "report" });
            },
        },
    ],
});
