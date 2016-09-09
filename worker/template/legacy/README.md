* `cd worker/template/legacy`
* `npm install`
* Sample test command:
  ```
  time \
  iron_worker run template --payload '{
      "env": "staging"
    }'
  ```
* Sample test command:
  ```
  time \
  iron_worker run template --payload '{
      "env": "production"
    }'
  ```
* Upload: `time iron_worker upload template`
