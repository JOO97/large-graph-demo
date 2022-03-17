<template>
  <div>
    <div id="canvas-menu">
      <div class="icon-container">
        <span
          class="icon-span"
          @click="$emit('on-click', 'createModel')"
          @mouseenter="
            (e) => {
              showItemTip(e, '创建模型')
            }
          "
          @mouseleave="hideItemTip"
        >
          <i class="iconfont icon-chuangjian" :style="iconStyle.disable" />
        </span>
        <span
          class="icon-span"
          :style="{ backgroundColor: 'rgba(0, 0, 0, 0)' }"
          @click="clickEdgeController"
          @mouseenter="
            (e) => {
              showItemTip(e, edgeVisible ? '隐藏所有边' : '显示所有边')
            }
          "
          @mouseleave="hideItemTip"
        >
          <i
            class="iconfont icon-eye"
            :style="edgeVisible ? iconStyle.enable : iconStyle.disable"
          />
        </span>
        <span
          class="icon-span"
          :style="{ backgroundColor: 'rgba(0, 0, 0, 0)' }"
          @click="clickEdgeLabelController"
          v-if="edgeVisible"
          @mouseenter="
            (e) => {
              showItemTip(e, edgeLabelVisible ? '隐藏边标签' : '显示边标签')
            }
          "
          @mouseleave="hideItemTip"
        >
          <i
            class="iconfont icon-guanbibiaoqian"
            :style="edgeLabelVisible ? iconStyle.enable : iconStyle.disable"
          />
        </span>

        <span
          class="icon-span"
          @click="handleFitView"
          @mouseenter="
            (e) => {
              showItemTip(e, '图内容适配容器')
            }
          "
          @mouseleave="hideItemTip"
        >
          <i class="iconfont icon-zishiying" :style="iconStyle.disable" />
        </span>
        <span
          class="icon-span"
          @click="handleEnableSelectPathEnd"
          @mouseenter="
            (e) => {
              showItemTip(e, '搜索最短路径')
            }
          "
          @mouseleave="hideItemTip"
        >
          <i
            class="iconfont icon-suoyin"
            :style="enableSelectPathEnd ? iconStyle.enable : iconStyle.disable"
          />
        </span>
        <span
          class="icon-span"
          @click="handleEnableSearch"
          @mouseenter="
            (e) => {
              showItemTip(e, '搜索节点')
            }
          "
          @mouseleave="hideItemTip"
        >
          <i
            class="iconfont icon-sousuo"
            :style="enableSearch ? iconStyle.enable : iconStyle.disable"
          />
        </span>
        <span
          v-if="enableSearch"
          @mouseenter="
            (e) => {
              showItemTip(e, '输入需要搜索的节点 标签，并点击 检索 按钮')
            }
          "
          @mouseleave="hideItemTip"
        >
          <input type="text" id="search-node-input" v-model="keyword" />
          <button id="submit-button" @click="handleSearchNode">检索</button>
        </span>
        <span
          v-if="enableSelectPathEnd"
          @mouseenter="
            (e) => {
              showItemTip(
                e,
                '选择有且仅有两个节点作为端点，并点击 查找路径 按钮'
              )
            }
          "
          @mouseleave="hideItemTip"
        >
          <button id="submit-button" @click="handleFindPath">查找路径</button>
        </span>
      </div>
    </div>

    <div class="menu-tip" :style="{ opacity: menuTip.opacity }">
      <slot :customData="menuTip">
        <!-- {{ menuTip.text }} -->
      </slot>
    </div>
    <div
      id="g6-canavs-menu-item-tip"
      :style="{ opacity: menuItemTip.opacity, ...menuItemTipStyle }"
    >
      {{ menuItemTip.text }}
    </div>
  </div>
</template>

