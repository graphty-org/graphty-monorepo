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

        it("fires between the two thresholds only with the narrow bar", async () => {
            render(<Probe width={640} viewportWidth={1024} />);

            await waitFor(() => {
                expect(screen.getByTestId("reflowed")).toHaveTextContent("true");
            });
        });
    });
});
