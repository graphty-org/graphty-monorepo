import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { AnimationProgressEvent, CaptureEstimate, TourPlan } from "@graphty/graphty-element";
import { isGraphtyError } from "@graphty/graphty-element/session";
import { Alert, Button, Input, Progress, Select, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useViewsChanged } from "../toolbar/useViewsChanged";
import { lengthWords, tourProblemWords } from "../toolbar/viewWords";
import { failureWords, fileName, framesWords, tourAnimationOptions, type TourVideoChoices } from "./choices";
import { type ViewChoice, viewChoice } from "./viewChoice";
import { ViewSelect } from "./ViewSelect";

/** Props for TourVideoOutput. */
interface TourVideoOutputProps {
    choices: TourVideoChoices;
    onChange: (choices: TourVideoChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
    /** Told when a recording starts and ends, so the dialog's Escape and close act as Stop. */
    onRecording?: (recording: boolean) => void;
}

/**
 * The element's frame estimate as a value row; when the element expects dropped frames the value
 * is in the warning color, focusable, and its words are its tooltip and its description.
 * @param props - Component props
 * @param props.estimate - the element's estimate, or null before it answers
 * @returns the row
 */
function FramesRow({ estimate }: Readonly<{ estimate: CaptureEstimate | null }>): React.JSX.Element {
    const warningId = useId();
    const words = estimate === null ? null : framesWords(estimate);
    return (
        <Input.Wrapper size="xs" label="Frames">
            {words?.warning === undefined || words.warning === null ? (
                <Text size="sm" data-testid="video-frames">
                    {words?.value}
                </Text>
            ) : (
                <Tooltip label={words.warning}>
                    <Text
                        size="sm"
                        c="var(--cm-text-warning)"
                        tabIndex={0}
                        aria-describedby={warningId}
                        data-testid="video-frames"
                    >
                        {words.value}
                        <span id={warningId} hidden>
                            {words.warning}
                        </span>
                    </Text>
                </Tooltip>
            )}
        </Input.Wrapper>
    );
}

/**
 * The recording's bar, from the element's `animation-progress`, and for a tour the stop it is on,
 * from `tour-progress` (kept in the store by the toolbar).
 * @param props - Component props
 * @param props.tour - the tour recording, or null for a still
 * @returns the bar
 */
function RecordingBar({ tour }: Readonly<{ tour: string | null }>): React.JSX.Element {
    const { element } = useWorkspace();
    const tourProgress = useWorkspaceState((state) => state.tourProgress);
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const onProgress = ({ detail }: CustomEvent<AnimationProgressEvent>): void => {
            setProgress(detail.progress);
        };
        element.addEventListener("animation-progress", onProgress);
        return () => {
            element.removeEventListener("animation-progress", onProgress);
        };
    }, [element]);
    const stop =
        tour !== null && tourProgress?.tour === tour
            ? `Stop ${String(tourProgress.stop + 1)} of ${String(tourProgress.stops)}`
            : null;
    return (
        <div className="ws-export-progress">
            <Progress value={progress} aria-label="Recording" />
            {stop === null ? null : (
                <Text size="xs" c="dimmed">
                    {stop}
                </Text>
            )}
        </div>
    );
}

/** What the frame estimate is asked for: a saved tour, or a still's length. */
type EstimateAsk =
    { readonly tour: string; readonly fps: number } | { readonly duration: number; readonly fps: number };

/**
 * The element's frame estimate for a recording, asked again when what it reads changes.
 * @param element - the element, or null.
 * @param asking - the estimate's options, or null when there is nothing to estimate.
 * @returns the estimate, or null.
 */
function useEstimate(
    element: ReturnType<typeof useWorkspace>["element"],
    asking: EstimateAsk | null,
): CaptureEstimate | null {
    const [estimate, setEstimate] = useState<CaptureEstimate | null>(null);
    const tour = asking !== null && "tour" in asking ? asking.tour : null;
    const duration = asking !== null && "duration" in asking ? asking.duration : null;
    const fps = asking?.fps ?? null;
    useEffect(() => {
        if (element === null || fps === null) {
            setEstimate(null);
            return undefined;
        }
        let current = true;
        element.estimateAnimationCapture(tour === null ? { duration: duration ?? 0, fps } : { tour, fps }).then(
            (next) => {
                if (current) {
                    setEstimate(next);
                }
            },
            () => {
                if (current) {
                    setEstimate(null);
                }
            },
        );
        return () => {
            current = false;
        };
    }, [element, tour, duration, fps]);
    return estimate;
}

