/**
 * Naming the models and pictures graphty-element holds, and drawing a model's picture. Whether
 * files are a model or a picture, and whether one is fine, is graphty-element's call
 * (`session.assets.add`).
 */

import type { Graphty as GraphtyElement, ModelPreview } from "@graphty/graphty-element";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import {
    type CodedFact,
    type CodedFactParam,
    type GraphSession,
    isAssetId,
    isGraphtyError,
    type ModelChange,
} from "@graphty/graphty-element/session";
import { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";

/**
 * A file's name for the reader: the last part of its path or address, without its query, its
 * fragment or its extension.
 * @param path - a path or an address.
 * @returns the name, or "" when there is none.
 */
export function fileStem(path: string): string {
    const file = path.split(/[?#]/)[0].split("/").pop() ?? "";
    return file.replace(/\.[^.]*$/, "");
}

/**
 * What a layer names, when it is an address and not an asset id.
 * @param ref - what the layer names.
 * @returns the address, or "" for an id.
 */
function addressOf(ref: string): string {
    return isAssetId(ref) ? "" : ref;
}

/**
 * A model's name for the reader: the name the reader gave it, its main file without the extension,
 * or a sample's name.
 * @param session - the element's session.
 * @param ref - what a layer names: an asset id, the id a model had while it waited, or a URL.
 * @returns the name.
 */
export function modelName(session: GraphSession, ref: string): string {
    const sample = session.catalog.models().find((m) => m.id === ref);
    if (sample !== undefined) {
        return sample.plainName;
    }
    const record = session.assets.find(ref);
    return record?.plainName ?? (fileStem(record?.path ?? addressOf(ref)) || "Model");
}

/**
 * A picture's name for the reader: its file name without the extension.
 * @param session - the element's session.
 * @param ref - what `node.texture` names: an asset id or a URL.
 * @returns the name.
 */
export function pictureName(session: GraphSession, ref: string): string {
    return fileStem(session.assets.find(ref)?.path ?? addressOf(ref)) || "Picture";
}

/**
 * Where every model a layer names stands, from graphty-element, read again whenever a model moves on.
 * @param session - the element's session, or null.
 * @returns the latest change of each model.
 */
export function useModelStates(session: GraphSession | null): readonly ModelChange[] {
    const [states, setStates] = useState<readonly ModelChange[]>(() => session?.assets.states() ?? []);
    useEffect(() => {
        if (session === null) {
            setStates([]);
            return undefined;
        }
        setStates(session.assets.states());
        return session.on("model:changed", () => {
            setStates(session.assets.states());
        });
    }, [session]);
    return states;
}

/**
 * Why graphty-element could not draw a model, from what `modelThumbnail` or `modelPreview` threw.
 * @param error - what it threw.
 * @returns the coded reason.
 */
function failureOf(error: unknown): CodedFact {
    return isGraphtyError(error)
        ? { code: error.code, params: error.details as Readonly<Record<string, CodedFactParam>> }
        : { code: "E_MODEL_PARSE", params: {} };
}

/**
 * Why a live preview failed, when the model is to blame: undefined when the preview itself could
 * not draw (no WebGL context for it, or the preview's drawing broke) -- the graph may draw the
 * model well, so that never stops it being added.
 * @param error - what `modelPreview` or its `update` rejected with.
 * @returns the model's failure, or undefined.
 */
function modelFailureOf(error: unknown): CodedFact | undefined {
    return isGraphtyError(error) && error.code !== "E_NO_WEBGL" ? failureOf(error) : undefined;
}

/**
 * Asks graphty-element to draw an accepted model once, small and off screen (`modelThumbnail`),
 * to learn whether it can be drawn at all, for a model the reader has not looked at.
 * @param element - the element.
 * @param ref - what a layer names.
 * @returns why the model cannot be drawn, or undefined when it can (or the picture itself failed).
 */
export async function modelDrawFailure(element: GraphtyElement, ref: string): Promise<CodedFact | undefined> {
    try {
        await element.modelThumbnail(ref, { size: 8 });
        return undefined;
    } catch (error) {
        return modelFailureOf(error);
    }
}

/** A model's picture as graphty-element drew it, or why it could not draw it. */
interface ModelDraw {
    /** The picture's URL, or undefined while it is drawn, failed, or for no model. */
    readonly url: string | undefined;
    /** Why graphty-element could not draw an accepted model (`modelThumbnail`'s rejection), or undefined. */
    readonly failure: CodedFact | undefined;
    /** Asks graphty-element to draw it again: for a decoder whose files did not load. */
    readonly retry: () => void;
}

/**
 * A model's picture, drawn by graphty-element as a node draws it (`modelThumbnail`), or a sample's
 * shipped thumbnail, with the coded reason when graphty-element could not draw it. Drawn again
 * when the model or its style changes.
 * @param ref - what a layer names, or undefined for no model.
 * @param size - the picture's side in CSS pixels; it is drawn at the screen's pixel ratio.
 * @param style - the node's style values the picture is drawn with (Up, Turn, Color...).
 * @param standIn - also draw a model still waiting for parts, its missing pictures and materials
 *     stood in for (`modelThumbnail`'s `standInMissing`).
 * @returns the picture, the failure and a retry.
 */
function useModelDraw(
    ref: string | undefined,
    size: number,
    style?: Readonly<Partial<Record<Channel, ChannelValue>>>,
    standIn = false,
): ModelDraw {
    const { session, element } = useWorkspace();
    // Read again when a model moves on, so a model that just got its parts is drawn.
    useModelStates(session);
    const [attempt, setAttempt] = useState(0);
    const sample = ref === undefined ? undefined : session?.catalog.models().find((m) => m.id === ref)?.thumbnail;
    const record = ref === undefined || sample !== undefined ? undefined : session?.assets.find(ref);
    const key =
        record !== undefined && (record.state === "accepted" || standIn)
            ? // The state too: a waiting model keeps its id and digest once its main file is picked.
              JSON.stringify([ref, record.digest, record.state, size, style ?? null, attempt])
            : undefined;
    const [drawn, setDrawn] = useState<{
        readonly key: string;
        readonly url?: string;
        readonly failure?: CodedFact;
    } | null>(null);
    useEffect(() => {
        if (key === undefined || element === null) {
            return undefined;
        }
        // Read back from the key, so a style object made anew on every render draws once.
        const [asked, , , side, values] = JSON.parse(key) as [
            string,
            string,
            string,
            number,
            Record<string, ChannelValue> | null,
        ];
        let live = true;
        element
            .modelThumbnail(asked, {
                size: side * Math.ceil(window.devicePixelRatio || 1),
                style: values ?? {},
                standInMissing: standIn,
            })
            .then((url) => {
                if (live) {
                    setDrawn({ key, url });
                }
            })
            .catch((error: unknown) => {
                if (live) {
                    setDrawn({ key, failure: failureOf(error) });
                }
            });
        return () => {
            live = false;
        };
    }, [key, element, standIn]);
    const mine = drawn !== null && drawn.key === key ? drawn : undefined;
    return {
        url: sample ?? mine?.url,
        failure: sample === undefined ? mine?.failure : undefined,
        retry: () => {
            setAttempt((n) => n + 1);
        },
    };
}

/**
 * A model's picture (see {@link useModelDraw}): undefined while it is drawn and for a model that
 * cannot be drawn (the cube stands in; the model's own chips say why).
 * @param ref - what a layer names, or undefined for no model.
 * @param size - the picture's side in CSS pixels.
 * @param style - the node's style values the picture is drawn with.
 * @returns the picture's URL, or undefined.
 */
export function useModelPicture(
    ref: string | undefined,
    size: number,
    style?: Readonly<Partial<Record<Channel, ChannelValue>>>,
): string | undefined {
    return useModelDraw(ref, size, style).url;
}

/** A model drawn live by graphty-element (`modelPreview`), or why it could not be drawn. */
export interface ModelLive {
    /** Whether the model is on the preview's canvas now. */
    readonly drawn: boolean;
    /** Whether it is being drawn again with new style values. */
    readonly drawing: boolean;
    /** Why graphty-element could not draw it, or undefined. */
    readonly failure: CodedFact | undefined;
    /** Whether the preview itself could not draw (no WebGL context for it): the model is not to blame. */
    readonly unavailable: boolean;
    /** Asks graphty-element to draw it again: for a decoder whose files did not load. */
    readonly retry: () => void;
    /** Turns the reader's view back to the first one. */
    readonly resetView: () => void;
}

/**
 * A model drawn live by graphty-element in an element of the page (`modelPreview`): the reader
 * turns it by dragging and its clip plays. Drawn again with new style values as they change,
 * keeping the reader's view; drawn anew when the model itself changes (its parts arrive).
 * @param ref - what a layer names, or undefined for no model.
 * @param host - the element the preview fills, or null before it is mounted.
 * @param style - the node's style values it is drawn with.
 * @param label - the preview's name for assistive technology.
 * @param standIn - also draw a model still waiting for parts, with them stood in for.
 * @returns whether it is drawn, the failure, a retry and a reset of the view.
 */
export function useModelPreview(
    ref: string | undefined,
    host: HTMLElement | null,
    style: Readonly<Partial<Record<Channel, ChannelValue>>>,
    label: string,
    standIn = false,
): ModelLive {
    const { session, element } = useWorkspace();
    useModelStates(session);
    const [attempt, setAttempt] = useState(0);
    const record = ref === undefined ? undefined : session?.assets.find(ref);
    const sample = ref !== undefined && session?.catalog.models().some((m) => m.id === ref) === true;
    const key =
        ref !== undefined && (sample || (record !== undefined && (record.state === "accepted" || standIn)))
            ? JSON.stringify([ref, record?.digest, record?.state, attempt])
            : undefined;
    const styleKey = JSON.stringify(style);
    // The style a new preview starts with: the latest, without making a new preview when it changes.
    const startStyle = useRef(styleKey);
    useEffect(() => {
        startStyle.current = styleKey;
    }, [styleKey]);
    // The style the preview last drew with, so it is not drawn twice with the same values.
    const drawnStyle = useRef<string | null>(null);
    const [pending, setPending] = useState(0);
    const [state, setState] = useState<{
        readonly key: string;
        readonly preview?: ModelPreview;
        readonly failure?: CodedFact;
        readonly unavailable?: boolean;
    } | null>(null);
    useEffect(() => {
        if (key === undefined || element === null || host === null) {
            return undefined;
        }
        const [asked] = JSON.parse(key) as [string];
        let live = true;
        let made: ModelPreview | undefined;
        const first = startStyle.current;
        element
            .modelPreview(asked, host, {
                style: JSON.parse(first) as Record<string, ChannelValue>,
                standInMissing: standIn,
            })
            .then((preview) => {
                made = preview;
                if (live) {
                    drawnStyle.current = first;
                    setState({ key, preview });
                } else {
                    preview.dispose();
                }
            })
            .catch((error: unknown) => {
                if (live) {
                    const failure = modelFailureOf(error);
                    setState({ key, failure, unavailable: failure === undefined });
                }
            });
        return () => {
            live = false;
            made?.dispose();
        };
    }, [key, element, host, standIn]);
    const mine = state !== null && state.key === key ? state : undefined;
    const preview = mine?.preview;
    useEffect(() => {
        preview?.canvas.setAttribute("aria-label", label);
        preview?.canvas.setAttribute("role", "img");
    }, [preview, label]);
    useEffect(() => {
        if (preview === undefined || drawnStyle.current === styleKey) {
            return;
        }
        drawnStyle.current = styleKey;
        setPending((n) => n + 1);
        preview
            .update(JSON.parse(styleKey) as Record<string, ChannelValue>)
            .catch((error: unknown) => {
                const failure = modelFailureOf(error);
                setState((now) =>
                    now?.preview === preview ? { key: now.key, failure, unavailable: failure === undefined } : now,
                );
            })
            .finally(() => {
                setPending((n) => n - 1);
            });
    }, [preview, styleKey]);
    return {
        drawn: preview !== undefined,
        drawing: preview !== undefined && pending > 0,
        failure: mine?.failure,
        unavailable: mine?.unavailable === true,
        retry: () => {
            setAttempt((n) => n + 1);
        },
        resetView: () => {
            preview?.resetView();
        },
    };
}
