import G6 from '@antv/g6'
import { isNumber, isArray } from '@antv/util'

import { getLightColor } from './utils/color'

const SMALLGRAPHLABELMAXLENGTH = 5
export let labelMaxLength = SMALLGRAPHLABELMAXLENGTH

const duration = 2000
const realEdgeOpacity = 0.6

const darkBackColor = 'rgb(43, 47, 51)'
const disableColor = '#777'
const theme = 'dark'
const subjectColors = [
  '#5F95FF', // blue
  '#61DDAA',
  '#65789B',
  '#F6BD16',
  '#7262FD',
  '#78D3F8',
  '#9661BC',
  '#F6903D',
  '#008685',
  '#F08BB4'
]

const DEFAULT_NODE_SIZE = 60
const DEFAULT_CHILD_NODE_SIZE = 30

const colorSets = G6.Util.getColorSetsBySubjectColors(
  subjectColors,
  darkBackColor,
  theme,
  disableColor
)
//graph config
const global = {
  node: {
    style: {
      fill: '#2B384E'
    },
    labelCfg: {
      style: {
        fill: '#acaeaf',
        stroke: '#191b1c'
      }
    },
    stateStyles: {
      focus: {
        fill: '#2B384E'
      }
    }
  },
  edge: {
    style: {
      stroke: '#acaeaf',
      realEdgeStroke: '#acaeaf', //'#f00',
      realEdgeOpacity,
      strokeOpacity: realEdgeOpacity
      // endArrow: true
    },
    labelCfg: {
      style: {
        fill: '#acaeaf',
        realEdgeStroke: '#acaeaf', //'#f00',
        realEdgeOpacity: 0.5,
        stroke: '#191b1c'
      }
    },
    stateStyles: {
      focus: {
        stroke: '#fff' // '#3C9AE8',
      }
    }
  }
}

//自定义节点(默认节点)
G6.registerNode(
  'model-node',
  {
    draw(cfg, group) {
      let r = DEFAULT_NODE_SIZE
      if (isNumber(cfg.size)) {
        r = cfg.size / 2
      } else if (isArray(cfg.size)) {
        r = cfg.size[0] / 2
      }
      const style = cfg.style || {}
      const colorSet = cfg.colorSet || colorSets[0]

      // halo for hover
      group.addShape('circle', {
        attrs: {
          x: 0,
          y: 0,
          r: r + 10,
          fill: colorSet.activeStroke,
          opacity: 0.2,
          lineWidth: 0
        },
        name: 'halo-shape',
        visible: false
      })

      //main circle
      const keyShape = group.addShape('circle', {
        attrs: {
          ...style,
          x: 0,
          y: 0,
          r,
          fill: getLightColor(colorSet.mainStroke, 0.6),
          stroke: colorSet.mainStroke,
          lineWidth: 2,
          cursor: 'pointer',
          zIndex: 1000
        },
        name: 'aggregated-node-keyShape'
      })

      let labelStyle = {}
      if (cfg.labelCfg) {
        labelStyle = Object.assign(labelStyle, cfg.labelCfg.style)
      }

      //label
      if (cfg.label) {
        const text = cfg.label
        let labelStyle = {}
        let refY = 0
        if (cfg.labelCfg) {
          labelStyle = Object.assign(labelStyle, cfg.labelCfg.style)
          refY += cfg.labelCfg.refY || 0
        }
        let offsetY = 0
        const fontSize = labelStyle.fontSize < 8 ? 8 : labelStyle.fontSize
        const lineNum = cfg.labelLineNum || 1
        offsetY = lineNum * (fontSize || 12)
        group.addShape('text', {
          attrs: {
            text,
            x: 0,
            y: r / 2 - offsetY / 2,
            textAlign: 'center',
            textBaseLine: 'center',
            cursor: 'pointer',
            fontSize: 14,
            fill: '#2a2c34',
            opacity: 1,
            fontWeight: 500
          },
          name: 'text-shape',
          className: 'text-shape'
        })
      }

      // tag
      if (cfg.new) {
        group.addShape('circle', {
          attrs: {
            x: r - 3,
            y: -r + 3,
            r: 4,
            fill: '#6DD400',
            lineWidth: 0.5,
            stroke: '#FFFFFF'
          },
          name: 'typeNode-tag-circle'
        })
      }
      return keyShape
    },
    setState: (name, value, item) => {
      const group = item.get('group')
      if (name === 'layoutEnd' && value) {
        const labelShape = group.find((e) => e.get('name') === 'text-shape')
        if (labelShape) labelShape.set('visible', true)
      } else if (name === 'hover') {
        if (item.hasState('focus')) {
          return
        }
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        if (value) {
          halo && halo.show()
        } else {
          halo && halo.hide()
        }
      } else if (name === 'focus') {
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        const label = group.find((e) => e.get('name') === 'text-shape')
        if (value) {
          halo && halo.show()
          label && label.attr('fontWeight', 600)
        } else {
          halo && halo.hide()
          label && label.attr('fontWeight', 500)
        }
      } else if (name === 'active') {
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        halo && halo.show()
      } else if (name === 'inactive') {
        if (item.hasState('focus')) {
          return
        }
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        halo && halo.hide()
      }
    },
    update: undefined
  },
  'single-node'
)

