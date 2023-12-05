import * as cdk from "aws-cdk-lib";
import { FirewallVpcStack } from "../lib/atat-net-infra-firewall-vpc";
describe("Validate creation of the ALB stack", () => {
  test("The stack creates successfully with a ALB & Cert", () => {
    const app = new cdk.App();
    const firewallstack = new FirewallVpcStack(app, "TestVpcStack", {
        vpcFlowLogBucket: "testbucket",
        vpcCidr: "100.250.0.0/16",
        internalRouteTableId: "id-6754",
        environmentName: "Dev",
        fwPolicy: "Route-Policy",
        orgARN: "id-78564",
        tgwId: "tgw-8675"
      });
    });
});