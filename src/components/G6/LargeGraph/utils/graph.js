import G6 from './g6'
const { uniqueId } = G6.Util

const NODESIZEMAPPING = 'degree'
const SMALLGRAPHLABELMAXLENGTH = 6
export let labelMaxLength = SMALLGRAPHLABELMAXLENGTH
//默认节点大小
const DEFAULTNODESIZE = 60
//默认子节点大小
const CHILDNODESIZE = 20

const NODE_LIMIT = 40

let manipulatePosition = undefined
let descreteNodeCenter

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
      default: {
        stroke: '#A5ABB6',
        opacity: 1,
        strokeOpacity: 1,
        lineWidth: 1
      },
      dash: {
        stroke: '#A5ABB6',
        opacity: 0.8,
        strokeOpacity: 0.8,
        lineWidth: 1
      }
    },
    labelCfg: {
      style: {
        fill: '#000',
        stroke: '#F9FCFF',
        lineWidth: 6,
        fontSize: 16,
        lineAppendWidth: 5,
        fillOpacity: 1
      }
    },
    stateStyles: {
      focus: {
        stroke: '#fff' // '#3C9AE8',
      }
    }
  }
}

const zhPattern = new RegExp('[\u4E00-\u9FA5]+')

const calculateTextLength = text => {
  let length = 0
  for (let i = 0; i < text.length; i++) {
    if (zhPattern.test(text.charAt(i))) {
      length += 2
    } else {
      length += 1
    }
  }
  return length
}

// 截断长文本
const subString = (str, len, hasDot = true) => {
  var newLength = 0
  var newStr = ''
  var chineseRegex = /[^x00-xff]/g
  var singleChar = ''
  var strLength = str.replace(chineseRegex, '**').length
  for (var i = 0; i < strLength; i++) {
    singleChar = str.charAt(i).toString()
    if (singleChar.match(chineseRegex) != null) {
      newLength += 2
    } else {
      newLength++
    }
    if (newLength > len) {
      break
    }
    newStr += singleChar
  }

  if (hasDot && strLength > len) {
    newStr += '...'
  }
  return newStr
}

export const labelFormatter = (text, minLength = 10) => {
  // if (text && text.split('').length > minLength)
  //   return `${text.substr(0, minLength)}...`
  return text
}

export function randomHexColor() {
  var hex = Math.floor(Math.random() * 16777216).toString(16)
  while (hex.length < 6) {
    hex = '0' + hex
  }
  return '#' + hex
}

//比较函数
const descendCompare = p => {
  return function(m, n) {
    const a = m[p]
    const b = n[p]
    return b - a // 降序
  }
}

