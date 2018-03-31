#!/bin/bash
aws rds create-db-instance --db-name mp1dbrnobsam --db-instance-identifier mp1-db-rnobsam --allocated-storage 20 --db-instance-class db.t2.micro --engine mysql --master-username mp1user --master-user-password mp1password --availability-zone us-west-2a
aws rds wait db-instance-available --db-instance-identifier mp1-db-rnobsam
echo "*************** DataBase Created ***************"
aws elb create-load-balancer --load-balancer-name rns-elb --listeners  "Protocol=HTTP,LoadBalancerPort=80,InstanceProtocol=HTTP,InstancePort=8080" --security-groups $1 --availability-zones us-west-2a
aws elb create-lb-cookie-stickiness-policy --load-balancer-name rns-elb --policy-name cookie-policy --cookie-expiration-period 60
aws elb set-load-balancer-policies-of-listener --load-balancer-name rns-elb --load-balancer-port 80 --policy-names cookie-policy
echo "*************** Load Balancer Created ***************"
aws autoscaling create-launch-configuration --launch-configuration-name mp1-config --key-name $2 --image-id $3 --instance-type t2.micro --user-data file://install-app-env.sh --iam-instance-profile $4 --security-groups $1
echo "*************** Launch Configuration Created ***************"
aws autoscaling create-auto-scaling-group --auto-scaling-group-name mp1-autoscaling --launch-configuration-name mp1-config --min-size 3 --max-size 5 --desired-capacity 3 --vpc-zone-identifier $5
echo "*************** Autoscaling group Created ***************"
aws autoscaling attach-load-balancers --load-balancer-names rns-elb --auto-scaling-group-name mp1-autoscaling
echo "*************** Launch configuration Attached ***************"
aws s3 mb s3://mp1s3rnobsam --region us-west-2
aws s3 mb s3://mp1s3rnobsampost --region us-west-2
echo "*************** S3 Bucket Created ***************"