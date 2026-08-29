# KIN Phone Handshake Freeze V1

Frozen on 2026-08-29 after physical acceptance with two Cardputer-Adv devices and a Pixel running Android Chrome.

## Frozen flow

1. Open `https://xing0325.github.io/kin-hackathon/#/today` on Pixel.
2. Connect both `NODE-*` devices from **设备连接**.
3. Press numeric key `1` on both devices to enter **KIN LINK**.
4. Tap **两台按 1 后，开始握手** on the phone.
5. Short-press G0 on both devices.
6. Perform the handshake/shake action with both devices.
7. Each device plays one completion tone and shows `KIN CONNECTED / CONTEXT SAVED`.

## Frozen components

- Cardputer-Adv text/menu firmware with TCA8418 numeric-key input.
- Agent_link BLE service `0xFFC0`, command `0xFFC1`, event `0xFFC4`.
- Android Chrome Web Bluetooth two-device demo bridge.
- One-shot completion guard: IMU telemetry cannot retrigger the completion tone.
- Firmware SHA256: `74ab43547ee258ec964257ae2d1a91516790a328a919085fc89d139e4e6f23cd`.

## Acceptance

- Both devices connected from Pixel Chrome.
- Both devices entered KIN LINK, accepted G0 confirmation and gesture input.
- Both devices displayed the connected state.
- Completion sound played once per device and stopped.
- User acceptance: “完美了，这个流程可以冻结了”.
