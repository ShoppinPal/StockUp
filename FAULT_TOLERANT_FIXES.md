# Fault-Tolerant Receive Consignment - Code Changes

## Overview
Make the receive consignment process fault-tolerant so orders ALWAYS complete, even if:
1. Individual SKUs are not found
2. Individual products fail to mark as received
3. Notification service fails
4. Any other errors occur during processing

**CRITICAL RULE: Always mark order as "Complete" no matter what errors occur**

---

## Change 1: Make Receive Consignment Worker Fault-Tolerant

### File: `workers/workers-v2/receive-consignment-vend/receive-consignment-vend.js`

**Location: Around line 150-250 (the main processing loop)**

**Current behavior:** If ANY product fails, the entire order fails
**New behavior:** Log errors for individual products but continue processing, ALWAYS complete the order

```javascript
// REPLACE the entire receiveConsignment function with this fault-tolerant version:

var receiveConsignment = function (payload, messageId) {
    var commandName = payload.workerName;
    var db = null;
    var reportModelId = payload.reportModelId;
    var orgModelId = payload.orgModelId;
    var receivedProducts = payload.receivedProducts || [];

    // Track errors but don't let them stop the process
    var errors = [];
    var successCount = 0;
    var failureCount = 0;

    logger.debug({
        commandName: commandName,
        message: 'Starting receive consignment process',
        messageId: messageId,
        reportModelId: reportModelId,
        totalProducts: receivedProducts.length
    });

    return dbUtils.getDB()
        .then(function (dbInstance) {
            db = dbInstance;
            logger.debug({
                commandName: commandName,
                message: 'Connected to database',
                messageId: messageId
            });

            // Process each product with individual error handling
            var productPromises = receivedProducts.map(function(product, index) {
                return Promise.resolve()
                    .then(function() {
                        logger.debug({
                            commandName: commandName,
                            message: 'Processing product',
                            productIndex: index + 1,
                            totalProducts: receivedProducts.length,
                            sku: product.sku,
                            receivedQuantity: product.receivedQuantity
                        });

                        // Find product by SKU
                        return db.collection('ProductModel').findOne({
                            orgModelId: utils.ObjectId(orgModelId),
                            sku: product.sku
                        });
                    })
                    .then(function(productModel) {
                        if (!productModel) {
                            // SKU not found - LOG but DON'T fail
                            var error = {
                                sku: product.sku,
                                error: 'Product not found in database',
                                receivedQuantity: product.receivedQuantity
                            };
                            errors.push(error);
                            failureCount++;

                            logger.warn({
                                commandName: commandName,
                                message: 'SKU not found - IGNORING and continuing',
                                messageId: messageId,
                                sku: product.sku,
                                receivedQuantity: product.receivedQuantity
                            });

                            return Promise.resolve(); // Continue to next product
                        }

                        // Update line item as received
                        return db.collection('StockOrderLineitemModel').updateOne(
                            {
                                reportModelId: utils.ObjectId(reportModelId),
                                productModelId: productModel._id
                            },
                            {
                                $set: {
                                    received: true,
                                    receivedQuantity: product.receivedQuantity || 0,
                                    updatedAt: new Date()
                                }
                            }
                        )
                        .then(function(updateResult) {
                            if (updateResult.modifiedCount > 0) {
                                successCount++;
                                logger.debug({
                                    commandName: commandName,
                                    message: 'Product marked as received',
                                    sku: product.sku,
                                    receivedQuantity: product.receivedQuantity
                                });
                            } else {
                                // Product not in order - LOG but DON'T fail
                                var error = {
                                    sku: product.sku,
                                    error: 'Product not found in order',
                                    receivedQuantity: product.receivedQuantity
                                };
                                errors.push(error);
                                failureCount++;

                                logger.warn({
                                    commandName: commandName,
                                    message: 'Product not in order - IGNORING and continuing',
                                    messageId: messageId,
                                    sku: product.sku
                                });
                            }
                            return Promise.resolve();
                        });
                    })
                    .catch(function(error) {
                        // Individual product error - LOG but DON'T fail
                        errors.push({
                            sku: product.sku,
                            error: error.message || error,
                            receivedQuantity: product.receivedQuantity
                        });
                        failureCount++;

                        logger.error({
                            commandName: commandName,
                            message: 'Error processing product - IGNORING and continuing',
                            messageId: messageId,
                            sku: product.sku,
                            error: error.message || error
                        });

                        return Promise.resolve(); // Continue to next product
                    });
            });

            // Wait for all products to be processed (even if some failed)
            return Promise.all(productPromises);
        })
        .then(function() {
            logger.debug({
                commandName: commandName,
                message: 'All products processed',
                messageId: messageId,
                successCount: successCount,
                failureCount: failureCount,
                totalErrors: errors.length
            });

            // ALWAYS mark order as Complete - THIS IS CRITICAL
            return db.collection('ReportModel').updateOne(
                { _id: utils.ObjectId(reportModelId) },
                {
                    $set: {
                        state: utils.REPORT_STATES.COMPLETE,
                        updatedAt: new Date()
                    }
                }
            );
        })
        .then(function(updateResult) {
            logger.debug({
                commandName: commandName,
                message: 'Order marked as COMPLETE',
                messageId: messageId,
                reportModelId: reportModelId,
                successCount: successCount,
                failureCount: failureCount,
                modifiedCount: updateResult.modifiedCount
            });

            // Send notification - but DON'T let it fail the process
            return sendNotification(payload, messageId, successCount, failureCount, errors)
                .catch(function(notificationError) {
                    // Notification failed - LOG but DON'T fail
                    logger.error({
                        commandName: commandName,
                        message: 'Notification failed - IGNORING',
                        messageId: messageId,
                        error: notificationError.message || notificationError
                    });
                    return Promise.resolve(); // Continue anyway
                });
        })
        .then(function() {
            logger.debug({
                commandName: commandName,
                message: 'Receive consignment completed successfully',
                messageId: messageId,
                reportModelId: reportModelId,
                summary: {
                    total: receivedProducts.length,
                    success: successCount,
                    failed: failureCount,
                    errors: errors
                }
            });

            return Promise.resolve({
                success: true,
                reportModelId: reportModelId,
                summary: {
                    total: receivedProducts.length,
                    success: successCount,
                    failed: failureCount,
                    errors: errors
                }
            });
        })
        .catch(function(error) {
            // CRITICAL ERROR (database connection, etc.)
            // Even in this case, try to mark order as complete
            logger.error({
                commandName: commandName,
                message: 'CRITICAL ERROR - Attempting to mark order as complete anyway',
                messageId: messageId,
                error: error.message || error
            });

            // Last-ditch effort to complete the order
            if (db) {
                return db.collection('ReportModel').updateOne(
                    { _id: utils.ObjectId(reportModelId) },
                    {
                        $set: {
                            state: utils.REPORT_STATES.COMPLETE,
                            updatedAt: new Date()
                        }
                    }
                )
                .then(function() {
                    logger.debug({
                        commandName: commandName,
                        message: 'Order marked as COMPLETE despite critical error',
                        messageId: messageId
                    });
                    return Promise.resolve({
                        success: true,
                        reportModelId: reportModelId,
                        hadCriticalError: true,
                        error: error.message || error
                    });
                })
                .catch(function(finalError) {
                    logger.error({
                        commandName: commandName,
                        message: 'FAILED to mark order as complete - manual intervention required',
                        messageId: messageId,
                        error: finalError.message || finalError
                    });
                    // Return success anyway to prevent worker retry
                    return Promise.resolve({
                        success: false,
                        reportModelId: reportModelId,
                        requiresManualCompletion: true,
                        error: error.message || error
                    });
                });
            } else {
                logger.error({
                    commandName: commandName,
                    message: 'No database connection - manual intervention required',
                    messageId: messageId
                });
                return Promise.resolve({
                    success: false,
                    reportModelId: reportModelId,
                    requiresManualCompletion: true,
                    error: 'No database connection'
                });
            }
        });
};

// Helper function to send notification (non-blocking)
function sendNotification(payload, messageId, successCount, failureCount, errors) {
    var commandName = payload.workerName;

    return Promise.resolve()
        .then(function() {
            var options = {
                method: 'POST',
                uri: utils.PUBLISH_URL,
                json: true,
                headers: {
                    'Authorization': payload.loopbackAccessToken.id
                },
                body: new utils.Notification(
                    utils.workerType.RECEIVE_CONSIGNMENT_VEND,
                    utils.messageFor.MESSAGE_FOR_CLIENT, // IMPORTANT: Use correct messageFor
                    utils.workerStatus.SUCCESS,
                    {
                        success: true,
                        reportModelId: payload.reportModelId,
                        summary: {
                            total: (payload.receivedProducts || []).length,
                            success: successCount,
                            failed: failureCount,
                            errors: errors.length > 0 ? errors : undefined
                        }
                    },
                    payload.loopbackAccessToken.userId // Use userId for MESSAGE_FOR_CLIENT
                )
            };

            logger.debug({
                commandName: commandName,
                message: 'Sending notification',
                messageId: messageId,
                options: options
            });

            return rp(options);
        })
        .then(function(response) {
            logger.debug({
                commandName: commandName,
                message: 'Notification sent successfully',
                messageId: messageId,
                response: response
            });
            return Promise.resolve();
        })
        .catch(function(error) {
            logger.error({
                commandName: commandName,
                message: 'Failed to send notification',
                messageId: messageId,
                error: error.message || error
            });
            // Don't reject - just log and continue
            return Promise.resolve();
        });
}
```

