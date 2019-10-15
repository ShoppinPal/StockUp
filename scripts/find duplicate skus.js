//query to check duplicate skus
db.ProductModel.aggregate(

  // Pipeline
  [
    // Stage 1
    {
      $group: {
      "_id": "$sku", "sku": {$first: "$sku"}, "count":{$sum: 1}
      }
    },

    // Stage 2
    {
      $match: {
      "count": {$gt: 1}
      }
    },

    // Stage 3
    {
      $project: {
      "sku":1, "_id": 0
      }
    },

    // Stage 4
    {
      $group: {
      "_id":null,"duplicateNames":{$push:"$sku"}
      }
    },

    // Stage 5
    {
      $project: {
      "_id":0,"duplicateNames":1
      }
    }

  ]
);
