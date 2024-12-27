#!/bin/bash

SITE_URL="www3.nhk.or.jp/news/easy"
OUTPUT_DIR="public/sources/$SITE_URL"
ARCHIVE_DIR="$OUTPUT_DIR/archive"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_FILE="/tmp/news-list-new.json"

# Create necessary directories
mkdir -p $OUTPUT_DIR
mkdir -p $ARCHIVE_DIR

# Fetch the latest news list to a temporary file
curl -s "https://$SITE_URL/news-list.json" > "$TEMP_FILE"

# Check if current file exists and if content is different
if [ -f "$OUTPUT_DIR/news-list.json" ]; then
    if ! cmp -s "$OUTPUT_DIR/news-list.json" "$TEMP_FILE"; then
        # Content is different, archive the current version
        cp "$OUTPUT_DIR/news-list.json" "$ARCHIVE_DIR/news-list_$TIMESTAMP.json"
        # Update with new content
        mv "$TEMP_FILE" "$OUTPUT_DIR/news-list.json"
        jq '.' "$OUTPUT_DIR/news-list.json" > "$OUTPUT_DIR/news-list-formatted.json"
        echo "📰 News data updated and previous version archived."
    else
        echo "📭 No changes in news data."
        rm "$TEMP_FILE"
    fi
else
    # First time run, just save the files
    mv "$TEMP_FILE" "$OUTPUT_DIR/news-list.json"
    jq '.' "$OUTPUT_DIR/news-list.json" > "$OUTPUT_DIR/news-list-formatted.json"
    echo "📰 Initial news data saved."
fi

# Clean up old archives (keep last 24 hours)
find "$ARCHIVE_DIR" -name "news-list_*.json" -type f -mtime +1 -delete
