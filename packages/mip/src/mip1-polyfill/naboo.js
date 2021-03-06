/**
 * @file naboo框架，包含核心调度模块和css3 transition动画工具函数
 * @author zhulei05(zhulei05@baidu.com)
 */

/**
 * Naboo类，抽象出来的一个动画控制和执行的对象
 *
 * @constructor
 */
function Naboo () {
  this.steps = []
  this._index = -1
  this._handlers = {}
  this.canceled = false
}

/**
 * 开始执行动画的指令函数
 *
 * @param {Function=} fn - 动画完成后的回调函数
 * @return {Object} 当前naboo实例
 */
Naboo.prototype.start = function (fn) {
  if (fn) {
    this.on('end', fn)
  }

  this.trigger('start')
  this.next(this)
  return this
}

/**
 * 让动画进入下一步的指令函数，一般在Naboo插件中调用
 */
Naboo.prototype.next = function () {
  if (this.canceled) {
    return
  }

  this._index++
  if (this._index >= this.steps.length) {
    this.trigger('end')
  } else {
    let currentStep = this.steps[this._index]
    currentStep.call(this)
  }
}

/**
 * 取消动画的指令，调用该函数后，当前未执行完的动画仍会继续执行完成，后续的动画不会执行
 */
Naboo.prototype.cancel = function () {
  this.canceled = true
}

/**
 * 事件绑定
 *
 * @param {string} name - 事件名
 * @param {Function} fn - 响应函数
 */
Naboo.prototype.on = function (name, fn) {
  this._handlers[name] || (this._handlers[name] = [])
  this._handlers[name].push(fn)
}

/**
 * 解除事件绑定
 *
 * @param {string=} name - 事件名
 * @param {Function=} fn - 响应函数
*/
Naboo.prototype.off = function (name, fn) {
  if (!name) {
    this._handlers = {}
  } else {
    let handlers = this._handlers[name]
    if (!fn) {
      this._handlers[name] = []
    } else if (Object.prototype.toString.call(handlers) === '[object Array]') {
      let i = 0
      for (let len = handlers.length; i < len; i++) {
        if (handlers[i] === fn) {
          break
        }
      }
      this._handlers[name].splice(i, 1)
    }
  }
}

/**
 * 触发事件
 *
 * @param {string} name - 事件名
 * @param {*=} data - 触发事件时需要传递的数据
 */
Naboo.prototype.trigger = function (name, data) {
  let handlers = this._handlers[name]
  if (handlers) {
    handlers.forEach((fn, i) => fn(data))
  }
}

/**
 * 插件注册函数
 *
 * @param {string} name - 插件名
 * @param {Function} fn - 插件函数，用于定义插件的执行逻辑
 */
Naboo.register = function (name, fn) {
  Naboo[name] = function () {
    let ret = new Naboo()
    ret[name].apply(ret, arguments)
    return ret
  }
  Naboo.prototype[name] = function () {
    let args = Array.prototype.slice.call(arguments, 0)
    args.unshift(this.next.bind(this))
    this.steps.push(() => fn.apply(this, args))
    return this
  }
}

/**
 * Naboo#p & Naboo.p
 * Naboo的并行插件
 */
Naboo.register('p', next => {
  let args = Array.prototype.slice.call(arguments, 1)
  let n = args.length
  args.forEach(naboo => naboo.start(() => (n-- === 0 && next())))
})

/**
 * Naboo#done & Naboo.done
 * Naboo的done插件，可用于在任何一个动画插件后进行回调
 */
Naboo.register('done', (next, fn) => fn(next))

