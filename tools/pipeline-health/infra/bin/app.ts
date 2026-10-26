import { App } from "aws-cdk-lib";

import { HealthStack } from "../health-stack.ts";

const app = new App();
new HealthStack(app, "graphty-health", {
    env: { account: "494945606241", region: "us-east-2" },
    devOrigin: (app.node.tryGetContext("devOrigin") as string | undefined) || undefined,
});
