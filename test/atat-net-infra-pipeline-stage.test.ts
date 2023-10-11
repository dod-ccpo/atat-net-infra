import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { NetInfraPipelineStage } from "../lib/atat-net-infra-pipeline-stage";
//import * as AtatWebApi from "./atat-web-api-stack";

// test("Rest API is created", () => {
//   // GIVEN
//   const app = new cdk.App();
//   // WHEN
//   const stack = new NetInfraPipelineStage.AtatWebApiStack(app, "TestStack", { environmentName: "At0000" });
//   // THEN
//   const template = Template.fromStack(stack);
//   template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
// });

test("The stack creates successfully with a VPC defined", () => {
  // GIVEN
  const app = new cdk.App();
  // WHEN
  const network = new NetInfraPipelineStage(app, "TestNetStack", {
    environmentName: "Test",
    orgARN: "GFHTR-4556",
  });
//   const stack = new NetInfraPipelineStage.TransitGatewayStack(app, "TestStack", { environmentName: "At0000", network });
//   // THEN
//   const template = Template.fromStack(stack);
//   template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
});