/** What a recording would play now, read from the element: the tour or the view, and why not. */
interface VideoTarget {
    /** The saved tours, project order. */
    readonly tours: readonly string[];
    /** The tour asked for, else the first; null with neither. */
    readonly tour: string | null;
    /** Still when there is no tour to play. */
    readonly camera: "still" | "tour";
    readonly plan: TourPlan | null;
    /** Why the tour cannot be recorded, worded. */
    readonly tourReason: string | null;
    readonly views: ViewChoice;
    /** What to ask the frame estimate for, or null when the tour cannot be recorded. */
    readonly ask: EstimateAsk | null;
}

/**
 * What the choices record now: the tour named (or the project's first) and the element's plan of
 * it, or the still view, judged by the element.
 * @param element - the element, or null.
 * @param session - the session, or null.
 * @param choices - the video choices.
 * @returns the target.
 */
function videoTarget(
    element: ReturnType<typeof useWorkspace>["element"],
    session: ReturnType<typeof useWorkspace>["session"],
    choices: TourVideoChoices,
): VideoTarget {
    const tours = session === null ? [] : [...session.tours.keys()];
    const tour = choices.tour ?? tours[0] ?? null;
    const views = viewChoice(element, session, choices.view);
    // With no tours, and none asked for, the camera is still.
    if (tour === null || choices.camera === "still") {
        const ask = { duration: choices.seconds * 1000, fps: choices.fps };
        return { tours, tour, camera: "still", plan: null, tourReason: null, views, ask };
    }
    const plan = element?.planTour(tour) ?? null;
    const tourReason = plan === null ? null : tourProblemWords(plan, element);
    const ask = tourReason === null ? { tour, fps: choices.fps } : null;
    return { tours, tour, camera: "tour", plan, tourReason, views, ask };
}

/** Props for CameraFields. */
interface CameraFieldsProps {
    readonly target: VideoTarget;
    readonly choices: TourVideoChoices;
    readonly recording: boolean;
    readonly set: (change: Partial<TourVideoChoices>) => void;
}

/**
 * The fields that follow Motion: a tour's Tour select and its read-only Length (a tour that is
 * gone stays chosen, in error), or a still's Camera list and its 3 / 5 / 10 s.
 * @param props - Component props
 * @param props.target - what would be recorded
 * @param props.choices - the video choices
 * @param props.recording - whether a recording runs
 * @param props.set - changes the choices
 * @returns the fields
 */
function CameraFields({ target, choices, recording, set }: CameraFieldsProps): React.JSX.Element {
    const { tours, tour, plan } = target;
    if (target.camera === "still") {
        return (
            <>
                <ViewSelect
                    views={target.views}
                    disabled={recording}
                    onChange={(view) => {
                        set({ view });
                    }}
                />
                <Input.Wrapper size="xs" label="Length">
                    <SegmentedControl
                        fullWidth
                        value={String(choices.seconds)}
                        disabled={recording}
                        data={["3", "5", "10"].map((value) => ({ value, label: `${value} s` }))}
                        onChange={(value) => {
                            set({ seconds: Number(value) });
                        }}
                    />
                </Input.Wrapper>
            </>
        );
    }
    return (
        <>
            <Select
                label="Tour"
                data={tour !== null && !tours.includes(tour) ? [...tours, tour] : tours}
                value={tour}
                error={target.tourReason ?? undefined}
                disabled={recording}
                allowDeselect={false}
                onChange={(next) => {
                    if (next !== null) {
                        set({ tour: next });
                    }
                }}
            />
            <Input.Wrapper size="xs" label="Length">
                <Text size="sm" data-testid="video-length">
                    {plan === null ? null : lengthWords(plan.totalMs)}
                </Text>
            </Input.Wrapper>
        </>
    );
}

