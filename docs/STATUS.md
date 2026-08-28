## 2026-08-29 Cardputer-Adv Firmware Menu V0.4 实板刷写

- 固件不再把配对作为开机默认动作：开机进入 `KIN HOME`，短按 G0 进入 `KIN LINK`；只有 Link 模式收到附近匹配并完成明确确认后，才允许 shake gesture。
- G0 长按循环入口：`CAMPFIRE`、`ASK ROOM`、`PROFILE`、`KIN HOME`；Campfire 和 Ask the Room 会发送对应 Agent_link custom event，便于现场演示。
- Link 流程：`KIN HOME` → `KIN LINK / SCAN + HANDSHAKE` → G0 确认 → 两台设备 shake → `KIN CONNECTED`。BLE 链路可后台保持，但不会自动配对。
- ESP-IDF 5.5.4 build 成功，固件 `0x13bf90`（69% 空间剩余）；已重新刷入 `/dev/cu.usbmodem1101`，三段均 `Hash of data verified.`。

## 2026-08-29 Cardputer-Adv Text UI V0.3 实板刷写

- 将 Product UI 恢复为可读文字优先界面，并保留 Agent_link、BLE、IMU、G0 确认、握手动作与声音反馈。
- 新增握手状态门控：只有 `KIN READY` 后 G0 才会确认；确认后首次有效晃动才发送 gesture，重复晃动不重复上报；30 秒超时回到 `MATCH READY / PRESS G0`。
- 固件版本 `0.3.0-text`；ESP-IDF 5.5.4 构建成功，app `0x13bd20`（69% 空间剩余）。
- 已刷入当前响应设备 `NODE-7FAC`（MAC `50:78:7d:ce:7f:ac`），端口 `/dev/cu.usbmodem1101`；bootloader、应用、分区表均 `Hash of data verified.`。
- Host tests: `GESTURE_DETECTOR_TEST_RESULT: 25 passed`；`HANDSHAKE_GATE_TEST_RESULT: 10 passed`。

## 2026-08-29 第二台 Cardputer-Adv Product UI 实板刷写

- 新 Product UI 固件已刷入 `NODE-7FAE`（MAC `50:78:7d:ce:7f:ac`），端口 `/dev/cu.usbmodem1101`。
- Bootloader、应用、Partition Table 三段均报告 `Hash of data verified.`，硬复位完成。
- `/dev/cu.usbmodem000000011` 当前无响应，未对其执行写入。

## 2026-08-29 Cardputer-Adv Product UI 实板刷写

- 新 Product UI 固件已刷入 `NODE-A7B2`（MAC `50:78:7d:ce:a7:b2`），端口 `/dev/cu.usbmodem1101`。
- esptool 三段写入均报告 `Hash of data verified.`，随后硬复位成功。
- 启动日志确认 `board_M5CardputerADV`、`imu=1`、`speaker=1`、`mic=1`、`battery=100`，Agent_link 广播 `NODE-A7B2`，BLE Service C `0xFFC0` 正常。

## 2026-08-29 Cardputer-Adv Product UI Phase 1

- 新增 `firmware/cardputer-adv/main/product_ui.hpp`：固定数组 ParticleSystem、ember 色阶、AMBIENT/LISTENING/WORKING/RESULT/HANDSHAKE/CAMPFIRE/ERROR/CHARGING 状态。
- `UiTask` 改为 30 Hz 非阻塞粒子渲染；业务回调仍通过原有 QueueUi/Agent_link 信号驱动。
- 默认开机进入 Product Mode；G0 长按 3 秒切换 Debug Mode，保留原有 ASCII/文本 DrawUi。
- 未修改 BLE/Wi‑Fi/Agent_link 协议、API 或数据库。
- ESP-IDF 5.5.4 build 成功，app partition 剩余 69%；GestureDetector host test 25 passed。

# STATUS.md

## 2026-08-28 Cardputer-Adv IMU 采样与诊断链路修复

What changed:

- `InputTask` 不再把 `M5.Imu.getAccel()` 的“本次是否刷新”返回值当成“样本是否有效”条件；`M5.update()` 刷新后仍会处理缓存向量。
- 新增可独立测试的 `GestureDetector`，候选条件改为 `magnitude >= 1.45g` 或相邻向量差 `delta >= 0.55g`，保留 800 ms cooldown。
- macOS Relay 新增可选 `NODE_LOG_IMU=1` 实时诊断，并修正 Agent_link `AGENT_VAL_VEC3` 的 wire value 为 5。

What is verified:

- Host gesture test: `GESTURE_DETECTOR_TEST_RESULT: 25 passed`.
- Relay tests: protocol 4 passed, vector reading 3 passed, downlink 4 passed.
- ESP-IDF 5.5.4 build 成功；固件 SHA256 `97b093b2f80c755f59642b60c3d40abf32800ffed439c8bb964bd08f50614bf0`，1,293,232 bytes，app partition 剩余 69%。
- 修复固件已写入 `NODE-7FAE` (`50:78:7d:ce:7f:ac`)，esptool 对所有写入段均报告 `Hash of data verified.`
- 同一 Relay 会话中，修复后的 `NODE-7FAE` 稳定上报约 2 Hz BMI270 向量（静置 magnitude 约 1.013g）；未更新的 `NODE-A7B2` 没有上报该遥测，定位与修复分支得到实板 A/B 证据。

What remains:

- 修复固件已同样写入 `NODE-A7B2` (`50:78:7d:ce:a7:b0`)，所有写入段 hash 校验通过。
- 双机实物验收通过：两台均上报 BMI270 向量、产生 `handshake.gesture`、G0 确认、播放短音，并接收 `KIN CONNECTED / CONTEXT SAVED`。
- 验收结果：`PHYSICAL_GATE_RESULT PASS match_id=mat_85424b017eb62862 relationship_id=rel_1df4141686e526ae devices=2`。

## 2026-08-28 Demo Candidate release gate

- 新增 `tools/verify-demo-candidate.sh`，单命令串联 FastAPI、用户端、品牌页、Conversation Collector、Experience Bridge、Agent_link Relay、TiDB migration plan 和 ESP-IDF 5.5.4 firmware build。
- 真实运行结果 `DEMO_CANDIDATE_SOFTWARE_RESULT PASS`：API `16`、用户端 `21`、Collector `6`、品牌页 `4`、Relay `8`、Bridge `1`，migrations `17`。
- 固件重建成功：`node_cardputer_adv.bin` `1293072` bytes，SHA-256 `cdfbae6fe1d40edd9aae7b77f772fdb3e165af039cce6c164353879b8502cad2`，app partition 剩余 `69%`。
- 新增 `tools/verify-cardputer-acceptance.py`，轮询 trusted Agent_link session，只在 `connected` 且已生成 Relationship 时返回 PASS；本地双设备 wire-event 集成验证已通过。
- 新增 `docs/DEMO_CANDIDATE.md`，固定 software gate、双机 BLE/gesture/G0/screen/tone 实物 gate 和冻结记录。
- 本次实物预检仅观测到一个 USB serial 设备，BLE 扫描 60 秒内未观测到 `NODE-A7B2` / `NODE-7FAE`；因此软件 gate 已通过，最终实物 gate 保持 `PENDING`，尚未标记冻结。

Next action:

- 两台 Cardputer-Adv 同时上电并广播后，运行 `tools/run-cardputer-demo.sh` 和 acceptance watcher，通过后创建 Demo Candidate tag。

## 2026-08-28 GitHub Pages team handoff

- 已将当前 KIN 完整源码方案整理为公开单仓库 `xing0325/kin-hackathon`，包含用户端、FastAPI、EigenFlux/KIN Core、Cardputer 固件、Agent_link Relay、Conversation Collector、TiDB migrations 和交接文档。
- 已排除 `.env`、Keychain 凭据、本地工作区、依赖目录和编译产物；发布前凭据模式扫描 `matches=0`。
- 新增队友首页 README 和 `docs/FRONTEND_HANDOFF.md`，列明页面路由、源文件、Demo/Real 数据模式、产品不变式与 PR 流程。
- GitHub Actions 已验证 `npm ci` → `21 tests` → Vite build → Pages deploy，Run `33175599424` 结果 `success`。
- GitHub Pages 已上线：`https://xing0325.github.io/kin-hackathon/`；默认使用确定性 Demo fixtures，通过 hash routing 支持直接分享任意用户页。

Next action:

- 队友从 `main` 切剆支优化用户端；主线继续最终双 Cardputer 真机验收。

## 2026-08-28 TiDB Cloud Starter V0.11 schema deployment

- 已生成新实例应用密码并替换 macOS Keychain 中的 host/port/username/password；明文临时文件已删除，仓库未写入凭据。
- 已创建免费 Starter 实例 `KIN-Hackathon`：AWS Tokyo，Spending Limit `$0/month`，状态 `Active`，TiDB v8.5.3。
- 已通过 TiDB Cloud SQL Editor 按顺序执行 `0001`–`0004` 全部 19 条 SQL，Query Log 全部返回 Duration，无 Error/Failed。
- 部署后直接查询验证：`table_count=17`、`notification_columns=11`、`vector_columns=3`、`vector_indexes=3`。
- `tools/migrate-tidb.py` 已从只运行 `0001` 修复为自动按顺序运行 `0001`–`0004`，并增加 retry/timeout/plan 和表结构验证。
- 发现 Zen/TUN 默认路由会接受 4000/TCP 但不转发 MySQL greeting；迁移器和 API 启动脚本现支持/自动注入 `TIDB_BIND_ADDRESS`，使 TiDB 流量绑定物理网卡而不影响 Zen 其他流量。
- 已重跑全部 4 个 migration：`files=4 statements=17 tables=17 notifications=verified`。
- 已在真实 TiDB Cloud 完成 API 闭环：Agent_link 双机 Handshake 成功、Relationship 建立、Need 匹配 1 条 Experience，Vector 相似度 `0.4234`；V0.11 双账号+双设备+通知 delivered/read+请求追踪回归 `RELEASE_RESULT PASS`。

