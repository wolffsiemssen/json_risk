#!/usr/bin/env node

//configuration
const config={
	chunk_size: 50,
	max_requests: 1000,
	max_retries: 2,
	api_key: 'tMU4FEJGIG1EgKkCaD92J27nwdDq6kM61PXdnZ1u'
}

//library
const JsonRisk=require('./json_risk.min.js');

//compression
const zlib = require('zlib');
const fs = require('fs');


if (process.argv.length < 4){
	console.error("Usage:");
	console.error("  cmdline_lambda.js params.json portfolio.json");
	process.exit(1);
}

//params given on the first command line argument
const params=require('./' + process.argv[2]);
if (!JsonRisk.get_safe_date(params.valuation_date)){
	console.error("ERROR: Invalid parameter file, should at least contain an object valid valuation_date entry.");
	process.exit(1);
}

//portfolio given on the second command line argument
var portfolio=require('./' + process.argv[3]);
if (!Array.isArray(portfolio)){
	console.error("ERROR: Invalid portfolio file, should at least contain an array.");
	process.exit(1);
}

var add_error=function(obj){
	var j=0;
	while(j<output.errors.length){
		if (output.errors[j].msg === obj.msg){ //same error has already occured
			output.errors[j].count+=obj.count;
			break;
		}
		j++;
	}
	if (j>=output.errors.length) output.errors.push(obj); //new error
};

var add_warning=function(obj){
	var j=0;
	while(j<output.warnings.length){
		if (output.warnings[j].msg === obj.msg){ //same warning has already occured
			output.warnings[j].count+=obj.count;
			break;
		}
		j++;
	}
	if (j>=output.warnings.length) output.warnings.push(obj); //new warning
};

const https = require('https');

const options_aws = {
  hostname: 'vflj5ognch.execute-api.eu-central-1.amazonaws.com',
  port: 443,
  path: '/test/test',
  method: 'POST',
  agent: new https.Agent({keepAlive: true, maxSockets: config.max_requests}),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': config.api_key,
    'x-amz-docs-region': 'eu-central-1',
    'Content-Encoding': 'gzip',
    'Accept-Encoding': 'gzip,identity'
  }
};

const options_jrparams = {
  hostname: 'www.jsonrisk.de',
  port: 443,
  path: '/jrparams/',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; charset=utf-8; boundary={:}'
  }
};


var handle_response=function(data, chunk){
	running--;
	remaining-=chunk.length;
	//ID1 = 31 (0x1f, \037), ID2 = 139 (0x8b, \213), 
	//console.error(`Starting with CharCodes ${data.charCodeAt(0)} and ${data.charCodeAt(1)}`)
	//if (data.charCodeAt(0)===31 && data.charCodeAt(1)===139) data=zlib.gunzipSync(data);
	data=JSON.parse(data);
	//aggregate results
	if (undefined===data.res || undefined===data.errors || undefined===data.warnings || undefined===data.times){
		console.error(`Request with ${chunk.length} instruments does not return any valid data`);
		add_error({ msg: `Request with ${chunk.length} instruments does not return any valid data`, id: chunk[0].id || "", count: chunk.length});
	}else{
		console.error(`INFO: Response with ${chunk.length} instruments received, ${portfolio.length} instruments remaining to send, ${remaining} instruments remaining to receive, ${running} requests currently running`);
		var keys=Object.keys(data.res);
		var sub_portfolio;
		for (i=0;i<keys.length;i++){
			sub_portfolio=keys[i];
			if(output.res.hasOwnProperty(sub_portfolio)){
				for (j=0;j<data.res[sub_portfolio].length;j++){
					output.res[sub_portfolio][j]+=data.res[sub_portfolio][j];
				}
			}else{
				output.res[sub_portfolio]=data.res[sub_portfolio];
			}
		}	
		// aggregate times
		if (data.times['calc_start']<output.times['calc_start']){
		output.times['calc_start']=data.times['calc_start']
		};
		if (data.times['calc_end']>output.times['calc_end']){
		output.times['calc_end']=data.times['calc_end']
		};
		output.times['calc_max']=(output.times['calc_end']-output.times['calc_start'])/1000;
		output.times['calc']=output.times['calc']+data.times['calc'];
		output.times['params']=output.times['params']+data.times['params'];

		if(data.times['params']>output.times['params_max']){
		output.times['params_max']=data.times['params'];
		};

		//aggregate errors
		for (j=0;j<data.errors.length;j++) add_error(data.errors[j]);
		//aggregate warnings
		for (j=0;j<data.warnings.length;j++) add_warning(data.warnings[j]);
	}
	if(0===remaining){
		//program ends here
		t1 = new Date().getTime();
		console.log(JSON.stringify(output));
		console.error("INFO: Done. Valuations took " + (t1 - t0)/1000 + " seconds.");
	}else if(portfolio.length){
		new_request();
	}
};

