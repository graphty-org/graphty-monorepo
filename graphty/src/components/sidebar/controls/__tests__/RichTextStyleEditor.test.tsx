import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import type {RichTextStyle} from "../../../../types/style-layer";
import {DEFAULT_RICH_TEXT_STYLE} from "../../../../utils/style-defaults";
import {RichTextStyleEditor} from "../RichTextStyleEditor";

describe("RichTextStyleEditor", () => {
    const defaultStyle: RichTextStyle = DEFAULT_RICH_TEXT_STYLE;

    const enabledStyle: RichTextStyle = {
        ... DEFAULT_RICH_TEXT_STYLE,
        enabled: true,
        text: "Test Label",
    };

    it("renders enabled toggle", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={defaultStyle}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByRole("checkbox", {name: "Enabled"})).toBeInTheDocument();
    });

    it("hides controls when disabled", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={defaultStyle}
                onChange={vi.fn()}
            />,
        );

        // Text input should not be visible when disabled
        expect(screen.queryByLabelText("Text")).not.toBeInTheDocument();
    });

    it("shows text input when enabled", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Text")).toBeInTheDocument();
    });

    it("shows font controls when enabled", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={vi.fn()}
            />,
        );

        // Font family select
        expect(screen.getByLabelText("Font Family")).toBeInTheDocument();
        // Font size input
        expect(screen.getByLabelText("Font Size")).toBeInTheDocument();
    });

    it("shows collapsible advanced sections", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={vi.fn()}
            />,
        );

        // Advanced sections should be available as collapsible groups
        expect(screen.getByText("Text Effects")).toBeInTheDocument();
        expect(screen.getByText("Animation")).toBeInTheDocument();
        expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("calls onChange when enabled is toggled", () => {
        const onChange = vi.fn();
        render(
            <RichTextStyleEditor
                label="Label"
                value={defaultStyle}
                onChange={onChange}
            />,
        );

        const enabledCheckbox = screen.getByRole("checkbox", {name: "Enabled"});
        fireEvent.click(enabledCheckbox);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                enabled: true,
            }),
        );
    });

    it("calls onChange when text changes", () => {
        const onChange = vi.fn();
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={onChange}
            />,
        );

        const textInput = screen.getByLabelText("Text");
        fireEvent.change(textInput, {target: {value: "New Label"}});
        fireEvent.blur(textInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                text: "New Label",
            }),
        );
    });

    it("calls onChange when font family changes", () => {
        const onChange = vi.fn();
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={onChange}
            />,
        );

        const fontSelect = screen.getByLabelText("Font Family");
        fireEvent.change(fontSelect, {target: {value: "Helvetica"}});

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                font: expect.objectContaining({
                    family: "Helvetica",
                }),
            }),
        );
    });

    it("calls onChange when font size changes", () => {
        const onChange = vi.fn();
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={onChange}
            />,
        );

        const sizeInput = screen.getByLabelText("Font Size");
        fireEvent.change(sizeInput, {target: {value: "16"}});
        fireEvent.blur(sizeInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                font: expect.objectContaining({
                    size: 16,
                }),
            }),
        );
    });

    it("shows background controls when enabled", () => {
        const styleWithBackground: RichTextStyle = {
            ... enabledStyle,
            background: {
                enabled: true,
                color: "#000000",
                padding: 4,
                borderRadius: 2,
            },
        };

        render(
            <RichTextStyleEditor
                label="Label"
                value={styleWithBackground}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByRole("checkbox", {name: "Background"})).toBeInTheDocument();
    });

    it("shows position controls", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Position")).toBeInTheDocument();
        expect(screen.getByRole("checkbox", {name: "Billboard"})).toBeInTheDocument();
    });

    it("shows location select", () => {
        render(
            <RichTextStyleEditor
                label="Label"
                value={enabledStyle}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Location")).toBeInTheDocument();
    });
});