---

## Change 2: Make Notification Service More Resilient

### File: `notification-service/index.js`

**Location: Line 104-134 (Redis message handler)**

**Change:** Add better error handling and logging for unknown payloads

```javascript
// REPLACE the Redis message handler with this:

app.on('redis-subscriber-connected', () => {
    app.redis.workerSubscriber.on('message', (channel, message) => {
        try{
            let payload = JSON.parse(message);
            let { eventType, data, messageFor, status } = payload;

            // Validate messageFor field
            if (!messageFor) {
                logger.warn({
                    message: 'Notification missing messageFor field - IGNORING',
                    payload: payload,
                    eventType: eventType
                });
                return; // Ignore but don't crash
            }

            switch(messageFor) {
                case utils.constants.MESSAGE_FOR_CLIENT:
                    let { userId } = payload;
                    if (!userId) {
                        logger.warn({
                            message: 'MESSAGE_FOR_CLIENT missing userId - IGNORING',
                            payload: payload
                        });
                        return;
                    }
                    utils.sendSSEOutput(sseUsers, userId, eventType, status, data, utils.constants.MESSAGE_FOR_CLIENT);
                break;

                case utils.constants.MESSAGE_FOR_API:
                    let { callId } = payload;
                    if (!callId) {
                        logger.warn({
                            message: 'MESSAGE_FOR_API missing callId - IGNORING',
                            payload: payload
                        });
                        return;
                    }
                    utils.sendSSEOutput(sseAPI, callId, eventType, status, data, utils.constants.MESSAGE_FOR_API);
                break;

                default:
                    // Unknown messageFor - LOG but DON'T crash
                    logger.warn({
                        message: 'Unknown messageFor value - IGNORING',
                        messageFor: messageFor,
                        eventType: eventType,
                        payload: payload
                    });
                    // Don't throw error - just ignore
                break;
            }
        }
        catch(error) {
            // JSON parse error or other error - LOG but DON'T crash
            logger.error({
                error: error,
                message: 'Error while receiving redis subscription message - IGNORING',
                rawMessage: message
            });
            // Don't throw - just log and continue
        }
    });
});
```

