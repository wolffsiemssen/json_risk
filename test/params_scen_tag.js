(function(root, data)
{
    if (typeof module === 'object' && typeof exports !== 'undefined')
	{
		// Node
		module.exports = data;
	}
	else
	{
		// Browser
		root.params_scen_tag = data;
	}
}(this, 
/*

	data below here

*/

{
 "valuation_date": "2022-05-16",
 "curves": {
  "CONST_100BP": {
   "tags": ["yield"],
   "times": [
    0.019230769,
    0.25,
    0.5,
    1,
    2,
    3,
    5,
    7,
    10,
    15,
    20,
    25,
    30
   ],
   "zcs": [
    [
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01,
     0.01
    ]]
  },
  "CONST_10BP": {
   "tags": ["yield"],
   "times": [
    1
   ],
   "dfs": [
    0.999000999
   ]
  },
  "CONST_1BP": {
   "tags": ["yield"],
   "times": [
    1
   ],
   "dfs": [
    0.99990001
   ]
  },
  "CONST_0BP": {
   "tags": ["yield"],
   "times": [
    1
   ],
   "dfs": [
    1
   ]
  },
  "EUR_OIS_DISCOUNT": {
   "labels": [
    "1D",
    "30D",
    "90D",
    "180D",
    "1Y",
    "2Y",
    "5Y",
    "10Y",
    "20Y",
    "30Y"
   ],
   "zcs": [
    -0.00593,
    -0.00587,
    -0.00515,
    -0.0031,
    0.00085,
    0.00598,
    0.01036,
    0.01426,
    0.01618,
    0.01413
   ],
   "tags": ["yield"]
  },
  "EUR_1M_FWD": {
   "labels": [
    "30D",
    "90D",
    "180D",
    "1Y",
    "2Y",
    "5Y",
    "10Y",
    "20Y",
    "30Y"
   ],
   "zcs": [
    -0.00567,
    -0.00495,
    -0.00258,
    0.00149,
    0.00691,
    0.01197,
    0.01644,
    0.01799,
    0.01523
   ],
   "tags": ["yield"]
  },
  "EUR_3M_FWD": {
   "labels": [
    "90D",
    "180D",
    "1Y",
    "2Y",
    "5Y",
    "10Y",
    "20Y",
    "30Y"
   ],
   "zcs": [
    -0.00415,
    -0.0018,
    0.00242,
    0.00786,
    0.01268,
    0.0169,
    0.01818,
    0.01533
   ],
   "tags": ["yield"]
  },
  "EUR_6M_FWD": {
   "labels": [
    "180D",
    "1Y",
    "2Y",
    "5Y",
    "10Y",
    "20Y",
    "30Y"
   ],
   "zcs": [
    -0.00209,
    0.00252,
    0.00817,
    0.01322,
    0.01719,
    0.01786,
    0.01474
   ],
   "tags": ["yield"]
  },
  "EUR_GOV_SPREAD": {
   "type": "spread",
   "times": [
    1,
    2,
    3,
    5,
    7,
    10
   ],
   "zcs": [
    -0.00265,
    -0.00438,
    -0.00475265,
    -0.00416,
    -0.004446837,
    -0.00446
   ]
  },
  "EUR_PFA_SPREAD": {
   "type": "spread",
   "times": [
    1,
    2,
    3,
    5,
    7,
    10
   ],
   "zcs": [
    0.00235,
    0.00242,
    0.00264735,
    0.00354,
    0.003353163,
    0.00354
   ]
  },
  "EUR_CORP_SPREAD": {
   "type": "spread",
   "times": [
    1,
    2,
    3,
    5,
    7,
    10
   ],
   "zcs": [
    -0.00085,
    -0.00598,
    -0.00835265,
    -0.01036,
    -0.012446837,
    -0.01426
   ]
  }
 },
 "surfaces": {
  "CONST_30BP": {
   "type": "bachelier",
   "expiries": [
    1
   ],
   "terms": [
    1
   ],
   "values": [
    [
     0.003
    ]
   ]
  },
  "CONST_20BP": {
   "type": "bachelier",
   "expiries": [
    1
   ],
   "terms": [
    1
   ],
   "values": [
    [
     0.002
    ]
   ]
  },
  "CONST_10BP": {
   "type": "bachelier",
   "expiries": [
    1
   ],
   "terms": [
    1
   ],
   "values": [
    [
     0.001
    ]
   ]
  },
  "CONST_0BP": {
   "type": "bachelier",
   "expiries": [
    1
   ],
   "terms": [
    1
   ],
   "values": [
    [
     0
    ]
   ]
  }
 },
 "scenario_groups": [
	[
	  {
		"name": "Bump 1W",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 3M",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 6M",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 1Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 2Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 3Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 5Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 7Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 10Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 15Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 20Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 25Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001,
		        0
		      ]
		    ]
		  }
		]
	  },
	  {
		"name": "Bump 30Y",
		"rules": [
		  {
		    "model": "additive",
		    "tags": [
		      "yield"
		    ],
		    "labels_x": [
		      "1W",
		      "3M",
		      "6M",
		      "1Y",
		      "2Y",
		      "3Y",
		      "5Y",
		      "7Y",
		      "10Y",
		      "15Y",
		      "20Y",
		      "25Y",
		      "30Y"
		    ],
		    "labels_y": [
		      "1"
		    ],
		    "values": [
		      [
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0,
		        0.0001
		      ]
		    ]
		  }
		]
	  }
	]
 ]
}));
