import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popout, PopoutManager, PopoutRegion } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

/**
 * One pop-out, named so a board can open it and look for its content.
 * @param props - Component props
 * @param props.name - What to call the trigger and the content test id
 * @returns A pop-out with a titled panel.
 */
function NamedPopout({ name }: { name: string }): React.JSX.Element {
    return (
        <Popout>
            <Popout.Trigger>
                <button>{`Open ${name}`}</button>
            </Popout.Trigger>
            <Popout.Panel width={200} header={{ variant: "title", title: name }}>
                <Popout.Content>
                    <span data-testid={`${name}-content`}>{name}</span>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * Renders inside the providers every pop-out needs.
 * @param ui - What to draw inside the manager.
 * @returns The render result.
 */
function renderPopout(ui: React.ReactElement) {
    return render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{ui}</PopoutManager>
        </MantineProvider>,
    );
}

describe("PopoutRegion", () => {
    it("keeps one pop-out open in each of two regions", async () => {
        const user = userEvent.setup();

        renderPopout(
            <>
                <PopoutRegion id="panel">
                    <NamedPopout name="panel-one" />
                </PopoutRegion>
                <PopoutRegion id="inspector">
                    <NamedPopout name="inspector-one" />
                </PopoutRegion>
            </>,
        );

        await user.click(screen.getByRole("button", { name: "Open panel-one" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-one-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open inspector-one" }));
        await waitFor(() => {
            expect(screen.getByTestId("inspector-one-content")).toBeInTheDocument();
        });

        // The point of the region: the first survives, because the two describe
        // two different objects and are not competing for one answer.
        expect(screen.getByTestId("panel-one-content")).toBeInTheDocument();
    });

    it("closes the first when a second opens in the SAME region", async () => {
        const user = userEvent.setup();

        renderPopout(
            <PopoutRegion id="panel">
                <NamedPopout name="first" />
                <NamedPopout name="second" />
            </PopoutRegion>,
        );

        await user.click(screen.getByRole("button", { name: "Open first" }));
        await waitFor(() => {
            expect(screen.getByTestId("first-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open second" }));
        await waitFor(() => {
            expect(screen.getByTestId("second-content")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("first-content")).not.toBeInTheDocument();
    });

    it("keeps the whole-page rule where no region is declared", async () => {
        const user = userEvent.setup();

        // No PopoutRegion anywhere: every root-level pop-out shares one group,
        // which is what this layer did before regions existed. An application
        // that never mentions regions must not change behaviour.
        renderPopout(
            <>
                <NamedPopout name="alpha" />
                <NamedPopout name="beta" />
            </>,
        );

        await user.click(screen.getByRole("button", { name: "Open alpha" }));
        await waitFor(() => {
            expect(screen.getByTestId("alpha-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open beta" }));
        await waitFor(() => {
            expect(screen.getByTestId("beta-content")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("alpha-content")).not.toBeInTheDocument();
    });

    it("does not let a region separate two pop-outs that share a parent", async () => {
        const user = userEvent.setup();

        // Below the root the parent has already done the separating. Two
        // children of one parent are siblings whatever region they inherited,
        // so opening the second still closes the first.
        renderPopout(
            <PopoutRegion id="panel">
                <Popout>
                    <Popout.Trigger>
                        <button>Open parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "parent" }}>
                        <Popout.Content>
                            <NamedPopout name="child-a" />
                            <NamedPopout name="child-b" />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutRegion>,
        );

        await user.click(screen.getByRole("button", { name: "Open parent" }));
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Open child-a" })).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open child-a" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-a-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open child-b" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-b-content")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("child-a-content")).not.toBeInTheDocument();
    });
});
