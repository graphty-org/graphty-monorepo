/**
 * The reader's shader preferences, kept in this browser and handed to graphty-element's
 * `shaderSettings`: Quality, Motion, and the hashes of the shader texts the reader approved, so a
 * shader the reader ran is not held again on the next visit. The element never stores any of
 * these; it only reads what it is given and fires `shader:approved` for the app to remember.
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { ShaderSettings } from "@graphty/graphty-element/session";
import { useSyncExternalStore } from "react";

import { readPreference, writePreference } from "./preferences";

/** Quality (Graph settings > Shaders): how much GPU work shaders may do. */
export const SHADER_QUALITY = {
    key: "graphty.shaderQuality.v1",
    values: ["auto", "low", "medium", "high"],
    fallback: "auto",
} as const;

/** Motion (Graph settings > Shaders, the canvas menu): whether shaders move, WCAG 2.2.2. */
export const SHADER_MOTION = {
    key: "graphty.shaderMotion.v1",
    values: ["system", "on", "off"],
    fallback: "system",
} as const;

/** The SHA-256 hashes of the shader texts the reader approved, newest last. */
export const TRUSTED_SHADERS_KEY = "graphty.trustedShaders.v1";

/** How many approvals are kept; the oldest go first. */
const TRUSTED_LIMIT = 256;

/** A SHA-256 hash, as the element writes it. */
const HASH = /^[0-9a-f]{64}$/;

/**
 * The approved hashes kept in this browser.
 * @returns the hashes, or none when storage is blocked or holds something else.
 */
function readTrusted(): readonly string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(TRUSTED_SHADERS_KEY) ?? "[]");
        return Array.isArray(parsed)
            ? parsed.filter((each): each is string => typeof each === "string" && HASH.test(each))
            : [];
    } catch {
        return [];
    }
}

/**
 * The settings the element is given, from what this browser keeps.
 * @returns the settings.
 */
function read(): ShaderSettings {
    return Object.freeze({
        quality: readPreference(SHADER_QUALITY),
        motion: readPreference(SHADER_MOTION),
        trustedHashes: readTrusted(),
    });
}

let snapshot: ShaderSettings | null = null;
const listeners = new Set<() => void>();

/**
 * The settings now; one object until a preference changes.
 * @returns the settings.
 */
export function shaderSettings(): ShaderSettings {
    // Read each time, so a change another tab made is seen; the same object while nothing changed.
    const now = read();
    if (snapshot === null || JSON.stringify(snapshot) !== JSON.stringify(now)) {
        snapshot = now;
    }
    return snapshot;
}

/** Reads the preferences again and tells every listener. */
function changed(): void {
    snapshot = read();
    for (const listener of listeners) {
        listener();
    }
}

/**
 * Keeps Quality or Motion.
 * @param change - the one to change and its value.
 * @param change.quality - the new quality.
 * @param change.motion - the new motion.
 */
export function writeShaderPreference(change: {
    readonly quality?: (typeof SHADER_QUALITY.values)[number];
    readonly motion?: (typeof SHADER_MOTION.values)[number];
}): void {
    if (change.quality !== undefined) {
        writePreference(SHADER_QUALITY, change.quality);
    }
    if (change.motion !== undefined) {
        writePreference(SHADER_MOTION, change.motion);
    }
    changed();
}

/**
 * Remembers that the reader approved a shader text.
 * @param hash - its SHA-256 hash, from `shader:approved`.
 */
export function rememberApproval(hash: string): void {
    const kept = readTrusted();
    if (!HASH.test(hash) || kept.includes(hash)) {
        return;
    }
    try {
        localStorage.setItem(TRUSTED_SHADERS_KEY, JSON.stringify([...kept, hash].slice(-TRUSTED_LIMIT)));
    } catch {
        // Storage blocked: the approval holds for this page view only, in the element.
    }
    changed();
}

/**
 * Listens for a change.
 * @param listener - called after each change.
 * @returns stops listening.
 */
function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * The shader settings now, kept current.
 * @returns the settings.
 */
export function useShaderSettings(): ShaderSettings {
    return useSyncExternalStore(subscribe, shaderSettings);
}

/**
 * Hands the preferences to an element, now and on every change, and remembers each approval it
 * announces.
 * @param element - the element.
 * @returns stops both.
 */
export function bindShaderSettings(element: GraphtyElement): () => void {
    element.shaderSettings = shaderSettings();
    const stop = subscribe(() => {
        element.shaderSettings = shaderSettings();
    });
    const off = element.session.on("shader:approved", ({ hash }) => {
        rememberApproval(hash);
    });
    return () => {
        stop();
        off();
    };
}
