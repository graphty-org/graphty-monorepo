import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../../src";
import { Toast } from "../../../src/components/overlays/Toast";

describe("Toast", () => {
    it("is its own alert by default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Toast message="Saved" />
            </MantineProvider>,
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Saved");
    });

    it("leaves the message out of the live regions when the caller speaks it", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Toast message="Saved" alert={false} />
            </MantineProvider>,
        );
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getByTestId("toast")).toHaveTextContent("Saved");
    });
});
