let servoAlias = ['', 'RUDDER', 'ELEVATOR']
let torqueModesAlias = ['OFF', 'ON', 'BREAK']
let valueTypesAlias = ['MIN', 'NEU', 'MAX']
let testMode = [-1, -1]
let torqueMode = [-1, -1]
let selection = [1, 1]
let initialLoad = false
let d = new Date()

let connection;

window.onload = function () {
  let lastTouch = d.getTime()
  document.addEventListener('touchstart', function (e) {
    let t2 = d.getTime()
    let t1 = lastTouch
    let dt = t2 - t1
    let fingers = e.touches.length
    lastTouch = t2
    if (!dt || dt > 500 || fingers > 1) return // not double-tap
    e.preventDefault()
    e.target.click()
  }, false)

  connection = new WebSocket('ws://' + location.hostname + ':81/', ['arduino'])

  connection.onerror = function (error) {
    document.getElementById('rud').innerHTML = 'DISCONNECTED'
    document.getElementById('ele').innerHTML = 'DISCONNECTED'
    console.log('WebSocket Error ', error)
  }

  connection.onopen = function () {
    console.log('websocket opened')
    connection.onclose = function () { alert('WebSocket Connection Closed. Retry Connection.') }
    connection.binaryType = 'arraybuffer'
    connection.onmessage = function (message) {
      function socketRespond (buf, value) {
        let bA = new Uint8Array(8)
        bA[0] = 0x8F
        bA[1] = 0xF8
        bA[2] = buf[2]
        bA[3] = 0xF0
        bA[4] = 0x02
        bA[5] = buf[5]
        bA[6] = value & 0x000000FF
        bA[7] = checksum(bA, 7)
        connection.send(bA.buffer)
      }
      console.log('received message')
      console.log(message.data)
      let buf = new Uint8Array(message.data)
      let len = buf.byteLength
      let log = 'Got'
      for (let i = 0; i < len; i++)log += ' ' + buf[i].toString(16)
      console.log(log)
      if (buf[0] === 0x8D && buf[1] === 0xD8) {
        if (buf[len - 1] === checksum(buf, len - 1)) {
          if (buf[3] === 0x00) {  /* 表示 */
            let i = 0, j
            while (i < buf[4]) {
              j = i + 5
              if ((buf[j] >= 0x01 && buf[j] <= 0x03) || (buf[j] >= 0x05 && buf[j] <= 0x07)) {
                let val = ((buf[j + 1] & 0x000000FF) | ((buf[j + 2] & 0x000000FF) << 8))
                if (val & 0x8000) val = -(0x10000 - val)
                document.getElementById('set' + buf[j].toString()).innerHTML = val.toString()
                console.log('set: set' + buf[j].toString() + ' to ' + val.toString())
                i += 3
              } else if (buf[j] >= 0x08 && buf[j] <= 0x09) {
                document.getElementById('tsm' + (buf[j] - 7).toString() + buf[j + 1].toString()).style.backgroundColor = 'red'
                document.getElementById('tsm' + (buf[j] - 7).toString() + ((buf[j + 1] + 1) % 2).toString()).style.backgroundColor = 'white'
                testMode[buf[j] - 8] = buf[j + 1]
                console.log('set: tsm' + (buf[j] - 7).toString() + ' to ' + buf[j + 1])
                i += 2
              } else if (buf[j] >= 0x0A && buf[j] <= 0x0B) {
                let sID = 'tqm' + (buf[j] - 9).toString()
                document.getElementById(sID + buf[j + 1].toString()).style.backgroundColor = 'red'
                document.getElementById(sID + ((buf[j + 1] + 1) % 3).toString()).style.backgroundColor = 'white'
                document.getElementById(sID + ((buf[j + 1] + 2) % 3).toString()).style.backgroundColor = 'white'
                torqueMode[buf[j] - 10] = buf[j + 1]
                console.log('set: ' + sID + ' to ' + buf[j + 1].toString())
                i += 2
              } else if (buf[j] >= 0x0C && buf[j] <= 0x0D) {
                let sID = 'swp' + (buf[j] - 0x0B).toString()
                let color = ['white', 'red']
                document.getElementById(sID + (buf[j + 2] + 1).toString()).style.backgroundColor = color[buf[j + 1]]
                document.getElementById(sID + (((buf[j + 2] + 1) % 2) + 1).toString()).style.backgroundColor = 'white'
                console.log('set: ' + sID + ' to ' + (buf[j + 1] + 1).toString())
                i += 3
              } else {
                i += buf[4]
              }
            }
            if (!initialLoad) {
              setValueType(1, 1)
              setValueType(2, 1)
              initialLoad = true
            }
          } else if (buf[3] === 0x01) { /* 確認 */
            if (buf[5] === 0x01) {  /* サーボ角設定 */
              let valid = true
              let cstr = 'Change ['
              let servo_id = (((buf[6] & 0x04) >> 2) & 0xFF) + 1
              if (servo_id < 1 || servo_id > 2) { cstr += 'ERROR '; valid = false } else cstr += servoAlias[servo_id] + ' '
              let tmpStr = (buf[6] & 0x03).toString()
              if    (tmpStr === '1') cstr += 'MIN]'
              else if (tmpStr === '2') cstr += 'NEUTRAL]'
              else if (tmpStr === '3') cstr += 'MAX]'
              else { cstr += 'ERROR]'; valid = false }
              let bVal = ((buf[7] & 0x000000FF) | ((buf[8] & 0x000000FF) << 8))
              if (bVal & 0x8000) bVal = -(0x10000 - bVal)
              let aVal = ((buf[9] & 0x000000FF) | ((buf[10] & 0x000000FF) << 8))
              if (aVal & 0x8000) aVal = -(0x10000 - aVal)
              cstr += ' ' + bVal.toString() + ' ==> ' + aVal.toString()
              if (!(aVal >= -1500 && aVal <= 1500)) valid = false
              if (valid && confirm(cstr + '?')) {
                socketRespond(buf, 1)
                return
              }
              socketRespond(buf, 0)
              alert('CANCEL ' + cstr)
            } else if (buf[5] === 0x03) { /* サーボ再起動 */
              let valid = true
              let cstr = 'Reboot ['
              if (buf[6] < 1 || buf[6] > 2) { cstr += 'ERROR'; valid = false } else cstr += servoAlias[buf[6]]
              cstr += '] servo'
              if (valid && confirm(cstr + '?')) {
                socketRespond(buf, 1)
                return
              }
              socketRespond(buf, 0)
              alert('CANCEL ' + cstr)
            } else if (buf[5] === 0x04) { /* トルク%セット */
              let valid = true
              let cstr = 'Set ['
              if (buf[6] < 1 || buf[6] > 2) { cstr += 'ERROR'; valid = false } else cstr += servoAlias[buf[6]]
              cstr += ' TORQUE[%]] ' + buf[7].toString() + '% ===> ' + buf[8].toString() + '%'
              if (!(buf[8] >= 0 && buf[8] <= 100)) valid = false
              if (valid && confirm(cstr + '?')) {
                socketRespond(buf, 1)
                return
              }
              socketRespond(buf, 0)
              alert('CANCEL ' + cstr)
            } else if (buf[5] === 0x05) { /* トルクモードセット */
              let valid = true
              let cstr = 'Set ['
              if (buf[6] < 1 || buf[6] > 2) { cstr += 'ERROR'; valid = false } else cstr += servoAlias[buf[6]]
              let m_names = ['OFF', 'ON', 'BREAK']
              cstr += ' TORQUE MODE] '
              if (buf[7] < 3)cstr += m_names[buf[7]]
              else { cstr += 'ERROR'; valid = false }
              cstr += ' ===> '
              if (buf[8] < 3)cstr += m_names[buf[8]]
              else { cstr += 'ERROR'; valid = false }
              if (valid && confirm(cstr + '?')) {
            socketRespond(buf, 1)
            return
          }
              socketRespond(buf, 0)
              alert('CANCEL ' + cstr)
            } else if (buf[5] === 0x06) { /* テストモード */
          let valid = true
          let cstr = 'Turn ['
          if (buf[6] < 1 || buf[6] > 2) { cstr += 'ERROR'; valid = false } else cstr += servoAlias[buf[6]]
          let m_names = ['OFF', 'ON']
          cstr += ' TEST MODE] '
          if (buf[7] < 2)cstr += m_names[buf[7]]
          else { cstr += 'ERROR'; valid = false }
          cstr += ' ===> '
          if (buf[8] < 2)cstr += m_names[buf[8]]
          else { cstr += 'ERROR'; valid = false }
          if (valid && confirm(cstr + '?')) {
            socketRespond(buf, 1)
            return
          }
          socketRespond(buf, 0)
          alert('CANCEL ' + cstr)
        } else if (buf[5] === 0x08) { /* 試験動作モード */
          let valid = true
          let cstr = 'Execute ['
          if (buf[6] < 1 || buf[6] > 2) { cstr += 'ERROR'; valid = false } else cstr += servoAlias[buf[6]]
          cstr += '] '
          let s_names = ['SLOW', 'FAST']
          if (buf[7] > 0 && buf[7] < 3)cstr += s_names[buf[7] - 1]
          else { cstr += 'ERROR'; valid = false }
          cstr += ' SWEEP'
          if (valid && confirm(cstr + '?')) {
            socketRespond(buf, 1)
          return
        }
          socketRespond(buf, 0)
          alert('CANCEL ' + cstr)
        }
          }
        }
      }
    }
    setTimeout(function() { socketRequest(1) }, 1000)
  }
}

