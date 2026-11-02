import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { CaptureEstimate } from "@graphty/graphty-element";
import { Alert, Badge, Button, Input, Loader, MultiSelect, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { animationOptions, failureWords, fileName, type VideoChoices } from "./choices";

/** The camera views a tour starts with when no two views are saved. */
const FIRST_TOUR = ["frontView", "isometric", "topView"];

/** Props for VideoOutput. */
interface VideoOutputProps {
    choices: VideoChoices;
    onChange: (choices: VideoChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
}

/**
 * The Video output: a still camera or a tour of views, length and frame rate, the element's
 * dropped-frames estimate as a chip, and Record. Every recording is graphty-element's
 * `captureAnimation`; a tour names its views and the element flies between them.
 * @param props - Component props
 * @param props.choices - The video choices
 * @param props.onChange - Called with new choices
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @returns The output's body and footer
 */
export function VideoOutput({ choices, onChange, onCancel, onDone }: Readonly<VideoOutputProps>): React.JSX.Element {
    const { element, session } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const [estimate, setEstimate] = useState<CaptureEstimate | null>(null);
    const [recording, setRecording] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    const presets = session?.catalog.cameras() ?? [];
    const cameras = new Set(presets.map((camera) => camera.id));
    const saved = session === null ? [] : [...session.views.keys()];
    const firstStops = saved.length >= 2 ? saved : FIRST_TOUR.filter((id) => cameras.has(id));
    const stops = choices.stops.length > 0 ? choices.stops : firstStops;
    const asked: VideoChoices = { ...choices, stops };
    const tourShort = asked.camera === "tour" && stops.length < 2;

    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        void element.estimateAnimationCapture({ duration: choices.seconds * 1000, fps: choices.fps }).then((next) => {
            if (live) {
                setEstimate(next);
            }
        });
        return () => {
            live = false;
        };
    }, [element, choices.seconds, choices.fps]);

    const set = (change: Partial<VideoChoices>): void => {
        setFailure(null);
        onChange({ ...choices, ...change });
    };

    const record = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        setRecording(true);
        setFailure(null);
        const name = fileName(project, asked.camera === "tour" ? "tour" : "view", "webm");
        try {
            const result = await element.captureAnimation(animationOptions(asked, name));
            const file = name.replace(/\.webm$/, `.${result.metadata.format}`);
            const dropped = result.metadata.framesDropped;
            onDone(dropped > 0 ? `Exported ${file}, ${String(dropped)} frames dropped` : `Exported ${file}`, file);
        } catch (error) {
            const code = (error as { code?: unknown } | null)?.code;
            if (code === "E_UNSUPPORTED") {
                setFailure("Tour needs 3D views");
            } else if (error instanceof Error && error.name === "AnimationCancelledError") {
                setFailure(null);
            } else {
                setFailure(failureWords(error));
            }
        } finally {
            setRecording(false);
        }
    };

    return (
        <>
            <div className="ws-export-main">
                <Text fw={550} size="md" role="heading" aria-level={3}>
                    Video
                </Text>
                <div className="ws-export-fields">
                    <Input.Wrapper size="xs" label="Camera">
                        <SegmentedControl
                            fullWidth
                            value={choices.camera}
                            data={[
                                { value: "still", label: "Still" },
                                { value: "tour", label: "Tour" },
                            ]}
                            onChange={(camera) => {
                                set({ camera: camera === "still" ? "still" : "tour" });
                            }}
                        />
                    </Input.Wrapper>
                    <Input.Wrapper size="xs" label="Length">
                        <SegmentedControl
                            fullWidth
                            value={String(choices.seconds)}
                            data={["3", "5", "10"].map((value) => ({ value, label: `${value} s` }))}
                            onChange={(value) => {
                                set({ seconds: Number(value) });
                            }}
                        />
                    </Input.Wrapper>
                    {choices.camera === "tour" ? (
                        <MultiSelect
                            className="ws-export-wide"
                            size="xs"
                            label="Views"
                            data={[
                                ...saved.map((view) => ({ value: view, label: view })),
                                ...presets
                                    .filter((camera) => !saved.includes(camera.id))
                                    .map((camera) => ({ value: camera.id, label: camera.plainName })),
                            ]}
                            value={[...stops]}
                            error={tourShort ? "2 or more" : undefined}
                            onChange={(next) => {
                                set({ stops: next });
                            }}
                        />
                    ) : null}
                    <Input.Wrapper size="xs" label="Frame rate">
                        <SegmentedControl
                            fullWidth
                            value={String(choices.fps)}
                            data={[
                                { value: "30", label: "30 fps" },
                                { value: "60", label: "60 fps" },
                            ]}
                            onChange={(value) => {
                                set({ fps: value === "60" ? 60 : 30 });
                            }}
                        />
                    </Input.Wrapper>
                    <Input.Wrapper size="xs" label="Frames">
                        <div>
                            {estimate === null ? null : (
                                <Tooltip
                                    label={
                                        estimate.recommendedFps === undefined
                                            ? `${String(estimate.totalFrames)} frames`
                                            : `${String(estimate.recommendedFps)} fps recommended`
                                    }
                                >
                                    <Badge
                                        size="sm"
                                        variant="light"
                                        color={estimate.likelyToDropFrames ? "orange" : "gray"}
                                        data-testid="video-frames"
                                    >
                                        {estimate.likelyToDropFrames
                                            ? "May drop frames"
                                            : `${String(estimate.totalFrames)} frames`}
                                    </Badge>
                                </Tooltip>
                            )}
                        </div>
                    </Input.Wrapper>
                </div>
                {failure === null ? null : <Alert color="red" role="alert" title={failure} />}
            </div>
            <ModalFooter className="ws-export-footer">
                <Text size="sm" c="dimmed" className="ws-export-note">
                    {recording ? (
                        <>
                            <Loader size="xs" /> Recording
                        </>
                    ) : null}
                </Text>
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
                <Button disabled={recording || element === null || tourShort} onClick={() => void record()}>
                    Record
                </Button>
            </ModalFooter>
        </>
    );
}
