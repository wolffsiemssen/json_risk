
(function(library){

	'use strict';
        
        var RT2PI = Math.sqrt(4.0*Math.acos(0.0));
        var SPLIT = 7.07106781186547;
        var N0 = 220.206867912376;
        var N1 = 221.213596169931;
        var N2 = 112.079291497871;
        var N3 = 33.912866078383;
        var N4 = 6.37396220353165;
        var N5 = 0.700383064443688;
        var N6 = 3.52624965998911e-02;
        var M0 = 440.413735824752;
        var M1 = 793.826512519948;
        var M2 = 637.333633378831;
        var M3 = 296.564248779674;
        var M4 = 86.7807322029461;
        var M5 = 16.064177579207;
        var M6 = 1.75566716318264;
        var M7 = 8.83883476483184e-02;
		/**
		 	* TODO
			* @param {number} n
			* @returns {number} number
			* @memberof library
			* @public
		*/   
	library.get_safe_number=function(n){
		if(typeof n === 'number') return n;
		if(typeof n === 'string'){
			n=n.trim();
			var res=parseFloat(n);
			if (isNaN(res)) return null;
			if (n.charAt(n.length-1)==='%') res*=0.01;
			return res;
		}
		return null;
	};
		/**
		 	* TODO
			* @param {number} n
			* @returns {number} number
			* @memberof library
			* @public
		*/   
	library.get_safe_positive=function(n){ //returns positive number if a valid positive number is entered and null otherwise
		var res=library.get_safe_number(n);
		if (res<=0) return null;
		return res;
	};
		/**
		 	* TODO
			* @param {natural} n
			* @returns {natural} natural vector
			* @memberof library
			* @public
		*/   
	library.get_safe_natural=function(n){ //returns natural number, zero allowed, if a valid natural number is entered and null otherwise
		var res=library.get_safe_number(n);
		if (res<0 || res!==Math.floor(res)) return null;
		return res;
	};
		/**
		 	* TODO
			* @param {number} n
			* @returns {number} number vector
			* @memberof library
			* @public
		*/   
	library.get_safe_number_vector=function(n){ //vector of numbers when vector of numbers, vector of numeric strings or space sepatated string is entered. Returns null otherwise
		if(typeof n === 'number') return [n];
		var res;
		if(typeof n === 'string'){
			res=n.split(/\s+/);
		}else if(Array.isArray(n)){
			res=n.slice();
		}else{
			return null;
		}
		for (var i=0;i<res.length;i++){
			res[i]=library.get_safe_number(res[i]);
			if (null === res[i]) throw new Error("get_safe_number_vector: invalid input");
		}
		return res;
	};
		/**
		 	* TODO
			* @param {boolean} b
			* @returns {boolean} boolean vector
			* @memberof library
			* @public
		*/   
	library.get_safe_bool=function(b){
		if(typeof b === 'boolean') return b;				
		if(typeof b === 'number') return b!==0;
		if(typeof b === 'string'){
			var s=b.trim().toLowerCase();
			if(s==='true' || s==='yes' || s==='y') return true;
			return false;
		}
		return false;
	};
		/**
		 	* TODO
			* @param {boolean} b
			* @returns {boolean} boolean vector
			* @memberof library
			* @public
		*/   
	library.get_safe_bool_vector=function(b){ //returns vector of booleans when input can be converted to booleans. Returns single-entry array [false] otherwise
		if(typeof b === 'boolean') return [b];
		if(typeof b === 'number') return [b!==0];
		var res;
		if(typeof b === 'string'){
			res=b.split(/\s+/);
		}else if(Array.isArray(b)){
			res=b.slice();
		}else{
			return [false];
		}
		for (var i=0;i<res.length;i++){
			res[i]=library.get_safe_bool(res[i]);
		}
		return res;
	};
		/**
		 	* ...
			* @param {number} x
			* @returns {number} ...
			* @memberof library
			* @public
		*/           
        library.ndf=function(x){
          return Math.exp(-x*x/2.0)/RT2PI;
        };
          
		/**
		 	* cumulative normal distribution function with double precision according to Graeme West, BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS, 2004
			* @param {number} x
			* @returns {number} ...
			* @memberof library
			* @public
		*/         
        library.cndf=function(x){
                var z = Math.abs(x);
                var c;

                if(z<=37.0){
                        var e = Math.exp(-z*z/2.0);
                        if(z<SPLIT)
                        {
                                var n = (((((N6*z + N5)*z + N4)*z + N3)*z + N2)*z +N1)*z + N0;
                                var d = ((((((M7*z + M6)*z + M5)*z + M4)*z + M3)*z + M2)*z + M1)*z + M0;
                                c = e*n/d;
                        }
                        else{
                                var f = z + 1.0/(z + 2.0/(z + 3.0/(z + 4.0/(z + 13.0/20.0))));
                                c = e/(RT2PI*f);
                        }
                }else if(z>37.0){
                        c=0;
                }else{
			throw new Error("cndf: invalid input.");
		}
                return x<=0.0 ? c : 1-c;
        };

        var D1=0.0498673470;
        var D2=0.0211410061;
        var D3=0.0032776263;
        var D4=0.0000380036;
        var D5=0.0000488906;
        var D6=0.0000053830;

		/**
		 	* fast cumulative normal distribution function
			* @param {number} x
			* @returns {number} ...
			* @memberof library
			* @public
		*/   
        library.fast_cndf=function(x){
                var z=Math.abs(x);
                var f=1+z*(D1+z*(D2+z*(D3+z*(D4+z*(D5+z*D6)))));
                f*=f;f*=f;f*=f;f*=f; // raise to the power of -16
                f=0.5/f;
                return (x>=0) ? 1-f : f;
        };
		/**
		 	* TODO
			* @param {} func
			* @param {number} start
			* @param {number} next
			* @param {number} max_iter
			* @param {number} threshold
			* @returns {number} ...
			* @memberof library
			* @public
		*/           
        library.find_root_secant=function(func, start, next, max_iter, threshold){
                var x=start, xnext=next, temp=0, iter=max_iter||20, t=threshold||0.00000001;
                var f=func(x), fnext=func(xnext);
		if(Math.abs(fnext)>Math.abs(f)){
			//swap start values if start is better than next
			temp=x;
			x=xnext;
			xnext=temp;
			temp=f;
			f=fnext;
			fnext=temp;
		}
                while (Math.abs(fnext)>t && iter>0){
			temp=(x-xnext)*fnext/(fnext-f);
			x=xnext;
			f=fnext;
                        xnext=x+temp;
			fnext=func(xnext);

                        iter--;
                }
                if (iter<=0) throw new Error("find_root_secant: failed, too many iterations");
		if (isNaN(xnext)) {
			throw new Error("find_root_secant: failed, invalid result");
		}
		return xnext;      
        };
		/**
		 	* signum function
			* @param {number} x
			* @returns {number} signum
			* @memberof library
			* @private
		*/   
	function signum(x){
		if (x>0) return 1;
		if (x<0) return -1;
		return 0;
	}
		/**
		 	* TODO
			* @param {} func
			* @param {number} start
			* @param {number} next
			* @param {number} max_iter
			* @param {number} threshold
			* @returns {number} ...
			* @memberof library
			* @public
		*/   
        library.find_root_ridders=function(func, start, next, max_iter, threshold){
                var x=start, y=next, z=0, w=0, r=0, iter=max_iter||20, t=threshold||0.00000001;
                var fx=func(x), fy=func(y), fz, fw;
		if(fx*fy>0) throw new Error("find_root_ridders: start values do not bracket the root");
		if(Math.abs(fx)<t) return x;
		if(Math.abs(fy)<t) return y;
                while (iter>0){
                        iter--;
			z=(x+y)*0.5;			
                        if(Math.abs(x-y)<1E-15) return z;
			fz=func(z);
			if(Math.abs(fz)<t) return z;
			r=Math.sqrt((fz*fz)-(fy*fx));
			if(0===r) return z;
			w=(z-x)*signum(fx-fy)*fz/r + z;
			if(isNaN(w)) w=z;
			fw=func(w);
			if(Math.abs(fw)<t) return w;
			if(fz*fw<0){
				x=w;
				fx=fw;
				y=z;
				fy=fz;
				continue;
			}
			if(fx*fw<0){
				y=w;
				fy=fw;
				continue;
			}
			if(fy*fw<0){
				x=w;
				fx=fw;
				continue;
			}
                }
                if (iter<=0) throw new Error("find_root_ridders: failed, too many iterations");
        };

}(this.JsonRisk || module.exports));