Naboo.tool = (() => {
  // 定义一批检测浏览器特性需要的变量
  let prefix = ''
  let eventPrefix = ''
  let vendors = {
    Webkit: 'webkit',
    Moz: '',
    O: 'o'
  }
  let testEl = document.createElement('div')

  function dasherize (str) {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase()
  }

  function normalizeEvent (name) {
    return eventPrefix ? eventPrefix + name : name.toLowerCase()
  }

  // 检测浏览器特性
  if (testEl.style.transform === undefined) {
    /* eslint-disable fecs-valid-map-set */
    for (let prop in vendors) {
      if (testEl.style[prop + 'TransitionProperty'] !== undefined) {
        prefix = '-' + prop.toLowerCase() + '-'
        eventPrefix = vendors[prop]
        break
      }
    }
  }

  // 是否不支持transition
  let off = eventPrefix === undefined && testEl.style.transitionProperty === undefined

  /**
   * 设置dom对象的css
   *
   * 实现方法同zepto的css
   *
   * @param {Object} dom 要设置css的dom节点
   * @param {Object} obj 存放css信息的对象
   */
  function setCss (dom, obj) {
    let css = ''

    for (let key in obj) {
      if (!obj[key] && obj[key] !== 0) {
        dom.style.removeProperty(dasherize(key))
      } else {
        css += dasherize(key) + ':' + obj[key] + ';'
      }
    }

    dom.style.cssText += ';' + css
  }

  /**
   * 给一个属性自动添加单位
   *
   * @param  {string} prop 属性名
   * @param  {string|number} val 属性值
   *
   * @return {string}     带单位的属性值
   */
  function handleUnit (prop, val) {
    if (val !== +val) {
      return val
    }

    testEl.style[prop] = 0
    let propValue = testEl.style[prop]
    let match = propValue.match && propValue.match(/^\d+([a-zA-Z]+)/)
    if (match) {
      return val + match[1]
    }

    return val
  }

  /**
   * 获取正确的css属性名
   *
   * @param {string} prop 属性名
   * @return {string | undefined} 自动添加前缀后的属性名或者undefined
   */
  function getPropName (prop) {
    let res
    if (testEl.style[prop] !== undefined) {
      res = prop
    } else {
      for (let key in vendors) {
        let val = '-' + vendors[key] + '-'
        if (testEl.style[val + prop] !== undefined) {
          res = val + prop
          break
        }
      }
    }

    return res
  }

  return {
    prefix,
    dasherize,
    normalizeEvent,
    off,
    setCss,
    handleUnit,
    getPropName
  }
})()

/**
 * Naboo提供的执行css3 transiton动画的函数
 *
 * @param {Object} dom - 需要进行动画的dom元素
 * @param {Object} property - 需要进行动画的css属性键值对对象
 * @param {number=} duration - 动画时长，单位ms
 * @param {string=} ease - 动画的缓动函数名，可选值包括`ease`、`linear`、`ease-in`、`ease-out`、`ease-in-out`
 * @param {number=} delay - 动画延迟执行的时间，单位ms
 * @param {Function=} cb - 动画完成后的回调函数
 */
