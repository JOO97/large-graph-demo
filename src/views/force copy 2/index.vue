<template>
  <div class="data-review content">
    <LargeGraph
      layout="comboForce"
      height="76vh"
      :showMenu="false"
      :data="graphData"
    />
    {{ graphData }}
  </div>
</template>

<script>
import LargeGraph from '@/components/G6/LargeGraph'
import graphJson from './json/data.json'

export default {
  components: {
    LargeGraph
  },
  data() {
    return {
      loading: true,
      graphJson,
      graphData: {
        nodes: [],
        edges: [],
        combos: []
      }
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      this.loading = false
      const { nodes, edges } = this.graphJson
      const pNodes = []
      nodes.map((item) => {
        if (item.parent && !pNodes.includes(item.parent)) {
          pNodes.push(item.parent)
        }
      })
      this.graphData.nodes = nodes
        .filter((item) => !pNodes.includes(item.id))
        .map((item) => {
          return {
            ...item,
            comboId: item.parent ? item.parent : undefined,
            cluster: item.parent ? item.parent : '1',
            customInfo: item
          }
        })
      this.graphData.edges = edges.map((item) => {
        return {
          ...item,
          customLabel: item.name,
          name: undefined,
          combo:
            pNodes.includes(item.source) || pNodes.includes(item.target)
              ? true
              : undefined
        }
      })
      this.graphData.combos = nodes
        .filter((item) => pNodes.includes(item.id))
        .map((item) => {
          return {
            ...item,
            label: item.name,
            linkPoints: {
              top: true
            },
            layer: 1
          }
        })
    }
  }
}
</script>

<style scoped lang="scss">
.data-review {
  min-height: 500px;
  padding: 10px;
  margin-right: 20px;
  .main {
    .left {
      &-head {
        &-text {
          min-height: 30px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
      }
    }
    .right {
      position: relative;
      padding: 0 10px 20px 10px;
      border-radius: 2px;
      .float-panel {
        position: absolute;
        right: 20px;
        top: 15px;
        width: 400px;
        height: 74vh;
        background: #fff;
        border-radius: 5px;
        color: #000;
        box-shadow: 0px 0px 2px rgba(21, 30, 41, 0.01),
          0px 1px 2px rgba(21, 30, 41, 0.08), 0px 1px 4px rgba(21, 30, 41, 0.08);
        z-index: 1;
        padding: 10px;
        &-head {
          margin-bottom: 10px;
          font-size: 15px;
        }
      }
    }
  }
}
</style>
