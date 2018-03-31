#!/bin/bash
set -e -x
cd /home/ubuntu
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential
git clone https://youruser:yourpassword@github.com/illinoistech-itm/rnoblejassampedro.git
cd rnoblejassampedro/ITMO-544/MP1/myApp/views/
mkdir images
cd /home/ubuntu
cd rnoblejassampedro/ITMO-544/MP1/myApp/
sudo npm install touch
npm install express --save
npm install aws-sdk
npm install body-parser
npm install path
sudo npm install mime
npm install multer
npm install fs
npm install mysql
sudo npm install sharp
sudo npm install forever -g
forever start app.js

