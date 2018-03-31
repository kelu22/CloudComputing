# Abstract

Separation of the frontend and the backend of the MP1 in this folder in two diferent instances.Second backend system that will handle your image processing. When a user post a new image, it is placed in a SQS and retrieved by the backend for processing. Also, the user receives a notification that a new image has been posted via SNS.

# Usage

For running create_env.sh script, please execute the next command from your vagrant box: sh create_env.sh *security-group-id* *keypair-name* *Instance profile ARN URL from the role* *subnet-id* *notification email endpoint for the SNS*

This order will launch the enviroment, assuming that the names of the architecture's elements are:
* LOAD BALANCER NAME: rns-elb
* LAUNCH CONFIGURATION NAME: mp1-config
* AUTOSCALING GROUP NAME: mp1-autoscaling
* DATABASE NAME: mp1dbrnobsam
* DATABASE IDENTIFIER: mp1-db-rnobsam
* BUCKET PRE-PROCCESS NAME: mp1s3rnobsam
* BUCKET POST-PROCCESS NAME: mp1s3rnobsampost
* AMI-ID: the one that we have created with full access to the private repository from GitHub

For running delete_env.sh script, please execute the next command from your vagrant box: sh delete_env.sh *EC2 instance ID that is acting as the backend*

# Assumptions

- In the AWS Configuration, it is supposed to have a text output and not .json format.
- The availability zone of the instances is us-west-2a
- The vagrant box has already installed AWSCLI tools and git.
- The security group that is used must have the port 8888 open.
- The role choosen must have IAMFullAccess and Power Access.
- The URL of the SQS, the ARN of the SNS and the endpoint of the RDS have been harcoded in the scripts.
- All the scripts provided in this folder are available in the same directory in the moment of launching the create-env.sh script.