export const getForceLayoutConfig = (
  graph,
  largeGraphMode,
  configSettings,
  nodeMap,
  aggregatedNodeMap
) => {
  let {
    linkDistance,
    edgeStrength,
    nodeStrength,
    nodeSpacing,
    preventOverlap,
    nodeSize,
    collideStrength,
    alpha,
    alphaDecay,
    alphaMin
  } = configSettings || { preventOverlap: true }

  if (!linkDistance && linkDistance !== 0) linkDistance = 100
  if (!edgeStrength && edgeStrength !== 0) edgeStrength = 50
  if (!nodeStrength && nodeStrength !== 0) nodeStrength = 200
  if (!nodeSpacing && nodeSpacing !== 0) nodeSpacing = 10
  if (!nodeSize) nodeSize = 50
  const config = {
    type: 'gForce',
    minMovement: 0.01,
    maxIteration: 5000,
    preventOverlap,
    damping: 0.99,
    linkDistance: d => {
      const targetId = d.target.split('-')[0]
      const sourceId = d.source.split('-')[0]
      const sourceNode = nodeMap[sourceId] || aggregatedNodeMap[sourceId]
      const targetNode = nodeMap[targetId] || aggregatedNodeMap[targetId]
      if (!sourceNode || !targetNode) return linkDistance * 0.5
      // 两端都是模型节点
      if (sourceNode.level === -1 && targetNode.level === -1)
        return linkDistance * 1.5
      // 一端是模型节点，一端是属性节点
      else if (sourceNode.level || targetNode.level) return linkDistance * 0.2
      return linkDistance
    },
    edgeStrength: d => {
      const targetId = d.target.split('-')[0]
      const sourceId = d.source.split('-')[0]
      const sourceNode = nodeMap[sourceId] || aggregatedNodeMap[sourceId]
      const targetNode = nodeMap[targetId] || aggregatedNodeMap[targetId]
      if (!sourceNode || !targetNode) return edgeStrength * 2
      // 父节点之间的引力小
      if (sourceNode.level && targetNode.level) return edgeStrength / 2
      // 父节点与子节点之间引力大
      return edgeStrength * 2
    },
    nodeStrength: d => {
      if (d.level) return nodeStrength * 4
      return nodeStrength * 0.5
    },
    nodeSize: d => {
      if (!nodeSize && d.size) return d.size
      return 50
    },
    nodeSpacing: d => {
      if (d.degree === 0) return nodeSpacing * 2
      if (d.level) return nodeSpacing
      return nodeSpacing
    },
    onLayoutEnd: () => {
      if (largeGraphMode) {
        graph.getEdges().forEach(edge => {
          if (!edge.oriLabel) return
          edge.update({
            label: labelFormatter(edge.oriLabel, labelMaxLength)
          })
        })
      }
    },
    tick: () => {
      graph.refreshPositions()
    }
  }

  if (nodeSize) config['nodeSize'] = nodeSize
  if (collideStrength) config['collideStrength'] = collideStrength
  if (alpha) config['alpha'] = alpha
  if (alphaDecay) config['alphaDecay'] = alphaDecay
  if (alphaMin) config['alphaMin'] = alphaMin

  return config
}

/**
 * 处理节点、边数据
 */
