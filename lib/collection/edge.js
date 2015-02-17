"use strict";

var utils = require('../utils'),
    Collection = require('index');

/**
 * Manage An Edge
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Edge = module.exports = utils.extend(Collection);
