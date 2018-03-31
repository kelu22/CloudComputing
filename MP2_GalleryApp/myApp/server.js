var path = require ('path');
var multer = require("multer");
var aws = require('aws-sdk');
var fileReader = require('fs');
var sql = require('mysql');
var sqs = require('sqs');
var http = require('http');
var sqs = require('sqs');
var sharp = require('sharp');

var accessKeyId =  process.env.AWS_ACCESS_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXXXX";
var secretAccessKey = process.env.AWS_SECRET_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// Configurations for AWS
aws.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: 'us-west-2'
});

//Settings and usings
var s3 = new aws.S3();
sqs = new aws.SQS({region:'us-west-2'}); 

//Variables from the enviroment
var images_path = __dirname +'/views/images/';
var s3_name = 'mp1s3rnobsam';
var s3_name_transform = 'mp1s3rnobsampost';
var bbdd_name = 'mp1dbrnobsam';
var bbdd_user = 'mp1user';
var bbdd_pass = 'mp1password';
var sqsQueueUrl = 'https://us-west-2.queue.amazonaws.com/046098654462/mp1queuernobsam';
var snsUrl = 'arn:aws:sns:us-west-2:046098654462:mp1snsrnobsam'
var snsMail = new aws.SNS({region: 'us-west-2'}); // email in the same region
var uniqueFileName = '';
var imageID=0;

//Creation of the database
bbddConnect = sql.createConnection({
  host     : 'mp1-db-rnobsam.cm9anfhwkonp.us-west-2.rds.amazonaws.com',
  user     : bbdd_user,
  password : bbdd_pass,
  port     : '8888',
  database : bbdd_name
});

sqlCreate = 'CREATE TABLE images (\
        	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\
          name VARCHAR(32),\
        	email VARCHAR(42),\
        	phone VARCHAR(32),\
        	url VARCHAR(255),\
        	posturl VARCHAR(255),\
        	status INT(1),\
        	receipt VARCHAR(255))';

bbddConnect.query(sqlCreate, function (err, result) {
    console.log("Table images created into the database");
    if (err) {
        console.log('ERROR: ' + err);
        return;
    }
    console.log(result);
});


//Auxiliary method for update image to bucket (otherwise it gives a permission denied error)
function uploadToS3() {
    fileReader.readFile(images_path+'blackwhite-'+uniqueFileName, function (err, data) {
        if (err) { throw err;}
        var bufferVar = new Buffer(data, 'binary');
        console.log("------- Uploading image to the bucket:" + s3_name_transform + " ..........");
            s3.putObject({
                Bucket: s3_name_transform,
                Key: "blackwhite-"+uniqueFileName,
                Body: bufferVar,
                ACL: 'public-read'
            },
            function (resp) {
                console.dir(resp);
                console.log('Upload to the bucket: ' + s3_name_transform + 'completed');
                insertIntoDB();
            }
    );
  });
}

// Download the original image from the pre bucket
function getOriginalImage(url) {
  console.log("----- Downloading preprocessed image from the database.....");
  var params = {
    Bucket: s3_name,
    Key: uniqueFileName
  };

  var image = fileReader.createWriteStream(images_path + uniqueFileName);

  image.on('close', function(){
      console.log('The image has been downloaded from the pre-bucket and is going to be transformed');
      transformImage();
  });

  s3.getObject(params).createReadStream().on('error', function(err){
      console.log(err);
  }).pipe(image);
}

//Insert Local files into de DB
function insertIntoDB(req,res,next) {
    console.log("-------- Modificating the image row in the Database......");
    var posturl = 'https://'+s3_name_transform+ '.s3.amazonaws.com/' + 'blackwhite-' + uniqueFileName;
    sqlReq = "UPDATE images \
            SET posturl = '" + posturl + "',\
                status = 1,\
                receipt = 'blackwhite-" + uniqueFileName.split(".")[0] + "'\
            WHERE id =" + imageID.toString();
    
    bbddConnect.query(sqlReq, function (err, result) {
      if (err) throw err;
      console.log("Result: ");
      console.log(result);
      sendToSNS();
    });
    fileReader.readdir(images_path, (err, files) => {
      if (err) throw error;
      for (const file of files) {
        fileReader.unlink(path.join(images_path, file), err => {
          if (err) throw error;
        });
      }
    });
}
// MW: transform image to Black&White and upload it to post-S3 bucket
function transformImage(req,res,next) {
  console.log(' Transformation in black and white of the file: '+ uniqueFileName);
  sharp(images_path + uniqueFileName).greyscale().toFile(images_path + 'blackwhite-'+ uniqueFileName, function(err, info) {
    if (err) {
      console.log('Error: '+err);
    } 
    else {
      uploadToS3();
    }
  });
}


function sendToSNS() {
  console.log("----- Sending a SNS notification......");
  sqlReq = 'SELECT * FROM images WHERE id=' + imageID.toString();
  bbddConnect.query(sqlReq, function (err, result) {
    console.log(sql);
    if (err) {
      //throw err;
      console.log('Error: ' + err);
      return;
    }
    // Send to SNS

    var resultBBDD = result[0];

    // Send to SMS to phone number
    var emailSended = {
      Message: JSON.stringify(resultBBDD), 
      Subject: 'Here is the image you uploaded processed',
      TopicArn: snsUrl
    };

    snsMail.publish(emailSended, function(err, data) {
      console.log("SNS publish callback: ");
      if (err) {
        console.log(err);
      }
      if(data) console.log(data);
    });
  });
}


//Polling from the SQS
setInterval(function() {
  sqs.receiveMessage({
      QueueUrl: sqsQueueUrl,
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 8, 
      WaitTimeSeconds: 6 
    }, 
    function(err, data) {
      if (data.Messages) {
        var downloadedMessage = data.Messages[0]
        var message = JSON.parse(downloadedMessage.Body);
        // Now this is where you'd do something with this message
        console.log("We have received the following message from the SQS: ")
        console.log(message);

        uniqueFileName = message.filename;
        imageID = message.imageId;
        init(message.preURL);
        //Delete message from the queue
        sqs.deleteMessage(
          {
            QueueUrl: sqsQueueUrl,
            ReceiptHandle: downloadedMessage.ReceiptHandle
          }, 
          function(err, data) {
            console.log(err);
          }
        );
      } 
   }
  );
}, 6000);


//FUnction init
function init(url) {
  getOriginalImage(url);
}