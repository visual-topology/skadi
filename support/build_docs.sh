#!/bin/bash

rm -Rf ../docs/versions/latest/apidocs

jsdoc ../skadi/js/skadi-api.js --destination ../docs/versions/latest/apidocs