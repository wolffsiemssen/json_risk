
(function(library){
        
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
        
        library.ndf=function(x){
          return Math.exp(-x*x/2.0)/RT2PI;
        };
        
        
        /*
                Cumulative normal distribution function with double precision
                according to
                Graeme West, BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS, 2004
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
                }else{
                        c=0;
                }
                return x<=0.0 ? c : 1-c;
        };
        
        library.find_root_secant=function(func, start, next, max_iter, threshold){
                var x=start, xnext=next, xtemp=0, iter=max_iter||20, t=threshold||0.000000001;
                var f=0, fnext=1;
                while (Math.abs(fnext)>t && Math.abs(fnext-f)>t && iter>0){
                        f=func(x);
                        fnext=func(xnext);
                        xtemp=xnext;
                        xnext=xnext-fnext*(xnext-x)/(fnext-f);
                        x=xtemp;
                        iter--;
                }
                if (iter===0) throw new Error("find_root_secant: failed, too many iterations");
                return xnext;      
        };

}(this.JsonRisk || module.exports));
