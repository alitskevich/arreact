/* eslint-disable no-console */
import React from 'react'

import { REGISTRY } from './register.js'
import { setNodeMap, filterSlotNodes } from './utils.js'
import { compileTemplate } from './compile'
import { AbstractComponent } from './component.abstract'
import { adaptAttributes } from './dom.attrs'
import { methodName } from './component.utils'

export function renderContent (parent, container, content) {
  if (!content || !content.size) return null
  const elements = []
  content.forEach((node) => {
    let c = null
    const props = { node, parent, container, key: node.uid }
    if (node.tag === 'ui:slot') {
      const snode = node.clone(node.uid)
      snode.id = node.id
      snode.nodeMap = filterSlotNodes(node.id, container)
      c = [FragmentComponent, { ...props, node: snode, container: container.container }]
    } else if (node.tag === 'ui:fragment') {
      c = [FragmentComponent, props]
    } else if (node.tag === 'ui:for') {
      c = [ForComponent, props]
    } else if (node.tag === 'ui:item') {
      c = [ItemComponent, props]
    } else {
      const Registered = REGISTRY.get(node.tag)
      if (Registered) {
        c = [Registered, props]
      } else {
        c = [ElementComponent, props]
      }
    }
    elements.push(React.createElement(...c))
  })
  return elements
}

export class ElementComponent extends AbstractComponent {
  getInitialState () {
    adaptAttributes.call(this, this.node.resolveProps(this, true))
    return this.$state
  }

  setState (st, cb) {
    adaptAttributes.call(this, st)
    super.setState(this.$state, cb)
  }

  render () {
    adaptAttributes.call(this, this.node.resolveProps(this))
    return (this.node.tag === '#text')
      ? this.state.textContent || ''
      : React.createElement(this.node.tag, this.$state, renderContent(this.parent, this.container, this.node.nodeMap))
  }
}

export class TemplateComponent extends AbstractComponent {
  setState (st, cb) {
    super.setState({ ...this.node.resolveProps(this), ...st }, cb)
  }

  render () {
    return renderContent(this, this, this.$rootNode || (this.$rootNode = compileTemplate(this.template, name)))
  }
}

export class ReactComponent extends AbstractComponent {
  render () {
    return React.createElement(this.InternalType, this.state, this.children)
  }
}

export class StateComponent extends AbstractComponent {
  setState (st, cb) {
    Object.entries({ ...this.node.resolveProps(this), ...st }).forEach(([k, v]) => {
      const setter = this.impl[methodName(k, 'set')]
      if (setter) { setter.call(this.impl, v) } else { this.impl[k] = v }
    })
    if (cb) {
      cb()
    }
  }

  render () {
    return null
  }
}

export class FragmentComponent extends AbstractComponent {
  render () {
    return renderContent(this, this.container, this.content)
  }
}
let ccc = 1
class ForComponent extends AbstractComponent {
  render () {
    const nodes = new Map()
    const { items } = this.state
    this.data = {}
    if (items && items.length) {
      if (!items.forEach) Function.throw('[ui:for] Items has no forEach() ' + items)
      const itemNode = this.node.nodes[0]
      const itemName = itemNode.get('itemName')
      items.forEach((d, index) => {
        const pk = ccc++// d.id || index
        this.data[pk] = { [itemName]: d, [itemName + 'Index']: index }
        setNodeMap(nodes, itemNode.clone(`${pk}`).addInitialState(this.data[pk]))
      })
    }
    return renderContent(this, this.container, nodes)
  }
}

class ItemComponent extends AbstractComponent {
  render () {
    return renderContent(this, this, this.content)
  }

  emit (data) {
    return this.container.emit(data)
  }

  get (propId) {
    const itemName = this.state.itemName || 'item'
    const pk = propId.slice(0, itemName.length)
    return pk === itemName ? Object.dig(this.parent.data[this.uid], propId) : this.container.get(propId)
  }
}
