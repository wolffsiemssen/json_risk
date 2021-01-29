#!/bin/sh

CURVE_TSIDS="
BBK01.WX0073
BBK01.WX0074
BBK01.WX0075
BBK01.WX0076
BBK01.WX0077
BBK01.WX0078
BBK01.WX0079
BBK01.WX0080
BBK01.WX0082
BBK01.WX0084
BBK01.WX0087
BBK01.WX0092
BBK01.WX0097
BBK01.WX0202
"

##### Herunterladen der der csv-Dateien von der Seite der BuBa
URL="https://www.bundesbank.de/statistic-rmi/StatisticDownload?"
for tsId in $CURVE_TSIDS; do
	URL="${URL}tsId=${tsId}&"
done
URL="${URL}mode=its&its_csvFormat=de&its_currency=default&its_dateFormat=default" # &its_from=$TIMESTAMP&its_to=$TIMESTAMP"
wget -q -O "$1" $URL
if [ $? -ne 0 ]; then
	echo "ERROR: Could not download $1"
	exit 1
fi