export const processNodesEdges = (
  nodes,
  edges,
  width,
  height,
  largeGraphMode,
  edgeLabelVisible,
  isNewGraph = false,
  cachePositions,
  pNodePosition = undefined,
  edgeVisible = false,
  comboNodeMap = {}
) => {
  if (!nodes || nodes.length === 0) return {}
  const currentNodeMap = {}
  let extraLabelCfg = {}
  let maxNodeCount = -Infinity
  const paddingRatio = 0.3
  const paddingLeft = paddingRatio * width
  const paddingTop = paddingRatio * height
  nodes.forEach(node => {
    // node.type = node.level === -1 ? 'model-node' : 'real-node'
    node.isReal = true
    node.label = node.label ? node.label : node.oriId
    node.labelLineNum = undefined
    node.oriLabel = node.label
    node.label = subString(node.label, labelMaxLength)
    node.degree = 0
    node.inDegree = 0
    node.outDegree = 0

    if (currentNodeMap[node.oriId]) {
      console.warn('node exists already!', node.oriId)
      node.id = uniqueId(node.oriId)
    }
    currentNodeMap[node.oriId] = node
    if (node.count > maxNodeCount) maxNodeCount = node.count
    const cachePosition = cachePositions
      ? cachePositions[node.oriId]
      : undefined
    if (cachePosition) {
      node.x = cachePosition.x
      node.y = cachePosition.y
      node.new = false
    } else {
      node.new = isNewGraph ? false : true
      if (pNodePosition) {
        node.x = pNodePosition.x + 30 * Math.cos(Math.random() * Math.PI * 2)
        node.y = pNodePosition.y + 30 * Math.sin(Math.random() * Math.PI * 2)
      }
    }
  })
  let maxCount = -Infinity
  let minCount = Infinity
  // let maxCount = 0;
  edges.forEach(edge => {
    const targetId = edge.target.split('S')[0]
    const sourceId = edge.source.split('-')[0]
    if (!edge.id) edge.id = uniqueId('edge')
    // else if (edge.id.split('-')[0] !== 'edge') edge.id = `edge-${edge.id}`

    const sourceNode = currentNodeMap[sourceId]
      ? currentNodeMap[sourceId]
      : comboNodeMap[sourceId]
      ? comboNodeMap[sourceId]
      : null

    const targetNode = currentNodeMap[targetId]
      ? currentNodeMap[targetId]
      : comboNodeMap[targetId]
      ? comboNodeMap[targetId]
      : null
    if (!sourceNode || !targetNode) {
      console.warn(
        'edge source target does not exist',
        edge.source,
        edge.target,
        edge.id
      )
      return
    }
    // if (!sourceNode || !targetNode)
    //   console.warn(
    //     'source or target is not defined!!!',
    //     edge,
    //     sourceNode,
    //     targetNode
    //   )

    // calculate the degree
    // if (!sourceNode.degree) {
    //   sourceNode.degree = 0
    // }
    // if (!targetNode.degree) {
    //   targetNode.degree = 0
    // }
    // if (!sourceNode.outDegree) {
    //   sourceNode.outDegree = 0
    // }
    // if (!targetNode.outDegree) {
    //   targetNode.outDegree = 0
    // }
    sourceNode.degree++
    targetNode.degree++
    sourceNode.outDegree++
    targetNode.inDegree++

    if (edge.count > maxCount) maxCount = edge.count
    if (edge.count < minCount) minCount = edge.count
  })

  nodes.sort(descendCompare(NODESIZEMAPPING))
  const maxDegree = nodes[0].degree || 1

  const descreteNodes = []
  nodes.forEach((node, i) => {
    // assign the size mapping to the outDegree
    const countRatio = node.count / maxNodeCount
    // const isRealNode = node.level === 0;
    const isRealNode = true
    if (!node.size) {
      node.size =
        node.type === 'image' || node.level === -1
          ? DEFAULTNODESIZE
          : CHILDNODESIZE
    }
    if (node.type === 'image' && !node.clipCfg) {
      node.clipCfg = {
        show: true,
        type: 'circle',
        r: node.size / 2
      }
      // node.clipCfg = {
      //   show: true,
      //   type: 'rect',
      //   x: 0,
      //   y: 0,
      //   width: 50,
      //   height: 100
      // }
    }
    node.isReal = isRealNode
    node.labelCfg = {
      position: 'bottom',
      offset: 5,
      style: {
        fill: '#2a2c34',
        textAlign: 'center',
        textBaseLine: 'center',
        cursor: 'pointer',
        fontSize: 14,
        opacity: 1,
        fontWeight: 500
      }
    }

    if (!node.degree) {
      descreteNodes.push(node)
    }
  })

  const countRange = maxCount - minCount
  const minEdgeSize = 1
  const maxEdgeSize = 7
  const edgeSizeRange = maxEdgeSize - minEdgeSize

  // set edges' style
  edges.forEach(edge => {
    const targetId = edge.target.split('-')[0]
    const sourceId = edge.source.split('-')[0]

    const sourceNode = currentNodeMap[sourceId]
      ? currentNodeMap[sourceId]
      : comboNodeMap[sourceId]
      ? comboNodeMap[sourceId]
      : null

    const targetNode = currentNodeMap[targetId]
      ? currentNodeMap[targetId]
      : comboNodeMap[targetId]
      ? comboNodeMap[targetId]
      : null
    if (!sourceNode || !targetNode) {
      console.warn(
        'edge source target does not exist',
        edge.source,
        edge.target,
        edge.id
      )
      return
    }

    const size =
      ((edge.count - minCount) / countRange) * edgeSizeRange + minEdgeSize || 1
    edge.size = size

    const arrowWidth = Math.max(size / 2 + 2, 3)
    const arrowLength = 10

    const arrowBeging = targetNode.size + arrowLength
    let arrowPath = `M ${arrowBeging},0 L ${arrowBeging +
      arrowLength},-${arrowWidth} L ${arrowBeging +
      arrowLength},${arrowWidth} Z`
    let d = targetNode.size / 2 + arrowLength

    const isRealEdge = edge.level === -1 ? true : false
    edge.isReal = isRealEdge
    if (edge.source === edge.target) {
      edge.type = 'loop'
      arrowPath = G6.Arrow.triangle(4, 5, 5)
      d = 5
    }
    const edgeStyle = isRealEdge
      ? global.edge.style.default
      : global.edge.style.dash
    const dash = Math.max(size, 2)
    const lineDash = isRealEdge ? undefined : [dash, dash]
    edge.style = {
      cursor: 'pointer',
      lineAppendWidth: Math.max(edge.size || 5, 5),
      fillOpacity: 1,
      lineDash,
      endArrow: arrowPath
        ? {
            path: arrowPath,
            d,
            fill: edgeStyle.stroke,
            strokeOpacity: 0,
            opacity: edgeStyle.opacity
          }
        : undefined,
      ...edgeStyle
    }
    edge.labelCfg = {
      autoRotate: true,
      style: global.edge.labelCfg.style
    }
    if (!edge.oriLabel) edge.oriLabel = edge.label
    if (!edgeLabelVisible) {
      edge.label = ''
    } else {
      edge.label = labelFormatter(edge.oriLabel, labelMaxLength)
    }

    edge.visible = edge.level ? edgeVisible : true
    // arrange the other nodes around the hub
    const sourceDis = sourceNode.size / 2 + 50
    const targetDis = targetNode.size / 2 + 50
    if (sourceNode.x && !targetNode.x) {
      targetNode.x =
        sourceNode.x + sourceDis * Math.cos(Math.random() * Math.PI * 2)
    }
    if (sourceNode.y && !targetNode.y) {
      targetNode.y =
        sourceNode.y + sourceDis * Math.sin(Math.random() * Math.PI * 2)
    }
    if (targetNode.x && !sourceNode.x) {
      sourceNode.x =
        targetNode.x + targetDis * Math.cos(Math.random() * Math.PI * 2)
    }
    if (targetNode.y && !sourceNode.y) {
      sourceNode.y =
        targetNode.y + targetDis * Math.sin(Math.random() * Math.PI * 2)
    }

    if (!sourceNode.x && !sourceNode.y && pNodePosition) {
      sourceNode.x =
        pNodePosition.x + 30 * Math.cos(Math.random() * Math.PI * 2)
      sourceNode.y =
        pNodePosition.y + 30 * Math.sin(Math.random() * Math.PI * 2)
    }
    if (!targetNode.x && !targetNode.y && pNodePosition) {
      targetNode.x =
        pNodePosition.x + 30 * Math.cos(Math.random() * Math.PI * 2)
      targetNode.y =
        pNodePosition.y + 30 * Math.sin(Math.random() * Math.PI * 2)
    }
  })

  descreteNodeCenter = {
    x: width - paddingLeft,
    y: height - paddingTop
  }
  descreteNodes.forEach(node => {
    if (!node.x && !node.y) {
      node.x = descreteNodeCenter.x + 30 * Math.cos(Math.random() * Math.PI * 2)
      node.y = descreteNodeCenter.y + 30 * Math.sin(Math.random() * Math.PI * 2)
    }
  })
  //处理平行边
  G6.Util.processParallelEdges(edges, 25, 'custom-line', 'custom-line', 'loop')
  return {
    maxDegree,
    edges
  }
}

