function export_to_json_file(data, fname){
        var repl=function(key,value){
		if (key==='$$hashKey') return undefined; //exclude angluarJS internal variable
		if (value===null) return undefined; //exclude null values
		return value;
	};
        var export_data=JSON.stringify(data, repl, 1);
        
        var a = document.createElement('a');
        a.href = 'data:text/json;charset=utf-8,'+encodeURIComponent(export_data);
        a.download=fname;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        return null;
}

function export_to_csv_file(data, fname, columns){
        var repl=function(key,value){
		if (key==='$$hashKey') return undefined; //exclude angluarJS internal variable
		return value;
	};
	var export_data=JSON.stringify(data, repl, 1);
	export_data=JSON.parse(export_data);
	if(columns){
	        export_data=Papa.unparse(export_data, {columns: columns});
        }else{
		export_data=Papa.unparse(export_data);
	}
        
        var a = document.createElement('a');
        a.href = 'data:text/json;charset=utf-8,'+encodeURIComponent(export_data);
        a.download=fname;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        return null;
}

function export_curve_to_csv(curve, curve_name, file_name){
        var c=JsonRisk.get_safe_curve(curve);
        var header=curve_name;
        var line="";
        for (var i=0;i<c.times.length;i++){
                header+=';'+Math.round(365*c.times[i])+"D";
                line+=';'+(100*JsonRisk.get_rate(c,c.times[i])).toFixed(8)
        }
	var export_data=header+'\n'+line;
        
        var a = document.createElement('a');
        a.href = 'data:text/json;charset=utf-8,'+encodeURIComponent(export_data);
        a.download=file_name;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        return null;
}
