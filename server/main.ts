/**
 * 飛控封包轉換積木
 * 將 "LED...#" / "SRT...#" 指令字串轉成 26 byte 二進位封包，
 * 由「序列」積木（序列 重新導向到 TX/RX）設定的腳位送出。
 */

//% weight=100 color=#0079B9 icon="" block="飛控"
namespace drone {
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
}
