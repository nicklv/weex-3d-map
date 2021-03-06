/**
 * @fileOverview
 * Virtual-DOM Element.
 */

import '../../shared/objectAssign'
import Node from './node'
import {
  getDoc,
  getListener,
  uniqueId,
  linkParent,
  nextElement,
  previousElement,
  insertIndex,
  moveIndex,
  removeIndex
} from './operation'

const DEFAULT_TAG_NAME = 'div'

export default function Element (type = DEFAULT_TAG_NAME, props) {
  props = props || {}
  this.nodeType = 1
  this.nodeId = uniqueId()
  this.ref = this.nodeId
  this.type = type
  this.attr = props.attr || {}
  this.style = props.style || {}
  this.classStyle = props.classStyle || {}
  this.event = {}
  this.children = []
  this.pureChildren = []
}

Element.prototype = Object.create(Node.prototype)
Element.prototype.constructor = Element

function registerNode (docId, node) {
  const doc = getDoc(docId)
  doc.nodeMap[node.nodeId] = node
}

Object.assign(Element.prototype, {
  /**
   * Append a child node.
   * @param {object} node
   * @return {undefined | number} the signal sent by native
   */
  appendChild (node) {
    if (node.parentNode && node.parentNode !== this) {
      return
    }
    /* istanbul ignore else */
    if (!node.parentNode) {
      linkParent(node, this)
      insertIndex(node, this.children, this.children.length, true)
      if (this.docId) {
        registerNode(this.docId, node)
      }
      if (node.nodeType === 1) {
        insertIndex(node, this.pureChildren, this.pureChildren.length)
        const listener = getListener(this.docId)
        if (listener) {
          return listener.addElement(node, this.ref, -1)
        }
      }
    }
    else {
      moveIndex(node, this.children, this.children.length, true)
      if (node.nodeType === 1) {
        const index = moveIndex(node, this.pureChildren, this.pureChildren.length)
        const listener = getListener(this.docId)
        if (listener && index >= 0) {
          return listener.moveElement(node.ref, this.ref, index)
        }
      }
    }
  },

  /**
   * Insert a node before specified node.
   * @param {object} node
   * @param {object} before
   * @return {undefined | number} the signal sent by native
   */
  insertBefore (node, before) {
    if (node.parentNode && node.parentNode !== this) {
      return
    }
    if (node === before || (node.nextSibling && node.nextSibling === before)) {
      return
    }
    if (!node.parentNode) {
      linkParent(node, this)
      insertIndex(node, this.children, this.children.indexOf(before), true)
      if (this.docId) {
        registerNode(this.docId, node)
      }
      if (node.nodeType === 1) {
        const pureBefore = nextElement(before)
        const index = insertIndex(
          node,
          this.pureChildren,
          pureBefore
          ? this.pureChildren.indexOf(pureBefore)
          : this.pureChildren.length
        )
        const listener = getListener(this.docId)
        if (listener) {
          return listener.addElement(node, this.ref, index)
        }
      }
    }
    else {
      moveIndex(node, this.children, this.children.indexOf(before), true)
      if (node.nodeType === 1) {
        const pureBefore = nextElement(before)
        const index = moveIndex(
          node,
          this.pureChildren,
          pureBefore
          ? this.pureChildren.indexOf(pureBefore)
          : this.pureChildren.length
        )
        const listener = getListener(this.docId)
        if (listener && index >= 0) {
          return listener.moveElement(node.ref, this.ref, index)
        }
      }
    }
  },

  /**
   * Insert a node after specified node.
   * @param {object} node
   * @param {object} after
   * @return {undefined | number} the signal sent by native
   */
  insertAfter (node, after) {
    if (node.parentNode && node.parentNode !== this) {
      return
    }
    if (node === after || (node.previousSibling && node.previousSibling === after)) {
      return
    }
    if (!node.parentNode) {
      linkParent(node, this)
      insertIndex(node, this.children, this.children.indexOf(after) + 1, true)
      /* istanbul ignore else */
      if (this.docId) {
        registerNode(this.docId, node)
      }
      if (node.nodeType === 1) {
        const index = insertIndex(
          node,
          this.pureChildren,
          this.pureChildren.indexOf(previousElement(after)) + 1
        )
        const listener = getListener(this.docId)
        /* istanbul ignore else */
        if (listener) {
          return listener.addElement(node, this.ref, index)
        }
      }
    }
    else {
      moveIndex(node, this.children, this.children.indexOf(after) + 1, true)
      if (node.nodeType === 1) {
        const index = moveIndex(
          node,
          this.pureChildren,
          this.pureChildren.indexOf(previousElement(after)) + 1
        )
        const listener = getListener(this.docId)
        if (listener && index >= 0) {
          return listener.moveElement(node.ref, this.ref, index)
        }
      }
    }
  },

  /**
   * Remove a child node, and decide whether it should be destroyed.
   * @param {object} node
   * @param {boolean} preserved
   */
  removeChild (node, preserved) {
    if (node.parentNode) {
      removeIndex(node, this.children, true)
      if (node.nodeType === 1) {
        removeIndex(node, this.pureChildren)
        const listener = getListener(this.docId)
        if (listener) {
          listener.removeElement(node.ref)
        }
      }
    }
    if (!preserved) {
      node.destroy()
    }
  },

  /**
   * Clear all child nodes.
   */
  clear () {
    const listener = getListener(this.docId)
    /* istanbul ignore else */
    if (listener) {
      this.pureChildren.forEach(node => {
        listener.removeElement(node.ref)
      })
    }
    this.children.forEach(node => {
      node.destroy()
    })
    this.children.length = 0
    this.pureChildren.length = 0
  },

  /**
   * Set an attribute, and decide whether the task should be send to native.
   * @param {string} key
   * @param {string | number} value
   * @param {boolean} silent
   */
  setAttr (key, value, silent) {
    if (this.attr[key] === value && silent !== false) {
      return
    }
    this.attr[key] = value
    const listener = getListener(this.docId)
    if (!silent && listener) {
      listener.setAttr(this.ref, key, value)
    }
  },

  /**
   * Set a style property, and decide whether the task should be send to native.
   * @param {string} key
   * @param {string | number} value
   * @param {boolean} silent
   */
  setStyle (key, value, silent) {
    if (this.style[key] === value && silent !== false) {
      return
    }
    this.style[key] = value
    const listener = getListener(this.docId)
    if (!silent && listener) {
      listener.setStyle(this.ref, key, value)
    }
  },

  /**
   * Set style properties from class.
   * @param {object} classStyle
   */
  setClassStyle (classStyle) {
    // reset previous class style to empty string
    for (const key in this.classStyle) {
      this.classStyle[key] = ''
    }

    Object.assign(this.classStyle, classStyle)
    const listener = getListener(this.docId)
    if (listener) {
      listener.setStyles(this.ref, this.toStyle())
    }
  },

  /**
   * Add an event handler.
   * @param {string} event type
   * @param {function} event handler
   */
  addEvent (type, handler) {
    if (!this.event[type]) {
      this.event[type] = handler
      const listener = getListener(this.docId)
      if (listener) {
        listener.addEvent(this.ref, type)
      }
    }
  },

  /**
   * Remove an event handler.
   * @param {string} event type
   */
  removeEvent (type) {
    if (this.event[type]) {
      delete this.event[type]
      const listener = getListener(this.docId)
      if (listener) {
        listener.removeEvent(this.ref, type)
      }
    }
  },

  /**
   * Fire an event manually.
   * @param {string} event type
   * @param {function} event handler
   * @return {} anything returned by handler function
   */
  fireEvent (type, e) {
    const handler = this.event[type]
    if (handler) {
      return handler.call(this, e)
    }
  },

  /**
   * Get all styles of current element.
   * @return {object} style
   */
  toStyle () {
    return Object.assign({}, this.classStyle, this.style)
  },

  /**
   * Convert current element to JSON like object.
   * @return {object} element
   */
  toJSON () {
    const result = {
      ref: this.ref.toString(),
      type: this.type,
      attr: this.attr,
      style: this.toStyle()
    }
    const event = Object.keys(this.event)
    if (event.length) {
      result.event = event
    }
    if (this.pureChildren.length) {
      result.children = this.pureChildren.map((child) => child.toJSON())
    }
    return result
  },

  /**
   * Convert to HTML element tag string.
   * @return {stirng} html
   */
  toString () {
    return '<' + this.type +
    ' attr=' + JSON.stringify(this.attr) +
    ' style=' + JSON.stringify(this.toStyle()) + '>' +
    this.pureChildren.map((child) => child.toString()).join('') +
    '</' + this.type + '>'
  }
})
