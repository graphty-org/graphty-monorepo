import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/test-utils";
import { LoadDataModal } from "../LoadDataModal";
import { RunLayoutsModal } from "../RunLayoutsModal";

describe("Modal styling consistency", () => {
    describe("RunLayoutsModal", () => {
        it("uses standard modal styles with semantic variables", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);
            const modal = screen.getByRole("dialog");
            expect(modal).toBeInTheDocument();

            // No colour that only works in dark mode. A `dark-N` paired inside
            // `light-dark(light, dark)` is the correct way to write both modes at once
            // -- which is how `@graphty/compact-mantine` writes its inks -- so the
            // pairs come out before the check.
            const allElements = modal.querySelectorAll("*");
            allElements.forEach((el) => {
                const style = (el.getAttribute("style") ?? "").replace(/light-dark\((?:[^()]|\([^()]*\))*\)/g, "");
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
        });
    });

    describe("LoadDataModal", () => {
        it("uses standard modal styles with semantic variables", () => {
            render(<LoadDataModal opened={true} onClose={vi.fn()} onLoad={vi.fn()} />);
            const modal = screen.getByRole("dialog");
            expect(modal).toBeInTheDocument();

            // No colour that only works in dark mode. A `dark-N` paired inside
            // `light-dark(light, dark)` is the correct way to write both modes at once
            // -- which is how `@graphty/compact-mantine` writes its inks -- so the
            // pairs come out before the check.
            const allElements = modal.querySelectorAll("*");
            allElements.forEach((el) => {
                const style = (el.getAttribute("style") ?? "").replace(/light-dark\((?:[^()]|\([^()]*\))*\)/g, "");
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
        });
    });
});
