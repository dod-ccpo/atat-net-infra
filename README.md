# ATAT Net Infrastructure

This repository is responsible for deploying the AWS network firewall 
and all the network resources for the ATAT web API in the transit account.
This network design is used to leverage AWS native services to ensure security 
and network functionality. 

## Deploying

`atat-net-infra` is built as an [AWS CDK application](https://docs.aws.amazon.com/cdk/v2/guide/home.html). The
development and deployment process therefore heavily use the `aws-cdk` CLI.

The main requirments for the cdk deployment command are:
 - A full environment managed by a CI/CD pipeline.
 - A CIDR for the firewall vpc.
 - The Org ARN of the environment the repo is being deployed to. 

In general, the steps to deploy each are approximately the same, following the typical `cdk diff`/`cdk deploy`
workflow. Which path is chosen is determined based on the values of a CDK Context variable value.

### Deploying a "full" environment

Because a full environment deployment requires the usage of a full CI/CD pipeline, it also needs additional
configuration values to understand which `git` repository to watch and what credentials should be used to do
so. Like a Sandbox environment, the `atat:EnvironmentId` context value must also be set. Additionally, a
Secret must be created within Secrets Manager to store a GitHub Personal Access Token.

The required context values are:
 - `atat:EnvironmentId`, which should be the unique name used to identify the environment
 - `atat:orgARN`, which is used to allow same org permissions for cross-account access
 - `atat:VersionControlBranch`, which should be the branch within the repository to watch for changes
 - `atat:GitHubPatName`, which should be the name of the Secret that contains the GitHub PAT
 - `atat:VersionControlRepo`, which should be name of the GitHub repository where the code is stored,
    including the organization name (for example, `dod-ccpo/atat-web-api`)

 These values can, of course, be set either through the CLI or via the `cdk.json` file. The last two have
reasonable defaults set within the `cdk.json` file. Therefore, once you have confirmed those values look
correct, deploying follows similar steps to the sandbox environment!

Start off by ensuring the changes to make look reasonable:

```bash
cdk diff -c atat:EnvironmentId=<ENVIRONMENT_ID>
```

And then once you've confirmed that they do, deploy:

```bash
cdk deploy -c atat:EnvironmentId=<ENVIRONMENT_ID>
```

The deployed pipeline will be self-mutating so futher manual deployments should be rarely needed.
The primary situations needing manual deployment are:
 - When the GitHub PAT is rotated (using the `atat:ForceGitHubTokenVersion` context)
 - Use the `aws secretsmanager list-secret-version-ids` command to get the latest PAT version.
 - When changes that require additional command line arguments to `cdk synth` in the self-mutate
   step are made
 - When it is necessary to change the branch being watched without a corresponding push to the
   current target branch (for example, to switch from watching `main` to watching `develop`)