//自定义图片节点
G6.registerNode(
  'image-node',
  {
    draw(cfg, group) {
      let r = cfg.size ? cfg.size : DEFAULT_NODE_SIZE
      const style = cfg.style || {}
      const colorSet = cfg.colorSet || colorSets[0]
      // halo for hover
      group.addShape('circle', {
        attrs: {
          x: 0,
          y: 0,
          r: r / 2 + 8,
          fill: colorSet.activeStroke,
          opacity: 0.2,
          lineWidth: 0
        },
        name: 'halo-shape',
        visible: false
      })
      //image shape
      if (cfg.img) {
        const imageShape = group.addShape('image', {
          attrs: {
            ...style,
            x: -r / 2,
            y: -r / 2,
            width: r,
            height: r,
            img: cfg.img,
            zIndex: 1001
          },
          name: 'image-keyShape'
        })
        //剪切图片
        imageShape.setClip({
          type: 'circle',
          attrs: {
            r: r / 2 - 1,
            x: 0,
            y: 0
          }
        })
      }

      //background circle
      const keyShape = group.addShape('circle', {
        attrs: {
          ...style,
          x: 0,
          y: 0,
          r: r / 2,
          fill: cfg.img ? '#fff' : getLightColor(colorSet.mainStroke, 0.6),
          stroke: colorSet.mainStroke,
          fillOpacity: cfg.img ? 0 : 1,
          lineWidth: 2,
          cursor: 'pointer'
        },
        name: 'aggregated-node-keyShape'
      })

      let labelStyle = {}
      if (cfg.labelCfg) {
        labelStyle = Object.assign(labelStyle, cfg.labelCfg.style)
      }

      //label
      if (cfg.label) {
        const text = cfg.label
        let labelStyle = {}
        let refY = 0
        if (cfg.labelCfg) {
          labelStyle = Object.assign(labelStyle, cfg.labelCfg.style)
          refY += cfg.labelCfg.refY || 0
        }
        let offsetY = 0
        const fontSize = labelStyle.fontSize < 8 ? 8 : labelStyle.fontSize
        const lineNum = cfg.labelLineNum || 1
        offsetY = lineNum * (fontSize || 12)
        group.addShape('text', {
          attrs: {
            text,
            x: 0,
            y: r - refY - offsetY + 1,
            textAlign: 'center',
            textBaseLine: 'center',
            fontSize: 14,
            fill: '#2a2c34',
            opacity: 1,
            fontWeight: 500
          },
          name: 'text-shape',
          className: 'text-shape'
        })
      }

      // tag
      if (cfg.new) {
        group.addShape('circle', {
          attrs: {
            x: r - 3,
            y: -r + 3,
            r: 4,
            fill: '#6DD400',
            lineWidth: 0.5,
            stroke: '#FFFFFF'
          },
          name: 'typeNode-tag-circle'
        })
      }
      return keyShape
    },
    update: undefined
  },
  'model-node'
)