function setValueType (id, value) {
  let tryObject = document.getElementById('try' + id.toString())
  tryObject.value = parseInt(document.getElementById('set' + (value + (id - 1) * 4).toString()).innerHTML)
  document.getElementById('ind' + id.toString() + value.toString()).style.backgroundColor = 'red'
  let others = [1, 2, 3]
  others.splice(value - 1, 1)
  for (let i = 0; i < others.length; i++) document.getElementById('ind' + id.toString() + others[i].toString()).style.backgroundColor = 'white'
  selection[id - 1] = value
  console.log('selected ' + servoAlias[id] + ' ' + valueTypesAlias[selection[id - 1] - 1])
  tryObject.style.backgroundColor = '#0ffff7'
  setTimeout(function () { tryObject.style.backgroundColor = 'White' }, 100)
}

function socketSetTestMode (id, state) {
  let bA = new Uint8Array(8)
  bA[0] = 0x8F
  bA[1] = 0xF8
  bA[2] = 0xFE
  bA[3] = 0x06
  bA[4] = 2
  bA[5] = id
  bA[6] = state
  bA[7] = checksum(bA, 7)
  connection.send(bA.buffer)
  let object = document.getElementById('tsm' + id.toString() + state.toString())
  let tmpColor = object.style.backgroundColor
  object.style.backgroundColor = '#0ffff7'
  setTimeout(function () { object.style.backgroundColor = tmpColor }, 100)
}

