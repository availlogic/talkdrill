# TalkDrill - Functional Test Cases Specification

## 1. Traceability & Overview

本文档依据 [docs/PRD.md](file:///Users/victorxu/projects/talkdrill/docs/PRD.md)、[docs/Screen-Specs.md](file:///Users/victorxu/projects/talkdrill/docs/Screen-Specs.md) 与 [docs/User-Flows.md](file:///Users/victorxu/projects/talkdrill/docs/User-Flows.md) 编制，为各功能模块提供确定性、可执行的端到端功能验证用例。

---

## 2. Feature: 语料录入与篇目管理 (Corpus Management)

### TC-FT-CORP-001: 纯文本多行粘贴与自动分行
- **Feature Name**: 语料录入与管理
- **Preconditions**: 用户进入 Screen 2: Corpus Studio。
- **Steps**:
  1. 在“源文本”多行输入框内粘贴包含 5 行英文日常对话的文本（约 500 字符）。
  2. 观察文本框高度自适应与字数统计更新。
- **Expected Result**: 文本完整保留换行与标点，无截断或水平滚动条；字数统计显示实际字符数。
- **Priority**: High

### TC-FT-CORP-002: 拖拽导入合法 .txt 纯文本文件 (<= 2MB)
- **Feature Name**: 语料录入与管理
- **Preconditions**: 准备大小为 150KB 的 UTF-8 编码 `.txt` 文本文件。
- **Steps**:
  1. 将文件拖拽至源文本录入区域。
  2. 松开鼠标。
- **Expected Result**: 拖拽悬停时边框呈现蓝色高亮虚线；松开后自动提取文本内容填入输入框，提示“文本导入成功”。
- **Priority**: High

### TC-FT-CORP-003: 拦截超大文本文件 (> 2MB)
- **Feature Name**: 语料录入与管理
- **Preconditions**: 准备大小为 2.5MB 的纯文本文件。
- **Steps**:
  1. 尝试拖拽或通过文件选择器上传该文件。
- **Expected Result**: 浏览器拦截文件读取，不将内容填入文本框；弹出浅红警告 Toast：“文本文件不能超过 2MB”。
- **Priority**: Medium

### TC-FT-CORP-004: 语言模式 A 与模式 B 切换
- **Feature Name**: 语料录入与管理
- **Preconditions**: 处于 Screen 2: Corpus Studio。
- **Steps**:
  1. 默认处于“模式 A（需口语翻译）”，检查“目标语种下拉框”和“生成翻译按钮”处于可见状态。
  2. 点击切换为“模式 B（直接录入外语）”。
- **Expected Result**: 模式 A 专属的翻译配置与按钮平滑隐藏；“目标外语文本框”变为首要输入焦点，界面提示直接进入音频准备阶段。
- **Priority**: High

### TC-FT-CORP-005: 篇目库空状态与卡片流展示 (Screen 1)
- **Feature Name**: 语料录入与管理
- **Preconditions**: 首次启动或刚刚执行数据清空，本地数据库无篇目。
- **Steps**:
  1. 访问首页（Screen 1: Library Overview）。
  2. 录入一篇西班牙语练习篇目并保存。
  3. 再次返回首页。
- **Expected Result**: 步骤 1 呈现极简空状态插画与“新建第一篇”按钮；步骤 3 呈现 1 张篇目卡片，显示标题、语种标签 `es-ES`、进度 `0 / 500` 与创建时间。
- **Priority**: Medium

### TC-FT-CORP-006: 篇目归档与恢复切换 (Archive & Restore) 及级联删除
- **Feature Name**: 语料录入与管理
- **Preconditions**: 篇目库中存在 1 篇已绑定音频且已有 120 次打卡记录的篇目。
- **Steps**:
  1. 在 Active 列表点击卡片操作组中的归档按钮（Archive）。
  2. 观察 Active 列表，该篇目被即时移出。
  3. 切换至 "Archived" 标签页，验证该篇目仅在已归档列表显示。
  4. 点击卡片上的恢复按钮（Restore）。
  5. 切换回 "Active" 标签页，篇目重新显现。
  6. 点击删除按钮并在弹出的二次确认框中确认。
- **Expected Result**: 归档后篇目仅在 Archived 标签页呈现；恢复后重新归入 Active；确认删除后，篇目及关联的音频 Blob 与打卡历史在 IndexedDB 中同步被彻底清除。
- **Priority**: High

### TC-FT-CORP-007: 篇目二次编辑 (Edit Drill) 保持打卡历史
- **Feature Name**: 语料录入与管理
- **Preconditions**: 篇目库中存在 1 篇已有 142 次打卡记录的篇目。
- **Steps**:
  1. 在篇目卡片点击编辑按钮（或在 DrillWorkspace 顶部点击 "Edit"）。
  2. 进入 Corpus Studio 编辑模式，验证标题显示 "Edit Drill"，表单自动加载原有标题、原文、译文与音频。
  3. 修改原文草稿并重新点击翻译，或直接微调译文文本，并替换或移除音频。
  4. 点击 "Save Changes"。
- **Expected Result**: 篇目属性与音频成功更新，同时已有打卡次数（142 次）与打卡日志记录完全保留，不被重置清空。
- **Priority**: Critical

---

## 3. Feature: 场景化口语翻译引擎 (Colloquial Translation)

### TC-FT-TRAN-001: 模式 A 默认口语 Prompt 注入与翻译流
- **Feature Name**: 场景化口语翻译
- **Preconditions**: 系统已配置有效的 Anthropic API Key。输入英文段落：“Could we have the bill, please? We're in a hurry.”，选择目标语为 Castilian Spanish。
- **Steps**:
  1. 点击“⚡ 生成地道口语翻译”。
- **Expected Result**: 按钮进入加载禁用态；目标外语框呈现流式打字效果；生成符合卡斯蒂利亚本土习惯的口语表达（如“¿Nos cobras, por favor? Que tenemos prisa.”），而非生硬字面直译。
- **Priority**: Critical

### TC-FT-TRAN-002: 翻译产物二次人工微调编辑
- **Feature Name**: 场景化口语翻译
- **Preconditions**: 步骤 TC-FT-TRAN-001 翻译完成，目标文本框填充有译文。
- **Steps**:
  1. 用户将光标移至目标外语框内。
  2. 将末尾词句手动修改为“Que tenemos un poco de prisa”。
  3. 点击“完成并保存”。
- **Expected Result**: 输入框支持自由输入、复制、粘贴与撤销；最终持久化至本地数据库的内容为用户人工润色后的定稿文本。
- **Priority**: High

### TC-FT-TRAN-003: 缺失 API Key 时的就地拦截与引导向导
- **Feature Name**: 场景化口语翻译
- **Preconditions**: 清空本地设置中的所有翻译配置（未填 API Key）。
- **Steps**:
  1. 在录入工作室中点击“生成地道口语翻译”。
- **Expected Result**: 不向网络发起无效请求；就地弹出凭据配置抽屉，提示“请先输入您的 Anthropic API Key 或代理服务”，提供输入框与保存按钮；保存后自动恢复当前翻译流程。
- **Priority**: High

### TC-FT-TRAN-004: 上游服务异常处理 (401 / 429 / 502)
- **Feature Name**: 场景化口语翻译
- **Preconditions**: 配置错误的 API Key。
- **Steps**:
  1. 点击发起翻译。
- **Expected Result**: 捕获 401 响应；文本框上方弹出浅红警告：“API 鉴权失败，请检查 Key 是否有效”；界面保留源文本内容，用户无需重新输入。
- **Priority**: Medium

---

## 4. Feature: 音频获取与管理 (Audio Engine)

### TC-FT-AUD-001: 外部平台生成示范音频上传与原生二进制 Blob 存入
- **Feature Name**: 音频获取与管理
- **Preconditions**: 用户在第三方语音平台（如 ElevenLabs、OpenAI）根据目标外语生成示范音频，并准备上传。
- **Steps**:
  1. 在语料录入页点击“Upload Reference Audio (.mp3, .wav)”，选择外部生成的示范音频文件。
  2. 上传完毕后，观察界面状态。
- **Expected Result**: 客户端接收文件并组装为原生 `Blob`（`audio/mpeg` 或对应格式）；持久化写入 IndexedDB；音频就绪徽标点亮并显示文件大小；支持在跟读工作台流畅播放。
- **Priority**: Critical

### TC-FT-AUD-002: 本地自有音频上传与体积限制 (<= 50MB)
- **Feature Name**: 音频获取与管理
- **Preconditions**: 准备一段 12MB 的 `.mp3` 文件与一段 55MB 的大音频文件。
- **Steps**:
  1. 尝试上传 55MB 的音频文件。
  2. 尝试上传 12MB 的 `.mp3` 文件。
- **Expected Result**: 55MB 文件被前端直接拒绝，弹出 Toast：“音频文件不能超过 50MB”；12MB 文件正常装载并存入 IndexedDB。
- **Priority**: High

### TC-FT-AUD-003: 音频本地下载导出 (防二次付费保护)
- **Feature Name**: 音频获取与管理
- **Preconditions**: 当前篇目已绑定成功生成的 TTS 音频。
- **Steps**:
  1. 点击“⬇️ 下载示范音频”。
- **Expected Result**: 浏览器弹出文件保存对话框，下载文件名为 `{篇目标题}-audio.mp3`，字节大小与本地 Blob 完全一致，可在本地播放器直接播放。
- **Priority**: High

### TC-FT-AUD-004: 脱网离线加载与播放能力
- **Feature Name**: 音频获取与管理
- **Preconditions**: 本地已有绑定音频的篇目；将浏览器切换为 Offline（断网）模式。
- **Steps**:
  1. 刷新页面并打开该篇目进入 Drill Workspace。
  2. 点击播放按钮。
- **Expected Result**: 音频从 IndexedDB 毫秒级提取（<= 100ms），正常初始化 Web Audio 上下文并顺畅发声播放，无网络报错。
- **Priority**: Critical

### TC-FT-AUD-005: 离线或异常下的纯文本无音频降级练习
- **Feature Name**: 音频获取与管理
- **Preconditions**: 处于无网络环境，且未上传本地音频。
- **Steps**:
  1. 勾选“暂不绑定音频，进入无音频朗读打卡”。
  2. 保存进入工作台。
- **Expected Result**: 工作台正常进入，播放器收缩为“静音跟读模式”；打卡按键、正字网格与数字计数完全保持可用。
- **Priority**: Medium

---

## 5. Feature: 跟读播放器与交互控制 (Player Engine)

### TC-FT-PLY-001: 变调不变速（Pitch-preserving）倍速切换
- **Feature Name**: 跟读播放器
- **Preconditions**: 篇目已装载音频，处于 Drill Workspace。
- **Steps**:
  1. 播放音频。
  2. 依次点击切换倍速：`0.5x` -> `0.75x` -> `1.0x` -> `1.25x` -> `1.5x`（或按快捷键 `[` 与 `]`）。
- **Expected Result**: 音频播放速率平滑变化，音频音调（Pitch）保持正常原声水平，无变调怪叫（男声变女声或反之）；当前激活倍速药丸高亮显示。
- **Priority**: High

### TC-FT-PLY-002: 高精度 A-B 段落循环播放
- **Feature Name**: 跟读播放器
- **Preconditions**: 音频总长 5.0 秒。
- **Steps**:
  1. 在波形进度条 1.2 秒处设置标记点 A，在 3.1 秒处设置标记点 B。
  2. 启用 A-B 循环。
  3. 观察播放头游走。
- **Expected Result**: 播放头到达 3.1 秒时瞬时平滑跳回 1.2 秒继续播放，仅在 1.2s - 3.1s 区间内循环往复，无爆音无卡顿；进度条高亮显示 A-B 选中区间。
- **Priority**: Critical

### TC-FT-PLY-003: 移动端用户手势激活 AudioContext (User Gesture Unlock)
- **Feature Name**: 跟读播放器
- **Preconditions**: 在 iOS Safari 或移动端模拟器无操作初次载入页面。
- **Steps**:
  1. 用户产生页面首次触控（轻触屏幕任意区域或点击打卡胶囊）。
- **Expected Result**: 触控事件同步触发 `AudioContext.resume()`；内部状态从 `suspended` 转为 `running`，后续音频能连贯自如播放。
- **Priority**: High

### TC-FT-PLY-004: 微步快退快进与重播快捷键
- **Feature Name**: 跟读播放器
- **Preconditions**: 音频正在播放，当前时间 3.0s。
- **Steps**:
  1. 点击“-2s”按钮。
  2. 点击“+2s”按钮。
  3. 按下键盘 `R` 键。
- **Expected Result**: 点击 -2s 后时间跳转到 1.0s；点击 +2s 跳转到 3.0s；按下 `R` 键播放头立即归零重头开始播放。
- **Priority**: Medium

---

## 6. Feature: 低阻力打卡与正字渲染 (Drill Counter & Zheng Matrix)

### TC-FT-CNT-001: 桌面 Space 键盲操打卡与 16ms 瞬时响应
- **Feature Name**: 低阻力打卡与正字渲染
- **Preconditions**: 处于 Screen 3: Drill Workspace，当前计数为 `12`（对应 2 个完整正字 + 2 画“丄”）。
- **Steps**:
  1. 按下物理键盘空格键 `Space`。
- **Expected Result**: 计数瞬间变为 `13`（`13 / 500`）；正字网格第 3 个字补上第 3 画变为“上”；视觉渲染在 1 帧（<= 16ms）内完成，无任何肉眼可感延迟。
- **Priority**: Critical

### TC-FT-CNT-002: 移动端底部超大胶囊单手盲按打卡
- **Feature Name**: 低阻力打卡与正字渲染
- **Preconditions**: 移动端视口（屏幕宽度 375px），核心朗读工作台。
- **Steps**:
  1. 单手拇指快速轻触底部高度 58px 的常驻胶囊按钮“+1 朗读完毕”。
- **Expected Result**: 胶囊呈现轻微微缩物理反馈（active: scale 0.96）；计数递增 +1。
- **Priority**: Critical

### TC-FT-CNT-003: 撤销机制与 0 下限保护 (快捷键 Z)
- **Feature Name**: 低阻力打卡与正字渲染
- **Preconditions**: 当前计数为 `1`。
- **Steps**:
  1. 按下快捷键 `Z`（或点击撤销按钮）。
  2. 计数降为 `0`。
  3. 再次按下快捷键 `Z`。
- **Expected Result**: 步骤 1 计数递减为 `0`，第一笔被擦除；步骤 3 计数保持为 `0`，不出现负数，不报错。
- **Priority**: High

### TC-FT-CNT-004: 手动微调模态框与区间校验 [0, 99999]
- **Feature Name**: 低阻力打卡与正字渲染
- **Preconditions**: 当前计数为 `45`。
- **Steps**:
  1. 点击计数字符 `45 / 500`。
  2. 弹出数字微调弹窗，输入 `300` 并点击确认。
  3. 再次打开弹窗，输入 `-5` 或非数字内容。
- **Expected Result**: 输入 300 确认后，主看板瞬时重组为 60 个完整“正”字网格，显示 `300 / 500`；输入非法值时确定按钮禁用或提示“请输入 0 至 99999 之间的整数”。
- **Priority**: High

### TC-FT-CNT-005: 四大心理里程碑激励触发
- **Feature Name**: 低阻力打卡与正字渲染
- **Preconditions**: 当前打卡计数为 `49`。
- **Steps**:
  1. 按下 Space 键完成第 50 遍。
  2. 连续快速打卡直至跨越第 150、300、500 遍。
- **Expected Result**:
  - 第 50 遍触发：轻量弹出“初识音素 (50遍达成)”徽标 Toast。
  - 第 150 遍触发：“意群连贯 (150遍达成)”成就反馈。
  - 第 300 遍触发：“肌肉定型 (300遍达成)”高亮徽章。
  - 第 500 遍触发：“脱口而出 (500遍达成)”通关庆祝动画，篇目标记为已通关。
- **Priority**: High

---

## 7. Feature: 纸质排版打印与多端导出 (Print & Export)

### TC-FT-PRN-001: 系统打印样式与无干扰排版 (`@media print`)
- **Feature Name**: 纸质排版打印
- **Preconditions**: 处于 Screen 3，篇目为卡斯蒂利亚西语日常对话。
- **Steps**:
  1. 点击顶部“🖨️ 打印”按钮呼出浏览器打印面板。
- **Expected Result**: 打印预览中自动隐去所有网页 Header、播放器控制条、打卡大按钮与侧边栏；正文自动放大为 18pt 优雅大字号，行高呈现 2.2 宽裕手写留白。
- **Priority**: Critical

### TC-FT-PRN-002: 纸面 60 格与 100 格“正”字打卡表切换
- **Feature Name**: 纸质排版打印
- **Preconditions**: 在打印设置面板中。
- **Steps**:
  1. 勾选“60 个方格 (300遍肌肉定型)”，发起打印预览。
  2. 改选为“100 个方格 (500遍脱口而出)”，发起打印预览。
- **Expected Result**: 勾选 60 格时页末排版 60 个正方形手绘方格；勾选 100 格时排版 100 个正方形方格；方格带 `break-inside: avoid`，网格整体整齐，不产生畸形跨页切割。
- **Priority**: High

### TC-FT-PRN-003: 导出标准 Markdown 文件 (.md)
- **Feature Name**: 纸质排版打印
- **Preconditions**: 篇目进度 120 / 500。
- **Steps**:
  1. 在导出面板点击“导出 Markdown 文件”。
- **Expected Result**: 触发下载 `.md` 文件，内含标题、源文、目标外文、当前练习进度概览以及由 Markdown Table 构建的打卡方格模板。
- **Priority**: Medium

### TC-FT-PRN-004: 一键无损复制富文本至剪贴板
- **Feature Name**: 纸质排版打印
- **Preconditions**: 操作系统已配置剪贴板支持。
- **Steps**:
  1. 点击“复制富文本”。
  2. 打开本地 Word 或 Google Docs 文档执行粘贴（`Cmd+V`）。
- **Expected Result**: 弹出“已复制到剪贴板”；粘贴到文档中后保持大字号排版与规范的正字打卡表格结构，无格式崩塌。
- **Priority**: Medium

---

## 8. Feature: 系统设置与数据抹除 (Settings & Purge)

### TC-FT-SET-001: 场景翻译凭据配置与同源代理状态独立保存
- **Feature Name**: 系统设置与数据抹除
- **Preconditions**: 打开 Screen 5: Settings。
- **Steps**:
  1. 填写 Anthropic 翻译配置（Base URL, Model, Key: `sk-ant-test`），配置同源代理选项。
  2. 保存设置并重新打开设置面板。
- **Expected Result**: 翻译配置保持有效且持久化；当前版本设置界面不暴露 TTS 配置表单，保持极简专注。
- **Priority**: High

### TC-FT-SET-002: 彻底抹除全部本地数据 (双重安全防护)
- **Feature Name**: 系统设置与数据抹除
- **Preconditions**: 本地已有 5 篇语料、生成的音频和上千次打卡记录。
- **Steps**:
  1. 滚动至设置底部“危险区域”，点击“清空全部本地数据”。
  2. 在第一道确认弹窗中确认。
  3. 在第二道确认弹窗中按提示输入“DELETE”并点击执行。
- **Expected Result**: 执行数据库清空；IndexedDB 中所有表被清空；页面刷新重置为最初始干净状态；无残留缓存。
- **Priority**: High
