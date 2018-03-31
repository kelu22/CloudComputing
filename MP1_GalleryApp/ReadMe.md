# Abstract

Deployment of a web application that includes three pages:
	- Index page: A welcome page that has links to the gallery and submit page
	- Gallery page: Reads your database and retrieves all of the before and after pictures
	- Submit page (form): Upon submission of the form, images are placed in an S3 bucket, and a URL and information relating to that job is entered.

For the infraestructure, we are going to use AWS tools:
	- Load Balancer with sticky-bits
	- AutoScaling group (desired state 3 EC2 instances) w/Launch configuration
	- 1 RDS instance (MySQL)
	- S3 Bucket for storing before processing (raw image uploaded by the user)
	- S3 Bucket for storing after processing(image in black and white)

# Usage

For running create_env.sh script, please execute the next command from your vagrant box: sh create_env.sh *security-group-id* *keypair-name* *AMI-ID* *Instance profile ARN URL from the role* *VPN zone Identifier*

This order will launch the enviroment, assuming that the names of the architecture's elements are:
* LOAD BALANCER NAME: rns-elb
* LAUNCH CONFIGURATION NAME: mp1-config
* AUTOSCALING GROUP NAME: mp1-autoscaling
* DATABASE NAME: mp1dbrnobsam
* DATABASE IDENTIFIER: mp1-db-rnobsam
* BUCKET PRE-PROCCESS NAME: mp1s3rnobsam
* BUCKET POST-PROCCESS NAME: mp1s3rnobsampost

For running delete_env.sh script, please execute the next command from your vagrant box: sh delete_env.sh

For using the application, please wait about 2 minutes (the instances have to be in a running state) and type in your browser the DNS of the Load Balancer

# Assumptions

- In the AWS Configuration, it is supposed to have a text output and not .json format.
- The availability zone of the instances is us-west-2b
- The vagrant box has already installed AWSCLI tools and git.
- The security group that is used must have the port 8080 and 3306 open.
- The role choosen must have IAMFullAccess and Power Access.