var new_request=function(){
	j=config.chunk_size;
	var instrument;
	let chunk=[];
	while(portfolio.length && j>0){
		instrument=portfolio.shift();
		chunk.push(instrument);
		if(instrument.type==="callable_bond"){
			j-=25;
		}else{
			j--;
		}
	}
	new_request_with_chunk(chunk,0);
}

var new_request_with_chunk=function(chunk, num_retries){
	running++;
	
	console.error(`INFO: Request  with ${chunk.length} instruments sent,     ${portfolio.length} instruments remaining to send, ${remaining} instruments remaining to receive, ${running} requests currently running`);
	let req=https.request(options_aws, (res) => {
		//console.error(JSON.stringify(res.headers));
		var data='';
		var decompressed=res;
		if (res.headers['content-encoding'] === 'gzip'){
			decompressed=zlib.createGunzip();
			res.pipe(decompressed);
		}else if(res.headers['content-encoding'] === 'deflate'){
			decompressed=zlib.createDeflate();
			res.pipe(decompressed);
		}else{
			decompressed=res; //no decoding
		}
		decompressed.on('data', (return_chunk) => {
			data+=return_chunk;
		});
		decompressed.on('end', () => {
			handle_response(data,chunk);
		});
	});

	req.on('error', (e) => {
		running--;
		if(num_retries<config.max_retries){
			new_request_with_chunk(chunk, num_retries+1);
		}else{
			add_error({ msg: `ERROR: Problem with request: ${e.message}, max retries reached.`, id: chunk[0].id || "", count: chunk.length});
			remaining-=chunk.length;
		}
	});
	req.write(zlib.gzipSync(
		JSON.stringify({
			paramsurl: {url: paramsurl},
			portfolio: chunk
		}),
		{level: 9})
	);
	req.end();
}

// main program
console.error("INFO: Start...");
const t0 = new Date().getTime();
var t1,i,j;
var output={
	res: {},
	errors: [],
	warnings: [],
	times:{}
};
output.times['calc_start']=new Date(2035,6,31).getTime();
output.times['calc_end']=new Date(2019,6,31).getTime();
output.times['calc']=0.000000;
output.times['params_max']=0;
output.times['params']=0.000000;
var tmp=[];
for (j=0;j<portfolio.length;j++){
	if (portfolio[j].type==='callable_bond') tmp.push(portfolio[j]);
}

for (j=0;j<portfolio.length;j++){
	if (portfolio[j].type!=='callable_bond') tmp.push(portfolio[j]);
}
portfolio=tmp;
var remaining=portfolio.length;
var running=0;
var paramsurl;

let req=https.request(options_jrparams, (res) => {
	var data='';	
	res.setEncoding('utf8');
	res.on('data', (return_chunk) => {		data+=return_chunk;
	});
	res.on('end', () => {
		data=JSON.parse(data);
		if (data.path){ 
			paramsurl='https://' + options_jrparams.hostname + options_jrparams.path + data.path;
			console.error(`INFO: params made available under ${paramsurl}`);
			while (portfolio.length>0 && (running<2*config.max_requests)){
				new_request();
			}
				
		}else{
			console.error("ERROR: Could not upload params, jrparams returns: " +data.message);
			process.exit(1);
		}
	});
});

req.on('error', (e) => {
	console.error("ERROR: Could not upload params");
	process.exit(1);
});

//must send params file with multipart/form-data encoding
req.write('--{:}\r\n');
req.write('Content-Disposition: form-data; name="temp"\r\n\r\n');
req.write('true\r\n');
req.write('--{:}\r\n');
req.write('Content-Disposition: form-data; name="file"; filename="file"\r\n');
req.write('Content-Type: application/json\r\n\r\n');
req.write(JSON.stringify(params));
req.write('\r\n--{:}--');
req.end();

