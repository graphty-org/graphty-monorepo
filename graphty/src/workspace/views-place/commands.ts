import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession, SavedView } from "@graphty/graphty-element/session";
import { type RefObject, useEffect, useRef } from "react";

import { type Command, type CommandContext, defineRegistration } from "../commands/registry";
import { cameraViewsOn } from "../features";
import { undoOrRedo } from "../frame/historyWords";
import { matchesKey } from "../keys/keys";
import { panelsInView } from "../time/timeActions";
import { goToSavedView, immersiveMode, nextName, savedViewReason } from "../toolbar/commands";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { viewProblemWords } from "../toolbar/viewWords";

/**
 * The keys a camera can hold, in the order the Key list offers them: the digits but 0 (Fit), 5
 * (Switch between 2D and 3D) and 9 (Auto-rotate) (design/ui/camera-views-tours-and-capture.md,
 * section 3.4).
 */
export const CAMERA_KEYS = ["1", "2", "3", "4", "6", "7", "8"] as const;

/** What every command of the Views place carries: it exists only with the camera-views experiment on. */
const GATE = {
    experiment: true,
    feature: "camera-views",
    shown: ({ session }: CommandContext) => cameraViewsOn(session),
} as const;

/**
 * Why a camera cannot be applied now, from the element's `viewProblem` judged as a saved view:
 * "3D only" for a camera that follows a camera view, "Saved in 3D" for a fixed one, "Camera view
 * gone" when the view it follows is no longer registered.
 * @param element - the element.
 * @param name - the camera.
 * @param saved - the camera.
 * @returns the reason, or null.
 */
export function cameraReason(element: GraphtyElement | null, name: string, saved: SavedView): string | null {
    const problem = element?.viewProblem(name, { saved: true }) ?? null;
    if (problem?.code === "E_UNKNOWN_CAMERA" && saved.follows !== undefined) {
        return "Camera view gone";
    }
    return viewProblemWords(problem, saved.follows === undefined);
}

/**
 * Saves the camera on screen as the first free "Camera N", at the end of the list, one undo step.
 * @param session - the element's session.
 * @returns the new camera's name, once saved.
 */
export async function saveCamera(session: GraphSession): Promise<string> {
    const name = nextName(session.views, "Camera");
    await session.views.save([{ name }]);
    return name;
}

/**
 * The saved camera holding a key, if any.
 * @param session - the element's session, or null.
 * @param key - the key, such as "7".
 * @returns the camera's name, or undefined when none holds it.
 */
function cameraOnKey(session: GraphSession | null, key: string): string | undefined {
    return [...(session?.views ?? [])].find(([, view]) => view.key === key)?.[0];
}

/**
 * One camera key's command (section 3.4): goes to the camera holding that digit, animated, like its
 * Camera menu row. A digit no camera holds is disabled, so a press does nothing and says nothing;
 * the key dispatcher already keeps it from a field, and it rests while immersive. Quick actions
 * leaves it out, since it lists the cameras themselves with their keys.
 * @param key - the digit.
 * @returns the command.
 */
function cameraKeyCommand(key: (typeof CAMERA_KEYS)[number]): Command {
    return {
        id: `camera.key-${key}`,
        label: `Go to the camera on ${key}`,
        group: "View",
        keys: [key],
        inPalette: false,
        ...GATE,
        disabled: (ctx) => {
            const name = cameraOnKey(ctx.session, key);
            const active = immersiveMode(ctx.session);
            if (name === undefined) {
                return "No camera on this key";
            }
            return active === null ? savedViewReason(ctx, name) : `Not in ${active.toUpperCase()}`;
        },
        run: async (ctx) => {
            const name = cameraOnKey(ctx.session, key);
            if (name !== undefined) {
                await goToSavedView(ctx, name);
            }
        },
    };
}

/**
 * The Views place's commands (design/ui/camera-views-tours-and-capture.md, sections 3.1, 3.4 and
 * 6): the place itself, Save camera on V, which works with the place closed, and the camera keys.
 */
