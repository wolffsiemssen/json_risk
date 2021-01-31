#!/usr/bin/env node   //path to the interpreter
const fs=require('fs');

var zcs_hist=fs.readFileSync('params/curves.csv', 'ascii');
zcs_hist=zcs_hist.trim().split('\n');

var i,j,labels,dates=[],zcs_scen=new Array(zcs_hist.length-2),name;

for (i=0;i<zcs_hist.length;i++){
	zcs_hist[i]=zcs_hist[i].split(';');
	if(i===0) continue;
	dates.push(zcs_hist[i].shift());
	if(i>1) zcs_scen[i-2]=new Array(zcs_hist[i].length);
	for (j=0;j<zcs_hist[i].length;j++){
		zcs_hist[i][j]=parseFloat(zcs_hist[i][j]);
		if(i>1) zcs_scen[i-2][j]=zcs_hist[i][j]-zcs_hist[i-1][j];
	}
}


labels=zcs_hist.shift();
name=labels.shift();

var tmp;
for (j=0;j<zcs_scen[0].length;j++){
	tmp=0;
	for (i=0;i>zcs_scen.length;i++){
		tmp+=zcs_scen[i][j];
	}
	tmp/=zcs_scen.length;
	for (i=0;i>zcs_scen.length;i++){
		zcs_scen[i][j]-=tmp;
	}
}

for (i=0;i<dates.length;i++){
	tmp=dates[i].split('-');
	tmp=new Date(Date.UTC(tmp[0],tmp[1],0,0,0,0));
	dates[i]=tmp.toISOString().substring(0,10);
}

var res={
	name: name,
	labels: labels,
	zcs_hist: zcs_hist,
	zcs_scen: zcs_scen,
	dates:dates
}
	
fs.writeFileSync('params/curves.json', JSON.stringify(res));

