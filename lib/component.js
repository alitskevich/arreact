/* eslint-disable no-console */
import { REGISTRY } from './register.js'
import { Element } from './element'
import { setNodeMap, filterSlotNodes } from './utils.js'
import { compileTemplate } from './compile'
import { AbstractComponent } from './component.abstract'
import { methodName } from './component.utils.js'

/**
 * Component class.
 */
export class Component extends AbstractComponent {
  constructor (Ctor, node, parent, container) {
    super({})
    Object.assign(this, { node, uid: node.uid, key: node.uid, tag: node.tag, id: node.id, state: {}, parent, container })
    if (parent) {
      this.parent = parent
      this.app = parent.app
      this.impl = new Ctor(this)
    } else {
      this.impl = this.app = new Ctor(this)
    }
    this.impl.$ = this

    if (this.refId) {
      const hidden = this.app[this.refId]
      this.app[this.refId] = this.impl
      this.defer(() => { this.app[this.refId] = hidden })
    }
  }

  get refId () {
    return this.node.refId
  }

  componentDidMount () {
    this.init()
    this.isMount = true
  }

  componentWillUnmount () {
    this.done()
  }

  stateChanged (changes) {
    if (this.impl.stateChanged) {
      this.impl.stateChanged(changes)
    } else {
      changes.forEach(([v, k]) => {
        const setter = this.impl[methodName(k, 'set')]
        if (setter) { setter.call(this.impl, v) } else { this.impl[k] = v }
      })
    }

    this.recontent()
    if (this.isMount) {
      this.forceUpdate()
    }
  }

  // --- Content Reconciliation.

  get content () {
    return this.node.getNodes ? this.node.getNodes(this) : this.node.nodeMap
  }

  recontent () {
    recontent(this, this.container, this.content)
  }

  render () {
    const r = []
    if (this.children) {
      this.children.forEach(c => { if (c.render) { r.push(c.render()) } })
    }
    return r
  }
}

function recontent (parent, container, content) {
  (parent.children || Array.EMPTY).forEach(c => !content || !content.has(c.uid) ? c.done() : 0)
  parent.last = parent.first = null
  if (!content || !content.size) return
  const children = parent.children || (parent.children = new Map())
  let p = null
  content.forEach((node, uid) => {
    let c = children.get(uid)
    if (!c) {
      if (node.tag === 'ui:slot') {
        const snode = node.clone(node.uid)
        snode.id = node.id
        snode.nodeMap = filterSlotNodes(node.id, container)
        c = new FragmentComponent(REGISTRY.get('ui:fragment'), snode, parent, container.container)
      } else {
        const Registered = REGISTRY.get(node.tag)
        const Ctor = Ctors[node.tag] || (Registered ? (Registered.template ? ContainerComponent : ServiceComponent) : ElementComponent)
        c = new Ctor(Registered || Element, node, parent, container)
      }
      setNodeMap(children, c)
    }

    p = (p || parent)[p ? 'next' : 'first'] = c
  })
  children.forEach(c => c.up(c.node.resolveProps(c, !c.isInited), true))
  children.forEach(c => !c.isInited && c.init())
}

export class ContainerComponent extends Component {
  recontent () {
    recontent(this, this, this.rootNode)
  }

  get rootNode () {
    if (this.$rootNode) return this.$rootNode
    const ctor = this.impl.constructor
    return (this.$rootNode = compileTemplate(ctor.template || ctor.prototype.TEMPLATE, name))
  }
}

class ElementComponent extends Component {
  stateChanged (changes) {
    this.recontent()
    this.impl.stateChanged(changes)
    if (this.isMount) {
      this.forceUpdate()
    }
  }

  render () {
    return this.impl.render()
  }
}

class ServiceComponent extends Component {

}

class FragmentComponent extends Component {
}

class ForComponent extends Component {
  recontent () {
    const nodes = new Map()
    const { items } = this.state
    if (items && items.length) {
      if (!items.forEach) Function.throw('[ui:for] Items has no forEach() ' + items)
      const itemNode = this.node.nodes[0]
      const itemName = itemNode.get('itemName')
      items.forEach((d, index) => {
        setNodeMap(nodes, itemNode.clone(`${d.id || index}`).addInitialState({ [itemName]: d, [itemName + 'Index']: index }))
      })
    }
    recontent(this, this.container, nodes)
  }
}

class ItemComponent extends Component {
  recontent () {
    recontent(this, this, this.content)
  }

  emit (data) {
    return this.container.emit(data)
  }

  get (propId) {
    const itemName = this.state.itemName
    const pk = propId.slice(0, itemName.length)
    return pk === itemName ? super.get(propId) : this.container.get(propId)
  }
}

const Ctors = {
  'ui:fragment': FragmentComponent,
  'ui:for': ForComponent,
  'ui:item': ItemComponent
}
