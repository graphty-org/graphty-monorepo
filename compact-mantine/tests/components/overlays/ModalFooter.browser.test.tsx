/**
 * ModalFooter geometry in a real browser: Figma's 40px footer, the last button 8px from the edge.
 */
import { Button, Modal } from "@mantine/core";
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ModalFooter } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("ModalFooter", () => {
    it("is 40 tall with its buttons 8px from the right edge and 8px above the bottom", async () => {
        await renderThemed(
            <Modal opened onClose={() => undefined} title="Save">
                <input aria-label="Title" />
                <ModalFooter>
                    <Button variant="default">Cancel</Button>
                    <Button>Save</Button>
                </ModalFooter>
            </Modal>,
        );
        const content = await waitFor(() => {
            const el = document.querySelector<HTMLElement>(".mantine-Modal-content");
            if (!el) {
                throw new Error("no modal");
            }
            return el;
        });
        const footer = content.querySelector<HTMLElement>(".cm-modal-footer")!;
        const buttons = footer.querySelectorAll("button");
        const last = buttons[buttons.length - 1].getBoundingClientRect();
        const modal = content.getBoundingClientRect();
        expect(footer.getBoundingClientRect().height).toBeCloseTo(40, 0);
        expect(modal.right - last.right).toBeCloseTo(8, 0);
        expect(modal.bottom - last.bottom).toBeCloseTo(8, 0);
    });
});
