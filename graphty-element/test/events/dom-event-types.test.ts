/**
 * @file The element's `graphty-*` DOM events are typed for `addEventListener`.
 *
 * Without the declaration a listener's event is a bare `Event`, and `e.detail` does not compile
 * without a cast. The type assertions are checked by `tsc`.
 */

import { describe, expectTypeOf, it } from "vitest";

import type { GraphtyElementEventMap, NodeEventDetail, ProjectStatus } from "../../index";

describe("graphty-* DOM events", () => {
    it("are declared on every element, with their details", () => {
        expectTypeOf<HTMLElementEventMap["graphty-project-status"]>().toEqualTypeOf<CustomEvent<ProjectStatus>>();
        expectTypeOf<HTMLElementEventMap["graphty-node-click"]>().toEqualTypeOf<CustomEvent<NodeEventDetail>>();
        expectTypeOf<HTMLElementEventMap["graphty-history-change"]["detail"]["canUndo"]>().toEqualTypeOf<boolean>();
        expectTypeOf<keyof GraphtyElementEventMap>().toExtend<keyof HTMLElementEventMap>();

        const listen = (element: HTMLElementTagNameMap["graphty-element"]): void => {
            element.addEventListener("graphty-project-status", (e) => {
                expectTypeOf(e.detail.dirty).toEqualTypeOf<boolean>();
            });
        };
        expectTypeOf(listen).toBeFunction();
    });
});
