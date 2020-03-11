import React from 'react'
import ReactDOM from 'react-dom'
import { ContainerComponent } from './component.js'
import { register, REGISTRY } from './register.js'
import { Node } from './node'
// import { arrangeElements } from './utils'

export function launch ({ types, template = '<App/>', rootElement = document.body.firstElementChild || document.body, ...props } = {}) {
  class $AppContext {
    constructor () {
      Object.assign(this, props)
      this.elt = rootElement
      // this.app = this
    }

    stateChanged (changes) {
      // const node = this.$.rootNode
      // const elt = React.createElement(REGISTRY.get('App'), this.state)
      //
    }
  }
  [Object.assign($AppContext, { template }), ...types].forEach(register)
  const top = new ContainerComponent($AppContext, new Node('#top'))
  top.up(props)
  top.log('' + top)
  ReactDOM.render(top.render(), rootElement, () => { })

  return top.impl
}

if (typeof window === 'object') {
  window.launch = launch
}
