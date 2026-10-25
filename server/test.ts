// 範例：用原本的「序列」積木指定腳位，收到藍芽字串後轉換輸出
serial.redirect(SerialPin.P0, SerialPin.P1, BaudRate.BaudRate115200)
bluetooth.startUartService()

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Hash), function () {
    drone.convertAndWrite(bluetooth.uartReadUntil(serial.delimiters(Delimiters.Hash)))
})
