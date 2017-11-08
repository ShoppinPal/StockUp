angular.module('shoppinpal-constants', [])
  .constant('ReportModelStates', {
    'REPORT_EMPTY': 'report_empty',
    'MANAGER_NEW_ORDERS': 'manager_new_orders',
    'MANAGER_IN_PROCESS': 'manager_in_process',
    'WAREHOUSE_FULFILL': 'warehouse_fulfill',
    'MANAGER_RECEIVE': 'manager_receive',
    'REPORT_COMPLETE': 'report_complete'
  })
  .constant('notificationUrl', '@@notificationUrl')
  .constant('proxyUrl', '@@proxyUrl')
  .constant('vendClientId','@@vendClientId')
  .constant('vendAuthEndpoint', '@@vendAuthEndpoint')
  .constant('apiKey', '@@apiKey')
  .constant('loopbackApiRoot','@@loopbackApiRoot')
  .constant('baseUrl', '@@baseUrl');