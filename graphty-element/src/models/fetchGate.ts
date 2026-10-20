/**
 * @file Whether the scene may fetch a model or picture a layer names (design/rendering/node-models.md
 * section 2.6): at once, never, or once the reader answers through `session.network`. Shared by
 * the model and texture caches, so both ask the same way.
 */

import type { LayerId } from "../catalog/types";
import { type AssetsApiInternal, isAssetId } from "../session/assets/AssetsApi";
import type { FetchQuestion } from "../session/network";
import type { CodedFact } from "../session/shared";
import type { SessionStylesApi } from "../session/styles/StylesApi";

/** The channels that name a fetched asset. */
export type AssetChannel = "node.model" | "node.texture";

/** What the gate reads from the session. */
export interface GateSession {
    readonly assets: AssetsApiInternal;
    readonly styles: SessionStylesApi;
}

/**
 * Whether a host is private, loopback or link-local, which a layer not from code never reaches.
 * @param host - The URL's host name.
 * @returns True for such a host.
 */
export function isPrivateHost(host: string): boolean {
    const name = host.replace(/^\[|\]$/g, "").toLowerCase();
    if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local") || name === "0.0.0.0") {
        return true;
    }

    const v4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(name);
    if (v4 !== null) {
        const a = Number(v4[1]);
        const b = Number(v4[2]);
        return (
            a === 0 ||
            a === 10 ||
            a === 127 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168)
        );
    }

    return (
        name.includes(":") &&
        (name === "::1" ||
            name === "::" ||
            /^f[cd]/.test(name) ||
            name.startsWith("fe80") ||
            name.startsWith("::ffff:"))
    );
}

/**
 * The node layers that name an asset on a channel, literally or in an encoding's value map.
 * @param styles - The style stack.
 * @param ref - What the layers name.
 * @param channel - The channel.
 * @returns Their ids.
 */
export function layersNaming(styles: SessionStylesApi, ref: string, channel: AssetChannel): LayerId[] {
    const ids: LayerId[] = [];
    for (const layer of styles.list()) {
        if (layer.target !== "node") {
            continue;
        }

        const literal = layer.set?.[channel];
        const binding = layer.encode?.[channel] as { map?: Record<string, unknown> } | undefined;
        if (literal === ref || (binding?.map !== undefined && Object.values(binding.map).includes(ref))) {
            ids.push(layer.id);
        }
    }

    return ids;
}

/**
 * Whether an asset a layer names may be fetched: at once (null), never (the refusal), or once the
 * reader answers (the question to put to `session.network`).
 * @param session - The session.
 * @param ref - What a layer named.
 * @param channel - The channel that named it.
 * @returns null, the refusal, or the question.
 */
export function decideFetch(
    session: GateSession,
    ref: string,
    channel: AssetChannel,
): CodedFact | FetchQuestion | null {
    // An asset id, a URL the session already holds (an embedded copy from a project file), or a
    // URL the page's own code named fetches nothing more to decide.
    if (isAssetId(ref) || session.assets.urlRecord(ref) !== undefined || session.styles.modelUrlFromCode(ref)) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(ref, (globalThis as { location?: { href?: string } }).location?.href);
    } catch {
        return null; // Not a URL at all: the intake reports it.
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
        return null; // The intake refuses the scheme.
    }

    const layerIds = layersNaming(session.styles, ref, channel);
    if (isPrivateHost(url.hostname)) {
        return { code: "E_MODEL_URL_BLOCKED", params: { hosts: [url.host], layerIds } };
    }

    if (session.assets.hostAllowed(url.host)) {
        return null;
    }

    const layers = session.styles.list().filter((layer) => layerIds.includes(layer.id));
    let by: FetchQuestion["by"] = "data";
    if (layers.some((layer) => layer.source?.by === "plugin" && layer.source.name === "graphty-ai")) {
        by = "ai";
    } else if (layers.some((layer) => layer.set?.[channel] === ref)) {
        by = "file";
    }

    return { url, kind: channel === "node.model" ? "model" : "texture", by, layerIds };
}
