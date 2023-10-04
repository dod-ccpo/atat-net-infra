import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
import { NagSuppressions, NIST80053R4Checks, AwsSolutionsChecks } from 'cdk-nag';
// import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";


import { TransitGatewayStack } from './atat-net-infra-tgw';

export class NetInfraPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const mys3 = new TransitGatewayStack(this, 'transit-gateway' );
    cdk.Aspects.of(mys3).add(new NIST80053R4Checks({ verbose: true }));

  };
}