Next action:

- 完成一次最终双 Cardputer 真机验收，然后冻结 Hackathon Demo Candidate。

## 2026-08-28 KIN V0.11 — Release hardening

- 认证从 demo user-id token 升级为 HMAC 签名、有过期时间的 `kin1` session；`POST /v1/auth/exchange` 使 EigenFlux 可以通过独立服务端 secret 交换多用户身份，响应同时设置 HttpOnly cookie。
- Production 启动会拒绝默认 `AUTH_SECRET`、`AUTH_EXCHANGE_TOKEN` 和 `AGENT_GATEWAY_TOKEN`；非 Demo 环境不再接受裸 user-id bearer token。
- 新增持久化 Agent Inbox：Signal Match 和 Relationship Follow-up 均生成 owner-scoped Notification，支持 unread 过滤与幂等已读确认；Today 侧栏已接入通知列表和未读数。
- 新增低基数 `/metrics`、数据库 latency `/ready`、release SHA `/health`、结构化请求日志与全链路 `X-Request-ID`。
- 新增 migration `0004_notifications.sql`、`infra/docker-compose.release.yml`、release env/runbook 与 `tools/verify-v011-release.py`。
- 真实 HTTP 回归已验证：2 个签名账号 → 2 台 Agent_link 设备四事件 Handshake → Relationship → Signal → Notification delivered/read → request trace，结果 `RELEASE_RESULT PASS`。
- 联合回归：FastAPI `16 passed`；用户端 `21 passed`；Vite `50 modules transformed`；Collector `6 passed`；Bridge `1 passed`。

Next action:

- 在共享 TiDB 环境启动 release stack，做最后一次双 Cardputer 真机验收，然后冻结 Hackathon Demo Candidate。

## 2026-08-28 KIN V0.10 — Local Experience Pipeline

- 新增 `tools/kin_experience_bridge.py`：本地读取 Conversation Collector export，只输出 problem/context/cause/worked/failed/confidence 等结构化 Candidate，不携带 raw messages 或源 URL。
- FastAPI 新增 Experience Candidate 持久化、列表和 approve/ignore 接口；approve 幂等地转换为 Experience Artifact，创建 Candidate 时拒绝 raw/messages/conversation/transcript 字段。
- Context Studio 已连接真实 Candidate API，不再使用浏览器本地队列充当后端。
- Live 闭环已验证：Collector export → Bridge → pending Candidate → Context Studio decision contract；输出键仅为 `artifact/source`。

## 2026-08-28 KIN V0.9 — Proactive Match and Follow-up

- FastAPI 新增 `/v1/proactive`，聚合 Signal Match 与 Relationship Memory 中未完成的 follow-up。
- 发布 Signal 后会为其他已建 Profile 用户生成可解释的 proactive item；关系承诺按 source id 幂等生成。
- Today 页接入真实 proactive feed，显示类型、原因、行动与对应页面入口。

## 2026-08-28 KIN V0.8 — Broadcast / Signal

- 新增 Signal 持久化模型与 `POST/GET /v1/signals`，支持 NEED、BUILDING、SOLVED、DISCOVERED、AVAILABLE 五种状态及过期时间。
- 用户端新增 `/signals` 页与导航，包含类型选择、发布器和活跃 Signal feed；Demo 与 Real API 共用同一交互。
- 新增 TiDB migration `0003_signals_proactive_candidates.sql`，并同步到 EigenFlux KIN Core migration 目录；两份文件 SHA-256 一致。
- 联合验证：FastAPI `13 passed`；用户端 `21 passed`；Collector `6 passed`；Bridge `1 passed`；Vite `50 modules transformed`。

Next action:

- 进入 V0.11 release hardening：部署环境、通知投递、observability，以及双账号+双设备全链路回归。

## 2026-08-28 KIN V0.7 — Campfire durable backend

- 新增精简事实入口 `docs/CURRENT.md`，后续开发优先读取该文件与 STATUS 顶部，不再依赖整段历史状态。
- FastAPI 新增持久化 Campfire 模型及 `POST /v1/campfires`、`GET /v1/campfires`、`POST /v1/campfires/{id}/confirm`。
- 每位成员只能确认自己的角色；确认使用 `expected_version` 防止覆盖并使用 `idempotency_key` 防止重放。只有全部成员确认后状态才变为 `formed`。
- 新增 TiDB migration `0002_campfires.sql`，并同步复制到 EigenFlux KIN Core migration 目录；两个文件 SHA-256 一致。
- 用户端 `/campfire` 已从浏览器 localStorage handoff 切换到真实 API；Demo 仍使用确定性 fixture。
- 验证：FastAPI `11 passed`；用户端 `21 passed`；Vite `49 modules transformed`。新增测试覆盖三成员逐一确认、重复确认幂等、最终 formed 和成员可见列表。

Next action:

- 开发 Broadcast / Signal 数据层与页面，并把 NEED、BUILDING、SOLVED、DISCOVERED、AVAILABLE 汇入 Today 的主动提醒。

## 2026-08-28 KIN user web V0.6 — Campfire Team Proposal

- 新增 `/campfire` 并加入 App Shell 导航；页面把多人 Skills、Needs、Projects 组合为可解释的小队提案，而不是自动建群。
- Demo Campfire 展示三位 Builder、逐人角色与角色理由、尚缺能力、会场与过期时间；每位成员的 `pending / confirmed / declined` 状态单独显示。
- 当前登录者只能确认自己的角色；只有所有成员逐一确认后，Proposal 才从 `proposed` 转为 `formed`，并进入 Shared Team Context Ready 状态。
- Real mode 使用浏览器本地 `kin.campfires.v1` handoff contract，暂不伪装成已完成的多人服务端闭环；Go Campfire persistence/API 仍是下一层工作。
- 验证：前端 `21 passed`，覆盖全员确认门槛、逐人确认计数、最终 formed 转换和原对象不变；Vite `49 modules transformed`，产物 JS 301.32 kB（gzip 95.03 kB）、CSS 48.79 kB（gzip 10.31 kB）。

Next action:

- 在 EigenFlux KIN Core 实现 Campfire TiDB migration、Go repository/API 与逐成员幂等确认，再把 `/campfire` 从 local handoff 切到真实接口。

## 2026-08-28 KIN user web V0.5 — Builder Profile and Context Studio

- 将 EigenFlux 基座里的 `/me` 从占位页升级为 Builder Profile + Context Studio，使用 Agent Card page 与 refresh-context 作为 Profile 的事实源。
- Public Profile 编辑接入带 `expected_version` 的字段级写入；只提交变化字段，并展示 Card/Profile version、最后编辑者和冲突保护语义。
- 新增 Experience Candidate 本地审阅队列：展示提炼后的 problem/context/cause/worked/failed、置信度与 visibility；只有用户明确 Approve 后才调用 `POST /v1/experiences`，Ignore 保留为本地决定。
- 新增 Field Permissions 矩阵，区分 PUBLIC、PRIVATE 与 EigenFlux SYSTEM-owned 字段；页面明确 raw conversation 不进入发布请求。
- Real mode 从 `kin.experience-candidates.v1` 浏览器本地队列读取 Candidate；Demo mode 提供 BLE 和 TiDB Vector 两个确定性候选。
- 验证：前端 `18 passed`，包括发布 payload 不含 raw/source metadata；Vite `48 modules transformed`，产物 JS 293.70 kB（gzip 92.80 kB）、CSS 42.97 kB（gzip 9.29 kB）。

Next action:

- 开发第六个页面单元 `Campfire`：从多人能力与 Need Signal 形成可解释的小队提案，并要求成员逐一确认。

## 2026-08-28 KIN user web V0.4 — Relationship Memory and Shared Context

- 将 EigenFlux 基座里的 `/kin` 从占位页升级为 Relationship Memory：按最近连接排序，展示已建立关系、首要认识原因和未完成 Follow-up 数量。
- 新增 `/kin/:relationshipId` Shared Context 详情：展示 Context Handshake 记录、会场与日期、双方当时在构建什么、为什么认识、共同兴趣、项目交集、对话摘要和后续承诺。
- 前端接入真实 `GET /v1/relationships` 与 `GET /v1/relationships/{id}`；Demo 模式提供两段确定性关系记忆，真实 API 缺少 peer profile 时从 Shared Context 的双方标题恢复展示名。
- 明确 participant-only Memory Boundary；原始对话和未授权私人 Context 不进入关系页。
- 验证：前端 `14 passed`，Vite `47 modules transformed`，产物 JS 281.61 kB（gzip 89.40 kB）、CSS 35.92 kB（gzip 8.08 kB）。

Next action:

- 开发第五个页面单元 `Builder Profile + Context Studio`，让用户审阅公开 Profile、Experience Candidate 和字段权限。

## 2026-08-28 KIN user web V0.3 — Ask the Room and Experience Results

- 将 App Shell 的 `/ask` 从占位页升级为 Ask the Room：输入当前卡点或选择 starter prompt，创建 Need Signal，并展示 Agent 正在搜索 Experience Network 的过程。
- 新增确定性结果视图：以 Experience Artifact 形式展示问题、原因、有效方案、失败方案和置信度；默认只显示 summary-only，不暴露原始聊天记录。
- 前端接入真实 `POST /v1/needs` 与 `GET /v1/needs/{id}/matches`，Demo 模式保留稳定的 ESP32 BLE 断连示例；新增 `appPath` 确保 Demo 路由刷新和跨页面跳转不丢失 `?demo=1`。
- Ask 页面支持移动端，明确显示 NEED OPEN、来源权限与“请求 Agent 继续追问”入口；无命中时保留 Need 并返回可继续观察状态。
- 验证：前端 `11 passed`、Vite `46 modules transformed`，产物 JS 271.01 kB（gzip 86.94 kB）、CSS 28.67 kB（gzip 6.72 kB）；Zen 已实走问题输入、Need 广播和结果加载视觉状态。

Next action:

- 开发第四个页面单元 `KIN Relationship Memory + Shared Context`，展示已连接关系、Handshake 记录、后续承诺与 Follow-up。

## 2026-08-28 KIN user web V0.2 — Builder Radar and Match Detail

- 将 App Shell 中的 `/radar` 从占位页升级为可用的 Builder Radar：按 match score 排序、展示附近 Presence、当前项目、能力标签和首要匹配解释，并提供 `ALL / 75%+` 筛选。
- 新增 `/radar/:matchId`，完整展示 Why You Match、多条可解释理由、对方授权的当前项目、Skills、Needs、Interest Graph 切片与 AI Stack。
- 新增 Context Handshake 前端入口：用户确认后进入 `pending` 状态，明确等待双方设备现实动作与对方确认；不会把点击按钮伪装成已连接。
- Today 的 `WHY YOU MATCH` 已接到对应 Match Detail；Demo 查询参数在 App Shell、Radar 和 Detail 导航中持续保留，直接刷新详情页不会退回登录。
- 前端接入真实 `GET /v1/radar`、`GET /v1/matches/{id}`、`POST /v1/handshakes/{id}/confirm`；支持同源部署或 `VITE_KIN_API_BASE` 分离服务。
- FastAPI Radar 响应补齐授权后的 peer profile；本地 CORS 默认允许 `localhost/127.0.0.1:4174`。真实 SQLite API 验证返回 Bob 的 Profile 和 3 条解释。
- 验证：前端 `8 passed`、Vite `45 modules transformed`；FastAPI `10 passed`；Zen 已实走 Radar → Momo Match Detail → Handshake Pending。

Next action:

- 开发第三个页面单元 `Ask the Room + Experience Result`，接入 `/v1/needs` 与 `/v1/needs/{id}/matches`。

## 2026-08-28 TiDB Cloud live closed loop

- 已把用户提供的 TiDB Zero 实例接入 `kin` 数据库；连接信息只保存在 macOS Keychain，明文临时 JSON 已删除，仓库中没有写入密码或连接串。
- 已真实执行 `infra/migrations/0001_initial_tidb.sql`：12 条语句、13 张表；KIN 所需 3 个 `VECTOR(64)` 列与 3 个 Vector Index 均由 TiDB 元数据确认存在。
- 已在真实 TiDB 后端完成完整验证：demo seed → 官方 Agent_link wire event 双机握手 → Relationship → Ask the Room Need → Experience Match。
- 已真实执行 `VEC_COSINE_DISTANCE`；API 的 top match score 与数据库直接查询结果同为 `0.4234`，不是 SQLite fallback。
- 新增 `tools/migrate-tidb.py`、`tools/run-tidb-api.sh` 与 `apps/api/scripts/verify_tidb_live.py`，以后无需复制密码即可重跑迁移、服务和闭环验证。
- TiDB Serverless 冷启动 seed 实测约需 20–30 秒；连接池已去掉提交后的冗余 reset round-trip，在线验证与 Agent_link 模拟器使用 60 秒 timeout。
- 当前插着的 `NODE-A7B2` 仍是已验收的 V0.2 固件；本次改动全部位于后端，没有制造无意义的新固件版本或重复烧录。
- 下一步：把 Ask the Room 的 Web 输入/结果页接到现有 `/v1/needs` 与 `/v1/needs/{id}/matches`，再增加一次明确的硬件结果下行（角落状态 + 短摘要 + 提示音）。

## 2026-08-28 Cardputer-Adv V0.2 final demo candidate

- 将屏幕重做为 240×135 专用布局：顶部 KIN/设备短 ID，中央大字号动作，底部链路与电量；成功后右上角常驻 `CONNECTED`，不占主信息区。
- 固件状态机补齐 ready、confirm、motion、connected、offline；连接成功后锁定，30 秒未完成可回到重试状态。
- IMU 保持本地 100 Hz 手势采样，但 Agent_link 遥测从 10 Hz 降至 2 Hz；macOS relay 静默忽略遥测日志，避免刷屏。
- 新增可信 session-state 查询；relay 或电脑服务重启后会恢复 ready/connected 状态并下发到双机。
- 新增 `tools/run-cardputer-demo.sh`，单命令启动/复用后端、重置演示数据并连接双机。
- 验证：后端 `10 passed`；Swift protocol/downlink `8 passed`；relay release build 成功；ESP-IDF 5.5.4 build 成功，app partition 剩余 69%。
- 同一 V0.2 合并镜像已烧录到 `NODE-A7B2` 与 `NODE-7FAE`，写入 hash 校验通过；启动分别确认电量 60% 与 41%、BMI270/扬声器/BLE 正常。
- 用户已完成 V0.2 全项真机验收：ready、双 G0、双机晃动、短音、长音、右上角 `CONNECTED`、成功画面锁定及重复输入抑制全部通过；握手固件暂时封版。
- 下一步转向 Builder Radar 与 Ask the Room 的产品闭环；硬件继续作为 Thin Client，只承载摘要、确认、声音和关键状态，不把复杂资料管理塞入 240×135 屏幕。

## 2026-08-28 Executive Current State

### Current phase

**Phase 5 — Ask the Room and Experience ingestion, while Phase 4 demo hardening continues.**

The older `Phase 0` marker later in this chronological file is historical and is no longer the current phase.

### Verified end-to-end

- Two real Cardputer-Adv devices (`NODE-A7B2` and `NODE-7FAE`) complete Context Handshake through official Agent_link BLE frames, the macOS relay, FastAPI, Relationship creation and Shared Context generation.
- Both devices receive the success downlink, render `KIN CONNECTED / CONTEXT SAVED`, play the success tone and retain the connected state.
- The KIN Conversation Collector V0.3 builds Chrome and Firefox/Zen packages, stores raw conversations in local IndexedDB, discovers sessions across five supported chat products, preserves explicit Ignore decisions and adds authenticated ChatGPT bulk/incremental retrieval.
- Current local regression state: API `9 passed`; brand Web `4 passed`; relay protocol/downlink `8 passed`; collector `6 passed`; ESP-IDF 5.5.4 firmware build succeeds with 69% of the app partition free.

### Workstream state

| Workstream | State | Evidence / remaining gap |
|---|---|---|
| Product and KIN brand | Strong | Product thesis, core loop and three Magic Moments are locked. |
| Cardputer hardware and firmware | Core path complete | Display, BMI270, G0, speaker, battery and BLE are verified; microphone uplink and TCA8418 keyboard are not yet validated. |
| Context Handshake | Real vertical slice complete | Needs repeated positive/negative runs, a 30-minute soak and a repeatable three-minute script. |
| Agent_link integration | Protocol path verified | The working last-mile is the macOS relay; the organizer ROROLEE/AgentStack outbound hook remains unverified. |
| Backend domain model | Local V0.1 complete | Profile, Radar, Handshake, Relationship, Need and Experience APIs pass tests. Production auth/deployment remain. |
| Conversation Collector | Packaged V0.3 | Chrome and Firefox/Zen packages exist; ChatGPT signed-in pagination is live-verified, while Claude/Gemini/豆包/DeepSeek still rely on DOM fallback and need broader signed-in smoke tests. |
| Context Compiler / Local Bridge | Not implemented | Raw local conversations are not yet transformed into reviewable Experience Candidates or sent to the backend. |
| TiDB | Schema only | Migration and vector indexes exist; no real TiDB Cloud migration or vector query has been recorded. |
| Builder Radar | Backend prototype | No user-facing product screen or real device match downlink yet. |
| Ask the Room | Backend prototype | Deterministic matching passes; no collector-to-experience or Web/device input-to-result vertical slice yet. |
| Brand Web | Polished prototype | Hero and KIN Field are visually strong but are not the Profile/Radar/Relationship product UI. |
| OJBadge | Parked by decision | Audit and recovery evidence are preserved; it is not the MVP hardware path. |
| Delivery hygiene | At risk | Project root is not a Git repository; there is no production deployment or automated full-demo run. |

### Critical path

