const http = require('http');
const https = require('https');
const qs = require('querystring');
const port = 8080;
const checksum_lib = require('./checksum.js');
var express = require('express')
var app = express()
var bodyParser = require('body-parser')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

var PaytmConfig = {
	mid: "",
	key: "",
	website: ""
}
 var per_details={};

//http.createServer(function (req, res) {
	app.post("/",(req,res,next)=>{
		console.log(req.body);
	switch(req.url){
		case "/":
			var params 						= {};
			params['MID'] 					= PaytmConfig.mid;
			params['WEBSITE']				= PaytmConfig.website;
			params['CHANNEL_ID']			= 'WEB';
			params['INDUSTRY_TYPE_ID']	= 'Retail';
			params['ORDER_ID']			= 'TEST_'  + new Date().getTime();
			params['CUST_ID'] 			= 'Customer001';
			params['TXN_AMOUNT']			= req.body.amount;
			params['CALLBACK_URL']		= 'http://localhost:'+port+'/callback';
			params['EMAIL']				= req.body.email;
			params['MOBILE_NO']			= req.body.mobno;

			per_details['Name']=req.body.firstname+" "+req.body.midname+" "+req.body.lastname;
			per_details['Address']=req.body.house_no+", "+req.body.street+", "+req.body.city+"-"+req.body.pincode+", "+req.body.state;

			checksum_lib.genchecksum(params, PaytmConfig.key, function (err, checksum) {

				var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
				// var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production
				
				var form_fields = "";
				for(var x in params){
					form_fields += "<input type='hidden' name='"+x+"' value='"+params[x]+"' >";
				}
				form_fields += "<input type='hidden' name='CHECKSUMHASH' value='"+checksum+"' >";

				res.writeHead(200, {'Content-Type': 'text/html'});
				res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="'+txn_url+'" name="f1">'+form_fields+'</form><script type="text/javascript">document.f1.submit();</script></body></html>');
				res.end();
			});
		break;
		}
	});
	app.post("/callback",(req,res,next)=>{
		
		console.log(req.body);
		console.log(req.url);
	/*switch(req.url){
		case "/":
			var body = '';
	        console.log(11);
	        req.on('data', function (data) {
				body += data;
				console.log(data);
	        });*/
			console.log(11);
	        //req.on('end', function () {
				var ht= ""
				var html = "";
				var post_data = req.body;

				ht+="<b>Customer Name : </b>"+per_details['Name']+"<br/>";
				ht+="<b>Customer Address : </b>"+per_details['Address']+"<br/><br/>";
				// received params in callback
				console.log('Callback Response: ', post_data, "\n");
				html += "<b>Callback Response</b><br>";
				for(var x in post_data){
					html += x + " => " + post_data[x] + "<br/>";
				}
				html += "<br/><br/>";


				// verify the checksum
				var checksumhash = post_data.CHECKSUMHASH;
				// delete post_data.CHECKSUMHASH;
				var result = checksum_lib.verifychecksum(post_data, PaytmConfig.key, checksumhash);
				console.log("Checksum Result => ", result, "\n");
				html += "<b>Checksum Result</b> => " + (result? "True" : "False");
				html += "<br/><br/>";



				// Send Server-to-Server request to verify Order Status
				var params = {"MID": PaytmConfig.mid, "ORDERID": post_data.ORDERID};

				checksum_lib.genchecksum(params, PaytmConfig.key, function (err, checksum) {

					params.CHECKSUMHASH = checksum;
					post_data = 'JsonData='+JSON.stringify(params);

					var options = {
						hostname: 'securegw-stage.paytm.in', // for staging
						// hostname: 'securegw.paytm.in', // for production
						port: 443,
						path: '/merchant-status/getTxnStatus',
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							'Content-Length': post_data.length
						}
					};


					// Set up the request
					var response = "";
					var post_req = https.request(options, function(post_res) {
						post_res.on('data', function (chunk) {
							response += chunk;
						});
						console.log(77);
						post_res.on('end', function(){
							console.log('S2S Response: ', response, "\n");

							var _result = JSON.parse(response);
							html += "<b>Status Check Response</b><br>";
							for(var x in _result){
								html += x + " => " + _result[x] + "<br/>";
							}
							 
							//ht="<div>";
							res.writeHead(200, {'Content-Type': 'text/html'});
							res.write(ht);
							res.write(html);
							res.end();
						});
					});

					// post the data
					post_req.write(post_data);
					post_req.end();
				});
	        //});
		//break;
	//}	
		
});
app.listen(8080);

//}).listen(port);
