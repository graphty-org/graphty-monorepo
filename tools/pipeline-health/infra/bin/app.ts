import { App } from "aws-cdk-lib";

import { DeployStack } from "../deploy-stack.ts";
import { HealthStack } from "../health-stack.ts";

const app = new App();
const env = { account: "494945606241", region: "us-east-2" };
new HealthStack(app, "graphty-health", {
    env,
    devOrigin: (app.node.tryGetContext("devOrigin") as string | undefined) || undefined,
});
new DeployStack(app, "graphty-health-deploy", {
    env,
    webhook: String(app.node.tryGetContext("deployWebhook")) === "true",
});
