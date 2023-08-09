#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AtatNetInfraStack } from '../lib/atat-net-infra-stack';

const app = new cdk.App();
new AtatNetInfraStack(app, 'AtatNetInfraStack');
