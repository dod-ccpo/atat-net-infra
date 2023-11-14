import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { FirewallVpcStack } from "./atat-net-infra-firewall-vpc";
import * as AlbStack from "./atat-net-infra-alb";
describe("Validate creation of the ALB stack", () => {
  test("The stack creates successfully with a ALB & Cert", () => {
    const app = new cdk.App();
    const firewallstack = new FirewallVpcStack(app, "TestVpcStack", {
        vpcFlowLogBucket: "testbucket",
        vpcCidr: "6.250.0.0/16",
        internalRouteTableId: "id-6754",
        environmentName: "Dev",
        fwPolicy: "Route-Policy",
        orgARN: "id-78564",
        tgwId: "tgw-8675"
      });
    const stack = new AlbStack.AlbStack(app, "TestAlbStack", {
      atatfirewallVpc: firewallstack,
      apiDomain: "hello.world"
    });
  });
});