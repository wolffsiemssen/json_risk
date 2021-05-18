function export_curve_to_csv(curve, curve_name, file_name){
        var c=JsonRisk.get_safe_curve(curve);
        var header=curve_name;
        var line="";
        for (var i=0;i<c.times.length;i++){
                header+=';'+Math.round(365*c.times[i])+"D";
                line+=';'+JsonRisk.get_rate(c,c.times[i]).toFixed(8)
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
