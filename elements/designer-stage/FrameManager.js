/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

modulate('FrameManager', ['Path', 'Commands', 'DomCommandApplier'],
    function(pathLib, commands, commandApplier) {

  function FrameManager() {
    this.token = null;
    this.ownerWindow = null;
    this.currentElement = null;
    this.handlers = {
      'selectElement': this._onSelectElement.bind(this),
      'selectionChange': this._onSelectionChange.bind(this),
    };
    this.commandApplier = new commandApplier.DomCommandApplier(document);
  }

  FrameManager.prototype.listen = function(wnd) {
    wnd = wnd || window;
    wnd.addEventListener('message', (function(event) {
      var data = event.data;
      if (data.messageType == 'handshake') {
        // special case 'handshake' beause it needs access to event.source
        this._onHandshake(event);
      } else {
        var handler = this.handlers[data.messageType];
        if (handler == null) {
          throw new Error('Unknown message type: ' + data.messageType);
        }
        handler(data);
      }
    }).bind(this));
  };

  FrameManager.prototype._onHandshake = function(event) {
    if (this.token != null) {
      throw new Error('token already set');
    }
    this.ownerWindow = event.source;
    this.token = event.data.token;
  };

  FrameManager.prototype.updateBoundsMessage = function(element) {
    var bounds = element.getBoundingClientRect();
    return {
      messageType: 'selectionBoundsChange',
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
  };

  FrameManager.prototype.newSelectionMessage = function(element) {
    var style = window.getComputedStyle(element);
    return {
      messageType: 'newSelection',
      tagName: element.tagName,
      display: style.display,
      position: style.position,
    };
  };

  FrameManager.prototype.updateHoverMessage = function(element) {
    var bounds = element.getBoundingClientRect();
    return {
      messageType: 'hoverElement',
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
  };

  FrameManager.prototype.sendMessages = function(messages) {
    this.ownerWindow.postMessage({token: this.token, messages: messages}, '*');
  };

  FrameManager.prototype._onSelectElement = function(message) {
    console.log('FrameManager _onSelectElement');
    this.selectElement(message.x, message.y);
    this.sendMessages([
      this.updateBoundsMessage(this.currentElement),
      this.newSelectionMessage(this.currentElement)]);
    // this.sendUpdateSelection(this.currentElement, {newSelection: true});
  };

  FrameManager.prototype.selectElement = function(x, y) {
    this.currentElement = this.getElementAt(x, y);
    console.log('FrameManager selectElement', this.currentElement);
  };

  FrameManager.prototype.getElementAt = function(x, y) {
    var el = document.elementFromPoint(x, y);
    var lastLightCandidate = el;
    while (el != null) {
      if (el.lightParent instanceof DocumentFragment) {
        // reset our search
        lastLightCandidate = null;
      } else if (el.lightParent == null) {
        // now at a top-level host, return the candidate
        if (lastLightCandidate == null) {
          lastLightCandidate = el;
        }
        break;
      } else {
        lastLightCandidate = el;
      }
      el = el.parentNode;
    }
    return lastLightCandidate;
  };

  FrameManager.prototype._onSelectionChange = function(message) {
    var command = this.resizeElement(message.bounds);
    // TODO: This isn't quite right, we need to exclude the current element
    // when looking for a hover element. We need either 
    // 1) Document.elementsFromPoint() (being added to Chrome, in progress)
    // 2) Remove the current element, then call document.elementFromPoint()
    // 3) Custom hit testing
    var hoverElement = this.getElementAt(message.cursor.x, message.cursor.y);
    this.sendMessages([
      this.updateBoundsMessage(this.currentElement),
      this.updateHoverMessage(hoverElement),
      command]);
    // this.sendUpdateSelection(this.currentElement, {hoverElement: hoverElement});
  };

  FrameManager.prototype.resizeElement = function(bounds) {
    // TODO: explicitly support more display/position modes than block/absolute
    if (this.currentElement == null) {
      throw new Error('current element is null');
    }
    // Setting the style attribute isn't ideal for this operation - we'd
    // rather set style properties on the element's style, but setAttribtue
    // is a rather easy command to implement, so we'l use it for now
    // TODO: Send all commands to the editor as well so that it can apply
    // them to it's document model
    var element = this.currentElement;
    var path = pathLib.getNodePath(element);
    var command = commands.setAttribute(path, 'style',
      element.getAttribute('style'),
      `top: ${bounds.top}px; ` + 
      `left: ${bounds.left}px; ` +
      `height: ${bounds.height}px; ` +
      `width: ${bounds.width}px;`);
    this.commandApplier.apply(command);
    return command;
  };

  return {
    FrameManager: FrameManager,
  };
});
