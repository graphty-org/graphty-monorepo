/**
 * @file The `settings` section codec, version 1: project settings no other section holds, and timeline playback (spec 4.4).
 *
 *
 * `settings` is keyed by the names the spec's settings table gives (spec 4.4 rule 1), never by
 * graphty-element's `config.set` paths: `SETTINGS` maps each name to the config path it reads and
 * writes. The `config.set` keys it leaves out (spec 5 rule 7):
 * - in view: `viewRotation`, `framing`;
 * - in the data section (the direction, a mapping role, `repeatedEdges`, the key rule): the
 *   `data.*` keys with a home there, never written here;
 * - refused on save and reported (`NO_HOME`): the `data.*` keys with no home, when not at their
 *   default;
 * - never saved: `author`, `name`, `startingRows`, `editableBase`, and the per-project bookkeeping
 *   `timelineHiddenAdded` and `startingCamerasWritten`, worked out when a file opens (spec 8.2 rule 2).
 */

import { GraphtyError } from "../../../errors/GraphtyError";
import { CONFIG_KEYS } from "../../configKeys";
import { dispatcherOf } from "../../dispatchers";
import { redactedParams } from "../../sources/member";
import type { SessionVisibilityApi } from "../../visibility/VisibilityApi";
import { projectMemory } from "../memory";
import type { JsonObject, ReadContext, ReadSection, SectionCodec, SectionWrite, WriteContext } from "../types";

/**
 * The settings table (spec 4.4 rule 1): each setting's name in a file, and the `config.set` path
 * it reads and writes, in the order the section writes them. Written by hand from the spec, which
 * owns the names; a test checks every `CONFIG_KEYS` key is here, in `NOT_SETTINGS` or `data.*`.
 */
export const SETTINGS: readonly (readonly [name: string, configPath: string])[] = [
    ["runAlgorithmsOnLoad", "runAlgorithmsOnLoad"],
    ["runPlacement", "runPlacement"],
    ["layoutTransition", "layoutTransition"],
    ["layoutStepsBeforeDraw", "layoutBehavior.preSteps"],
    ["layoutStepsPerFrame", "layoutBehavior.stepMultiplier"],
    ["layoutSettleDelta", "layoutBehavior.minDelta"],
    ["background", "background"],
    ["selectionStyle", "selectionStyle"],
    ["pinnedStyle", "pinnedStyle"],
    ["timelineHiddenLook", "timelineHiddenLook"],
    ["minMarkSize", "minMarkSize"],
];

/** Each setting's `config.set` path, by its name in a file. */
const PATH_OF: ReadonlyMap<string, string> = new Map(SETTINGS);

/**
 * The `config.set` keys that are never settings (spec 4.4 rule 1): view holds two, and the rest
 * are never saved. Found in a file's `settings`, one is reported and dropped.
 */
export const NOT_SETTINGS: ReadonlySet<string> = new Set([
    "viewRotation",
    "framing",
    "author",
    "name",
    "startingRows",
    "editableBase",
    "timelineHiddenAdded",
    "startingCamerasWritten",
]);

/**
 * The `data.*` keys no section can hold (spec 5 rule 7): a value other than the default is
 * refused on save and reported (spec 8.1 rule 2). `data.algorithms` is among them: the on-load
 * algorithms have no version 2 home.
 */
const NO_HOME: readonly string[] = ["data.algorithms", "data.knownFields.idCoercion", "data.knownFields.positionScale"];

/** The members of `playback`, in the order it writes them (spec 4.4 rule 2). */
// How what lies outside the window draws is the style layers' (`{ match: "state", state: "outsideWindow" }`).
const PLAYBACK_MEMBERS = ["mode", "step", "missing", "timeZone", "ageFade", "results"] as const;

