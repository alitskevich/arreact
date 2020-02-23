import { RComponent } from './component'

export const REGISTRY = new Map()

export const register = ctor => REGISTRY.set(ctor.NAME || ctor.name, class Hoc extends RComponent {
    get InternalType () {
      return ctor
    }
})
