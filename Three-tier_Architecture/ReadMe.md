# Usage

For running create_env.sh script, please execute the next command from your vagrant box: sh create_env.sh *AMI-ID* *count* *keypair-name* *security-group-name*
For running delete_env.sh script, please execute the next command from your vagrant box: sh delete_env.sh *load-balancer-name*

# Assumptions

- In the AWS Configuration, it is supposed to have a text output and not .json format.
- Load balancer name is not a parameter, so the name that it will be given is: *rns-elb2*
- The availability zone of the instances is us-west-2b
- The vagrant box has already installed AWSCLI tools and git.
- The security group that is used must have the port 4000 open.