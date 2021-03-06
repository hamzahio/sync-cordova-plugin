/*
 * Copyright (c) 2015 IBM Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND,either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 */

var exec = require('cordova/exec');
var Q = require('cloudant-sync.q');
var _ = require('cloudant-sync.lodash_funcs');
var utils = require('cloudant-sync.utils');

/**
 * @class DatastoreManager
 * @description <pre><code>var DatastoreManager =
 *  require('cloudant-sync.DatastoreManager')</code></pre>
 * @classdesc The {@link DatastoreManager} module is an interface for managing
 *  a set of {@link Datastore} objects.
 */

/**
* @description Creates a datastore manager object
* @param options {Object} options to use when creating the DatastoreManager
*  this only supports the `path` option which is the location where datastores
*  should be placed on disk.
* @param callback {Function} a function to call on completion, it should match
*  the signature: function ( err, datastoreManager)
*
* @return  A [q style promise]{@link https://github.com/kriskowal/q} returning
* either a {@link Datastore} or an Error.
*/
exports.DatastoreManager = function(options, callback) {

  var dsm = new DatastoreManager(options);
  var defered = Q.defer();

  function successHandler(response) {
    dsm.dsmID = response.id;
    defered.resolve(dsm);
  }

  function errorHandler(error) {
    defered.reject(error);
  }

  exec(successHandler, errorHandler, 'CloudantSync', 'createDatastoreManager',
        [dsm.path]);

  defered.promise.nodeify(callback);
  return defered.promise;

};

/**
 * @summary Creates a DatastoreManager object
 * @constructor
 * @param {Object} options to use when creating the datastore.
 *
 */
function DatastoreManager(options) {

  if (options === undefined) {
    options = {};
  }

  if (options.path !== undefined   && !_.isString(options.path)) {
    throw new Error('path option must be a string');
  } else if (options.path === undefined) {
    options.path = cordova.file.dataDirectory;

    if (options.path.indexOf('/', options.path.length - 1) === -1) {
      options.path = options.path + '/';
    }

    options.path = options.path + 'CloudantSync';
  }

  // If the path starts with file:// strip it.
  if (options.path.indexOf('file://') !== -1) {
    options.path = options.path.substring(7);
  }

  this.path = options.path;

}

/**
 * @summary Opens a {@link Datastore}.
 * @description If there is no existing {@link Datastore} with the given name
 * on disk then one will be created.
 * If an encryptionOptions object is supplied, the {@link Datastore} will be
 *  encrypted.
 *
 * @function DatastoreManager#openDatastore
 * @param {String} name - The name of the {@link Datastore} to open
 * @param {DatastoreManager~openDatastoreCallback} [callback] - The function to
 *  call after attempting to open the Datastore.
 *
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either a {@link Datastore} or an Error.
 *
 */
