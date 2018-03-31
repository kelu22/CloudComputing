#!/bin/bash
aws elb delete-load-balancer --load-balancer-name $1
IdInstances=$(aws ec2 describe-instances --query 'Reservations[*].Instances[*].[Placement.AvailabilityZone, State.Name, InstanceId]' --output text | grep us-west-2 | grep running | awk '{print $3}')
echo "************ The following instances are going to be deleted **********"
echo $IdInstances
aws ec2 terminate-instances --instance-ids $IdInstances
echo "******** Deleting enviroment process finished ***********"