import React from 'react'

class Fragment {}

export const REGISTRY = new Map([
  ['ui:fragment', Fragment],
  ['ui:for', Fragment],
  ['ui:item', Fragment],
  ['ui:slot', Fragment]
])

export const register = ctor => {
  if (typeof ctor === 'string') {
    ctor.replace(/<component\sid="(.+)">([\s\S]*?)<\/component>/gm, (_, name, templ) =>
      REGISTRY.set(name, Object.assign(class TComponent {
        render () {
          return 'eee'
        }
      }, { template: `${templ.trim()}` }))
    )
  } else if (ctor.prototype && ctor.prototype.isReactComponent) {
    REGISTRY.set(ctor.NAME || ctor.name, class RComponent {
      render () {
        return React.createElement(ctor, this.props)
      }
    })
  } else {
    REGISTRY.set(ctor.NAME || ctor.name, ctor)
  }
}

export const getByTag = tag => REGISTRY.get(tag)
