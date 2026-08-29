# KIN — 当前状态

## 赛事合规主线

- **TiDB Cloud 是核心运行数据层**：真实保存 Profile、Match、Handshake、Relationship、Need、Experience 与 Notification。
- **TiDB Vector Search 是核心智能检索能力**：3 个 `VECTOR(64)` 字段与 3 个向量索引已在真实 TiDB Cloud Starter 验证。
- **主办方设备协议已接入**：ESP32 实体节点通过 Agent_link BLE 事件与 KIN Agent 服务通信。
- TiDB 真实 API 闭环已验证：双账号、双节点握手、Relationship、Need → Experience Match、Notification 与 request trace 均 PASS。

## 核心闭环

发现 → 理解 → Context Handshake → Shared Context → Agent 帮助

## 今晚已完成并验证

- Pixel Android Chrome 已同时连接两台 ESP32-S3 实体节点，完成双方进入 KIN LINK、G0 确认、共同动作、`KIN CONNECTED / CONTEXT SAVED` 与一次性完成提示音；流程已冻结在 `docs/PHONE_HANDSHAKE_FREEZE.md`。
- 用户端收敛为 `Today / Ask / Kin / Me` 四个一级入口；Nearby 下沉到 Kin，Signal ontology 由 Agent 自动路由。
- Today、Ask、Kin、Me、Campfire 和全屏 Handshake 已完成极简专业化；桌面与 375 px 移动端均通过视觉检查。
- 用户端已接入 KIN Agent woven-organism 主视觉；官网已扩展为完整品牌叙事并接入 10 秒实体产品脉冲视频。
- Profile Intelligence 从本地 Conversation Collector 与 Agent Scanner 生成行为指标、Agent Stack fingerprint 和待确认 VBTI Candidate；不输出 raw message、Prompt、凭据或完整配置。
- TiDB Cloud Starter `KIN-Hackathon` 已部署 17 张表、11 个 Notification 字段、3 个向量字段和 3 个向量索引。
- 公开源码与确定性 Demo 持续发布在 `github.com/xing0325/kin-hackathon` 与 `xing0325.github.io/kin-hackathon/`。

## 产品与硬件边界

- KIN 的产品核心是 Agent 社交关系与 Experience Network，不绑定某一开发板品牌。
- 当前比赛实机载体为两台已验收 ESP32-S3 便携节点；它们只负责感知、身份、明确同意和反馈。
- Agent 理解、匹配、关系记忆与语义搜索运行在服务端；ESP32 不运行大模型。
- Raw Conversation 留在本地，只有用户批准的结构化 Experience Artifact 进入 TiDB。

## 当前冻结状态

软件 Gate、真实 TiDB 闭环、Pixel 双节点 Physical AI 闭环和主要用户体验均已完成。比赛版本停止扩功能，只接受阻塞性修复。

## 下一步

1. 按 `docs/DEMO_SCRIPT.md` 录制不超过三分钟的连续实机 Demo。
2. 保存最终 run 的脱敏 Agent/Tool/Device Trace。
3. 补团队成员信息与视频链接，从干净 clone 复验后创建 Demo Candidate tag。
