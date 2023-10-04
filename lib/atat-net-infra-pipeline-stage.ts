import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
// import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";


import { AtatNetS3Stack } from './atat-net-s3';

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const mys3 = new AtatNetS3Stack(this, 's3' );

  };
}
