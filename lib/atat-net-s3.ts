import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";


export interface NetInfraStackProps extends cdk.StackProps {
  environmentName: string;
}


export class AtatNetS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NetInfraStackProps) {
    let result = null;
    super(scope, id);


const testBucket = new s3.Bucket(this, `Jesse-Pipeline-Test-Bucket`, {
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  versioned: true,
  objectLockEnabled: true,
  objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
}
)}
}
