#!/bin/bash
aws elb delete-load-balancer --load-balancer-name rns-elb
echo "*************** Load Balancer Deleted ***************"
aws s3 rm s3://mp1s3rnobsam --recursive
aws s3 rm s3://mp1s3rnobsampost --recursive
aws s3api delete-bucket --bucket mp1s3rnobsam --region us-west-2
aws s3api delete-bucket --bucket mp1s3rnobsampost --region us-west-2
echo "*************** S3 Bucket Deleted ***************"
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name mp1-autoscaling --force-delete
echo "*************** Autoscaling group Deleted ***************"
aws autoscaling delete-launch-configuration --launch-configuration-name mp1-config
echo "*************** Launch configuration Deleted ***************"
aws rds delete-db-instance --db-instance-identifier mp1-db-rnobsam --skip-final-snapshot
echo "*************** Database Deleted ***************"