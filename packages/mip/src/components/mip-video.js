/**
 * @file 视频播放组件
 * @author @author harttle<yangjun14@baidu.com>, liangjiaying<jennyliang220@github>
 * @version 1.0
 * @copyright 2016 Baidu.com, Inc. All Rights Reserved
 */
import util from '../util'
import viewer from '../viewer'
import CustomElement from '../custom-element'

let windowInIframe = viewer.isIframed
let videoAttributes = [
  'ads',
  'src',
  'controls',
  'loop',
  'autoplay',
  'autobuffer',
  'crossorigin',
  'height',
  'muted',
  'preload',
  'poster',
  'width'
]

/**
 * Get attribute Set from attribute List
 *
 * @param {NamedNodeMap} attributes the attribute list, spec: https://dom.spec.whatwg.org/#interface-namednodemap
 * @return {Object} the attribute set, legacy:
 * @example
 * {
 *     "src": "http://xx.mp4",
 *     "autoplay": "",
 *     "width": "720"
 * }
 */
function getAttributeSet (attributes) {
  let attrs = {}
  Array.prototype.slice.apply(attributes).forEach(function (attr) {
    attrs[attr.name] = attr.value
  })
  return attrs
}

class MipVideo extends CustomElement {
  firstInviewCallback () {
    this.attributes = getAttributeSet(this.element.attributes)
    this.sourceDoms = this.element.querySelectorAll('source')
    this.src = this.attributes.src

    // if window is https
    let windowProHttps = !!window.location.protocol.match(/^https:/)
    // if video source is https
    let sourceIsHttps = true
    if (!this.sourceDoms.length) {
      sourceIsHttps = false
    }
    Array.prototype.slice.apply(this.sourceDoms).forEach(function (node) {
      if (!node.src.match(/^https:|^\/\//)) {
        sourceIsHttps = false
      }
    })
    let videoProHttps = (this.src && this.src.match(/^https:|^\/\//)) ||
                            (this.sourceDoms && sourceIsHttps)

    // page ishttps         + video is https    = renderInView
    // page ishttps(in iframe) + video is http    = renderPlayElsewhere
    // page ishttps(else)   + video is http     = renderInView（not mip）
    // page ishttp          + random video      = renderInView
    // page not iframe || video src is https ||  video http + page http
    if (!windowInIframe || videoProHttps || (windowInIframe && !videoProHttps && !windowProHttps)) {
      this.videoElement = this.renderInView()
    } else {
      this.videoElement = this.renderPlayElsewhere()
    }

    this.applyFillContent(this.videoElement, true)
  }

  // Render the `<video>` element, and append to `this.element`
  renderInView () {
    let videoEl = document.createElement('video')
    for (let k in this.attributes) {
      if (this.attributes.hasOwnProperty(k) && videoAttributes.indexOf(k) > -1) {
        videoEl.setAttribute(k, this.attributes[k])
      }
    }

    videoEl.setAttribute('playsinline', 'playsinline')
    videoEl.setAttribute('webkit-playsinline', 'webkit-playsinline')
    Array.prototype.slice.apply(this.element.childNodes).forEach(function (node) {
      // FIXME: mip layout related, remove this!
      if (node.nodeName.toLowerCase() === 'mip-i-space') {
        return
      }
      videoEl.appendChild(node)
    })
    this.element.appendChild(videoEl)
    return videoEl
  }

  // Render the `<a>` element with poster and play btn, and append to `this.element`
  renderPlayElsewhere () {
    let videoEl = document.createElement('div')
    let urlSrc
    videoEl.setAttribute('class', 'mip-video-poster')
    if (this.attributes.poster) {
      videoEl.style.backgroundImage = 'url(' + this.attributes.poster + ')'
      videoEl.style.backgroundSize = 'cover'
    }

    let playBtn = document.createElement('span')
    playBtn.setAttribute('class', 'mip-video-playbtn')
    videoEl.appendChild(playBtn)
    videoEl.dataset.videoSrc = this.attributes.src
    videoEl.dataset.videoPoster = util.parseCacheUrl(this.attributes.poster)
    videoEl.addEventListener('click', sendVideoMessage, false)

    // make sourceList, send to outer iframe
    let sourceList = []
    Array.prototype.slice.apply(this.sourceDoms).forEach(function (node) {
      let obj = {}
      obj[node.type] = node.src
      sourceList.push(obj)
    })

    if (!sourceList.length) {
      urlSrc = videoEl.dataset.videoSrc
    } else {
      urlSrc = JSON.stringify([videoEl.dataset.videoSrc, sourceList])
    }

    function sendVideoMessage () {
      if (windowInIframe) {
        // mip_video_jump is written outside iframe
        viewer.sendMessage('mip_video_jump', {
          poster: videoEl.dataset.videoPoster,
          src: urlSrc
        })
      }
    }
    this.element.appendChild(videoEl)
    return videoEl
  }
}

export default MipVideo