const examAncestors = (model, expandedArray, length, keepTags) => {
  for (let i = 0; i < length; i++) {
    const expandedNode = expandedArray[i]
    if (!keepTags[i] && model.parentId === expandedNode.id) {
      keepTags[i] = true // 需要被保留
      examAncestors(expandedNode, expandedArray, length, keepTags)
      break
    }
  }
}

export const manageExpandCollapseArray = (
  nodeNumber,
  model,
  collapseArray,
  expandArray,
  graph
) => {
  manipulatePosition = { x: model.x, y: model.y }

  // 维护 expandArray，若当前画布节点数高于上限，移出 expandedArray 中非 model 祖先的节点)
  if (nodeNumber > NODE_LIMIT) {
    // 若 keepTags[i] 为 true，则 expandedArray 的第 i 个节点需要被保留
    const keepTags = {}
    const expandLen = expandArray.length
    // 检查 X 的所有祖先并标记 keepTags
    examAncestors(model, expandArray, expandLen, keepTags)
    // 寻找 expandedArray 中第一个 keepTags 不为 true 的点
    let shiftNodeIdx = -1
    for (let i = 0; i < expandLen; i++) {
      if (!keepTags[i]) {
        shiftNodeIdx = i
        break
      }
    }
    // 如果有符合条件的节点，将其从 expandedArray 中移除
    if (shiftNodeIdx !== -1) {
      let foundNode = expandArray[shiftNodeIdx]
      if (foundNode.level === 2) {
        let foundLevel1 = false
        // 找到 expandedArray 中 parentId = foundNode.id 且 level = 1 的第一个节点
        for (let i = 0; i < expandLen; i++) {
          const eNode = expandArray[i]
          if (eNode.parentId === foundNode.id && eNode.level === 1) {
            foundLevel1 = true
            foundNode = eNode
            expandArray.splice(i, 1)
            break
          }
        }
        // 若未找到，则 foundNode 不变, 直接删去 foundNode
        if (!foundLevel1) expandArray.splice(shiftNodeIdx, 1)
      } else {
        // 直接删去 foundNode
        expandArray.splice(shiftNodeIdx, 1)
      }
      // const removedNode = expandedArray.splice(shiftNodeIdx, 1); // splice returns an array
      const idSplits = foundNode.id.split('-')
      let collapseNodeId
      // 去掉最后一个后缀
      for (let i = 0; i < idSplits.length - 1; i++) {
        const str = idSplits[i]
        if (collapseNodeId) collapseNodeId = `${collapseNodeId}-${str}`
        else collapseNodeId = str
      }
      const collapseNode = {
        id: collapseNodeId,
        parentId: foundNode.id,
        level: foundNode.level - 1
      }
      collapseArray.push(collapseNode)
    }
  }

  const currentNode = {
    id: model.id,
    level: model.level,
    parentId: model.parentId
  }

  // 加入当前需要展开的节点
  expandArray.push(currentNode)

  graph.get('canvas').setCursor('default')
  return { expandArray, collapseArray }
}

