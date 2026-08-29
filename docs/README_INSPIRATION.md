# README 与项目主页设计参考

参考项目：[NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent)。本页记录 KIN 借鉴的公开项目表达方式，不复制其品牌、文案或实现。

## 可复用的高曝光项目做法

| Hermes 的做法 | KIN 的复用方式 |
| --- | --- |
| 首屏一句话定位 + 强烈项目名 | README 首屏用 KIN tagline、ASCII wordmark、生成的 terminal signal banner |
| 先讲“为什么值得用”，再讲代码 | 先讲 Builder Radar / Context Handshake / Ask the Room，再展开技术栈 |
| Live product / docs / quick install 入口清晰 | 首屏提供 Live Demo、架构图、Demo Script、交付清单和最短验证路径 |
| Feature list 使用短句，突出能力结果 | 用“发现谁值得认识”“建立 Shared Context”“找回经验”替代抽象模块罗列 |
| Quickstart 可复制运行 | 分成无硬件 Web Demo、软件 Gate、两台真实设备三条路径 |
| 大型仓库有明确目录与责任边界 | README 保留仓库地图，Agent Stack 单独解释输入/判断/Tool/输出 |
| 明示 provider、平台、限制与贡献入口 | KIN 明示 Agent_link/ROROLEE/TiDB、Thin Client 边界、现场拓扑限制和冻结顺序 |
| 配置与安全说明前置 | README 和 Agent Stack 都强调环境变量/Keychain、Raw Conversation 不出本地 |
| 用社区入口持续获得曝光 | 后续可补 Topics、截图/GIF、Demo 视频、Issues 模板、Contributing 与 Release 页面 |

## KIN 页面美化的具体原则

1. **Hero 先传达情绪，架构图再传达可信度。** Banner 负责 terminal / hardware 气质；一页 SVG/PDF 负责让评委快速理解数据流。
2. **一个主叙事，不堆功能。** 所有页面和 README 都围绕 `Discover → Understand → Handshake → Remember → Help`。
3. **真实结果优先。** 页面展示 `MATCH FOUND`、`KIN CONNECTED`、`EXPERIENCE FOUND`，同时链接真实验收证据。
4. **静态首屏 + 可复现入口。** GitHub Pages 用 deterministic demo，硬件和 TiDB 通过 README 的独立路径复现。
5. **专业感来自边界。** 清楚区分主办方提供、团队配置、团队开发，以及已验证、待复核和非目标能力。

## 下一步可直接复用的曝光增强项

- 补一张真实双机握手 GIF 或 20 秒短视频，放在 README 首屏 banner 下方。
- 给仓库设置描述：`A physical AI social network where agents help builders recognize kin.`
- 增加 Topics：`physical-ai`、`agent-link`、`esp32`、`tidb`、`hackathon`、`builder-network`。
- 补 `CONTRIBUTING.md`、`SECURITY.md` 和 GitHub Issue 模板。
- 正式提交时添加 Demo 视频、团队介绍和最终 release tag。