1. Complete `Conversation Collector -> Local Bridge -> Experience Candidate -> user confirmation -> /v1/experiences` without uploading raw conversations.
2. Connect a real TiDB Cloud instance and record migration, seed and vector-query evidence.
3. Build the smallest product UI for Profile, Radar/Match, Relationship and Ask the Room against the existing OpenAPI contract.
4. Resolve the official ROROLEE/AgentStack outbound requirement or document the macOS relay as the explicit Gateway Adapter.
5. Run handshake positive/negative repetitions, a 30-minute dual-device soak and a three-minute demo rehearsal.

### Parallel ownership

Claude Max should own the software-only Experience ingestion slice described in `docs/CLAUDE_HANDOFF.md`. Cardputer firmware, physical-device flashing and the existing KIN Field visual remain outside that parallel task to avoid shared-hardware and visual merge conflicts.

## 2026-08-28 KIN Conversation Collector V0.2 Firefox / Zen

- 插件已生成独立 Chrome `dist/` 和 Firefox / Zen `dist-firefox/`，后者使用 Gecko Manifest V3 background scripts 并包含固定 add-on ID。
- 新增 Firefox / Chrome 双 API namespace 运行时适配，以及可直接加载的 `kin-conversation-collector-firefox.xpi`。
- “抓取全部已登录平台”会依次打开 ChatGPT、Claude、Gemini、豆包和 DeepSeek，深度滚动会话导航区，把新发现的 session 继续加入抓取队列。
- 采集过程仍执行“默认全部保留，只有显式 Ignore 才排除”；没有登录态的平台会跳过。
- `npm test`：5 passed；Chrome service worker、Firefox background scripts、Gecko ID 和 XPI ZIP 结构验证通过。
- Zen 已导航至本机临时扩展调试入口；加载本地未签名扩展与赋予五个聊天站点访问权限需在实际安装前确认。

## 2026-08-28 KIN Conversation Collector V0.3 bulk ingestion

- Raw Conversation 正文已从 `storage.local` 迁移至扩展 IndexedDB `kin-conversation-vault`；V0.2 记录自动迁移一次，legacy 对象暂时保留用于回滚。
- ChatGPT 新增登录态 JSON 导入：从 `/api/auth/session` 在页面主世界取得短期 bearer，仅用于同源 `/backend-api` 请求，不把 token 传回扩展；列表同时读取普通与已归档会话。
- 详情导入使用独立后台页，不重载用户正在编辑的 ChatGPT 标签；后续运行会跳过未变化的本地记录，并对 429/5xx 执行节流与退避重试。
- Zen 实测已发现 `690` 条 ChatGPT 会话；高并发首轮完成 `181`、遇到限流失败 `509`。增量第二轮验证做到 `202` 条本地保留、`190/690` 已处理且当轮失败为 `0`；最终实现改为单并发 450ms pacing、未变化记录跳过、429 至少冷却 65 秒并最多重试 12 次，避免持续撞限流窗口。
- `npm test`：6 passed；`npm run build` 成功生成 Chrome `dist/`、Firefox/Zen `dist-firefox/` 与 XPI。

## 2026-08-28 KIN Conversation Collector distribution site

- 已创建独立公开仓库 `xing0325/kin-conversation-collector`，包含完整扩展源码、测试、跨浏览器构建脚本、MIT License、介绍页面和两个可下载安装包。
- GitHub Pages 已发布：`https://xing0325.github.io/kin-conversation-collector/`；线上首页、Firefox/Zen XPI 与 Chrome/Edge ZIP 均返回 HTTP 200。
- 页面展示五平台覆盖、本地 IndexedDB、默认全保留/显式 Ignore、Raw Conversation 不上传、实测发现 690 条 ChatGPT 会话，以及团队 clone/test/build 入口。
- 本地与线上浏览器实视通过，console error/warning 为 0；仓库 `main` 提交为 `06ff561`。

## 2026-08-28 KIN Conversation Collector V0.1

- 新增 Manifest V3 浏览器插件 `apps/browser-extension`，支持 ChatGPT、Claude、Gemini、豆包和 DeepSeek 的会话页识别、消息提取、侧边栏 session 发现和本地存储。
- 已固定采集策略：所有已发现会话默认保留，只有用户主动标记 `Ignore` 才从导出中排除；Ignore 在后续重新采集时不会被覆盖。
- 插件弹窗可查看保留/忽略/待同步数量，后台顺序打开已发现 session 进行采集，并导出 `kin-conversation-export` JSON。
- Raw Conversation 目前只写入 `chrome.storage.local`，没有上传逻辑；后续由 Local Bridge 进行 Experience Candidate 提炼和二次确认。
- `npm test`：4 passed；`npm run build`：成功生成可 Load unpacked 的 `dist/`；manifest 五个来源的 host permission 验证通过。
- 豆包未登录首页已实际打开验证；DeepSeek 当前浏览器环境停在登录页，其登录后消息 DOM 选择器仍需在有真实会话的账号上做 smoke test。

## 2026-08-28 Cardputer-Adv 双机真实握手闭环

- `NODE-A7B2` 与 `NODE-7FAE` 均完成发声固件烧录；两台真实 BMI270 晃动被 macOS Agent_link relay 接收并转发。
- 两台 G0 确认和 3 秒窗口内的双机晃动均被后端接受，握手最终状态为 `connected`。
- 已生成关系 `rel_32ec1c4857693d6a`，并生成包含匹配原因、双方正在构建内容和后续行动的 Shared Context。
- 当前闭环已验证：真实设备动作 → 官方 Agent_link event → BLE relay → 后端握手 → Relationship/Shared Context。
- 已加入后端到双机的成功下行反馈：屏幕显示 `KIN CONNECTED / CONTEXT SAVED`，并播放长提示音。
- 已将成功状态锁定：连接成功后不再因重复晃动或 G0 覆盖成功画面；锁定版已烧录到 `NODE-A7B2` 与 `NODE-7FAE`，写入 hash 校验通过。
- 下一次固件 UI 大更新：把 `KIN CONNECTED` 改成屏幕角落的常驻状态标记，为主信息区域保留空间。

## 2026-08-28 KIN first-entry pointer and radial color falloff

- 首次从 Hero 进入第二屏时鼠标不跟随的根因是 `MouseTrail` 在页面顶部初始化时缓存了 canvas rect，滚动后 rect 已过期；现在每次 `pointermove` 都重新读取 `getBoundingClientRect()`。
- 已从全新页面首次点击 `ENTER THE FIELD` 后直接验证跟随，不需要刷新。
- 新增 `vColorStrength`，保留 trail 的时间衰减、距离权重和局部影响力：扰动中心是高饱和橙，波纹向外扩散后逐渐混回石墨灰。
- 橙色 emissive 从 `0.32` 降到 `0.08`，波纹宽度收紧到 `1.65`，小幅鼠标扰动不再立即生成高饱和全屏波。
- `npm test`：4 passed；`npm run build`：106 modules transformed；首次进入、近场饱和橙和远场浅色衰减均已实视，console error/warning 为 0。

## 2026-08-28 KIN pointer color and gap correction

- 鼠标波纹颜色改为同时跟随波峰与波谷的 `abs(vHeight)` 信号，并加入小幅 emissive 橙光；鼠标路径现在有明显的橙色跟随，不再只有几何转动。
- 方块 gap 从 `0.045` 收紧到 `0.03`，倒角半径从 `0.055` 收紧到 `0.045`，保留单块光影边界但减少黑色缝隙。
- `npm test`：4 passed；`npm run build`：106 modules transformed；全新页面实际移动鼠标后可见连续橙色波纹，console error/warning 为 0。

## 2026-08-28 KIN wave lighting and pointer-only correction

- 确认第二屏的自动律动不是第一屏幽灵鼠标跟入，而是上游 `MouseTrail` 默认启用的 idle random points。
- 关闭 idle random waves：第二屏现在静止时保持平整，只有真实 `pointermove` 会写入 trail 并触发波纹。
- 撤回无效的浅灰背景思路，改为深色负空间 `#0b0d10` + 石墨灰 `#3b424b`；浅色不再只从中线缝隙透出。
- 方块几何从直角 `BoxGeometry` 改为小倒角 `RoundedBoxGeometry`，材质改为 `MeshPhysicalMaterial`，同时重做主光/补光；每个单元现在都有可见高光边、亮面和暗面。
- `npm test`：4 passed；`npm run build`：成功，106 modules transformed；全新页面 console error/warning 为 0。
- 独立回滚副本已恢复上一版 Stage/MouseTrail hash，实际工作区保持新的倒角光影和 pointer-only 行为。

## 2026-08-28 KIN wave-grid contrast and depth pass

- 独立对照原版 `wavy-cubes` 预览后，将第二屏从黑块+橙底改为石墨灰方块 `#30343a` + 暖矿物浅底 `#d7d3ca` + KIN 橙色波峰 `#f77e2d`。
- 方块间距从 `0.01` 增至 `0.035`，波幅/限高从 `0.4` 增至 `0.58`，让单元边界和鼠标波前都更清楚。
- 重平衡环境光、主/补方向光和 tone-mapping exposure，并将边缘暗角压黑系数从 `0.5` 降为 `0.22`，边缘石墨块仍可读。
- 同步把第二屏文字与读数器切换为浅底对比色，并修正不再符合画面的 `blue-white cells` 文案。
- `npm test`：4 passed；`npm run build`：成功，105 modules transformed。
- 全新本地页面实视：2 sections，1 个 wave canvas，console error/warning 为 0；已实际移动鼠标验证橙色波前和方块高度变化。
- 修改包、diff、验证记录和回滚脚本保存于 `outputs/web-wave-contrast-v1/`；回滚脚本已在独立副本上执行并恢复原始 hash，实际工作区保持新效果。