export const getMixedGraph = (
  aggregatedData,
  originData,
  nodeMap,
  aggregatedNodeMap,
  expandArray,
  collapseArray
) => {
  let nodes = [],
    edges = []

  const expandMap = {},
    collapseMap = {}
  expandArray.forEach(expandModel => {
    expandMap[expandModel.id] = true
  })
  collapseArray.forEach(collapseModel => {
    collapseMap[collapseModel.id] = true
  })

  aggregatedData.nodes.forEach((cluster, i) => {
    if (expandMap[cluster.id]) {
      nodes = nodes.concat(cluster.nodes)
      aggregatedNodeMap[cluster.id].expanded = true
    } else {
      nodes.push(aggregatedNodeMap[cluster.id])
      aggregatedNodeMap[cluster.id].expanded = false
    }
  })
  originData.edges.forEach(edge => {
    const isSourceInExpandArray = expandMap[nodeMap[edge.source].clusterId]
    const isTargetInExpandArray = expandMap[nodeMap[edge.target].clusterId]
    if (isSourceInExpandArray && isTargetInExpandArray) {
      edges.push(edge)
    } else if (isSourceInExpandArray) {
      const targetClusterId = nodeMap[edge.target].clusterId
      const vedge = {
        source: edge.source,
        target: targetClusterId,
        id: `edge-${uniqueId('vedge')}`,
        label: ''
      }
      edges.push(vedge)
    } else if (isTargetInExpandArray) {
      const sourceClusterId = nodeMap[edge.source].clusterId
      const vedge = {
        target: edge.target,
        source: sourceClusterId,
        id: `edge-${uniqueId('vedge')}`,
        label: ''
      }
      edges.push(vedge)
    }
  })
  aggregatedData.edges.forEach(edge => {
    if (expandMap[edge.source] || expandMap[edge.target]) return
    else edges.push(edge)
  })
  return { nodes, edges }
}

export const cacheNodePositions = nodes => {
  const positionMap = {}
  const nodeLength = nodes.length
  for (let i = 0; i < nodeLength; i++) {
    const node = nodes[i].getModel()
    positionMap[node.oriId] = {
      x: node.x,
      y: node.y,
      level: node.level
    }
  }
  return positionMap
}

