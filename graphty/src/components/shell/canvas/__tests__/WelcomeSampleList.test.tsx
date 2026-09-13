import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SAMPLE_SECTION_HINT, SAMPLE_SECTION_NAME } from "../../../../data/sampleManifest";
import { fireEvent, render, screen } from "../../../../test/test-utils";
import { type WelcomeSample, WelcomeSampleList } from "../WelcomeSampleList";

/**
 * One row, with both routes in bound to spies.
 * @param overrides - what this board changes about the row.
 * @returns the row.
 */
function sample(overrides: Partial<WelcomeSample> = {}): WelcomeSample {
    return {
        id: "cat-social-network",
        name: "Cat social network",
        tags: ["Weighted"],
        large: false,
        credit: "graphty samples",
        creditHref: "https://graphty.app/",
        sizeString: "20 nodes, 29 edges",
        blurb: "Small enough to see every relationship. ",
        hint: "Try finding the groups.",
        onOpen: vi.fn(),
        onOpenAndRun: vi.fn(),
        ...overrides,
    };
}

describe("WelcomeSampleList", () => {
    it("draws the frozen section name and the frozen hint", () => {
        render(<WelcomeSampleList samples={[sample()]} />);

        expect(screen.getByText(SAMPLE_SECTION_NAME)).toBeInTheDocument();
        expect(screen.getByText(SAMPLE_SECTION_HINT)).toBeInTheDocument();
    });

    it("renders nothing at all when the manifest is empty, rather than an empty heading", () => {
        const { container } = render(<WelcomeSampleList samples={[]} />);

        expect(container.querySelector("[data-canvas-samples]")).toBeNull();
    });

    it("draws a row's name, size string, tags, credit and blurb", () => {
        const { container } = render(<WelcomeSampleList samples={[sample()]} />);

        expect(screen.getByText("Cat social network")).toBeInTheDocument();
        expect(screen.getByText("20 nodes, 29 edges")).toBeInTheDocument();
        expect(container.querySelector('[data-sample-tag="Weighted"]')).not.toBeNull();
        expect(screen.getByRole("link", { name: "graphty samples" })).toHaveAttribute("href", "https://graphty.app/");
        expect(screen.getByText(/Small enough to see every relationship\./)).toBeInTheDocument();
    });

    it("loads the sample when the row is clicked", () => {
        const onOpen = vi.fn();
        const { container } = render(<WelcomeSampleList samples={[sample({ onOpen })]} />);

        fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("loads the sample from the keyboard, because the whole row is the control", () => {
        const onOpen = vi.fn();
        const { container } = render(<WelcomeSampleList samples={[sample({ onOpen })]} />);
        const row = container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement;

        fireEvent.keyDown(row, { key: "Enter" });
        fireEvent.keyDown(row, { key: " " });

        expect(onOpen).toHaveBeenCalledTimes(2);
    });

    it("runs the suggested card from the hint, and does NOT also fire the plain load", () => {
        const onOpen = vi.fn();
        const onOpenAndRun = vi.fn();
        const { container } = render(<WelcomeSampleList samples={[sample({ onOpen, onOpenAndRun })]} />);

        fireEvent.click(container.querySelector('[data-sample-hint="cat-social-network"]') as HTMLElement);

        /* NAV-1: the hint loads the sample AND runs the manifest's suggested first card,
           which is a different route from the row's own. If the click reached the row too,
           the sample would be loaded twice. */
        expect(onOpenAndRun).toHaveBeenCalledTimes(1);
        expect(onOpen).not.toHaveBeenCalled();
    });

    it("leaves the credit link out of the row's own gesture", () => {
        const onOpen = vi.fn();
        render(<WelcomeSampleList samples={[sample({ onOpen })]} />);

        fireEvent.click(screen.getByRole("link", { name: "graphty samples" }));

        expect(onOpen).not.toHaveBeenCalled();
    });

    it("renders the blurb as plain text for a sample with no suggested card (spec 5643)", () => {
        const { container } = render(
            <WelcomeSampleList
                samples={[
                    sample({
                        id: "karate",
                        name: "Karate Club",
                        tags: [],
                        hint: undefined,
                        onOpenAndRun: undefined,
                        blurb: "A club that split in two. The classic test for finding groups.",
                    }),
                ]}
            />,
        );

        expect(container.querySelector("[data-sample-hint]")).toBeNull();
        expect(screen.getByText("A club that split in two. The classic test for finding groups.")).toBeInTheDocument();
    });

    it("draws the Large badge only on a row that carries it", () => {
        const { container } = render(<WelcomeSampleList samples={[sample({ large: true })]} />);

        expect(container.querySelector("[data-sample-large]")).not.toBeNull();
    });

    it("draws no Large badge on a row that does not carry it, which is every shipped row", () => {
        const { container } = render(<WelcomeSampleList samples={[sample()]} />);

        expect(container.querySelector("[data-sample-large]")).toBeNull();
    });
});
