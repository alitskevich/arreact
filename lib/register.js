import { TemplateComponent, ReactComponent, StateComponent } from './component'

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
      REGISTRY.set(name, class C extends TemplateComponent {
        get template () {
          return templ.trim()
        }
      })
    )
  } else if (ctor.prototype && ctor.prototype.isReactComponent) {
    REGISTRY.set(ctor.NAME || ctor.name, class C extends ReactComponent {
      get InternalType () {
        return ctor
      }
    })
  } else {
    REGISTRY.set(ctor.NAME || ctor.name, class C extends StateComponent {
      get StateType () {
        return ctor
      }
    })
  }
}

export const getByTag = tag => REGISTRY.get(tag)