const generateNeighbors = (
  centerNodeModel,
  step,
  maxNeighborNumPerNode = 1
) => {
  if (step <= 0) return undefined
  let nodes = [],
    edges = []
  const clusterId = centerNodeModel.clusterId
  const centerId = centerNodeModel.id
  const neighborNum = Math.ceil(Math.random() * maxNeighborNumPerNode)
  for (let i = 0; i < neighborNum; i++) {
    const neighborNode = {
      id: uniqueId('node'),
      clusterId,
      level: 0,
      colorSet: centerNodeModel.colorSet
    }
    nodes.push(neighborNode)
    const dire = Math.random() > 0.5
    const source = dire ? centerId : neighborNode.id
    const target = dire ? neighborNode.id : centerId
    const neighborEdge = {
      id: uniqueId('node'),
      source,
      target,
      label: `${source}-${target}`
    }
    edges.push(neighborEdge)
    const subNeighbors = generateNeighbors(
      neighborNode,
      step - 1,
      maxNeighborNumPerNode
    )
    if (subNeighbors) {
      nodes = nodes.concat(subNeighbors.nodes)
      edges = edges.concat(subNeighbors.edges)
    }
  }
  return { nodes, edges }
}

export const getNeighborMixedGraph = (
  centerNodeModel,
  step,
  originData,
  clusteredData,
  currentData,
  nodeMap,
  aggregatedNodeMap,
  maxNeighborNumPerNode = 1
) => {
  // update the manipulate position for center gravity of the new nodes
  manipulatePosition = { x: centerNodeModel.x, y: centerNodeModel.y }

  // the neighborSubGraph does not include the centerNodeModel. the elements are all generated new nodes and edges
  const neighborSubGraph = generateNeighbors(
    centerNodeModel,
    step,
    maxNeighborNumPerNode
  )
  // update the origin data
  originData.nodes = originData.nodes.concat(neighborSubGraph.nodes)
  originData.edges = originData.edges.concat(neighborSubGraph.edges)
  // update the origin nodeMap
  neighborSubGraph.nodes.forEach(node => {
    nodeMap[node.id] = node
  })
  // update the clusteredData
  const clusterId = centerNodeModel.clusterId
  clusteredData.clusters.forEach(cluster => {
    if (cluster.id !== clusterId) return
    cluster.nodes = cluster.nodes.concat(neighborSubGraph.nodes)
    cluster.sumTot += neighborSubGraph.edges.length
  })
  // update the count
  aggregatedNodeMap[clusterId].count += neighborSubGraph.nodes.length

  currentData.nodes = currentData.nodes.concat(neighborSubGraph.nodes)
  currentData.edges = currentData.edges.concat(neighborSubGraph.edges)
  return currentData
}

export const getExtractNodeMixedGraph = (
  extractNodeData,
  originData,
  nodeMap,
  aggregatedNodeMap,
  currentUnproccessedData
) => {
  const extractNodeId = extractNodeData.id
  // const extractNodeClusterId = extractNodeData.clusterId;
  // push to the current rendering data
  currentUnproccessedData.nodes.push(extractNodeData)
  // update the count of aggregatedNodeMap, when to revert?
  // aggregatedNodeMap[extractNodeClusterId].count --;

  // extract the related edges
  originData.edges.forEach(edge => {
    if (edge.source === extractNodeId) {
      const targetClusterId = nodeMap[edge.target].clusterId
      if (!aggregatedNodeMap[targetClusterId].expanded) {
        // did not expand, create an virtual edge fromt he extract node to the cluster
        currentUnproccessedData.edges.push({
          id: uniqueId('edges'),
          source: extractNodeId,
          target: targetClusterId
        })
      } else {
        // if the cluster is already expanded, push the origin edge
        currentUnproccessedData.edges.push(edge)
      }
    } else if (edge.target === extractNodeId) {
      const sourceClusterId = nodeMap[edge.source].clusterId
      if (!aggregatedNodeMap[sourceClusterId].expanded) {
        // did not expand, create an virtual edge fromt he extract node to the cluster
        currentUnproccessedData.edges.push({
          id: uniqueId('edges'),
          target: extractNodeId,
          source: sourceClusterId
        })
      } else {
        // if the cluster is already expanded, push the origin edge
        currentUnproccessedData.edges.push(edge)
      }
    }
  })
  return currentUnproccessedData
}