/** What a read kept that the session cannot hold, written back on the next save. */
interface Kept {
    /** The header members the section was read with (spec 8.1 rule 5). */
    readonly header: JsonObject;
    /** `settings` keys this release does not know, in file order. */
    readonly settings: JsonObject;
    /** `playback` members this release does not know. */
    readonly playback: JsonObject;
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
 * The session's playback settings as the section writes them, or undefined when none are set.
 * @param context - The save.
 * @param kept - What the last read kept.
 * @returns The `playback` member.
 */
function playbackOf(context: WriteContext, kept: Kept | undefined): JsonObject | undefined {
    const live = dispatcherOf(context.session).state.visibility.playback;
    if (live === null || live === undefined) {
        return undefined;
    }

    const written: JsonObject = {};
    for (const member of PLAYBACK_MEMBERS) {
        if (live[member] !== undefined) {
            written[member] = live[member];
        }
    }

    // A JSON copy, not structuredClone: it drops undefined members, as the file will.
    const text = JSON.stringify({ ...written, ...kept?.playback });
    return JSON.parse(text) as JsonObject;
}

/**
 * Write the section from the session.
 * @param context - The save.
 * @returns The header and body.
 */
function write(context: WriteContext): Promise<SectionWrite> {
    const kept = KEPT.get(context.session);
    const settings: JsonObject = {};
    for (const [name, path] of SETTINGS) {
        const value = valueAt(context.session.config, path);
        if (value !== undefined) {
            settings[name] = value;
        }
    }

    for (const key of NO_HOME) {
        const value = valueAt(context.session.config, key);
        const unset = CONFIG_KEYS.get(key)?.schema.safeParse(undefined);
        const atDefault = value === undefined || value === null || (unset?.success === true && unset.data === value);
        if (!atDefault && !(Array.isArray(value) && value.length === 0)) {
            context.problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: "settings", field: key } });
        }
    }

    // Through JSON, so only what a file can hold remains; secrets as a source's params lose them.
    const body: JsonObject = { settings: redactedParams({ ...settings, ...kept?.settings }) };
    const playback = playbackOf(context, kept);
    if (playback !== undefined) {
        body.playback = playback;
    }

    // No key written here names a column, so `dependencies` is only what an opened file held.
    return Promise.resolve({ header: kept?.header ?? {}, body });
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
 * The settings as a nested `config.set` patch, every known setting checked against its config
 * key's schema. Unknown keys are reported and returned to keep; bad ones, and a key that is never a
 * setting, are reported and dropped.
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
        const path = PATH_OF.get(key);
        const known = path === undefined ? undefined : CONFIG_KEYS.get(path);
        if (path === undefined || known === undefined) {
            context.problems.push({ code: "W_UNKNOWN_MEMBER", params: { section: "settings", pointer: at } });
            // A key of another section, or one never saved, is not written back here.
            if (!NOT_SETTINGS.has(key) && !key.startsWith("data.")) {
                unknown[key] = value;
            }
            continue;
        }

        if (!known.schema.safeParse(value).success) {
            bad(context, at);
            continue;
        }

        setAt(patch, path, value);
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
        header: Object.fromEntries(
            OWN_HEADER.flatMap((member) =>
                section.header[member] === undefined ? [] : [[member, section.header[member]]],
            ),
        ),
        settings: {},
        playback: {},
    };
    KEPT.set(context.session, kept);

    // Absent, `settings` is empty (its schema default): a file opened as a new session still
    // sets every key to its default, and one added to an open project sets nothing.
    await readSettings(body.settings ?? {}, `${pointer}/settings`, context, kept);
    if (body.playback !== undefined) {
        await readPlayback(body.playback, `${pointer}/playback`, context, kept);
    }
}

/** The header members this codec writes back as an opened section had them. */
const OWN_HEADER = [
    "id",
    "name",
    "description",
    "authors",
    "license",
    "keywords",
    "language",
    "dependencies",
    "origin",
] as const;

/** What the settings codec keeps from an open to write back. */
interface KeptSettings {
    header: JsonObject;
    settings: JsonObject;
    playback: JsonObject;
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
    // Loading onto an open project sets only the keys the section holds; a file opened as a new
    // session sets every absent key to its default (spec 4.4 rule 4).
    const fresh = context.dataMode === "replace" && context.sections.has("data");
    const defaults = fresh ? defaultsFor(settings) : {};
    if (count === 0 && Object.keys(defaults).length === 0) {
        return;
    }

    try {
        await context.tx.config.set(merge(defaults, patch));
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
 * Write a value into a nested patch at a dotted config path, making the objects on the way.
 * @param patch - The patch.
 * @param key - The dotted key.
 * @param value - The value.
 */
function setAt(patch: JsonObject, key: string, value: unknown): void {
    const parts = key.split(".");
    const leaf = parts.pop() as string;
    let parent = patch;
    for (const part of parts) {
        parent[part] ??= {};
        parent = parent[part] as JsonObject;
    }
    parent[leaf] = value;
}

/**
 * Every key this section holds that a section leaves out, at its default, as a nested patch. A key
 * whose default is no value (an optional one) is left as it is.
 * @param settings - The `settings` member as read.
 * @returns The patch.
 */
function defaultsFor(settings: JsonObject): JsonObject {
    const patch: JsonObject = {};
    for (const [name, path] of SETTINGS) {
        const unset = CONFIG_KEYS.get(path)?.schema.safeParse(undefined);
        if (name in settings || unset?.success !== true || unset.data === undefined) {
            continue;
        }

        setAt(patch, path, unset.data);
    }

    return patch;
}

/**
 * Two nested patches as one, the second winning.
 * @param base - The first.
 * @param over - The second.
 * @returns The merged patch.
 */
function merge(base: JsonObject, over: JsonObject): JsonObject {
    const out: JsonObject = { ...base };
    for (const [key, value] of Object.entries(over)) {
        out[key] = isObject(value) && isObject(out[key]) ? merge(out[key], value) : value;
    }

    return out;
}

/**
 * Apply the `playback` member.
 * @param playback - The member as read.
 * @param at - Its pointer.
 * @param context - The open.
 * @param kept - Where the unknown members are kept.
 */
async function readPlayback(playback: unknown, at: string, context: ReadContext, kept: KeptSettings): Promise<void> {
    if (!isObject(playback)) {
        bad(context, at);
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
