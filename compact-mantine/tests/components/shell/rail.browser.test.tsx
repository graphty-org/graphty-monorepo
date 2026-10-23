/**
 * NavRail layout in a real browser: the rail fills its container's height exactly, so a footer
 * button pinned to its foot is inside the container rather than cut off below it.
 */
import { afterEach, describe, expect, it } from "vitest";

import { NavRail, RailButton } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("NavRail layout", () => {
    it("fills its container's height, with the footer inside it", async () => {
        const { container } = await renderThemed(
            <div className="host" style={{ height: 400, display: "grid", gridTemplateRows: "minmax(0, 1fr)" }}>
                <NavRail footer={<RailButton icon={<span />} label="Settings" />}>
                    <RailButton icon={<span />} label="Graph" />
                </NavRail>
            </div>,
        );
        const host = container.querySelector<HTMLElement>(".host")!.getBoundingClientRect();
        const rail = container.querySelector<HTMLElement>(".cm-nav-rail")!.getBoundingClientRect();
        const footer = container.querySelector<HTMLElement>(".cm-nav-rail-footer")!.getBoundingClientRect();
        expect(rail.height).toBe(host.height);
        expect(footer.bottom).toBeLessThanOrEqual(host.bottom - 16);
    });
});
