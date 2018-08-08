### Worker

This worker pre-generates orders for all the stores in a chain, every week. It facilitates managers who come into work monday by keeping the orders ready for their review when they open shop.

### Architecture

Refer to AWS ELB's [worker environments](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features-managing-env-tiers.html)

### Local testing

1. Start the server:

  ```
  cd worker/generate-weekly-stock-orders/aws-ebs
  PORT=3000 npm start
  ```
2. Test with a dummy payloads:

  ```
  # file as a payload
  curl -XPOST http://localhost:3000/ \
    --header "Content-Type: application/json" \
    -d @workers/generate-weekly-stock-orders/tests/fermiyontest.payload.json

  # or an inline payload
  curl -XPOST http://localhost:3000 -d '{
    "projectId": "xxx",
    "oauthToken": "xxx",
    "workerPayloads": []
  }'
  ```
