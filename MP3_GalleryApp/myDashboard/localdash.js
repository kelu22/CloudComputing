var express = require('express');
var bodyParser = require('body-parser');
var path = require ('path');
var extension = require('mime');
var aws = require('aws-sdk');
var fileReader = require('fs');
var sql = require('mysql');
var sqs = require('sqs');

var accessKeyId =  process.env.AWS_ACCESS_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXX";
var secretAccessKey = process.env.AWS_SECRET_KEY || "XXXXXXXXXXXXXXXXXXXXXXXXXX";

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
var cw = new aws.CloudWatch({apiVersion: '2010-08-01', region: 'us-west-2'});

//Variables from the enviroment
var images_path = __dirname +'/views/images/';
var s3_name = 'mp1s3rnobsam';
var s3_name_transform = 'mp1s3rnobsampost';
var bbdd_name = 'mp1dbrnobsam';
var bbdd_endpoint = 'mp1-db-rnobsam.cm9anfhwkonp.us-west-2.rds.amazonaws.com';
var bbd_dashboard_endpoint = 'mp1-db-rnobsam-rep.cm9anfhwkonp.us-west-2.rds.amazonaws.com';
var bbdd_user = 'mp1user';
var bbdd_pass = 'mp1password';
var sqsQueueUrl = 'https://us-west-2.queue.amazonaws.com/046098654462/mp1queuernobsam';
var snsUrl = 'arn:aws:sns:us-west-2:046098654462:mp1snsrnobsam'
var imageID ='';
var url = '';

//Variables for metrics

var EC2MetricsName = ['CPUUtilization','DiskReadBytes','DiskWriteBytes','DiskReadOps','DiskWriteOps','NetworkIn','NetworkOut'];
var SQSMetricsName = ['NumberOfMessagesReceived', 'NumberOfMessagesSent', 'ApproximateNumberOfMessagesVisible', 'ApproximateNumberOfMessagesNotVisible', 'NumberOfMessagesDeleted'];
var units = ['Percent','Bytes','Bytes','Count','Count','Bytes','Bytes']; //For EC2 metrics we can specify the units


//Middleware
bbddConnect = sql.createConnection({
	host     : bbdd_endpoint,
	user     : bbdd_user,
	password : bbdd_pass,
	port     : '8888',
	database : bbdd_name
});

//We need to know the period of time between the time we call for a metric until actual time
function setPeriod(min) {
	var date = new Date();
	return {
		StartTime: new Date(date.getTime() - min*60000), //Give 5 minutes different for getting more than one metric value
		EndTime: date
	}
}


function getMetrics(namespace, element, statistic,metric, units, rangeTime) {
	var date = new Date();
	return{
		EndTime: rangeTime.EndTime,
		MetricName: metric, //The metric we are asking for
		Namespace: 'AWS/'+namespace.toUpperCase(), //AWS/EC2 for instances or AWS/SQS for the queue
		Period: 60,
		StartTime: rangeTime.StartTime,
		Dimensions: [element],
		Statistics: [statistic],
		Unit: units,
	}
}

function extractSQSMetrics(req,res,next){ //Asynchronous responses -->http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/using-promises.html
	console.log("Showing SQS Metrics...........")
	var prom = [];
	res.locals.sqs = [];
	for (var x = 0; x < SQSMetricsName.length; x++) {
		var metrics = getMetrics(
			'SQS',
			{Name:'QueueName',Value:'mp1queuernobsam'},
			'Sum',
			SQSMetricsName[x], 
			'Count',
			setPeriod(60)
		);
		prom.push(cw.getMetricStatistics(metrics).promise());
		cw.getMetricStatistics(metrics, function(err, data) {
			if (err) console.log(err, err.stack);
			else {
				console.log(JSON.stringify(data));
			}
		});
	}
	Promise.all(prom).then(function(values) {
		values.forEach(function(value) {
		    res.locals.sqs.push({
		    	metric: value['Label'],
		    	values: value['Datapoints'][0]['Sum']
		    })
		});
		next();
	}).catch(function(err) {console.log(err);});

}

function extractInstancesMetrics(req,res,next) { //Asynchronous responses -->http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/using-promises.html
	console.log("Showing Instances Metrics.................");
	function retrievePromises(instance) {
		var prom = [];
		for (var x = 0; x < EC2MetricsName.length; x++) {
			var metrics = getMetrics(
				'EC2',
				{Name:'InstanceType',Value:'t2.micro'}, //Aggregated instances metrics dimensions
				'Average', //Otherwise it gives us one DataPoint
				EC2MetricsName[x], 
				units[x],
				setPeriod(5) //Get in 5 minutes period, otherwise the metrics are too low
			);
			prom.push(cw.getMetricStatistics(metrics).promise());
		}
		return prom;
	}
	
	res.locals.measures = [];
	var promEC2 = retrievePromises(
		{Name:'InstanceType',Value:'t2.micro'}
	);

	Promise.all(promEC2).then(function(values) {
		var j = 0;
		values.forEach(function(value) {
			var datapoints = [];
			j++; //For choosing the right units
			value['Datapoints'].forEach(function(point) {
				datapoints.push(point['Average']);
			});
			var parsedValues = '('+units[(j-1)%7]+') ' + datapoints.join(', ');
			res.locals.measures.push({
			    metric: value['Label'],
			    values: parsedValues
			});
		});
		next();
	}).catch(function(err) {console.log(err);});
}

function extractJobs(req, res, next) {
	console.log("Showing jobs from Database......");
	sql = 'SELECT id, status FROM images';
	bbddConnect.query(sql, function (err, result) {
		console.log(sql);
		if (err) {
			console.log('Error: ' + err);
			return;
		}
		res.locals.jobs = result
		next();
	});
}

//Rendering to user
app.get('/', extractJobs,function(req, res) {
	res.render('index',{ jobs: res.locals.jobs });
});

app.get('/instancesMetrics', extractInstancesMetrics,function(req, res) {
	res.render('ec2Metrics',{ measures: res.locals.measures });
});

app.get('/sqsMetrics', extractSQSMetrics, function(req, res) {
	res.render('sqsMetrics',{ measures: res.locals.sqs });
});


var server = app.listen(8888, function() {
		console.log("Listening on port %s...", server.address().port);
});