DatastoreManager.prototype.openDatastore =
function(name, callback) {
  if (_.isEmpty(name)) {
    throw new Error('name must exist');
  }

  if (!_.isString(name)) {
    throw new Error('name must be a String');
  }

  if (typeof encryptionOptions === 'function') {
    // No encryption options specified
    callback = encryptionOptions;
    encryptionOptions = {
      password: null,
      identifier: null,
    };
  }


  var deferred = Q.defer();

  function successHandler(response) {
    var store = new Datastore(response.name);
    deferred.resolve(store);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'openDatastore',
      [this.dsmID,
          name,]
  );

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 *
 * @summary Deletes a {@link Datastore}
 * @description Deletes a {@link Datastore}'s files from disk; data replicated
 *  to remote databases is not affected.
 *
 * @function DatastoreManager#deleteDatastore
 * @param {String} name The name of the {@link Datastore} to delete
 * @param {DatastoreManager~deleteDatastoreCallback} [callback] The function t
 * call after attempting to delete the {@link Datastore}.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which
 * returns successfully or with Error.
 *
 */
DatastoreManager.prototype.deleteDatastore = function(name, callback) {
  if (_.isEmpty(name)) {
    throw new Error('name must exist');
  }

  if (!_.isString(name)) {
    throw new Error('name must be a String');
  }

  var deferred = Q.defer();

  function successHandler() {
    deferred.resolve();
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'deleteDatastore',
    [this.dsmID, name]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @class Datastore
 * @classdesc The {@link Datastore} prototype is a common interface for create,
 *  read, update and delete (CRUD)
 * operations for within Cloudant Sync.
 * @property {String} name - The {@link Datastore} name (readonly)
 *
 * @description <strong>Should not be called by user; Use
 * {@link DatastoreManager#openDatastore} to get {@link Datastore} objects
 * </strong>
 */
function Datastore(name) {
  if (Object.defineProperty) {
    Object.defineProperty(this, 'name', {
      value: name,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  } else {
    this.__defineGetter__('name', function() {
      return name;
    });
  }
}

exports.Datastore = Datastore;


/**
 * @summary Closes the datastore and releases native resources.
 *
 * @description Closes the datastore and releases native resources, once closed
 * a datastore can not be reused.
 *
 * Note that on iOS, calls to close are always considered successful.
 *
 * @param {Datastore~closeCallback} [callback] function to call after the
 * datastore has been closed.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q}.
 */
Datastore.prototype.close = function(callback) {
  var defer = Q.defer();

  function success() {
    defer.resolve();
  }

  function failed(err) {
    defer.reject(err);
  }


  exec(success , failed, 'CloudantSync', 'closeDatastore', [this.name]);

  defer.promise.nodeify(callback);
  return defer.promise;


};

/**
 * @summary Adds a new document with body and attachments from revision.
 * @description If '_id' in the revision is null or undefined, the document's
 * '_id' will be auto-generated
 * and can be found by inspecting the returned document revision.
 *
 * @param {Object} documentRevision - The JSON document revision to create.
 * @param {Datastore~createDocumentFromRevisionCallback} [callback] -
 * The function to call after attempting to create the document.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the saved document revision or an Error.
 */
Datastore.prototype.createDocumentFromRevision =
function(documentRevision, callback) {
  validateDbName(this.name);
  validateDocumentRevision(documentRevision);

  return createOrUpdateDocumentFromRevision({
      dbName:           this.name,
      documentRevision: documentRevision,
      callback:         callback,
      isCreate:         true,});
};

/**
 * @summary Updates a document that exists in the datastore with body and
 * attachments from revision.
 * @description documentRevision must be a current revision for this document.
 *
 * @param {Object} documentRevision - The document revision to update.
 * @param {Datastore~updateDocumentFromRevisionCallback} [callback] - The
 * function to call after attempting to update the document.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the saved document revision or an Error.
 */
Datastore.prototype.updateDocumentFromRevision =
    function(documentRevision, callback) {
  validateDbName(this.name);
  validateDocumentRevision(documentRevision);

  // Additional check on documentRevision when updating.
  if (_.isEmpty(documentRevision._id) || _.isEmpty(documentRevision._rev)) {
    throw new Error('documentRevision must have \'_id\' and \'_rev\' fields');
  }

  return createOrUpdateDocumentFromRevision({
      dbName:           this.name,
      documentRevision: documentRevision,
      callback:         callback,
      isCreate:         false,});
};

/**
 * @summary Retrieves the current winning revision of a document.
 * @description Previously deleted documents can be retrieved via tombstones.
 *
 * @param {String} documentId - The id of the document to fetch.
 * @param {Datastore~getDocumentCallback} [callback] - The function to call
 * after attempting to fetch the document.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the retrieved document revision or an Error.
 */
Datastore.prototype.getDocument = function(documentId, callback) {
  validateDocumentId(documentId);

  var deferred = Q.defer();

  function successHandler(fetchedRevision) {
    deferred.resolve(fetchedRevision);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'getDocument',
      [this.name, documentId]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Deletes a document from the datastore.
 * @description This operation leaves a "tombstone" for the deleted document so
 * that future replication operations
 * can successfully replicate the deletion. If the input revision is already
 * deleted, nothing
 * will be changed.
 *
 * @param {Object} documentRevision - The document revision to delete.
 * @param {Datastore~deleteDocumentFromRevisionCallback} [callback] - The
 * function to call after attempting to delete the document.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the deleted document revision or an Error.
 */
Datastore.prototype.deleteDocumentFromRevision =
function(documentRevision, callback) {
  if (_.isEmpty(documentRevision)) {
    throw new Error('documentRevision must exist');
  }

  if (!_.isObject(documentRevision) || _.isArray(documentRevision) ||
      _.isFunction(documentRevision)) {
    throw new Error('documentRevision must be an Object');
  }

  var docId = documentRevision._id;
  var rev = documentRevision._rev;

  var errorMessage = null;
  if (!rev || !docId) {
    errorMessage = 'A _id and _rev is required to delete.';
  }

  var deferred = Q.defer();

  function successHandler(deletedDocumentInfo) {
    deferred.resolve(deletedDocumentInfo);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  if (!errorMessage) {
    exec(successHandler,
        errorHandler,
        'CloudantSync',
        'deleteDocumentFromRevision',
        [this.name, documentRevision]);
  } else {
    deferred.reject(new Error(errorMessage));
  }

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Add a single, possibly compound, index for the given field names.
 *
 * @param {String} indexName - The name of the index.
 * @param {Array} fields - The list of fields to index.
 * @param {Datastore~ensureIndexedCallback} [callback] - The function to call
 * after attempting to create the index.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the created index name or an Error.
 */
Datastore.prototype.ensureIndexed = function(fieldNames, indexName, callback) {
  if (_.isEmpty(indexName) || _.isEmpty(fieldNames)) {
    throw new Error('indexName and fieldNames must exist');
  }

  if (!_.isString(indexName)) {
    throw new Error('indexName must be a String');
  }

  if (!_.isArray(fieldNames)) {
    throw new Error('fieldNames must be an array');
  }

  var deferred = Q.defer();

  function successHandler(result) {
    deferred.resolve(result);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'ensureIndexed',
      [this.name, indexName, fieldNames]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Deletes an index.
 *
 * @param {String} indexName - The name of the index to delete.
 * @param {Datastore~deleteIndexNamedCallback} [callback] - The function to call
 * after attempting to delete the index.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the deletion status [true|false] or an Error.
 */
Datastore.prototype.deleteIndexNamed = function(indexName, callback) {
  if (_.isEmpty(indexName)) {
    throw new Error('indexName must exist');
  }

  if (!_.isString(indexName)) {
    throw new Error('indexName must be a String');
  }

  var deferred = Q.defer();

  function successHandler(result) {
    deferred.resolve(result);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'deleteIndexNamed',
      [this.name, indexName]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Performs a query
 *
 * @param {Object} query - The query to execute.
 * @param {Datastore~findCallback} [callback] - The function to call after
 * attempting to perform a query.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either an Array of the query results or an Error.
 */
Datastore.prototype.find = function(query, callback) {
  if (_.isEmpty(query)) {
    throw new Error('query must exist');
  }

  if (!_.isObject(query) || _.isArray(query) || _.isFunction(query)) {
    throw new Error('query must be an Object');
  }

  if (!query.selector) {
    throw new Error('A selector is required to query');
  }

  var deferred = Q.defer();

  function successHandler(results) {
    deferred.resolve(results);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'find',
      [this.name, query]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Gets all document ids in the datastore that have conflicts
 * in their revision tree.
 *
 * @param {Datastore~getConflictedDocumentIdsCallback} [callback] - The function
 *  to call after attempting to get the conflicted document IDs.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either an Array of the document IDs or an Error.
 */
Datastore.prototype.getConflictedDocumentIds = function(callback) {
  var deferred = Q.defer();

  function successHandler(results) {
    deferred.resolve(results);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'getConflictedDocumentIds',
      [this.name]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Resolve conflicts for specified Document using the given
 * 'conflictResolver'.
 * @param {String} documentId - The id of the document whose conflicts we
 * want to resolve.
 * @param {Datastore~resolveConflictsCallback} [conflictResolver] - The function
 *  to call to resolve conflicts.
 * @param {Datastore~resolveConflictsForDocumentCallback} [callback] - The
 * function to call after attempting to resolve conflicts.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either an Array of the query results or an Error.
 */
Datastore.prototype.resolveConflictsForDocument =
function(documentId, conflictResolver, callback) {
  validateDocumentId(documentId);

  if (!_.isFunction(conflictResolver)) {
    throw new Error('conflictResolver must be a function');
  }

  var deferred = Q.defer();
  var firstCall = true;

  function successHandler(results) {
    if (firstCall && _.isObject(results)) {
      var docId = results['docId'];
      var conflicts = results['conflicts'];
      var resolverId = results['resolverId'];
      var conflictResult = conflictResolver(docId, conflicts);
      returnResolvedDocument(conflictResult, resolverId, null);
      firstCall = false;
    } else {
      deferred.resolve(results);
    }
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'resolveConflictsForDocument',
      [this.name, documentId]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Passes the resolved document back to the native code.
 * @param {Object} documentRevision - The resolved document revision.
 * @param {String} resolverId - The unique string that identifies the
 * conflict resolver we want to pass the result to in the native code.
 * @param {Datastore~returnResolvedDocumentCallback} [callback] - The function
 * to call after passing the resolved document back to the native code.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either an Array of the query results or an Error.
 */
function returnResolvedDocument(documentRevision, resolverId, callback) {
  if (documentRevision) {
    validateDocumentRevision(documentRevision);
  }

  var deferred = Q.defer();

  function successHandler(results) {
    deferred.resolve(results);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'returnResolvedDocument',
      [documentRevision, resolverId]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

// Internal Functions

/**
 * @private
 * @summary Checks the given 'dbName' is defined and is a string.
 * @param {type} dbName - the value to check
 * @throws {Error} if the given 'dbName' is undefined or not a String.
 */
function validateDbName(dbName) {
  if (_.isEmpty(dbName)) {
    throw new Error('dbName must exist');
  }

  if (!_.isString(dbName)) {
    throw new Error('dbName must be a String');
  }
}

/**
 * @private
 * @summary Checks various attributes of the given 'documentRevision' to ensure
 * it appears to be a valid document revision.
 * @param {type} documentRevision - the 'documentRevision' to check.
 * @throws {Error} containing details of the problem if the validity checks
 * fail.
 */
function validateDocumentRevision(documentRevision) {
  if (!documentRevision) {
    throw new Error('documentRevision must exist');
  }

  if (!_.isObject(documentRevision) ||
   _.isArray(documentRevision) ||
   _.isFunction(documentRevision)) {
    throw new Error('documentRevision must be an Object');
  }

  var docId = documentRevision._id || null;
  var rev = documentRevision._rev || null;

  if (rev && !docId) {
    throw new Error('\'_id\' is required if \'_rev\' is specified.');
  }

  if (documentRevision._attachments) {
    var attachments = documentRevision._attachments;
    if (_.isEmpty(attachments)) {
      throw new Error(
          'documentRevision contained invalid attachments.  _attachments' +
          ' had no body'
      );
    }

    for (var attachmentName in attachments) {
      var attachment = attachments[attachmentName];
      if (_.isEmpty(attachment)) {
        throw new Error(
            'documentRevision contained invalid attachment.  ' +
            attachmentName + ' had no body');
      }

      if (_.isEmpty(attachment.data)) {
        throw new Error(
            'documentRevision contained invalid attachment.  ' +
            attachmentName + ' had no data');
      }

      if (_.isEmpty(attachment.content_type)) {
        throw new Error(
            'documentRevision contained invalid attachment.  ' +
            attachmentName + ' had no content_type');
      }
    }
  }
}

/**
 * @private
 * @summary Checks the given 'documentId' is defined and is a string.
 * @param {type} documentId - the value to check
 * @throws {Error} if the given 'documentId' is undefined or not a String.
 */
function validateDocumentId(documentId) {
  if (_.isEmpty(documentId)) {
    throw new Error('documentId must exist');
  }

  if (!_.isString(documentId)) {
    throw new Error('documentId must be a String');
  }
}

/**
 * Creates or updates a document in the Datastore.
 *
 * @private
 * @param {Object} args
 * @param {String} args.dbName - The name of the opened Datastore.
 * @param {String} args.documentRevision - The DocumentRevision to create or
 * update.
 * @param {Datastore~createDocumentFromRevisionCallback |
 *  Datastore~updateDocumentFromRevisionCallback} [args.callback] - The function
 * to call after attempting to create/update the document.
 * @param {boolean} args.isCreate - if true, indicates we are creating a
 * document and if false, indicates we are updating a document.
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the saved document revision or an Error.
 */
function createOrUpdateDocumentFromRevision(args) {

  var deferred = Q.defer();

  function successHandler(result) {
    deferred.resolve(result);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
       errorHandler,
       'CloudantSync',
       'createOrUpdateDocumentFromRevision',
       [args.dbName, args.documentRevision, args.isCreate]);

  deferred.promise.nodeify(args.callback);
  return deferred.promise;
}

// Callback TypeDefs

/**
 * @callback DatastoreManager~openDatastoreCallback
 * @param {?Error} error
 * @param {Datastore} datastore - The opened Datastore object.
 */

/**
 * @callback DatastoreManager~deleteDatastoreCallback
 * @param {?Error} error
 */

/**
 * @callback Datastore~createDocumentFromRevisionCallback
 * @param {?Error} error
 * @param {Object} documentRevision - The saved document revision.
 */

/**
 * @callback Datastore~updateDocumentFromRevisionCallback
 * @param {?Error} error
 * @param {Object} documentRevision - The saved document revision.
 */

/**
 * @callback Datastore~getDocumentCallback
 * @param {?Error} error
 * @param {Object} documentRevision - The retrieved document revision.
 */

/**
 * @callback Datastore~deleteDocumentFromRevisionCallback
 * @param {?Error} error
 * @param {Object} documentRevision - The deleted document revision.
 */

/**
 * @callback Datastore~ensureIndexedCallback
 * @param {?Error} error
 * @param {String} indexName - The name of the created index.
 */

/**
 * @callback Datastore~deleteIndexNamedCallback
 * @param {?Error} error
 * @param {Boolean} status - The deletion status.
 */

/**
 * @callback Datastore~findCallback
 * @param {?Error} error
 * @param {Array} results - The query results.
 */

/**
 * @callback Datastore~closeCallback
 * @param {?Error} error
 */

/**
 * @callback Datastore~getConflictedDocumentIdsCallback
 * @param {?Error} error
 * @param {Array} docIds - All document IDs in the datastore that have conflicts
 * in their revision tree.
 */

/**
 * @callback Datastore~resolveConflictsCallback
 * @param {String} docId - the ID of the Document with conflicts.
 * @param {Array} documentRevisions - array of conflicted document revisions,
 * including the current winner.
 * @returns {Object} the new winning document revision, or `nil` if the document
 * should be left as it currently is (i.e., leave the database unchanged).
 */

/**
 * @callback Datastore~resolveConflictsForDocumentCallback
 * @param {?Error} error
 */

/**
 * @callback Datastore~returnResolvedDocumentCallback
 * @param {?Error} error
 */
