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
