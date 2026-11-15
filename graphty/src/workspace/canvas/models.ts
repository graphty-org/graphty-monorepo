/**
 * Naming the models and pictures graphty-element holds, and drawing a model's picture. Whether
 * files are a model or a picture, and whether one is fine, is graphty-element's call
 * (`session.assets.add`).
 */

import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import {
    type CodedFact,
    type CodedFactParam,
    type GraphSession,
    isAssetId,
    isGraphtyError,
    type ModelChange,
} from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

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

/** A model's picture as graphty-element drew it, or why it could not draw it. */
export interface ModelDraw {
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
export function useModelDraw(
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
            ? JSON.stringify([ref, record.digest, size, style ?? null, attempt])
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
        const [asked, , side, values] = JSON.parse(key) as [
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
                    setDrawn({
                        key,
                        failure: isGraphtyError(error)
                            ? { code: error.code, params: error.details as Readonly<Record<string, CodedFactParam>> }
                            : { code: "E_MODEL_PARSE", params: {} },
                    });
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