## 2026-08-28 KIN orange-black wave palette

- 将上游 3D Wave Grid 的 `colorBase` 改为 `#161616`、`colorHigh` 改为 `#f77e2d`，WebGL clear color 改为 `#050505`。
- 第二页现在保持原版实例化方块、鼠标波前和后处理，仅替换为 KIN 橙黑配色；Zen 实视无 console error/warning。
- `npm test`：4 passed；`npm run build`：成功。


## 2026-08-28 Upstream 3D Wave Grid clone pass

What changed:

- 不再使用之前的 Canvas 近似方块；完整复制 `franky-adl/3d-wave-grid` 的 `ThreeJS/` 源码（Orchestrator、Stage、Renderer、Camera、MouseTrail、post-processing）到 `apps/web/src/vendor/wave-original-threejs/`。
- 新增 `src/originalWaveGrid.js` 作为唯一页面适配层，第二页直接运行上游实例化网格、鼠标 trail 波前、光照和 RGB shift；KIN 文案仅作为覆盖层。
- 安装上游所需 `three`、`gsap`、`stats.js`、`lil-gui`、`mitt` 依赖。

What is verified:

- `npm run build`：成功，105 modules transformed；Three.js bundle 663.05 kB（gzip 168.71 kB）。
- Zen `http://localhost:4173/`：页面 title 为 `KIN — Agents need kin`，波浪页无 console error/warning，实视为原版浅色立方体网格与鼠标驱动波动。


## 2026-08-27 KIN single-effect page simplification

What changed:

- 按最新反馈删除 Hero 之后的所有旧章节，只保留一个第二页 `KIN Field`。
- 第二页改为基于 `franky-adl/3d-wave-grid` 源码行为的鼠标跟随波浪方块：蓝白方块、pointer trail、波前律动和 `RESPONDING / LISTENING` 状态。
- 页面现在严格是「Hero → 一个动效页」，不再堆叠 DNA、花园、设备和旧 Contact 页面。

What is verified:

- `npm test`：4 tests passed，0 failed。
- `npm run build`：Vite production build 成功；JS 83.14 kB（gzip 22.83 kB），CSS 15.12 kB（gzip 4.24 kB）。
- Zen `http://localhost:4173/`：`main > section` 数量为 2，`#wave-grid-canvas` 存在 1 个，旧 helix/garden canvas 均为 0，console errors/warnings 为空。

Next action:

- 继续按同一规则逐页增加效果：每增加一页只放一个明确的上游交互，不恢复旧页面堆叠。


## 2026-08-27 Gesture feedback adjustment

- 现状：后端握手状态只收到第一台设备的晃动事件，第二台仍未上报，因此页面保持“等待对方”。
- 固件调整：检测到有效晃动并成功上报后，Cardputer-Adv 现在播放 1400 Hz、120 ms 短提示音，同时保留屏幕提示。
- 验证：ESP-IDF 5.5.4 `idf.py build` 成功；发声固件已分别烧录到 `NODE-7FAE` 与 `NODE-A7B2`，写入 hash 校验通过。
- `NODE-A7B2` 烧录后启动确认：BMI270、扬声器、麦克风与 BLE 正常，电池读数 42%，并已被本机 relay 重新连接和订阅。

## 2026-08-27 KIN open-source interaction source pass

What changed:

- 按用户提供的仓库地址固定并复制了五组真实上游源码快照到 `apps/web/src/vendor/`，保留 upstream URL 与 commit，运行时不依赖第三方 demo 页面。
- `KinHelix` 复用了 Xylophone 的 Three.js 螺旋/节奏视觉方向，`SignalGarden` 复用了 WebGPU Gommage 的粒子消散/花朵聚合方向；两者统一到 KIN 的橙色、石墨蓝和珍珠白配色。
- 将参考实现归档到 `outputs/web-kin-source-v0.4/`，包含修改包、diff、验证记录和可执行回滚脚本。

What is verified:

- `npm test`：4 tests passed，0 failed。
- `npm run build`：Vite production build 成功；JS 85.22 kB（gzip 23.40 kB），CSS 13.99 kB（gzip 4.01 kB）。
- Zen 打开 `http://localhost:4173/`：title 为 `KIN — Agents need kin`，`#kin-helix-canvas` 与 `#signal-garden-canvas` 各 1 个，console errors/warnings 为空。
- 回滚脚本已在另一份副本执行，副本中的 vendor 快照被移除，原工作区保持修改后的 KIN 页面。

Source pins:

- `franky-adl/3d-wave-grid` @ `f1fe51434c294008b7e40d51579711b522f1e27f`
- `Sujenphea/xylophone` @ `8e4f9a8c7729f52edc006ca02c6c377921c4f1b`
- `codrops/ScrollTextMotion` @ `9f05d938f7b38e76e3146f26e393118e7975b6b3`
- `WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops` @ `f2ed512d4313ff50404b68263504915d16055165`
- `zavalit/bayer-dithering-webgl-demo` @ `3db1d5fb94bb2270ca7d88aec9e55605d6845810`

What remains:

- CodePen 参考目前按视觉行为做了 KIN 化适配；若要逐行保留其 pen 源码，需要用户提供可下载的 source export。
- 上游 Three.js/WebGPU demo 仍是视觉参考层，真实 Agent / Experience 事件尚未注入动画参数。


## 2026-08-27 KIN multi-scene interaction pass

What changed:

- Hero 之后新增 `KIN Structure` 滚动章节：使用橙色/石墨蓝的两条高光螺旋轨道、液态光核和 hover responding 状态，将 DNA 交互改写为 `recognize kin` 。
- 新增 `Signal Garden` 滚动章节：Canvas 花瓣/粒子场可拖拽培育，双击解散，与整站橙色、黑色、石墨蓝配色一致。
- 两个新场景都通过 IntersectionObserver 只在进入视口时运行，避免滚动时常驻的 GPU/Canvas 开销。
- 保留原 Fluid Glass Hero：当前官网是“液态玻璃 Hero → 亲缘螺旋 → 经验信号 → 物理设备 → Access”的多场景节奏。

What is verified:

- `npm test`：4 tests passed，0 failed。
- `npm run build`：Vite production build 成功；JS 85.22 kB（gzip 23.40 kB），CSS 13.99 kB（gzip 4.01 kB）。
- 本地浏览器首屏 title 为 `KIN — Agents need kin`；`#kin-helix-canvas` 和 `#signal-garden-canvas` 各存在 1 个；无 console error/warning。
- 滚动至 KIN Structure 后实视可见橙/石墨蓝螺旋节点和“Some relations pull you closer.”文案。

What remains:

- 新场景目前是独立前端视觉原型，尚未让后端真实 Agent/经验事件驱动螺旋或花园。
- 手机端已有单列布局，需在真实小屏设备上再做一轮触摸密度和文案尺寸调参。

Next action:

- 用户确认多场景节奏后，把 Backend `Radar / Handshake / Experience` 事件对应为液态 field 注入、DNA cell 高亮和花园解散。


## 2026-08-27 KIN brand lock and liquid kinship hero

What changed:

- 用户正式确定产品名为 **KIN**，品牌核心语义是同类、亲缘与伙伴；连接动作从 `add friend` 升级为 `recognize kin`。
- 单一真相源 `PROJECT_CONTEXT.md` 的项目名已从暂定 Node / Builder 更新为 KIN，官网 metadata、wordmark、Canvas mask、文案和 package 名同步更新。
- Hero 的 Fluid Glass mask 不再只有三个字母；现在同一 reaction-diffusion 场会液化 `KIN`、`RECOGNIZE KIN`、亲缘轨道、四个生命节点、`SHARED INTENT` 和 `RELATION MEMORY`。
- 桌面端液态主体右移到 64% 视口，左侧留给品牌句 `Humans have social networks. Agents need kin.`；幽灵鼠标路径也同步围绕 KIN 主体运动。

What is verified:

- `npm test`：4 tests passed，0 failed。
- `npm run build`：Vite production build 成功；JS 80.99 kB（gzip 22.10 kB），CSS 11.54 kB（gzip 3.52 kB）。
- 本地浏览器标题为 `KIN — Agents need kin`，等待 7.2 秒后 KIN、液态轨道和附加语义元素可见；console errors/warnings 为空，幽灵鼠标 `ghostMoved=true`。

Next action:

- 验收品牌句、液态轨道密度和 KIN 字形；确定后将真实 Context Handshake 事件映射到 `recognize kin` 液态仪式。


## 2026-08-27 Fluid Glass website direction

What changed:

- 将 `apps/web` 升级为 Fluid Glass 视觉方向，保留并本地化了参考项目的 OGL、fluid simulation、reaction-diffusion 和 glass shading 核心。
- 按参考链接固定参数：`feed=0.054`、`kill=0.0616`、`iteration=10`、黑底、石墨蓝灰、`#F77E2D` 橙和珍珠白。
- 把原始时钟数字 mask 改为产品名 `NODE` 与 `PERSONAL AGENT NETWORK`。
- 实现可见的“幽灵鼠标”：使用 Lissajous 路径自主游走并持续向 flowmap 注入速度；真实鼠标移动会接管 2.2 秒后再交还自主控制。
- 重做首屏与 System / Experience Protocol / Device / Access 章节，改为黑白纸张切换、编辑式排版和状态橙色的成熟产品官网风格。
- Fluid Glass 只在 Hero 可见时持续渲染，离开首屏后暂停 GPU simulation 并隐藏幽灵鼠标。

