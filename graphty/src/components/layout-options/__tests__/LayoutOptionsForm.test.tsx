import {fireEvent, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {z} from "zod";

import {render, screen} from "../../../test/test-utils";
import {LayoutOptionsForm} from "../LayoutOptionsForm";

describe("LayoutOptionsForm", () => {
    describe("Number field rendering", () => {
        it("should render number input for z.number() schema field", () => {
            const schema = z.object({iterations: z.number().positive().default(50)});
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);
            expect(screen.getByLabelText("Iterations")).toBeInTheDocument();
        });

        it("should pre-fill default values from schema for number fields", () => {
            const schema = z.object({iterations: z.number().default(50)});
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);
            expect(screen.getByDisplayValue("50")).toBeInTheDocument();
        });

        it("should use provided values over defaults", () => {
            const schema = z.object({iterations: z.number().default(50)});
            render(<LayoutOptionsForm schema={schema} values={{iterations: 100}} onChange={vi.fn()} />);
            expect(screen.getByDisplayValue("100")).toBeInTheDocument();
        });

        it("should call onChange when number input value changes", async() => {
            const schema = z.object({iterations: z.number().default(50)});
            const onChange = vi.fn();
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={onChange} />);

            const input = screen.getByLabelText("Iterations");
            fireEvent.change(input, {target: {value: "75"}});

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({iterations: 75}));
            });
        });
    });

    describe("Boolean field rendering", () => {
        it("should render checkbox for z.boolean() schema field", () => {
            const schema = z.object({strongGravity: z.boolean().default(false)});
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);
            expect(screen.getByRole("checkbox")).toBeInTheDocument();
        });

        it("should pre-fill default values from schema for boolean fields", () => {
            const schema = z.object({enabled: z.boolean().default(true)});
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);
            expect(screen.getByRole("checkbox")).toBeChecked();
        });

        it("should call onChange when checkbox is toggled", async() => {
            const schema = z.object({enabled: z.boolean().default(false)});
            const onChange = vi.fn();
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={onChange} />);

            const checkbox = screen.getByRole("checkbox");
            fireEvent.click(checkbox);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith(expect.objectContaining({enabled: true}));
            });
        });
    });

    describe("Enum field rendering", () => {
        it("should render select for z.enum() schema field", () => {
            const schema = z.object({align: z.enum(["vertical", "horizontal"]).default("vertical")});
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);

            // Mantine Select renders as a textbox with combobox role
            const select = screen.getByRole("textbox", {name: /align/i});
            expect(select).toBeInTheDocument();
        });

        it("should pre-fill default values from schema for enum fields", () => {
            const schema = z.object({align: z.enum(["vertical", "horizontal"]).default("vertical")});
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);

            const select = screen.getByRole("textbox", {name: /align/i});
            // Mantine Select displays the label (title case) not the value
            expect(select).toHaveValue("Vertical");
        });
    });

    describe("Hidden fields", () => {
        it("should hide fields marked as hidden", () => {
            const schema = z.object({
                visible: z.number().default(10),
                scalingFactor: z.number().default(100),
            });
            render(
                <LayoutOptionsForm
                    schema={schema}
                    values={{}}
                    onChange={vi.fn()}
                    hiddenFields={["scalingFactor"]}
                />,
            );

            expect(screen.getByLabelText("Visible")).toBeInTheDocument();
            expect(screen.queryByLabelText("Scaling Factor")).not.toBeInTheDocument();
        });
    });

    describe("Complex fields", () => {
        it("should not render complex fields like arrays", () => {
            const schema = z.object({
                simpleField: z.number().default(10),
                center: z.array(z.number()).default([0, 0]),
            });
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);

            expect(screen.getByLabelText("Simple Field")).toBeInTheDocument();
            expect(screen.queryByLabelText("Center")).not.toBeInTheDocument();
        });

        it("should not render complex fields like records", () => {
            const schema = z.object({
                simpleField: z.number().default(10),
                pos: z.record(z.number(), z.array(z.number())).or(z.null()).default(null),
            });
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);

            expect(screen.getByLabelText("Simple Field")).toBeInTheDocument();
            expect(screen.queryByLabelText("Pos")).not.toBeInTheDocument();
        });
    });

    describe("Multiple fields", () => {
        it("should render multiple fields from a schema", () => {
            const schema = z.object({
                alphaMin: z.number().positive().default(0.1),
                alphaTarget: z.number().min(0).default(0),
                velocityDecay: z.number().positive().default(0.4),
            });
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);

            expect(screen.getByLabelText("Alpha Min")).toBeInTheDocument();
            expect(screen.getByLabelText("Alpha Target")).toBeInTheDocument();
            expect(screen.getByLabelText("Velocity Decay")).toBeInTheDocument();
        });
    });

    describe("Empty schema", () => {
        it("should handle empty schema gracefully", () => {
            const schema = z.object({});
            const {container} = render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);
            // Should render empty stack without errors
            expect(container.querySelector("[class*='mantine-Stack']")).toBeInTheDocument();
        });
    });

    describe("Nullable number fields", () => {
        it("should handle nullable number fields with null default", () => {
            const schema = z.object({
                seed: z.number().or(z.null()).default(null),
            });
            render(<LayoutOptionsForm schema={schema} values={{}} onChange={vi.fn()} />);

            // The field should be rendered but with empty value (null shows as empty)
            const input = screen.getByLabelText("Seed");
            expect(input).toBeInTheDocument();
            // Mantine NumberInput shows empty string for null/undefined values
            expect(input).toHaveValue("");
        });
    });
});