function changeTryRange (id, diff) {
  let tryObject = document.getElementById('try' + id.toString())
  let ctrObject = document.getElementById('ctr' + id.toString() + diff.toString())
  let val = parseInt(tryObject.value)
  tryObject.value = val + diff
  ctrObject.style.backgroundColor = '#0ffff7'
  setTimeout(function () { ctrObject.style.backgroundColor = 'White' }, 100)
  tryObject.style.backgroundColor = '#0ffff7'
  setTimeout(function () { tryObject.style.backgroundColor = 'White' }, 100)
}

function setValue (id) {
  let val = parseInt(document.getElementById('try' + id.toString()).value)
  let object = document.getElementById('vst' + id.toString())
  object.style.backgroundColor = '#0ffff7'
  setTimeout(function () { document.getElementById('vst' + id.toString()).style.backgroundColor = 'White' }, 100)
  if (isNaN(val) || !(val >= -1500 && val <= 1500)) {
    return
  }
  if (testMode[id - 1] === 1) {
    console.log('TESTING ' + servoAlias[id] + ' ' + valueTypesAlias[selection[id - 1] - 1] + ': ' + val.toString())
    socketUpdateServoValue(id, 0x07, val)
  } else if (testMode[id - 1] === 0) {
    console.log('REQUEST SETTING ' + servoAlias[id] + ' ' + valueTypesAlias[selection[id - 1] - 1] + '(' + (selection[id - 1] + (id - 1) * 4).toString() + '): ' + val.toString())
    socketUpdateServoValue(selection[id - 1] + (id - 1) * 4, 0x01, val)
  }
  object.style.backgroundColor = '#0ffff7'
  setTimeout(function () { object.style.backgroundColor = 'White' }, 100)
}

