# Abstract

Dashboard application for the GalleryApp that shows:
* Status’ of jobs in the database
* All of the items in the SQS Queue (Cloudwatch Metrics)
* CPU usage for your instances

# Usage

This is a local application for testing our running MP2, getting different metrics from this cloud application and displaying them on a friendly UI. 

Follow the next steps for a functional local dashboard application:
-  Launch the MP2 by calling the create-env.sh script with the following parameters:
		sh create_env.sh *security-group-id* *keypair-name* *Instance profile ARN URL from the role* *subnet-id* *notification email* *endpoint for the SNS*
-  Open a terminal and go to the directory where you have saved the MP3/myDashboard folder, and make sure that node and npm are installed.
-  Type on the command line inside this folder: node localdash.js
-  Open a browser an go to  http://localhost:8888 to see the application running!
-  In this Dashboard Application we have three views:
	-  Main Page (Home): Here are listed all the DB jobs and their status.
	-  EC2 Metrics: Here are listed all the metrics of the instances grouped by InstaceType (t2.micro)
-  For testing, just execute in your command line: python large-scale-test.py --images-folder-path *yourDirectory/* --elb-DNS *theELB_DNS*

# Assumptions
-  The create-env.sh script creates the read-RDS replica.
-  The security group that you specify must have the port 8888 open.
-  The MP2 has to be running previously, with all the infraestructure components ready. In this same folder are provided the diferent scripts for launching and deletting the enviroment for MP2.
-  The MP2 downloads automatically the cloud gallery application from github.
-  We have used 'Average' statistics for EC2 instances and 'Sum' statistics for queue.

# Main infraestructure

