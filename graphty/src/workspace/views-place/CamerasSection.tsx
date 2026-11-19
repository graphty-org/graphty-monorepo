/**
 * The Views place's Cameras section (design/ui/camera-views-tours-and-capture.md, section 3.1):
 * one card per saved camera, in project order, none set apart. Every write goes through
 * graphty-element's `session.views`; every enable state is the element's `viewProblem`, and every
 * value its `resolveCameraPreset`, worded here. The app keeps only which card is unfolded and
 * which is being renamed.
 */

import { ActionRow, CardList, type CardListItem, ControlSection, DataRow } from "@graphty/compact-mantine";
import type { CameraState, Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession, SavedView } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Select, Text, Tooltip } from "@mantine/core";
import React, { useEffect } from "react";

import { GLYPHS } from "../glyphs";
import { orRefusal } from "../graph-place/actions";
import { ariaKey, formatKey } from "../keys/keys";
import { RowMore, type SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { type CommandDoor, useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { goToSavedView } from "../toolbar/commands";
import { nothingDrawn } from "../toolbar/disabledReasons";
import { cameraViewPhrase, modeListWords } from "../toolbar/viewWords";
import { CAMERA_KEYS, cameraReason, copyName } from "./commands";
import { useDragOrder, useNamedList } from "./useNamedList";

/** Props for CamerasSection. */
interface CamerasProps {
    readonly session: GraphSession;
    readonly element: GraphtyElement | null;
    readonly store: WorkspaceStore;
}

/**
 * A number as the inspect rows show it: one decimal at most.
 * @param value - the number.
 * @returns the words.
 */
function oneDecimal(value: number): string {
    return String(Math.round(value * 10) / 10);
}

/**
 * A point as "12.4, 3, -8.1".
 * @param point - the point.
 * @param point.x - x.
 * @param point.y - y.
 * @param point.z - z, when it has one.
 * @returns the words.
 */
function pointWords(point: { readonly x: number; readonly y: number; readonly z?: number }): string {
    return [point.x, point.y, ...(point.z === undefined ? [] : [point.z])].map((each) => oneDecimal(each)).join(", ");
}

/**
 * An angle in radians as degrees: "46 deg".
 * @param radians - the angle.
 * @returns the words.
 */
function degrees(radians: number): string {
    return `${String(Math.round((radians * 180) / Math.PI))} deg`;
}

/**
 * The read-only rows of an unfolded camera: Kind, Mode and its values as they resolve now.
 * @param session - the element's session.
 * @param element - the element.
 * @param name - the camera.
 * @param saved - the camera.
 * @returns the rows.
 */
function inspectRows(
    session: GraphSession,
    element: GraphtyElement | null,
    name: string,
    saved: SavedView,
): React.JSX.Element[] {
    const followed =
        saved.follows === undefined ? undefined : session.catalog.cameras().find(({ id }) => id === saved.follows);
    const kind =
        saved.follows === undefined
            ? "Fixed"
            : `Recomputed from ${cameraViewPhrase(saved.follows, followed?.plainName)}`;
    let modes: string | null = null;
    if (saved.follows === undefined) {
        const mode = saved.camera?.mode;
        modes = mode === undefined ? "2D and 3D" : modeListWords([mode]);
    } else if (followed !== undefined) {
        modes = modeListWords(followed.modes);
    }
    const rows: [string, string][] = [["Kind", kind], ...(modes === null ? [] : [["Mode", modes] as [string, string]])];
    // The values as the camera gives them now: a following camera moves with the graph. A camera
    // the element cannot resolve now (its view gone, or no pose in this mode) shows none.
    let state: CameraState | null = null;
    try {
        state = element?.resolveCameraPreset(name) ?? null;
    } catch {
        state = saved.camera ?? null;
    }
    return [...rows, ...valueRows(state)].map(([label, value]) => (
        <DataRow key={label} name={label} value={value} stat />
    ));
}

/**
 * A camera's values as rows: Position, Target, Distance and Field of view for a 3D pose; Zoom,
 * Pan and Turn for a 2D one.
 * @param state - the pose, or null.
 * @returns the rows, as label and value.
 */
function valueRows(state: CameraState | null): [string, string][] {
    const rows: [string, string][] = [];
    if (state?.position !== undefined) {
        rows.push(["Position", pointWords(state.position)]);
        if (state.target !== undefined) {
            rows.push(["Target", pointWords(state.target)]);
        }
        const distance = state.cameraDistance ?? state.radius;
        if (distance !== undefined) {
            rows.push(["Distance", oneDecimal(distance)]);
        }
        if (state.fov !== undefined) {
            rows.push(["Field of view", degrees(state.fov)]);
        }
    } else if (state?.zoom !== undefined) {
        rows.push(["Zoom", oneDecimal(state.zoom)]);
        if (state.pan !== undefined) {
            rows.push(["Pan", pointWords(state.pan)]);
        }
        rows.push(["Turn", degrees(state.rotation ?? 0)]);
    }
    return rows;
}

/**
 * The Key list's choices: None, then the camera digits, a digit another camera holds named with
 * it ("7 -- Hub"); a key outside the digits (written through the API) is kept as a choice of its own.
 * @param session - the element's session.
 * @param name - the camera.
 * @returns the choices.
 */
function keyChoices(session: GraphSession, name: string): { value: string; label: string }[] {
    const holders = new Map<string, string>();
    for (const [each, saved] of session.views) {
        if (saved.key !== undefined && each !== name) {
            holders.set(saved.key, each);
        }
    }
    const own = session.views.get(name)?.key;
    return [
        { value: "", label: "None" },
        ...CAMERA_KEYS.map((key) => {
            const holder = holders.get(key);
            return { value: key, label: holder === undefined ? key : `${key} -- ${holder}` };
        }),
        ...(own === undefined || (CAMERA_KEYS as readonly string[]).includes(own) ? [] : [{ value: own, label: own }]),
    ];
}

/**
 * The Cameras section: a ControlSection with Save camera in its header and one card per camera,
 * each action on a card with exactly one control.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.element - the element
 * @param props.store - the chrome store
 * @returns The section
 */
export function CamerasSection({ session, element, store }: CamerasProps): React.JSX.Element {
    const workspace = useWorkspace();
    const save = useCommand("camera.save");
    const opened = useWorkspaceState((state) => state.viewsCamerasOpen);
    const lastView = useWorkspaceState((state) => state.lastView);
    const asked = useWorkspaceState((state) => state.viewsRename);
    const { names, setOpen, setRenaming, wrapper, deleteItems, listProps, cards } = useNamedList(
        session.views,
        store,
        // The camera last gone to keeps its mark under its new name.
        (from, to) => {
            store.set((state) => (state.lastView === from ? { lastView: to } : {}));
        },
    );
    // Reordered by the grip alone: a drag is one move, Alt+Up and Alt+Down one move each.
    const drag = useDragOrder(names, (name, to) => orRefusal(store, `move ${name}`, session.views.move(name, to)));
    // Save camera (V, or the section's +) asks for its new card unfolded with its name open.
    useEffect(() => {
        if (asked !== null && session.views.has(asked)) {
            store.set({ viewsRename: null });
            setOpen(asked);
            setRenaming(asked);
        }
    }, [asked, session, store, setOpen, setRenaming]);

    const go = (name: string): void => {
        void orRefusal(store, `go to ${name}`, goToSavedView(workspace, name));
    };
    const update = (name: string): void => {
        // Saving under its own name keeps its key and place, and makes a following camera fixed.
        void orRefusal(store, `update ${name}`, session.views.save([{ name }]));
    };
    const setKey = (name: string, key: string | null): void => {
        const holder =
            key === null
                ? undefined
                : [...session.views].find(([each, saved]) => each !== name && saved.key === key)?.[0];
        void orRefusal(store, `set the key of ${name}`, session.views.setKey(name, key)).then(() => {
            if (holder !== undefined && session.views.get(name)?.key === key) {
                store.set({ announcement: `Moved key ${key} from ${holder} to ${name}` });
            }
        });
    };
    const duplicate = (name: string, saved: SavedView): void => {
        const copy = copyName(session.views, name);
        void orRefusal(
            store,
            `duplicate ${name}`,
            session.views.save([
                saved.follows === undefined
                    ? { name: copy, camera: saved.camera }
                    : { name: copy, follows: saved.follows },
            ]),
        );
    };

    const card = (name: string, saved: SavedView): CardListItem => {
        const reason = cameraReason(element, name, saved);
        const goReason = nothingDrawn(session) ?? reason;
        const { key } = saved;
        const items: SelectionMenuItem[] = [
            {
                id: "export",
                label: "Export image...",
                icon: "picture",
                group: "edit",
                reason: goReason,
                onRun: () => {
                    store.set({ dialog: "export", exportOn: "image", exportSource: null });
                },
            },
            {
                id: "duplicate",
                label: "Duplicate",
                icon: "duplicate",
                group: "edit",
                onRun: () => {
                    duplicate(name, saved);
                },
            },
            ...deleteItems(name),
        ];
        const choices = keyChoices(session, name);
        const badKey = key !== undefined && !(CAMERA_KEYS as readonly string[]).includes(key);
        const goTip = goReason ?? (key === undefined ? `Go to ${name}` : `Go to ${name} (${key})`);
        return {
            id: name,
            title: name,
            off: reason !== null,
            aside:
                key === undefined ? undefined : (
                    <Text span size="xs" c="dimmed" className="vp-key" aria-label={`Key ${key}`}>
                        {key}
                    </Text>
                ),
            header: (
                <Tooltip label={goTip}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`Go to ${name}`}
                        aria-keyshortcuts={key === undefined || badKey ? undefined : key}
                        aria-current={lastView === name ? "true" : undefined}
                        aria-disabled={goReason === null ? undefined : true}
                        aria-description={goReason ?? undefined}
                        onClick={() => {
                            if (goReason === null) {
                                go(name);
                            }
                        }}
                    >
                        <GLYPHS.go size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            ),
            menu: <RowMore name={name} items={items} />,
            children: (
                <div className="vp-inspect">
                    {inspectRows(session, element, name, saved)}
                    <Select
                        className="vp-key-select"
                        size="xs"
                        label="Key"
                        data={choices}
                        value={key ?? ""}
                        error={badKey ? "Not a camera key" : undefined}
                        allowDeselect={false}
                        comboboxProps={{ withinPortal: true }}
                        onChange={(value) => {
                            if (value !== null && value !== (key ?? "")) {
                                setKey(name, value === "" ? null : value);
                            }
                        }}
                    />
                    <ActionRow
                        actions={
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                aria-disabled={save?.disabledReason === null ? undefined : true}
                                aria-description={save?.disabledReason ?? undefined}
                                onClick={() => {
                                    if (save?.disabledReason === null) {
                                        update(name);
                                    }
                                }}
                            >
                                Update to current camera
                            </Button>
                        }
                    />
                </div>
            ),
        };
    };

    return (
        <div className="vp-cameras" ref={wrapper}>
            <ControlSection
                label="Cameras"
                opened={opened}
                onOpenChange={(next) => {
                    store.set({ viewsCamerasOpen: next });
                }}
                actions={save === null ? null : <SaveCameraButton save={save} />}
            >
                {names.length === 0 ? (
                    <ActionRow state="No cameras" />
                ) : (
                    <div onPointerDownCapture={drag.onPointerDownCapture}>
                        <CardList
                            label="Saved cameras"
                            items={cards(drag.order, (name) => session.views.get(name), card)}
                            {...listProps}
                            {...drag.listProps}
                        />
                    </div>
                )}
            </ControlSection>
        </div>
    );
}

/**
 * The section's Save camera button, its key in its tooltip.
 * @param props - Component props
 * @param props.save - the Save camera command's door
 * @returns The button
 */
function SaveCameraButton({ save }: Readonly<{ save: CommandDoor }>): React.JSX.Element {
    const key = save.command.keys?.[0];
    const label = key === undefined ? save.command.label : `${save.command.label} (${formatKey(key)})`;
    return (
        <Tooltip label={save.disabledReason === null ? label : `${label}: ${save.disabledReason}`}>
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={save.command.label}
                aria-keyshortcuts={key === undefined ? undefined : ariaKey(key)}
                aria-disabled={save.disabledReason === null ? undefined : true}
                aria-description={save.disabledReason ?? undefined}
                onClick={save.disabledReason === null ? save.run : undefined}
            >
                <GLYPHS.add size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
}
