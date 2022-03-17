export const defaultTooltip = {
  offsetX: 10,
  offsetY: 10,
  shouldBegin: e => {
    const { isReal } = e.item.getModel()
    if (!isReal) return false
    return true
  },
  getContent: e => {
    const model = e.item.getModel()
    const { type, label, colorSet, oriLabel, id, oriId, name } = model
    let itemBgColor = colorSet ? colorSet.activeStroke : '#6DD400',
      itemLabel = name || oriLabel || oriId || id,
      infoArr = []
    if (model.customInfo) {
      const keys = Object.keys(model.customInfo)
      keys.map(key => {
        infoArr.push({
          key,
          value: model.customInfo[key]
        })
      })
    } else {
      infoArr.push(
        {
          key: 'id',
          value: oriId ? oriId : id
        },
        {
          key: 'label',
          value: itemLabel
        },
        {
          key: 'type',
          value: type
        }
      )
    }
    let innerHTML = `<h3>
      <span style="display:inline-block;margin-right:4px;border-radius:5px;width:10px;height:10px;background-color:${itemBgColor};"></span>
      ${itemLabel}
    </h3>`
    infoArr.map((item, index) => {
      innerHTML += `
        ${index === 0 ? '<ul>' : ''}
          <li>
            <span>${item.key}</span>
            <span>${item.value}</span>
          </li>
        ${index === infoArr.length - 1 ? '<ul />' : ''}
      `
    })
    return innerHTML
  }
}

export const tooltipStyle = `
.g6-component-tooltip {
  background-color: #424242;
  padding: 10px 12px;
  color: #e4e4e4;
  font-size: 14px;
  border: none;
  box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px;
  max-width: 400px;
  width: fit-content;
  z-index: 9999;
}
.g6-component-tooltip h3 {
  color: #fff;
  font-size: 16px;
}
.g6-component-tooltip ul {
  padding: 0;
}
.g6-component-tooltip ul li {
  list-style: none;
  display: flex;
  border-bottom: 1px solid #545454;
  padding: 5px;
}
.g6-component-tooltip ul li span {

  word-break: break-all;
}
.g6-component-tooltip ul li span:nth-child(1) {
  width: 120px;
  flex-shrink: 0;
}
`
