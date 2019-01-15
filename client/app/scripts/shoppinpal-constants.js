angular.module('shoppinpal-constants', [])
  .constant('ReportModelStates', {
    'REPORT_EMPTY': 'report_empty',
    'MANAGER_NEW_ORDERS': 'manager_new_orders',
    'MANAGER_IN_PROCESS': 'manager_in_process',
    'WAREHOUSE_FULFILL': 'warehouse_fulfill',
    'MANAGER_RECEIVE': 'manager_receive',
    'REPORT_COMPLETE': 'report_complete'
  })
  .constant('proxyUrl', '')
  .constant('vendClientId','RoubjVS8fXxAYrJiG7prueMN8rMZeZY8')
  .constant('vendAuthEndpoint', 'https://secure.vendhq.com/connect')
  .constant('apiKey', '')
  .constant('loopbackApiRoot','/api')
  .constant('baseUrl', 'http://kamalazure.shoppinpal.com');
