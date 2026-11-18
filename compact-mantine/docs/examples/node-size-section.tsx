import {
    AdvancedButton,
    compactTheme,
    ControlSection,
    FieldGlyph,
    FieldRow,
    PANEL_GRID,
    PanelField,
    RampRow,
    SegmentedControl,
    ToggleRow,
    ToggleRowGroup,
    TrailingSlot,
} from "@graphty/compact-mantine";
import { MantineProvider, VisuallyHidden } from "@mantine/core";

const SCALES = [
    { value: "sqrt", word: "Square root", glyph: "scaleSqrt" },
    { value: "linear", word: "Linear", glyph: "scaleLinear" },
    { value: "log", word: "Logarithmic", glyph: "scaleLog" },
] as const;

export function NodeSizeSection({ openAdvanced }: { openAdvanced: () => void }) {
    return (
        <ControlSection
            label="Node size"
            hasConfiguredValues
            info="Node size maps a numeric attribute onto a radius."
            actions={<AdvancedButton label="Advanced node size" changed onClick={openAdvanced} />}
        >
            {/* A pair of fields, each captioned by a drawing instead of a word. */}
            <FieldRow>
                <PanelField label="Smallest node size" glyph="sizeSmallest" kind="number" defaultValue={1} />
                <PanelField label="Largest node size" glyph="sizeLargest" kind="number" defaultValue={4} />
            </FieldRow>

            {/* The mapping between them, drawn at row height. */}
            <RampRow label="Size range" min="1.0" max="4.0" variant="size" scale="sqrt" />

            {/* Three options whose difference can be drawn: a segmented control of pictures. */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: PANEL_GRID.TRAIL_GAP,
                    height: PANEL_GRID.ROW_PITCH,
                }}
            >
                <SegmentedControl
                    fullWidth
                    aria-label="Scale"
                    defaultValue="sqrt"
                    data={SCALES.map((s) => ({
                        value: s.value,
                        label: (
                            <>
                                <FieldGlyph name={s.glyph} />
                                <VisuallyHidden>{s.word}</VisuallyHidden>
                            </>
                        ),
                    }))}
                    style={{ flex: "1 1 auto", minWidth: 0 }}
                />
                <TrailingSlot />
            </div>

            {/* Booleans with no picture, packed tighter than the other rows. */}
            <ToggleRowGroup label="Node decorations">
                <ToggleRow label="Labels" defaultChecked />
                <ToggleRow label="Halos" />
            </ToggleRowGroup>
        </ControlSection>
    );
}

export function App() {
    return (
        <MantineProvider theme={compactTheme}>
            <div style={{ width: PANEL_GRID.WIDTH }}>
                <NodeSizeSection openAdvanced={() => console.log("open the advanced settings")} />
            </div>
        </MantineProvider>
    );
}
