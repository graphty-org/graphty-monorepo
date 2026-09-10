import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import type { ActivationEvent, ActivationMeta } from "../../src/types/events";
import { getActivationMeta } from "../../src/types/events";

/**
 * A button that reports the activation meta for both a click and a key press,
 * which is the shape every row in the library uses.
 * @param root0 - Component props
 * @param root0.onActivate - Called with the event and the meta derived from it
 * @returns The probe button
 */
function ActivationProbe({
    onActivate,
}: {
    onActivate: (event: ActivationEvent, meta: ActivationMeta) => void;
}): React.JSX.Element {
    return (
        <button
            type="button"
            onClick={(event) => {
                onActivate(event, getActivationMeta(event));
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    onActivate(event, getActivationMeta(event));
                }
            }}
        >
            Activate
        </button>
    );
}

describe("getActivationMeta", () => {
    it("reports a pointer source for a real click", async () => {
        const user = userEvent.setup();
        const onActivate = vi.fn<(event: ActivationEvent, meta: ActivationMeta) => void>();
        render(<ActivationProbe onActivate={onActivate} />);

        await user.click(screen.getByRole("button"));

        expect(onActivate).toHaveBeenCalled();
        const [, meta] = onActivate.mock.calls[0];
        expect(meta).toStrictEqual({ source: "pointer" });
    });

    it("reports a keyboard source for a key press", async () => {
        const user = userEvent.setup();
        const onActivate = vi.fn<(event: ActivationEvent, meta: ActivationMeta) => void>();
        render(<ActivationProbe onActivate={onActivate} />);

        screen.getByRole("button").focus();
        await user.keyboard("{Enter}");

        expect(onActivate).toHaveBeenCalled();
        const [event, meta] = onActivate.mock.calls[0];
        expect("key" in event).toBe(true);
        expect(meta).toStrictEqual({ source: "keyboard" });
    });

    it("reports a keyboard source for the click a browser synthesises from a key", () => {
        const onActivate = vi.fn<(event: ActivationEvent, meta: ActivationMeta) => void>();
        render(<ActivationProbe onActivate={onActivate} />);

        // A click with no click count is the browser's own default action for
        // Enter or Space on a button, never a pointer.
        fireEvent.click(screen.getByRole("button"), { detail: 0 });

        expect(onActivate).toHaveBeenCalledOnce();
        const [, meta] = onActivate.mock.calls[0];
        expect(meta).toStrictEqual({ source: "keyboard" });
    });

    it("reports a pointer source for a click that carries a click count", () => {
        const onActivate = vi.fn<(event: ActivationEvent, meta: ActivationMeta) => void>();
        render(<ActivationProbe onActivate={onActivate} />);

        fireEvent.click(screen.getByRole("button"), { detail: 1 });

        const [, meta] = onActivate.mock.calls[0];
        expect(meta).toStrictEqual({ source: "pointer" });
    });

    it("hands the consumer the event itself, modifier keys and all", async () => {
        const user = userEvent.setup();
        const onActivate = vi.fn<(event: ActivationEvent, meta: ActivationMeta) => void>();
        render(<ActivationProbe onActivate={onActivate} />);

        await user.keyboard("{Shift>}");
        await user.click(screen.getByRole("button"));
        await user.keyboard("{/Shift}");

        const [event] = onActivate.mock.calls[0];
        expect(event.shiftKey).toBe(true);
    });
});
