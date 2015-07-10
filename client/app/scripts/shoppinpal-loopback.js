(function(window, angular, undefined) {'use strict';

var urlBase = "/api";
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
         * Find a related item by id for accessTokens.
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
          params: {
          'fk': '@fk'
          },
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
         * Delete a related item by id for accessTokens.
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
          params: {
          'fk': '@fk'
          },
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
         * Update a related item by id for accessTokens.
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
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/accessTokens/:fk",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__findById__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Find a related item by id for roles.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for roles
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
        "prototype$__findById__roles": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/roles/:fk",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__destroyById__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Delete a related item by id for roles.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for roles
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
        "prototype$__destroyById__roles": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/roles/:fk",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__updateById__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update a related item by id for roles.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for roles
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
        "prototype$__updateById__roles": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/roles/:fk",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__link__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Add a related item by id for roles.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for roles
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
        "prototype$__link__roles": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/roles/rel/:fk",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__unlink__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Remove the roles relation to an item by id.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for roles
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
        "prototype$__unlink__roles": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/roles/rel/:fk",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__exists__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Check the existence of roles relation to an item by id.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for roles
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
        "prototype$__exists__roles": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/roles/rel/:fk",
          method: "HEAD"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__findById__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Find a related item by id for teamModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for teamModels
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
        "prototype$__findById__teamModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/teamModels/:fk",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__destroyById__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Delete a related item by id for teamModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for teamModels
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
        "prototype$__destroyById__teamModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/teamModels/:fk",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__updateById__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Update a related item by id for teamModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for teamModels
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
        "prototype$__updateById__teamModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/teamModels/:fk",
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
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.destroyById() instead.
        "prototype$__destroyById__storeConfigModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.updateById() instead.
        "prototype$__updateById__storeConfigModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.storeModels.findById() instead.
        "prototype$__findById__storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.destroyById() instead.
        "prototype$__destroyById__storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeModels.updateById() instead.
        "prototype$__updateById__storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.reportModels.findById() instead.
        "prototype$__findById__reportModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/reportModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.reportModels.destroyById() instead.
        "prototype$__destroyById__reportModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/reportModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.reportModels.updateById() instead.
        "prototype$__updateById__reportModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/reportModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.findById() instead.
        "prototype$__findById__stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.destroyById() instead.
        "prototype$__destroyById__stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.updateById() instead.
        "prototype$__updateById__stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.supplierModels.findById() instead.
        "prototype$__findById__supplierModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/supplierModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.supplierModels.destroyById() instead.
        "prototype$__destroyById__supplierModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/supplierModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.supplierModels.updateById() instead.
        "prototype$__updateById__supplierModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/supplierModels/:fk",
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

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__get__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries roles of UserModel.
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
        "prototype$__get__roles": {
          isArray: true,
          url: urlBase + "/UserModels/:id/roles",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__create__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Creates a new instance in roles of this model.
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
        "prototype$__create__roles": {
          url: urlBase + "/UserModels/:id/roles",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__delete__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Deletes all roles of this model.
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
        "prototype$__delete__roles": {
          url: urlBase + "/UserModels/:id/roles",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__count__roles
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Counts roles of UserModel.
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
        "prototype$__count__roles": {
          url: urlBase + "/UserModels/:id/roles/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__get__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries teamModels of UserModel.
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
        "prototype$__get__teamModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/teamModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__create__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Creates a new instance in teamModels of this model.
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
        "prototype$__create__teamModels": {
          url: urlBase + "/UserModels/:id/teamModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__delete__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Deletes all teamModels of this model.
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
        "prototype$__delete__teamModels": {
          url: urlBase + "/UserModels/:id/teamModels",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#prototype$__count__teamModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Counts teamModels of UserModel.
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
        "prototype$__count__teamModels": {
          url: urlBase + "/UserModels/:id/teamModels/count",
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

        // INTERNAL. Use UserModel.reportModels() instead.
        "prototype$__get__reportModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/reportModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.reportModels.create() instead.
        "prototype$__create__reportModels": {
          url: urlBase + "/UserModels/:id/reportModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.reportModels.destroyAll() instead.
        "prototype$__delete__reportModels": {
          url: urlBase + "/UserModels/:id/reportModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.reportModels.count() instead.
        "prototype$__count__reportModels": {
          url: urlBase + "/UserModels/:id/reportModels/count",
          method: "GET"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels() instead.
        "prototype$__get__stockOrderLineitemModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.create() instead.
        "prototype$__create__stockOrderLineitemModels": {
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.destroyAll() instead.
        "prototype$__delete__stockOrderLineitemModels": {
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.count() instead.
        "prototype$__count__stockOrderLineitemModels": {
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/count",
          method: "GET"
        },

        // INTERNAL. Use UserModel.supplierModels() instead.
        "prototype$__get__supplierModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.supplierModels.create() instead.
        "prototype$__create__supplierModels": {
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.supplierModels.destroyAll() instead.
        "prototype$__delete__supplierModels": {
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.supplierModels.count() instead.
        "prototype$__count__supplierModels": {
          url: urlBase + "/UserModels/:id/supplierModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#create
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * @name shoppinpal-loopback.UserModel#createMany
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
        "createMany": {
          isArray: true,
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Check whether a model instance exists in the data source.
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
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Count instances of the model matched by where from the data source.
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
         * Update attributes for a model instance and persist it into the data source.
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
         * Login a user with username/email and password.
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

        // INTERNAL. Use ReportModel.userModel() instead.
        "::get::ReportModel::userModel": {
          url: urlBase + "/ReportModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StockOrderLineitemModel.userModel() instead.
        "::get::StockOrderLineitemModel::userModel": {
          url: urlBase + "/StockOrderLineitemModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use SupplierModel.userModel() instead.
        "::get::SupplierModel::userModel": {
          url: urlBase + "/SupplierModels/:id/userModel",
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Fetches hasOne relation globalConfigModels.
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
         * @name shoppinpal-loopback.UserModel.globalConfigModels#createMany
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
        R.globalConfigModels.createMany = function() {
          var TargetResource = $injector.get("GlobalConfigModel");
          var action = TargetResource["::createMany::UserModel::globalConfigModels"];
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
         * @name shoppinpal-loopback.UserModel.storeConfigModels#createMany
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
        R.storeConfigModels.createMany = function() {
          var TargetResource = $injector.get("StoreConfigModel");
          var action = TargetResource["::createMany::UserModel::storeConfigModels"];
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
         * Delete a related item by id for storeConfigModels.
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
         * Find a related item by id for storeConfigModels.
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
         * Update a related item by id for storeConfigModels.
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
         * @name shoppinpal-loopback.UserModel.storeModels#createMany
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
        R.storeModels.createMany = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::createMany::UserModel::storeModels"];
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
         * Delete a related item by id for storeModels.
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
         * Find a related item by id for storeModels.
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
         * Update a related item by id for storeModels.
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
    /**
     * @ngdoc object
     * @name lbServices.UserModel.reportModels
     * @header lbServices.UserModel.reportModels
     * @object
     * @description
     *
     * The object `UserModel.reportModels` groups methods
     * manipulating `ReportModel` instances related to `UserModel`.
     *
     * Call {@link lbServices.UserModel#reportModels UserModel.reportModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#reportModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries reportModels of UserModel.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R.reportModels = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::get::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#count
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Counts reportModels of UserModel.
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
        R.reportModels.count = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::count::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#create
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Creates a new instance in reportModels of this model.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R.reportModels.create = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::create::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#createMany
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Creates a new instance in reportModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R.reportModels.createMany = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::createMany::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#destroyAll
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Deletes all reportModels of this model.
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
        R.reportModels.destroyAll = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::delete::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#destroyById
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Delete a related item by id for reportModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for reportModels
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
        R.reportModels.destroyById = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::destroyById::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#findById
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Find a related item by id for reportModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for reportModels
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R.reportModels.findById = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::findById::UserModel::reportModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.reportModels#updateById
         * @methodOf shoppinpal-loopback.UserModel.reportModels
         *
         * @description
         *
         * Update a related item by id for reportModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for reportModels
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R.reportModels.updateById = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::updateById::UserModel::reportModels"];
          return action.apply(R, arguments);
        };
    /**
     * @ngdoc object
     * @name lbServices.UserModel.stockOrderLineitemModels
     * @header lbServices.UserModel.stockOrderLineitemModels
     * @object
     * @description
     *
     * The object `UserModel.stockOrderLineitemModels` groups methods
     * manipulating `StockOrderLineitemModel` instances related to `UserModel`.
     *
     * Call {@link lbServices.UserModel#stockOrderLineitemModels UserModel.stockOrderLineitemModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#stockOrderLineitemModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries stockOrderLineitemModels of UserModel.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::get::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#count
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Counts stockOrderLineitemModels of UserModel.
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
        R.stockOrderLineitemModels.count = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::count::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#create
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Creates a new instance in stockOrderLineitemModels of this model.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.create = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::create::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#createMany
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Creates a new instance in stockOrderLineitemModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.createMany = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::createMany::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#destroyAll
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Deletes all stockOrderLineitemModels of this model.
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
        R.stockOrderLineitemModels.destroyAll = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::delete::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#destroyById
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Delete a related item by id for stockOrderLineitemModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for stockOrderLineitemModels
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
        R.stockOrderLineitemModels.destroyById = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::destroyById::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#findById
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Find a related item by id for stockOrderLineitemModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for stockOrderLineitemModels
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.findById = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::findById::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.stockOrderLineitemModels#updateById
         * @methodOf shoppinpal-loopback.UserModel.stockOrderLineitemModels
         *
         * @description
         *
         * Update a related item by id for stockOrderLineitemModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for stockOrderLineitemModels
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.updateById = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::updateById::UserModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };
    /**
     * @ngdoc object
     * @name lbServices.UserModel.supplierModels
     * @header lbServices.UserModel.supplierModels
     * @object
     * @description
     *
     * The object `UserModel.supplierModels` groups methods
     * manipulating `SupplierModel` instances related to `UserModel`.
     *
     * Call {@link lbServices.UserModel#supplierModels UserModel.supplierModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel#supplierModels
         * @methodOf shoppinpal-loopback.UserModel
         *
         * @description
         *
         * Queries supplierModels of UserModel.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        R.supplierModels = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::get::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#count
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Counts supplierModels of UserModel.
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
        R.supplierModels.count = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::count::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#create
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Creates a new instance in supplierModels of this model.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        R.supplierModels.create = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::create::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#createMany
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Creates a new instance in supplierModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        R.supplierModels.createMany = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::createMany::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#destroyAll
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Deletes all supplierModels of this model.
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
        R.supplierModels.destroyAll = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::delete::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#destroyById
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Delete a related item by id for supplierModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for supplierModels
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
        R.supplierModels.destroyById = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::destroyById::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#findById
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Find a related item by id for supplierModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for supplierModels
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        R.supplierModels.findById = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::findById::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.UserModel.supplierModels#updateById
         * @methodOf shoppinpal-loopback.UserModel.supplierModels
         *
         * @description
         *
         * Update a related item by id for supplierModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - User id
         *
         *  - `fk` – `{*}` - Foreign key for supplierModels
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        R.supplierModels.updateById = function() {
          var TargetResource = $injector.get("SupplierModel");
          var action = TargetResource["::updateById::UserModel::supplierModels"];
          return action.apply(R, arguments);
        };

    return R;
  }]);

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
         * Create a new instance of the model and persist it into the data source.
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
         * @name shoppinpal-loopback.GlobalConfigModel#createMany
         * @methodOf shoppinpal-loopback.GlobalConfigModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
        "createMany": {
          isArray: true,
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Check whether a model instance exists in the data source.
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
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Count instances of the model matched by where from the data source.
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
         * Update attributes for a model instance and persist it into the data source.
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

        // INTERNAL. Use UserModel.globalConfigModels.createMany() instead.
        "::createMany::UserModel::globalConfigModels": {
          isArray: true,
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Fetches belongsTo relation userModel.
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

        // INTERNAL. Use StoreConfigModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/StoreConfigModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.findById() instead.
        "prototype$__findById__storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.destroyById() instead.
        "prototype$__destroyById__storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.updateById() instead.
        "prototype$__updateById__storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "PUT"
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
         * Create a new instance of the model and persist it into the data source.
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
         * @name shoppinpal-loopback.StoreConfigModel#createMany
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
        "createMany": {
          isArray: true,
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Check whether a model instance exists in the data source.
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
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Count instances of the model matched by where from the data source.
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
         * Update attributes for a model instance and persist it into the data source.
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

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#setDesiredStockLevelForVend
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
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
         *
         * @param {Object} postData Request data.
         *
         *  - `id` – `{number}` - 
         *
         *  - `outletId` – `{string}` - 
         *
         *  - `productId` – `{string}` - 
         *
         *  - `desiredStockLevel` – `{number}` - 
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
        "setDesiredStockLevelForVend": {
          url: urlBase + "/StoreConfigModels/:id/vend/product",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.storeConfigModels.findById() instead.
        "::findById::UserModel::storeConfigModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeConfigModels.destroyById() instead.
        "::destroyById::UserModel::storeConfigModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeConfigModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeConfigModels.updateById() instead.
        "::updateById::UserModel::storeConfigModels": {
          params: {
          'fk': '@fk'
          },
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

        // INTERNAL. Use UserModel.storeConfigModels.createMany() instead.
        "::createMany::UserModel::storeConfigModels": {
          isArray: true,
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

        // INTERNAL. Use StoreModel.storeConfigModel() instead.
        "::get::StoreModel::storeConfigModel": {
          url: urlBase + "/StoreModels/:id/storeConfigModel",
          method: "GET"
        },

        // INTERNAL. Use SupplierModel.storeConfigModel() instead.
        "::get::SupplierModel::storeConfigModel": {
          url: urlBase + "/SupplierModels/:id/storeConfigModel",
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Delete a model instance by id from the data source.
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
         * @ngdoc method
         * @name shoppinpal-loopback.StoreConfigModel#userModel
         * @methodOf shoppinpal-loopback.StoreConfigModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel.
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
         * @name shoppinpal-loopback.StoreConfigModel.storeModels#createMany
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
        R.storeModels.createMany = function() {
          var TargetResource = $injector.get("StoreModel");
          var action = TargetResource["::createMany::StoreConfigModel::storeModels"];
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
         * Delete a related item by id for storeModels.
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
         * Find a related item by id for storeModels.
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
         * Update a related item by id for storeModels.
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

        // INTERNAL. Use StoreModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/StoreModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StoreModel.storeConfigModel() instead.
        "prototype$__get__storeConfigModel": {
          url: urlBase + "/StoreModels/:id/storeConfigModel",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#create
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * @name shoppinpal-loopback.StoreModel#createMany
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
        "createMany": {
          isArray: true,
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
         * Update an existing model instance or insert a new one into the data source.
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
         * Check whether a model instance exists in the data source.
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
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Count instances of the model matched by where from the data source.
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
         * Update attributes for a model instance and persist it into the data source.
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

        // INTERNAL. Use UserModel.storeModels.findById() instead.
        "::findById::UserModel::storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.storeModels.destroyById() instead.
        "::destroyById::UserModel::storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.storeModels.updateById() instead.
        "::updateById::UserModel::storeModels": {
          params: {
          'fk': '@fk'
          },
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

        // INTERNAL. Use UserModel.storeModels.createMany() instead.
        "::createMany::UserModel::storeModels": {
          isArray: true,
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

        // INTERNAL. Use StoreConfigModel.storeModels.findById() instead.
        "::findById::StoreConfigModel::storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.destroyById() instead.
        "::destroyById::StoreConfigModel::storeModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/StoreConfigModels/:id/storeModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use StoreConfigModel.storeModels.updateById() instead.
        "::updateById::StoreConfigModel::storeModels": {
          params: {
          'fk': '@fk'
          },
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

        // INTERNAL. Use StoreConfigModel.storeModels.createMany() instead.
        "::createMany::StoreConfigModel::storeModels": {
          isArray: true,
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
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#updateOrCreate
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * Update instances of the model matched by where from the data source.
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
         * Delete a model instance by id from the data source.
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
         * Delete a model instance by id from the data source.
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
         * @name shoppinpal-loopback.StoreModel#userModel
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel.
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

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StoreModel#storeConfigModel
         * @methodOf shoppinpal-loopback.StoreModel
         *
         * @description
         *
         * Fetches belongsTo relation storeConfigModel.
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

    return R;
  }]);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.ReportModel
 * @header shoppinpal-loopback.ReportModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `ReportModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "ReportModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/ReportModels/:id",
      { 'id': '@id' },
      {

        // INTERNAL. Use ReportModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/ReportModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.findById() instead.
        "prototype$__findById__stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.destroyById() instead.
        "prototype$__destroyById__stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.updateById() instead.
        "prototype$__updateById__stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels() instead.
        "prototype$__get__stockOrderLineitemModels": {
          isArray: true,
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "GET"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.create() instead.
        "prototype$__create__stockOrderLineitemModels": {
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "POST"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.destroyAll() instead.
        "prototype$__delete__stockOrderLineitemModels": {
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "DELETE"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.count() instead.
        "prototype$__count__stockOrderLineitemModels": {
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#create
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/ReportModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#createMany
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "createMany": {
          isArray: true,
          url: urlBase + "/ReportModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#upsert
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/ReportModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#exists
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source.
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
          url: urlBase + "/ReportModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#findById
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/ReportModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#find
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/ReportModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#findOne
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/ReportModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#updateAll
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source.
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
          url: urlBase + "/ReportModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#deleteById
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
          url: urlBase + "/ReportModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#count
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source.
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
          url: urlBase + "/ReportModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/ReportModels/:id",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#getWorkerStatus
         * @methodOf shoppinpal-loopback.ReportModel
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
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "getWorkerStatus": {
          url: urlBase + "/ReportModels/:id/getWorkerStatus",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#generateStockOrderReportForManager
         * @methodOf shoppinpal-loopback.ReportModel
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
         * <em>
         * (The remote method definition does not provide any description.
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "generateStockOrderReportForManager": {
          url: urlBase + "/ReportModels/:id/generateStockOrderReportForManager",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#getRows
         * @methodOf shoppinpal-loopback.ReportModel
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        "getRows": {
          isArray: true,
          url: urlBase + "/ReportModels/:id/rows",
          method: "GET"
        },

        // INTERNAL. Use UserModel.reportModels.findById() instead.
        "::findById::UserModel::reportModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/reportModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.reportModels.destroyById() instead.
        "::destroyById::UserModel::reportModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/reportModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.reportModels.updateById() instead.
        "::updateById::UserModel::reportModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/reportModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.reportModels() instead.
        "::get::UserModel::reportModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/reportModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.reportModels.create() instead.
        "::create::UserModel::reportModels": {
          url: urlBase + "/UserModels/:id/reportModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.reportModels.createMany() instead.
        "::createMany::UserModel::reportModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/reportModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.reportModels.destroyAll() instead.
        "::delete::UserModel::reportModels": {
          url: urlBase + "/UserModels/:id/reportModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.reportModels.count() instead.
        "::count::UserModel::reportModels": {
          url: urlBase + "/UserModels/:id/reportModels/count",
          method: "GET"
        },

        // INTERNAL. Use StockOrderLineitemModel.reportModel() instead.
        "::get::StockOrderLineitemModel::reportModel": {
          url: urlBase + "/StockOrderLineitemModels/:id/reportModel",
          method: "GET"
        },
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#updateOrCreate
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#update
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source.
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
         * @name shoppinpal-loopback.ReportModel#destroyById
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
         * @name shoppinpal-loopback.ReportModel#removeById
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
    * @name shoppinpal-loopback.ReportModel#modelName
    * @propertyOf shoppinpal-loopback.ReportModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `ReportModel`.
    */
    R.modelName = "ReportModel";


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#userModel
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel.
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
          var action = TargetResource["::get::ReportModel::userModel"];
          return action.apply(R, arguments);
        };
    /**
     * @ngdoc object
     * @name lbServices.ReportModel.stockOrderLineitemModels
     * @header lbServices.ReportModel.stockOrderLineitemModels
     * @object
     * @description
     *
     * The object `ReportModel.stockOrderLineitemModels` groups methods
     * manipulating `StockOrderLineitemModel` instances related to `ReportModel`.
     *
     * Call {@link lbServices.ReportModel#stockOrderLineitemModels ReportModel.stockOrderLineitemModels()}
     * to query all related instances.
     */


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel#stockOrderLineitemModels
         * @methodOf shoppinpal-loopback.ReportModel
         *
         * @description
         *
         * Queries stockOrderLineitemModels of ReportModel.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::get::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#count
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Counts stockOrderLineitemModels of ReportModel.
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
        R.stockOrderLineitemModels.count = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::count::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#create
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Creates a new instance in stockOrderLineitemModels of this model.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.create = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::create::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#createMany
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Creates a new instance in stockOrderLineitemModels of this model.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         * @param {Object} postData Request data.
         *
         * This method expects a subset of model properties as request parameters.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.createMany = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::createMany::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#destroyAll
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Deletes all stockOrderLineitemModels of this model.
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
        R.stockOrderLineitemModels.destroyAll = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::delete::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#destroyById
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Delete a related item by id for stockOrderLineitemModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `fk` – `{*}` - Foreign key for stockOrderLineitemModels
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
        R.stockOrderLineitemModels.destroyById = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::destroyById::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#findById
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Find a related item by id for stockOrderLineitemModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `fk` – `{*}` - Foreign key for stockOrderLineitemModels
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.findById = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::findById::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.ReportModel.stockOrderLineitemModels#updateById
         * @methodOf shoppinpal-loopback.ReportModel.stockOrderLineitemModels
         *
         * @description
         *
         * Update a related item by id for stockOrderLineitemModels.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - PersistedModel id
         *
         *  - `fk` – `{*}` - Foreign key for stockOrderLineitemModels
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R.stockOrderLineitemModels.updateById = function() {
          var TargetResource = $injector.get("StockOrderLineitemModel");
          var action = TargetResource["::updateById::ReportModel::stockOrderLineitemModels"];
          return action.apply(R, arguments);
        };

    return R;
  }]);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.StockOrderLineitemModel
 * @header shoppinpal-loopback.StockOrderLineitemModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `StockOrderLineitemModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "StockOrderLineitemModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/StockOrderLineitemModels/:id",
      { 'id': '@id' },
      {

        // INTERNAL. Use StockOrderLineitemModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/StockOrderLineitemModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use StockOrderLineitemModel.reportModel() instead.
        "prototype$__get__reportModel": {
          url: urlBase + "/StockOrderLineitemModels/:id/reportModel",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#create
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/StockOrderLineitemModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#createMany
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "createMany": {
          isArray: true,
          url: urlBase + "/StockOrderLineitemModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#upsert
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/StockOrderLineitemModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#exists
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source.
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
          url: urlBase + "/StockOrderLineitemModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#findById
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/StockOrderLineitemModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#find
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/StockOrderLineitemModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#findOne
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/StockOrderLineitemModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#updateAll
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source.
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
          url: urlBase + "/StockOrderLineitemModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#deleteById
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
          url: urlBase + "/StockOrderLineitemModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#count
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source.
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
          url: urlBase + "/StockOrderLineitemModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/StockOrderLineitemModels/:id",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.findById() instead.
        "::findById::UserModel::stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.destroyById() instead.
        "::destroyById::UserModel::stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.updateById() instead.
        "::updateById::UserModel::stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels() instead.
        "::get::UserModel::stockOrderLineitemModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.create() instead.
        "::create::UserModel::stockOrderLineitemModels": {
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.createMany() instead.
        "::createMany::UserModel::stockOrderLineitemModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.destroyAll() instead.
        "::delete::UserModel::stockOrderLineitemModels": {
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.stockOrderLineitemModels.count() instead.
        "::count::UserModel::stockOrderLineitemModels": {
          url: urlBase + "/UserModels/:id/stockOrderLineitemModels/count",
          method: "GET"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.findById() instead.
        "::findById::ReportModel::stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.destroyById() instead.
        "::destroyById::ReportModel::stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.updateById() instead.
        "::updateById::ReportModel::stockOrderLineitemModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels() instead.
        "::get::ReportModel::stockOrderLineitemModels": {
          isArray: true,
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "GET"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.create() instead.
        "::create::ReportModel::stockOrderLineitemModels": {
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "POST"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.createMany() instead.
        "::createMany::ReportModel::stockOrderLineitemModels": {
          isArray: true,
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "POST"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.destroyAll() instead.
        "::delete::ReportModel::stockOrderLineitemModels": {
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels",
          method: "DELETE"
        },

        // INTERNAL. Use ReportModel.stockOrderLineitemModels.count() instead.
        "::count::ReportModel::stockOrderLineitemModels": {
          url: urlBase + "/ReportModels/:id/stockOrderLineitemModels/count",
          method: "GET"
        },
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#updateOrCreate
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * This usually means the response is a `StockOrderLineitemModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#update
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source.
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
         * @name shoppinpal-loopback.StockOrderLineitemModel#destroyById
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
         * @name shoppinpal-loopback.StockOrderLineitemModel#removeById
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
    * @name shoppinpal-loopback.StockOrderLineitemModel#modelName
    * @propertyOf shoppinpal-loopback.StockOrderLineitemModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `StockOrderLineitemModel`.
    */
    R.modelName = "StockOrderLineitemModel";


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#userModel
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel.
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
          var action = TargetResource["::get::StockOrderLineitemModel::userModel"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.StockOrderLineitemModel#reportModel
         * @methodOf shoppinpal-loopback.StockOrderLineitemModel
         *
         * @description
         *
         * Fetches belongsTo relation reportModel.
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
         * This usually means the response is a `ReportModel` object.)
         * </em>
         */
        R.reportModel = function() {
          var TargetResource = $injector.get("ReportModel");
          var action = TargetResource["::get::StockOrderLineitemModel::reportModel"];
          return action.apply(R, arguments);
        };

    return R;
  }]);

/**
 * @ngdoc object
 * @name shoppinpal-loopback.SupplierModel
 * @header shoppinpal-loopback.SupplierModel
 * @object
 *
 * @description
 *
 * A $resource object for interacting with the `SupplierModel` model.
 *
 * ## Example
 *
 * See
 * {@link http://docs.angularjs.org/api/ngResource.$resource#example $resource}
 * for an example of using this object.
 *
 */
module.factory(
  "SupplierModel",
  ['LoopBackResource', 'LoopBackAuth', '$injector', function(Resource, LoopBackAuth, $injector) {
    var R = Resource(
      urlBase + "/SupplierModels/:id",
      { 'id': '@id' },
      {

        // INTERNAL. Use SupplierModel.userModel() instead.
        "prototype$__get__userModel": {
          url: urlBase + "/SupplierModels/:id/userModel",
          method: "GET"
        },

        // INTERNAL. Use SupplierModel.storeConfigModel() instead.
        "prototype$__get__storeConfigModel": {
          url: urlBase + "/SupplierModels/:id/storeConfigModel",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#create
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "create": {
          url: urlBase + "/SupplierModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#createMany
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Create a new instance of the model and persist it into the data source.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "createMany": {
          isArray: true,
          url: urlBase + "/SupplierModels",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#upsert
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "upsert": {
          url: urlBase + "/SupplierModels",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#exists
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Check whether a model instance exists in the data source.
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
          url: urlBase + "/SupplierModels/:id/exists",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#findById
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Find a model instance by id from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `id` – `{*}` - Model id
         *
         *  - `filter` – `{object=}` - Filter defining fields and include
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "findById": {
          url: urlBase + "/SupplierModels/:id",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#find
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Find all instances of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "find": {
          isArray: true,
          url: urlBase + "/SupplierModels",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#findOne
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Find first instance of the model matched by filter from the data source.
         *
         * @param {Object=} parameters Request parameters.
         *
         *  - `filter` – `{object=}` - Filter defining fields, where, include, order, offset, and limit
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "findOne": {
          url: urlBase + "/SupplierModels/findOne",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#updateAll
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source.
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
          url: urlBase + "/SupplierModels/update",
          method: "POST"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#deleteById
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
          url: urlBase + "/SupplierModels/:id",
          method: "DELETE"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#count
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Count instances of the model matched by where from the data source.
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
          url: urlBase + "/SupplierModels/count",
          method: "GET"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#prototype$updateAttributes
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Update attributes for a model instance and persist it into the data source.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "prototype$updateAttributes": {
          url: urlBase + "/SupplierModels/:id",
          method: "PUT"
        },

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#listSuppliers
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * <em>
         * (The remote method definition does not provide any description.)
         * </em>
         *
         * @param {Object=} parameters Request parameters.
         *
         *   This method does not accept any parameters.
         *   Supply an empty object or omit this argument altogether.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        "listSuppliers": {
          isArray: true,
          url: urlBase + "/SupplierModels/listSuppliers",
          method: "GET"
        },

        // INTERNAL. Use UserModel.supplierModels.findById() instead.
        "::findById::UserModel::supplierModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/supplierModels/:fk",
          method: "GET"
        },

        // INTERNAL. Use UserModel.supplierModels.destroyById() instead.
        "::destroyById::UserModel::supplierModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/supplierModels/:fk",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.supplierModels.updateById() instead.
        "::updateById::UserModel::supplierModels": {
          params: {
          'fk': '@fk'
          },
          url: urlBase + "/UserModels/:id/supplierModels/:fk",
          method: "PUT"
        },

        // INTERNAL. Use UserModel.supplierModels() instead.
        "::get::UserModel::supplierModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "GET"
        },

        // INTERNAL. Use UserModel.supplierModels.create() instead.
        "::create::UserModel::supplierModels": {
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.supplierModels.createMany() instead.
        "::createMany::UserModel::supplierModels": {
          isArray: true,
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "POST"
        },

        // INTERNAL. Use UserModel.supplierModels.destroyAll() instead.
        "::delete::UserModel::supplierModels": {
          url: urlBase + "/UserModels/:id/supplierModels",
          method: "DELETE"
        },

        // INTERNAL. Use UserModel.supplierModels.count() instead.
        "::count::UserModel::supplierModels": {
          url: urlBase + "/UserModels/:id/supplierModels/count",
          method: "GET"
        },
      }
    );



        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#updateOrCreate
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Update an existing model instance or insert a new one into the data source.
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
         * This usually means the response is a `SupplierModel` object.)
         * </em>
         */
        R["updateOrCreate"] = R["upsert"];

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#update
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Update instances of the model matched by where from the data source.
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
         * @name shoppinpal-loopback.SupplierModel#destroyById
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
         * @name shoppinpal-loopback.SupplierModel#removeById
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Delete a model instance by id from the data source.
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
    * @name shoppinpal-loopback.SupplierModel#modelName
    * @propertyOf shoppinpal-loopback.SupplierModel
    * @description
    * The name of the model represented by this $resource,
    * i.e. `SupplierModel`.
    */
    R.modelName = "SupplierModel";


        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#userModel
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Fetches belongsTo relation userModel.
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
          var action = TargetResource["::get::SupplierModel::userModel"];
          return action.apply(R, arguments);
        };

        /**
         * @ngdoc method
         * @name shoppinpal-loopback.SupplierModel#storeConfigModel
         * @methodOf shoppinpal-loopback.SupplierModel
         *
         * @description
         *
         * Fetches belongsTo relation storeConfigModel.
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
          var action = TargetResource["::get::SupplierModel::storeConfigModel"];
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
