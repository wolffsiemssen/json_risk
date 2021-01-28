

all: performance.csv

performance.csv: params/curves.json params/scenarios.json config/portfolio_template.json config/config.json
	node scripts/performance.js 	# MAIN SCRIPT, LOOP THROUGH EACH MONTHLY DATE
						#    GET CURVE FROM curves.json, 
						#    APPLY SCENARIOS FROM sceanrios.json,
						#    BUILD PORTFOLIO FROM TEMPLATE
						#    EVALUATE RISK AND RETURN FOR PORTFOLIO

params/curves.json: params/curves.csv
	sh scripts/make_curves.sh $< $@ # CONVERT CSV TO JSON

params/scenarios.json: params/curves.json config/config.json
	node scripts/make_scenarios.js # GET SCENARIOS FROM CURVES

params/curves.csv: downloads/bbk.csv
	sh scripts/convert.sh $< $@ # SANITIZE BUNDESBANK DOWNLOAD, CONVERT TO NICE CSV

download: downloads/bbk.csv

downloads/bbk.csv:
	sh scripts/download.sh $@ # DOWNLOAD BUNDESBANK DATA (NOT DONE EACH TIME, NEED TO ISSUE make download TO TRIGGER THIS


.DELETE_ON_ERROR: all
