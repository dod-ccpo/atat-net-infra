import * as cdk from 'aws-cdk-lib';
import { Function, InlineCode,Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface MultiStackProps extends cdk.StackProps {
  encryptBucket?: boolean;
}

export class AtatNetLambda extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: MultiStackProps) {
    super(scope, id, props);

    new Function(this, 'Lambda-Net-Firewall', {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: new InlineCode('exports.handler = _ => "Hello, CDK')
    })
  }
}