---

## Change 3: Add Fault-Tolerant Constants

### File: `notification-service/utils/constants.js`

**Add these constants:**

```javascript
const exports = {}
module.exports = exports;

exports.workerEvents = {
    // Add your worker events here
};

exports.workerStatus = {
    STARTED: 'STARTED',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
};

// ADD THESE:
exports.MESSAGE_FOR_CLIENT = 'MESSAGE_FOR_CLIENT';
exports.MESSAGE_FOR_API = 'MESSAGE_FOR_API';
```

---

## Change 4: Update Worker Utils to Use Correct Constants

### File: `workers/jobs/utils/utils.js`

**Location: Line 732-742 (Notification constructor)**

**Ensure the Notification constructor validates messageFor:**

```javascript
exports.Notification = function (eventType, messageFor, status, data, id) {
    // Validate messageFor
    if (messageFor !== exports.messageFor.MESSAGE_FOR_CLIENT &&
        messageFor !== exports.messageFor.MESSAGE_FOR_API) {
        logger.warn({
            message: 'Invalid messageFor value - defaulting to MESSAGE_FOR_CLIENT',
            messageFor: messageFor,
            eventType: eventType
        });
        messageFor = exports.messageFor.MESSAGE_FOR_CLIENT;
    }

    this.eventType = eventType;
    this.messageFor = messageFor;
    this.status = status;
    this.data = data;

    if (messageFor === exports.messageFor.MESSAGE_FOR_CLIENT) {
        this.userId = id;
    } else if (messageFor === exports.messageFor.MESSAGE_FOR_API) {
        this.callId = id;
    }
};
```

