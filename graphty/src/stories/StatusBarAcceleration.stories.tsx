/**
 * The status bar's acceleration chip, drawn from a fixed status.
 *
 * The chip says whether the element is using a GPU and which one. Its words come from
 * `formatAcceleration`, the same pure function the shell feeds with the acceleration status
 * graphty-element publishes, so these boards draw exactly what the running app draws for those
 * two statuses -- with no element, no peer package and no GPU on the page. That is deliberate:
 * a board that probed a real device would snapshot differently on every machine, and the real
 * device is checked in the running app instead.
 *
 * The device-lost board also draws the toast the shell raises on an `error` status: the reason
 * the element gave, an `Open Settings` link, and no dismiss timer.
 */

import type { AccelerationStatus } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";

import { formatAcceleration } from "../components/shell/statusbar/formatAcceleration";
import { StatusBar } from "../components/shell/statusbar/StatusBar";
import type { StatusBarCompletion } from "../components/shell/statusbar/statusBarModel";
import type { StatusBarCounts } from "../components/shell/types";

/** The bar takes its width from its parent, so the host is a desktop-width shell. */
const WIDE_SHELL = 1440;

/**
 * The host's height.
 *
 * The bar sits at the BOTTOM of the shell and its toast hangs above it, so a host with
 * no room above the bar snapshots the chip alone and nothing else -- which is how the
 * device-lost board first shipped with no picture of the sentence it exists to show.
 * 200 px is enough for the toast and for the gap it keeps.
 */
const SHELL_HEIGHT = 200;

/** The toast's link, the same words as the shell's `OPEN_SETTINGS_ACTION`. */
const OPEN_SETTINGS_ACTION = "Open Settings";

/** A loaded dataset's counts, so the chip is seen beside the slot it sits next to. */
const COUNTS_SLOT: StatusBarCounts = {
    nodes: "20 nodes",
    edges: "29 edges",
    title: "20 nodes. 29 edges",
    onClick: () => undefined,
};

interface BoardProps {
    /** The acceleration status, exactly as the element would have published it. */
    readonly status: AccelerationStatus;
    /** The counts slot, on the boards that mean to show a dataset beside the chip. */
    readonly counts?: StatusBarCounts;
}

/** The real status bar, fed the model the shell builds for one fixed status. */
function Board({ status, counts }: BoardProps) {
    const text = formatAcceleration(status);
    const completion: StatusBarCompletion | undefined =
        status.state === "error"
            ? {
                  message: status.reason ?? "The GPU device was lost.",
                  severity: "error",
                  actionLabel: OPEN_SETTINGS_ACTION,
                  onDetails: () => undefined,
              }
            : undefined;

    return (
        <div
            style={{
                width: WIDE_SHELL,
                height: SHELL_HEIGHT,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
            }}
        >
            <StatusBar
                completion={completion}
                slots={{
                    counts,
                    issues: text === null ? undefined : { acceleration: { ...text, onClick: () => undefined } },
                }}
            />
        </div>
    );
}

const meta: Meta<typeof Board> = {
    title: "Shell/Status bar/Acceleration",
    component: Board,
    parameters: {
        layout: "fullscreen",
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A working accelerator at rest: the chip names the vendor and the device family. */
export const On: Story = {
    args: {
        status: { state: "idle", backend: "webgpu", vendor: "nvidia", architecture: "ampere" },
        counts: COUNTS_SLOT,
    },
};

/** The device went away mid-session: the chip reads off and the toast carries the element's reason. */
export const DeviceLost: Story = {
    args: {
        status: { state: "error", code: "E_DEVICE_LOST", reason: "the accelerator's device was lost: reset" },
    },
};
