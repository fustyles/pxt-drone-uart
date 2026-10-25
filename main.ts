/**
 * 飛控封包轉換積木
 * 作者：法蘭斯
 * 將 "LED...#" / "SRT...#" 指令字串轉成 26 byte 二進位封包，
 * 由「序列」積木（序列 重新導向到 TX/RX）設定的腳位送出。
 */

enum DroneCommand {
    //% block="解鎖"
    Unlock,
    //% block="切換尾燈"
    TailLight,
    //% block="切換機身燈"
    BodyLight,
    //% block="停止馬達 (降落後才能用)"
    StopMotor,
    //% block="啟動馬達"
    StartMotor,
    //% block="懸停"
    Hover,
    //% block="增加油門"
    ThrottleUp,
    //% block="減少油門"
    ThrottleDown,
    //% block="向左偏航"
    YawLeft,
    //% block="向右偏航"
    YawRight,
    //% block="向前俯衝"
    PitchForward,
    //% block="向後仰退"
    PitchBackward,
    //% block="向左側滾"
    RollLeft,
    //% block="向右側滾"
    RollRight
}

enum DroneAxis {
    //% block="增加油門 (1500~2000)"
    ThrottleUp,
    //% block="減少油門 (1000~1500)"
    ThrottleDown,
    //% block="向左偏航 (1000~1500)"
    YawLeft,
    //% block="向右偏航 (1500~2000)"
    YawRight,
    //% block="向前俯衝 (1500~2000)"
    PitchForward,
    //% block="向後仰退 (1000~1500)"
    PitchBackward,
    //% block="向左側滾 (1000~1500)"
    RollLeft,
    //% block="向右側滾 (1500~2000)"
    RollRight
}

//% weight=100 color=#0079B9 icon="\uf072" block="飛控"
namespace drone {
    // 方向動作相對 1500 的差值
    let offset = 200

    /**
     * 設定方向動作的差值（預設 200）。
     * 例如差值 200：增加油門 = 1700、減少油門 = 1300。
     * @param d 差值 0~500
     */
    //% blockId=drone_set_offset
    //% block="飛控設定差值 %d"
    //% d.min=0 d.max=500 d.defl=200
    //% weight=85
    export function setOffset(d: number): void {
        offset = Math.constrain(Math.round(d), 0, 500)
    }

    /**
     * 回傳選定動作對應的指令字串。
     * 方向動作的數值為 1500 ± 差值（用「飛控設定差值」設定，預設 200）。
     * @param cmd 動作
     */
    //% blockId=drone_command_string
    //% block="飛控指令 %cmd"
    //% weight=80
    export function commandString(cmd: DroneCommand): string {
        const up = "" + (1500 + offset)
        const dn = "" + (1500 - offset)
        switch (cmd) {
            case DroneCommand.Unlock: return "LEDFFFA000000000000#"
            case DroneCommand.TailLight: return "LED0000FFFA00000000#"
            case DroneCommand.BodyLight: return "LED00000000FFFA0000#"
            case DroneCommand.StopMotor: return "LED000000000000FFFA#"
            case DroneCommand.StartMotor: return "SRT1500200020001500#"
            case DroneCommand.Hover: return "SRT1500150015001500#"
            case DroneCommand.ThrottleUp: return "SRT1500" + up + "15001500#"
            case DroneCommand.ThrottleDown: return "SRT1500" + dn + "15001500#"
            case DroneCommand.YawLeft: return "SRT" + dn + "150015001500#"
            case DroneCommand.YawRight: return "SRT" + up + "150015001500#"
            case DroneCommand.PitchForward: return "SRT15001500" + up + "1500#"
            case DroneCommand.PitchBackward: return "SRT15001500" + dn + "1500#"
            case DroneCommand.RollLeft: return "SRT150015001500" + dn + "#"
            case DroneCommand.RollRight: return "SRT150015001500" + up + "#"
        }
        return ""
    }

    /**
     * 回傳單一動作指定數值的指令字串，其他通道為 1500。
     * 數值會依動作限制在 1000~1500 或 1500~2000。
     * @param axis 動作
     * @param value 數值，預設 1500
     */
    //% blockId=drone_axis_string
    //% block="飛控指令 %axis 數值 %value"
    //% value.min=1000 value.max=2000 value.defl=1500
    //% weight=75
    export function axisString(axis: DroneAxis, value: number): string {
        const n = Math.round(value)
        let v = ""
        switch (axis) {
            case DroneAxis.ThrottleUp:
                v = "" + Math.constrain(n, 1500, 2000)
                return "SRT1500" + v + "15001500#"
            case DroneAxis.ThrottleDown:
                v = "" + Math.constrain(n, 1000, 1500)
                return "SRT1500" + v + "15001500#"
            case DroneAxis.YawLeft:
                v = "" + Math.constrain(n, 1000, 1500)
                return "SRT" + v + "150015001500#"
            case DroneAxis.YawRight:
                v = "" + Math.constrain(n, 1500, 2000)
                return "SRT" + v + "150015001500#"
            case DroneAxis.PitchForward:
                v = "" + Math.constrain(n, 1500, 2000)
                return "SRT15001500" + v + "1500#"
            case DroneAxis.PitchBackward:
                v = "" + Math.constrain(n, 1000, 1500)
                return "SRT15001500" + v + "1500#"
            case DroneAxis.RollLeft:
                v = "" + Math.constrain(n, 1000, 1500)
                return "SRT150015001500" + v + "#"
            case DroneAxis.RollRight:
                v = "" + Math.constrain(n, 1500, 2000)
                return "SRT150015001500" + v + "#"
        }
        return ""
    }

