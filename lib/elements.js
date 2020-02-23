import { RComponent } from './component'
import { applyDomAttrs } from './attrs.js'
import React from 'react'

export class Div extends RComponent {
  render () {
    return React.createElement('div', applyDomAttrs(this, this.props), this.children)
  }
}
