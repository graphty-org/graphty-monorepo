/**
 * useBoxSize measures an element that mounts after its component's first render, with no other
 * render to follow (#6048, #6062): Mantine's useElementSize left such an element at 0 until the
 * component happened to draw again.
 */

import React, { useState } from "react";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../test/test-utils";
import { useBoxSize } from "../useBoxSize";

/** A Show button, then a 240 by 120 box that reads out the size it was measured at. */
function LateBox(): React.JSX.Element {
    const [shown, setShown] = useState(false);
    const { ref, width, height } = useBoxSize();
    return shown ? (
        <div ref={ref} style={{ width: 240, height: 120 }}>
            {`${width} x ${height}`}
        </div>
    ) : (
        <button
            type="button"
            onClick={() => {
                setShown(true);
            }}
        >
            Show
        </button>
    );
}

describe("useBoxSize", () => {
    it("measures a box that appears after the first render", async () => {
        render(<LateBox />);
        await userEvent.click(screen.getByRole("button", { name: "Show" }));
        await waitFor(() => {
            assert.isNotNull(screen.queryByText("240 x 120"));
        });
    });
});
