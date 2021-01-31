

all: performance.json

performance.json: params/curves.json config/portfolio_template.json config/config.json
	node scripts/performance.js 	# MAIN SCRIPT, LOOP THROUGH EACH MONTHLY DATE
						#    GET CURVE FROM curves.json, 
						#    APPLY SCENARIOS FROM sceanrios.json,
						#    BUILD PORTFOLIO FROM TEMPLATE
						#    EVALUATE RISK AND RETURN FOR PORTFOLIO

params/curves.json: params/curves.csv config/config.json
	node scripts/make_scenarios.js # GET SCENARIOS FROM CURVES

params/curves.csv: downloads/bbk.csv
	sh scripts/convert.sh $< $@ # SANITIZE BUNDESBANK DOWNLOAD, CONVERT TO NICE CSV

downloads/bbk.csv:
	sh scripts/download.sh $@ # DOWNLOAD BUNDESBANK DATA

clean:
	rm -rf params/* downloads/* performance.csv

.DELETE_ON_ERROR: all

.PHONY: clean