export const registration = defineRegistration({
    owner: "views-place",
    commands: [
        {
            id: "place.views",
            label: "Views",
            group: "Go to",
            keywords: ["camera", "tour", "video", "hotkey"],
            ...GATE,
            // A door (Quick actions, All cameras...) moves focus into Cameras, unless it asked for
            // another section first (the Export dialog asks for Video tours). The rail clears it.
            run: ({ workspace }) => {
                const viewsFocus = workspace.get().viewsFocus ?? "cameras";
                workspace.set({ page: "panels", place: "views", ...panelsInView(), viewsFocus });
            },
        },
        {
            // Keeps the camera under a name. One undoable step: the element saves the camera on screen.
            id: "camera.save",
            label: "Save camera",
            group: "View",
            keys: ["V"],
            keywords: ["view", "save view"],
            ...GATE,
            // The element refuses to save while immersive: the headset's camera is no 2D or 3D state.
            disabled: ({ session }) => {
                const active = immersiveMode(session);
                return nothingDrawn(session) ?? (active === null ? null : `Not in ${active.toUpperCase()}`);
            },
            run: async ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const name = await saveCamera(session);
                const { page, place } = workspace.get();
                if (page === "panels" && place === "views") {
                    // The place unfolds the new card and opens its name to rename.
                    workspace.set({ viewsCamerasOpen: true, viewsRename: name, announcement: `Saved ${name}` });
                    return;
                }
                workspace.set({
                    notice: {
                        message: `Saved ${name}`,
                        action: {
                            label: "Undo",
                            run: () => {
                                void undoOrRedo(session, true, workspace);
                            },
                        },
                    },
                });
            },
        },
        ...CAMERA_KEYS.map((key) => cameraKeyCommand(key)),
    ],
});

/**
 * Moves a camera or tour one place up or down its list.
 * @param list - the list, `session.views` or `session.tours`.
 * @param name - the item.
 * @param by - -1 for up, 1 for down.
 * @returns the write, or undefined at the list's end.
 */
export function moveBy(
    list: GraphSession["views"] | GraphSession["tours"],
    name: string,
    by: -1 | 1,
): Promise<void> | undefined {
    const names = [...list.keys()];
    const to = names.indexOf(name) + by;
    return to < 0 || to >= names.length ? undefined : list.move(name, to);
}

/**
 * A copy's name: "Hub 2", then "Hub 3" and on, the first not saved yet.
 * @param saved - the names saved.
 * @param name - the item copied.
 * @returns the name.
 */
export function copyName(saved: ReadonlyMap<string, unknown>, name: string): string {
    let n = 2;
    while (saved.has(`${name} ${String(n)}`)) {
        n += 1;
    }
    return `${name} ${String(n)}`;
}

/** The list-local keys a card header takes (section 3.1): F2, Delete, Mod+] and Mod+[. */
export type CardKey = "rename" | "delete" | "up" | "down";

/**
 * Which list-local key a press is.
 * @param event - the press.
 * @returns the key, or null for any other press.
 */
function headerKey(event: KeyboardEvent): CardKey | null {
    if (event.key === "F2") {
        return "rename";
    }
    if (event.key === "Delete") {
        return "delete";
    }
    if (matchesKey(event, "Mod+]")) {
        return "up";
    }
    return matchesKey(event, "Mod+[") ? "down" : null;
}

/**
 * Reads the list-local keys as they bubble from a card's header controls (CardList's grip, fold,
 * title and the header slot's buttons) to the list's wrapper; keys from a card's body, its footer,
 * a field or a menu are left alone. A handled key calls `preventDefault`, so F2 is not the
 * project's rename and Mod+[ is not the browser's Back.
 * @param onKey - runs a key on the card it came from, by its id.
 * @returns the ref for the wrapper.
 */
export function useHeaderKeys(onKey: (id: string, key: CardKey) => void): RefObject<HTMLDivElement | null> {
    const wrapper = useRef<HTMLDivElement>(null);
    const latest = useRef(onKey);
    latest.current = onKey;
    useEffect(() => {
        const box = wrapper.current;
        const listen = (event: KeyboardEvent): void => {
            const target = event.target as HTMLElement;
            const id = target.closest<HTMLElement>("[data-card-id]")?.dataset.cardId;
            if (id === undefined || target.closest(".cm-card-head") === null || target.closest("input") !== null) {
                return;
            }
            const key = headerKey(event);
            if (key !== null) {
                event.preventDefault();
                event.stopPropagation();
                latest.current(id, key);
            }
        };
        box?.addEventListener("keydown", listen);
        return () => {
            box?.removeEventListener("keydown", listen);
        };
    }, []);
    return wrapper;
}
