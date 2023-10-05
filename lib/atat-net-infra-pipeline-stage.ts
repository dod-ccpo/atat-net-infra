import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
import { NagSuppressions, NIST80053R4Checks, AwsSolutionsChecks } from 'cdk-nag';
// import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { TransitGatewayStack } from './atat-net-infra-tgw';
import { AtatS3Bucket } from './atat-shared-data-stack';

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const atatTgw = new TransitGatewayStack(this, 'AtatTransitGateway' );
    cdk.Aspects.of(atatTgw).add(new NIST80053R4Checks({ verbose: true }));

    const atats3bucket = new AtatS3Bucket(this, 'AtatFireWallBucket', {} );
    cdk.Aspects.of(atats3bucket).add(new NIST80053R4Checks({ verbose: true }));

  };
}

export interface AtatPipelineStackProps extends cdk.StackProps {
  branch: string;
  repository: string;
  githubPatName: string;
}
