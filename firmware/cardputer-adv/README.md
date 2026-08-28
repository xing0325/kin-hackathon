# KIN firmware for M5Stack Cardputer-Adv

One ESP-IDF 5.5.4 firmware image is used for both demo devices. The BLE MAC suffix produces a stable visible name such as `NODE-A7B0`; user identity is bound in the Web/backend rather than compiled into separate binaries.

## Organizer integration

The project directly compiles the organizer's pinned `Agent_link` component from:

```text
../../work/Agent_link/components/agent_link
commit 3c93ecfcdc473c952a0e85d9797c2663e9ba7d87
```

M5Unified handles the Cardputer-Adv board initialization and official device sequences.

## V0.2 demo firmware

- 240×135 status UI with compact header, large action copy, link indicator,
  battery percentage, and a persistent top-right `CONNECTED` badge.
- ST7789 display status and Agent text downlink.
- BMI270 sampled locally at 100 Hz; 2 Hz Agent_link telemetry.
- Motion-threshold handshake candidate event with cooldown.
- G0 explicit confirmation event.
- Distinct short motion tone and long connection-success tone.
- Connected-state lock prevents repeated gestures or G0 presses from
  overwriting the successful result.
- A `KIN READY` downlink clears the lock for the next demo session; a 30-second
  local confirmation timeout returns the UI to retry state.
- Agent_link BLE advertising and control service.
- Agent_link battery reports.
- Agent speaker PCM queue and 16 kHz playback.
- Stable `NODE-XXXX` device name.

Not advertised yet: microphone, keyboard matrix, NFC, haptic. Microphone exists but will only be added to the capability mask after uplink/backpressure is tested on hardware.

## Build

```bash
source ~/esp/esp-idf-v5.5.4/export.sh
cd firmware/cardputer-adv
idf.py set-target esp32s3
idf.py build
```

## Flash first device

```bash
idf.py -p /dev/cu.usbmodem21201 flash monitor
```

Use the same image for both `NODE-A7B2` and `NODE-7FAE`.
