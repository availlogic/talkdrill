# TalkDrill - 高强度外语影子跟读与过度学习特训空间

TalkDrill 是一款纯前端、离线优先、去中心化的外语影子跟读（Shadowing）与肌肉记忆过度学习（Overlearning，300 至 500 遍）Web 特训应用。

---

## 1. 项目背景 (Background)

传统语言学习软件通常强调词汇量或泛读理解，却忽视了口语流利度的本质：**发音器官肌肉记忆的过度学习**。
成人掌握第二语言地道口语的核心瓶颈在于母语口型肌肉惯性。通过对同一句精炼地道的真实口语语料进行 300 至 500 遍的极限盲操重复，学习者能打破母语肌肉记忆，达成不假思索脱口而出的境界。

TalkDrill 专为高频肌肉记忆特训而生：
- 采用中华传统正字计数（5 划一字）与 60/100 格字帖打卡体系。
- 拒绝中心化账号与数据泄露，所有文章、打卡记录与音频全生命周期存放在本地 IndexedDB。
- 纸电双轨：屏幕盲操与高对比度 18pt 纸质字帖打印并重。

---

## 2. 架构概览 (Architecture Overview)

```
[UI Views]
  ├── LibraryOverview (语料库与容量看板 / Active 与 Archived 独立视图 / 归档与编辑入口)
  ├── CorpusStudio (AI 口语翻译默认 / 直接录入 / 篇目与音频可编辑 / 自有与第三方生成音频导入)
  ├── DrillWorkspace (跟读特训空间 / 正字矩阵 / 触控大胶囊 / 极简专注模式 / 直接编辑与归档)
  ├── PrintExportModal (60/100 格纸质打卡表与 Markdown 导出)
  └── SettingsHub (Anthropic BYOK 凭据与同源代理 / 主题模式 / 危险区原子清除)
         │
[Domain Services]
  ├── corpusService (语料篇目生命周期管理，级联删除音频与打卡日志)
  ├── drillCounterService (微秒级内存计数 + 150ms 防抖批处理持久化)
  ├── playerEngine (原生 HTMLAudio 引擎，音调保持变速 0.5x-1.5x，A-B 精确复读)
  ├── translationService (Anthropic BYOK 地道口语翻译服务)
  ├── dictionaryService (词汇与短语释义查询，离线 IndexedDB 缓存与 Anthropic BYOK 双轨支持)
  ├── audioService (本地与外部生成音频 <= 50MB 上传校验 / 原生 Blob 持久化 / 文件导出)
  └── printExportService (纯函数 60/100 格打卡表与 Markdown 渲染)
         │
[Core Utils & Storage]
  ├── textAlignment (纯函数双语段落与单行对话智能对齐匹配)
  ├── speechHelper (浏览器原生 Web Speech API 语音合成与标准发音)
  ├── zhengMath (纯函数正字笔画计算与阶段里程碑判定：50/150/300/500 遍)
  ├── audioContextManager (用户手势即时解锁浏览器 AudioContext)
  ├── storageQuota (StorageManager API 存储配额与持久化检查)
  └── Dexie IndexedDB (talkdrill_db: articles, audios, drillLogs, settings, wordLookups)
```

---

## 3. 设计原则 (Design Principles)

1. **去中心化与隐私第一 (Privacy-First & BYOK)**：
   - 无注册、无后端登录。用户数据完全驻留在浏览器 IndexedDB 中。
   - 外部 AI 翻译仅在配置用户自备 API Key (Bring Your Own Key) 时按需发起调用；音频采用用户外部生成或自有录音上传模式（应用内在线 TTS 合成规划于下一代版本引入）。
2. **极速零阻塞响应 (Zero-Latency Tally)**：
   - 打卡计数（Capsule 轻触或空格键）在内存中同步完成，提供 0ms 即时触觉与听觉反馈。
   - 采用 150ms 防抖合并策略写入 IndexedDB，支撑每分钟 60 次以上的极限连击。
3. **离线优先 (100% Offline Capable)**：
   - 依托 Service Worker 和 PWA 规范，静态外壳与已存音频即便在完全断网脱机状态下也能流畅无阻地练习。
4. **纸电双轨与版式保真 (Digital & Physical Dual-Track with Whitespace Fidelity)**：
   - 提供 16pt-18pt 字号、2.5 倍行距（留足整行空白供手写标注）、15.5mm 规范页边距、居中标题与一行 20 个、8mm 细虚线方格水平均匀分布打卡表的专属纯净纸质排版样式，随时导出打印 60 格（300次，3行）或 100 格（500次，5行）打卡纸。
   - 屏幕跟读与纸质打印均通过 `whitespace-pre-wrap break-words` 严格保持原文对话换行与空行结构，拒绝长段挤压；屏幕端外语正文采用 `select-text cursor-text` 规范支持光标自由划词选择。
