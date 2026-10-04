# TalkDrill - End-to-End (E2E) Test Scenarios Specification

## 1. Overview & Test Execution Framework

本文档依据 [docs/User-Flows.md](file:///Users/victorxu/projects/talkdrill/docs/User-Flows.md)、[docs/Screen-Specs.md](file:///Users/victorxu/projects/talkdrill/docs/Screen-Specs.md) 与 [docs/UI-Layouts.md](file:///Users/victorxu/projects/talkdrill/docs/UI-Layouts.md) 编制，设计用于 **Playwright** 自动化模拟器的端到端全链路真实用户交互测试用例。

全套 E2E 场景覆盖多端设备（Desktop、Tablet、Mobile）、键盘盲操与触控手势、网络中断离线容错及真实打印排版，验证最终业务产出与数据持久化的确定性。

---

## 2. E2E Scenario Matrix & Device Profiles

| 场景编号 | 场景名称 | 模拟设备与视口 | 核心用户画像与主路径 |
|---|---|---|---|
| **E2E-SCN-001** | Elena 深度纸电双轨练习全旅程 | Desktop (Chromium, 1440x900) | 模式 A 语料录入 -> 口语翻译 -> TTS 示范音频 -> 键盘跟读 -> 100格纸质打印 |
| **E2E-SCN-002** | Kenji 移动端单手盲操打卡全旅程 | Mobile (WebKit / iPhone 14, 390x844) | 模式 B 直接录入 -> 自有音频上传 -> 手势解锁 -> 底部大胶囊打卡 -> 50遍里程碑 -> 数字手动修正 |
| **E2E-SCN-003** | 100% 离线脱网与 PWA 连续跟读 | Desktop & Mobile (Offline 模拟) | Service Worker 离线拦截 -> IndexedDB 音频即时提取 -> 脱网打卡 -> 网络重连一致性 |
| **E2E-SCN-004** | 数据资产备份与隐私原子抹除 | Desktop (Chromium, 1280x800) | 凭据配置 -> 音频导出备份 -> 整库 JSON 导出 -> 危险区清空确认 -> 干净复位 |
| **E2E-SCN-005** | 多端自适应排版与输入方式严苛验证 | Responsive (1280px -> 820px -> 375px) | 视口动态伸缩 -> 三栏/抽屉/胶囊形态切换 -> 快捷键与触控等效性核验 |

---

## 3. Detailed E2E Scenarios (Playwright Ready)

### E2E-SCN-001: Elena 深度纸电双轨练习全旅程
- **Mapped User Flow**: Workflow 1 -> Workflow 2 -> Workflow 3 -> Workflow 5
- **Device Profile**: Desktop Chrome (1440x900, 物理键盘输入)
- **Preconditions**: 本地预置有效的 Anthropic 及 OpenAI TTS 测试 Mock 代理环境。
- **Step-by-Step Actions**:
  1. 打开首页 `#/`，验证首屏渲染，点击“+ 新建篇目”导航至 `#/studio`。
  2. 选择“模式 A: 需要口语翻译”，源文本框粘贴内容：“Could we have the bill, please? We're in a bit of a hurry.”
  3. 目标语种选择 `Castilian Spanish`，点击“⚡ 生成地道口语翻译”。
  4. 等待译文流式填充完毕，在目标外语框末尾手动追加润色词句“por favor”。
  5. 切换到“在线 TTS 合成”，发音人选择 `Alloy`，点击“一键合成示范音频”。
  6. 验证试听控制条就绪，点击“下载示范音频”，确认浏览器触发本地文件下载。
  7. 点击“完成并开始跟读”，系统跳转至核心工作台 `#/drill/{articleId}`。
  8. 连续按下键盘空格键 `Space` 5 次。
  9. 点击工作台顶部“🖨️ 打印 / 导出”，在面板中勾选“100 个方格 (500遍脱口而出)”，点击“发起打印”。
- **Playwright Assertions**:
  - `page.locator('textarea[name="targetText"]')` 包含人工润色后的定稿内容。
  - `page.locator('.zheng-character')` 成功渲染第 1 个正字的全部 5 个笔画（横、竖、短横、短竖、长底横）。
  - 主看板数字文本严格等于 `5 / 500`。
  - `@media print` 样式生效测试：`header`、`.player-bar`、`.drill-button` 具有计算样式 `display: none`；正文容器样式包含 `font-size: 18pt`；页末存在 100 个方格。

---

### E2E-SCN-002: Kenji 移动端单手盲操打卡全旅程
- **Mapped User Flow**: Workflow 1 (Mode B) -> Workflow 2 (Upload) -> Workflow 3 -> Workflow 4
- **Device Profile**: Mobile Safari / iPhone 14 (390x844, 触控交互)
- **Preconditions**: 本地准备大小为 4.5MB 的合规 `.mp3` 录音文件。
- **Step-by-Step Actions**:
  1. 移动端载入 `#/studio`，选择“模式 B: 直接录入目标外语”。
  2. 目标文本框填入一段日语对话：“すみません、お会計をお願いします。”，标题设为“日料店结账”。
  3. 点击“上传自有音频”，通过文件选择器上传 4.5MB 音频。
  4. 点击底部吸底按钮“完成并开始跟读”，进入 `#/drill/{articleId}`。
  5. 首次触碰屏幕，验证 `AudioContext` 被激活解锁。
  6. 循环快速轻触底部固定常驻的大尺寸胶囊按钮（高度 58px）累计 50 次。
  7. 观察屏幕中央是否弹出“初识音素 (50遍达成)”心理成就徽标。
  8. 点击打卡看板上的计数字符 `50 / 500`，在弹出的数字微调框中输入 `300` 并提交。
- **Playwright Assertions**:
  - 胶囊按钮 `[data-testid="big-drill-capsule"]` 计算高度严格 `>= 58px`，位于底部视口内（`position: fixed` 或 `sticky`）。
  - 第 50 次轻触瞬间，`page.locator('[data-testid="milestone-toast-50"]')` 变为可见状态并在 2 秒后自然淡出。
  - 手动修改为 300 后，正字网格容器内正字方格数量准确更新为 60 个（每个包含 5 笔），界面数值显示 `300 / 500`。
  - 刷新页面后重新查询 IndexedDB，`currentCount` 严格保持为 300。

---

### E2E-SCN-003: 100% 离线脱网与 PWA 连续跟读
- **Mapped User Flow**: Workflow 3 (Offline Mode)
- **Device Profile**: Desktop Chromium (1280x800)
- **Preconditions**: 本地已有包含示范音频的活跃篇目。
- **Step-by-Step Actions**:
  1. 进入 `#/drill/{articleId}`，验证音频正常加载并处于就绪状态。
  2. 调用 Playwright 上下文断网指令：`await context.setOffline(true)`。
  3. 执行页面硬刷新（`page.reload()`）。
  4. 验证 Service Worker 成功拦截并从缓存返回应用外壳，页面正常展现无离线小恐龙报错。
  5. 点击播放按钮播放音频，观察波形游走。
  6. 敲击 `Space` 键打卡 10 次，再敲击 `Z` 键撤销 1 次。
  7. 恢复网络连接：`await context.setOffline(false)`。
- **Playwright Assertions**:
  - 脱网刷新后，页面标题与语料正文正常展示，无资源加载 404 错误。
  - 音频顺利发声播放，`audio.currentTime` 持续前进。
  - 计数从初始值递增 9（+10 -1），且 IndexedDB 中的最新计数在恢复网络后与界面保持完全一致。

---

### E2E-SCN-004: 数据资产备份与隐私原子抹除
- **Mapped User Flow**: Workflow 6 (Settings & Purge)
- **Device Profile**: Desktop Chromium (1280x800)
- **Preconditions**: 数据库中存有 3 篇篇目及各自的打卡数据。
- **Step-by-Step Actions**:
  1. 点击右上角设置图标，打开 `#/settings` 弹窗。
  2. 点击“导出整库数据备份 (JSON)”，捕获下载文件流。
  3. 滚动到“危险区域”，点击“清空全部本地数据”。
  4. 在首道确认框点击“确定”。
  5. 在二次强制校验输入框中输入文本“DELETE”，点击“最终确认执行”。
  6. 等待应用自动重置刷新，回到首页 `#/`。
- **Playwright Assertions**:
  - 下载的 JSON 文件包含 `version: 1`，且 `articles` 数组长度等于 3。
  - 清空操作完成后，页面展示 Screen 1 的空状态插画。
  - 检查 IndexedDB：`TalkDrillDB.articles` 表计数等于 0，`TalkDrillDB.audios` 表计数等于 0。

---

### E2E-SCN-005: 多端自适应排版与输入方式严苛验证
- **Mapped User Flow**: 全端通用适配核验
- **Device Profile**: Dynamic Viewport Resizing (1280px -> 820px -> 375px)
- **Step-by-Step Actions**:
  1. 将视口设为 `1280x800`，进入 Drill Workspace。验证三栏布局（左侧导航 260px，中间主体，右侧正字看板 320px）。
  2. 调整视口至 `820x1180`（平板纵向）。验证左侧导航自动收缩为抽屉，中央与打卡区上下堆叠。
  3. 调整视口至 `375x667`（移动端窄屏）。验证页面变为纯单栏流式，底部常驻 58px 盲操胶囊，桌面快捷键指南隐藏。
- **Playwright Assertions**:
  - 在任何视口尺寸下，页面主视口均未产生水平横向溢出滚动条（`scrollWidth === clientWidth`）。
  - 各交互按钮触控目标最小尺寸均满足 `>= 48px`（移动端胶囊 `>= 58px`）。
