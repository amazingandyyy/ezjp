#!/bin/bash

SITE_URL="www3.nhk.or.jp/news/easy"
OUTPUT_DIR="public/sources/$SITE_URL/"

# Create base directory if it doesn't exist
mkdir -p $OUTPUT_DIR

# Fetch the news list
curl -s "https://$SITE_URL/news-list.json" > $OUTPUT_DIR/news-list.json

# Beautifully format the news list
jq '.' $OUTPUT_DIR/news-list.json > $OUTPUT_DIR/news-list-formatted.json
