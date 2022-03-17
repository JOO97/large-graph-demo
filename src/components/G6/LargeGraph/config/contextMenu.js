export const contextMenuStyle = `.g6-component-contextmenu {
    position: absolute;
    z-index: 2;
    list-style-type: none;
    background-color: #363b40;
    border-radius: 6px;
    font-size: 14px;
    color: hsla(0,0%,100%,.85);
    width: fit-content;
    transition: opacity .2s;
		box-shadow: 0 5px 18px 0 rgba(0, 0, 0, 0.6);
		border: 0px;
  }
  .g6-component-contextmenu ul {
		padding-left: 0px;
		margin: 0;
    border-bottom: 1px dotted #fff;
    padding: 0px 15px 0px 15px;
    text-align: center;

  }
  .g6-component-contextmenu ul:last-child {
    	border-bottom: none;

  }

  .g6-component-contextmenu li {
    cursor: pointer;
    list-style-type: none;
    list-style: none;
    margin-left: 0;
    line-height: 34px;
  }
  .g6-component-contextmenu li:hover {
    color: #aaaaaa;
	}`

export const defaultContextMenuContent = {
  getContent(evt) {
    const { item } = evt
    if (evt.target && evt.target.isCanvas && evt.target.isCanvas()) {
      return `<ul>
          <li id='createModel'>创建模型</li>
        </ul>`
    } else if (!item) return
    const itemType = item.getType()
    const model = item.getModel()
    if (itemType && model) {
      if (itemType === 'node') {
        if (model.level === -1) {
          return `<ul>
               ${
                 model.expandCNodes
                   ? '<li id="hideCNode">隐藏</li>'
                   : '<li id="showCNode">展开节点</li>'
               }
               <li id="showRelativeEdges">显示相关边</li>
            </ul>`
        } else if (model.level === 0) {
          return `<ul>
              <li id='editCNode'>编辑属性</li>
              <li id='delCNode'>删除属性</li>
            </ul>`
        }
      } else if (itemType === 'edge') {
        if (model.level === -1) {
          return `<ul>
            <li id='editEdge'>编辑关系</li>
            <li id='delEdge'>删除关系</li>
          </ul>`
        }
      }
    }
  }
}