---

## Testing Instructions

### 1. Test with Invalid SKU

```bash
# Send a receive consignment with an invalid SKU
# Expected: Order completes, error logged, invalid SKU ignored
```

### 2. Test with Notification Failure

```bash
# Stop notification service
docker-compose stop notification

# Receive consignment
# Expected: Order completes, notification error logged

# Restart notification service
docker-compose start notification
```

### 3. Test with Database Error

```bash
# Simulate database connection issue
# Expected: Order still attempts to complete
```

### 4. Verify Order Always Completes

```javascript
// Run this query after each test
use stockup

db.ReportModel.find({
  orgModelId: ObjectId("5e1f0aa335f11d1ffed8478e"),
  state: { $ne: "Complete" },
  updatedAt: { $gte: new ISODate("2026-02-19") }
}).forEach(function(order) {
  print("STUCK ORDER: " + order.name + " - " + order.state);
});

// Should return NO results - all orders should be Complete
```

---

## Summary of Changes

### ✅ What We Fixed:

1. **Individual SKU failures** → Logged and ignored, processing continues
2. **Product not found in order** → Logged and ignored, processing continues
3. **Notification failures** → Logged and ignored, order still completes
4. **Database errors** → Last-ditch effort to complete order
5. **Invalid notification payloads** → Logged and ignored, service doesn't crash

### ✅ Critical Guarantees:

1. **Order ALWAYS marked as "Complete"** (unless database is completely down)
2. **Worker NEVER retries** (returns success even with errors)
3. **All errors logged** (for debugging and manual review)
4. **System keeps running** (no crashes from individual failures)

### ✅ Monitoring:

- Check logs for `IGNORING` messages to see what errors occurred
- Check logs for `requiresManualCompletion: true` for critical failures
- All errors are logged with full context for debugging

---

## Deployment Steps

1. **Backup current code**
   ```bash
   git checkout -b backup-before-fault-tolerant-fixes
   git commit -am "Backup before fault-tolerant fixes"
   ```

2. **Apply changes** (use this MD file)

3. **Test in development**
   ```bash
   docker-compose up --build
   ```

4. **Deploy to production**
   ```bash
   git checkout master
   git merge backup-before-fault-tolerant-fixes
   docker-compose up -d --build
   ```

5. **Monitor logs**
   ```bash
   docker-compose logs -f worker notification
   ```

---

## Rollback Plan

If issues occur:

```bash
git checkout master
git revert HEAD
docker-compose up -d --build
```

---

**END OF FAULT-TOLERANT FIXES**
