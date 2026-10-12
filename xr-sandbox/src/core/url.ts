// The page URL (design section 4.2): a preset, techniques added or removed, settings, the data,
// the step list, the session mode and the dry-run switches.

/** A named mix of techniques and settings. */
export interface Preset {
    id: string;
    name: string;
    graph: "florentine" | "dense";
    techniques: string[];
    settings?: Record<string, string | number | boolean>;
    /** The question this preset serves, shown on the landing page. */
    question: string;
}

/** Everything the URL can say. */
interface PageParams {
    preset: string;
    on: string[];
    off: string[];
    /** `s.<technique>.<key>=<value>` and `s.framework.<key>=<value>`, keyed "<technique>.<key>". */
    settings: Record<string, string>;
    graph?: "florentine" | "dense";
    n: number;
    seed: number;
    steps?: string;
    mode: "immersive-vr" | "immersive-ar";
    emulate?: string;
    still: boolean;
}

const list = (v: string | null): string[] => (v ? v.split(",").filter(Boolean) : []);

/**
 * Read the page parameters.
 * @param search - `location.search`
 * @returns the parameters, with defaults filled in
 */
export function parseParams(search: string): PageParams {
    const q = new URLSearchParams(search);
    const settings: Record<string, string> = {};
    for (const [k, v] of q) {
        if (k.startsWith("s.")) {
            settings[k.slice(2)] = v;
        }
    }
    const graph = q.get("graph");
    return {
        preset: q.get("preset") ?? "baseline",
        on: list(q.get("on")),
        off: list(q.get("off")),
        settings,
        graph: graph === "dense" || graph === "florentine" ? graph : undefined,
        n: Math.min(2000, Math.max(16, Number(q.get("n") ?? 480) || 480)),
        seed: Number(q.get("seed") ?? 7) || 7,
        steps: q.get("steps") ?? undefined,
        mode: q.get("mode") === "ar" ? "immersive-ar" : "immersive-vr",
        emulate: q.get("emulate") ?? undefined,
        still: q.get("still") === "1",
    };
}

/** A preset after the URL's changes. */
interface ResolvedPreset {
    preset: Preset;
    techniques: string[];
    graph: "florentine" | "dense";
    settings: Record<string, string | number | boolean>;
}

/**
 * Apply the URL to a preset: add and remove techniques, override settings and the data.
 * @param presets - every named preset
 * @param p - the page parameters
 * @param known - every registered technique id, in registry order
 * @returns the preset as the page will run it
 */
export function resolvePreset(presets: readonly Preset[], p: PageParams, known: readonly string[]): ResolvedPreset {
    const preset = presets.find((x) => x.id === p.preset) ?? presets.find((x) => x.id === "baseline") ?? presets[0];
    const on = new Set([...preset.techniques, ...p.on].filter((id) => known.includes(id) && !p.off.includes(id)));
    return {
        preset,
        techniques: known.filter((id) => on.has(id)),
        graph: p.graph ?? preset.graph,
        settings: { ...preset.settings, ...p.settings },
    };
}

/**
 * The URL that reproduces a mix, for "Save as preset" and the log.
 * @param base - the preset the mix started from
 * @param techniques - the techniques now on
 * @param settings - settings that differ from the defaults
 * @returns a query string, starting with "?"
 */
export function mixUrl(base: Preset, techniques: readonly string[], settings: Record<string, unknown>): string {
    const q = new URLSearchParams({ preset: base.id });
    const on = techniques.filter((t) => !base.techniques.includes(t));
    const off = base.techniques.filter((t) => !techniques.includes(t));
    if (on.length) {
        q.set("on", on.join(","));
    }
    if (off.length) {
        q.set("off", off.join(","));
    }
    for (const [k, v] of Object.entries(settings)) {
        q.set(`s.${k}`, String(v));
    }
    return `?${q.toString()}`;
}
