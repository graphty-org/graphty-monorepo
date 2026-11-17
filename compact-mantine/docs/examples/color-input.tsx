import { CompactColorInput, compactTheme, PopoutManager } from "@graphty/compact-mantine";
import { MantineProvider } from "@mantine/core";
import { useState } from "react";

export function App() {
    // undefined means "the reader has not chosen one": the field shows the default.
    const [color, setColor] = useState<string | undefined>();
    const [opacity, setOpacity] = useState<number | undefined>();

    return (
        <MantineProvider theme={compactTheme}>
            {/* The picker opens in a pop-out, so the field needs a PopoutManager above it. */}
            <PopoutManager>
                <CompactColorInput
                    label="Fill"
                    color={color}
                    defaultColor="#5B8FF9"
                    opacity={opacity}
                    defaultOpacity={100}
                    onColorChange={setColor}
                    onOpacityChange={setOpacity}
                />
            </PopoutManager>
        </MantineProvider>
    );
}
