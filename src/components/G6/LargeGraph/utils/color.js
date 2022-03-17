export function HexToRgb(str) {
  var r = /^\#?[0-9A-F]{6}$/
  //test方法检查在字符串中是否存在一个模式，如果存在则返回true，否则返回false
  if (!r.test(str)) return window.alert('输入错误的hex')
  //replace替换查找的到的字符串
  str = str.replace('#', '')
  //match得到查询数组
  var hxs = str.match(/../g)
  //alert('bf:'+hxs)
  for (var i = 0; i < 3; i++) hxs[i] = parseInt(hxs[i], 16)
  //alert(parseInt(80, 16))
  //console.log(hxs);
  return hxs
}

export function RgbToHex(a, b, c) {
  var r = /^\d{1,3}$/
  if (!r.test(a) || !r.test(b) || !r.test(c))
    return window.alert('输入错误的rgb颜色值')
  var hexs = [a.toString(16), b.toString(16), c.toString(16)]
  for (var i = 0; i < 3; i++) if (hexs[i].length == 1) hexs[i] = '0' + hexs[i]
  return '#' + hexs.join('')
}

//得到hex颜色值为color的加深颜色值，level为加深的程度，限0-1之间
export function getDarkColor(color, level = 0.5) {
  var r = /^\#?[0-9A-F]{6}$/
  if (!r.test(color)) return window.alert('输入错误的hex颜色值')
  var rgbc = HexToRgb(color)
  //floor 向下取整
  for (var i = 0; i < 3; i++) rgbc[i] = Math.floor(rgbc[i] * (1 - level))
  return RgbToHex(rgbc[0], rgbc[1], rgbc[2])
}

//得到hex颜色值为color的减淡颜色值，level为加深的程度，限0-1之间
export function getLightColor(color, level = 0.5) {
  color = color.toUpperCase()
  var r = /^\#?[0-9A-F]{6}$/
  if (!r.test(color)) return console.log('输入错误的hex颜色值')
  var rgbc = HexToRgb(color)
  for (var i = 0; i < 3; i++)
    rgbc[i] = Math.floor((255 - rgbc[i]) * level + rgbc[i])
  return RgbToHex(rgbc[0], rgbc[1], rgbc[2])
}