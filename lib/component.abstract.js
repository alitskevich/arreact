import React from 'react'
import { applyValue, nextId, propGetter, upAsync, res, pipes, methodName } from './component.utils'

export class AbstractComponent extends React.Component {
  constructor (props) {
    super(props)
    const { node, parent } = props
    Object.assign(this, { ...props, uid: node.uid, key: node.uid, tag: node.tag, id: node.id, refId: node.refId })
    if (parent) {
      this.app = parent.app
    }
    this.state = this.StateType ? new this.StateType(this.getInitialState(), this) : this.getInitialState()

    if (this.refId) {
      const hidden = this.app[this.refId]
      this.app[this.refId] = this
      this.defer(() => { this.app[this.refId] = hidden })
    }
  }

  get impl () {
    return this.state
  }

  get content () {
    return this.node.getNodes ? this.node.getNodes(this) : this.node.nodeMap
  }

  getInitialState () {
    return this.node.resolveProps(this, true)
  }

  // --- State

  up (Δ = {}, force) {
    if (this.isDone) { return null }
    if (Δ.then && Δ.catch) { return upAsync(this, Δ) }

    let changed = false
    const changes = {}
    Object.entries(Δ).forEach(([k, v]) => {
      if (v && v.then && v.catch) {
        upAsync(this, v, k)
      } else if (k && typeof v !== 'undefined' && v !== this.state[k]) {
        changes[k] = v
        changed = true
      }
    })

    if (changed || force || !this.isInited) {
      this.setState(changes, this.refId ? () => this.notify() : null)
    }
  }

  get (propId) {
    return propGetter(this, propId)()
  }

  // --- Left Arrow.

  notify () {
    if (this.listeners && !this.notifying) {
      this.notifying = true
      this.listeners.forEach(e => e())
      this.notifying = false
    }
  }

  subscribe (target, fn) {
    const uuid = nextId()
    const listeners = (this.listeners || (this.listeners = new Map()))
    listeners.set(uuid, () => {
      try {
        target.up(fn(this))
      } catch (ex) {
        console.error(this.tag + this.uid + ' notify ', ex)
      }
    })
    return { payload: fn(this), cancel: () => listeners.delete(uuid) }
  }

  connect (key, applicator) {
    const [refId, propId] = key.split('.')
    const ref = refId === 'this' ? this.impl : this.app[refId]
    if (!ref) { return console.error('connect: No such ref ' + refId, key) }

    return ref.subscribe(this, c => applyValue(c.get(propId), applicator))
  }

  // --- Right Arrow.

  emit (key, data) {
    const $ = this

    if (!key || !key.includes('.')) {
      return $.up(key ? { [key]: data } : data)
    }

    const [type, target] = key.split('.')
    const event = { data, ...data }

    const ref = type === 'this' ? $ : $.app[type]
    if (!ref) {
      console.warn('emit: No such ref ' + type)
      return
    }

    try {
      const propId = methodName(target, 'on')
      const impl = ref.impl
      const method = impl[propId]

      if (!method) Function.throw('emit ' + type + ': No such method ' + propId)

      const result = method.call(impl, event, impl, ref)

      this.log(type + ':' + propId, result, data, impl)
      if (result) { ref.up(result) }
    } catch (ex) {
      console.error('emit ' + key + ':', ex)
    }
  }

  // --- Life-cycle hooks.

  componentDidMount () {
    if (this.isDone || this.isInited) { return }
    this.isInited = true
    const initializers = this.node.initializers
    if (initializers && initializers.length) {
      const initials = (this.impl.init ? this.impl.init(this) : null) || {}
      const all = []
      initializers.map(f => f(this)).forEach(r => {
        if (!r) return
        const { payload, cancel } = r
        this.defer(cancel)
        if (payload && payload.then) {
          all.push(payload)
        } else {
          Object.assign(initials, payload)
        }
      })
      if (all.length) {
        Promise.all(all).then((args) => this.up(args.reduce((r, e) => Object.assign(r, e), initials)))
      } else {
        this.up(initials)
      }
    } else {
      if (this.impl.init) {
        const d = this.impl.init(this)
        if (d) { this.up(d) }
      }
    }
    return this
  }

  componentWillUnmount () {
    if (this.isDone) { return }
    this.isDone = true
    if (this.impl.done) {
      this.impl.done(this)
    }
    if (this.children) {
      // this.children.forEach(c => { c.parent = null; c.done() })
    }
    if (this.parent) {
      // this.parent.children.delete(this.uid)
    }
    if (this.defered) {
      this.defered.forEach(f => f(this))
      delete this.defered
    }
    this.impl.$ = null;
    ['parent', 'app', 'children', 'container', 'impl', 'state'].forEach(k => { delete this[k] })
  }

  // --- Routines.

  raceCondition (key) {
    const COUNTERS = this.$weak || (this.$weak = new Map())
    let counter = 1 + (COUNTERS.get(key) || 0)
    COUNTERS.set(key, counter)
    return (fn) => { if (counter === COUNTERS.get(key)) { counter = 0; fn() } }
  }

  defer (fn) {
    if (fn && typeof fn === 'function') { (this.defered || (this.defered = [])).push(fn) }
  }

  log (...args) {
    console.log('' + this.tag + '@' + this.uid, ...args)
  }

  res (key) {
    return res(this.app, key)
  }

  pipes (key) {
    return pipes(this.app, key)
  }

  toString () {
    return '' + this.tag + '@' + this.uid// stringifyComponent(this)
  }
}
