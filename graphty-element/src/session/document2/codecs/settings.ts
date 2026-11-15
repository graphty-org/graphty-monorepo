/**
 * @file The `settings` section codec, version 1: project settings no other section holds, and timeline playback (spec 4.4).
 * Experimental (`save-files-v2`).
 *
 * Placement of the `config.set` keys (spec 4.4 rule 1, spec 5 rule 7):
 * - here: `runAlgorithmsOnLoad`, `background`, `selectionStyle`, `pinnedStyle`, `runPlacement`,
 *   `layoutTransition`, every `layoutBehavior.*` key and every `data.*` key;
 * - in view: `viewRotation`, `framing`;
 * - never saved: `author`, `name`, `startingRows`, `editableBase`.
 *
 * KNOWN GAP (the open decision on sorting the remaining settings, version-2.md "Needs the owner"):
 * the `data.*` keys (the known fields, the direction, the on-load algorithms) and the
 * `layoutBehavior.*` keys are placed here because no other section holds them today. The known
 * fields may move to each source's `mapping` in the data section, and the on-load algorithms to
 * the recipe; when they do, they leave `SAVED_HERE` and this codec stops writing them.
 */

import { GraphtyError } from "../../../errors/GraphtyError";
import { CONFIG_KEYS } from "../../configKeys";
import { dispatcherOf } from "../../dispatchers";
import { redactedParams } from "../../sources/member";
import type { SessionVisibilityApi } from "../../visibility/VisibilityApi";
import { projectMemory } from "../memory";
import type {
    DocumentProblem,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    SectionWrite,
    WriteContext,
} from "../types";

/** The `config.set` keys another section holds (view) or no section saves. */
const NOT_HERE: ReadonlySet<string> = new Set([
    "viewRotation",
    "framing",
    "author",
    "name",
    "startingRows",
    "editableBase",
]);

/** The `config.set` keys this section holds, in the order it writes them. */
const SAVED_HERE: readonly string[] = [...CONFIG_KEYS.keys()].filter((key) => !NOT_HERE.has(key));

/** The members of `playback`, in the order it writes them (spec 4.4 rule 2). */
const PLAYBACK_MEMBERS = ["mode", "step", "missing", "outside", "timeZone", "ageFade", "results"] as const;

/** What a read kept that the session cannot hold, written back on the next save. */
interface Kept {
    /** `settings` keys this release does not know, in file order. */
    readonly settings: JsonObject;
    /** `playback` members this release does not know. */
    readonly playback: JsonObject;
    /** The whole `playback` as read, while the timeline is off and it was not applied. */
    readonly heldPlayback?: JsonObject;
}

const KEPT = projectMemory<Kept>();

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns Whether it is.
 */
function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A JSON pointer token (RFC 6901), cut to 256 characters so a report never quotes a huge name.
 * @param key - The member name.
 * @returns The token.
 */
