/**
 * ModalFooter geometry in a real browser: the buttons sit clear of the modal's rounded corner.
 */
import { Button, Modal } from "@mantine/core";
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ModalFooter } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("ModalFooter", () => {
    it("is 48 tall with its buttons 16px from the right edge and 12px above the bottom", async () => {
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
        expect(footer.getBoundingClientRect().height).toBeCloseTo(48, 0);
        expect(modal.right - last.right).toBeCloseTo(16, 0);
        expect(modal.bottom - last.bottom).toBeCloseTo(12, 0);
    });
});
