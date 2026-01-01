import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { NodeEffectsConfig } from "../../../../types/style-layer";
import { NodeEffectsControl } from "../NodeEffectsControl";

describe("NodeEffectsControl", () => {
    const defaultEffects: NodeEffectsConfig = {
        glow: undefined,
        outline: undefined,
        wireframe: false,
        flatShaded: false,
    };

    const effectsWithGlow: NodeEffectsConfig = {
        glow: {
            enabled: true,
            color: "#ff0000",
            strength: 0.5,
        },
        outline: undefined,
        wireframe: false,
        flatShaded: false,
    };

    const effectsWithOutline: NodeEffectsConfig = {
        glow: undefined,
        outline: {
            enabled: true,
            color: "#00ff00",
            width: 2,
        },
        wireframe: false,
        flatShaded: false,
    };

    it("renders glow toggle", () => {
        render(<NodeEffectsControl value={defaultEffects} onChange={vi.fn()} />);

        expect(screen.getByRole("checkbox", { name: "Glow" })).toBeInTheDocument();
    });

    it("shows glow controls when enabled", () => {
        render(<NodeEffectsControl value={effectsWithGlow} onChange={vi.fn()} />);

        // Glow color (via CompactColorInput) and strength should be visible
        // CompactColorInput uses "Color swatch" and "Color hex value" labels
        expect(screen.getAllByLabelText("Color swatch")[0]).toBeInTheDocument();
        expect(screen.getByLabelText("Glow Strength")).toBeInTheDocument();
    });

    it("hides glow controls when disabled", () => {
        render(<NodeEffectsControl value={defaultEffects} onChange={vi.fn()} />);

        // Glow controls should not be visible
        expect(screen.queryByLabelText("Color swatch")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Glow Strength")).not.toBeInTheDocument();
    });

    it("renders outline toggle", () => {
        render(<NodeEffectsControl value={defaultEffects} onChange={vi.fn()} />);

        expect(screen.getByRole("checkbox", { name: "Outline" })).toBeInTheDocument();
    });

    it("shows outline controls when enabled", () => {
        render(<NodeEffectsControl value={effectsWithOutline} onChange={vi.fn()} />);

        // Outline color (via CompactColorInput) and width should be visible
        // CompactColorInput uses "Color swatch" and "Color hex value" labels
        expect(screen.getAllByLabelText("Color swatch")[0]).toBeInTheDocument();
        expect(screen.getByLabelText("Outline Width")).toBeInTheDocument();
    });

    it("hides outline controls when disabled", () => {
        render(<NodeEffectsControl value={defaultEffects} onChange={vi.fn()} />);

        // Outline controls should not be visible
        expect(screen.queryByLabelText("Color swatch")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Outline Width")).not.toBeInTheDocument();
    });

    it("renders wireframe checkbox", () => {
        render(<NodeEffectsControl value={defaultEffects} onChange={vi.fn()} />);

        expect(screen.getByRole("checkbox", { name: "Wireframe" })).toBeInTheDocument();
    });

    it("renders flat shaded checkbox", () => {
        render(<NodeEffectsControl value={defaultEffects} onChange={vi.fn()} />);

        expect(screen.getByRole("checkbox", { name: "Flat Shaded" })).toBeInTheDocument();
    });

    it("calls onChange when glow is toggled on", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={defaultEffects} onChange={onChange} />);

        const glowCheckbox = screen.getByRole("checkbox", { name: "Glow" });
        fireEvent.click(glowCheckbox);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                glow: expect.objectContaining({
                    enabled: true,
                }),
            }),
        );
    });

    it("calls onChange when outline is toggled on", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={defaultEffects} onChange={onChange} />);

        const outlineCheckbox = screen.getByRole("checkbox", { name: "Outline" });
        fireEvent.click(outlineCheckbox);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                outline: expect.objectContaining({
                    enabled: true,
                }),
            }),
        );
    });

    it("calls onChange when wireframe is toggled", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={defaultEffects} onChange={onChange} />);

        const wireframeCheckbox = screen.getByRole("checkbox", { name: "Wireframe" });
        fireEvent.click(wireframeCheckbox);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                wireframe: true,
            }),
        );
    });

    it("calls onChange when flat shaded is toggled", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={defaultEffects} onChange={onChange} />);

        const flatShadedCheckbox = screen.getByRole("checkbox", { name: "Flat Shaded" });
        fireEvent.click(flatShadedCheckbox);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                flatShaded: true,
            }),
        );
    });

    it("calls onChange when glow color changes", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={effectsWithGlow} onChange={onChange} />);

        // CompactColorInput uses "Color hex value" for the hex input
        const colorInput = screen.getAllByLabelText("Color hex value")[0];
        fireEvent.change(colorInput, { target: { value: "00FF00" } });
        fireEvent.blur(colorInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                glow: expect.objectContaining({
                    color: "#00FF00",
                }),
            }),
        );
    });

    it("calls onChange when glow strength changes", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={effectsWithGlow} onChange={onChange} />);

        const strengthInput = screen.getByLabelText("Glow Strength");
        fireEvent.change(strengthInput, { target: { value: "0.8" } });
        fireEvent.blur(strengthInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                glow: expect.objectContaining({
                    strength: 0.8,
                }),
            }),
        );
    });

    it("calls onChange when outline color changes", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={effectsWithOutline} onChange={onChange} />);

        // CompactColorInput uses "Color hex value" for the hex input
        const colorInput = screen.getAllByLabelText("Color hex value")[0];
        fireEvent.change(colorInput, { target: { value: "0000FF" } });
        fireEvent.blur(colorInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                outline: expect.objectContaining({
                    color: "#0000FF",
                }),
            }),
        );
    });

    it("calls onChange when outline width changes", () => {
        const onChange = vi.fn();
        render(<NodeEffectsControl value={effectsWithOutline} onChange={onChange} />);

        const widthInput = screen.getByLabelText("Outline Width");
        fireEvent.change(widthInput, { target: { value: "4" } });
        fireEvent.blur(widthInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                outline: expect.objectContaining({
                    width: 4,
                }),
            }),
        );
    });
});