    // 對應原 Arduino 程式的 tcpReciveData[0..3] 與 ctrbuff[0..3]，狀態會保留
    let tcpReciveData: number[] = [0, 0, 0, 0]
    let ctrbuff: number[] = [0, 0, 0, 0]

    // 16 進位字串轉整數（同 strtol：遇到非 hex 字元即停止）
    function hexToInt(s: string): number {
        let v = 0
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i)
            let d = 0
            if (c >= 48 && c <= 57) d = c - 48
            else if (c >= 65 && c <= 70) d = c - 55
            else if (c >= 97 && c <= 102) d = c - 87
            else return v
            v = v * 16 + d
        }
        return v
    }

    // 10 進位字串轉整數（同 Arduino String.toInt）
    function decToInt(s: string): number {
        let v = 0
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i)
            if (c < 48 || c > 57) return v
            v = v * 10 + (c - 48)
        }
        return v
    }

    // 等同 Arduino 整數 map()，並限制在 0~255
    function mapByte(x: number, inMin: number, inMax: number): number {
        return Math.constrain(Math.idiv((x - inMin) * 255, inMax - inMin), 0, 255)
    }

    // 去除頭尾空白、\r、\n
    function trim(s: string): string {
        let start = 0
        let end = s.length
        while (start < end && s.charCodeAt(start) <= 32) start++
        while (end > start && s.charCodeAt(end - 1) <= 32) end--
        return s.substr(start, end - start)
    }

    /**
     * 將指令字串轉換成飛控封包，並由序列埠輸出。
     * 輸出腳位與鮑率請用「序列 重新導向到」積木設定。
     * 格式不符的字串會被忽略。
     * @param cmd 收到的指令字串，例如 SRT1500150015001500#
     */
    //% blockId=drone_convert_write
    //% block="飛控 轉換並序列輸出 %cmd"
    //% cmd.defl="SRT1500150015001500#"
    //% color=#002050
    export function convertAndWrite(cmd: string): void {
        let c = trim(cmd)
        // 若讀取時已用 # 分隔而被去掉，補回
        if (c.length == 19) c = c + "#"
        if (c.length != 20 || c.charAt(19) != "#") return

        const head = c.substr(0, 3)
        if (head == "LED") {
            for (let i = 0; i < 4; i++)
                ctrbuff[i] = mapByte(hexToInt(c.substr(3 + i * 4, 4)), 0, 65530)
        } else if (head == "SRT") {
            for (let i = 0; i < 4; i++)
                tcpReciveData[i] = mapByte(decToInt(c.substr(3 + i * 4, 4)), 1000, 2000)
        } else {
            return
        }

        const packet = pins.createBuffer(26) // 預設全為 0
        packet[0] = 0xAA
        packet[1] = 8
        packet[2] = tcpReciveData[3]
        packet[3] = tcpReciveData[2]
        packet[4] = tcpReciveData[1]
        packet[5] = tcpReciveData[0]
        packet[6] = ctrbuff[0]
        packet[7] = 255 - ctrbuff[1]
        packet[8] = ctrbuff[2]
        packet[9] = 255 - ctrbuff[3]
        let checksum = 0
        for (let i = 0; i < 10; i++) checksum += packet[i]
        packet[10] = checksum & 0xFF
        serial.writeBuffer(packet)
    }

    // 單一 hex 字元轉數值，無效回傳 -1
    function hexDigit(c: number): number {
        if (c >= 48 && c <= 57) return c - 48
        if (c >= 65 && c <= 70) return c - 55
        if (c >= 97 && c <= 102) return c - 87
        return -1
    }

    // 讀取 s[i] 開始的 "%XX"，成功回傳 0~255，失敗回傳 -1
    function readPct(s: string, i: number): number {
        if (i + 2 >= s.length) return -1
        if (s.charAt(i) != "%") return -1
        const h = hexDigit(s.charCodeAt(i + 1))
        const l = hexDigit(s.charCodeAt(i + 2))
        if (h < 0 || l < 0) return -1
        return h * 16 + l
    }

    /**
     * 將 URL 編碼的字串解碼（%XX 轉回字元、+ 轉成空白，支援 UTF-8 中文）
     * 無效的 % 序列會保留原樣。
     * @param s 要解碼的字串，例如 SRT1500%2C1500%23
     */
    //% blockId=drone_url_decode
    //% block="URL 解碼 %s"
    //% s.defl=""
    export function urlDecode(s: string): string {
        let out = ""
        let i = 0
        while (i < s.length) {
            const ch = s.charAt(i)
            if (ch == "+") {
                out += " "
                i++
                continue
            }
            const b = ch == "%" ? readPct(s, i) : -1
            if (b < 0) {
                out += ch
                i++
                continue
            }
            if (b < 0x80) {
                out += String.fromCharCode(b)
                i += 3
                continue
            }

            // UTF-8 多位元組
            let n = 0
            let cp = 0
            if ((b & 0xE0) == 0xC0) { n = 1; cp = b & 0x1F }
            else if ((b & 0xF0) == 0xE0) { n = 2; cp = b & 0x0F }
            else if ((b & 0xF8) == 0xF0) { n = 3; cp = b & 0x07 }
            else {
                out += s.substr(i, 3)  // 不合法的起始位元組，保留原樣
                i += 3
                continue
            }

            let ok = true
            let j = i + 3
            for (let k = 0; k < n; k++) {
                const cb = readPct(s, j)
                if (cb < 0 || (cb & 0xC0) != 0x80) { ok = false; break }
                cp = (cp << 6) | (cb & 0x3F)
                j += 3
            }
            if (ok) {
                out += String.fromCharCode(cp)
                i = j
            } else {
                out += s.substr(i, 3)
                i += 3
            }
        }
        return out
    }
}
