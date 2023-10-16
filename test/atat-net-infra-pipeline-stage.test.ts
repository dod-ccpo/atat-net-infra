import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { NetInfraPipelineStage } from "../lib/atat-net-infra-pipeline-stage";
import * as AtatNetFirewall from "../lib/atat-net-infra-pipeline-stage";

// test("Rest API is created", () => {
//   // GIVEN
//   const app = new cdk.App();
//   // WHEN
//   const stack = new AtatNetFirewall.NetInfraPipelineStage;
//   // THEN
//   const template = Template.fromStack(stack);
//   template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
// });

test("The stack creates successfully with a VPC defined", () => {
  // GIVEN
  const app = new cdk.App();
  // WHEN
  const network = new AtatNetFirewall.NetInfraPipelineStage(app, "TestNetStack", {
    orgARN: "y-675jgh",
    environmentName: "TEST",
  });
//   const stack = new AtatWebApi.AtatWebApiStack(app, "TestStack", { environmentName: "At0000", network });
  // THEN
//   const template = Template.fromStack(stack);
//   template.hasResourceProperties("AWS::ApiGateway::RestApi", {});
});
