'use strict';

/**
 * @ngdoc filter
 * @name shoppinPalApp.filter:groupBy
 * @function
 * @description
 * # groupBy
 * Filter in the shoppinPalApp.
 */
// angular.module('shoppinPalApp')
//   .filter('groupBy', function () {
//     return function (input) {
//       return 'groupBy filter: ' + input;
//     };
//   });

angular.module('ShoppinPalApp')
  .filter('groupBy', ['$parse', function ($parse) {
    return function (list, groupBy) {

      var filtered = [];
      var prevItem = null;
      var groupChanged = false;
      // this is a new field which is added to each item where we append "_CHANGED"
      // to indicate a field change in the list
      //was var newField = groupBy + '_CHANGED'; - JB 12/17/2013
      var newField = 'group_by_CHANGED';

      // loop through each item in the list
      angular.forEach(list, function (item) {

        groupChanged = false;

        // if not the first item
        if (prevItem !== null) {

          // check if any of the group by field changed

          //force groupBy into Array
          groupBy = angular.isArray(groupBy) ? groupBy : [groupBy];

          //check each group by parameter
          for (var i = 0, len = groupBy.length; i < len; i++) {
            if ($parse(groupBy[i])(prevItem) !== $parse(groupBy[i])(item)) {
              groupChanged = true;
            }
          }


        }// otherwise we have the first item in the list which is new
        else {
          groupChanged = true;
        }

        // if the group changed, then add a new field to the item
        // to indicate this
        if (groupChanged) {
          item[newField] = true;
        } else {
          item[newField] = false;
        }

        filtered.push(item);
        prevItem = item;

      });

      return filtered;
    };
  }]);
