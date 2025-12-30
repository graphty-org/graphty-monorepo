import * as Sentry from "@sentry/react";
import React from "react";

import {ErrorFallback} from "./ErrorFallback";

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export function ErrorBoundary({children}: ErrorBoundaryProps): React.JSX.Element {
    return (
        <Sentry.ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
            {children}
        </Sentry.ErrorBoundary>
    );
}
