# TalkDrill - API Specification

## 1. Overview & Architecture Philosophy

TalkDrill 是一款去中心化、离线优先的纯客户端应用程序。其接口协议体系划分为两大核心层级：
1. **外部通信接口 (External & Proxy APIs)**：用于处理前端与第三方 AI / TTS 服务提供商之间的网络交互，由内置于 Cloudflare Pages Functions（`/api/proxy/*`）的同域无状态边缘网关解决跨域（CORS）与密钥透传问题，同时支持直连任何第三方 Anthropic 兼容端点。
2. **内部服务契约 (Internal TypeScript Service Contracts)**：用于组织前端模块之间的调用边界，遵循单一职责与依赖注入原则，定义高内聚、低耦合的强类型接口，杜绝任何 `any` 类型逃逸。

---

## 2. External & Edge Reverse Proxy APIs (Cloudflare Pages Functions)

针对 Anthropic 及部分 TTS 供应商对浏览器前端跨域请求（CORS）的拦截，TalkDrill 内置同域部署的 Cloudflare Pages Functions 作为轻量级无状态边缘管道。

### 2.1 基础网络配置与通用约定

- **Base URL 规范**：支持输入任意第三方 Anthropic 兼容端点（系统通过 `getAnthropicMessagesEndpoint()` 自动智能归一化路径），或直接使用同源相对路径 `/api/proxy/anthropic`。
- **通用响应头 (CORS Headers)**：
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, anthropic-version, x-target-endpoint`
- **无状态保障**：函数严禁缓存或持久化任何凭据与文本，纯粹负责 Request/Response Stream 双向透传。

---

### 2.2 接口详情: Anthropic 口语翻译代理

- **端点路径**：`POST /api/proxy/anthropic`
- **协议说明**：接收客户端组装好的 messages 负载，默认转发至 Anthropic 官方端点 `https://api.anthropic.com/v1/messages`；若传入 `x-target-endpoint` 则动态转发至指定的第三方 Anthropic 兼容服务端点。

#### 请求头 (Request Headers)
| 请求头键名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `Content-Type` | string | 是 | 固定为 `application/json` |
| `x-api-key` | string | 是 | 用户本地存储的 Anthropic 或第三方服务 API 密钥 |
| `anthropic-version` | string | 否 | 协议版本，默认为 `2023-06-01` |
| `x-target-endpoint` | string | 否 | 自定义第三方兼容目标端点，未设置时默认请求官方端点 |

#### 请求体 (Request Body)
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "system": "You are an expert native linguist specializing in Castilian Spanish spoken fluency. Translate the following English text into natural, idiomatic European Spanish as spoken in daily life in Spain. Do not use textbook or Latin American phrasing. Output ONLY the translated spoken foreign text without explanations.",
  "messages": [
    {
      "role": "user",
      "content": "I couldn't believe my eyes when I saw the final score of the match."
    }
  ]
}
```

#### 成功响应 (Success Response: 200 OK)
```json
{
  "id": "msg_01X9...abc",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "No daba crédito a lo que veía cuando vi el resultado final del partido."
    }
  ],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 58,
    "output_tokens": 24
  }
}
```

---

### 2.3 接口详情: 多厂商 TTS 语音合成代理 (下一代大版本预置特性)

> [!NOTE]
> 状态说明：该端点与协议契约已完备就绪，作为下个大版本在线 TTS 升级特性的预置边缘管道；当前版本主流程采用用户上传自备或第三方平台生成的示范音频文件。

- **端点路径**：`POST /api/proxy/tts`
- **协议说明**：通过客户端自定义请求头 `x-target-endpoint` 决定目标供应商地址，将流式请求与响应原样透传。

#### 请求头 (Request Headers)
| 请求头键名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| `Content-Type` | string | 是 | 固定为 `application/json` |
| `Authorization` | string | 否 | 对应供应商所需的认证 Bearer Token（如 OpenAI、ElevenLabs） |
| `x-api-key` | string | 否 | 针对使用 API Key 头的供应商（如 Minimax、ElevenLabs xi-api-key） |
| `x-target-endpoint` | string | 是 | 经过 URL 编码的目标服务端点完整 URL |

#### 请求体示例 (以 OpenAI TTS 为例)
```json
{
  "model": "tts-1",
  "input": "No daba crédito a lo que veía cuando vi el resultado final del partido.",
  "voice": "alloy",
  "response_format": "mp3",
  "speed": 1.0
}
```

#### 成功响应 (Success Response: 200 OK)
- **Content-Type**：`audio/mpeg`（或根据参数返回 `audio/wav`, `audio/aac`）
- **Transfer-Encoding**：`chunked`
- **响应体**：原始二进制音频流（客户端直接接收并包装为 `Blob`）。

---

## 3. External Provider API Protocols (BYOK Direct / Proxy Targets)

应用支持直接访问或通过代理访问以下标准接口协议：

### 3.1 Anthropic Messages Protocol
- **官方端点**：`https://api.anthropic.com/v1/messages`
- **认证方式**：Header `x-api-key: {apiKey}` 与 `anthropic-version: 2023-06-01`
- **返回格式**：JSON 或 Server-Sent Events (SSE)。

