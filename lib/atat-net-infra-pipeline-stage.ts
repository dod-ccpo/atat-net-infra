import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
import { NagSuppressions, NIST80053R4Checks, AwsSolutionsChecks } from 'cdk-nag';
// import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";
import { TransitGatewayStack } from './atat-net-infra-tgw';

// export interface AtatProps extends cdk.StackProps {
//   orgARN: string;
// }

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const atatTgw = new TransitGatewayStack(this, 'AtatTransitGateway' );

    cdk.Aspects.of(atatTgw).add(new NIST80053R4Checks({ verbose: true }));

  };
}

export interface AtatPipelineStackProps extends cdk.StackProps {
  branch: string;
  repository: string;
  githubPatName: string;
}