function token(key: string): string {
    return key.slice(0, 256).replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * The value at a dotted path.
 * @param root - Where to start.
 * @param path - The path.
 * @returns The value, or undefined when a step on the way is missing.
 */
function valueAt(root: unknown, path: string): unknown {
    let at = root;
    for (const part of path.split(".")) {
        if (!isObject(at)) {
            return undefined;
        }
        at = at[part];
    }

    return at;
}

/**
 * The column a settings key names, with what its role says of it, or undefined for a key naming none.
 * @param key - The key.
 * @param value - Its value.
 * @returns The `dependencies.columns` entry.
 */
function columnOf(key: string, value: unknown): JsonObject | undefined {
    if (!key.startsWith("data.knownFields.") || !key.endsWith("Path") || typeof value !== "string" || value === "") {
        return undefined;
    }

    // Only what the role says is written; the column's own type is the data's to declare.
    if (/Time(End)?Path$/.test(key)) {
        return { name: value, schema: { measurement: "time" } };
    }

    return { name: value, schema: key.endsWith("WeightPath") ? { measurement: "quantitative" } : {} };
}

/**
 * The session's playback settings as the section writes them, or undefined when none are set.
 * @param context - The save.
 * @param kept - What the last read kept.
 * @returns The `playback` member.
 */
function playbackOf(context: WriteContext, kept: Kept | undefined): JsonObject | undefined {
    const live = dispatcherOf(context.session).state.visibility.playback;
    if (live === null || live === undefined) {
        return kept?.heldPlayback;
    }

    const written: JsonObject = {};
    for (const member of PLAYBACK_MEMBERS) {
        if (live[member] !== undefined) {
            written[member] = live[member];
        }
    }

    // A JSON copy, not structuredClone: it drops undefined members, as the file will.
    return JSON.parse(JSON.stringify({ ...written, ...kept?.playback })) as JsonObject; // NOSONAR(S7784): the JSON form is the point
}

/**
 * Write the section from the session.
 * @param context - The save.
 * @returns The header and body.
 */
function write(context: WriteContext): Promise<SectionWrite> {
    const kept = KEPT.get(context.session);
    const settings: JsonObject = {};
    const columns = new Map<string, JsonObject>();
    for (const key of SAVED_HERE) {
        const value = valueAt(context.session.config, key);
        if (value === undefined) {
            continue;
        }

        settings[key] = value;
        const column = columnOf(key, value);
        if (column !== undefined && !columns.has(String(column.name))) {
            columns.set(String(column.name), column);
        }
    }

    // Through JSON, so only what a file can hold remains; secrets as a source's params lose them.
    const body: JsonObject = { settings: redactedParams({ ...settings, ...kept?.settings }) };
    const playback = playbackOf(context, kept);
    if (playback !== undefined) {
        body.playback = playback;
    }

    return Promise.resolve({
        ...(columns.size === 0 ? {} : { header: { dependencies: { columns: [...columns.values()] } } }),
        body,
    });
}

/**
 * Report a part of the section that cannot be read.
 * @param context - The open.
 * @param pointer - Where it is.
 */
function bad(context: ReadContext, pointer: string): void {
    context.problems.push({ code: "E_BAD_DOCUMENT", params: { section: "settings", pointer } });
}

/**
 * The flat settings as a nested `config.set` patch, every known key checked against its schema.
 * Unknown keys are reported and returned to keep; bad and misplaced ones are reported and dropped.
 * @param settings - The `settings` member.
 * @param pointer - Its JSON pointer.
 * @param context - The open.
 * @returns The patch and the unknown keys.
 */
function patchOf(
    settings: JsonObject,
    pointer: string,
    context: ReadContext,
): { patch: JsonObject; unknown: JsonObject; count: number } {
    const patch: JsonObject = {};
    const unknown: JsonObject = {};
    let count = 0;
    for (const [key, value] of Object.entries(settings)) {
        const at = `${pointer}/${token(key)}`;
        const known = CONFIG_KEYS.get(key);
        if (known === undefined || NOT_HERE.has(key)) {
            context.problems.push({ code: "W_UNKNOWN_MEMBER", params: { section: "settings", pointer: at } });
            // A key of another section, or one never saved, is not written back here.
            if (known === undefined) {
                unknown[key] = value;
            }
            continue;
        }

        if (!known.schema.safeParse(value).success) {
            bad(context, at);
            continue;
        }

        const parts = key.split(".");
        const leaf = parts.pop() as string;
        let parent = patch;
        for (const part of parts) {
            parent[part] ??= {};
            parent = parent[part] as JsonObject;
        }
        parent[leaf] = value;
        count++;
    }

    return { patch, unknown, count };
}

/**
 * The known members of a `playback` and the unknown ones, reported.
 * @param playback - The member.
 * @param pointer - Its JSON pointer.
 * @param context - The open.
 * @returns Both halves.
 */
function splitPlayback(
    playback: JsonObject,
    pointer: string,
    context: ReadContext,
): { known: JsonObject; unknown: JsonObject } {
    const known: JsonObject = {};
    const unknown: JsonObject = {};
    for (const [member, value] of Object.entries(playback)) {
        if ((PLAYBACK_MEMBERS as readonly string[]).includes(member)) {
            known[member] = value;
        } else {
            unknown[member] = value;
            context.problems.push({
                code: "W_UNKNOWN_MEMBER",
                params: { section: "settings", pointer: `${pointer}/${token(member)}` },
            });
        }
    }

    return { known, unknown };
}

/**
 * Apply the section to the session, inside the open's transaction.
 * @param section - The section as read.
 * @param context - The open.
 */
async function read(section: ReadSection, context: ReadContext): Promise<void> {
    const { body, pointer } = section;
    const kept: KeptSettings = {
        settings: {},
        playback: {},
    };
    KEPT.set(context.session, kept);

    await readSettings(body.settings, `${pointer}/settings`, context, kept);
    if (body.playback !== undefined) {
        await readPlayback(body.playback, `${pointer}/playback`, context, kept);
    }
}

/** What the settings codec keeps from an open to write back. */
interface KeptSettings {
    settings: JsonObject;
    playback: JsonObject;
    heldPlayback?: JsonObject;
}

/**
 * Apply the `settings` member.
 * @param settings - The member as read.
 * @param at - Its pointer.
 * @param context - The open.
 * @param kept - Where the unknown keys are kept.
 */
async function readSettings(settings: unknown, at: string, context: ReadContext, kept: KeptSettings): Promise<void> {
    if (!isObject(settings)) {
        bad(context, at);
        return;
    }

    const { patch, unknown, count } = patchOf(settings, at, context);
    kept.settings = unknown;
    if (count === 0) {
        return;
    }

    try {
        await context.tx.config.set(patch);
        context.restored.add("config");
    } catch (error) {
        // Each key passed its own schema; one the settings refuse together is the file's fault.
        if (!(error instanceof GraphtyError)) {
            throw error;
        }
        bad(context, at);
    }
}

/**
 * Apply the `playback` member.
 * @param playback - The member as read.
 * @param at - Its pointer.
 * @param context - The open.
 * @param kept - Where the unknown members, or the whole member with the timeline off, are kept.
 */
async function readPlayback(playback: unknown, at: string, context: ReadContext, kept: KeptSettings): Promise<void> {
    if (!isObject(playback)) {
        bad(context, at);
        return;
    }

    if (!context.session.features.has("timeline")) {
        // Kept as read and written back, as version 1 keeps it; it does nothing with the timeline off.
        kept.heldPlayback = playback;
        context.problems.push(featureOff("playback"));
        return;
    }

    const { known, unknown } = splitPlayback(playback, at, context);
    kept.playback = unknown;
    try {
        await (context.tx.visibility as SessionVisibilityApi).restorePlayback(known);
        context.restored.add("visibility");
    } catch (error) {
        if (!(error instanceof GraphtyError)) {
            throw error;
        }
        bad(context, at);
    }
}

/**
 * The report of a part left out with the timeline off, as version 1's `timelineLeftOff` makes it.
 * @param key - The member left out.
 * @returns The problem.
 */
function featureOff(key: string): DocumentProblem {
    return { code: "E_FEATURE_OFF", params: { feature: "timeline", key } };
}

/** The `graphty-settings` section, version 1. */
export const settingsCodec: SectionCodec = {
    section: "settings",
    version: 1,
    reads: [1],
    bound: false,
    members: ["settings", "playback"],
    write,
    read,
};