/**
 * The Video output: a saved tour (its length the element's plan of it) or a still view held for
 * 3, 5 or 10 seconds, the frame rate, the element's frame estimate, and Record. Every recording is
 * graphty-element's `captureAnimation`; the bar follows `animation-progress` and the stop label
 * `tour-progress`. Leaving the output while it records cancels the recording, so nothing records unseen.
 * @param props - Component props
 * @param props.choices - The video choices
 * @param props.onChange - Called with new choices
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @param props.onRecording - Told when a recording starts and ends
 * @returns The output's body and footer
 */
export function TourVideoOutput({
    choices,
    onChange,
    onCancel,
    onDone,
    onRecording,
}: Readonly<TourVideoOutputProps>): React.JSX.Element {
    const { element, session } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const [recording, setRecording] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    useViewsChanged(element);

    const target = videoTarget(element, session, choices);
    const { tour, camera, views } = target;
    const asked: TourVideoChoices = { ...choices, camera, tour };
    const reason = camera === "tour" ? target.tourReason : views.chosen.reason;

    // The recording, for cancelling it when the output closes under it.
    const live = useRef(false);
    useEffect(
        () => () => {
            if (live.current) {
                element?.cancelAnimationCapture();
            }
        },
        [element],
    );

    const estimate = useEstimate(element, target.ask);

    const set = (change: Partial<TourVideoChoices>): void => {
        setFailure(null);
        onChange({ ...asked, ...change });
    };

    const record = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        // Recent keeps the choices the file was made with, the tour named.
        onChange(asked);
        live.current = true;
        setRecording(true);
        onRecording?.(true);
        setFailure(null);
        const name = fileName(project, camera === "tour" && tour !== null ? tour : views.chosen.label, "webm");
        try {
            const result = await element.captureAnimation(tourAnimationOptions(asked, name));
            const file = name.replace(/\.webm$/, `.${result.metadata.format}`);
            const dropped = result.metadata.framesDropped;
            onDone(dropped > 0 ? `Exported ${file}, ${String(dropped)} frames dropped` : `Exported ${file}`, file);
        } catch (error) {
            setFailure(isGraphtyError(error) && error.code === "E_CANCELLED" ? null : failureWords(error));
        } finally {
            live.current = false;
            setRecording(false);
            onRecording?.(false);
        }
    };

    return (
        <>
            <section className="ws-export-main" aria-label="Video">
                <div className="ws-export-fields">
                    <Input.Wrapper size="xs" label="Motion">
                        <SegmentedControl
                            fullWidth
                            value={camera}
                            disabled={recording}
                            data={[
                                { value: "tour", label: "Tour", disabled: tour === null },
                                { value: "still", label: "Still" },
                            ]}
                            onChange={(next) => {
                                set({ camera: next === "tour" ? "tour" : "still" });
                            }}
                        />
                    </Input.Wrapper>
                    <CameraFields target={target} choices={choices} recording={recording} set={set} />
                    <Input.Wrapper size="xs" label="Frame rate">
                        <SegmentedControl
                            fullWidth
                            value={String(choices.fps)}
                            disabled={recording}
                            data={[
                                { value: "30", label: "30 fps" },
                                { value: "60", label: "60 fps" },
                            ]}
                            onChange={(value) => {
                                set({ fps: value === "60" ? 60 : 30 });
                            }}
                        />
                    </Input.Wrapper>
                    <FramesRow estimate={estimate} />
                </div>
                {recording ? <RecordingBar tour={camera === "tour" ? tour : null} /> : null}
                {failure === null ? null : <Alert color="red" role="alert" title={failure} />}
            </section>
            <ModalFooter className="ws-export-footer">
                <Text size="sm" c="dimmed" className="ws-export-note" />
                {recording ? (
                    <Button
                        variant="default"
                        onClick={() => {
                            element?.cancelAnimationCapture();
                        }}
                    >
                        Stop
                    </Button>
                ) : (
                    <Button variant="default" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button disabled={recording || element === null || reason !== null} onClick={() => void record()}>
                    Record
                </Button>
            </ModalFooter>
        </>
    );
}
