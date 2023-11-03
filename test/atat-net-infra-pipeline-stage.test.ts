import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as AtatNetFirewall from "../lib/atat-net-infra-pipeline-stage";

// describe("Validate creation of the pipeline stack", () => {
//     let app: cdk.App;
//     let stack: AtatNetFirewall.NetInfraPipelineStage;
describe("Firewall Stack Test", () => {
test("The stack creates successfully with a VPC Firewall defined", () => {
  // GIVEN
  const app = new cdk.App();
  // WHEN
  const network = new AtatNetFirewall.NetInfraPipelineStage(app, "TestFirewallStack", {
    orgARN: "y-675jgh",
    environmentName: "TEST",
    apiDomain: "hello.world"
  });
});
})

