#!/bin/bash

# utility script to call skadi's support/localise.py script to 
# localise the various html files in the dataviz package

folder=`dirname $0`
localise_script=$folder/../../../../support/localise.py

for language in en ja es
do
    for node in csv_import
    do
       input_path=nodes/$node.html
       output_path="nodes/$node"_"$language.html"
       echo "localising: $input_path => $output_path" 
       python3 $localise_script $input_path l10n/$language.json $output_path
    done
done  


