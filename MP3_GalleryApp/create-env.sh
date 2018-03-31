#!/bin/bash
echo "------- Creating databases........."
aws rds create-db-instance --db-name mp1dbrnobsam --db-instance-identifier mp1-db-rnobsam --allocated-storage 20 --db-instance-class db.t2.micro --engine mysql --master-username mp1user --master-user-password mp1password --port 8888
aws rds wait db-instance-available --db-instance-identifier mp1-db-rnobsam
aws rds create-db-instance-read-replica --db-instance-identifier mp1-db-rnobsam-rep --source-db-instance-identifier mp1-db-rnobsam --db-instance-class db.t2.micro --port 8888
aws rds wait db-instance-available --db-instance-identifier mp1-db-rnobsam-rep
echo "---------- DataBases Created ----------"
echo "------- Creating Load Balancer........."
aws elb create-load-balancer --load-balancer-name rns-elb --listeners "Protocol=HTTP,LoadBalancerPort=80,InstanceProtocol=HTTP,InstancePort=8888" --security-groups $1 --availability-zones us-west-2a
aws elb create-lb-cookie-stickiness-policy --load-balancer-name rns-elb --policy-name cookie-policy --cookie-expiration-period 60
aws elb set-load-balancer-policies-of-listener --load-balancer-name rns-elb --load-balancer-port 80 --policy-names cookie-policy
echo "---------- Load Balancer Created ----------"
echo "------- Creating Launch configuration........."
aws autoscaling create-launch-configuration --launch-configuration-name mp1-config --key-name $2 --image-id ami-a8c810d0 --instance-type t2.micro --user-data file://install-app-env.txt --iam-instance-profile $3
echo "---------- Launch Configuration Created ----------"
echo "------- Creating Autoscaling group........."
aws autoscaling create-auto-scaling-group --auto-scaling-group-name mp1-autoscaling --launch-configuration-name mp1-config --min-size 3 --max-size 5 --desired-capacity 3 --vpc-zone-identifier $4
echo "---------- Autoscaling group Created ----------"
echo "------- Creating backend EC2........."
aws ec2 run-instances --image-id ami-a8c810d0 --count 1 --instance-type t2.micro --key-name $2 --security-group-ids $1 --subnet-id $4 --user-data file://install-backend-env.txt  --iam-instance-profile Name=developer
echo "---------- Backend EC2 Created ----------"
echo "------- Attaching autoscaling group to the load balancer........."
aws autoscaling attach-load-balancers --load-balancer-names rns-elb --auto-scaling-group-name mp1-autoscaling
echo "---------- Launch configuration Attached ----------"
echo "------- Creating S3 buckets........."
aws s3 mb s3://mp1s3rnobsam --region us-west-2 
aws s3 mb s3://mp1s3rnobsampost --region us-west-2
echo "---------- S3 Bucket Created ----------"
echo "------- Creating SQS ........."
aws sqs create-queue --queue-name mp1queuernobsam
echo "---------- SQS Created ----------"
echo "------- Creating SNS ........."
aws sns create-topic --name mp1snsrnobsam
aws sns subscribe --topic-arn arn:aws:sns:us-west-2:046098654462:mp1snsrnobsam --protocol email --notification-endpoint $5
echo "---------- SNS Created ----------"