What is verified:

- `npm test`：4 tests passed。
- `npm run build`：Vite production build 成功；JS 80.41 kB（gzip 21.84 kB），CSS 11.54 kB（gzip 3.52 kB）。
- 本地浏览器连续运行 7 秒无 console error/warning，`NODE` Fluid Glass mask 可见。
- 幽灵鼠标在 1.4 秒间隔内的 transform 从 `translate3d(869.842px, 491.768px, 0px)` 变为 `translate3d(831.625px, 487.064px, 0px)`，证明自主路径正在驱动。

What remains:

- `NODE` 仍是项目暂定名；如果正式产品名不同，需要同步替换 Canvas mask、wordmark 和 metadata。
- 官网尚未接入真实 Profile、Handshake 和 Experience API。

Next action:

- 请用户在 Zen 中验收 Fluid Glass 的质感、`NODE` 字形与幽灵鼠标速度；方向确认后再将真实 Agent event 映射为 flowmap 扰动。


## 2026-08-27 Agent_link 双机后端桥接 V0.1

What changed:

- 新增 `POST /v1/agent-link/events`，接收 ROROLEE / AgentStack 转发的官方 `agent_link_push_event` 二进制包。
- 将真实广播名 `NODE-A7B2` 和 `NODE-7FAE` 绑定到 demo 的两个设备身份。
- 仅转换两类已确认数据：Agent_link custom event `100` 的 `handshake.gesture` JSON，以及 button event `1` 的 `{0,1}` 按下数据。
- 新增 wire-event JSON Schema、TypeScript type、OpenAPI 快照和可独立运行的 gateway simulator。

What is verified:

- `pytest`: `9 passed`，包含真实设备名、wire event 翻译、未知设备和不支持 payload 的负例。
- `compileall` 通过，OpenAPI 重新生成，当前 23 条 path。
- 独立 Uvicorn 进程接收四个 Agent_link wire event：A/B gesture + A/B button，最终 literal result 为 `RESULT connected rel_34ef23ce11013f4a`。

What remains:

- 当前验证的是与真实固件完全相同的 wire bytes + 真实设备名，但转发端仍是 simulator，尚未拿到 ROROLEE 实际 outbound hook。
- 两台 Cardputer 已烧录并可广播；尚未同时通过 ROROLEE 把真实按键/手势包转入本 endpoint。

Next action:

- 优先确认 ROROLEE / 赛事 AgentStack 的 outbound 配置入口；如果它只提供 BLE 控制而不提供 HTTP webhook，则使用同一 contract 增加一个手机/本机 relay，后端握手领域逻辑不变。

## 2026-08-27 第二台 Cardputer-Adv 原固件备份与烧录

What changed:

- 识别第二台 Cardputer-Adv 的基础 MAC 为 `50:78:7d:ce:7f:ac`，并在写入前完整读出 8 MB 原 Flash。
- 原固件备份已复制到 Google Drive 的 `FCC品牌/设备固件备份/Cardputer-Adv`。
- 第二台设备已写入同一份 Node Cardputer-Adv V0.1 固件。

What is verified:

- 完整备份长度 8,388,608 bytes，SHA256 `cb9904fc9fcd263178c32fc8f6ae152464bd7cacdb244ffea082bf899a264276`。
- 独立重读实板前 64 KiB 与完整备份的同一区间 SHA256 一致：`4410125a0f47919bfe77c3865a3240378c21eb5b3768356399334653e70ac2e6`。
- Google Drive 副本 SHA256 与本地原始读取完全一致。
- esptool 写入后各段 hash 校验通过；实板启动后识别 `board_M5CardputerADV`、`imu=1 speaker=1 mic=1`。
- 第二台的 BLE MAC 为 `50:78:7d:ce:7f:ae`，Agent_link 已以 `NODE-7FAE` 广播并注册 Service C `0xFFC0`。

What remains:

- 两台设备现在均已具备演示固件；尚待 ROROLEE/后端把 `NODE-A7B2` 和 `NODE-7FAE` 关联到同一次 Context Handshake。

Next action:

- 不再重复验证 Cardputer 原生硬件，直接进入双机 Agent_link 身份绑定和握手闭环。

## 2026-08-27 Cardputer-Adv Firmware V0.1 真机点亮

What changed:

- 新增 `firmware/cardputer-adv` ESP-IDF 5.5.4 工程，以官方 `Agent_link` component + M5Unified 构成 Cardputer-Adv 最小 Board Adapter。
- 接入 ST7789V2 屏幕、BMI270 加速度、G0 确认键、电量、ES8311/扬声器输出队列和 Agent_link BLE transport。
- 固件以 `NODE-<BLE MAC suffix>` 作为稳定设备名；实板本次广播名为 `NODE-A7B2`。
- BMI270 本地以 100 Hz 采样，10 Hz 经 generic I/O 上报；超过 1.85 g 生成候选手势事件，但双方仍必须按键确认。

What is verified:

- `/dev/cu.usbmodem21201` 只读识别为 ESP32-S3 QFN56 rev v0.2、8 MB embedded Flash、40 MHz crystal，MAC `50:78:7d:ce:a7:b0`。
- ESP-IDF 5.5.4 clean first build 成功；`node_cardputer_adv.bin` 为 1,290,560 bytes，SHA256 `6c08893b3720e6bf3acede108fd1af8165acf88bf161898b8066bec52722a877`，app partition 剩余 69%。
- 未做 Flash 备份（按用户本轮明确选择）；固件已写入并通过 esptool 写后 hash 校验。
- 启动日志实板检测 `board_M5CardputerADV`，并报告 `imu=1 speaker=1 mic=1 battery=63`。
- Agent_link 已注册 `imu_accel` 和 `screen0`，已启动 BLE，已注册 Service C `0xFFC0`，并以 `NODE-A7B2` 广播。

What remains:

- 需用户目测确认屏幕 UI，并实际按 G0/晃动设备验证事件日志。
- 尚未用 ROROLEE 建立真实 BLE 连接，也尚未验证一台手机同时连两台的能力。
- 麦克风录音上行、TCA8418 全键盘、microSD 不在 V0.1 最小闭环内。
- NFC 和震动硬件仍不存在；当前闭环不依赖它们。

Next action:

- 先用 ROROLEE 连接 `NODE-A7B2` 验证文本/音频/G0/BMI270；然后接入第二台 Cardputer-Adv，将已验证的同一固件写入后跑双机 Context Handshake。

## 2026-08-27 macOS ESP-IDF / Agent_link environment bootstrap

What changed:

- 安装并固定 ESP-IDF v5.5.4 到 `~/esp/esp-idf-v5.5.4`，安装 ESP32-S3 工具链、IDF Python 依赖、CMake 4.4.2 与 Ninja 1.13.0。
- 新 zsh 会通过 `outputs/dev-env/activate-esp-idf-5.5.4.sh` 自动激活该版本；保留了原始 `.zshrc`、diff、验证记录和可执行回滚脚本。
- 识别主办方二维码，将赛事 AgentStack 登录密码与 User Key 写入 macOS Keychain，没有把明文凭据写入项目。

What is verified:

- 新 zsh 的 `idf.py --version` literal result 为 `ESP-IDF v5.5.4`。
- 官方 `DeotalandDev/Agent_link` 本地 commit `3c93ecfcdc473c952a0e85d9797c2663e9ba7d87` 与 `origin/main` 一致。
- Agent_link 默认 `rorolee-s3`、target `esp32s3` clean build 成功；`agent_link.bin` 为 1,191,552 bytes，SHA256 `4e2c277069f94a37de75268014e2dda260d86303382680376cd564ac3840a22d`。
- 回滚脚本已在另一份修改副本上验证，恢复后 SHA256 与原始 `.zshrc` 一致；实际 `.zshrc` 保持已配置状态。

What remains:

- 本轮未检测到 USB 串口，因此没有对任何设备执行 flash。
- 当前成功构建的是官方 ROROLEE S3 参考板，不是 Cardputer-Adv 固件；Cardputer-Adv 仍需要专用 Agent_link Board Adapter。
- ROROLEE App 与二维码所指赛事 AgentStack 的真实登录/设备绑定流程尚待带设备联调。

Next action:

- 接入一台 Cardputer-Adv 后先做只读 USB/芯片审计，再建立最小 Cardputer-Adv Adapter，并在 ROROLEE 中验证 BLE 广播、连接和控制服务 `0xFFC0`。


## Current Phase

**Phase 0 — Hardware Truth / Project Bootstrap**

当前只做 Phase 0，不开始产品功能开发。

### 2026-08-27 Backend V0.1 implementation

What changed:

- 建立 `apps/api` FastAPI 模块化单体、TiDB migration、共享 OpenAPI/Agent event contract、worker seam 和双 Cardputer HTTP simulator。
- 实现 Profile、设备绑定/心跳、presence、Radar、双方 gesture + confirm 握手、Relationship Memory、Need 和 Experience Search。
- 加入 gateway token、事件幂等、共享 nonce、3 秒手势相关窗口、SSE、有界事件队列和 demo seed/reset。

