/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

define('polymer-designer/protocol/DocumentClient', function() {
  'use strict';

  class DocumentClient {

    constructor(connection) {
      console.assert(connection != null);
      this.connection = connection;
      // this.nodeRegistry = new node_registry.DomNodeRegistry();
      this.nodes = new Map();
    }

    /**
     * Returns a node descriptor that represents a live document node.
     */
    getNodeInfo(id) {
      return this.nodes.get(id);
    }

    getDocument() {
      return this.connection.request({
        messageType: 'getDocument',
      });
    }

    /**
     * @returns {Promise}
     */
    sendCommand(command) {
      return this.connection.request({
        messageType: 'command',
        command: command,
      });
    }

    /**
     * @param x {number}
     * @param y {number}
     * @returns {Promise}
     */
    selectElementAtPoint(x, y) {
      return this.connection.request({
        messageType: 'selectElementAtPoint',
        x: x,
        y: y,
      }).then(function(response) {
        let id = response.elementInfo.id;
        this.nodes.set(id, response);
        return response;
      }.bind(this));
    }

    /**
     * @returns {Promise}
     */
    getElementsAtPoint(x, y) {
      return this.connection.request({
        messageType: 'getElementsAtPoint',
        x: x,
        y: y,
      }).then(function(response) {
        let elements = response.elements;
        for (let i in elements) {
          let element = elements[i];
          let id = element.elementInfo.id;
          this.nodes.set(id, element);
        }
        return response;
      }.bind(this));
    }

    /**
     * @returns {Promise}
     */
    selectElementAtPath(path) {
      return this.connection.request({
        messageType: 'selectElementAtPath',
        path: path,
      });
    }

    /**
     * @returns {Promise}
     */
     selectionBoundsChanged(bounds, cursor) {
      return this.connection.request({
        messageType: 'selectionBoundsChanged',
        bounds: bounds,
        cursor: cursor,
      });
    }

    getCaretPosition(x, y) {
      return this.connection.request({
        messageType: 'getCaretPosition',
        x: x,
        y: y,
      });
    }

    moveCursor(move) {
      return this.connection.request({
        messageType: 'moveCursor',
        move: move,
      });
    }

    insertText(text) {
      return this.connection.request({
        messageType: 'insertText',
        text: text,
      });
    }

  }

  return DocumentClient;

});
