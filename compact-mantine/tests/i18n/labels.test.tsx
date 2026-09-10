import { renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { defaultLabels, LabelsProvider, useLabels, useLocale } from "../../src/i18n";

describe("useLabels", () => {
    it("returns the English defaults with no provider", () => {
        const { result } = renderHook(() => useLabels());

        expect(result.current).toBe(defaultLabels);
        expect(result.current.mixed).toBe("Mixed");
        expect(result.current.closePanel).toBe("Close panel");
        expect(result.current.expandSection("Layout")).toBe("Expand Layout");
    });

    it("merges a partial override over the defaults", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LabelsProvider labels={{ mixed: "Multiple" }}>{children}</LabelsProvider>
        );

        const { result } = renderHook(() => useLabels(), { wrapper });

        expect(result.current.mixed).toBe("Multiple");
        // Everything not named keeps its default.
        expect(result.current.closePanel).toBe("Close panel");
        expect(result.current.details).toBe("Details");
        expect(result.current.collapseSection("Layout")).toBe("Collapse Layout");
    });

    it("overrides an interpolating entry", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LabelsProvider labels={{ about: (label: string) => `What is ${label}?` }}>{children}</LabelsProvider>
        );

        const { result } = renderHook(() => useLabels(), { wrapper });

        expect(result.current.about("betweenness")).toBe("What is betweenness?");
    });

    it("merges a nested provider over the one above it rather than over the defaults", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LabelsProvider labels={{ mixed: "Multiple", details: "More" }}>
                <LabelsProvider labels={{ details: "Full record" }}>{children}</LabelsProvider>
            </LabelsProvider>
        );

        const { result } = renderHook(() => useLabels(), { wrapper });

        expect(result.current.details).toBe("Full record");
        expect(result.current.mixed).toBe("Multiple");
        expect(result.current.closePanel).toBe("Close panel");
    });

    it("leaves the shipped defaults untouched when a provider overrides them", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LabelsProvider labels={{ mixed: "Multiple" }}>{children}</LabelsProvider>
        );

        renderHook(() => useLabels(), { wrapper });

        expect(defaultLabels.mixed).toBe("Mixed");
    });

    it("covers every string the library draws", () => {
        expect(defaultLabels.scaleSqrt).toBe("Square root scale");
        expect(defaultLabels.scaleLinear).toBe("Linear scale");
        expect(defaultLabels.scaleLog).toBe("Logarithmic scale");
        expect(defaultLabels.departure).toBe("Departure");
        expect(defaultLabels.colorSwatch).toBe("Color swatch");
        expect(defaultLabels.colorHexValue).toBe("Color hex value");
        expect(defaultLabels.opacity).toBe("Opacity");
        expect(defaultLabels.colorPanelTitle).toBe("Color");
        expect(defaultLabels.colorGenericName).toBe("color");
        expect(defaultLabels.colorStops).toBe("Color Stops");
        expect(defaultLabels.addColorStop).toBe("Add color stop");
        expect(defaultLabels.direction).toBe("Direction");
        expect(defaultLabels.gradientDirection).toBe("Gradient direction");
        expect(defaultLabels.settings).toBe("Settings");

        expect(defaultLabels.percentile("98th")).toBe("98th percentile");
        expect(defaultLabels.addToSection("Filters")).toBe("Add Filters");
        expect(defaultLabels.sectionHasConfiguredValues("Layout")).toBe("Layout has configured values");
        expect(defaultLabels.resetToDefault("Size")).toBe("Reset Size to default");
        expect(defaultLabels.colorStopPosition("2")).toBe("Stop 2 position");
        expect(defaultLabels.removeColorStop("2")).toBe("Remove color stop 2");
        expect(defaultLabels.degrees("90")).toBe("90\u00b0");
        expect(defaultLabels.percent("50")).toBe("50%");
    });
});

describe("useLocale", () => {
    const originalLang = document.documentElement.lang;

    afterEach(() => {
        document.documentElement.lang = originalLang;
    });

    it("returns the browser default with no provider", () => {
        document.documentElement.lang = "";

        const { result } = renderHook(() => useLocale());

        expect(result.current).toBe(navigator.language);
    });

    it("falls back to the document lang attribute before the browser default", () => {
        document.documentElement.lang = "fr-FR";

        const { result } = renderHook(() => useLocale());

        expect(result.current).toBe("fr-FR");
    });

    it("prefers the locale a provider was given", () => {
        document.documentElement.lang = "fr-FR";
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LabelsProvider locale="de-DE">{children}</LabelsProvider>
        );

        const { result } = renderHook(() => useLocale(), { wrapper });

        expect(result.current).toBe("de-DE");
    });

    it("inherits the locale from an outer provider that a nested one does not restate", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <LabelsProvider locale="de-DE">
                <LabelsProvider labels={{ mixed: "Verschieden" }}>{children}</LabelsProvider>
            </LabelsProvider>
        );

        const { result } = renderHook(() => ({ labels: useLabels(), locale: useLocale() }), { wrapper });

        expect(result.current.locale).toBe("de-DE");
        expect(result.current.labels.mixed).toBe("Verschieden");
    });
});
