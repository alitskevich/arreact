import ReactDOM from 'react-dom'
import { compileTemplate } from './compile.js'
import { allFragments } from './fragment.js'
import { register } from './registry'
import { createElt } from './resolve'

allFragments.map(([key, ctr]) => {
  ctr.NAME = key
  register(ctr)
})

export function launchReact ({ types, template, rootElt, ...props } = {}) {
  const root = compileTemplate(template);
  [].concat(types).forEach(register)
  const app = createElt(root)
  window.app = props
  ReactDOM.render(app, rootElt || document.body.firstElementChild || document.body, () => { })
}

window.launchReact = launchReact
