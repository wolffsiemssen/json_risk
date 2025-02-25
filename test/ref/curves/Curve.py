from Interpolator import Interpolator
from TimeConverter import TimeConverter


class Curve:
    def __init__(self, data, valuation_date=None):
        self.valuation_date = valuation_date
        self.method = data.get("intp", "linear")
        
        # times
        if "labels" in data:
            self.times = TimeConverter.labels_to_times(data["labels"])
        elif "days" in data:
            self.times = TimeConverter.days_to_times(data["days"])
        elif "dates" in data:
            self.times = TimeConverter.dates_to_times(data["dates"])
        elif "times" in data:
            self.times = data["times"]
        else:
            raise ValueError("Keine gültigen Zeitformate gefunden!")

        # rates and discount factors
        if "zcs" in data:
                self.zcs = data.get("zcs")
                self.dfs = Curve.DfsFromZcs(self.zcs,self.times)
        elif "dfs" in data: # Umrechenen in Zcs:
                self.dfs = data.get("dfs")
                self.zcs = Curve.ZcsFromDfs(self.dfs, self.times)
        else:
            raise ValueError("Fehlende 'zcs' oder 'dfs' in den Daten!")
        
        
        if self.method in ["linear", "linear_zc", "linear_rt"]:
            self.values=self.zcs
            self.getDF = self.getDfFromRate      # DF berechnen aus Raten
            self.getRate = self._interpolateRate # Raten interpolieren
        elif self.method == "linear_df":
            self.values=self.dfs
            self.getDF = self._interpolateDf     # DF interpolieren
            self.getRate = self.getRateFromDf    # Rate aus DF berechnen        
        else:
            raise ValueError(f"Unbekannte Methode: {self.method}")
            
        if not self.times or not self.values:
            raise ValueError("Fehlende 'times' oder 'values' in den Daten!")
                

        
        self.interpolator = Interpolator(self.times, self.values, method = self.method, short_end_flat=data.get("short_end_flat", False), long_end_flat=data.get("long_end_flat", False) )
        

    def _interpolateRate(self, t):
        return self.interpolator.interpolate(t)
    
    def _interpolateDf(self, t):
        return self.interpolator.interpolate(t)


    
    def getRateFromDf(self, t):
        return self.ZcFromDf(self._interpolateDf(t),t)

    def getDfFromRate(self, t):
        return self.DfFromZc(self._interpolateRate(t),t)
        
    @staticmethod
    def ZcsFromDfs(dfs, times):
        return [Curve.ZcFromDf(df, t) for df, t in zip(dfs, times)]

    @staticmethod
    def DfsFromZcs(zcs, times):
        return [Curve.DfFromZc(zc, t) for zc, t in zip(zcs, times)]

    @staticmethod
    def DfFromZc(zc, time):
        return (1 + zc) ** -time

    @staticmethod
    def ZcFromDf(df, time):
        if time <= 0:
            return 0.0
        if df <= 0:
            raise ValueError("Falscher DF")
        return (df ** (-1 / time) - 1)
