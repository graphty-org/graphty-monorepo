import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import { AiSettingsModal } from "../AiSettingsModal";

/**
 * The dialog draws no form of its own -- it is a Modal around `AiProviderSettings`,
 * which is where the key form's own behaviour is asserted (AiProviderSettings.test.tsx).
 * What is left to test here is the dialog: that it opens, that it carries the one form,
 * and that it closes.
 * @returns the dialog's props, with an empty key store behind it.
 */
function modalProps(): React.ComponentProps<typeof AiSettingsModal> {
    return {
        opened: true,
        onClose: vi.fn(),
        getKey: vi.fn().mockReturnValue(undefined),
        setKey: vi.fn(),
        removeKey: vi.fn(),
        hasKey: vi.fn().mockReturnValue(false),
        configuredProviders: [],
        defaultProvider: null,
        onDefaultProviderChange: vi.fn(),
        isPersistenceEnabled: false,
        onEnablePersistence: vi.fn(),
        onDisablePersistence: vi.fn(),
    };
}

describe("AiSettingsModal", () => {
    it("draws nothing while it is closed", () => {
        render(<AiSettingsModal {...modalProps()} opened={false} />);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("is a dialog with a name", () => {
        render(<AiSettingsModal {...modalProps()} />);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("AI Settings")).toBeInTheDocument();
    });

    it("carries the one provider form, rather than a second copy of it", () => {
        render(<AiSettingsModal {...modalProps()} />);

        expect(screen.getByTestId("ai-provider-list")).toBeInTheDocument();
        expect(screen.getByLabelText("API key")).toBeInTheDocument();
    });

    it("closes on Escape, the one Escape ladder the shell already uses", () => {
        const onClose = vi.fn();

        render(<AiSettingsModal {...modalProps()} onClose={onClose} />);

        fireEvent.keyDown(document.body, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
