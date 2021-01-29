#!/bin/sh

###### Transformieren der Zinskurve in das csv-Format der JsonRisk Apps
echo -n "ZINSKURVE" > $2
cat $1 |grep 'Monatsendstand'| head -n 1 | tr -cd '1234567890,;\n' | sed 's/;;/;/g ; s/;$//g ; s/\,0/Y/g' >> $2

cat $1 |grep -E '[0-9]{4}-[0-9]{2};' | tr -cd '1234567890,;\-\n' |tr ',' '.' | sed 's/;;/;/g ; s/;$//g' | awk 'BEGIN{FS=";";OFS=";"}{for(i=2;i<=NF;i++){$i/=100};print}' >> $2


