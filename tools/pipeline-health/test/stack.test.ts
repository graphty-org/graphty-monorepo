import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";

import { HealthStack } from "../infra/health-stack.ts";

let t: Template;
beforeAll(() => {
    const app = new App();
    const stack = new HealthStack(app, "test", {
        env: { account: "494945606241", region: "us-east-2" },
        devOrigin: "https://dev.example:9123",
    });
    t = Template.fromStack(stack);
});

describe("health stack", () => {
    it("keeps the table on demand, retained, protected, with TTL", () => {
        t.hasResource("AWS::DynamoDB::GlobalTable", {
            DeletionPolicy: "Retain",
            Properties: Match.objectLike({
                TableName: "graphty-health",
                BillingMode: "PAY_PER_REQUEST",
                TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
                Replicas: [Match.objectLike({ DeletionProtectionEnabled: true })],
            }),
        });
    });

    it("reserves concurrency 20 / 5 / 1 on arm64 Node 22 with the right timeouts", () => {
        const fns = Object.values(t.findResources("AWS::Lambda::Function")).map((r) => r.Properties);
        const shapes = fns
            .map((p) => [p.ReservedConcurrentExecutions, p.Timeout, p.Runtime, p.Architectures[0]])
            .sort((a, b) => b[0] - a[0]);
        expect(shapes).toEqual([
            [20, 10, "nodejs22.x", "arm64"],
            [5, 10, "nodejs22.x", "arm64"],
            [1, 60, "nodejs22.x", "arm64"],
        ]);
    });

    it("keeps logs 14 days", () => {
        const groups = Object.values(t.findResources("AWS::Logs::LogGroup"));
        expect(groups.map((g) => g.Properties.RetentionInDays)).toEqual([14, 14, 14]);
    });

    it("checks CI writes with the GitHub OIDC issuer and audience", () => {
        t.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", {
            AuthorizerType: "JWT",
            JwtConfiguration: { Issuer: "https://token.actions.githubusercontent.com", Audience: ["graphty-health"] },
        });
        t.hasResourceProperties("AWS::ApiGatewayV2::Route", {
            RouteKey: "POST /v1/ingest/{kind}",
            AuthorizationType: "JWT",
        });
        t.hasResourceProperties("AWS::ApiGatewayV2::Route", {
            RouteKey: "POST /v1/local/{kind}",
            AuthorizationType: "NONE",
        });
        for (const key of ["GET /v1/health", "GET /v1/status", "GET /v1/page/{page}", "GET /v1/{proxy+}"]) {
            t.hasResourceProperties("AWS::ApiGatewayV2::Route", { RouteKey: key, AuthorizationType: "NONE" });
        }
    });

    it("throttles reads 20/40 and writes 50/100", () => {
        t.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
            DefaultRouteSettings: { ThrottlingRateLimit: 20, ThrottlingBurstLimit: 40 },
            RouteSettings: {
                "POST /v1/ingest/{kind}": { ThrottlingRateLimit: 50, ThrottlingBurstLimit: 100 },
                "POST /v1/local/{kind}": { ThrottlingRateLimit: 50, ThrottlingBurstLimit: 100 },
            },
        });
    });

    it("allows GET from the page and the dev origin only", () => {
        t.hasResourceProperties("AWS::ApiGatewayV2::Api", {
            CorsConfiguration: Match.objectLike({
                AllowOrigins: ["https://health.graphty.app", "https://dev.example:9123"],
                AllowMethods: ["GET"],
            }),
        });
    });

    it("runs the collector every 5 minutes", () => {
        t.hasResourceProperties("AWS::Scheduler::Schedule", { ScheduleExpression: "rate(5 minutes)" });
    });

    it("alarms when no collector run succeeded in 20 minutes, on ALARM and OK", () => {
        const alarm = Object.values(t.findResources("AWS::CloudWatch::Alarm"))[0].Properties;
        expect(alarm.EvaluationPeriods).toBe(4);
        expect(alarm.DatapointsToAlarm).toBe(4);
        expect(alarm.TreatMissingData).toBe("breaching");
        expect(alarm.ComparisonOperator).toBe("LessThanThreshold");
        expect(alarm.Metrics[0].Expression).toBe("inv - FILL(err, 0)");
        expect(alarm.Metrics.find((m: { Id: string }) => m.Id === "inv").MetricStat.Period).toBe(300);
        expect(alarm.AlarmActions).toHaveLength(1);
        expect(alarm.OKActions).toHaveLength(1);
    });

    it("budgets 10 USD and denies the Lambda roles at 100% actual", () => {
        t.hasResourceProperties("AWS::Budgets::Budget", {
            Budget: Match.objectLike({ BudgetLimit: { Amount: 10, Unit: "USD" }, TimeUnit: "MONTHLY" }),
        });
        const action = Object.values(t.findResources("AWS::Budgets::BudgetsAction"))[0].Properties;
        expect(action.ActionType).toBe("APPLY_IAM_POLICY");
        expect(action.ActionThreshold).toEqual({ Type: "PERCENTAGE", Value: 100 });
        expect(action.Definition.IamActionDefinition.Roles).toHaveLength(3);
        t.hasResourceProperties("AWS::IAM::ManagedPolicy", {
            PolicyDocument: { Statement: [{ Effect: "Deny", Action: "*", Resource: "*" }], Version: "2012-10-17" },
        });
    });

    it("lets Budgets and CloudWatch publish to the alarm topic", () => {
        const policy = Object.values(t.findResources("AWS::SNS::TopicPolicy"))[0].Properties;
        const services = policy.PolicyDocument.Statement.map(
            (s: { Principal: { Service: string } }) => s.Principal.Service,
        );
        expect(services).toEqual(expect.arrayContaining(["budgets.amazonaws.com", "cloudwatch.amazonaws.com"]));
    });
});
