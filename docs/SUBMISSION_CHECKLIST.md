# TiDB 智能硬件 Hackathon 交付清单

依据主办方交付文档整理，状态以 2026-08-29 仓库和实测记录为准。

## 总览

| 交付物 | 当前状态 | 已有材料 | 最快补齐路径 |
| --- | --- | --- | --- |
| 项目及团队介绍 | 🟢 已完成 | README 与官网已包含问题、用户、场景、核心体验和具名团队分工 | 如有头像可选补充；不影响提交 |
| 硬件 Demo 视频 | 🟢 已纳入提交包 | `硬件跑通视频.mp4`，34.5 秒 | 现场与 ZIP 均保留，可作为设备/网络故障兜底 |
| 一页架构图 | 🟢 已完成 | `docs/assets/kin-architecture.svg/.pdf/.png` | 最终检查普通屏幕可读性后直接提交 PDF |
| 代码与运行说明 | 🟢 已完成主体 | 根 README、`docs/DEMO_CANDIDATE.md`、`infra/RELEASE.md` | 在干净 clone 上按 README 重跑一次并记录 commit/tag |
| Agent Stack 使用说明 | 🟡 已完成文档，缺最终现场 Trace | `docs/AGENT_STACK.md`、Relay/API 测试记录 | 录 Demo 时保存一份脱敏事件链和 Agent 决策截图 |

## 一、项目及团队介绍

- [x] 项目名：KIN。
- [x] 一句话与目标用户：Builder / AI 重度用户的实体 Agent 社交网络。
- [x] 真实场景：活动现场发现值得认识的人并交换经验。
- [x] 为什么需要 Physical AI：现场 presence、双边确认、手势和设备反馈构成现实关系证明。
- [x] 核心体验：Radar → Why You Match → Context Handshake → Shared Context → Ask the Room。
- [x] 团队成员姓名和逐人职责；照片/头像为可选增强项。

**已完成：** README、最终讲解官网和 `docs/TEAM_AND_DELIVERY.md` 已统一团队口径。

## 二、三分钟 Demo 视频

- [x] 最终视频 34.5 秒，不超过三分钟。
- [ ] 至少一次连续完整真实设备交互。
- [ ] 真实输入、Agent 处理、实际输出都能看懂。
- [ ] 包含设备特写、可读屏幕与可听提示音。
- [ ] 简述 ESP32、Agent_link、Agent、Tool、TiDB 职责。
- [ ] 明示限制和下一步。

**最快路径：** 不重新设计 Demo。直接录已通过的双机 Context Handshake；Ask the Room 可用同一条后端/网页结果做第二段。严格使用 `docs/DEMO_SCRIPT.md` 的时间轴。

## 三、一页架构图

- [x] 真实输入：Presence、G0/键盘、BMI270、语音。
- [x] 设备与板载模块：ESP32-S3 Cardputer-Adv、屏幕、IMU、麦克风、扬声器。
- [x] 设备能力层：Agent_link + Cardputer Board Adapter。
- [x] 连接：BLE、ROROLEE/Relay、HTTPS/SSE。
- [x] 智能层：KIN Agent、Prompt/Policy、Match/Handshake/Experience Tools。
- [x] 数据：TiDB SQL + Vector Search。
- [x] 输出：屏幕、声音、Shared Context、Experience result。
- [x] 用颜色区分主办方提供、团队配置、团队自主开发。

## 四、代码与运行说明

- [x] 项目概述和核心闭环。
- [x] 硬件清单、型号和“无外接接线”说明。
- [x] ESP-IDF、Agent_link、Web/API/Data 依赖。
- [x] 目录结构和模块职责。
- [x] 固件 build/flash/run 与软件 Gate 步骤。
- [x] 最短闭环验证路径。
- [x] 已知限制。
- [x] `.env.example` / Keychain 注入规则。
- [ ] 用全新 clone、无本机缓存环境重跑 README，确认引用和子目录完整。
- [ ] 冻结 `demo-candidate` tag 并把 commit SHA 写入提交表单。

**最快路径：** 在临时目录 clone GitHub main，先跑前端 `npm ci && npm test && npm run build`；再在开发机运行 `./tools/verify-demo-candidate.sh`。通过后只修复复现问题，不加新功能。

## 五、Agent Stack 使用说明

- [x] Agent 输入、理解、决定和输出职责。
- [x] Prompt/Policy 关键边界。
- [x] Skills、Tools 与 Custom Services 列表。
- [x] Agent 决定到 SDK/硬件动作的映射。
- [x] 脱敏事件与 PASS Trace 示例。
- [ ] 一份来自最终录制 run 的脱敏 Trace/截图。
- [ ] 主办方 Agent Stack / ROROLEE 最终现场账号与拓扑复核。

**最快路径：** 最终录制时同时保存 Relay 和 API 日志，只保留事件类型、时间、设备别名、match/relationship 的脱敏后缀及设备输出，截成一张图附在提交页。

## 六、提交前安全与链接检查

- [ ] 扫描 Git 历史与工作树中的 API Key、Token、密码和 TiDB URL。
- [ ] 检查视频、截图、串口日志和架构图无凭证。
- [ ] 公开仓库、GitHub Pages、视频与 PDF 链接均使用无痕窗口验证。
- [ ] 若曾公开凭证，先撤销/轮换，再提交。
- [ ] 最终 README、Demo、架构图使用同一套模块名和数据流。

## 冻结顺序

1. 两台设备同时上电，重跑 physical acceptance。
2. 立即录制连续闭环与备用片段。
3. 保存并脱敏 Trace；补团队姓名和视频链接。
4. 从干净 clone 跑 README 最短路径与软件 Gate。
5. 运行 secret scan，提交所有交付物。
6. 创建 `demo-candidate` tag；此后只接受 Blocker fix。
