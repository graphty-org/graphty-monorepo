import {MantineProvider} from "@mantine/core";
import React, {ReactElement} from "react";

import {theme} from "../theme";

export function AllProviders({children}: {children: React.ReactNode}): ReactElement {
    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            {children}
        </MantineProvider>
    );
}
