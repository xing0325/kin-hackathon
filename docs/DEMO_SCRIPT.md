# KIN 三分钟 Demo 脚本

## 0–30 秒：用户与问题

画面同时出现两位 Builder 与两台 Cardputer-Adv。

旁白：

> Builder 在活动现场经常遇到很多人，却不知道谁真正做过自己正在解决的问题。KIN 让双方的 Agent 先理解彼此，再通过真实硬件完成一次明确同意的 Context Handshake。

## 30–120 秒：一段连续、完整的 Physical AI 闭环

这一段保持连续镜头，设备屏幕需可读。

1. 两台设备进入 `KIN LINK`；镜头带到 `MATCH FOUND`。
2. 展示 `WHY YOU MATCH`：一方正在做 Agent wearable，另一方拥有 ESP32/Agent hardware 经验。
3. 双方各自按 G0 明确确认。
4. 双方做一次 shake gesture；设备 IMU 产生真实输入。
5. 镜头同时拍到两台设备显示 `KIN CONNECTED / CONTEXT SAVED` 并听到提示音。
6. 画中画或短切 Web：Relationship Memory 中出现相遇原因与可继续协作的上下文。
7. 在 `ASK ROOM` 提出 ESP32 BLE 问题，展示 `EXPERIENCE FOUND`。

字幕链路：

```text
G0 + BMI270 → ESP32-S3 → Agent_link/BLE → KIN Agent → TiDB → Screen + Sound + Shared Context
```

## 120–150 秒：实现方式

展示一页架构图并沿箭头讲：

- Cardputer 负责输入、身份、屏幕和声音；
- 主办方 Agent_link 提供设备能力与通信协议；
- KIN Agent 负责匹配解释、双边握手判断和 Experience Search；
- TiDB 同时保存关系状态和 Vector embeddings；
- 团队开发了 Cardputer Adapter、Agent services、TiDB schema、Web 和设备 UI。

## 150–180 秒：亮点、限制、下一步

> KIN 独特的地方不是“加好友”，而是 Agent 可以解释为什么值得认识，并让关系在未来通过经验再次产生价值。当前版本用两台 Cardputer 和结构化 Experience 验证机制；完整 ROROLEE 现场拓扑与更多 Agent 数据源是下一步。Let your agent meet mine。

## 录制检查

- [ ] 总时长不超过 3:00。
- [ ] 至少 60–90 秒为连续真实设备镜头。
- [ ] 输入、Agent 处理和输出之间的关系可辨认。
- [ ] 两台屏幕文字可读，提示音可听。
- [ ] 使用字幕辅助，不用动画替代真实结果。
- [ ] 串口/Trace 中的 ID 已脱敏，画面无 Token、密码或连接串。
- [ ] 准备一份同样连续的备用片段。
