import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions, NIST80053R4Checks } from 'cdk-nag';
import { TransitGatewayStack } from './atat-net-infra-tgw';
import { FirewallVpcStack } from './atat-net-infra-firewall-vpc'
import { NetworkFirewallRules } from './atat-net-infra-firewall-policy'
import { AlbStack } from './atat-net-infra-alb';
import { WebApplicationFirewall } from './atat-net-infra-waf'

export interface AtatProps extends cdk.StackProps {
  vpcCidr?: string;
  environmentName: string;
  fullorgARN: string;
  apiDomain: string;
}

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps ) {
    super(scope, id, props);

    const orgSplit = props.fullorgARN.split("/");
    const orgID = orgSplit[1]

    // atat-net-infra-tgw stack
    const atatTgw = new TransitGatewayStack(this, 'AtatTransitGateway', {
      orgARN: orgID
    });

    // atat-net-infra-firewall-policy stack
    const atatFirewallPolicyStack = new NetworkFirewallRules(this, 'NetworkFirewallPolicyStack');

    // atat-net-infra-firewall-vpc stack
    const atatFirewallVpc = new FirewallVpcStack(this, 'AtatFirewallVpc', {
      vpcCidr: props.vpcCidr,
      environmentName: props.environmentName,
      tgwId: atatTgw.tgwId,
      fwPolicy: atatFirewallPolicyStack.fwPolicy,
      internalRouteTableId: atatTgw.internalRouteTable.ref,
      orgARN: orgID
    });

    // atat-net-infra-waf stack
    const atatWebApplicationFirewall = new WebApplicationFirewall(this, 'AtatWaf', {
      environmentName: props.environmentName,
    });

    // // atat-net-infra-alb stack
    const atatFirewallLoadBalancer = new AlbStack(this, 'AtatALB', {
      environmentName: props.environmentName,
      atatfirewallVpc: atatFirewallVpc,
      apiDomain: props.apiDomain,
      orgARN: orgID,
      webACL: atatWebApplicationFirewall.webACL,
    });

    cdk.Aspects.of(atatFirewallVpc).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatTgw).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatFirewallPolicyStack).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatWebApplicationFirewall).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatFirewallLoadBalancer).add(new NIST80053R4Checks({ verbose: true }));

    NagSuppressions.addStackSuppressions(atatFirewallVpc, [
      // This is a temporary supression (hopefully) and we will adopt this as soon as the feature
      // is actually available within the GovCloud partition. We have internally opened an
      // AWS Support case for this issue.
      {
        id: "NIST.800.53.R4-CloudWatchLogGroupEncrypted",
        reason: "CloudFormation does not support KmsKeyId for AWS::Logs::LogGroup in us-gov-west-1",
      },
      {
        id: "NIST.800.53.R4-IAMNoInlinePolicy",
        reason: "IAM Inline policy proposes no risk to security using it for resources",
      },
      {
        id: "NIST.800.53.R4-CloudWatchLogGroupRetentionPeriod",
        reason: "CW logs are retaining logs by 12 months",
      }

    ]);


  };
}

export interface AtatPipelineStackProps extends cdk.StackProps {
  branch: string;
  repository: string;
  githubPatName: string;
  apiDomain: string;
}