5. **全英文沉浸交互界面 (Full English Interface)**：
   - 整个应用的前端用户交互界面（UI/UX）、按钮、提示标签与无障碍语义标签均采用标准专业英文（English UI），营造沉浸式外语习得环境。
6. **无障碍与 WCAG AAA 顶级对比度 (WCAG AAA High Contrast & Dual Themes)**：
   - 完整支持 Light（明亮纸质感）、Dark（深沉石墨黑）与 System（系统自适应）三大主题模式。
   - 消除低对比度与刺眼失衡缺陷，正文标题对比度高达 16.5:1 (Light) 与 19.8:1 (Dark)，存储徽章等组件对比度 > 9:1，完全超越 WCAG AAA 顶级标准。
7. **标准 BCP-47 规范区域语言标识 (Standard BCP-47 Canonical Locales)**：
   - 篇目卡片与特训工作区标签严格展示标准 BCP-47 规范（如 `es-ES`, `en-US`, `ja-JP` 等小写语言代码与大写地区代码组合），保持国际标准语义严谨性与直观认知。
8. **智能划词、快捷键触发与释义缓存生命周期 (Smart Word Lookup, Hotkey Trigger & Cache TTL)**：
   - 特训空间内划选外语单词或短语，若本地存在缓存直接毫秒级秒开（0 token 消耗与 0 延迟）；若无缓存则弹出带有快捷键提示（默认 Option / Alt，可在设置中配置）的提示浮窗，用户按下快捷键或点击按钮时按需调用 AI 查询，有效避免频繁调用。
   - 释义本地缓存支持生命周期管理（默认 2 天，可在设置中自由调整 1 天、2 天、7 天、30 天或永久，或手动一键清空），过期记录在启动时自动清除。
   - 集成浏览器原生 Web Speech API 扬声器发音朗读，可在设置页自定义挑选浏览器所支持的 Voice 并在线试听（默认自动按目标语言自适应），并与特训节奏智能联动（跟读打卡时自动收起浮窗避免遮挡）。

---


## 4. 构建与环境配置 (Build Instructions)

本项目使用 Node.js (>= 18) 与 Vite 进行构建。

### 依赖安装
```bash
npm install
```

### 本地开发服务器启动
```bash
npm run dev
```
开发服务器默认运行在 `http://localhost:5173`。

### 生产版本编译
```bash
npm run build
```
编译产物输出至 `dist/` 目录，单包体积严格优化在 130 kB gzipped 以内。

### 本地预览构建产物
```bash
npm run preview
```

---

## 5. 测试指引 (Testing Instructions)

本项目遵循严苛的测试驱动开发（TDD）规范，覆盖单元测试、变异测试与 Playwright 端到端浏览器测试。

### 运行单元测试
```bash
npm test
```
或带覆盖率运行：
```bash
npm run test:coverage
```
覆盖率门禁指标：
- 语句覆盖率 (Statements) >= 90%
- 行覆盖率 (Lines) >= 90%
- 分支覆盖率 (Branches) >= 85%
- 函数覆盖率 (Functions) >= 90%

### 运行 Stryker 变异测试 (Mutation Testing)
```bash
npm run test:mutation
```
变异分数门禁指标：Score >= 85% (当前实测分数：87.18%)。

### 运行 Playwright E2E 浏览器自动化测试
```bash
npx playwright test
```
Playwright E2E 涵盖：
- Elena 桌面端旅程 (1440x900 Chromium 视口)：录入语料、跟读盲操、正字更新、纸质导出、专注模式。
- Kenji 移动端旅程 (390x844 触控视口)：大胶囊触控、高度合规 (>= 58px)、手动校准跟读遍数。
- 100% 离线脱机测试：断网打卡、数据一致性验证。
- 隐私危险区清空：原子抹除所有 IndexedDB 数据并复位。

---

## 6. 代码质量与规范检查 (Quality Gates)

### 代码规范与静态分析检查
```bash
npm run lint
```
执行零告警 (0 warnings) ESLint 检查。

### TypeScript 编译检查
```bash
npx tsc --noEmit
```
执行严格模式 (Strict & exactOptionalPropertyTypes) 编译检查。

---

## 7. 部署说明 (Deployment Instructions)

### Cloudflare Pages 一体化部署 (推荐生产方案)
TalkDrill 基于纯客户端去中心化架构，并内置 Cloudflare Pages Functions 边缘网关（位于 `functions/api/proxy/`），实现“前端页面 + 边缘跨域代理”一体化一键部署：

```bash
# 1. 本地安装依赖并构建生产静态包
npm run build

# 2. 一键发布至 Cloudflare Pages (自动部署 dist 静态资源与 functions 边缘函数)
npx wrangler pages deploy dist --project-name talkdrill
```

或者在 Cloudflare Dashboard 中连接 GitHub 仓库，设置构建命令为 `npm run build`，输出目录为 `dist`，提交代码即可自动化部署全球 Anycast 边缘网络。