function socketUpdateServoValue (id, mode, val) {
  let bA = new Uint8Array(9)
  bA[0] = 0x8F
  bA[1] = 0xF8
  bA[2] = 0xFE
  bA[3] = mode
  bA[4] = 3
  bA[5] = id
  bA[6] = val & 0x000000FF
  bA[7] = ((val & 0x0000FF00) >> 8) & 0x000000FF
  bA[8] = checksum(bA, 8)
  connection.send(bA.buffer)
  return
}

function socketRebootServo (id) {
  let bA = new Uint8Array(7)
  bA[0] = 0x8F
  bA[1] = 0xF8
  bA[2] = 0xFE
  bA[3] = 0x03
  bA[4] = 1
  bA[5] = id
  bA[6] = checksum(bA, 6)
  connection.send(bA.buffer)
  console.log('REQUEST REBOOT [' + servoAlias[id] + ']')
  let object = document.getElementById('rbt' + id.toString())
  object.style.backgroundColor = '#0ffff7'
  setTimeout(function () { object.style.backgroundColor = 'White' }, 100)
}
function socketSetTorqueMode (id, state) {
  if (state < 0 || state > 2) return
  let bA = new Uint8Array(8)
  bA[0] = 0x8F
  bA[1] = 0xF8
  bA[2] = 0xFE
  bA[3] = 0x05
  bA[4] = 2
  bA[5] = id
  bA[6] = state
  bA[7] = checksum(bA, 7)
  connection.send(bA.buffer)
  console.log('REQUEST SET [' + servoAlias[id] + '] TORQUE MODE to ' + torqueModesAlias[state])
  let object = document.getElementById('tqm' + id.toString() + state.toString())
  let tmpColor = object.style.backgroundColor
  object.style.backgroundColor = '#0ffff7'
  setTimeout(function () { object.style.backgroundColor = tmpColor }, 100)
}

function socketDoSweep (id, speed) {
  let bA = new Uint8Array(8)
  bA[0] = 0x8F
  bA[1] = 0xF8
  bA[2] = 0xFE
  bA[3] = 0x08
  bA[4] = 2
  bA[5] = id
  bA[6] = speed
  bA[7] = checksum(bA, 7)
  connection.send(bA.buffer)
  console.log('REQUEST SET [' + servoAlias[id] + '] SWEEP SPEED to ' + speed.toString())
  let object = document.getElementById('swp' + id.toString() + speed.toString())
  let tmpColor = object.style.backgroundColor
  object.style.backgroundColor = '#0ffff7'
  setTimeout(function () { object.style.backgroundColor = tmpColor }, 100)
}

function socketRequest (type) {
  console.log('socket request')
  let bA = new Uint8Array(7)
  bA[0] = 0x8F
  bA[1] = 0xF8
  bA[2] = 0xFE
  bA[3] = 0x02
  bA[4] = 0x01
  bA[5] = type & 0x000000FF
  bA[6] = checksum(bA, 6)
  connection.send(bA.buffer)
}

function checksum (bA, location) {
  let sum = bA[2]
  for (let i = 3; i < location; i++)sum ^= bA[i]
  return sum
}
