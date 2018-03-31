#!/usr/bin/python

import os, requests, argparse

parser = argparse.ArgumentParser()
parser.add_argument('--images-folder-path', required=True, help="Path to the images for the test")
parser.add_argument('--elb-DNS', required=True, help="DNS of the load balancer for the test")

args = parser.parse_args()

print(args)

values = {'name': 'test-name', 'email': 'test-email', 'telephone': 'test-phone'}

for filename in os.listdir(args.images_path):
	print('Uploading ' + filename)
	file = {'image': open(args.images_path + filename, 'rb')}
	r = requests.post('http://' + args.elb_DNS + '/api/index', files=file,data=values)