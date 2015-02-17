"use strict";

var utils = require('../utils'),
    Collection = require('index');

/**
 * Manage A Vertex
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Vertex = module.exports = utils.extend(Collection);
