import { START_SAMPLES, type StartSample } from "../../data/sampleManifest";
import { type Command, defineRegistration } from "../commands/registry";
import { openDataPage } from "../data-page/request";
import { unlessUnsaved } from "../project/actions";
import { chooseAndOpenFile, openSample, pasteSource } from "./open";

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
 * The Start screen package's commands: Open project or file... and New from data..., the two ways
 * in on the start screen, also on the File list; and the Sources "+" doors to add data: File...,
 * Samples... and Paste (data prototype spec section 3.2); and one per start-screen sample.
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
            id: "data.add-file",
            label: "File...",
            group: "Data",
            keywords: ["add", "source", "open"],
            run: chooseAndOpenFile,
        },
        {
            id: "data.samples",
            label: "Samples...",
            group: "Data",
            keywords: ["add", "source", "example"],
            run: (ctx) => {
                ctx.workspace.set({ dialog: "samples" });
            },
        },
        {
            id: "data.add-paste",
            label: "Paste",
            group: "Data",
            keywords: ["add", "source", "clipboard"],
            run: pasteSource,
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