Naboo.transition = (() => {
  let prefix = Naboo.tool.prefix

  // css transition各属性名
  let transitionProperty = prefix + 'transition-property'
  let transitionDuration = prefix + 'transition-duration'
  let transitionDelay = prefix + 'transition-delay'
  let transitionTiming = prefix + 'transition-timing-function'
  let transitionEnd = Naboo.tool.normalizeEvent('TransitionEnd')

  // 动画完成后清空设置
  let cssReset = {}
  cssReset[transitionProperty] = ''
  cssReset[transitionDuration] = ''
  cssReset[transitionDelay] = ''
  cssReset[transitionTiming] = ''

  return function (dom, property, opt = {}) {
    if (dom && Object.prototype.toString.call(property) === '[object Object]') {
      opt = opt || {}
      let duration = parseInt(opt.duration, 10) || 400
      let easeArr = [
        'ease',
        'linear',
        'ease-in',
        'ease-out',
        'ease-in-out'
      ]
      let ease = (easeArr.indexOf(opt.ease) > -1) ? opt.ease : 'ease'
      let delay = parseInt(opt.delay, 10) || 0
      let cb = (typeof opt.cb === 'function') ? opt.cb : () => {}
      let nabooNum = dom.getAttribute('data-naboo')
      if (nabooNum !== +nabooNum) {
        nabooNum = 0
      }

      dom.setAttribute('data-naboo', nabooNum + 1)
      if (Naboo.tool.off) {
        duration = 0
      }

      duration = Math.max(duration, 0)
      duration /= 1000
      delay /= 1000

      let cssProperty = []
      let cssValues = {}
      for (let key in property) {
        if (!property.hasOwnProperty(key)) {
          continue
        }

        let originKey = key
        key = Naboo.tool.getPropName(key)
        let value = Naboo.tool.handleUnit(key, property[originKey])
        cssValues[key] = value
        cssProperty.push(Naboo.tool.dasherize(key))
      }
      if (duration > 0) {
        let transitionPropertyVal = dom.style[transitionProperty]
        transitionPropertyVal && (transitionPropertyVal += ', ')
        cssValues[transitionProperty] = transitionPropertyVal + cssProperty.join(', ')

        let transitionDurationVal = dom.style[transitionDuration]
        if (transitionDurationVal || (parseInt(transitionDurationVal, 10) === 0)) {
          transitionDurationVal += ', '
        }

        cssValues[transitionDuration] = transitionDurationVal + duration + 's'

        let transitionTimingVal = dom.style[transitionTiming]
        transitionTimingVal && (transitionTimingVal += ', ')
        cssValues[transitionTiming] = transitionTimingVal + ease

        let transitonDelayVal = dom.style[transitionDelay]
        if (transitonDelayVal || (parseInt(transitonDelayVal, 10) === 0)) {
          transitonDelayVal += ', '
        }

        cssValues[transitionDelay] = transitonDelayVal + delay + 's'
      }

      // 回调是否执行
      let fired = false
      let setCss = Naboo.tool.setCss

      // 包装后的回调函数
      let wrappedCallback = function (event) {
        if (event && (event.elapsedTime !== (duration + delay))) {
          return
        }

        if (typeof event !== 'undefined') {
          if (event.target !== event.currentTarget) {
            // 确保事件不是从底部冒泡上来的
            return
          }

          event.target.removeEventListener(transitionEnd, wrappedCallback)
        } else {
          // 由setTimeout触发
          dom.removeEventListener(transitionEnd, wrappedCallback)
        }
        fired = true
        dom.setAttribute('data-naboo', +dom.getAttribute('data-naboo') - 1);
        (+dom.getAttribute('data-naboo') === 0) && setCss(dom, cssReset)
        cb && cb()
      };

      (duration > 0) && dom.addEventListener(transitionEnd, wrappedCallback)

      // 在某些老式的android手机上，transitionEnd事件有可能不会触发，这时候我们需要手动执行回调
      setTimeout(() => (!fired && wrappedCallback()), (duration + delay) * 1000 + 25)

      // 触发reflow让元素可以执行动画
      /* eslint-disable no-unused-expressions */
      dom.clientLeft
      /* eslint-enable no-unused-expressions */
      setCss(dom, cssValues)
    }
  }
})()

/**
 * 专门用于执行动画的插件
 *
 * @param {Object} dom 要进行动画的dom对象
 * @param {Object} prop 要进行动画的css属性
 * @param {?Object} opt 动画的一些参数
 * @param {?number} opt.duration 动画时长，默认值400，单位ms
 * @param {?string} opt.ease 动画的缓动函数，可选值有'ease','ease-in','ease-out','linear','ease-in-out'，默认值'ease'
 * @param {?number} opt.delay 动画的延时时长，默认值0，单位ms
 * @param {?Function} opt.cb 动画的回调函数
 * @param {?string} opt.mode 动画的模式，可选值有'transition','keyframes(暂未支持)','js(暂未支持)'，默认值'transition'
 * @return {Object} 返回当前的naboo对象
 */
Naboo.register('animate', (next, dom, prop, opt) => {
  opt = opt || {}
  let cb = opt.cb
  opt.cb = function () {
    cb && cb()
    next()
  }
  opt.mode = ([
    'transition'
  ].indexOf(opt.mode) > -1) ? opt.mode : 'transition'
  Naboo[opt.mode](dom, prop, opt)
})

export default Naboo
