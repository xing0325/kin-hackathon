# AGENTS.md

## 项目工作协议

这是一个 TiDB × Deotaland 智能硬件 Hackathon 项目。

在开始任何较大实现前，先阅读：

- `docs/PROJECT_CONTEXT.md`
- `docs/STATUS.md`

`PROJECT_CONTEXT.md` 是产品目标、架构和约束的单一真相源。  
`STATUS.md` 是当前开发状态、已验证事实、Blocker 和下一步的单一真相源。

## 工作原则

### 1. 不猜硬件

硬件事实的可信度优先级：

**实板验证 / 原理图 / 官方 BSP 与例程 > 官方板卡文档 > 赛道文档 > PROJECT_CONTEXT 中的设计假设。**

尤其不要默认以下模块存在：

- IMU
- NFC
- 震动马达
- 特定屏幕控制器
- 特定触摸 IC
- 特定 Audio Codec
- 特定 Flash / PSRAM 容量

任何依赖这些模块的实现，必须先找到证据或通过实板验证。

### 2. 区分 Fact / Decision / Hypothesis

开发过程中明确区分：

**FACT**：已经由代码、文档、原理图或实板确认。

**DECISION**：项目主动选择的方案。

**HYPOTHESIS**：目前认为可能可行，但尚未验证。

不要把 Hypothesis 在后续文档中逐渐写成 Fact。

### 3. 第一目标是跑通闭环，不是堆功能

Hackathon 的核心体验：

**发现值得认识的人 → Context Handshake → 建立 Shared Context → Agent 网络帮助双方交换经验。**

任何不能明显增强这条链路的功能都属于次优先级。

### 4. ESP32 是 Thin Client

默认架构：

**硬件负责感知、身份、交互和反馈。**

复杂 AI 推理、Profile 匹配、Context 生成、Experience Search 在手机 / 云端完成。

不要尝试在 ESP32-S3 上运行没有必要的大模型。

### 5. Agent Link 优先兼容官方路径

比赛要求使用 `agent_link` 接入 ROROLEE / Agent。

板卡 B OJBadge 当前没有现成 Board Adapter。

优先完成一个最小可靠 Adapter，再扩展社交能力。

目标开发环境：

**ESP-IDF 5.5.4**

### 6. 不大规模重写

优先：

- 复用官方组件
- 复用厂商 BSP
- 小步修改
- 每完成一层就 Build / Flash / Test

不要在没有验证现有代码结构之前进行大范围架构重构。

## 与用户协作方式

解释和讨论使用中文。

代码、变量、文件名使用正常英文工程命名。

当存在会显著改变实现路径的未知硬件事实时，优先验证，而不是自行选择一个假设继续开发。

完成一个有意义的阶段后，更新 `docs/STATUS.md`。