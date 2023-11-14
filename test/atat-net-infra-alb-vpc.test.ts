import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { FirewallVpcStack } from "../lib/atat-net-infra-firewall-vpc";
import { AlbStack}  from "../lib/atat-net-infra-alb";
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
    const loadBalancerstack = new AlbStack(app, "TestAlbStack", {
      atatfirewallVpc: firewallstack,
      apiDomain: "hello.world",
      env: {
        region: "us-reg-north-1",
      },
    });
  });
});