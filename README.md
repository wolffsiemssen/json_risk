![#json_risk](pics/logo.png)

JSON / JavaScript financial risk and pricing library

## What is is
- a JSON data model and data format to describe financial instruments and valuation parameters
- a JavaScript pricing library that uses the data model for pricing and risk analysis of financial instruments

## How to use in node.js:

```
var JsonRisk=require('path/to/json_risk.js');
JsonRisk.valuation_date=new Date(2018,0,1);

```

## How to use in browser:

- HTML
    
```
<script src="path/to/json_risk.min.js"></script>
```

- JavaScript
    
```
JsonRisk.valuation_date=new Date(2018,0,1);
```
