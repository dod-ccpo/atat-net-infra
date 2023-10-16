import * as cdk from "aws-cdk-lib";
import * as AtatNetFirewall from "../lib/atat-net-infra-pipeline-stage";

test("The stack creates successfully with a VPC Firewall defined", () => {
  // GIVEN
  const app = new cdk.App();
  // WHEN
  const network = new AtatNetFirewall.NetInfraPipelineStage(app, "TestNetStack", {
    orgARN: "y-675jgh",
    environmentName: "TEST",
  });
});
