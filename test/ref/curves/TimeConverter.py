from datetime import datetime

class TimeConverter:
    def labels_to_times(labels):
        times = []
        for label in labels:
            unit = label[-1].upper()
            num = int(label[:-1])
            if "D" in label:  
                x = num / 365 
            elif "W" in label:
                x = num * 7 / 365 
            elif "M" in label: 
                x = num / 12 
            elif "Y" in label:  
                x = num 
            times.append(x)
        return times
    
    def days_to_times(days):
        times = []
        for day in days:
            t = day / 365
            times.append(t)
        return times
    
    def dates_to_times(dates, valuation_date):
        times = []
        start_date = datetime.strptime(valuation_date, "%Y-%m-%d")
        
        for date in dates:
            current_date = datetime.strptime(date, "%Y-%m-%d") 
            days_diff = (current_date - start_date).days 
            times.append(days_diff / 365) 
        
        return times
