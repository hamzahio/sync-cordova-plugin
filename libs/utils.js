/**
 * Copyright (c) 2015 IBM Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 *
 */

var _ = require('cloudant-sync.underscore');

var lastTimestamp = 0;

exports.defineProperty = function(object, key, options) {
    if (Object.defineProperty) {
        Object.defineProperty(object, key, options);
    } else {
        if (options.writable) {
            object[key] = options.value;
        } else {
            object.__defineGetter__(key, function() {
                return options.value;
            });
        }
    }
};

exports.generateToken = function () {
    return checkTimestamp((new Date()).getTime());
};

// This checks if last timestamp used is the same as the one passed in.
// This function is used to ensure that 2 tokens are unique
function checkTimestamp(timestamp) {
    if (timestamp === lastTimestamp) {
        lastTimestamp++;
    } else {
        lastTimestamp = timestamp;
    }
    return lastTimestamp;
}
