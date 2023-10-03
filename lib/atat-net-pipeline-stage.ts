import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";


export class MyPipelineAppStage extends cdk.Stage {
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        const firewalls3bucket = new AtatNetInfraStack(this, 'firewall-bucket', {});

    }
}