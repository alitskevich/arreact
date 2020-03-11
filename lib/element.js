import { applyAttributes } from './dom.attrs'
import React from 'react'

export class Element {
  constructor ($, state) {
    this.$ = $
    this.state = state || { key: $.uid }
  }

  done () {
    this.state = null
  }

  stateChanged (changes) {
    applyAttributes.call(this, changes)
  }

  render () {
    const { node, children } = this.$
    const { tag } = node
    if (tag === '#text') {
      return this.state.textContent || ''
    }
    const r = []
    children && children.forEach(c => { if (c.render) { r.push(c.render()) } })
    return React.createElement(tag || 'p', this.state, ...r)
  }
}
