#!/bin/bash
echo "------- Deleting Load Balancer........."
aws elb delete-load-balancer --load-balancer-name rns-elb
echo "---------- Load Balancer deleted ----------"
echo "------- Deleting S3 buckets........."
aws s3 rm s3://mp1s3rnobsam --recursive
aws s3 rm s3://mp1s3rnobsampost --recursive
aws s3api delete-bucket --bucket mp1s3rnobsam --region us-west-2
aws s3api delete-bucket --bucket mp1s3rnobsampost --region us-west-2
echo "---------- S3 buckets deleted ----------"
echo "------- Deleting autoscaling group........"
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name mp1-autoscaling --force-delete
echo "---------- Autoscaling group deleted ----------"
echo "------- Deleting backend EC2........"
aws ec2 terminate-instances --instance-ids $1
echo "---------- Backend EC2 deleted ----------"
echo "------- Deleting launch configuration........"
aws autoscaling delete-launch-configuration --launch-configuration-name mp1-config
echo "---------- Launch configuration deleted ----------"
echo "------- Deleting SQS ........"
aws sqs delete-queue --queue-url https://us-west-2.queue.amazonaws.com/046098654462/mp1queuernobsam
echo "---------- SQS deleted ----------"
echo "------- Deleting SNS ........"
aws sns delete-topic --topic-arn arn:aws:sns:us-west-2:046098654462:mp1snsrnobsam
echo "---------- SNS deleted ----------"
echo "------- Deleting database ........"
aws rds delete-db-instance --db-instance-identifier mp1-db-rnobsam --skip-final-snapshot
aws rds delete-db-instance --db-instance-identifier mp1-db-rnobsam-rep --skip-final-snapshot
echo "---------- Database deleted ----------"