### 3.2 OpenAI Audio Speech Protocol
- **官方端点**：`https://api.openai.com/v1/audio/speech`
- **认证方式**：Header `Authorization: Bearer {apiKey}`
- **支持发音人**：`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **返回格式**：原生音频二进制流。

### 3.3 ElevenLabs Text-to-Speech Protocol
- **官方端点**：`https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **认证方式**：Header `xi-api-key: {apiKey}`
- **返回格式**：原生音频二进制流。

### 3.4 Minimax T2A Protocol
- **官方端点**：`https://api.minimax.chat/v1/t2a_v2`
- **认证方式**：Header `Authorization: Bearer {apiKey}`
- **返回格式**：JSON 包裹的音频 hex / base64 或直出二进制流。

---

## 4. Internal TypeScript Service Contracts (模块契约)

内部模块之间通过强类型接口进行通信，代码组织置于 `src/services/` 与 `src/types/`。所有方法严禁使用 `any`。

### 4.1 核心数据模型 (Data Models)

```typescript
export type LanguageMode = 'translate_needed' | 'direct_foreign';

export type DrillMilestone = 50 | 150 | 300 | 500;

export interface Article {
  id: string; // UUID v4
  title: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  mode: LanguageMode;
  targetCount: number; // 默认 500
  currentCount: number; // 当前已练习次数
  audioId?: string; // 关联的 AudioItem ID
  createdAt: number; // 毫秒时间戳
  updatedAt: number;
  lastPracticedAt?: number;
  isArchived: boolean;
}

export interface AudioItem {
  id: string; // UUID v4
  articleId: string;
  blob: Blob; // 原生二进制音频数据
  mimeType: string; // 例如 'audio/mpeg'
  fileName: string;
  fileSize: number; // 字节数
  duration: number; // 音频时长 (秒)
  sourceType: 'tts' | 'upload';
  createdAt: number;
}

export interface AppSettings {
  translation: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    model: string;
    customPrompt?: string;
  };
  tts: {
    provider: 'openai' | 'elevenlabs' | 'minimaxi' | 'custom';
    baseUrl: string;
    apiKey: string;
    modelOrVoiceId: string;
  };
  printOptions: {
    defaultTallyBoxes: 60 | 100;
  };
}
```

---

### 4.2 ICorpusService (语料管理服务)

```typescript
export interface CreateArticleInput {
  title: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  mode: LanguageMode;
  targetCount?: number;
}

export interface UpdateArticleInput {
  title?: string;
  targetText?: string;
  targetCount?: number;
  isArchived?: boolean;
}

export interface ICorpusService {
  createArticle(input: CreateArticleInput): Promise<Article>;
  getArticle(id: string): Promise<Article | null>;
  listArticles(includeArchived?: boolean): Promise<Article[]>;
  updateArticle(id: string, input: UpdateArticleInput): Promise<Article>;
  deleteArticle(id: string): Promise<void>;
  parseTextFile(file: File): Promise<string>;
}
```

---

### 4.3 ITranslationService (口语化翻译服务)

```typescript
export interface TranslateRequest {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  customPrompt?: string;
}

export interface TranslateResponse {
  translatedText: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ITranslationService {
  translate(request: TranslateRequest): Promise<TranslateResponse>;
  buildSpokenPrompt(targetLang: string, customPrompt?: string): string;
  testConnection(): Promise<boolean>;
}
```

---

### 4.4 IAudioService (音频资产管理服务)