### LLM 兼容服务与同源代理配置说明
系统通过 `getAnthropicMessagesEndpoint()` 与 `TranslationService` 自动识别并归一化各类 Anthropic 兼容端点：
- **官方 Anthropic**：直接输入 `https://api.anthropic.com/v1`（建议勾选同源代理）
- **MiniMax 等兼容服务**：输入完整服务路径如 `https://api.minimax.cn/anthropic/v1/messages` 或 `https://api.minimaxi.com/anthropic/v1/messages`
- **OpenRouter 等网关**：支持输入 `https://openrouter.ai/api/v1`
- **Cloudflare Pages 同源代理 (推荐)**：在设置页中勾选 "Route through Cloudflare Same-Origin Proxy"，请求将通过同源 `/api/proxy/anthropic` 由边缘节点向目标大模型发起服务端请求（对齐 relocate_wise 方案），彻底消除浏览器跨域 CORS 预检报错（如 MiniMax 对 `anthropic-version` 请求头的拦截限制）。亦可直接将 Base URL 配置为 `/api/proxy/anthropic`。

---

## 8. 使用示例 (Usage Examples)

### 桌面端键盘盲操流程
1. 进入练习界面后，按下键盘 `Space`（空格键）或点击 "Drill +1" 按钮进行快速跟读打卡（+1）。
2. 每打卡 1 次，正字画数实时更新。
3. 每满 5 划自动结成 1 个完整“正”字。
4. 如需回退误触，按下键盘 `Z` 键或点击 "Undo last count" 执行撤销（-1）。
5. **音频播放与暂停状态机**：按下键盘 `P` 键开始播放音频或将参考音频快退至当前 A-B 复读起点重新朗读；在音频播放中按下键盘 `S` 键可即时暂停音频（未播放时按 `S` 键无效）；暂停后再次按下 `P` 键即可在断点处继续平滑播放（系统自动忽略带 Cmd/Ctrl/Alt 的浏览器组合键，避免拦截原生刷新）。若篇目附带音频，在常规非 Focus 模式下播放控制栏置于语料文本框与正字打卡板之间，方便对照朗读并查看波形；设定 A 点后进度条显示高亮指示点与参考时间戳，在拖拽寻找 B 点或连续播放过程中持续驻留，并支持点击 'X' 随时撤销；在 Focus 模式下置于底部大胶囊上方。
6. **沉浸专注模式快捷切换**：按下键盘 `F` 键可随时一键切换全黑沉浸专注模式（Focus Mode）与常规双语对照模式，亦可在专注模式下按 `Esc` 快捷退出。
7. **一键快捷键速查面板 (Shortcuts Cheatsheet)**：按下键盘 `?` 键（或点击顶部操作栏的 "Shortcuts" 键盘图标按钮）即可一键唤起居中快捷键速查弹窗，分类查看完整手势与按键映射；按 `Esc` 键或点击遮罩即可关闭。在桌面端页面底部提供优雅的微提示（"Press ? for keyboard shortcuts"），在平板端保留头部图标以支持外接实体键盘（如 iPad Magic Keyboard），在纯触屏手机端自动隐藏以保持极简与无干扰。
8. 划词查词：屏幕端外语正文支持自由划词，按下配置的热键（默认 Option / Alt）可进行 AI 智能词典释义查询；按 `Esc` 键可关闭查词浮层。点击 "Print Sheet" 调出 60/100 格纸质打卡表与 Markdown 导出。

### 移动端单手操作流程
1. 底部常驻高度大于 58px 的触控大胶囊按钮（"Drill +1" 与 "Undo last count"）。
2. 拇指轻触右侧大按钮完成 +1 打卡，轻触左侧小按钮完成 -1 撤销。
3. 点击顶部计数标签（"Adjust Repetition Count"）可弹出数字微调弹窗，直接手动校准打卡数值。

### 语料编辑与归档操作流程
1. **编辑已有语料 (Edit Drill)**：
   - 在篇目卡片点击编辑按钮（铅笔图标）或在 DrillWorkspace 顶部点击 "Edit"，即可调出编辑模式。
   - 用户可随时修改源语言草稿、重新发起 AI 口语翻译、直接微调外语目标正文、或者替换/移除参考音频。
   - 保存时保留原有的打卡历史（`currentCount` 与 `drillLogs`），避免由于细微拼写或表述调整而从零重新建立篇目。
2. **归档与还原 (Archive & Restore)**：
   - 在篇目卡片或 DrillWorkspace 顶部点击 "Archive" 按钮，可将已完成或暂停练习的篇目移至 "Archived" 标签页。
   - "Archived" 标签页仅展示已归档篇目；当归档列表为空时呈现专属空状态，且不展示新建入口（新建篇目统一进入活跃区域）。点击卡片或工作台上的 "Restore" 按钮，可随时一键将篇目移回 "Active" 继续练习。
   - 点击卡片上的删除按钮（垃圾桶图标）执行永久硬删除，并级联清除所有绑定的音频与打卡历史。
