import {act, renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {useLocalValue} from "../useLocalValue";

describe("useLocalValue", () => {
    it("initializes with external value", () => {
        const {result} = renderHook(() => useLocalValue(5, 10));

        expect(result.current.localValue).toBe(5);
    });

    it("syncs local state with external prop changes", () => {
        const {result, rerender} = renderHook(
            ({value}) => useLocalValue(value, 10),
            {initialProps: {value: 5}},
        );

        expect(result.current.localValue).toBe(5);

        rerender({value: 15});
        expect(result.current.localValue).toBe(15);
    });

    it("allows setting local value to string", () => {
        const {result} = renderHook(() => useLocalValue(5, 5));

        act(() => {
            result.current.setLocalValue("10.5");
        });

        expect(result.current.localValue).toBe("10.5");
    });

    it("allows setting local value to number", () => {
        const {result} = renderHook(() => useLocalValue(5, 5));

        act(() => {
            result.current.setLocalValue(20);
        });

        expect(result.current.localValue).toBe(20);
    });

    it("returns parsed numeric value on commit", () => {
        const {result} = renderHook(() => useLocalValue(5, 5));

        act(() => {
            result.current.setLocalValue("10.5");
        });

        const committed = result.current.commitValue();
        expect(committed).toBe(10.5);
    });

    it("returns fallback for invalid string input", () => {
        const {result} = renderHook(() => useLocalValue(5, 10));

        act(() => {
            result.current.setLocalValue("invalid");
        });

        const committed = result.current.commitValue();
        expect(committed).toBe(10); // fallback
    });

    it("returns fallback for empty string input", () => {
        const {result} = renderHook(() => useLocalValue(5, 10));

        act(() => {
            result.current.setLocalValue("");
        });

        const committed = result.current.commitValue();
        expect(committed).toBe(10); // fallback
    });

    it("returns numeric value directly when local value is number", () => {
        const {result} = renderHook(() => useLocalValue(5, 10));

        act(() => {
            result.current.setLocalValue(25);
        });

        const committed = result.current.commitValue();
        expect(committed).toBe(25);
    });

    it("handles negative numbers correctly", () => {
        const {result} = renderHook(() => useLocalValue(-5, 0));

        expect(result.current.localValue).toBe(-5);

        act(() => {
            result.current.setLocalValue("-10.5");
        });

        const committed = result.current.commitValue();
        expect(committed).toBe(-10.5);
    });

    it("handles zero as external value", () => {
        const {result} = renderHook(() => useLocalValue(0, 5));

        expect(result.current.localValue).toBe(0);
    });

    it("handles zero as fallback value", () => {
        const {result} = renderHook(() => useLocalValue(5, 0));

        act(() => {
            result.current.setLocalValue("invalid");
        });

        const committed = result.current.commitValue();
        expect(committed).toBe(0); // fallback is 0
    });
});
