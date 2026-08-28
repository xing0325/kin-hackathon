# Hardware Truth Report: OJBadge + Cardputer-Adv

## 2026-08-27 Cardputer-Adv 实板补充

### FACT

- USB 设备 `/dev/cu.usbmodem21201` 经 esptool 识别为 ESP32-S3 QFN56 rev v0.2、8 MB embedded Flash、40 MHz crystal，MAC `50:78:7d:ce:a7:b0`。
- 本项目的 ESP-IDF 5.5.4 + Agent_link + M5Unified 固件已实际 build/flash/boot。
- M5Unified 在实板自动检测 `board_M5CardputerADV`，运行时启用 IMU、speaker 和 mic，电量读数为 63%。
- Agent_link BLE 已注册 Service C `0xFFC0`并以 `NODE-A7B2` 广播；这确认了 Cardputer-Adv 的最小 Adapter 能启动，尚不等于 ROROLEE 端到端已连通。

### DECISION

- V0.1 Board Adapter 使用 M5Unified 承接屏幕/BMI270/音频/电源，官方 Agent_link 只承接 protocol/transport/capability，两者通过有界 FreeRTOS queue/stream buffer 解耦。
- Context Handshake 使用 `BMI270 gesture candidate + G0 explicit confirm + BLE/Cloud correlation`，因此 NFC 和震动缺失不阻塞演示。

### HYPOTHESIS / 待验证

- ROROLEE 能正确识别 Cardputer 的 Agent_link capabilities，并向屏幕/扬声器下发内容。
- 一台 ROROLEE 客户端能稳定管理两台设备；如不能，双机将各连一台手机，统一经后端 nonce 关联。

> Phase 0 资料审计，2026-08-27。本报告只固化硬件事实、软件入口、未知项和 Phase 1/2 计划，没有开始产品功能开发。

## 1. 结论

### FACT

- OJBadge 是 OpenJumper 的独立板卡，不是 Waveshare `ESP32-S3-Touch-LCD-1.85B`。官方介绍页、OJBadge V0.1 原理图和 Aily Blockly 的 `oj_badge` 板包可相互印证。
- 主控是 **ESP32-S3R8**，即带 8 MB Octal PSRAM 的 ESP32-S3 封装；外置 Flash 是 **W25Q128JVPIQ（16 MB）**。Aily 板包也使用 `16M` Flash 和 `opi` PSRAM 配置。
- 屏幕是 **1.28 英寸、240x240、GC9A01、4-wire SPI** 圆形 IPS TFT；触摸 IC 是 **CST816D**。
- 音频链路是单麦克风 **GMI6027P-32DB -> ES8311 codec -> AW8010 系列功放 -> 1609 有线喇叭**。官方介绍页给出功放完整型号 `AW8010AFCR`。
- 电池是 **402530、3.7 V / 300 mAh**；电量计是 **BQ27220YZFR**，充电 IC 是官方页列出的 **LGS4056HDA**，3.3 V Buck 在原理图标为 **TLV62569DBVR**。
- 板上有两个物理按键，但功能不等价：`SW2` 是 GPIO0 `BOOT`，`SW1` 连接 `EC190707-4-0480` 电源锁存/开关电路，原理图标注“3 秒开关机”。不应将 SW1 当作普通应用 GPIO。
- V0.1 原理图上 **没有 IMU、没有 NFC，也没有震动马达/触觉驱动器**。公开板包和依赖中也没有这三类外设。
- 公开 `DeotalandDev/Agent_link` 在审计提交 `3c93ecfcdc473c952a0e85d9797c2663e9ba7d87` 中没有 OJBadge Board Adapter。

### 对先前假设的更正

**REJECTED HYPOTHESIS:** OJBadge 不是 Waveshare 1.85B 的别名/变体。

关键反证是 OJBadge 官方整机尺寸 `45.8 x 45.8 x 12.3 mm`、1.28 英寸 240x240 GC9A01 屏以及完全不同的 GPIO/音频电路。Waveshare 1.85B 的 1.85 英寸 360x360 ST77916、ES7210、QMI8658A、RTC 和 microSD 不存在于 OJBadge V0.1 原理图。后续实现不得复用旧假设的芯片和引脚。

