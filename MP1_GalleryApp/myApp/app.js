var express = require('express');
var bodyParser = require('body-parser');
var path = require ('path');
var mime = require('mime');

var multer = require('multer');
var aws = require('aws-sdk');
var sharp = require('sharp'); //IMage transformation
var fileReader = require('fs');
var sql = require('mysql');

var accessKeyId =  process.env.AWS_ACCESS_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXX";
var secretAccessKey = process.env.AWS_SECRET_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXX";

aws.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: 'us-west-2'
});

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
var s3 = new aws.S3();

//Variables from the enviroment
var images_path = __dirname +'/views/images/';
var s3_name = 'mp1s3rnobsam';
var s3_name_transform = 'mp1s3rnobsampost';
var bbdd_name = 'mp1dbrnobsam';
var bbdd_user = 'mp1user';
var bbdd_pass = 'mp1password';

//Creation of the database
bbddConnect = sql.createConnection({
  host     : 'mp1-db-rnobsam.cm9anfhwkonp.us-west-2.rds.amazonaws.com',
  user     : bbdd_user,
  password : bbdd_pass,
  port     : '3306',
  database : bbdd_name
});

sqlCreate = 'CREATE TABLE images (\
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\
            name VARCHAR(32),\
            email VARCHAR(32),\
            phone VARCHAR(32),\
            url VARCHAR(255),\
            bwurl VARCHAR(255),\
            status INT(1),\
            receipt VARCHAR(255))';

bbddConnect.query(sqlCreate, function (err, result) {
    console.log(sqlCreate);
    if (err) {
        console.log('ERROR: ' + err);
        return;
    }
    console.log(result);
});


// MW: transform image to Black&White and upload it to post-S3 bucket
function transformImage(req,res,next) {
  console.log(' Transformation in black and white of the file: '+ uniqueFileName);
  sharp(images_path + uniqueFileName).greyscale().toFile(images_path + 'bw_'+ uniqueFileName, function(err, info) {
    if (err) {
      console.log('Error: '+err);
    } 
    else {
      uploadToS3(s3_name,uniqueFileName,null);
      uploadToS3(s3_name_transform, 'bw_'+uniqueFileName,next);
    }
  });
}


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
    fileReader.readFile(images_path+filename, function (err, data) {
        if (err) { throw err;}
        var bufferVar = new Buffer(data, 'binary');
        console.log("******************* Uploading to bucket: "+bucket+" *******************");
            s3.putObject({
                Bucket: bucket,
                Key: filename,
                Body: bufferVar,
                ACL: 'public-read'
            },
            function (resp) {
                console.dir(resp);
                console.log('Upload completed');
                if (callback) {callback(); return;}
            }
        );
    });
}
//Insert Local files into de DB
function insertIntoDB(req,res,next) {
    console.log("*************** Insertion of image in the database ***************");
    //res.send(req.files);
    sqlReq = 'INSERT INTO images (name, email, phone, url, bwurl, status, receipt) VALUES ?';
    var url = 'https://' + s3_name + '.s3.amazonaws.com/' + uniqueFileName;
    var bwurl = 'https://' + s3_name_transform+ '.s3.amazonaws.com/' + 'bw_' + uniqueFileName;
    var status = 1;
    var receipt = uniqueFileName.split(".")[0];
    var values = [[req.body.name,req.body.email, req.body.telephone, url , bwurl, status, receipt]];
    bbddConnect.query(sqlReq, [values], function (err, result) {
      console.log(sqlReq);
      console.dir(values);
      if (err) throw err;
      console.log("Result: ");
      console.dir(result);
    });
    fileReader.readdir(images_path, (err, files) => {
      if (err) throw err;
      console.log('Removing files:');
      for (const file of files) {
        console.log(file);
        fileReader.unlink(path.join(images_path, file), err => {
          if (err) throw err;
        });
      }
    });
    next();
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

app.post('/api/index', upload.single('image'), transformImage, insertIntoDB, function(req, res,next) {
  console.log("post done!");
  res.redirect('/index');
});


var server = app.listen(8080, function() {
    console.log("This app is displayed in port: ", server.address().port);
});
