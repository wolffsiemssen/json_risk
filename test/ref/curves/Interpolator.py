class Interpolator:
    def __init__(self, times, values, method="linear", short_end_flat=False, long_end_flat=False):

        if len(times) != len(values):
            raise ValueError("Die Längen von 'times' und 'values' müssen gleich sein.")
        if len(times) < 2:
            raise ValueError("Es werden mindestens zwei Punkte für die Interpolation benötigt.")
        
        self.times_ = times
        self.values_ = values
        self.short_end_flat = short_end_flat  
        self.long_end_flat = long_end_flat    
        
        
        # Wählt die Methode basierend auf dem `method`-Parameter
        if method in ["linear", "linear_zc"]:
            self.impl_ = self.linearInterpolator
        elif method == "linear_df":
            self.impl_ = self.linearDfInterpolator
        elif method == "linear_rt":
            self.impl_ = self.linearRtInterpolator

        else:
            raise ValueError(f"Unbekannte Methode: {method}. Bitte entweder ´linear´, ´linear_zc´, ´linear_rt´ oder ´linear_df´")           

    
    def interpolate(self, t):
        return self.impl_(t)
    

    def getWeights(self, t):
        times=self.times_
        imin=0
        imax=len(times)-1

        if imin==imax:
           return 0, 0 ,1 ,0

        if t <= times[0]:
            idx1, idx2 = 0, 1        
       
        if t >= times[-1]:
            idx1, idx2 = imax-1, imax 
        
        while imin+1!=imax:
            imed= int((imin+imax)//2.0)
            tmed=times[imed]
            if t>tmed:

                imin=imed;
            else:
                
                imax=imed;
                
        idx1, idx2 = imin, imax
        dist = times[idx2] - times[idx1]
        weight1 = (times[idx2] - t) / dist
        weight2 = (t - times[idx1]) / dist
        return idx1, idx2, weight1, weight2

    def linearInterpolator(self, t):
        """
        Lineare Interpolation für Zero-Coupon-Raten.
        """
        # Short-End Extrapolation
        if t < self.times_[0] and self.short_end_flat:
            return self.values_[0]  # ZC  flach extrapoliert
    
        # Long-End Extrapolation
        if t > self.times_[-1] and self.long_end_flat:
            return self.values_[-1]  # ZC  flach extrapoliert
        
        idx1, idx2, weight1, weight2 = self.getWeights(t)
        zc = self.values_[idx1] * weight1 + self.values_[idx2] * weight2
        return zc
    
    def linearDfInterpolator(self, t):
        if t < self.times_[0]: # ZC  immer flach extrapoliert
            zc = self.values_[0] ** (-1 / self.times_[0]) - 1 #erst letzten Zc berechnen
            df = (1 + zc) ** -t #dann daraus dynamisch die df berechnen 
            return df
        
        if t > self.times_[-1]: # ZC  immer flach extrapoliert
            zc = self.values_[-1] ** (-1 / self.times_[-1]) - 1
            df = (1 + zc) ** -t
            return df
        
        idx1, idx2, weight1, weight2 = self.getWeights(t)
        df = self.values_[idx1] * weight1 + self.values_[idx2] * weight2
        return df
        
    

    def linearRtInterpolator(self, t):
        """
        Lineare Interpolation im Produkt aus Rate und Zeit.
        """
        if t < self.times_[0]:
            return self.values_[0] # ZC  immer flach extrapoliert
    
        # Long-End Extrapolation
        if t > self.times_[-1]:
            return self.values_[-1] # ZC  flach extrapoliert
        
        idx1, idx2, weight1, weight2 = self.getWeights(t)
        zc_t = self.values_[idx1] * self.times_[idx1] * weight1 + self.values_[idx2] * self.times_[idx2] * weight2
        zc = zc_t / t
        return zc
    
