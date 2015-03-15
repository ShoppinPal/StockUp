(function(window, angular, undefined) {'use strict';

var urlBase = "https://mppulkit8.localtunnel.me/api";
var authHeader = 'authorization';

/**
 * @ngdoc overview
 * @name shoppinpal-loopback
 * @module
 * @description
 *
 * The `shoppinpal-loopback` module provides services for interacting with
 * the models exposed by the LoopBack server via the REST API.
 *
 */
var module = angular.module("shoppinpal-loopback", ['ngResource']);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.GlobalConfigModel
 * @header shoppinpal-loopback.GlobalConfigModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `GlobalConfigModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "GlobalConfigModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/GlobalConfigModels/:id",
      { 'id': '@id' },
      {

        // INTERNAL. Use GlobalConfigModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/GlobalConfigModels/:id/userModel",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#create
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/GlobalConfigModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#upsert
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/GlobalConfigModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#exists
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `exists` – `{boolean=}` - 
         */
        "exists": {
          url: urlBase + "/GlobalConfigModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#findById
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Find a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/GlobalConfigModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#find
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/GlobalConfigModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#findOne
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/GlobalConfigModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#updateAll
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "updateAll": {
          url: urlBase + "/GlobalConfigModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#deleteById
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "deleteById": {
          url: urlBase + "/GlobalConfigModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#count
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        "count": {
          url: urlBase + "/GlobalConfigModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/GlobalConfigModels/:id",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.globalConfigModels() instead.
        "::get::UserModel::globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.globalConfigModels.create() instead.
        "::create::UserModel::globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.globalConfigModels.update() instead.
        "::update::UserModel::globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.globalConfigModels.destroy() instead.
        "::destroy::UserModel::globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "DELETE"
        },
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#updateOrCreate
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#update
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["update"] = R["updateAll"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#destroyById
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["destroyById"] = R["deleteById"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#removeById
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["removeById"] = R["deleteById"];


    /**
    * @ngdoc property
    * @name shoppinpal-loopback.GlobalConfigModel#modelName
    * @propertyOf shoppinpal-loopback.GlobalConfigModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `GlobalConfigModel`.
    */
    R.modelName = "GlobalConfigModel";


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.GlobalConfigModel#userModel
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `refresh` – `{boolean=}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        R.userModel = function() {
          var TargetResource = $injector.get("UserModel");
          var action = TargetResource["::get::GlobalConfigModel::userModel"];
          return action.apply(R, arguments);
        };

    return R;
  }]);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.StoreConfigModel
 * @header shoppinpal-loopback.StoreConfigModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `StoreConfigModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "StoreConfigModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/StoreConfigModels/:id",
      { 'id': '@id' },
      {

        // INTERNAL. Use StoreConfigModel.storeModels.findById() instead.
        "prototype$__findById__storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.destroyById() instead.
        "prototype$__destroyById__storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.updateById() instead.
        "prototype$__updateById__storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use StoreConfigModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/StoreConfigModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels() instead.
        "prototype$__get__storeModels": {
          isArray: true,
          url: urlBase + "/StoreConfigModels/:id/storeModels",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.create() instead.
        "prototype$__create__storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels",
          method: "POST"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.destroyAll() instead.
        "prototype$__delete__storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels",
          method: "DELETE"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.count() instead.
        "prototype$__count__storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#create
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/StoreConfigModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#upsert
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/StoreConfigModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#exists
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `exists` – `{boolean=}` - 
         */
        "exists": {
          url: urlBase + "/StoreConfigModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#findById
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Find a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/StoreConfigModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#find
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/StoreConfigModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#findOne
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/StoreConfigModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#updateAll
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "updateAll": {
          url: urlBase + "/StoreConfigModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#deleteById
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "deleteById": {
          url: urlBase + "/StoreConfigModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#count
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        "count": {
          url: urlBase + "/StoreConfigModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/StoreConfigModels/:id",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#getVendRegisters
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{number}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "getVendRegisters": {
          isArray: true,
          url: urlBase + "/StoreConfigModels/:id/vend/registers",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#getVendOutlets
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{number}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "getVendOutlets": {
          isArray: true,
          url: urlBase + "/StoreConfigModels/:id/vend/outlets",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#getVendTaxes
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{number}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "getVendTaxes": {
          isArray: true,
          url: urlBase + "/StoreConfigModels/:id/vend/taxes",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#getVendPaymentTypes
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{number}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        "getVendPaymentTypes": {
          isArray: true,
          url: urlBase + "/StoreConfigModels/:id/vend/payment_types",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#getVendAccessToken
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `code` – `{string}` - 
         *
         *  - `domain_prefix` – `{string}` - 
         *
         *  - `state` – `{string}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `redirectUrl` – `{string=}` - 
         */
        "getVendAccessToken": {
          url: urlBase + "/StoreConfigModels/token/vend",
          method: "GET"
        },

        // INTERNAL. Use StoreModel.storeConfigModel() instead.
        "::get::StoreModel::storeConfigModel": {
          url: urlBase + "/StoreModels/:id/storeConfigModel",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.findById() instead.
        "::findById::UserModel::storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.destroyById() instead.
        "::destroyById::UserModel::storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.updateById() instead.
        "::updateById::UserModel::storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.storeConfigModels() instead.
        "::get::UserModel::storeConfigModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/storeConfigModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.create() instead.
        "::create::UserModel::storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.storeConfigModels.destroyAll() instead.
        "::delete::UserModel::storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.count() instead.
        "::count::UserModel::storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/count",
          method: "GET"
        },
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#updateOrCreate
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#update
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["update"] = R["updateAll"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#destroyById
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["destroyById"] = R["deleteById"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#removeById
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["removeById"] = R["deleteById"];


    /**
    * @ngdoc property
    * @name shoppinpal-loopback.StoreConfigModel#modelName
    * @propertyOf shoppinpal-loopback.StoreConfigModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `StoreConfigModel`.
    */
    R.modelName = "StoreConfigModel";

    /**
     * @ngdoc object
     * @name lbServices.StoreConfigModel.storeModels
     * @header lbServices.StoreConfigModel.storeModels
     * @object
     * @description
     *
     * The object `StoreConfigModel.storeModels` groups methods
     * manipulating `StoreModel` instances related to `StoreConfigModel`.
     *
     * Call {@link lbServices.StoreConfigModel#storeModels StoreConfigModel.storeModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#storeModels
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Queries storeModels of StoreConfigModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `filter` – `{object=}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::get::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#count
         * @methodOf shoppinpal-loopback.StoreConfigModel.storeModels
         *
         * @description
         *
         * Counts storeModels of StoreConfigModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        R.storeModels.count = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::count::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#create
         * @methodOf shoppinpal-loopback.StoreConfigModel.storeModels
         *
         * @description
         *
         * Creates a new instance in storeModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels.create = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::create::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#destroyAll
         * @methodOf shoppinpal-loopback.StoreConfigModel.storeModels
         *
         * @description
         *
         * Deletes all storeModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.storeModels.destroyAll = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::delete::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#destroyById
         * @methodOf shoppinpal-loopback.StoreConfigModel.storeModels
         *
         * @description
         *
         * Delete a related item by id for storeModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `fk` – `{*}` - Foreign key for storeModels
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.storeModels.destroyById = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::destroyById::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#findById
         * @methodOf shoppinpal-loopback.StoreConfigModel.storeModels
         *
         * @description
         *
         * Find a related item by id for storeModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `fk` – `{*}` - Foreign key for storeModels
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels.findById = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::findById::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#updateById
         * @methodOf shoppinpal-loopback.StoreConfigModel.storeModels
         *
         * @description
         *
         * Update a related item by id for storeModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `fk` – `{*}` - Foreign key for storeModels
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels.updateById = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::updateById::StoreConfigModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#userModel
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `refresh` – `{boolean=}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        R.userModel = function() {
          var TargetResource = $injector.get("UserModel");
          var action = TargetResource["::get::StoreConfigModel::userModel"];
          return action.apply(R, arguments);
        };

    return R;
  }]);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.StoreModel
 * @header shoppinpal-loopback.StoreModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `StoreModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "StoreModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/StoreModels/:id",
      { 'id': '@id' },
      {

        // INTERNAL. Use StoreModel.storeConfigModel() instead.
        "prototype$__get__storeConfigModel": {
          url: urlBase + "/StoreModels/:id/storeConfigModel",
          method: "GET"
        },

        // INTERNAL. Use StoreModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/StoreModels/:id/userModel",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#create
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/StoreModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#upsert
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/StoreModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#exists
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `exists` – `{boolean=}` - 
         */
        "exists": {
          url: urlBase + "/StoreModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#findById
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Find a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/StoreModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#find
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/StoreModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#findOne
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/StoreModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#updateAll
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "updateAll": {
          url: urlBase + "/StoreModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#deleteById
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "deleteById": {
          url: urlBase + "/StoreModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#count
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        "count": {
          url: urlBase + "/StoreModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/StoreModels/:id",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#importProducts
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{number}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "importProducts": {
          url: urlBase + "/StoreModels/:id/import-products",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.findById() instead.
        "::findById::StoreConfigModel::storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.destroyById() instead.
        "::destroyById::StoreConfigModel::storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.updateById() instead.
        "::updateById::StoreConfigModel::storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use StoreConfigModel.storeModels() instead.
        "::get::StoreConfigModel::storeModels": {
          isArray: true,
          url: urlBase + "/StoreConfigModels/:id/storeModels",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.create() instead.
        "::create::StoreConfigModel::storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels",
          method: "POST"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.destroyAll() instead.
        "::delete::StoreConfigModel::storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels",
          method: "DELETE"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.count() instead.
        "::count::StoreConfigModel::storeModels": {
          url: urlBase + "/StoreConfigModels/:id/storeModels/count",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.findById() instead.
        "::findById::UserModel::storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.destroyById() instead.
        "::destroyById::UserModel::storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeModels.updateById() instead.
        "::updateById::UserModel::storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.storeModels() instead.
        "::get::UserModel::storeModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/storeModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.create() instead.
        "::create::UserModel::storeModels": {
          url: urlBase + "/UserModels/:id/storeModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.storeModels.destroyAll() instead.
        "::delete::UserModel::storeModels": {
          url: urlBase + "/UserModels/:id/storeModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeModels.count() instead.
        "::count::UserModel::storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/count",
          method: "GET"
        },
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#updateOrCreate
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#update
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["update"] = R["updateAll"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#destroyById
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["destroyById"] = R["deleteById"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#removeById
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["removeById"] = R["deleteById"];


    /**
    * @ngdoc property
    * @name shoppinpal-loopback.StoreModel#modelName
    * @propertyOf shoppinpal-loopback.StoreModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `StoreModel`.
    */
    R.modelName = "StoreModel";


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#storeConfigModel
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Fetches belongsTo relation storeConfigModel
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `refresh` – `{boolean=}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        R.storeConfigModel = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::get::StoreModel::storeConfigModel"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#userModel
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `refresh` – `{boolean=}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        R.userModel = function() {
          var TargetResource = $injector.get("UserModel");
          var action = TargetResource["::get::StoreModel::userModel"];
          return action.apply(R, arguments);
        };

    return R;
  }]);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.UserModel
 * @header shoppinpal-loopback.UserModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `UserModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "UserModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/UserModels/:id",
      { 'id': '@id' },
      {

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__findById__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Find a related item by id for accessTokens
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for accessTokens
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "prototype$__findById__accessTokens": {
          url: urlBase + "/UserModels/:id/accessTokens/:fk",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__destroyById__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Delete a related item by id for accessTokens
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for accessTokens
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "prototype$__destroyById__accessTokens": {
          url: urlBase + "/UserModels/:id/accessTokens/:fk",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__updateById__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update a related item by id for accessTokens
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for accessTokens
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "prototype$__updateById__accessTokens": {
          url: urlBase + "/UserModels/:id/accessTokens/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.globalConfigModels() instead.
        "prototype$__get__globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.globalConfigModels.create() instead.
        "prototype$__create__globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.globalConfigModels.update() instead.
        "prototype$__update__globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.globalConfigModels.destroy() instead.
        "prototype$__destroy__globalConfigModels": {
          url: urlBase + "/UserModels/:id/globalConfigModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.findById() instead.
        "prototype$__findById__storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.destroyById() instead.
        "prototype$__destroyById__storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.updateById() instead.
        "prototype$__updateById__storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.storeModels.findById() instead.
        "prototype$__findById__storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.destroyById() instead.
        "prototype$__destroyById__storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeModels.updateById() instead.
        "prototype$__updateById__storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__get__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries accessTokens of UserModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `filter` – `{object=}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "prototype$__get__accessTokens": {
          isArray: true,
          url: urlBase + "/UserModels/:id/accessTokens",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__create__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Creates a new instance in accessTokens of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "prototype$__create__accessTokens": {
          url: urlBase + "/UserModels/:id/accessTokens",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__delete__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Deletes all accessTokens of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "prototype$__delete__accessTokens": {
          url: urlBase + "/UserModels/:id/accessTokens",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__count__accessTokens
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Counts accessTokens of UserModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        "prototype$__count__accessTokens": {
          url: urlBase + "/UserModels/:id/accessTokens/count",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels() instead.
        "prototype$__get__storeConfigModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/storeConfigModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.create() instead.
        "prototype$__create__storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.storeConfigModels.destroyAll() instead.
        "prototype$__delete__storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.count() instead.
        "prototype$__count__storeConfigModels": {
          url: urlBase + "/UserModels/:id/storeConfigModels/count",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels() instead.
        "prototype$__get__storeModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/storeModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.create() instead.
        "prototype$__create__storeModels": {
          url: urlBase + "/UserModels/:id/storeModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.storeModels.destroyAll() instead.
        "prototype$__delete__storeModels": {
          url: urlBase + "/UserModels/:id/storeModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeModels.count() instead.
        "prototype$__count__storeModels": {
          url: urlBase + "/UserModels/:id/storeModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#create
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/UserModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#upsert
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/UserModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#exists
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `exists` – `{boolean=}` - 
         */
        "exists": {
          url: urlBase + "/UserModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#findById
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Find a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/UserModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#find
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/UserModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#findOne
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, orderBy, offset, and limit
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/UserModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#updateAll
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "updateAll": {
          url: urlBase + "/UserModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#deleteById
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "deleteById": {
          url: urlBase + "/UserModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#count
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        "count": {
          url: urlBase + "/UserModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/UserModels/:id",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#login
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Login a user with username/email and password
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `include` – `{string=}` - Related objects to include in the response. See the description of return value for more details.
         *   Default value: `user`.
         *
         *  - `rememberMe` - `boolean` - Whether the authentication credentials
         *     should be remembered in localStorage across app/browser restarts.
         *     Default: `true`.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * The response body contains properties of the AccessToken created on login.
         * Depending on the value of `include` parameter, the body may contain additional properties:
         * 
         *   - `user` - `{User}` - Data of the currently logged in user. (`include=user`)
         * 
         *
         */
        "login": {
          params: {
            include: "user"
          },
          interceptor: {
            response: function(response) {
              var accessToken = response.data;
              LoopBackAuth.setUser(accessToken.id, accessToken.userId, accessToken.user);
              LoopBackAuth.rememberMe = response.config.params.rememberMe !== false;
              LoopBackAuth.save();
              return response.resource;
            }
          },
          url: urlBase + "/UserModels/login",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#logout
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Logout a user with access token
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         *  - `access_token` – `{string}` - Do not supply this argument, it is automatically extracted from request headers.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "logout": {
          interceptor: {
            response: function(response) {
              LoopBackAuth.clearUser();
              LoopBackAuth.clearStorage();
              return response.resource;
            }
          },
          url: urlBase + "/UserModels/logout",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#confirm
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Confirm a user registration with email verification token
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `uid` – `{string}` - 
         *
         *  - `token` – `{string}` - 
         *
         *  - `redirect` – `{string=}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "confirm": {
          url: urlBase + "/UserModels/confirm",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#resetPassword
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Reset password for a user with email
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        "resetPassword": {
          url: urlBase + "/UserModels/reset",
          method: "POST"
        },

        // INTERNAL. Use GlobalConfigModel.userModel() instead.
        "::get::GlobalConfigModel::userModel": {
          url: urlBase + "/GlobalConfigModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.userModel() instead.
        "::get::StoreConfigModel::userModel": {
          url: urlBase + "/StoreConfigModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StoreModel.userModel() instead.
        "::get::StoreModel::userModel": {
          url: urlBase + "/StoreModels/:id/userModel",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#getCurrent
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Get data of the currently logged user. Fail with HTTP result 401
         * when there is no user logged in.
         *
         * @param {function(Object,Object)=} successCb
         *    Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *    `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         */
        "getCurrent": {
           url: urlBase + "/UserModels" + "/:id",
           method: "GET",
           params: {
             id: function() {
              var id = LoopBackAuth.currentUserId;
              if (id == null) id = '__anonymous__';
              return id;
            },
          },
          interceptor: {
            response: function(response) {
              LoopBackAuth.currentUserData = response.data;
              return response.resource;
            }
          },
          __isGetCurrentUser__ : true
        }
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#updateOrCreate
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `UserModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#update
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["update"] = R["updateAll"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#destroyById
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["destroyById"] = R["deleteById"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#removeById
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Delete a model instance by id from the data source
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R["removeById"] = R["deleteById"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#getCachedCurrent
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Get data of the currently logged user that was returned by the last
         * call to {@link shoppinpal-loopback.UserModel#login} or
         * {@link shoppinpal-loopback.UserModel#getCurrent}. Return null when there
         * is no user logged in or the data of the current user were not fetched
         * yet.
         *
         * @returns {Object} A UserModel instance.
         */
        R.getCachedCurrent = function() {
          var data = LoopBackAuth.currentUserData;
          return data ? new R(data) : null;
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#isAuthenticated
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @returns {boolean} True if the current user is authenticated (logged in).
         */
        R.isAuthenticated = function() {
          return this.getCurrentId() != null;
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#getCurrentId
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @returns {Object} Id of the currently logged-in user or null.
         */
        R.getCurrentId = function() {
          return LoopBackAuth.currentUserId;
        };

    /**
    * @ngdoc property
    * @name shoppinpal-loopback.UserModel#modelName
    * @propertyOf shoppinpal-loopback.UserModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `UserModel`.
    */
    R.modelName = "UserModel";

    /**
     * @ngdoc object
     * @name lbServices.UserModel.globalConfigModels
     * @header lbServices.UserModel.globalConfigModels
     * @object
     * @description
     *
     * The object `UserModel.globalConfigModels` groups methods
     * manipulating `GlobalConfigModel` instances related to `UserModel`.
     *
     * Call {@link lbServices.UserModel#globalConfigModels UserModel.globalConfigModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#globalConfigModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Fetches hasOne relation globalConfigModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `refresh` – `{boolean=}` - 
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        R.globalConfigModels = function() {
          var TargetResource = $injector.get("GlobalConfigModel");
          var action = TargetResource["::get::UserModel::globalConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.globalConfigModels#create
         * @methodOf shoppinpal-loopback.UserModel.globalConfigModels
         *
         * @description
         *
         * Creates a new instance in globalConfigModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        R.globalConfigModels.create = function() {
          var TargetResource = $injector.get("GlobalConfigModel");
          var action = TargetResource["::create::UserModel::globalConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.globalConfigModels#destroy
         * @methodOf shoppinpal-loopback.UserModel.globalConfigModels
         *
         * @description
         *
         * Deletes globalConfigModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.globalConfigModels.destroy = function() {
          var TargetResource = $injector.get("GlobalConfigModel");
          var action = TargetResource["::destroy::UserModel::globalConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.globalConfigModels#update
         * @methodOf shoppinpal-loopback.UserModel.globalConfigModels
         *
         * @description
         *
         * Update globalConfigModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `GlobalConfigModel` object.)
         * </em>
         */
        R.globalConfigModels.update = function() {
          var TargetResource = $injector.get("GlobalConfigModel");
          var action = TargetResource["::update::UserModel::globalConfigModels"];
          return action.apply(R, arguments);
        };
    /**
     * @ngdoc object
     * @name lbServices.UserModel.storeConfigModels
     * @header lbServices.UserModel.storeConfigModels
     * @object
     * @description
     *
     * The object `UserModel.storeConfigModels` groups methods
     * manipulating `StoreConfigModel` instances related to `UserModel`.
     *
     * Call {@link lbServices.UserModel#storeConfigModels UserModel.storeConfigModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#storeConfigModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries storeConfigModels of UserModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `filter` – `{object=}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        R.storeConfigModels = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::get::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeConfigModels#count
         * @methodOf shoppinpal-loopback.UserModel.storeConfigModels
         *
         * @description
         *
         * Counts storeConfigModels of UserModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        R.storeConfigModels.count = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::count::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeConfigModels#create
         * @methodOf shoppinpal-loopback.UserModel.storeConfigModels
         *
         * @description
         *
         * Creates a new instance in storeConfigModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        R.storeConfigModels.create = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::create::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeConfigModels#destroyAll
         * @methodOf shoppinpal-loopback.UserModel.storeConfigModels
         *
         * @description
         *
         * Deletes all storeConfigModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.storeConfigModels.destroyAll = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::delete::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeConfigModels#destroyById
         * @methodOf shoppinpal-loopback.UserModel.storeConfigModels
         *
         * @description
         *
         * Delete a related item by id for storeConfigModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for storeConfigModels
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.storeConfigModels.destroyById = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::destroyById::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeConfigModels#findById
         * @methodOf shoppinpal-loopback.UserModel.storeConfigModels
         *
         * @description
         *
         * Find a related item by id for storeConfigModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for storeConfigModels
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        R.storeConfigModels.findById = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::findById::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeConfigModels#updateById
         * @methodOf shoppinpal-loopback.UserModel.storeConfigModels
         *
         * @description
         *
         * Update a related item by id for storeConfigModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for storeConfigModels
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreConfigModel` object.)
         * </em>
         */
        R.storeConfigModels.updateById = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::updateById::UserModel::storeConfigModels"];
          return action.apply(R, arguments);
        };
    /**
     * @ngdoc object
     * @name lbServices.UserModel.storeModels
     * @header lbServices.UserModel.storeModels
     * @object
     * @description
     *
     * The object `UserModel.storeModels` groups methods
     * manipulating `StoreModel` instances related to `UserModel`.
     *
     * Call {@link lbServices.UserModel#storeModels UserModel.storeModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#storeModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries storeModels of UserModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `filter` – `{object=}` - 
         *
         * @param {function(Array.<Object>,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Array.<Object>} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::get::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeModels#count
         * @methodOf shoppinpal-loopback.UserModel.storeModels
         *
         * @description
         *
         * Counts storeModels of UserModel.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `where` – `{object=}` - Criteria to match model instances
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * Data properties:
         *
         *  - `count` – `{number=}` - 
         */
        R.storeModels.count = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::count::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeModels#create
         * @methodOf shoppinpal-loopback.UserModel.storeModels
         *
         * @description
         *
         * Creates a new instance in storeModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels.create = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::create::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeModels#destroyAll
         * @methodOf shoppinpal-loopback.UserModel.storeModels
         *
         * @description
         *
         * Deletes all storeModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.storeModels.destroyAll = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::delete::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeModels#destroyById
         * @methodOf shoppinpal-loopback.UserModel.storeModels
         *
         * @description
         *
         * Delete a related item by id for storeModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for storeModels
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * This method returns no data.
         */
        R.storeModels.destroyById = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::destroyById::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeModels#findById
         * @methodOf shoppinpal-loopback.UserModel.storeModels
         *
         * @description
         *
         * Find a related item by id for storeModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for storeModels
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels.findById = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::findById::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.storeModels#updateById
         * @methodOf shoppinpal-loopback.UserModel.storeModels
         *
         * @description
         *
         * Update a related item by id for storeModels
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for storeModels
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
         *
         * @param {function(Object,Object)=} successCb
         *   Success callback with two arguments: `value`, `responseHeaders`.
         *
         * @param {function(Object)=} errorCb Error callback with one argument:
         *   `httpResponse`.
         *
         * @returns {Object} An empty reference that will be
         *   populated with the actual data once the response is returned
         *   from the server.
         *
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `StoreModel` object.)
         * </em>
         */
        R.storeModels.updateById = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::updateById::UserModel::storeModels"];
          return action.apply(R, arguments);
        };

    return R;
  }]);


module
  .factory('LoopBackAuth', function() {
    var props = ['accessTokenId', 'currentUserId'];
    var propsPrefix = '$LoopBack$';

    function LoopBackAuth() {
      var self = this;
      props.forEach(function(name) {
        self[name] = load(name);
      });
      this.rememberMe = undefined;
      this.currentUserData = null;
    }

    LoopBackAuth.prototype.save = function() {
      var self = this;
      var storage = this.rememberMe ? localStorage : sessionStorage;
      props.forEach(function(name) {
        save(storage, name, self[name]);
      });
    };

    LoopBackAuth.prototype.setUser = function(accessTokenId, userId, userData) {
      this.accessTokenId = accessTokenId;
      this.currentUserId = userId;
      this.currentUserData = userData;
    }

    LoopBackAuth.prototype.clearUser = function() {
      this.accessTokenId = null;
      this.currentUserId = null;
      this.currentUserData = null;
    }

    LoopBackAuth.prototype.clearStorage = function() {
      props.forEach(function(name) {
        save(sessionStorage, name, null);
        save(localStorage, name, null);
      });
    };

    return new LoopBackAuth();

    // Note: LocalStorage converts the value to string
    // We are using empty string as a marker for null/undefined values.
    function save(storage, name, value) {
      var key = propsPrefix + name;
      if (value == null) value = '';
      storage[key] = value;
    }

    function load(name) {
      var key = propsPrefix + name;
      return localStorage[key] || sessionStorage[key] || null;
    }
  })
  .config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('LoopBackAuthRequestInterceptor');
  }])
  .factory('LoopBackAuthRequestInterceptor', [ '$q', 'LoopBackAuth',
    function($q, LoopBackAuth) {
      return {
        'request': function(config) {

          // filter out non urlBase requests
          if (config.url.substr(0, urlBase.length) !== urlBase) {
            return config;
          }

          if (LoopBackAuth.accessTokenId) {
            config.headers[authHeader] = LoopBackAuth.accessTokenId;
          } else if (config.__isGetCurrentUser__) {
            // Return a stub 401 error for User.getCurrent() when
            // there is no user logged in
            var res = {
              body: { error: { status: 401 } },
              status: 401,
              config: config,
              headers: function() { return undefined; }
            };
            return $q.reject(res);
          }
          return config || $q.when(config);
        }
      }
    }])

  /**
   * @ngdoc object
   * @name shoppinpal-loopback.LoopBackResourceProvider
   * @header shoppinpal-loopback.LoopBackResourceProvider
   * @description
   * Use `LoopBackResourceProvider` to change the global configuration
   * settings used by all models. Note that the provider is available
   * to Configuration Blocks only, see
   * {@link https://docs.angularjs.org/guide/module#module-loading-dependencies Module Loading & Dependencies}
   * for more details.
   *
   * ## Example
   *
   * ```js
   * angular.module('app')
   *  .config(function(LoopBackResourceProvider) {
   *     LoopBackResourceProvider.setAuthHeader('X-Access-Token');
   *  });
   * ```
   */
  .provider('LoopBackResource', function LoopBackResourceProvider() {
    /**
     * @ngdoc method
     * @name shoppinpal-loopback.LoopBackResourceProvider#setAuthHeader
     * @methodOf shoppinpal-loopback.LoopBackResourceProvider
     * @param {string} header The header name to use, e.g. `X-Access-Token`
     * @description
     * Configure the REST transport to use a different header for sending
     * the authentication token. It is sent in the `Authorization` header
     * by default.
     */
    this.setAuthHeader = function(header) {
      authHeader = header;
    };

    /**
     * @ngdoc method
     * @name shoppinpal-loopback.LoopBackResourceProvider#setUrlBase
     * @methodOf shoppinpal-loopback.LoopBackResourceProvider
     * @param {string} url The URL to use, e.g. `/api` or `//example.com/api`.
     * @description
     * Change the URL of the REST API server. By default, the URL provided
     * to the code generator (`lb-ng` or `grunt-loopback-sdk-angular`) is used.
     */
    this.setUrlBase = function(url) {
      urlBase = url;
    };

    this.$get = ['$resource', function($resource) {
      return function(url, params, actions) {
        var resource = $resource(url, params, actions);

        // Angular always calls POST on $save()
        // This hack is based on
        // http://kirkbushell.me/angular-js-using-ng-resource-in-a-more-restful-manner/
        resource.prototype.$save = function(success, error) {
          // Fortunately, LoopBack provides a convenient `upsert` method
          // that exactly fits our needs.
          var result = resource.upsert.call(this, {}, this, success, error);
          return result.$promise || result;
        };
        return resource;
      };
    }];
  });

})(window, window.angular);
