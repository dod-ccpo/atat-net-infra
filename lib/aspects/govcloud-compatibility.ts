import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as logs from "aws-cdk-lib/aws-logs";
import { IConstruct } from "constructs";

/**
 * Handles property overrides and modifications that could result in
 * the synthesized CloudFormation template being incompatible with
 * the AWS GovCloud (US) regions.
 *
 * This **will** make modifications to the resources in the stack as
 * necessary. If a modifications cannot be made, then an Error annotation
 * will be added to the node; this may result in synthesis failures, but
 * that is better than a deployment-time failure in nearly all cases.
 */
export class GovCloudCompatibilityAspect implements cdk.IAspect {
  visit(node: IConstruct): void {
    if (node instanceof logs.CfnLogGroup) {
      // The Tags property is not yet supported on AWS::Logs::LogGroup
      // resources in the GovCloud regions
      //  https://github.com/aws/aws-cdk/issues/17960
      if (node.tags) {
        cdk.Annotations.of(node).addWarning("Tags are not supported on Log Groups in GovCloud");
        node.addPropertyDeletionOverride("Tags");
      }
    }
  }
}