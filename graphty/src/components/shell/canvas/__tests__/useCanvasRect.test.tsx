import React, { useRef } from "react";
import { describe, expect, it } from "vitest";

import { render, screen, waitFor } from "../../../../test/test-utils";
import { NARROW_BREAKPOINT } from "../../constants";
import { useCanvasRect } from "../useCanvasRect";

function Probe(props: { readonly width: number; readonly viewportWidth: number }): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    const rect = useCanvasRect(ref, props.viewportWidth);

    return (
        <div>
            <div ref={ref} data-testid="canvas" style={{ width: props.width, height: 300 }} />
            <output data-testid="width">{rect.width}</output>
            <output data-testid="profile">{rect.profile.id}</output>
            <output data-testid="reflowed">{String(rect.reflowed)}</output>
        </div>
    );
}

describe("useCanvasRect", () => {
    describe("measuring", () => {
        it("reports the element's own width, not the window's", async () => {
            render(<Probe width={700} viewportWidth={1440} />);

            await waitFor(() => {
                expect(screen.getByTestId("width")).toHaveTextContent("700");
            });
        });
    });

    describe("the toolbar profile", () => {
        it("takes the desktop profile at the breakpoint", () => {
            render(<Probe width={700} viewportWidth={NARROW_BREAKPOINT} />);

            expect(screen.getByTestId("profile")).toHaveTextContent("desktop");
        });

        it("takes the narrow profile below it", () => {
            render(<Probe width={700} viewportWidth={NARROW_BREAKPOINT - 1} />);

            expect(screen.getByTestId("profile")).toHaveTextContent("narrow");
        });
    });

    describe("the two-line reflow", () => {
        it("does not fire on a canvas wider than the desktop threshold", async () => {
            render(<Probe width={700} viewportWidth={1440} />);

            await waitFor(() => {
                expect(screen.getByTestId("width")).toHaveTextContent("700");
            });

            expect(screen.getByTestId("reflowed")).toHaveTextContent("false");
        });

        it("fires on a canvas below it", async () => {
            render(<Probe width={560} viewportWidth={1440} />);

            await waitFor(() => {
                expect(screen.getByTestId("reflowed")).toHaveTextContent("true");
            });
        });

        /*
         * The narrow bar's threshold is 650 against the desktop bar's 622, so a 640 px
         * canvas reflows under one and not the other. This used to probe at a 1024 px
         * viewport, which was narrow while the layout minimum was 1280.
         *
         * It is NOT any more: the minimum dropped to 1024 on 2026-09-15 so that iPads lay
         * out, and `canvasToolbarProfile` reads the VIEWPORT width, not the canvas width
         * (useCanvasRect.ts:95, AppShell.tsx:4959). A laid-out shell is therefore always
         * at or above 1024 and always takes the desktop bar -- so the narrow profile is
         * now reachable only below the width at which the shell draws anything at all.
         *
         * The probe moves to just under the minimum to keep testing the thing it names,
         * and this comment is the record that the branch it covers is dead in production.
         * Deleting the narrow profile is the honest follow-up; it is not done here
         * because the profile is also what CanvasRegion reads for its chip-versus-card
         * form, and that wants its own look rather than a rename in a test file.
         */
        it("fires between the two thresholds only with the narrow bar", async () => {
            render(<Probe width={640} viewportWidth={NARROW_BREAKPOINT - 1} />);

            await waitFor(() => {
                expect(screen.getByTestId("reflowed")).toHaveTextContent("true");
            });
        });

        it("does NOT fire at the same canvas width once the viewport lays out", async () => {
            render(<Probe width={640} viewportWidth={NARROW_BREAKPOINT} />);

            await waitFor(() => {
                expect(screen.getByTestId("reflowed")).toHaveTextContent("false");
            });
        });
    });
});