What is verified:

- Python 3.9 虚拟环境安装成功；`pytest`：`5 passed in 0.13s`。
- `compileall` 通过，OpenAPI contract 已从真实 FastAPI app 生成。
- 独立 Uvicorn HTTP 进程上运行 simulator：seed、A/B gesture、A/B confirmation 全部 HTTP 200，最终 literal result 为 `RESULT connected rel_e4d26205d671dc0d`。
- 最终 confirmation 重放测试返回 `duplicate=true`，且只创建一个 Relationship。

What remains:

- 尚未拿到 TiDB Cloud 连接信息，因此真实 `VECTOR(64)` migration/query 未运行；本地 SQLite + deterministic embedding 路径已通过。
- ROROLEE/Cloud Agent 的真实 outbound contract 未提供；当前 `/v1/agent/events` 由完全相同 envelope 的 simulator 验证。
- Web/PWA、生产身份、真实 embedding/LLM provider、多副本 SSE broker 尚未实现。

Next action:

- 后端核心已可供前端并行使用；下一步补 contract/client handoff，并在视觉方案回来后建立 `apps/web`。
- 硬件到来后用相同 Agent gateway contract 替换 simulator，不改握手领域逻辑。

### 2026-08-27 official-stack usage and performance decision

What changed:

- 用户确认 Cardputer-Adv 为主开发路径，并授权在开源主办方组件中增加必要适配；核心要求是明面使用官方方案且不得拖累设备性能。
- `PROJECT_CONTEXT.md` 已从 OJBadge MVP 主路径切换到双 Cardputer-Adv，并把 OJBadge 定位为可恢复的审计/展示资产。
- 固定“官方栈薄接入”策略：固件只使用必要的 Agent_link protocol/transport；Agent/检索/AgentStack 留在云端并通过 Gateway contract 隔离。

What is verified:

- 本地 Agent_link 的 SDK 与 Board 层已经解耦，SDK 不直接操作 GPIO，适合以独立 ESP-IDF component 嵌入 Cardputer 固件。
- `agent_link_push_event`、generic I/O、voice 和 battery API 可覆盖握手候选、传感器、音频与状态上报；未接通 transport 的 API 不作为可用事实。
- 公开搜索存在多个互不相关的 `AgentStack` 项目；目前没有证据能确认用户所说的赛事 AgentStack 对应哪一个。

Performance gates:

- Agent_link 接入相对 bring-up baseline 的显示/IMU p95 延迟退化不超过 5%。
- BMI270 100 Hz 不丢样；音频零 underrun；双机 30 分钟无持续内存下降、watchdog 或异常断连。
- 回调不阻塞，所有队列有界，官方模块可由 build flag 单独关闭做 A/B 对照。

Next action:

- Phase 0 仍先确认赛事 AgentStack 的确切资料与双 ROROLEE 连接能力；随后按已确认计划进入两台 Cardputer 的只读审计和 Phase 1 bring-up。

### 2026-08-27 Cardputer-Adv architecture pivot proposal

What changed:

- 用户报告主办方已口头允许直接使用两台自有 M5Stack Cardputer-Adv 开发/演示，条件是通过主办方 `Agent_link` 完成通信/协议接入。
- 官方资料与官方库审计确认 Cardputer-Adv 自带 BMI270 IMU、ST7789V2 屏、TCA8418 键盘、ES8311 音频、麦克风/喇叭、电池和 BLE 所需 ESP32-S3；没有 NFC 或震动。
- `docs/HARDWARE_REPORT.md` 新增 Cardputer-Adv Truth、引脚、Board Adapter 提案，以及修订后的 Phase 1/2 双机握手计划。

What is verified:

- 官方 Cardputer-Adv 页面列出 ESP-IDF 支持、8 MB Flash、BMI270、ES8311、56 键、1.14 英寸 240x135 ST7789V2 和 1750 mAh 电池。
- 本地固定审计 `M5Cardputer` commit `f1392858b9994c3547120e602a57d3553d16ab01` 与 `M5Unified` commit `3eaaf828adfd0923c71ccc2e233a0199d9958faa`；官方 Cardputer 库包含 ADV 的 TCA8418 路径，M5Unified 包含 BMI270 驱动。
- 两台 Cardputer-Adv 足以设计“IMU 手势候选 + 双方按键确认 + Agent_link/Cloud Shared Context”的可演示闭环，NFC 不再是依赖。

What remains unknown:

- 两台实物尚未在本机完成 USB/版本/外设只读审计。
- ROROLEE 是否支持同一手机同时连接两台 Agent_link BLE 设备，尚未验证。
- 主办方口头许可尚未归档为文字/截图证据。
- Cardputer-Adv 的 Agent_link Adapter 尚不存在；音频 MCLK/功放控制和 ESP-IDF 5.5.4 组件组合需要 Phase 1 真机验证。

Next action:

- 先与用户确认 Cardputer-Adv 主路径、双机连接拓扑和 Phase 1 语音范围；确认前不开始大规模实现代码。
- 获得确认后，Phase 1 从两台 Cardputer-Adv 的只读身份/固件备份与外设 smoke test 开始。

### 2026-08-27 OJBadge physical read-only audit

What changed:

- 用支持数据的 USB-C 线进入 ESP32-S3 ROM bootloader，未写入固件。
- 完成 USB、SoC revision、PSRAM、Flash JEDEC/容量、security eFuse 和现有固件 descriptor 审计。
- 保存原始 16 MB Flash 镜像并完成前 64 KiB 独立重读比较。

What is verified:

- USB `0x303A:0x1001`，`/dev/cu.usbmodem1101`。
- ESP32-S3 QFN56 revision v0.2，40 MHz crystal，8 MB embedded PSRAM。
- Flash JEDEC `0xEF:0x4018`，16 MB，quad，3.3 V。
- Secure Boot disabled；Flash Encryption disabled。
- 当前固件为 Aily/Arduino 路径构建（二进制推断），底层 IDF `v5.5.1-1-g129cd0d247`。
- Flash 备份 SHA256 `fc8ef7ca51db4ddeeec42bebde9d06b229af8bc76ad043bb29d7764bd7eaadfd`。

What failed / remains:

- 第一根 USB-C 线只能供电而未枚举数据；更换数据线后解决。
- 屏幕、触摸、音频、电量计和 IMU/NFC/haptic 缺失还未用新测试固件运行验证。
- `esptool 5.1.0` 不支持本机 Python 3.9；只读审计改用 `esptool 4.12.0` 成功完成。

Next action:

- 让设备退出 ROM bootloader 并恢复原固件启动。
- 继续讨论 Phase 1 底层 bring-up 计划，未确认前不写入新固件。

### 2026-08-27 Phase 0 OJBadge authoritative-source audit

What changed:

- 用 OJBadge 官方详细介绍、V0.1 原理图、屏幕规格书和 Aily OJBadge 板包重写 `docs/HARDWARE_REPORT.md`。
- 审计 Aily `aily-blockly-boards` commit `8910a727ec8c081ea993aea8a3db10351ffa29c1` 和 `aily-blockly-libraries` commit `df82ee89260fc54ea8e3bca3d06f18f2890313e0`。
- 保留 Agent_link 审计 commit `3c93ecfcdc473c952a0e85d9797c2663e9ba7d87`，并把 Adapter 计划改为真实 OJBadge 引脚/器件。
- 否决先前“OJBadge 可能是 Waveshare 1.85B”的假设，未删除该失败路径记录。

What is verified:

- SoC: ESP32-S3R8；Flash: W25Q128JVPIQ 16 MB；PSRAM: 8 MB OPI。
- Display: 1.28-inch 240x240 GC9A01 4-wire SPI；Touch: CST816D。
- Audio: GMI6027P-32DB single mic + ES8311 + AW8010AFCR + 1609 speaker。
- Power: 402530 3.7 V/300 mAh battery + BQ27220YZFR + LGS4056HDA + TLV62569DBVR。
- Buttons: GPIO0 BOOT 是可读按键；SW1 是长按电源开关，不是普通 app key。
- GPIO/I2C/SPI/I2S/USB 映射已从 V0.1 原理图与官方板包交叉校验。
- OJBadge V0.1 没有 IMU、NFC、震动、RTC 或 microSD。
- Agent_link 当前没有 OJBadge Adapter。

What failed / was not available:

- 先前 Waveshare 1.85B 匹配假设被官方 OJBadge 资料证伪；旧芯片/引脚不得进入实现。
- 公开资料中没有 OpenJumper 的 ESP-IDF OJBadge BSP；Aily 板包是 Arduino/Aily 生态，不是 ESP-IDF BSP。
- ESP-IDF 5.5.4 未在本机安装，clean build 未运行。
- 本轮没有连接实物 OJBadge，因此尚无 flash/I2C scan/屏幕/音频/电量真机证据。
- 原理图 U10 的确切型号未标注。

New blockers:

1. 需要实物板与 OJBadge V0.1 原理图做 revision 核对。
2. 需要在 ESP-IDF 5.5.4 上锁定并编译验证 GC9A01/CST816D/ES8311/BQ27220 组件组合。
3. 需要与用户确认 Phase 1/2 计划中的 UI、语音触发方向和 `IsCharging` 策略。