### 2026-08-27 实板只读验证

- 更换为支持数据的 USB-C 线后，macOS 枚举出 Espressif `USB JTAG/serial debug unit`，VID/PID 为 `0x303A:0x1001`，串口为 `/dev/cu.usbmodem1101`。
- ROM 读取确认 **ESP32-S3 QFN56 revision v0.2、40 MHz crystal、8 MB embedded PSRAM**。
- JEDEC 读取确认 Flash manufacturer/device `0xEF:0x4018`、**16 MB、quad mode、3.3 V**，与 W25Q128 规格一致。
- Secure Boot 和 Flash Encryption 均未启用；本次只执行读操作及 RAM flasher stub，Flash 未改写。
- 现有应用 descriptor 为 `arduino-lib-builder`，version `487f743`，构建时间 `2025-09-16 15:17:38`，底层 IDF 为 `v5.5.1-1-g129cd0d247`。二进制字符串指向 Aily 项目和 Arduino ESP32 core 3.3.1；这是基于二进制的推断，不是源码来源证明。
- 已读取并保存原始 16 MB Flash 镜像，SHA256 为 `fc8ef7ca51db4ddeeec42bebde9d06b229af8bc76ad043bb29d7764bd7eaadfd`；独立重读前 64 KiB 并逐字节比较通过。
- 实板确认了 SoC/PSRAM/Flash/USB 路径；LCD、touch、audio、battery 及 IMU/NFC/haptic 缺失仍需 Phase 1 运行时/视检验证。

## 2. 证据链与可复现性

证据优先级遵循：实板/原理图/官方 BSP 与例程 > 官方板卡文档 > 赛道文档 > 项目假设。

