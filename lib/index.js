import React from 'react'
import ReactDOM from 'react-dom'
import { TemplateComponent } from './component.js'
import { register } from './register.js'
import { Node } from './node'

export function launch ({ types, template = '<App/>', rootElement = document.body.firstElementChild || document.body, ...props } = {}) {
  class AppContainerComponent extends TemplateComponent {
    get template () {
      return template
    }

    get app () {
      return this
    }
  }

  types.forEach(register)

  ReactDOM.render(React.createElement(AppContainerComponent, { ...props, node: new Node('$$$') }), rootElement, () => { })
}

if (typeof window === 'object') {
  window.launch = launch
}
