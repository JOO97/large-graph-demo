<template>
  <div :style="{ height, width, position: 'relative' }" ref="wrapper">
    <CanvasMenu
      v-if="showMenu"
      :edgeLabelVisible="edgeLabelVisible"
      :enableSearch="enableSearch"
      :enableSelectPathEnd="enableSelectPathEnd"
      :edgeVisible="edgeVisible"
      @update-props="setCanvasMenuProps"
      @on-search-node="handleSearchNode"
      @on-fit-view="handleFitView"
      @on-find-path="handleFindPath"
      @on-click="
        $emit('on-click-menu', {
          menuType: 'createModel',
          data: {}
        })
      "
    >
      <template slot-scope="option">
        <a-alert
          :message="option.customData.text"
          :type="option.customData.type ? option.customData.type : 'info'"
          show-icon
        />
      </template>
    </CanvasMenu>
    <div :id="id" />
  </div>
</template>

<script>
//样式插入组件
import insertCss from 'insert-css'

//g6
import defaultGraphData from './data.json'
import G6 from './g6'
import {
  processNodesEdges,
  getForceLayoutConfig,
  cacheNodePositions,
  labelFormatter,
  labelMaxLength
} from './utils'
const { findShortestPath } = G6.Algorithm
const { uniqueId } = G6.Util

//utils
import { deepClone } from './utils/utils'

//color
import { defaultColors } from './config/graphStyle'

//components
import CanvasMenu from '../CanvasMenu'

import {
  contextMenuStyle,
  defaultContextMenuContent
} from './config/contextMenu'
insertCss(contextMenuStyle)

import { tooltipStyle, defaultTooltip } from './config/tooltip'
insertCss(tooltipStyle)

function refreshDragedNodePosition(e) {
  const model = e.item.get('model')
  model.fx = e.x
  model.fy = e.y
}

const DEFAULTNODESIZE = 100

let nodeMap = {}
let modelNodeMap = {}
let comboNodeMap = {}

let hiddenItemIds = [] // 隐藏的元素 id 数组
let largeGraphMode = true
let cachePositions = {}
let manipulatePosition = undefined

let layout = {
  type: '',
  instance: null,
  destroyed: true
}

let shiftKeydown = false
let CANVAS_WIDTH = 800,
  CANVAS_HEIGHT = 800

const defaultBackColor = '#fff'
const disableColor = '#777'
const theme = 'default'

//随机颜色
const uniqueNodes = {}
function getRandomNumberByRange(start, end) {
  return Math.floor(Math.random() * (end - start) + start)
}