//自定义子节点(模型属性)
G6.registerNode(
  'real-node',
  {
    draw(cfg, group) {
      let r = DEFAULT_CHILD_NODE_SIZE
      if (isNumber(cfg.size)) {
        r = cfg.size / 2
      } else if (isArray(cfg.size)) {
        r = cfg.size[0] / 2
      }
      const style = cfg.style || {}
      const colorSet = cfg.colorSet || colorSets[0]

      // halo for hover
      group.addShape('circle', {
        attrs: {
          x: 0,
          y: 0,
          r: r + 5,
          fill: colorSet.activeStroke,
          opacity: 0.2,
          lineWidth: 0
        },
        name: 'halo-shape',
        visible: false
      })

      //main circle
      const keyShape = group.addShape('circle', {
        attrs: {
          ...style,
          x: 0,
          y: 0,
          r,
          fill: colorSet.mainFill,
          stroke: colorSet.mainStroke,
          lineWidth: 2,
          cursor: 'pointer'
        },
        name: 'aggregated-node-keyShape'
      })

      //label
      let labelStyle = {}
      if (cfg.labelCfg) {
        labelStyle = Object.assign(labelStyle, cfg.labelCfg.style)
      }

      if (cfg.label) {
        const text = cfg.label
        let labelStyle = {}
        let refY = 0
        if (cfg.labelCfg) {
          labelStyle = Object.assign(labelStyle, cfg.labelCfg.style)
          refY += cfg.labelCfg.refY || 0
        }
        let offsetY = 0
        const fontSize = labelStyle.fontSize < 8 ? 8 : labelStyle.fontSize
        const lineNum = cfg.labelLineNum || 1
        offsetY = lineNum * (fontSize || 12)
        group.addShape('text', {
          attrs: {
            text,
            x: 0,
            y: r + refY + offsetY + 6,
            textAlign: 'center',
            textBaseLine: 'alphabetic',
            cursor: 'pointer',
            fontSize,
            fill: colorSet.mainStroke,
            opacity: 0.85,
            fontWeight: 500,
            zIndex: 999
          },
          name: 'text-shape',
          className: 'text-shape'
        })
      }

      // tag
      if (cfg.new) {
        group.addShape('circle', {
          attrs: {
            x: r - 3,
            y: -r + 3,
            r: 4,
            fill: '#6DD400',
            lineWidth: 0.5,
            stroke: '#FFFFFF'
          },
          name: 'typeNode-tag-circle'
        })
      }

      return keyShape
    },
    setState: (name, value, item) => {
      const group = item.get('group')
      if (name === 'layoutEnd' && value) {
        const labelShape = group.find((e) => e.get('name') === 'text-shape')
        if (labelShape) labelShape.set('visible', true)
      } else if (name === 'hover') {
        if (item.hasState('focus')) {
          return
        }
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        const keyShape = item.getKeyShape()
        const colorSet = item.getModel().colorSet || colorSets[0]
        if (value) {
          halo && halo.show()
          keyShape.attr('fill', colorSet.activeFill)
        } else {
          halo && halo.hide()
          keyShape.attr('fill', colorSet.mainFill)
        }
      } else if (name === 'focus') {
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        const label = group.find((e) => e.get('name') === 'text-shape')
        if (value) {
          halo && halo.show()
          label && label.attr('fontWeight', 600)
        } else {
          halo && halo.hide()
          label && label.attr('fontWeight', 500)
        }
      } else if (name === 'active') {
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        halo && halo.show()
      } else if (name === 'inactive') {
        if (item.hasState('focus')) {
          return
        }
        const halo = group.find((e) => e.get('name') === 'halo-shape')
        halo && halo.hide()
      }
    },
    update: undefined
  },
  'model-node'
)

