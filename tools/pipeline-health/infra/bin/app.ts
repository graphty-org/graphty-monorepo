import { App } from "aws-cdk-lib";

import { DeployStack } from "../deploy-stack.ts";
import { HealthStack } from "../health-stack.ts";

const app = new App();
const env = { account: "494945606241", region: "us-east-2" };
export const healthStack = new HealthStack(app, "graphty-health", {
    env,
    devOrigin: (app.node.tryGetContext("devOrigin") as string | undefined) || undefined,
});
export const deployStack = new DeployStack(app, "graphty-health-deploy", {
    env,
    connectionApproved: String(app.node.tryGetContext("connectionApproved")) === "true",
});
