var express = require('express');
var bodyParser = require('body-parser');
var path = require ('path');
var mime = require('mime');
var multer = require("multer");
var aws = require('aws-sdk');
var fileReader = require('fs');
var sql = require('mysql');
var sqs = require('sqs');

var accessKeyId =  process.env.AWS_ACCESS_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXXXX";
var secretAccessKey = process.env.AWS_SECRET_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// Configurations for AWS
aws.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: 'us-west-2'
});

//Configuration for the SQS 
var queue = sqs({
    access: accessKeyId,
    secret: secretAccessKey,
    region:'us-west-2' 
});

//Settings and usings
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
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
var imageID ='';
var url = '';

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
    console.log("Table images created in the database");
    if (err) {
        console.log('ERROR: ' + err);
        return;
    }
});


//Upload of an image to the bucket
var uniqueFileName = '';
var upload = multer({
    dest: images_path, 
    storage: multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, images_path)
    },
    filename: function (req, file, cb) {
        uniqueFileName = Date.now() + '.' + mime.getExtension(file.mimetype);
        cb(null, uniqueFileName);
    }
})
});
 

//Auxiliary method for update image to bucket (otherwise it gives a permission denied error)
function uploadToS3(bucket, filename, callback) {
    fileReader.readFile(images_path + uniqueFileName, function (err, data) {
        if (err) { throw err;}
        var bufferVar = new Buffer(data, 'binary');
        console.log("-----Inserting image preprocessed into"+ s3_name +" ........");
            s3.putObject({
                Bucket: s3_name,
                Key: uniqueFileName,
                Body: bufferVar,
                ACL: 'public-read'
            },
            function (resp) {
                console.log('Upload to the bucket' + s3_name + 'completed');
                if (callback) {callback(); return;}
            }
        );
    });
}

//Insert Local files into de DB
function insertIntoDB(req,res,next) {
    console.log("-----Inserting image preprocessed into the database.....");
    sqlReq = 'INSERT INTO images (name, email, phone, url, posturl, status, receipt) VALUES ?';
    url = 'https://' + s3_name + '.s3.amazonaws.com/' + uniqueFileName;
    var posturl = ''; //It is not done here anymore
    var status = 0; //The image is not transformed 
    var receipt = uniqueFileName.split(".")[0];
    var values = [[req.body.name,req.body.email, req.body.telephone, url , posturl, status, receipt]];
    bbddConnect.query(sqlReq, [values], function (err, result) {
      if (err) throw err;
      console.log("Result: ");
      console.dir(result);
      imageID = result.insertId.toString(); //Get imageID from the response
      next();
    });
    fileReader.readdir(images_path, (err, files) => {
      if (err) throw err;
      console.log('Removing files from the local folder:');
      for (const file of files) {
        console.log(file);
        fileReader.unlink(path.join(images_path, file), err => {
          if (err) throw err;
        });
      }
    });
}


//Middleware for insertion of the image ID into the queue
function insertIntoSQS(req, res, next) {
  console.log("-----Inserting image ID into the SQS.....");
  var content = { 
    imageId: imageID, 
    preURL: url, 
    filename: uniqueFileName
  };
  var sqsPar = {
    MessageBody: JSON.stringify(content),
    QueueUrl: sqsQueueUrl
  };
    sqs.sendMessage(sqsPar, function(err, data) {
    if (err) {
      console.log('ERR', err);
    }
  });
  if (next) next();
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//open in browser to see upload form
app.get('/', function (req, res) {
    res.render('index');
});

app.get('/index', function(req, res) {
  res.render('index');
});

app.get('/upload', function(req, res) {
  res.render('upload');
});
app.get('/show', function(req, res) {
    //Load image data from database
    sqlReq = 'SELECT * FROM images';
    bbddConnect.query(sqlReq, function (err, result) {
      console.log(sqlReq);
      if (err) {
        console.log('Error: ' + err);
        return;
      }
      console.log("Result: ");
      console.dir(result);
      res.render('show', {
        images: JSON.parse(JSON.stringify(result))
    });
    });
});

app.post('/api/index', upload.single('image'),  uploadToS3, insertIntoDB, insertIntoSQS,function(req, res,next) {
  console.log("post done!");
  res.render('index');
});


var server = app.listen(8888, function() {
    console.log("This app is displayed in port: ", server.address().port);
});
