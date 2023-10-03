import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
// import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";

// import { AtatProps } from "./atat-net-infra-stack";
import { AtatNetS3Stack } from './atat-net-s3';


// export interface networkfirewall extends cdk.StageProps {
//   vpc: ec2.Vpc;
// }

// export interface PipelineStageStackProps extends cdk.StageProps {
//   firewallPolicyArn: string;
  // vpcId: string; // Define the prop to accept the imported value
  // Add any other necessary props
// }
// export class MyPipelineAppStage extends cdk.Stage {

//     constructor(scope: Construct, id: string, props?: cdk.StageProps & MyPipelineAppStageProps) {
//       super(scope, id, props);

//       const lambdaStack = new MyLambdaStack(this, 'LambdaStack');
//       const infra = new MyVpcStack(this, 'VpcStack');
//       // const netFirewallPolicy = new NetworkFirewallPolicy(this, 'NetworkFirewallPolicy');
//       // const netFirewall = new NetworkFirewall(this, 'NetworkFirewall', {
//       //   vpc: infra.vpc,

//       // });
//     }
// }
// export interface AtatProps {
//     environmentName: string;
//     vpcCidr?: string;
//     notificationEmail?: string;
//     //apiDomain?: ApiCertificateOptions;
// }

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const mys3 = new AtatNetS3Stack(this, 's3' );
    // const importedFirewallPolicyArn = cdk.Fn.importValue('FirewallPolicyArn');
    // const importedVpcId = cdk.Fn.importValue('VpcId');
    // Create the Network Firewall stack and reference the policy ID
    //const firewallPolicyStack = new firewallPolicyStack(this, 'NetworkFirewallPolicyStack');
    // const networkFirewallPolicyStack = new NetworkFirewallRules(this, 'NetworkFirewallPolicyStack');
    // Pass the firewall policy ARN as a parameter to the next stage

    // const firewallPolicyArn = cdk.Fn.importValue('FirewallPolicyOutputArn');
    // const firewallStack = new NetworkFirewall(this, 'NetworkFirewallStack'{
    //   firewallPolicyArn: networkFirewallPolicyStack.importedFirewallPolicyId
    //   });
  };
}

// interface PipelineStackProps extends cdk.StackProps {
//   repository: string;
//   branch: string;
// }