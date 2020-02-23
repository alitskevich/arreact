/* eslint-disable no-console */
import React from 'react'
import { applyValue, nextId, propGetter, upAsync, res, methodName } from './component.utils'
import { createElt } from './resolve'
import { compileTemplate } from './compile.js'

export class RComponent extends React.Component {
  constructor (options) {
    super(options)
    Object.assign(this, options)
    const { refId, parent, Ctor, ...props } = options
    this.impl = this.ImplType ?  new this.ImplType(props, this) : {}
    this.impl.$ = this
    this.state = props
    if (refId) {
      const hidden = this.app[refId]
      this.app[refId] = this.impl
      this.defer(() => { this.app[refId] = hidden })
    }
  }
  get app(){
    return window.app
  }
  get rootNode () {
    if (this.$rootNode) return this.$rootNode
        const ctor = this.InternalType

    return (this.$rootNode = compileTemplate(ctor.template || ctor.prototype.TEMPLATE, name))
  }

  get ImplType() {
    const ctor = this.InternalType
    return (typeof ctor === 'function' && ctor.prototype && !ctor.prototype.isReactComponent) ? ctor : null
  }

  render () {
        const ctor = this.InternalType

    if (ctor.prototype && ctor.prototype.isReactComponent) {
      return React.createElement(ctor, this.props, this.children)
    }
    return createElt(this.rootNode, this)
  }
  /**
   * Life-cycle hooks.
   */
  componentDidMount () {
    if (this.isDone || this.isInited) { return }
    this.isInited = true
    if (this.inits) {
      const initials = this.impl.init && this.impl.init(this) || {}
      const all = []
      this.inits.map(f => f(this)).forEach(r => {
        if (!r) return
        const { hotValue, cancel } = r
        this.defer(cancel)
        if (hotValue && hotValue.then) {
          all.push(hotValue)
        } else {
          Object.assign(initials, hotValue)
        }
      })
      delete this.inits
      this.up(initials)
      if (all.length) {
        Promise.all(all).then((args) => this.up(args.reduce(Object.assign, {})))
      }
    } else {
      if (this.impl.init) {
        const d = this.impl.init(this)
        if (d) { this.up(d) }
      }
    }
  }

  componentWillUnmount () {
    if (this.isDone) { return }
    this.isDone = true
    if (this.impl.done) {
      this.impl.done(this)
    }
    if (this.defered) {
      this.defered.forEach(f => f(this))
      delete this.defered
    }
    ['parent', 'children', 'owner', 'impl', 'app', 'ctx'].forEach(k => { delete this[k] })
  }

  /**
   * State.
   */
  up (Δ) {
    if (this.isDone) { return }
    const changed = this.set(Δ)
    if (changed) {
      this.setState(changed)
    }
    if (this.refId && changed) { this.notify() }
  }

  set (Δ) {
    const $ = this
    const impl = $.impl
    let changed = null
    if (Δ) {
      if (Δ.then) {
        upAsync($, Δ)
      } else {
        Object.entries(Δ).forEach(([k, their]) => {
          if (their && their.then) {
            upAsync($, their, k)
          } else if (k && typeof their !== 'undefined' && their !== impl[k]) {
            const setter = impl['set' + k[0].toUpperCase() + k.slice(1)]
            if (setter) { setter.call(impl, their) } else { impl[k] = their }
            (changed || (changed = {}))[k] = their
          }
        })
      }
    }
    return changed
  }

  prop (propId) {
    const value = propGetter(this, propId)()
    return value
  }

  /**
   *  Left Arrow.
   */
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
    return { hotValue: fn(this), cancel: () => listeners.delete(uuid) }
  }

  connect (key, applicator) {
    const [refId, propId] = key.split('.')
    const ref = refId === 'this' ? this.impl : this.app[refId]
    if (!ref) { return console.error('connect: No such ref ' + refId, key) }
    return ref.$.subscribe(this, ($) => applyValue($.prop(propId), applicator))
  }

  /**
   *  Right Arrow.
   */
  emit (key, data) {
    const $ = this

    if (!key || !key.includes('.')) {
      return $.up(key ? { [key]: data } : data)
    }

    const [type, target] = key.split('.')
    const event = { data, ...data }

    const ref = type === 'this' ? $.impl : window.app[type]
    if (!ref) {
      console.warn('emit: No such ref ' + type)
      return
    }

    try {
      const method = ref[methodName(target, 'on')]
      if (!method) { throw new ReferenceError('emit ' + type + ': No such method ' + methodName(target, 'on')) }

      const result = method.call(ref, event, ref, ref.$)
      this.log(type + ':' + methodName(target, 'on'), result, data, ref)
      if (result) { ref.$.up(result) }
    } catch (ex) {
      console.error('emit ' + key + ':', ex)
    }
  }

  /**
   * Routines.
   */

  raceCondition (key) {
    const COUNTERS = this.$weak || (this.$weak = new Map())
    let counter = 1 + (COUNTERS.get(key) || 0)
    COUNTERS.set(key, counter)
    return (fn) => {
      if (counter === COUNTERS.get(key)) {
        counter = 0
        fn()
      }
    }
  }

  defer (fn) { if (fn && typeof fn === 'function') { (this.defered || (this.defered = [])).push(fn) } }

  log (...args) {
    console.log(this.tag + this.uid, ...args)
  }

  res (key) {
    return res(window.app, key)
  }
}
