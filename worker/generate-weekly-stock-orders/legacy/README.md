* `cd worker/generate-weekly-stock-orders/legacy`
* `npm install`
* Sample test command:
  ```
  time \
  iron_worker run generate-weekly-stock-orders \
    --payload-file ./seed/dummy.payloads.json
  ```
* Schedule it:
  ```
  iron_worker schedule \
    generate-weekly-stock-orders \
    --label generate-weekly-stock-orders \
    --start-at "2016-05-01T01:50:00-05:00" \
    --run-every 604800 \
    --timeout 600 \
    --priority 2 \
    --cluster default \
    --payload-file ./seed/patricias.payloads.json
  ```
* tbd...