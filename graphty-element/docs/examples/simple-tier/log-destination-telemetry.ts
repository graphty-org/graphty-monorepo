import { defineLogDestination } from "@graphty/graphty-element/extend";
import { GraphtyLogger } from "@graphty/graphty-element/logging";

// Send the element's errors to a telemetry endpoint.
defineLogDestination({
    id: "acme-telemetry",
    level: "error",
    write: (record) =>
        fetch("https://telemetry.acme.example/v1/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
        }),
});

// Logging is off until the page turns it on, and until then no destination receives anything.
await GraphtyLogger.configure({ enabled: true });