<script>
const iconStyle = {
  disable: { color: 'rgba(255, 255, 255, 0.85)' },
  enable: { color: 'rgba(82, 115, 224, 1)' }
}
export default {
  props: {
    fisheyeEnabled: {
      type: Boolean,
      default: false
    },
    lassoEnabled: {
      type: Boolean,
      default: false
    },
    //是否显示边
    edgeVisible: {
      type: Boolean,
      default: false
    },
    //是否显示关系标签
    edgeLabelVisible: {
      type: Boolean,
      default: false
    },
    //检索节点模式
    enableSearch: {
      type: Boolean,
      default: false
    },
    //检索最短路径模式
    enableSelectPathEnd: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      iconStyle,
      menuItemTip: {
        text: '',
        display: 'none',
        opacity: 0
      },
      menuItemTipStyle: {
        zIndex: -100,
        top: 0,
        left: 0
      },
      menuTip: {
        text: '',
        display: 'none',
        opacity: 0,
        type: ''
      },
      keyword: ''
    }
  },
  methods: {
    showItemTip(e, text) {
      const { clientX: x, clientY: y } = e
      this.menuItemTip = {
        text,
        display: 'block',
        opacity: 1
      }
      this.menuItemTipStyle = {
        top: `${64}px`,
        left: `${x - 20}px`,
        zIndex: 100
      }
    },
    hideItemTip() {
      this.menuItemTip = {
        text: '',
        display: 'none',
        opacity: 0
      }
      this.menuItemTipStyle.zIndex = -100
    },
    clickEdgeLabelController() {
      this.$emit('update-props', 'edgeLabelVisible')
    },
    clickEdgeController() {
      this.$emit('update-props', 'edgeVisible')
    },
    //检索模式
    handleEnableSearch() {
      // // 关闭 lasso 框选
      // if (lassoEnabled) clickLassoIcon(true)
      // // 关闭选择路径端点
      // if (enableSelectPathEnd) setEnableSelectPathEnd(false)
      // // 关闭搜索节点框
      // if (enableSearch) setEnableSearch(false)
      // // 关闭 fisheye
      // if (fisheyeEnabled && fishEye) {
      //   graph.removePlugin(fishEye)
      //   clickFisheyeIcon(true)
      // }
      const { enableSearch, enableSelectPathEnd } = this
      if (enableSearch) {
        this.menuTip = {
          text: '',
          display: 'none',
          opacity: 0,
          type: ''
        }
        this.menuItemTip = {
          text: '',
          display: 'none',
          opacity: 0
        }
      } else {
        // 关闭搜索路径模式
        if (enableSelectPathEnd) {
          this.$emit('update-props', 'enableSelectPathEnd')
        }
        this.menuItemTip = {
          text: '输入需要搜索的节点 ID，并点击 Submit 按钮',
          display: 'block',
          opacity: 1
        }
      }
      this.$emit('update-props', 'enableSearch')
    },
    //检索
    handleSearchNode() {
      const { keyword } = this
      if (!keyword || !keyword.trim()) return
      this.$emit('on-search-node', {
        keyword,
        cb: (status) => {
          this.menuTip = !status
            ? {
                text: '没有找到该节点',
                display: 'block',
                opacity: 1,
                type: 'warning'
              }
            : {
                text: '',
                display: 'none',
                opacity: 0
              }
        }
      })
    },
    //适配
    handleFitView() {
      this.$emit('on-fit-view')
    },
    //检索最短路径模式
    handleEnableSelectPathEnd() {
      const { enableSearch, enableSelectPathEnd } = this
      if (enableSelectPathEnd) {
        this.menuTip = { text: '', display: 'none', opacity: 0, type: '' }
      } else {
        // 关闭搜索节点模式
        if (enableSearch) this.$emit('update-props', 'enableSearch')
        this.menuTip = {
          text: '按住 SHIFT 键并点选两个节点作为路径起终点',
          display: 'display',
          opacity: 1,
          type: 'info'
        }
      }
      this.$emit('update-props', 'enableSelectPathEnd')
    },
    //查找路径
    handleFindPath() {
      this.$emit('on-find-path', {
        cb: ({ status, text, type }) => {
          this.menuTip = !status
            ? {
                text,
                display: 'block',
                opacity: 1,
                type
              }
            : {
                text: '',
                display: 'none',
                opacity: 0,
                type: ''
              }
        }
      })
    }
  }
}
</script>

<style scoped>
@import url('//at.alicdn.com/t/font_2973361_nc62eumlsui.css');
</style>

<style lang="scss" scoped>
#canvas-menu {
  position: absolute;
  z-index: 2;
  left: 16px;
  top: 20px;
  width: fit-content;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 40px;
  background-color: rgba(54, 59, 64, 0);
  border-radius: 24px;
  font-family: PingFangSC-Semibold;
  transition: all 0.2s linear;
  background-color: rgba(54, 59, 64, 1);
  box-shadow: 0 5px 18px 0 rgba(0, 0, 0, 0.2);
}
#canvas-menu:hover {
  // background-color: rgba(54, 59, 64, 1);
  box-shadow: 0 5px 18px 0 rgba(0, 0, 0, 0.6);
}
.icon-span {
  padding-left: 5px;
  padding-right: 5px;
  cursor: pointer;
}
#search-node-input {
  background-color: rgba(60, 60, 60, 0.95);
  border-radius: 21px;
  width: 150px;
  border-color: rgba(80, 80, 80, 0.95);
  border-style: solid;
  color: rgba(255, 255, 255, 0.85);
  margin-left: 5px;
  padding: 0 10px;
}
#submit-button {
  background-color: rgba(82, 115, 224, 0.2);
  border-radius: 21px;
  border-color: rgb(82, 115, 224);
  border-style: solid;
  color: rgba(152, 165, 254, 1);
  margin-left: 4px;
  padding: 2px 10px;
  cursor: pointer;
}
.menu-tip {
  position: absolute;
  z-index: 999;
  left: 420px;
  width: fit-content;
  height: 40px;
  line-height: 40px;
  top: 20px;
  padding-left: 16px;
  padding-right: 16px;
  // background-color: rgba(54, 59, 64, 0.5);
  color: #363b40;
  border-radius: 8px;
  transition: all 0.2s linear;
  font-family: PingFangSC-Semibold;
}
#g6-canavs-menu-item-tip {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.65);
  padding: 10px;
  box-shadow: rgba(0, 0, 0, 0.6) 0px 0px 10px;
  width: fit-content;
  color: #fff;
  border-radius: 8px;
  font-size: 12px;
  height: fit-content;
  font-family: PingFangSC-Semibold;
  transition: all 0.2s linear;
}
</style>