//自定义子边
G6.registerEdge(
  'custom-line',
  {
    setState: (name, value, item) => {
      const group = item.get('group')
      const model = item.getModel()
      if (name === 'focus') {
        const keyShape = group.find((ele) => ele.get('name') === 'edge-shape')
        const arrow = model.style.endArrow
        if (value) {
          if (keyShape.cfg.animation) {
            keyShape.stopAnimate(true)
          }
          if (!model.isReal && model.type === 'real-node') {
            const lineDash = keyShape.attr('lineDash')
            const totalLength = lineDash[0] + lineDash[1]
            let index = 0
            keyShape.animate(
              () => {
                index++
                if (index > totalLength) {
                  index = 0
                }
                const res = {
                  lineDash,
                  lineDashOffset: -index
                }
                return res
              },
              {
                repeat: true,
                duration
              }
            )
          }
        } else {
          keyShape.stopAnimate()
        }
      } else if (name === 'inactive') {
        const keyShape = group.find((ele) => ele.get('name') === 'edge-shape')
        const { endArrow } = model.style
        keyShape.attr('stroke', '#EAEAEA')
        keyShape.attr('endArrow', { ...endArrow, fill: '#EAEAEA' })
      } else {
        const keyShape = group.find((ele) => ele.get('name') === 'edge-shape')
        const { endArrow } = model.style
        keyShape.attr('stroke', '#A5ABB6')
        keyShape.attr('endArrow', { ...endArrow, fill: '#A5ABB6' })
      }
    }
  },
  //#TODO
  // 'quadratic'
  'line'
)

//自定义聚合节点(combo)
G6.registerCombo(
  'cRect',
  {
    drawShape: function drawShape(cfg, group) {
      const self = this
      // 获取配置中的 Combo 内边距
      cfg.padding = cfg.padding || [50, 20, 20, 20]
      // 获取样式配置，style.width 与 style.height 对应 rect Combo 位置说明图中的 width 与 height
      const style = self.getShapeStyle(cfg)
      // 绘制一个矩形作为 keyShape，与 'rect' Combo 的 keyShape 一致
      const rect = group.addShape('rect', {
        attrs: {
          ...style,
          x: -style.width / 2 - (cfg.padding[3] - cfg.padding[1]) / 2,
          y: -style.height / 2 - (cfg.padding[0] - cfg.padding[2]) / 2,
          width: style.width,
          height: style.height,
          radius: [10, 10]
        },
        draggable: true,
        name: 'combo-keyShape'
      })
      rect.toFront()
      // 增加右侧圆
      // group.addShape('circle', {
      //   attrs: {
      //     ...style,
      //     fill: '#fff',
      //     opacity: 1,
      //     // cfg.style.width 与 cfg.style.heigth 对应 rect Combo 位置说明图中的 innerWdth 与 innerHeight
      //     x: cfg.style.width / 2 + cfg.padding[1],
      //     y: (cfg.padding[2] - cfg.padding[0]) / 2,
      //     r: 5
      //   },
      //   draggable: true,
      //   name: 'combo-circle-shape'
      // })
      return rect
    },
    // 定义新增的右侧圆的位置更新逻辑
    afterUpdate: function afterUpdate(cfg, combo) {
      const group = combo.get('group')
      // 在该 Combo 的图形分组根据 name 找到右侧圆图形
      const circle = group.find(
        (ele) => ele.get('name') === 'combo-circle-shape'
      )
      // 更新右侧圆位置
      // circle.attr({
      //   // cfg.style.width 与 cfg.style.heigth 对应 rect Combo 位置说明图中的 innerWdth 与 innerHeight
      //   x: cfg.style.width / 2 + cfg.padding[1],
      //   y: (cfg.padding[2] - cfg.padding[0]) / 2
      // })
    }
  },
  'rect'
)

export default G6
