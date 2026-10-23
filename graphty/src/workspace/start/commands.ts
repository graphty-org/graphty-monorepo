import { START_SAMPLES, type StartSample } from "../../data/sampleManifest";
import { type Command, defineRegistration } from "../commands/registry";
import { openDataPage } from "../data-page/request";
import { unlessUnsaved } from "../project/actions";
import { chooseAndOpenFile, openSample } from "./open";

/**
 * The id of the command that opens one start-screen sample.
 * @param sample - the sample.
 * @returns the command id.
 */
export function sampleCommandId(sample: StartSample): string {
    return `sample.open.${sample.id}`;
}

/** One command per start-screen sample: opens it as a new project, asking first over unsaved changes. */
const SAMPLE_COMMANDS: Command[] = START_SAMPLES.map((sample) => ({
    id: sampleCommandId(sample),
    label: `Open sample: ${sample.name}`,
    group: "Project",
    keywords: ["sample", "example", "dataset"],
    description: sample.sentence,
    run: (ctx) => {
        unlessUnsaved(ctx, () => {
            openSample(ctx.workspace, sample);
        });
    },
}));

/**
 * The Start screen package's commands: Open project or file..., New from data... and one per
 * sample, the ways in on the start screen, also in the main menu.
 */
export const registration = defineRegistration({
    owner: "start",
    commands: [
        {
            id: "file.open",
            label: "Open project or file...",
            group: "Project",
            keys: ["Mod+O"],
            description: "A data, recipe or style file is added to this project; a project file opens in its place.",
            run: chooseAndOpenFile,
        },
        {
            id: "data.new",
            label: "New from data...",
            group: "Data",
            run: (ctx) => {
                unlessUnsaved(ctx, () => {
                    // The data opens as a new graph, so Cancel goes back to the start screen
                    // rather than leaving an empty Untitled project behind.
                    ctx.workspace.set({ project: null, place: "graph", inspected: null });
                    openDataPage(ctx.workspace, { intent: "new" });
                });
            },
        },
        ...SAMPLE_COMMANDS,
    ],
});