export default {
  props: {
    data: {
      type: Object,
      default: () => {
        return defaultGraphData
      }
    },
    id: {
      type: String,
      default: 'container'
    },
    height: {
      type: String,
      required: false,
      default: '100vh'
    },
    width: {
      type: String,
      required: false,
      default: '100%'
    },
    showMenu: {
      type: Boolean,
      required: false,
      default: true
    },
    tooltip: {
      type: Object,
      require: false,
      default: () => defaultTooltip
    },
    contextMenu: {
      type: Object,
      require: false,
      default: () => defaultContextMenuContent
    },
    //布局类型
    layout: {
      // 'force' | 'gForce' | 'dagre' | 'radial' | 'comboForce'
      type: String,
      required: false,
      default: 'force'
    },
    containerStyle: {
      type: Object,
      required: false,
      default: () => {
        return {
          backgroundColor: '#F9FCFF',
          border: '2px solid #DBE7F2'
        }
      }
    }
  },
  components: {
    CanvasMenu
  },
  data() {
    return {
      graph: null,
      clusteredData: '',
      originalData: { nodes: [], edges: [] },
      edgeLabelVisible: true, //边标签
      edgeVisible: true, //是否显示边
      enableSearch: false, //检索模式
      enableSelectPathEnd: false, //检索路径模式
      colorSets: [], //节点颜色
      layoutConfig: {
        force: {}
      }
    }
  },
  computed: {
    isGForce() {
      return this.layout === 'gForce'
    }
  },
  watch: {
    data: {
      handler(nVal) {
        if (!nVal) return
        if (!this.graph) return this.init()
        this.updateNodesAndEdges()
      },
      deep: true
    },
    edgeLabelVisible(nVal) {
      const { graph } = this
      if (!graph || graph.get('destroyed')) return
      graph.getEdges().forEach((edge) => {
        const oriLabel = edge.getModel().oriLabel
        edge.update({
          label: nVal ? labelFormatter(oriLabel, labelMaxLength) : ''
        })
      })
    },
    edgeVisible(nVal) {
      this.updateNodesAndEdges()
    }
  },
  methods: {
    init() {
      const {
        id,
        edgeLabelVisible,
        tooltip: tooltipConfig,
        edgeVisible,
        layout,
        isGForce,
        containerStyle
      } = this
      const container = document.getElementById(id)

      //set container style
      const styleKeys = Object.keys(containerStyle)
      if (styleKeys && styleKeys.length) {
        styleKeys.map((key) => {
          container.style[key] = containerStyle[key]
        })
      }

      const wrapper = this.$refs.wrapper.getBoundingClientRect()
      CANVAS_WIDTH = wrapper.width
      CANVAS_HEIGHT = wrapper.height

      const { mEdges, mNodes } = this.getGraphData()
      const { edges: processedEdges } = processNodesEdges(
        mNodes,
        mEdges,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        largeGraphMode,
        edgeLabelVisible,
        true,
        cachePositions,
        undefined,
        edgeVisible,
        comboNodeMap
      )
      let tooltip
      if (tooltipConfig) {
        tooltip = new G6.Tooltip(tooltipConfig)
      }
      this.graph = new G6.Graph({
        container: id,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        fitCenter: true,
        linkCenter: true,
        minZoom: 0.1,
        groupByTypes: false,
        modes: {
          default: [
            {
              type: 'drag-canvas',
              enableOptimize: true
            },
            {
              type: 'zoom-canvas',
              enableOptimize: true,
              optimizeZoom: 0.01
            },
            'shortcuts-call',
            {
              type: 'create-edge',
              trigger: 'click',
              key: 'shift',
              edgeConfig: {
                type: 'custom-edge'
              },
              shouldBegin: (e) => {
                if (this.enableSelectPathEnd) return false
                return true
              }
            },
            {
              type: 'activate-relations',
              trigger: 'mouseenter',
              activeState: 'hover',
              inactiveState: 'inactive',
              resetSelected: false,
              shouldUpdate: (e) => {
                if (this.enableSelectPathEnd || !this.isVisible) return false
                return true
              }
            },
            {
              type: 'drag-combo',
              onlyChangeComboSize: true
            },
            {
              type: 'collapse-expand-combo',
              trigger: 'click',
              relayout: false // 收缩展开后，不重新布局
            },
            {
              type: 'drag-node',
              onlyChangeComboSize: true
            }
          ],
          lassoSelect: [
            {
              type: 'zoom-canvas',
              enableOptimize: true,
              optimizeZoom: 0.01
            },
            {
              type: 'lasso-select',
              selectedState: 'focus',
              trigger: 'drag'
            }
          ],
          fisheyeMode: []
        },
        defaultNode: {
          type: 'model-node',
          size: DEFAULTNODESIZE
        },
        defaultEdge: {
          type: 'custom-line',
          style: {
            stroke: '#F6BD16',
            lineWidth: 2,
            endArrow: true
          }
        },
        defaultCombo: {
          type: 'rect',
          labelCfg: {
            refY: -15
          },
          style: {
            fill: '#D3E5F7',
            stroke: 'DBE7F2',
            lineWidth: 1,
            fillOpacity: 1,
            strokeOpacity: 1
          }
        },
        plugins: [this.setContextMenu(), tooltip ? tooltip : ''],
        layout: !isGForce ? this.getLayoutConfig(layout) : undefined
      })
      this.graph.get('canvas').set('localRefresh', false)
      if (isGForce) {
        this.setGForce({ nodes: mNodes, edges: processedEdges })
      }
      this.bindListener(this.graph)
      this.graph.data({
        nodes: mNodes,
        edges: [
          ...processedEdges,
          ...this.data.edges
            .filter((edge) => edge.combo)
            .map((edge) => {
              return {
                ...edge,
                source: modelNodeMap[edge.source].id,
                target: modelNodeMap[edge.target]
                  ? modelNodeMap[edge.target].id
                  : edge.target,
                label: edge.customLabel,
                labelCfg: {
                  autoRotate: true,
                  style: {
                    fill: '#000',
                    stroke: '#F9FCFF',
                    lineWidth: 6,
                    fontSize: 16,
                    lineAppendWidth: 5,
                    fillOpacity: 1
                  }
                },
                style: {
                  stroke: '#A5ABB6',
                  endArrow: true
                },
                type: 'custom-line',
                visible: edgeVisible
              }
            })
        ],
        combos: this.data.combos ?? []
      })
      this.graph.render()
      const combos = this.graph.getCombos()
      combos.forEach((combo) => {
        combo.toFront()
      })
      const nodes = this.graph.getNodes()
      nodes.forEach((node) => {
        node.toFront()
      })
    },
    //gForce layout
    setGForce({ nodes, edges }) {
      const layoutConfig = getForceLayoutConfig(
        this.graph,
        null,
        null,
        nodeMap,
        modelNodeMap
      )
      layoutConfig.center = [CANVAS_WIDTH / 3, CANVAS_HEIGHT / 2]
      layout.instance = new G6.Layout['gForce'](layoutConfig)
      layout.instance.init({
        nodes,
        edges
      })
      layout.instance.execute()
    },
    getLayoutConfig(type) {
      let config = {}
      switch (type) {
        case 'force':
          config = {
            type: 'force',
            collideStrength: 0.8,
            alphaDecay: 0.028,
            alphaMin: 0.001,
            preventOverlap: true,
            nodeSize: (d) => {
              if (d.size) return d.size
              return 50
            },
            center: [CANVAS_WIDTH / 3, CANVAS_HEIGHT / 2],
            nodeStrength: (d) => {
              let nodeStrength = 1500
              // if (d.level) return nodeStrength / 2
              if (d.comboId) return 100
              return nodeStrength
            },
            nodeSpacing: (d) => {
              let nodeSpacing = 10
              if (d.comboId) return nodeSpacing / 2
              if (d.degree === 0) return nodeSpacing * 2
              return nodeSpacing
            },
            linkDistance: (d) => {
              let linkDistance = 50
              const targetId = d.target.id.split('$')[0]
              const sourceId = d.source.id.split('$')[0]
              const sourceNode = nodeMap[sourceId] || modelNodeMap[sourceId]
              const targetNode = nodeMap[targetId] || modelNodeMap[targetId]
              if (!sourceNode || !targetNode) return linkDistance * 0.5
              // 两端都是模型节点
              if (sourceNode.level === -1 && targetNode.level === -1)
                return linkDistance * 1.5
              // 一端是模型节点，一端是属性节点
              else if (sourceNode.level || targetNode.level)
                return linkDistance * 0.5
              return linkDistance
            }
            // onTick: () => {
            //   this.graph.refreshPositions()
            //   const nodeItems = this.graph.getNodes()
            //   const height = this.graph.get('height')
            //   const width = this.graph.get('width')
            //   const padding = 10
            //   nodeItems.forEach(item => {
            //     const model = item.getModel()
            //     if (model.x > width - padding) model.x = width - padding
            //     else if (model.x < padding) model.x = padding
            //     if (model.y > height - padding) model.y = height - padding
            //     else if (model.y < padding) model.y = padding
            //   })
            // }
          }
          break
        case 'dagre':
          config = {
            type: 'dagre',
            begin: [CANVAS_WIDTH, CANVAS_HEIGHT / 2],
            rankdir: 'TB', // 可选，布局的方向
            align: 'DL', // 可选
            nodesep: 20, // 可选
            ranksep: 50, // 可选
            controlPoints: true, // 可选
            sortByCombo: false
          }
          break
        case 'radial':
          config = {
            type: 'radial',
            unitRadius: 50,
            preventOverlap: true,
            maxPreventOverlapIteration: 100
          }
          break
        case 'comboForce':
          config = {
            type: 'comboForce',
            preventOverlap: true,
            preventNodeOverlap: true,
            preventComboOverlap: true,
            collideStrength: 0.4, //统一设置防止节点之间以及 combo 之间重叠的力强度
            // comboCollideStrength: 0.4,
            // nodeCollideStrength: 0.5,
            comboSpacing: 15, //防止重叠时 combo 边缘间距的最小值
            comboPadding: 10, //Combo 内部的 padding 值
            gravity: 15,
            comboGravity: 5, //每个combo 内部的重力大小，影响聚类的紧凑程度
            linkDistance: 120, //对comboEdge无效,
            nodeStrength: (d) => {
              if (d.comboId) return 0
              return 130
            }, // 可选
            edgeStrength: 0.8, // 可选
            nodeSpacing: (d) => {
              if (d.comboId) return 10
              return 100
            },
            onTick: () => {},
            onLayoutEnd: () => {}
          }
          break
        default:
          console.error('unknown layout name')
          break
      }
      return config
    },
    //获取节点颜色配置
    getColorSets(color) {
      return G6.Util.getColorSetsBySubjectColors(
        color,
        defaultBackColor,
        theme,
        disableColor
      )
    },
    //更新节点、边
    updateNodesAndEdges() {
      const { edgeLabelVisible } = this
      cachePositions = cacheNodePositions(this.graph.getNodes())
      const { mEdges, mNodes } = this.getGraphData()
      this.handleRefreshGraph(
        this.graph,
        { nodes: mNodes, edges: mEdges },
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        largeGraphMode,
        edgeLabelVisible,
        false
      )
    },
    //处理节点、边数据
    getGraphData() {
      const data = deepClone(this.data)
      // const { data } = this
      const tempNodeMap = {}
      const tempModelNodeMap = {}
      const tempComboNodeMap = {}
      const clusteredData = { edges: [], nodes: [] }
      let mNodes = [],
        mEdges = []

      data.nodes
        .filter((item) => item.nodeType === 1 || item.nodeType === undefined)
        .map((item, i) => {
          if (!item.color) {
            const key = item.parent ? item.parent : item.id
            if (!uniqueNodes[key]) {
              uniqueNodes[key] =
                defaultColors[
                  getRandomNumberByRange(
                    0,
                    Object.keys(defaultColors).length - 1
                  )
                ].color
            }
            item.color = uniqueNodes[key]
          }
          const [colorSet] = this.getColorSets([item.color])
          this.colorSets[i] = colorSet
          if (typeof item.id === 'number') item.id += ''
          const [originalId] = item.id.split('$')
          const nodeUniqueId = uniqueId(originalId)
          let extraAttrs = {}
          if (item.image) {
            extraAttrs = {
              type: 'image-node',
              img: item.image,
              style: {
                stroke: '#eaff8f',
                lineWidth: 5
              }
            }
          }
          const nodeObj = {
            ...item,
            level: -1,
            label: item.name,
            colorSet,
            idx: i,
            type: 'model-node',
            expandCNodes: modelNodeMap[item.id]
              ? modelNodeMap[item.id].expandCNodes
              : false, //是否展示子节点
            showLoopEdge: true, //是否显示自环边
            id: nodeUniqueId,
            oriId: originalId,
            ...extraAttrs
          }

          const children = data.nodes
            .filter((cNode) => cNode.nodeType === 2 && cNode.pId === originalId)
            .map((cNode, i2) => {
              const [cOriginalId] = cNode.id.split('$')
              const cNodeObj = {
                ...cNode,
                level: 0,
                label: cNode.name,
                colorSet,
                type: 'real-node',
                pId: originalId,
                id: uniqueId(cOriginalId),
                oriId: cOriginalId
              }
              tempNodeMap[cOriginalId] = cNodeObj
              return cNodeObj
            })
          nodeObj.children = children
          nodeObj.count = children.length - 1
          clusteredData.nodes[i] = {
            ...nodeObj,
            id: nodeUniqueId,
            nodes: children
          }
          tempModelNodeMap[originalId] = nodeObj
          const node = [nodeObj]
          if (nodeObj.expandCNodes && children.length) {
            node.push(...children)
            children.map((cNode) => {
              mEdges.push({
                source: nodeUniqueId,
                target: cNode.id,
                label: '',
                oriLabel: '',
                level: 0,
                style: { endArrow: false },
                id: uniqueId('edge')
              })
            })
          }
          mNodes.push(...node)
        })

      data.edges
        .filter((edge) => !edge.combo)
        .map((edge, i) => {
          const source = tempModelNodeMap[edge.source]
            ? tempModelNodeMap[edge.source].id
            : edge.source
          const target = tempModelNodeMap[edge.target]
            ? tempModelNodeMap[edge.target].id
            : edge.target
          const edgeObj = {
            ...edge,
            label: '',
            oriLabel: edge.customLabel
              ? edge.customLabel
              : `${edge.source}-${edge.target}`,
            id: uniqueId('edge'),
            level: -1,
            source,
            target
          }
          mEdges.push(edgeObj)
          clusteredData.edges[i] = {
            ...edgeObj,
            source,
            target
          }
        })
      if (data.combos) {
        data.combos.map((item) => {
          const [comboId] = item.id.split('$')
          const comboUniqueId = uniqueId(comboId)
          tempComboNodeMap[comboId] = {
            ...item,
            oriId: comboUniqueId
          }
        })
      }
      nodeMap = tempNodeMap
      modelNodeMap = tempModelNodeMap
      comboNodeMap = tempComboNodeMap
      this.originalData.nodes = mNodes
      this.originalData.edges = mEdges
      this.clusteredData = clusteredData

      return {
        mEdges,
        mNodes,
        clusteredData
      }
    },
    //context menu
    setContextMenu() {
      const { contextMenu } = this
      return new G6.Menu({
        shouldBegin(evt) {
          if (evt.target && evt.target.isCanvas && evt.target.isCanvas())
            return true
          if (evt.item) return true
          return false
        },
        //content
        ...contextMenu,
        handleMenuClick: (target, item) => {
          const model = item && item.getModel()
          const liIdStrs = target.id.split('$')
          switch (liIdStrs[0]) {
            case 'showCNode':
              if (model.children && model.children.length) {
                this.updateNodeMap({ model })
              } else {
                modelNodeMap[model.oriId].expandCNodes = true
                manipulatePosition = { id: model.oriId, x: model.x, y: model.y }
                this.$emit('on-click-menu', {
                  menuType: liIdStrs[0],
                  data: model
                })
              }
              break
            case 'hideCNode':
              this.updateNodeMap({ model })
              break
            default:
              this.$emit('on-click-menu', {
                menuType: liIdStrs[0],
                data: model
              })
              break
          }
        },
        offsetX: 16 + 10,
        offsetY: 0,
        itemTypes: ['node', 'edge', 'canvas']
      })
    },
    updateNodeMap({ model }) {
      const { level, x, y, oriId } = model
      if (level !== -1 || !modelNodeMap[oriId]) return
      manipulatePosition = { id: oriId, x, y }
      modelNodeMap[oriId].expandCNodes = !model.expandCNodes
      this.updateNodesAndEdges()
    },
    //展开节点后的数据
    getAfterExpandNodeData({ model }) {
      const { originalData } = this
      const { level, id: currentId } = model
      if (level !== -1) return
      const edges = [...originalData.edges],
        nodes = []
      Object.keys(modelNodeMap).map((id) => {
        if (id === currentId) {
          modelNodeMap[id].expandCNodes = !modelNodeMap[id].expandCNodes
        }
        nodes.push(modelNodeMap[id])
        let children = []
        if (modelNodeMap[id].expandCNodes) {
          children = modelNodeMap[id].children
        }
        nodes.push(...children)
        children.map((item) => {
          edges.push({
            source: id,
            target: item.id,
            label: '',
            level: 0,
            style: { endArrow: false }
          })
        })
      })
      return { nodes, edges }
    },
    // 事件绑定
    bindListener(graph) {
      const { layout } = this
      graph.on('node:dragstart', (e) => {
        if (layout === 'comboForce') {
          console.log('node:dragstart')
          return
        }
        if (layout === 'force') {
          graph.layout()
          refreshDragedNodePosition(e)
        }
      })
      graph.on('node:drag', (e) => {
        if (layout === 'comboForce') {
          console.log('node:drag')
          return
        }
        if (layout === 'force') {
          const forceLayout = graph.get('layoutController').layoutMethods[0]
          forceLayout.execute()
          refreshDragedNodePosition(e)
        }
      })
      graph.on('node:dragend', (e) => {})
      graph.on('combo:dragend', (evt) => {
        const { item } = evt
        const model = item.getModel()
        const edges = graph.getEdges()
        edges.forEach((edge) => {
          edge.toBack()
        })
      })

      graph.on('keydown', (evt) => {
        const code = evt.key
        if (!code) {
          return
        }
        if (code.toLowerCase() === 'shift') {
          shiftKeydown = true
        } else {
          shiftKeydown = false
        }
      })

      graph.on('keyup', (evt) => {
        const code = evt.key
        if (!code) {
          return
        }
        if (code.toLowerCase() === 'shift') {
          shiftKeydown = false
        }
      })

      graph.on('node:mouseenter', (evt) => {
        const { item } = evt
        const model = item.getModel()
        model.oriFontSize = model.labelCfg.style.fontSize
        // item.update({
        //   label: model.oriLabel
        // })
        // model.oriLabel = currentLabel
        graph.setItemState(item, 'hover', true)
        item.toFront()
      })

      graph.on('node:mouseleave', (evt) => {
        const { item } = evt
        // const model = item.getModel()
        // const currentLabel = model.label
        // item.update({
        //   label: model.oriLabel
        // })
        // model.oriLabel = currentLabel
        graph.setItemState(item, 'hover', false)
      })

      graph.on('edge:mouseenter', (evt) => {
        const { item } = evt
        const model = item.getModel()
        const currentLabel = model.label
        item.update({
          label: model.oriLabel
        })
        model.oriLabel = currentLabel
        console.log('model', model)
        if (!model.isComboEdge) {
          item.toFront()
        }
        const source = item.getSource().getModel()
        const target = item.getTarget().getModel()
        if (source.type !== 'rect') {
          item.getSource().toFront()
        } else {
          // item.getSource().toBack()
        }
        if (target.type !== 'rect') {
          item.getTarget().toFront()
        } else {
          // item.getTarget().toBack()
        }
      })

      graph.on('edge:mouseleave', (evt) => {
        const { item } = evt
        const model = item.getModel()
        const currentLabel = model.label
        item.update({
          label: model.oriLabel
        })
        model.oriLabel = currentLabel
        // item.toBack()
      })

      graph.on('node:click', (evt) => {
        const { item } = evt
        this.$emit('on-click-node', { data: item.getModel() })
        this.stopLayout()
        if (!shiftKeydown) this.clearFocusItemState(graph)
        else this.clearFocusEdgeState(graph)
        graph.setItemState(item, 'focus', true)
        if (!shiftKeydown) {
          const relatedEdges = item.getEdges()
          relatedEdges.forEach((edge) => {
            graph.setItemState(edge, 'focus', true)
          })
        }
      })

      graph.on('edge:click', (evt) => {
        const { item } = evt
        this.stopLayout()
        if (!shiftKeydown) this.clearFocusItemState(graph)
        graph.setItemState(item, 'focus', true)
      })

      graph.on('canvas:click', (evt) => {
        this.clearFocusItemState(graph)
      })

      graph.on('aftercreateedge', (e) => {
        const { target, source, id } = e.edge.getModel()
        const item = this.graph.findById(id)
        const { level: tLevel } = this.graph.findById(target).getModel()
        const { level: sLevel } = this.graph.findById(source).getModel()
        if (!tLevel || !sLevel) {
          this.$emit('show-message', {
            type: 'warning',
            msg: '只能在模型节点之间建立关系!'
          })
          this.graph.removeItem(item)
          return
        }
        this.$emit('on-click-menu', {
          menuType: 'createEdge',
          data: { target, source }
        })
        this.graph.removeItem(item)
      })

      graph.on('afteractivaterelations', (e) => {
        const neighbors = this.graph.getNeighbors(e.item)
        const state = e.action === 'activate' ? true : false
        neighbors.map((neighbor) => {
          const { id } = neighbor.getModel()
          if (neighbor.hasState('focus')) return
          this.graph.setItemState(id, 'focus', state)
        })
      })

      graph.on('combo:click', (e) => {
        console.log('combo:click', e, e.target.get('name'))
        if (e.target.get('name') === 'combo-marker-shape') {
          graph.collapseExpandCombo(e.item)

          if (graph.get('layout')) graph.layout()
          else graph.refreshPositions()
        }
      })
    },
    // 清除focus状态及相应样式
    clearFocusItemState(graph) {
      if (!graph) return
      this.clearFocusNodeState(graph)
      this.clearFocusEdgeState(graph)
    },
    // 清除图上所有节点的 focus 状态及相应样式
    clearFocusNodeState(graph) {
      const focusNodes = graph.findAllByState('node', 'focus')
      focusNodes.forEach((fnode) => {
        graph.setItemState(fnode, 'focus', false) // false
      })
    },
    // 清除图上所有边的 focus 状态及相应样式
    clearFocusEdgeState(graph) {
      const focusEdges = graph.findAllByState('edge', 'focus')
      focusEdges.forEach((fedge) => {
        graph.setItemState(fedge, 'focus', false)
      })
    },
    //隐藏指定元素
    hideItems(graph) {
      hiddenItemIds.forEach((id) => {
        graph.hideItem(id)
      })
    },
    //展示指定元素
    showItems(graph) {
      graph.getNodes().forEach((node) => {
        if (!node.isVisible()) graph.showItem(node)
      })
      graph.getEdges().forEach((edge) => {
        if (!edge.isVisible()) edge.showItem(edge)
      })
      hiddenItemIds = []
    },
    stopLayout() {
      if (layout.instance) {
        layout.instance.stop()
      }
    },
    //refresh
    handleRefreshGraph(
      graph,
      graphData,
      width = CANVAS_WIDTH,
      height = CANVAS_HEIGHT,
      largeGraphMode = false,
      edgeLabelVisible = false,
      isNewGraph = false
    ) {
      if (!graphData || !graph) return
      this.clearFocusItemState(graph)
      // reset the filtering
      graph.getNodes().forEach((node) => {
        if (!node.isVisible()) node.show()
      })
      graph.getEdges().forEach((edge) => {
        if (!edge.isVisible()) edge.show()
      })

      let nodes = [],
        edges = []
      const processRes = processNodesEdges(
        graphData.nodes,
        graphData.edges || [],
        width,
        height,
        largeGraphMode,
        edgeLabelVisible,
        isNewGraph,
        cachePositions,
        manipulatePosition,
        this.edgeVisible,
        comboNodeMap
      )

      edges = processRes.edges
      nodes = graphData.nodes

      graph.changeData({ nodes, edges })

      graph.getNodes().forEach((node) => {
        node.toFront()
      })
      // force 需要使用不同 id 的对象才能进行全新的布局，否则会使用原来的引用。因此复制一份节点和边作为 force 的布局数据
      if (layout.instance) {
        layout.instance.init({
          nodes,
          edges
        })

        layout.instance.getMass = (d) => {
          const cachePosition = cachePositions[d.oriId]
          if (cachePosition) return 5
          return 1
        }

        layout.instance.execute()
      }
      return { nodes, edges }
    },
    //canvas-menu func
    setCanvasMenuProps(key) {
      this[key] = !this[key]
    },
    //检索节点
    handleSearchNode({ keyword, cb }) {
      const { graph } = this
      if (!graph || graph.get('destroyed')) return false
      const uniqueId = modelNodeMap[keyword]?.id
      let item = graph.findById(uniqueId)
      const findNodes = graph.findAll('node', (node) => {
        const nName = node.get('model').name
        return nName.indexOf(keyword) !== -1
      })
      if (!findNodes || !findNodes.length) return cb(false)
      this.clearFocusItemState(graph)
      findNodes.map((item) => {
        const { id } = item.getModel()
        graph.setItemState(id, 'focus', true)
        const relatedEdges = item.getEdges()
        relatedEdges.forEach((edge) => {
          graph.setItemState(edge, 'focus', true)
        })
      })
      return cb(true)
    },
    //适配屏幕
    handleFitView() {
      const { graph } = this
      if (!graph || graph.destroyed) return
      graph.fitView(40)
    },
    //检索最短路径
    handleFindPath({ cb }) {
      const { graph, originalData } = this
      if (!graph || graph.get('destroyed')) return false
      const selectedNodes = graph.findAllByState('node', 'focus')
      if (selectedNodes.length !== 2) {
        cb({ status: false, text: '请选择有且两个节点！', type: 'warning' })
        return
      }
      let flag = true
      selectedNodes.map((item) => {
        if (!item.getModel().level) flag = false
      })
      if (!flag)
        return cb({ status: false, text: '请选择模型节点!', type: 'warning' })
      const nodes = originalData.nodes.map((item) => {
        return {
          id: item.id,
          label: item.label
        }
      })
      const edges = originalData.edges.map((item) => {
        return {
          source: item.source,
          target: item.target
        }
      })
      this.clearFocusItemState(graph)
      const { path } = findShortestPath(
        { nodes, edges },
        selectedNodes[0].getID(),
        selectedNodes[1].getID(),
        false, //方向性
        false //边的权重
      )
      if (!path)
        return cb({
          status: false,
          text: '节点之间无最短路径',
          type: 'warning'
        })
      graph.getEdges().forEach((edge) => {
        const edgeModel = edge.getModel()
        const source = edgeModel.source
        const target = edgeModel.target
        const sourceInPathIdx = path.indexOf(source)
        const targetInPathIdx = path.indexOf(target)
        if (sourceInPathIdx === -1 || targetInPathIdx === -1) return
        if (Math.abs(sourceInPathIdx - targetInPathIdx) === 1) {
          edge.toFront()
          graph.setItemState(edge, 'focus', true)
        }
      })
      path.forEach((id) => {
        const pathNode = graph.findById(id)
        pathNode.toFront()
        graph.setItemState(pathNode, 'focus', true)
      })
    }
  }
}
</script>