Next action:

与用户讨论 `docs/HARDWARE_REPORT.md` 第 8–10 节的 Phase 1/2 计划和五个决策点；获得确认前不开始大规模实现。

---

## Confirmed

### Product

```text
Discover
→ Understand
→ Context Handshake
→ Shared Context
→ Experience Help
```

比赛的三个核心 Magic Moments：Builder Radar、Context Handshake、Ask the Room。

### Competition / Architecture

- Board B = OJBadge。
- 目标 ESP-IDF 5.5.4。
- 必须经 `agent_link -> ROROLEE -> Cloud Agent`。
- OJBadge 没有现成 Agent_link Adapter。
- **DECISION:** ESP32 是 Thin Client，复杂 Agent/Match/Context/Experience Search 在云端。

## Hardware Truth Checklist

```text
[x] Exact OJBadge public board package
[x] Schematic
[x] Display IC and resolution
[x] Touch IC
[x] Audio codec / microphone / amplifier
[x] Flash / PSRAM
[x] Battery / gauge / charger
[x] IMU absent on V0.1
[x] NFC absent on V0.1
[x] Haptic absent on V0.1
[x] GPIO / I2C / SPI / I2S map
[~] Physical-board SoC/Flash/PSRAM confirmed; PCB/peripheral revision pending
[ ] ESP-IDF 5.5.4 driver build
[ ] Hardware smoke tests
```

## Decision Log

### D001

ESP32 不运行复杂 LLM。  
Status: ACCEPTED

### D002

优先跑通官方 `agent_link -> ROROLEE` 路径。  
Status: ACCEPTED

### D003

Context Handshake 的具体物理协议等硬件确认后决定。  
Status: ACCEPTED

### D004

Hackathon 不实现全量 AI Chat History Import。  
Status: ACCEPTED

### D005

Raw AI conversations 不直接在 Node 之间交换。  
Status: ACCEPTED

### D006

OJBadge V0.1 的 Context Handshake 不依赖 IMU、NFC 或震动；候选路径收敛为 BLE proximity + 按键/触摸显式确认。  
Status: SUPERSEDED by D008

### D007

主开发板切换为两台 Cardputer-Adv，不拆解模块、不把模块接入 OJBadge；OJBadge 暂停在已验证/可恢复状态。  
Status: ACCEPTED

### D008

双机 Context Handshake 使用 BLE/Cloud 匹配、BMI270 手势候选与双方按键显式确认；不依赖 NFC 或震动。  
Status: ACCEPTED

### D012

主办方技术采用“协议合规、薄层集成”：Cardputer 固件只嵌入必要 Agent_link；AgentStack/复杂 Agent 能力放在云端，经 Gateway contract 隔离，并以 baseline A/B 性能门槛约束。  
Status: ACCEPTED

## Update Rule

每完成一个重要任务，记录 What changed / What is verified / What failed / New blockers / Next action。不删除失败路径。

### 2026-08-27 Software workstream architecture audit

What changed:

- 新增 `docs/SOFTWARE_ARCHITECTURE.md`，定义用户 PWA、官网、后端、TiDB 数据模型与硬件事件边界。
- 固定审计 EigenFlux commit `8d9679a7c89d9d87d5e580c610a4abebd541f296`。
- 提出 D009–D011：模块化单体 + TiDB Vector Search；EigenFlux 作为参考而非整栈 fork；先 Web 闭环后硬件接入。

What is verified:

- EigenFlux 发布了包含生产服务、迁移、CLI、Console 和部署脚本的源码。
- 许可证是带品牌附加条件的 modified Apache 2.0，可修改/部署但独立产品需使用不同名称与 Logo。
- EigenFlux 完整栈依赖 Go 1.25、PostgreSQL、Redis、Elasticsearch、etcd 与多个 RPC 服务，不适合直接作为本项目 Hackathon 基座。
- EigenFlux Console 在 Node v22.23.1 下使用 `npm ci --legacy-peer-deps && npm run build` 构建成功；普通 `npm ci` 因 Refine peer dependency 冲突失败。
- 构建产物约 3.1 MB，主 JS chunk 3,232.30 kB；安装报告 14 个依赖漏洞，其中 11 个 high。

What failed / remains:

- 本机没有 Docker 与 Go，未启动 EigenFlux 全栈。
- 尚未创建本项目软件 monorepo、TiDB 实例或 UI 原型。
- ROROLEE / Cloud Agent 到自定义后端的具体事件接口尚未验证。

New blockers:

1. 需要可用的 TiDB Cloud 开发连接信息后才能验证真实 vector schema/query。
2. 真实硬件联调依赖 agent_link Cardputer-Adv Adapter 与 ROROLEE 路径，但软件可先用 simulator 推进。

Next action:

- 按 `docs/SOFTWARE_ARCHITECTURE.md` 建立软件 monorepo，并实现纯 Web 的 Discover → Understand → Handshake → Remember → Help 垂直切片。

## 2026-08-28 EigenFlux KIN Core bootstrap

- 从 EigenFlux `8d9679a7c89d9d87d5e580c610a4abebd541f296` 创建长期基座 `platform/kin-core`，保留 Git 历史；上游 fetch 指向 GitHub，push URL 固定为 `no_push`。
- 新增 KIN 基座说明 `platform/kin-core/KIN.md` 和 FastAPI → Go 兼容路由矩阵 `platform/kin-core/docs/kin/COMPATIBILITY.md`。
- 保留 EigenFlux Auth、Onboarding、Agent Card、Attention、Feed、PM/Relations、Notification、WebSocket、Runtime Command、CLI/Skills 等生产能力。
- 新增 KIN 领域合同骨架：`presence`、`handshake`、`relationship`、`experience`、`campfire`，以及 `kincontext`、`kinmatch`、`deviceidentity` 包；新增组合测试验证身份 → 匹配 → 双边握手。
- 将已验证的 TiDB migration 复制为 `platform/kin-core/kin/migrations/0001_initial_tidb.sql`，SHA-256 与 `infra/migrations/0001_initial_tidb.sql` 一致。
- 安装并固定 Go 1.25.14 workspace toolchain，`scripts/common/build.sh` 编译 profile/item/sort/feed/pm/auth/notification/api/ws/pipeline/cron/replay 全部通过；KIN foundation tests 全部通过。
- EigenFlux 管理后台在基座中 `npm ci --legacy-peer-deps && npm run build` 通过；用户端 KIN 页面仍按后续页面计划新增。
- 证据、修改包、diff、回滚脚本：`outputs/kin-core-bootstrap-v0.1/`；回滚脚本已在独立副本执行，副本恢复到上游 HEAD，实际基座保持修改。

## 2026-08-28 KIN user web V0.1 — Onboarding, App Shell and Today

- 在 EigenFlux 基座新增独立用户端 `platform/kin-core/console/kin-webapp`，与运营后台 `console/webapp` 分离；技术栈沿用 React 19、TypeScript、Vite 和 Console V2 BFF。
- 新增 `/login`：接入 Console V2 email challenge / OTP contract；新增 `/onboarding`：覆盖 Identity Card、Network Goal、Intent Action、Security Boundary 四步草稿与确认流程。
- 新增统一 App Shell，主导航固定为 `TODAY / RADAR / ASK / KIN / ME`，桌面侧栏在移动端转为底部导航。
- 新增 `/today`：直接消费 `console_today.v2`，展示 Focus / Participation Attention、Network Goal、Runtime 在线状态、Profile 完成度、Encounter 与 Agent Context。
- 提供显式 `?demo=1` 确定性演示数据；没有该参数时只访问真实 `/api/v2` 同源接口，不自动用假数据掩盖后端错误。
- `npm test`：4 passed；`npm run build`：44 modules transformed，JS 250.89 kB（gzip 81.04 kB），CSS 12.60 kB（gzip 3.50 kB）。
- 本地浏览器实视 `/today?demo=1`：4 张 Attention Card、6 个页面标题、console error/warning 为 0；Onboarding 已实走 Identity → Network Goal → Intent。
- 修改包、diff、验证记录与独立回滚脚本保存在 `outputs/kin-user-web-v0.1/`；实际 `console/kin-webapp` 保持修改。

Next action:

- 开发第二个页面单元 `Radar + Match Detail`，复用 Agent Card、TiDB Profile Vector、Presence 和 KIN `kinmatch` 解释合同。

## 2026-08-28 KIN liquid-glass narrative study

- 从指定 CodePen 完整提取并本地运行 HTML/CSS/WebGL 源码，原始三份源码 SHA256 已记录在 `outputs/liquid-glass-narrative-demo/VERIFICATION.txt`。
- 保留原 WebGL 折射、色散、呼吸、单元形状、指针光照与点击波纹，新增 KIN 的 Discover → Understand → Handshake → Remember → Help 五阶段可交互叙事层。
- 本地浏览器验证原始版与叙事版均无 console error/warning；握手阶段切换后显示 `CONNECTED`，预览保存在 `outputs/liquid-glass-narrative-demo/preview.png`。
- 修改、diff、验证记录和已实测回滚脚本保存在 `outputs/liquid-glass-narrative-demo/`；实际叙事版保持修改。

Next action:

- 若采用该方向，将玻璃纹理降级为 Radar / Handshake 的状态层，并用真实 Match / Handshake 事件驱动 shader 参数，避免作为全站常驻装饰。
