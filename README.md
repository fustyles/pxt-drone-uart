# drone-uart（飛控封包轉換積木）

積木：

- **飛控 轉換並序列輸出 (字串)**：轉換指令並由序列輸出
- **URL 解碼 (字串)**：回傳解碼後的字串（`%XX` → 字元、`+` → 空白，支援 UTF-8 中文）

把收到的指令字串轉成 26 byte 二進位封包，透過 `serial.writeBuffer` 輸出。
輸出腳位與鮑率由原本的「序列 重新導向到 TX RX 鮑率」積木決定。

## 支援格式

- `LED` + 4 組 4 位 16 進位（0000~FFFA）+ `#`
- `SRT` + 4 組 4 位 10 進位 PWM（1000~2000）+ `#`

結尾 `#` 可省略；其他格式會被忽略。

## 封包格式（26 byte）

`AA 08 CH4 CH3 CH2 CH1 SW1 (255-SW2) SW3 (255-SW4) CHECKSUM 00×15`

CHECKSUM = byte 0~9 加總 & 0xFF

## 範例

```typescript
serial.redirect(SerialPin.P0, SerialPin.P1, BaudRate.BaudRate115200)
bluetooth.startUartService()
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Hash), function () {
    drone.convertAndWrite(bluetooth.uartReadUntil(serial.delimiters(Delimiters.Hash)))
})
```

#### Metadata (used for search, rendering)

* for PXT/microbit
