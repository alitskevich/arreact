import { applyDomAttrs } from './attrs.js'
import { REGISTRY } from './registry'
import React from 'react'

export const createElt = (node, $owner, key) => {
  if (Array.isArray(node)) return node.map((n, i) => createElt(n, $owner, i))

  const { tag, updates, inits, initials, $spec, nodes, ref: refId } = node
  const ini = { key, ...initials, $owner }
  const state = updates && updates.length ? updates.reduce((r, fn) => { fn($owner, r); return r }, ini) : ini
  if (tag === '#text') {
    return state['#text'] || ''
  }
  const type = REGISTRY.get(tag)
  const props = type ? {...state, refId, $spec, inits} : applyDomAttrs($owner.origin, state)
  return React.createElement(
    type || tag || 'p',
    props,
    ...(nodes || []).map(node => createElt(node, $owner))
  )
}
