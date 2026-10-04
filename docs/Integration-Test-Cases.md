# TalkDrill - Integration Test Cases Specification

## 1. Overview & Integration Boundaries

本文档依据 [docs/Architecture.md](file:///Users/victorxu/projects/talkdrill/docs/Architecture.md)、[docs/API_Spec.md](file:///Users/victorxu/projects/talkdrill/docs/API_Spec.md) 与 [docs/Database.md](file:///Users/victorxu/projects/talkdrill/docs/Database.md) 编制，聚焦于验证前端展示层、领域业务引擎、本地存储层（Dexie.js / IndexedDB）以及边缘反代网关（Cloudflare Worker）之间的接口契约与边界数据流转。

---

## 2. Integration Boundary 1: Dexie.js (IndexedDB) 本地数据存储与事务

### TC-IT-DB-001: 篇目与音频资产级联写入与外键约束契约
- **Boundary**: `CorpusModule` <-> `AudioModule` <-> `TalkDrillDatabase`
- **Objective**: 验证一篇完整包含文本与原生二进制音频 Blob 的篇目在持久化存储时的原子性与数据关联完整性。
- **Contract Verification**:
  - `articles.add(articleRecord)` 必须成功生成包含非空 UUID `id` 的记录。
  - `audios.put(audioRecord)` 记录中，`audioRecord.articleId` 必须严格等于 `articleRecord.id`。
  - `audioRecord.blob` 存取必须保持原生二进制流完整，`Blob.size` 与原始音频字节完全相等。
- **Failure Resilience**: 若音频写入因配额超限异常抛错，系统应捕获该异常，文章基础文本记录保持可用，文章表 `audioId` 置空并记录警告。

### TC-IT-DB-002: 篇目删除时的级联清理事务 (Cascade Deletion)
- **Boundary**: `StorageModule` 内部事务
- **Objective**: 验证删除某篇目时，其附属的二进制音频 Blob 与打卡流水日志被原子同步清理，不产生孤儿垃圾数据。
- **Contract Scenario**:
  1. 在本地数据库中预置 1 篇篇目（`id: art-001`）、1 条音频（`articleId: art-001`，体积 5MB）及 50 条打卡流水（`articleId: art-001`）。
  2. 调用 `deleteArticle("art-001")`。
- **Expected Outcome**:
  - `db.articles.get("art-001")` 返回 `undefined`。
  - `db.audios.where("articleId").equals("art-001").count()` 返回 `0`。
  - `db.drillLogs.where("articleId").equals("art-001").count()` 返回 `0`。
  - 存储空间实时释放 5MB。

---

## 3. Integration Boundary 2: 边缘反向代理 (Cloudflare Worker) 与外部 API

### TC-IT-PROXY-001: Anthropic 口语翻译代理端点契约验证
- **Boundary**: `TranslationModule` <-> `POST /api/proxy/anthropic` <-> `Anthropic API`
- **Objective**: 验证翻译请求通过边缘 Worker 代理时的请求头单向透传与响应格式契约。
- **Contract Scenario**:
  - 发起 `POST /api/proxy/anthropic`：
    - Headers: `x-api-key: <user-key>`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`。
    - Body: 符合 Anthropic messages 格式规范。
- **Expected Outcome**:
  - 代理 Worker 成功完成 CORS 预检（`OPTIONS` 请求返回 204 及正确 `Access-Control-Allow-Origin`）。
  - 返回 HTTP 200，Response Body 包含 `content[0].text` 与 `usage` 统计。
  - Worker 内部日志中不留存任何用户请求正文与 API Key（无状态审计）。

### TC-IT-PROXY-002: 多厂商 TTS 语音合成二进制流式中转契约
- **Boundary**: `AudioModule` <-> `POST /api/proxy/tts` <-> `OpenAI / ElevenLabs / Minimax`
- **Objective**: 验证大体积音频二进制流通过边缘反代时的流式透传能力与分块传输完整性。
- **Contract Scenario**:
  - 发送带有 `x-target-endpoint: https%3A%2F%2Fapi.openai.com%2Fv1%2Faudio%2Fspeech` 与对应 Bearer Token 的合成请求。
- **Expected Outcome**:
  - 代理返回状态码 200，`Content-Type: audio/mpeg`，`Transfer-Encoding: chunked`。
  - 前端以 `ReadableStream` 接收并成功合并为原生 `Blob`，经过 `new Audio(URL.createObjectURL(blob))` 装载可正确提取 `duration`（> 0 秒）。

### TC-IT-PROXY-003: 外部服务鉴权失败与速率限制错误映射 (401 & 429)
- **Boundary**: `EdgeProxy` <-> 前端错误处理系统
- **Objective**: 验证第三方返回异常时，代理与前端的错误码一致性映射。
- **Scenarios**:
  - 上游返回 401 Unauthorized：前端捕获并转换为标准应用错误 `AppErrorCode.CONFIG_MISSING` / 鉴权错误，提示重核 API Key。
  - 上游返回 429 Too Many Requests：前端捕获并保持非阻断态，提示“服务频次受限，请稍后重试”，不冲垮本地数据。

---

## 4. Integration Boundary 3: 音频引擎与 Web Audio / HTML5 Audio 内存交互

### TC-IT-AUDIO-WEB-001: Blob URL 生命周期与内存防泄漏回收
- **Boundary**: `AudioModule` <-> `HTML5 Audio` <-> `Browser Memory`
- **Objective**: 验证音频装载与篇目切换过程中 `URL.revokeObjectURL` 得到及时执行，杜绝堆内存泄漏。
- **Contract Scenario**:
  1. 为篇目 A 生成 Blob 并调用 `URL.createObjectURL(blobA)`，播放器装载 URL-A。
  2. 用户在界面切换至篇目 B，调用 `load(blobB)`，生成 URL-B。
- **Expected Outcome**:
  - 系统捕获旧的 URL-A 并立即调用 `URL.revokeObjectURL(URL-A)`。
  - 播放器 `src` 无缝更新为 URL-B；切换耗时 `<= 100ms`。

### TC-IT-AUDIO-WEB-002: 变调不变速与 A-B 循环精确触发
- **Boundary**: `PlayerEngine` <-> `HTML5 Audio (preservesPitch)` <-> `requestAnimationFrame`
- **Objective**: 验证倍速变更与 A-B 断点循环在播放器核心中的同步可靠性。
- **Contract Scenario**:
  1. 设置 `playbackRate = 1.5`，设置 `loopRegion = { startSec: 1.0, endSec: 2.5 }`。
  2. 启动播放，等待时间推进至 2.5 秒。
- **Expected Outcome**:
  - 原生 Audio 元素保持 `preservesPitch === true`。
  - 监听触发跳转时，`audio.currentTime` 在单次轮询中被无爆音重置为 `1.0` 秒，时间抖动差 `<= 16ms`。

---

## 5. Integration Boundary 4: 瞬时打卡计数与异步防抖持久化集成

### TC-IT-DRILL-DB-001: 16ms 内存状态瞬时递增与后台防抖写回一致性
- **Boundary**: `DrillCounterService` <-> `React UI State` <-> `Dexie.js articles / drillLogs`
- **Objective**: 验证高频极速敲击 Space 键时，界面即刻响应且数据库最终写回数据完整无丢失。
- **Contract Scenario**:
  1. 模拟用户在 1.5 秒内极速敲击 Space 键 5 次（间隔 300ms）。
  2. 观察内存状态与 IndexedDB 写入行为。
- **Expected Outcome**:
  - 每次按键后，内存状态及“正”字笔画渲染均在 `<= 16ms` 内同步递增（1 -> 2 -> 3 -> 4 -> 5，形成一个完整“正”字）。
  - 后台持久化逻辑通过防抖或请求合并（Debounced Flush）机制将最终计数值 `5` 写入数据库 `articles` 表；`drillLogs` 表记录 5 条增量流水；无并发写锁死。
