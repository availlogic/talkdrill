# TalkDrill - Acceptance Criteria Specification

## 1. Overview & Definition of Done (DoD) Standards

本文档直接衍生自 [docs/PRD.md](file:///Users/victorxu/projects/talkdrill/docs/PRD.md) 与 [docs/Constraints.md](file:///Users/victorxu/projects/talkdrill/docs/Constraints.md)，定义 TalkDrill 各功能特性的确定性验收准则（Acceptance Conditions）与统一的完成准则（Definition of Done）。

### 1.1 全局完成准则 (Global Definition of Done)
任何功能特性必须同时满足以下条件方可判定为完成：
1. **测试驱动达标**：编写并跑通对应的单元测试与集成测试，核心领域模块代码行覆盖率严格 `>= 90%`，变异测试得分严格 `>= 85%`。
2. **端到端体验达标**：在 Playwright 跨浏览器（Desktop Chrome / WebKit Mobile）自动化测试中无任何断言失败。
3. **性能指标达标**：核心打卡交互更新延迟在 60fps 帧率（`<= 16ms`）内完成；音频加载 `<= 100ms`；生产包压缩体积 `<= 300KB`（Brotli）。
4. **静态分析零告警**：严格消除所有 TypeScript 类型报错与 ESLint 告警，严禁使用 `any` 类型逃逸与规则抑制注释。
5. **代码可维护性指标**：单个函数行数严格 `<= 30 行`，圈复杂度严格 `<= 10`。
6. **文档与设计一致**：实现逻辑必须与 [docs/User-Flows.md](file:///Users/victorxu/projects/talkdrill/docs/User-Flows.md) 及 [docs/Screen-Specs.md](file:///Users/victorxu/projects/talkdrill/docs/Screen-Specs.md) 保持 100% 契合。

---

## 2. Feature Acceptance Criteria

### AC-CORP: 语料录入与篇目管理 (Corpus Management)
- **PRD 溯源**: FR-1.1, FR-1.2, FR-1.3
- **Acceptance Conditions**:
  - [ ] 用户可直接在多行输入框粘贴多行文本，文本框自适应换行，无内容被裁剪。
  - [ ] 用户拖拽或选取纯文本文件时，`<= 2MB` 的 `.txt` 文件能被即刻解析并填入编辑器；`> 2MB` 的文件被立即拦截并弹出浅红提示，不发生内存溢出。
  - [ ] 切换为“模式 B（直接录入目标外语）”时，界面自动隐藏翻译选项与 Prompt 设置，直接进入目标文本与音频配置阶段。
  - [ ] 篇目列表卡片实时展示标题、目标语言、当前进度（如 `128 / 500`）及最后练习时间。
  - [ ] 用户可以重命名、归档或删除任意篇目；删除操作执行事务级级联清理，关联的音频 Blob 与打卡历史在 IndexedDB 中同步抹除。
- **Definition of Done**: 跑通单元用例 `TC-FT-CORP-001` 至 `TC-FT-CORP-006`，集成用例 `TC-IT-DB-002`，Playwright E2E 篇目创建流无阻碍。

---

### AC-TRAN: 场景化口语翻译引擎 (Colloquial Translation Engine)
- **PRD 溯源**: FR-2.1, FR-2.2, FR-2.3
- **Acceptance Conditions**:
  - [ ] 模式 A 下选择目标外语（如 Castilian Spanish）后，系统携带预置的口语化 System Prompt 调用 Anthropic messages 协议接口，输出符合本土人口语习惯的表达。
  - [ ] 翻译返回后，目标文本框保持可编辑状态，用户人工改写并保存后，本地保存改写后的定稿文本。
  - [ ] 用户可在高级设置中修改或完全覆盖 System Prompt。
  - [ ] 未填写 API Key 时点击翻译，不发起网络请求，就地弹出凭据配置抽屉，填写保存后无缝继续当前翻译。
  - [ ] 遇到网络断开或 401 凭据错误时，显示友好提示，不破坏用户已输入的源文本。
- **Definition of Done**: 跑通单元测试 Prompt 组装断言，通过与边缘代理 Mock 的集成测试 `TC-IT-PROXY-001`，E2E 场景 `E2E-SCN-001` 翻译流通过。

---

### AC-AUD: 音频获取与管理模块 (Audio Engine)
- **PRD 溯源**: FR-3.1, FR-3.2, FR-3.3
- **Acceptance Conditions**:
  - [ ] 用户可通过第三方平台根据目标外语生成示范音频或上传自有录制音频；支持 `.mp3`、`.wav`、`.m4a` 格式；`> 50MB` 文件被前端直接拒绝，`<= 50MB` 文件正常存入并播放。
  - [ ] 在线 TTS 一键合成作为规划中的下次大版本升级特性，当前版本界面默认关闭该功能。
  - [ ] 音频存储严禁采用 Base64 编码，必须以原生二进制 `Blob` 存入 IndexedDB。
  - [ ] 界面显著提供“下载示范音频”按钮，允许用户将当前绑定的音频文件下载至本地磁盘备份。
  - [ ] 脱网断网环境下，已保存的音频能正常从 IndexedDB 提取并在 `<= 100ms` 内装载至播放器正常播放。
- **Definition of Done**: 跑通集成测试 `TC-IT-DB-001` 与 `TC-IT-AUDIO-WEB-001`，无内存泄漏，E2E 离线音频验证通过。

---

### AC-DRILL: 核心跟读播放器与击穿打卡 (Drill Workspace)
- **PRD 溯源**: FR-4.1, FR-4.2, FR-4.3
- **Acceptance Conditions**:
  - [ ] 播放器提供 0.5x, 0.75x, 1.0x, 1.25x, 1.5x 变调不变速（Pitch-preserving）倍速调节，无音调变异。
  - [ ] 圈选 A-B 区间后，音频仅在 A 点与 B 点之间无缝循环，微秒级精度定位，无爆音卡顿。
  - [ ] Desktop 端按物理键盘空格键 `Space` 打卡计数 +1，按 `Z` 键撤销 -1（最低至 0 不报错）。
  - [ ] Mobile 视口底部常驻大尺寸胶囊打卡按钮（高度严格 `>= 58px`），单手轻触即可盲操打卡。
  - [ ] 打卡到界面阿拉伯数字递增与“正”字网格笔画刷新的端到端延迟严格 `<= 16ms`（稳定 60fps）。
  - [ ] “正”字网格按汉字标准笔顺（横、竖、短横、短竖、长底横）逐笔矢量绘制，每 5 遍完成一个方整的正字。
  - [ ] 当累计计数达到 50、150、300、500 时，界面展示对应的心理里程碑成就反馈。
  - [ ] 点击计数字符可弹出数字微调弹窗，支持用户输入合法正整数（`0` 至 `99999`）手动修正当前完成数。
- **Definition of Done**: 跑通纯函数正字计算单测（100% 覆盖率），通过 16ms 极速按键防抖集成测试 `TC-IT-DRILL-DB-001`，E2E 场景 `E2E-SCN-001` 与 `E2E-SCN-002` 验证通过。

---

### AC-PRINT: 专属纸质排版与多端导出 (Print & Export)
- **PRD 溯源**: FR-5.1, FR-5.2, FR-5.3
- **Acceptance Conditions**:
  - [ ] 触发打印预览（`Cmd+P` 或点击打印按钮）时，`@media print` 样式自动隐藏所有 Web 导航、播放器控件、侧边栏及打卡按钮。
  - [ ] 打印正文采用 `18pt` 字号与宽松的 `2.2` 行高，留足纸面铅笔手写国际音标（IPA）与笔记空间。
  - [ ] 用户可在打印面板自主选择生成 60 个方格（对应 300 遍）或 100 个方格（对应 500 遍）的正字手写网格表；网格应用 `break-inside: avoid` 防止跨页切断。
  - [ ] 点击“导出 Markdown”可下载包含正文与方格表格的标准 `.md` 文件。
  - [ ] 点击“复制富文本”后在 Word 或 Google Docs 粘贴，能完整保持大字号排版与表格结构。
- **Definition of Done**: 跑通打印测试用例 `TC-FT-PRN-001` 至 `TC-FT-PRN-004`，Playwright 打印媒体样式断言全绿。

---

### AC-SET: 系统设置与服务解耦配置 (Decoupled Settings)
- **PRD 溯源**: FR-6.1, FR-6.2, FR-6.3
- **Acceptance Conditions**:
  - [ ] 翻译服务配置独立拥有 Base URL、API Key 与模型参数设置并支持同源代理；当前大版本默认关闭 TTS 设置面板。
  - [ ] 所有 API Key 仅保存在浏览器客户端本地存储中，不上传至任何集中式云端数据库。
  - [ ] 提供默认打印方格偏好配置与深浅高对比度主题切换。
  - [ ] 在“危险区域”提供“清空全部本地数据”功能，经过双重安全确认（输入“DELETE”）后原子抹除整个 IndexedDB 数据库并重置应用。
- **Definition of Done**: 跑通设置隔离单测与清空清算集成测试，E2E 数据抹除场景 `E2E-SCN-004` 跑通。

---

### AC-NFR: 非功能性指标与工程质量门禁
- **PRD 溯源**: NFR-1 至 NFR-5, Constraints 1 至 11
- **Acceptance Conditions**:
  - [ ] 生产打包产物经过 Brotli 压缩后，核心资源体积严格 `<= 300KB`。
  - [ ] 首次内容绘制（FCP）在普通宽带与 4G 下 `<= 1.2s`。
  - [ ] IndexedDB 本地音频 Blob 加载至 Web Audio 播放上下文的初始化耗时 `<= 100ms`。
  - [ ] 全文严禁使用破折号 em dash，统一使用普通短横线 "-"。
  - [ ] 静态分析实行零告警政策：消除所有 TypeScript、ESLint 警告，严禁使用 `any` 类型逃逸。
  - [ ] 单元测试行覆盖率严格 `>= 90%`，变异测试得分严格 `>= 85%`。
  - [ ] 无任何第三方遥测追踪脚本（Google Analytics 等），无任何集中式后端用户账密体系。
- **Definition of Done**: CI 流程中静态扫描、覆盖率报告、变异测试报告与 Lighthouse 性能审计均全绿通过。
