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

    const atatFirewallVpc = new FirewallVpcStack(this, 'AtatFirewallVpc', {
      vpcCidr: props.vpcCidr,
      environmentName: props.environmentName,
      tgwId: atatTgw.tgwId
    } );

    const atatFirewallPolicyStack = new NetworkFirewallRules(this, 'NetworkFirewallPolicyStack');


    cdk.Aspects.of(atatFirewallVpc).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatTgw).add(new NIST80053R4Checks({ verbose: true }));
    cdk.Aspects.of(atatFirewallPolicyStack).add(new NIST80053R4Checks({ verbose: true }));

  };
}

export interface AtatPipelineStackProps extends cdk.StackProps {
  branch: string;
  repository: string;
  githubPatName: string;
}
