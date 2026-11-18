import "@mantine/core/styles.css";

import { compactTheme, ControlSection, FieldRow, PanelField, ToggleRow } from "@graphty/compact-mantine";
import { Button, MantineProvider, TextInput } from "@mantine/core";

export function App() {
    return (
        <MantineProvider theme={compactTheme}>
            {/* Ordinary Mantine components, now rendered compact. */}
            <TextInput label="Project name" />
            <Button>Save</Button>

            {/* This package's own components, for a 240px panel. */}
            <div style={{ width: 240 }}>
                <ControlSection label="Node size">
                    <FieldRow>
                        <PanelField label="Smallest" glyph="sizeSmallest" defaultValue="1.0" />
                        <PanelField label="Largest" glyph="sizeLargest" defaultValue="4.0" />
                    </FieldRow>
                    <ToggleRow label="Scale with zoom" defaultChecked />
                </ControlSection>
            </div>
        </MantineProvider>
    );
}
