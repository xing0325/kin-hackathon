# KIN 团队与交付说明

## 团队分工

### 潘昱辰 - 产品设计 / 交互设计 / 演示与内容

负责产品概念与使用场景设计，梳理核心用户体验与交互流程；参与产品视觉与品牌表达，负责 Demo 展示逻辑、概念视频、演示内容及项目叙事设计。

### 张俊杰 - Tool 与服务

负责 **KIN Conversation Collector** 浏览器插件，完成 ChatGPT、Claude、Gemini、豆包、DeepSeek 多平台历史会话采集、并发同步调度、本地存储及 KIN JSON 导出。

### 张俊杰 - 交互设计

负责 **VBTI Handshake** 社交交互模块，设计并实现 VBTI 人格测试、握手建联、关系分类、Pair Chemistry 关系分析、关系详情与收藏等核心用户流程。

## 路演入口

- 最终讲解官网：`http://localhost:4173/`
- GitHub：<https://github.com/xing0325/kin-hackathon>
- 在线 Demo：<https://xing0325.github.io/kin-hackathon/>

## TiDB × 主办方合规口径

- TiDB Cloud 是关系状态、Need/Experience 与语义向量的核心数据层，不是外围展示项。
- Agent_link 是赛事要求的实体节点接入路径；硬件是可替换 Thin Client，复杂推理保留在手机与云端 Agent。
- 原始对话默认留在本地，只有用户确认的结构化 Experience Artifact 才进入云端。
- 已验证数据口径：17 张表、3 个 `VECTOR(64)` 字段、3 个向量索引，以及真实 API 回归通过。

## 8 分钟现场建议

1. 0:00-0:50：一句话问题与 KIN 定位。
2. 0:50-2:00：官网核心闭环与 TiDB 合规架构。
3. 2:00-4:30：现场 Demo - Collector/Profile → Match → 双方 Handshake → Relationship Memory。
4. 4:30-5:30：Ask the Room 与 Experience Vector Search。
5. 5:30-6:10：真实进展、团队分工与隐私边界。
6. 6:10-8:00：Q&A；若现场设备异常，立即切换三分钟以内的硬件 Demo 录像。
