// Settings (design section 4.3): every technique's declared settings plus the framework's, keyed
// "<owner>.<key>". Defaults come from the specs, then the preset, then values changed in the
// headset (remembered per preset in localStorage as a convenience), then the URL, which wins.

import type { SettingSpec } from "./technique";

/** A setting value. */
export type SettingValue = boolean | number | string;

/** The framework's own settings, on the gear panel's Framework tab. */
export const FRAMEWORK_SETTINGS: SettingSpec[] = [
    { key: "dominantHand", label: "Dominant hand", kind: "choice", choices: ["right", "left"], default: "right" },
    {
        key: "frameRate",
        label: "Frame rate (auto: 72 on Quest)",
        kind: "choice",
        choices: ["auto", "72", "80", "90", "120"],
        default: "auto",
    },
    { key: "foveation", label: "Foveation", kind: "number", min: 0, max: 1, step: 0.1, default: 0.3 },
    { key: "multiview", label: "Multiview (next Enter)", kind: "bool", default: false },
    {
        key: "framebufferScale",
        label: "Framebuffer scale (reload)",
        kind: "number",
        min: 0.5,
        max: 1,
        step: 0.1,
        default: 1,
    },
    {
        key: "referenceSpace",
        label: "Reference space (next Enter)",
        kind: "choice",
        choices: ["local-floor", "local"],
        default: "local-floor",
    },
    { key: "labels", label: "Node labels", kind: "bool", default: true },
    {
        key: "pickHandsDeg",
        label: "Pick radius, hands (deg)",
        kind: "number",
        min: 0.5,
        max: 4,
        step: 0.5,
        default: 1.5,
    },
    {
        key: "pickControllersDeg",
        label: "Pick radius, controllers (deg)",
        kind: "number",
        min: 0.5,
        max: 4,
        step: 0.5,
        default: 1,
    },
    { key: "hoverHints", label: "Hover hints", kind: "bool", default: true },
    { key: "audioClicks", label: "Audio clicks", kind: "bool", default: true },
    { key: "logPanel", label: "In-headset log", kind: "bool", default: false },
];

/** The settings store. */
export interface Settings {
    get(key: string): SettingValue;
    set(key: string, value: SettingValue): void;
    /** Settings that differ from their spec defaults (for "Save as preset" and the log). */
    changed(): Record<string, SettingValue>;
    onChange(owner: string, fn: (key: string) => void): void;
    /** A short hash of every value, logged with each entry so runs can be grouped. */
    hash(): string;
}

/**
 * Coerce a URL or stored string to the spec's kind.
 * @param spec - the setting
 * @param raw - the value
 * @returns the typed value
 */
function coerce(spec: SettingSpec | undefined, raw: SettingValue): SettingValue {
    if (typeof raw !== "string" || !spec) {
        return raw;
    }
    if (spec.kind === "bool") {
        return raw === "true" || raw === "1";
    }
    if (spec.kind === "number") {
        return Number(raw);
    }
    return raw;
}

/**
 * Create the store.
 * @param specs - every spec, keyed "<owner>.<key>"
 * @param presetId - the preset, for the localStorage key
 * @param preset - the preset's settings
 * @param url - the URL's settings
 * @returns the store
 */
export function createSettings(
    specs: Map<string, SettingSpec>,
    presetId: string,
    preset: Record<string, SettingValue>,
    url: Record<string, string>,
): Settings {
    const storeKey = `xr-sandbox.settings.${presetId}`;
    let stored: Record<string, SettingValue> = {};
    try {
        stored = JSON.parse(localStorage.getItem(storeKey) ?? "{}") as Record<string, SettingValue>;
    } catch {
        stored = {};
    }
    const values = new Map<string, SettingValue>();
    for (const [k, spec] of specs) {
        if (spec.default !== undefined) {
            values.set(k, spec.default);
        }
    }
    for (const layer of [preset, stored, url]) {
        for (const [k, v] of Object.entries(layer)) {
            values.set(k, coerce(specs.get(k), v));
        }
    }
    const listeners = new Map<string, ((key: string) => void)[]>();
    const persist = (): void => {
        try {
            localStorage.setItem(storeKey, JSON.stringify(Object.fromEntries(values)));
        } catch {
            // private window or blocked storage: settings still work for this page
        }
    };
    return {
        get: (k) => values.get(k) ?? false,
        set(k, v) {
            values.set(k, v);
            persist();
            const owner = k.slice(0, k.indexOf("."));
            for (const fn of listeners.get(owner) ?? []) {
                fn(k.slice(owner.length + 1));
            }
        },
        changed() {
            const out: Record<string, SettingValue> = {};
            for (const [k, v] of values) {
                if (specs.get(k)?.default !== v) {
                    out[k] = v;
                }
            }
            return out;
        },
        onChange(owner, fn) {
            listeners.set(owner, [...(listeners.get(owner) ?? []), fn]);
        },
        hash() {
            const text = JSON.stringify([...values].sort(([a], [b]) => a.localeCompare(b)));
            let h = 0;
            for (let i = 0; i < text.length; i++) {
                h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
            }
            return (h >>> 0).toString(36);
        },
    };
}
