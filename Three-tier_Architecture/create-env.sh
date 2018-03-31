#!/bin/bash
pip install awscli --upgrade --user
aws ec2 run-instances --image-id $1 --count $2 --instance-type t2.micro --key-name $3 --security-groups $4 --placement AvailabilityZone=us-west-2b --user-data file://apache.sh
echo '*********** Creating instances ***************'
sleep 30
idSecGroup=$(aws ec2 describe-security-groups --group-name $4 | grep SECURITYGROUPS | awk '{print $5}')
echo $idSecGroup
idInstances=$(aws ec2 describe-instances --query 'Reservations[*].Instances[*].[Placement.AvailabilityZone, State.Name, InstanceId]' --output text | grep us-west-2 | grep running | awk '{print $3}')
echo $idInstances
aws ec2 wait instance-status-ok --instance-ids $idInstances
echo '********** Creating load balancer **********'
aws elb create-load-balancer --load-balancer-name rns-elb2 --listeners "Protocol=HTTP,LoadBalancerPort=80,InstanceProtocol=HTTP,InstancePort=4000" --security-groups $idSecGroup --availability-zones us-west-2b
aws elb register-instances-with-load-balancer --load-balancer-name rns-elb2 --instances $idInstances
#Create policy for load balancer
aws elb create-lb-cookie-stickiness-policy --load-balancer-name rns-elb2 --policy-name cookie-policy --cookie-expiration-period 60
#set policy for load balancer
aws elb set-load-balancer-policies-of-listener --load-balancer-name rns-elb2 --load-balancer-port 80 --policy-names cookie-policy
aws elb wait instance-in-service --load-balancer-name rns-elb2 --instances $idInstances
echo '********** Installation of Jekyll **********'
sudo apt-get update
sudo apt-get install ruby-dev -y
sudo apt-get install ruby-bundler -y
sudo apt-get install ruby-dev build-essential
sudo apt-get install build-essential patch -y
git clone https://github.com/jhajek/forge.git
cd forge/
bundle install
bundle exec jekyll serve --host 0.0.0.0



