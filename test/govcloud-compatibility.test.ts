import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as logs from "aws-cdk-lib/aws-logs";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";

describe("Ensure the GovCloudCompatibilityAspect makes necessary changes for GovCloud", () => {
  test("that CloudWatch Log Groups have tags removed", async () => {
    // GIVEN
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const logGroup = new logs.LogGroup(stack, "TestLogs");
    cdk.Tags.of(stack).add("Test", "Test");
    // WHEN
    cdk.Aspects.of(stack).add(new GovCloudCompatibilityAspect());
    // THEN
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      Tags: Match.absent(),
    });
  });
})