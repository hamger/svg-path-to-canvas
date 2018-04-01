const parse = require('./parse-svg-path')
const abs = require('./abs-svg-path')
const normalize = require('./normalize-svg-path')
const isSvgPath = require('./is-svg-path')
import {Matrix} from 'sprite-math'
import {isPointInPath, getPointAtLength, getTotalLength} from './platform'

const _path = Symbol('path')
const _bounds = Symbol('bounds')
const _savedPaths = Symbol('savedPaths')

class SvgPath {
  constructor(d) {
    if(!isSvgPath(d)) {
      throw new Error('Not an SVG path!')
    }

    const path = normalize(abs(parse(d)))
    this[_path] = path

    this[_bounds] = null

    this[_savedPaths] = []
  }
  save() {
    this[_savedPaths].push({path: this[_path], bounds: this[_bounds]})
  }
  restore() {
    if(this[_savedPaths].length) {
      const {path, bounds} = this[_savedPaths].pop()
      this[_path] = path
      this[_bounds] = bounds
    }
  }
  get bounds() {
    if(!this[_bounds]) {
      const path = this[_path]
      this[_bounds] = [0, 0, 0, 0]
      if(path.length) {
        const bounds = [Infinity, Infinity, -Infinity, -Infinity]

        for(let i = 0, l = path.length; i < l; i++) {
          const points = path[i].slice(1)

          for(let j = 0; j < points.length; j += 2) {
            if(points[j + 0] < bounds[0]) bounds[0] = points[j + 0]
            if(points[j + 1] < bounds[1]) bounds[1] = points[j + 1]
            if(points[j + 0] > bounds[2]) bounds[2] = points[j + 0]
            if(points[j + 1] > bounds[3]) bounds[3] = points[j + 1]
          }
        }
        this[_bounds] = bounds
      }
    }
    return this[_bounds]
  }
  get center() {
    const [x0, y0, x1, y1] = this.bounds
    return [(x0 + x1) / 2, (y0 + y1) / 2]
  }
  render(context) {
    const commands = this[_path]
    if(commands.length) {
      context.save()
      commands.forEach((c) => {
        const [cmd, ...args] = c
        if(cmd === 'M') {
          context.moveTo(...args)
        } else {
          context.bezierCurveTo(...args)
        }
      })
      context.restore()
    }
  }
  get d() {
    return this[_path].map((p) => {
      const [c, ...points] = p
      return c + points.join()
    }).join('')
  }
  get path() {
    return this[_path]
  }
  isPointInPath(x, y) {
    return isPointInPath(this, x, y)
  }
  getPointAtLength(len) {
    return getPointAtLength(this.d, len)
  }
  getTotalLength() {
    return getTotalLength(this.d)
  }
  transform(...args) {
    this[_bounds] = null
    const m = new Matrix(args)
    const commands = this[_path]
    this[_path] = commands.map((c) => {
      const [cmd, ...args] = c
      const transformed = [cmd]
      for(let i = 0; i < args.length; i += 2) {
        const x0 = args[i],
          y0 = args[i + 1]
        const [x, y] = m.transformPoint(x0, y0)
        transformed.push(x, y)
      }
      return transformed
    })
    return this
  }
  translate(x, y) {
    const m = new Matrix().translate(x, y)
    return this.transform(...m.m)
  }
  rotate(deg) {
    const m = new Matrix().rotate(deg)
    return this.transform(...m.m)
  }
  scale(sx, sy) {
    const m = new Matrix().scale(sx, sy)
    return this.transform(...m.m)
  }
  skew(degX, degY) {
    const m = new Matrix().skew(degX, degY)
    return this.transform(...m.m)
  }
}

module.exports = SvgPath