```typescript
export interface SynthesizeAudioRequest {
  articleId: string;
  text: string;
  targetLang: string;
}

export interface UploadAudioRequest {
  articleId: string;
  file: File;
}

export interface IAudioService {
  synthesize(request: SynthesizeAudioRequest): Promise<AudioItem>;
  uploadLocalAudio(request: UploadAudioRequest): Promise<AudioItem>;
  getAudioByArticleId(articleId: string): Promise<AudioItem | null>;
  deleteAudio(id: string): Promise<void>;
  createAudioUrl(blob: Blob): string;
  revokeAudioUrl(url: string): void;
  exportAudioFile(audioItem: AudioItem): void;
}
```

---

### 4.5 IPlayerEngine (跟读音频播放引擎)

```typescript
export type PlaybackRate = 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

export interface LoopRegion {
  startSec: number;
  endSec: number;
  isActive: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: PlaybackRate;
  loopRegion: LoopRegion | null;
  isAudioUnlocked: boolean;
}

export interface IPlayerEngine {
  load(blob: Blob): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(timeSec: number): void;
  skip(deltaSec: number): void; // +2, -2, +5, -5
  setPlaybackRate(rate: PlaybackRate): void;
  setLoopRegion(startSec: number, endSec: number): void;
  clearLoopRegion(): void;
  unlockAudioContext(): Promise<boolean>;
  getState(): PlayerState;
  subscribe(listener: (state: PlayerState) => void): () => void;
  destroy(): void;
}
```

---

### 4.6 IDrillCounterService (打卡与正字统计服务)

```typescript
export interface ZhengStrokeState {
  fullZhengCount: number; // 完整“正”字个数 (每个 5 画)
  partialStrokes: number; // 当前未成字的笔画数 (0 至 4)
  totalCount: number;
}

export interface MilestoneResult {
  hasReached: boolean;
  milestone?: DrillMilestone;
  title?: string;
  description?: string;
}

export interface IDrillCounterService {
  increment(articleId: string): Promise<number>;
  undo(articleId: string): Promise<number>;
  manualSet(articleId: string, exactCount: number): Promise<number>;
  calculateZhengStrokes(count: number): ZhengStrokeState;
  checkMilestone(previousCount: number, currentCount: number): MilestoneResult;
}
```

---

### 4.7 IPrintExportService (排版打印与外部导出服务)

```typescript
export interface PrintOptions {
  tallyBoxes: 60 | 100;
}

export interface IPrintExportService {
  triggerPrint(article: Article, options: PrintOptions): void;
  generateMarkdown(article: Article, options: PrintOptions): string;
  copyRichTextToClipboard(article: Article, options: PrintOptions): Promise<boolean>;
}
```

---

### 4.8 ISettingsService (系统设置管理服务)

```typescript
export interface ISettingsService {
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  resetSettings(): Promise<AppSettings>;
  clearAllLocalData(): Promise<void>;
}
```

---

## 5. Error Handling & Status Matrix

### 5.1 外部网络与代理状态码映射 (HTTP Status Codes)

| 状态码 | 含义 | 触发场景 | 前端处理逻辑 |
|---|---|---|---|
| `200 OK` | 成功 | 翻译或 TTS 请求正常返回 | 消费响应流或解析 JSON，写入本地状态 |
| `400 Bad Request` | 请求参数错误 | 语言不支持、入参缺失 | 弹出表单校验错误提示，不扣除额度 |
| `401 Unauthorized` | 鉴权失败 | API Key 无效、过期或未配置 | 提示“API 凭据校验失败，请前往设置面板核验 Key” |
| `429 Too Many Requests` | 频次超限 / 额度耗尽 | 目标模型服务商触发 Rate Limit | 提示“请求过频或账户额度耗尽，请稍后重试” |
| `502 Bad Gateway` | 上游服务异常 | Cloudflare Worker 无法连接目标服务商 | 提示“代理服务无法接通目标服务商，请检查网络” |
| `504 Gateway Timeout` | 超时 | TTS 合成或 LLM 生成超时（超过 30s） | 中止当前请求并允许用户重试 |

### 5.2 客户端错误代码 (Client Error Codes)

```typescript
export enum AppErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  AUDIO_CONTEXT_LOCKED = 'AUDIO_CONTEXT_LOCKED',
  INVALID_COUNTER_VALUE = 'INVALID_COUNTER_VALUE',
  CONFIG_MISSING = 'CONFIG_MISSING',
}

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: unknown;
}
```
