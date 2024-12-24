#!/bin/bash

# Create base directory if it doesn't exist
mkdir -p public/nhk-easy-jp-news

# Fetch the news list
curl -s "https://www3.nhk.or.jp/news/easy/news-list.json" > public/nhk-easy-jp-news/news-list.json

# Beautifully format the news list
jq '.' public/nhk-easy-jp-news/news-list.json > public/nhk-easy-jp-news/news-list-formatted.json
