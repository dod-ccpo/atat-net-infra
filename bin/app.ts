import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as utils from "../lib/util";
import { RemovalPolicySetter } from "../lib/aspects/removal-policy";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";
import { AtatContextValue } from "../lib/context-values";
import { AtatPipelineStack } from "../lib/atat-net-infra-pipeline";
import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";

export function createApp(this: any, props?: cdk.AppProps): cdk.App {
  const app = new cdk.App(props);

  const environmentParam = AtatContextValue.ENVIRONMENT_ID.resolve(app);
  // const vpcCidrParam = AtatContextValue.VPC_CIDR.resolve(app);
  const deployRegion = AtatContextValue.DEPLOY_REGION.resolve(app);
  const branchParam = AtatContextValue.VERSION_CONTROL_BRANCH.resolve(app);
//   const environmentName = environmentParam;

  if (!utils.isString(environmentParam)) {
        const err = `An EnvironmentId must be provided (use the ${AtatContextValue.ENVIRONMENT_ID} context key)`;
        console.error(err);
        throw new Error(err);
      }
      const environmentName = utils.normalizeEnvironmentName(environmentParam);
      // We need to be able to handle the value being undefined or some unexpected type.
      // Because "false" (as a string) is truthy, we need to allow specific values.

  // const apiStack = new AtatNetInfraStack(app, `${environmentName}-NetFirewall`, {
  //       environmentName,
  //     });

  const pipelineStack = new AtatPipelineStack(app, "AtatEnvironmentPipeline", {
    environmentName,
    // vpcCidr: vpcCidrParam,
    repository: AtatContextValue.VERSION_CONTROL_REPO.resolve(app),
    branch: branchParam,
    githubPatName: AtatContextValue.GITHUB_PAT_NAME.resolve(app),
    // Set the notification email address, unless we're building the account where
    // sandbox environments live because our inboxes would never recover.
    notificationEmail: environmentName,
    env: {
      region: deployRegion,
    },
  });
return app;
}

function validateCidr(cidr: string): boolean {
    const AWS_MIN_NETMASK = 16;
    const AWS_MAX_NETMASK = 28;
    try {
      const [address, prefix] = cidr.split("/");
      const prefixInt = parseInt(prefix);
      if (!prefixInt || prefixInt < AWS_MIN_NETMASK || prefixInt > AWS_MAX_NETMASK) {
        return false;
      }
      const octets = address
        .split(".")
        .map((oct) => parseInt(oct))
        .filter((oct) => oct >= 0 && oct <= 255);
      return octets.length === 4;
    } catch (err) {
      return false;
    }
}
