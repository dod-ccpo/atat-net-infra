import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
import { NagSuppressions, NIST80053R4Checks, AwsSolutionsChecks } from 'cdk-nag';
import { TransitGatewayStack } from './atat-net-infra-tgw';
import { FirewallVpcStack } from './atat-net-infra-firewall-vpc'
import { NetworkFirewallRules } from './atat-net-infra-firewall-policy'

export interface AtatProps extends cdk.StackProps {
  vpcCidr?: string;
  environmentName: string;
  orgARN: string;
}

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps ) {
    super(scope, id, props);

    const atatTgw = new TransitGatewayStack(this, 'AtatTransitGateway', {
      orgARN: props.orgARN
    });

    const atatFirewallPolicyStack = new NetworkFirewallRules(this, 'NetworkFirewallPolicyStack');

    const atatFirewallVpc = new FirewallVpcStack(this, 'AtatFirewallVpc', {
      vpcCidr: props.vpcCidr,
      environmentName: props.environmentName,
      tgwId: atatTgw.tgwId,
      fwPolicy: atatFirewallPolicyStack.fwPolicy

    });

    cdk.Aspects.of(atatFirewallVpc).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatTgw).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatFirewallPolicyStack).add(new NIST80053R4Checks({ verbose: true }));

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
}