| ID | 来源 | 审计版本 | 证据级别 | 用途 |
|---|---|---|---|---|
| S1 | [OJBadge 官方详细介绍](https://arduino.me/a/3350) | 抓取 2026-08-27；HTML SHA256 `d8d3943e55f957f6f96f62b81ea9ff0ccd630c55246eaee1e451e0a4597a76ec` | 官方板卡页 | 外形、尺寸、BOM、引脚表、资料链接、Aily 例程入口 |
| S2 | [OJBadge V0.1 原理图 PDF](https://download.openjumper.cn/OJBadge%E8%B5%84%E6%96%99/SCH_OJBadge%E7%94%B5%E5%AD%90%E5%90%A7%E5%94%A7%E5%8E%9F%E7%90%86%E5%9B%BE.pdf) | 2026-07-14；SHA256 `6beeba6792a2c5aa937a79fbcbd43ace82ff7c0fb3214081a762200c28f6fb2e` | 主设计证据 | 芯片、网标、GPIO、不存在的模块 |
| S3 | [T128HC-C16-08-TP-V1 屏幕规格书](https://download.openjumper.cn/OJBadge%E8%B5%84%E6%96%99/T128HC-C16-08-TP-V1-%E4%BA%A7%E5%93%81%E8%A7%84%E6%A0%BC%E4%B9%A6-20260715.pdf) | Ver 1.0, 2026-07-15；SHA256 `4ed3e88c23acb451408129a342ee4253bf18c06ac5dbfb72a834966e6b7b358b` | 官方器件规格 | GC9A01/CST816D、尺寸、电气与 FPC 引脚 |
| S4 | [Aily OJBadge 板包](https://github.com/ailyProject/aily-blockly-boards/tree/8910a727ec8c081ea993aea8a3db10351ffa29c1/oj_badge) | commit `8910a727ec8c081ea993aea8a3db10351ffa29c1`；package 3.3.1 / board 1.0.1 | 官方生态板级元数据 | Arduino/Aily 目标、Flash/PSRAM、引脚表、默认依赖 |
| S5 | [Aily Blockly libraries](https://github.com/ailyProject/aily-blockly-libraries/tree/df82ee89260fc54ea8e3bca3d06f18f2890313e0) | commit `df82ee89260fc54ea8e3bca3d06f18f2890313e0` | 官方生态驱动包 | ES8311、CST816S 兼容库、BQ27220、LVGL/TFT_eSPI 库入口 |
| S6 | [Deotaland Agent_link](https://github.com/DeotalandDev/Agent_link/tree/3c93ecfcdc473c952a0e85d9797c2663e9ba7d87) | commit `3c93ecfcdc473c952a0e85d9797c2663e9ba7d87` | 目标集成源码 | Board 接口、能力位、BLE/音频协议、适配器结构 |
| S7 | 竞赛实物 OJBadge | 2026-08-27 只读验证 | 最高 | USB、SoC revision、Flash/PSRAM、安全状态、现有固件和完整 Flash 备份 |

本地审计副本位于 `work/ojbadge-source/`、`work/aily-blockly-boards/`、`work/aily-blockly-libraries/` 和 `work/Agent_link/`。

## 3. 硬件 Truth Table

| 项目 | 结论 | 类型/数值 | 证据与限定 |
|---|---|---|---|
| SoC | **FACT** | ESP32-S3R8 | 原理图 U1；R8 含 8 MB OPI PSRAM |
| Flash | **FACT** | W25Q128JVPIQ, 128 Mbit = 16 MB | 原理图 U12；Aily 编译参数 `build.flash_size=16MB` |
| PSRAM | **FACT** | 8 MB Octal PSRAM | ESP32-S3R8 型号 + Aily `PSRAM: opi` |
| LCD | **FACT** | T128HC-C16-08-TP-V1；1.28" IPS；240x240；262K 色；GC9A01；4-wire SPI | S1/S2/S3/S4 |
| Touch | **FACT** | CST816D 电容触摸 | S1/S2/S3；Aily 提供名为 CST816S 的库，兼容性需真机确认 |
| Audio codec | **FACT** | ES8311，同时承担单麦 ADC 和喇叭 DAC | S1/S2 |
| Microphone | **FACT** | GMI6027P-32DB，单颗模拟麦克风 | S1 + 原理图 MIC1 链路 |
| Amplifier | **FACT** | AW8010AFCR | S1；原理图 U6 显示差分输入/输出和 `SHUTDOWN#`/`CTRL` |
| Speaker | **FACT** | 1609 有线喇叭 | S1 |
| Battery | **FACT** | 402530 LiPo, 3.7 V / 300 mAh | S1 |
| Fuel gauge | **FACT** | BQ27220YZFR | S1/S2 U3；Aily 库默认 7-bit 地址 `0x55` |
| Charger | **FACT** | LGS4056HDA | S1；S2 U8 电路拓扑一致，PDF 符号未印出型号 |
| 3.3 V regulator | **FACT** | TLV62569DBVR | S2 U14 |
| Power latch | **FACT** | EC190707-4-0480 | S2 U9；SW1 长按开关机 |
| USB | **FACT** | USB Type-C, ESP32-S3 native USB | GPIO19/20 |
| Buttons | **FACT** | SW1 电源；SW2 BOOT/GPIO0 | 只将 GPIO0 视为可读应用按键 |
| IMU | **FACT: absent on V0.1** | 无 | 原理图、BOM 页和 Aily 板包均无 IMU |
| NFC | **FACT: absent on V0.1** | 无 | 无 NFC IC、匹配网络或天线 |
| Vibration/haptic | **FACT: absent on V0.1** | 无 | 无马达、震子或驱动级 |
| RTC / microSD | **FACT: absent on V0.1** | 无 | 原理图/板包无相应器件 |
| U10 功率路径 IC | **UNKNOWN exact part** | VIN/VOUT/ST/CE# 六引脚器件 | 原理图没有标注型号；不猜料 |

屏模组规格书还确认：模组 42.00 x 42.00 x 3.56 mm，有效显示区 32.4 x 32.4 mm，VCI 工作范围 2.5–3.3 V，背光建议独立恒流驱动。

## 4. 引脚和总线真值

| 功能 | GPIO | 备注 |
|---|---:|---|
| LCD MOSI / RST / SCLK / CS / DC | 10 / 11 / 12 / 13 / 14 | GC9A01 SPI |
| LCD backlight | 16 | `LED_BL`，经 Q1 驱动 |
| Audio PA control | 17 | 原理图 `CTRL` -> U6 `SHUTDOWN#` |
| Codec I2C SDA/SCL | 6 / 7 | ES8311 控制总线 |
| Touch INT / RST | 38 / 46 | CST816D |
| Touch + gauge SDA/SCL | 43 / 44 | CST816D 和 BQ27220 共享第二条 I2C |
| I2S MCLK / BCLK / WS | 45 / 39 / 41 | ES8311 |
| Codec ADC -> MCU | 40 | 原理图名 `DOUT`；MCU 配置中是 `data_in` |
| MCU -> codec DAC | 42 | 原理图名 `DIN`；MCU 配置中是 `data_out` |
| BOOT key | 0 | active low；同时是启动绑定脚 |
| Native USB D-/D+ | 19 / 20 | 不作为普通 GPIO |

### 重要纠错和冲突

- Aily `board.json` 将 GPIO17 命名为 `LCD_CTRL`；**原理图表明它实际是音频功放 `CTRL/SHUTDOWN#`**。Adapter 必须以原理图为准。
- Aily `displayConfig` 的 `sda=6/scl=7` 不是触摸总线；CST816D 使用 GPIO43/44。GPIO6/7 是 ES8311 控制 I2C。
- 原理图从 codec 视角命名 `DOUT=GPIO40` / `DIN=GPIO42`。ESP-IDF I2S 配置需换成 MCU 视角：`din=40`, `dout=42`。
- GPIO0 可在启动后用于 push-to-talk，但复位/上电时按住会进入下载模式。
- GPIO15/18 在原理图上带附加无源网络，但没有公开接口证据；不将它们预认为可用扩展 GPIO。
- 原理图只显示 Type-C、屏幕 FPC 和测试点，没有对用户的 GPIO 扩展座。

## 5. BSP 和例程调查

### FACT

- 介绍页提供三个 AilyBlockly 项目入口：**OJBadge 显示动画、FFT 频谱、联网天气时钟**。
- `ailyProject/aily-blockly-boards/oj_badge` 是可公开审计的板包元数据，它面向 **Arduino/Aily Blockly**，不是 ESP-IDF BSP。
- 板包默认依赖包括 `lib-bq27220 1.0.0`、`lib-cst816s 1.0.0`、`lib-es8311 1.0.0`、`lib-lvgl 1.0.1` 和 `lib-tft-espi 2.5.52`。
- GitHub 公开搜索找到 OJBadge 板包和一个非官方 OrbitBadge 文档仓库，**未找到 OpenJumper 发布的 ESP-IDF OJBadge BSP/例程仓库**。

### HYPOTHESIS / 需要验证

- Aily 的 CST816S 库是否完整兼容实物的 CST816D，尚未真机读 ID/坐标验证。
- Arduino 驱动可作为寄存序列参考，但 Agent_link 的目标是 ESP-IDF 5.5.4；不应在 Adapter 中嵌入 Arduino Core。
- ESP-IDF 实现预计由 `esp_lcd` + GC9A01 panel driver、I2C CST816 驱动、`esp_codec_dev`/ES8311 和 BQ27220 驱动组合；具体组件版本需在 Phase 1 以 IDF 5.5.4 锁定并编译验证。

### 当前构建状态

- 资料、原理图、Aily 板包/库和 Agent_link 源码审计：**PASS**。
- ESP-IDF 5.5.4 clean build：**NOT RUN**，本机当前没有 `idf.py`。
- USB/SoC/Flash/PSRAM/security 只读验证：**PASS**。
- LCD/touch/audio/battery 运行时验证：**NOT RUN**，留在 Phase 1。

## 6. Agent_link 审计

- 新板卡是 `boards/<board>/config.h` + `config.json` + `<board>.cc`，再在 `main/Kconfig.projbuild` 和 `main/CMakeLists.txt` 注册。
- `Board` 虚接口包含 `Name`、`Capabilities`、`PlayAudio`、`AudioEnd`、`ShowText`、`Vibrate`、`SetLed`、`GetBatteryLevel`、`IsCharging`。
- SDK 回调还有 `on_show_image` 和 `on_listen`，但公共 `main/app_main.cpp` 没有通过 `Board` 抽象完整绑定它们。App 主动 `StartCapture (0x3C)` 需要小型共享层扩展。
- 当前只有 NimBLE BLE transport 可用；Wi-Fi/USB 后端是脚手架。
- BLE 控制服务是 `0xFFC0`；语音上行 notify 是 `0xFFA1`；下行 TTS / ASR 数据通道使用 L2CAP CoC PSM `0x0081`。
- 上游状态：控制面已完成；语音上/下行和设备 I/O 已实现但尚未真机验证；录音/文件/OTA 等仍不完整。

## 7. Board Adapter 应如何实现

### DECISION 提案（待讨论批准）

只在 Phase 1 真机 bring-up 通过后新建：

```text
boards/ojbadge/config.h
boards/ojbadge/config.json
boards/ojbadge/ojbadge.cc
main/Kconfig.projbuild: BOARD_TYPE_OJBADGE
main/CMakeLists.txt: select ojbadge + pinned components
sdkconfig defaults: esp32s3 / 16 MB flash / 8 MB OPI PSRAM
```

第一版能力位：

```text
MIC | SPEAKER | SCREEN | BUTTON | BATTERY
```

明确不宣告 `HAPTIC`、`SENSOR`、`LED`、`RECORDING`、`CAMERA`。`SENSOR` 不能因 BQ27220 而添加；电量已有专用 `BATTERY` 能力。

| Agent_link 表面 | OJBadge 映射 | 实现约束 |
|---|---|---|
| `ShowText` | GC9A01 240x240 + LVGL/轻量文本层 | 专用 UI 任务；圆屏安全区；不在 BLE callback 绘制 |
| `PlayAudio` | ES8311 DAC + AW8010；I2S `dout=42` | BLE callback 只入队；音频任务消费 PCM16/16 kHz/mono；GPIO17 控 PA |
| `AudioEnd` | 等待队列/DMA drain 后 mute/PA off | 不能收到结束就立即断 PA |
| microphone uplink | ES8311 ADC；I2S `din=40` | 采集任务转 PCM16/16 kHz/mono，处理 MTU/背压，再调 `agent_link_push_voice` |
| button | BOOT/GPIO0 push-to-talk | active-low 消抖；运行期可用；不把 SW1 暴露为 app key |
| battery | BQ27220 on I2C GPIO43/44 | `GetBatteryLevel` 返回校准 SOC；与触摸共享总线锁 |
| charging | 首版不做未验证声明 | U8 `CHRG/DONE` 只驱动 LED，无 MCU GPIO；用电流方向推断需真机定义阈值 |
| touch | CST816D on I2C GPIO43/44 | Phase 1 验证；Phase 2 只用于本地确认，Agent_link 无通用 touch capability |
| image | 首版留空 | 文本是更小的可验收闭环；如赛制要求再增 `Board::ShowImage` 桥 |

并发原则：两条 I2C 分开管理；GPIO43/44 上的触摸和电量计共享锁；显示、音频、BLE callback 分任务；所有 callback 快速返回；驱动组件版本锁定。

## 8. Phase 1 计划：OJBadge Bring-up

Phase 1 只建立可重复的底层能力，不做 Builder Radar / Handshake 等产品功能。

### P1.0 实物与版本归档

- 记录外壳、PCB/丝印、USB boot log、chip revision、Flash ID/容量和 PSRAM 容量。
- 确认实物是否对应 V0.1 原理图；任何差异都建立新 revision 记录。
- 出口：实物身份表 + boot/flash/PSRAM 原始日志。

### P1.1 固定 ESP-IDF 5.5.4 工具链

- 安装并锁定 ESP-IDF 5.5.4，记录 Python/toolchain/component lockfile。
- 建立最小 `ojbadge-bringup` 工程，只包驱动 smoke tests，不接 Agent_link。
- 出口：从 clean cache 可复现 build，记录 binary size 和警告。

### P1.2 外设验证矩阵

| 顺序 | 对象 | 验证方法 | PASS 条件 |
|---:|---|---|---|
| 1 | LCD/backlight | SPI init、色条、文字、背光 PWM | 240x240 方向/色序正确，10 分钟无花屏/重启 |
| 2 | Touch | GPIO43/44 扫描、RST/INT、全屏点击/滑动 | 读到稳定设备，坐标与屏方向一致 |
| 3 | Buttons/power | GPIO0 消抖；SW1 长按行为 | BOOT 事件稳定；电源按键行为被记录且不当 app key |
| 4 | Codec control | GPIO6/7 I2C 扫描 + ES8311 寄存读写 | 地址、复位值和配置序列确认 |
| 5 | Speaker | 1 kHz 标准波 + 语音样本 | GPIO17/PA、音量、采样率和无明显失真通过 |
| 6 | Microphone | 安静/标准语音录音，保存 PCM | GPIO40 收到数据，幅度/偏置/削波记录，16 kHz mono 可用 |
| 7 | Battery gauge | GPIO43/44 读 BQ27220 | USB/电池下电压、SOC、电流数值合理，符号语义确认 |
| 8 | Charging/power | 放电、插 USB、充电完成转换 | 明确哪个信号支持 `IsCharging`；若不可靠则记为 unsupported |
| 9 | Absence audit | PCB 视检 + I2C 扫描 + 供电时动作 | 继续确认无 IMU/NFC/震动；如有新发现立即更新 Truth Table |

### P1.3 综合资源测试

- 同时运行 LCD/touch、全双工音频、BLE advertising 和电量轮询。
- 记录 internal heap/PSRAM、任务栈、DMA underrun、触摸延迟、BLE 断连和平均电流。
- 出口：30 分钟无崩溃，且更新 GPIO/总线/内存所有权表。

## 9. Phase 2 计划：最小 Agent_link Adapter

### P2.0 Adapter skeleton

- 只增加 OJBadge 三个 board 文件和 Kconfig/CMake/sdkconfig 注册，锁定 Phase 1 验证过的驱动。
- 不重构 Agent_link，不引入 Arduino Core。
- 出口：ESP-IDF 5.5.4 clean build + flash + boot PASS。

### P2.1 BLE 控制面

- 广播稳定设备名，用 ROROLEE 连接，枚举 `0xFFC0`，校验 connect/disconnect 和 battery event。
- 出口：20 次连接/断开循环，保留协议日志，无泄漏/死锁。

### P2.2 输出闭环

- 先绑定 `ShowText`，再绑定非阻塞 `PlayAudio/AudioEnd`。
- 出口：ROROLEE 下发文本和 PCM16/16 kHz/mono，屏幕/喇叭正确输出，BLE callback 不被阻塞。

### P2.3 输入闭环

- GPIO0 push-to-talk -> ES8311 ADC -> PCM 队列 -> `agent_link_push_voice/voice_end`。
- 先验证设备主动 push-to-talk；如评审路径要求 App `StartCapture`，再增加最小 `on_listen` 桥。
- 出口：20 次连续语音请求到达 Cloud Agent 并获得可听回复，记录成功率和端到端延迟。

### P2.4 电量与本地交互

- 上报 BQ27220 SOC；`IsCharging` 只在 Phase 1 有可验证定义时实现。
- 触摸只做本地确认/取消，不虚构 Agent_link touch capability。
- 出口：capability mask 与实际 callback/行为逐项一致。

### Phase 2 Definition of Done

```text
OJBadge
  -> BLE connect to ROROLEE
  -> GPIO0/touch explicit input
  -> ES8311 microphone PCM uplink
  -> Cloud Agent response
  -> GC9A01 text + ES8311/AW8010 audio downlink
  -> BQ27220 battery report
```

综合运行至少 30 分钟，完整语音闭环重复 20 次，记录断连、音频丢块/underrun、峰值 internal heap、PSRAM 使用和端到端延迟。Builder Radar、Context Handshake、手势识别和社交业务层不在 Phase 1/2 内。

## 10. 开始 Phase 1 前需讨论的决策

1. 是否接受“无官方 ESP-IDF BSP，基于原理图 + 标准 ESP-IDF 组件建立小型 bring-up 层”。
2. 首版 UI 是否只要文本，暂不接 Agent_link image downlink。
3. ROROLEE 评审路径需要设备主动 push-to-talk，还是 App 主动 `StartCapture`。
4. `IsCharging` 在无专用 MCU 充电状态引脚时，是允许以 BQ27220 电流方向推断，还是首版固定不支持。
5. Context Handshake 后续只考虑 **BLE proximity + 按键/触摸显式确认**；由于硬件已确认没有 IMU/NFC/震动，删除相应方案。

## 11. 2026-08-27 Cardputer-Adv 主路径提案

> 本节记录架构候选变更；仍属于 Phase 0，不包含产品功能实现。第 8–10 节保留为 OJBadge 原路径与历史依据。

### FACT

- 用户转述主办方已口头确认：可以直接使用自有 **M5Stack Cardputer-Adv** 开发和演示，但必须使用主办方 `Agent_link` 完成通信/协议接入。本条的证据级别是“用户报告的主办方口头确认”，建议保留聊天截图作为赛制凭证。
- 现场有两台 Cardputer-Adv，可用于双人/双设备 Context Handshake 演示。
- M5Stack 官方资料确认 Cardputer-Adv（K132-Adv）使用 Stamp-S3A / ESP32-S3FN8、8 MB Flash、1.14 英寸 240x135 ST7789V2、56 键 TCA8418 键盘、ES8311 codec、MEMS 麦克风、NS4150B 功放、1 W 喇叭、1750 mAh 电池、microSD，以及 **BMI270 六轴 IMU**。
- 官方页面将 ESP-IDF 列为支持的平台；官方 `M5Cardputer` 库明确支持 Cardputer 和 Cardputer-ADV。2026-08-27 本地审计版本：`M5Cardputer` commit `f1392858b9994c3547120e602a57d3553d16ab01`，`M5Unified` commit `3eaaf828adfd0923c71ccc2e233a0199d9958faa`。
- Cardputer-Adv 官方规格和原理图入口没有列出 NFC 或震动马达。因此 **IMU 已解决，NFC/震动仍不存在**；但它们不再是握手闭环的必要条件。
- `Agent_link` 当前没有 Cardputer-Adv Board Adapter，但其 ESP32-S3 NimBLE transport、通用 ES8311 音频实现和 ST7789 驱动参考可复用。其他板卡的引脚不得直接复制。

### Cardputer-Adv 关键引脚事实

| 功能 | GPIO | 备注 |
|---|---|---|
| LCD | BL/PWR 38, RST 33, DC 34, MOSI 35, SCK 36, CS 37 | ST7789V2, 240x135 |
| I2C shared bus | SDA 8, SCL 9 | ES8311、BMI270、TCA8418 共用；Adapter 必须统一仲裁 |
| Audio I2S | BCLK 41, codec->MCU 46, LRCK 43, MCU->codec 42 | MCLK/PA 细节须用原理图与真机例程确认 |
| Keyboard | INT 11 | TCA8418RTWR；官方库默认地址 `0x34` |
| IMU | SDA 8, SCL 9 | BMI270 六轴 |
| Battery | ADC 10 | 官方页面只确认 ADC，不把它宣称为 fuel gauge |
| microSD | CS 12, MOSI 14, SCK 40, MISO 39 | 可用于日志/演示资源 |
| IR | TX 44 | 首版不使用 |
| Grove | G2, G1 | 扩展接口 |

### DECISION（已确认）

1. **主开发板切换到 Cardputer-Adv；不拆机、不把模块飞线接入 OJBadge。** OJBadge 保留原厂固件、Flash 备份与硬件报告，可作为赛事硬件研究证据或可选展示物，不进入首版关键路径。
2. 新建最小 `boards/cardputer-adv` Agent_link Adapter，目标继续锁定 **ESP-IDF 5.5.4**；优先复用 Agent_link 的 NimBLE/ES8311/ST7789 组件，M5Stack 官方代码用于板级初始化、引脚和寄存器序列参考。
3. 第一版 capability 候选为 `MIC | SPEAKER | SCREEN | BUTTON | BATTERY | SENSOR`。`SENSOR` 只代表已验证的 BMI270；不声明 NFC、HAPTIC 或 touch。
4. 两台设备共用一套固件，通过配置生成 `NODE_A` / `NODE_B` 身份，不维护两个代码分支。
5. Handshake 使用 **BLE proximity 候选 + 两台 BMI270 时间相关手势 + 双方按键确认**。手势只生成候选事件，最终建立关系必须由双方显式确认，避免现场误触发。
6. Agent_link 继续承担赛事要求的设备通信链路；匹配、双设备事件关联、Shared Context 和 Agent 推理放在 ROROLEE/Cloud Agent。

### 修订后的 Phase 1：Cardputer-Adv 双机 Bring-up + Adapter 最小闭环

| 阶段 | 工作 | 验收出口 |
|---|---|---|
| P1.0 双机归档 | 分别记录序列号/MAC、板型、boot log、Flash/固件版本；备份两台原厂固件 | `NODE_A`/`NODE_B` 身份表与可恢复备份 |
| P1.1 工具链 | 锁定 ESP-IDF 5.5.4 和组件版本，建立纯 bring-up 工程 | clean build/flash/boot 可重复 |
| P1.2 外设矩阵 | 依次验证 ST7789、TCA8418、BMI270、ES8311 mic/speaker、电池 ADC、BLE；确认共享 I2C 和音频时钟/功放 | 每项有原始日志；两台均 PASS |
| P1.3 Adapter skeleton | 增加 `boards/cardputer-adv`、Kconfig/CMake 注册和准确 capability mask | 两台均可被 ROROLEE 识别并稳定连接 |
| P1.4 Agent_link I/O | `ShowText`、音频下行、键盘/按键事件、麦克风上行、电池上报、IMU custom event | 单机完整 Agent_link 回路重复 20 次 |
| P1.5 双机压力测试 | 两台同时运行显示、IMU、音频、BLE 30 分钟 | 无崩溃/死锁；记录断连、内存、音频 underrun 和延迟 |

### 修订后的 Phase 2：双设备 Context Handshake 演示

1. **Discover**：两台设备分别经 Agent_link 上线，Cloud Agent 返回匹配候选和简短 `WHY YOU MATCH`。
2. **Gesture candidate**：BMI270 在设备端只做阈值/时间窗特征提取，上传时间戳、峰值、方向和置信度；不在 ESP32 上运行模型。
3. **Correlation**：云端在短时间窗内关联 `NODE_A` 与 `NODE_B` 的手势事件；单边事件不建立连接。
4. **Explicit consent**：两台屏幕同时显示对方与匹配理由，双方在 3 秒窗口内按 Enter/G0 确认；任一取消/超时即终止。
5. **Shared Context**：Cloud Agent 生成双方可见且最小化的 Shared Context；两台显示一致的 `CONNECTED` 结果，并可用音频提示。
6. **Demo hardening**：至少完成 20 次握手、10 次单边/错时/取消负例，记录成功率、误触发率和端到端延迟。

Phase 2 的完成链路：

```text
Cardputer A + Cardputer B
  -> Agent_link / ROROLEE online
  -> Cloud match + WHY YOU MATCH
  -> correlated BMI270 gesture candidate
  -> both-key explicit confirmation
  -> Shared Context + CONNECTED on both screens
```

### 实现阶段待验证项

1. ROROLEE 当前是否支持同一手机同时连接两台 Agent_link BLE 设备；若不支持，官方推荐的是两台手机/两个 ROROLEE 实例，还是允许本地双机 BLE 辅助通道。
2. 主办方对“Cardputer-Adv + Agent_link 即满足必须使用主办方技术”的口头确认，最好留一份文字或截图证据。
3. `AgentStack` 的确切赛事仓库/版本/接口尚未确认；不得把互联网上的同名第三方项目误当成主办方组件。

### 性能隔离约束

- Cardputer 固件只嵌入 `agent_link` 的必要 protocol/transport component 和 Cardputer Adapter，不在 ESP32 上运行 Agent framework、向量检索或复杂推理。
- Agent_link callback 只做校验与入队；显示、音频、IMU 和网络分别由有界队列/任务消费，禁止在 BLE callback 中绘图、I2C 轮询或等待音频播放。
- `AgentStack` 如确有赛事要求，只部署在云端并经稳定的 Agent Gateway contract 接入，不进入固件、不耦合 UI/握手状态机。
- 每个官方组件必须可通过 build flag 关闭，并与无该组件的 bring-up baseline 做 A/B 测量。
- 性能门槛：Agent_link 接入后显示/IMU 主循环 p95 延迟退化不超过 5%；100 Hz IMU 采样不丢样；音频链路零 underrun；30 分钟双机运行无内存持续下降或任务 watchdog；不满足即缩减官方组件到保持协议合规的最薄层。
