import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface AtatNetStackProps extends cdk.StackProps {
    environmentName?: string;
    apiDomain: string;
    orgARN: string;
    webACL: string;
}

export async function creates3Bucket(this: any, envName: string) {
    const myBucket = new s3.Bucket(this, `${envName}-test-bucket`, {
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
}