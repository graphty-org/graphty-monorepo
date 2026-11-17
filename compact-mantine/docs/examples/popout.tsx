import { compactTheme, Popout, PopoutButton, PopoutManager, ToggleRow, UiGlyph } from "@graphty/compact-mantine";
import { MantineProvider } from "@mantine/core";

export function App() {
    return (
        <MantineProvider theme={compactTheme}>
            {/* One PopoutManager, above everything that opens a pop-out. */}
            <PopoutManager>
                <aside style={{ width: 240 }}>
                    <Popout>
                        <Popout.Trigger>
                            <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Display settings" />
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Display settings" }}>
                            <Popout.Content>
                                <ToggleRow label="Show grid" defaultChecked />
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </aside>
            </PopoutManager>
        </MantineProvider>
    );
}
