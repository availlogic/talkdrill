# TalkDrill - Visual Guidelines & Design System

## 1. Design Philosophy & Visual Tone

TalkDrill 是一款服务于极度专注、追求生理肌肉定型的高强度外语训练工具。其视觉设计必须服务于**消除心智杂质、回归纯粹听读**的本质目标。

### 1.1 品牌个性 (Brand Personality)
- **专注克制 (Restrained Focus)**：界面不存在任何无关的社交打赏、五彩排行榜或跳跃式弹窗，将视觉噪音降至趋近于零。
- **实体触感 (Tactile & Physical)**：打卡交互具备弹性物理形变微缩反馈；正字笔画渲染再现笔墨纸砚的传统书写沉静感。
- **排版为王 (Typography-Centric)**：外语短语的字符间距、行高与字阶经过精细光学微调，在手机、平板与纸质打印上均具备极高辨识度。

### 1.2 视觉基调 (Visual Tone)
- **瑞士国际主义平面风结合现代数字极简主义**：克制的单色系搭配清晰明确的单一高对比强调色，网格严谨，信息层级分明。
- **纸电同源**：浅色模式呈现如高级道林纸一般的温润哑光感；深色模式呈现深沉夜读的暗石墨质感（深空灰黑），确保长达数小时跟读不产生视觉疲劳。

---

## 2. Colour System & Tokens

系统全面基于 Tailwind CSS v4 色彩代号与 CSS 变量进行标准化映射，严格满足 WCAG 2.1 AAA 超高对比度规范（正文与主标题对比度 >= 7:1，UI 控制组件 >= 4.5:1）。
系统采用类名驱动的主题引擎（`@variant dark (&:where(.dark, .dark *));`），确保底板背景（Canvas）与前景文字在浅色与深色模式下联动切换，杜绝“白底白字”或“暗底暗块”等对比度缺失缺陷。

### 2.1 基础色板与对比度定义 (Color Palette & AAA Contrast)

| 语义层级 | 颜色名称 | Light 模式色值 | Dark 模式色值 | 对比度表现 (WCAG AAA) | 语义用途与场景 |
|---|---|---|---|---|---|
| **Primary** | Cobalt / Blue | `#2563EB` (blue-600) | `#3B82F6` (blue-500) | >= 4.5:1 (UI组件) | 主打卡大胶囊、核心 CTA、当前激活状态 |
| **Primary Active** | Deep Cobalt | `#1D4ED8` (blue-700) | `#1D4ED8` (blue-700) | >= 4.5:1 | 按钮按下瞬间的微物理按压反馈色 |
| **Surface Base** | Canvas Paper | `#F8FAFC` (slate-50) | `#090D16` (slate-950 deep) | - | 全局底层背景画布，哑光防眩光 |
| **Surface Card** | Clean Surface | `#FFFFFF` | `#131B2E` (slate-900 card) | - | 篇目卡片、工作台控制底板、模态框 |
| **Border Subtle** | Subtle Line | `#E2E8F0` (slate-200) | `#1E293B` (slate-800) | >= 3.0:1 | 卡片分割线、正字方格线、输入框边框 |
| **Text Primary** | Deep Charcoal / White | `#0F172A` (slate-900) | `#FFFFFF` / `#F8FAFC` | 16.5:1 (Light) / 19.8:1 (Dark) | TalkDrill 主标题、外语朗读核心正文 |
| **Text Secondary** | Muted Slate | `#475569` (slate-600) | `#94A3B8` (slate-400) | 7.2:1 (Light) / 7.5:1 (Dark) | 翻译参考、副标题、说明文本 |
| **Badge Storage** | Storage Slate | `#F1F5F9` / `#334155` | `#1E293B` / `#E2E8F0` | > 9.0:1 (两端清晰可见) | 存储配额徽章 ("2.4 MB / 10.0 GB") |
| **Badge Offline** | High-Contrast Blue | `#EFF6FF` / `#1E40AF` | `#172554` / `#93C5FD` | > 7.3:1 (Light) / > 8.1:1 (Dark) | 标题旁 "Offline Shadowing" 语义徽章 |
| **Semantic Success**| Emerald | `#059669` (emerald-600) | `#10B981` (emerald-500) | >= 4.5:1 | 500 遍达成、保存成功提示 |
| **Semantic Warning**| Amber | `#D97706` (amber-600) | `#F59E0B` (amber-500) | >= 4.5:1 | 空间警告、A-B循环激活提示 |
| **Semantic Danger** | Crimson | `#DC2626` (red-600) | `#EF4444` (red-500) | >= 4.5:1 | 删除篇目、清空本地数据危险区 |

---

## 3. Typography & Glyph Standards

### 3.1 字体栈规范 (Font Stacks)
- **UI 与功能文本**：
  `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **外语跟读正文 (多语种地道呈现)**：
  - 针对拉丁语族（西班牙语、法语、德语、英语）：`"Charter", "Iowan Old Style", "Georgia", "Times New Roman", serif` 或现代人文无衬线 `"Inter", sans-serif`。
  - 针对中日韩字符（CJK）：`"PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`。
- **等宽数字与快捷键**：
  `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`（确保打卡数字在 `0` 到 `500` 变动时宽度固定，彻底消除界面数字抖动）。

### 3.2 字阶排版标尺 (Type Scale)

| 命名 | 字号 (px / rem) | 行高 (Line Height) | 字重 (Weight) | 适用场景 |
|---|---|---|---|---|
| **Display Drill** | `28px - 36px` (`2.25rem`) | `1.6 - 1.8` | Medium (`500`) | 桌面端核心外语跟读文本 |
| **Mobile Drill** | `20px - 24px` (`1.5rem`) | `1.8` | Medium (`500`) | 移动端核心外语跟读文本（防横向溢出） |
| **Print Drill** | `18pt` (`24px`) | `2.2` (宽松留白) | Regular (`400`) | `@media print` 纸质实体打印正文 |
| **Heading 1** | `24px` (`1.5rem`) | `1.3` | SemiBold (`600`) | 页面主标题、大模态框标题 |
| **Heading 2** | `18px` (`1.125rem`) | `1.4` | SemiBold (`600`) | 篇目卡片标题、侧边栏标题 |
| **Body Standard**| `14px - 16px` (`1rem`) | `1.5` | Regular (`400`) | 语料录入输入框、系统设置说明 |
| **Counter Big** | `32px` (`2rem`) | `1.1` | Bold (`700`), Tabular | 实时打卡看板阿拉伯数字（如 `342 / 500`） |
| **Caption / Hotkey**| `12px` (`0.75rem`)| `1.2` | Medium (`500`) | 快捷键标签（如 `Space`、`Z`）、时间元数据 |

---

## 4. Spacing System, Grids & Responsive Rules

### 4.1 8pt 基础网格系统
所有间距、内边距、外边距严格遵守 `4px / 8px` 倍数原则：
- `space-1` = `4px`
- `space-2` = `8px`
- `space-3` = `12px`
- `space-4` = `16px` (标准内边距)
- `space-6` = `24px` (卡片间隙与区段内边距)
- `space-8` = `32px` (工作台主体分栏间隙)
- `space-12` = `48px` (模块级纵向分隔)

### 4.2 响应式断点与形态演进 (Breakpoints)
- **Desktop (`>= 1024px`, Tailwind `lg:`)**：三栏固定工作台，左导航 (260px) + 中核心 (自适应) + 右看板 (320px)。
- **Tablet (`768px - 1023px`, Tailwind `md:`)**：可折叠抽屉导航，主体视口优先，触控热区保持 `>= 48px`。
- **Mobile (`< 768px`)**：完全流式单栏，导航收缩为 Drawer；底部常驻超大打卡胶囊（高度固定 `58px`，最小触控面积横跨屏幕）。

---

## 5. Standard Component Library Specs

### 5.1 按钮族 (Buttons)
- **Primary Drill Capsule (移动端核心打卡胶囊)**：
  - 高度：`58px`，圆角：`rounded-full`。
  - 样式：背景 `bg-blue-600 hover:bg-blue-700 active:scale-95`。
  - 阴影：`shadow-lg shadow-blue-500/25`。
  - 字体：`text-white font-semibold text-lg`。
- **Standard Button (标准操作按钮)**：
  - 高度：`40px`，圆角：`rounded-lg`，内边距：`px-4 py-2`。
  - 状态：Hover 时透明度/明度变动 5%，Active 时微缩（`scale 0.98`），Disabled 时 `opacity-40 cursor-not-allowed`。
- **Undo Icon Button (极简撤销按钮)**：
  - 尺寸：`36x36px` 圆形或圆角方块，带明显 `Z` 快捷键小角标。

### 5.2 输入控件 (Inputs & Textareas)
- **Studio Textarea**：
  - 边框：`border border-slate-300 dark:border-slate-700 rounded-xl`。
  - 焦点：`focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`。
  - 字体：`text-base leading-relaxed p-4`。

### 5.3 音频播放器组件 (Audio Player Bar)
- **Waveform / Slider**：高度 `6px`，拖拽滑块（Thumb）直径 `16px`。
- **A-B Region Marker**：在滑块进度条上呈现半透明蓝色高亮带（`bg-blue-500/20`），A 端点与 B 端点展示带磁性吸附的微型垂直旗标。
- **Speed Pills (倍速切换药丸)**：包含 `0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x` 五项连续切换芯片，当前倍速项呈现高亮背景（`bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold`）。

### 5.4 中国传统“正”字网格渲染规范 (Zheng Matrix Grid)
- **网格构成**：由多个并排的正方形单元格构成（每行 5 或 10 个方格）。
- **笔画矢量定义 (SVG Vector)**：
  - 单个正方形尺寸：标准界面 `28x28px`，纸质打印 `20x20mm`。
  - 底框：浅灰色细线框（`stroke: #CBD5E1`, `stroke-width: 1px`）。
  - 笔画顺序（严格遵循汉字书写笔顺，单笔对应打卡计数 +1）：
    1. 第一笔：横（一）
    2. 第二笔：竖（丨，居中偏左下垂）
    3. 第三笔：短横（向右延伸）
    4. 第四笔：竖（短竖向右下落）
    5. 第五笔：长底横（封底完成“正”字）
  - 激活笔画呈现鲜艳墨黑/深蓝，笔画末端采用柔和圆角（`stroke-linecap: round`）。

---

## 6. Accessibility (A11y) & Feedback Specifications

- **对比度合规**：所有核心正文与打卡数字对背景对比度保证 `>= 7:1`（远超 WCAG AAA 标准）。
- **键盘导航与焦点指示 (Focus Rings)**：
  - 所有可交互元素在键盘 Tab 导航时均具备高清晰度聚焦环：`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`。
  - 核心工作台设置全局物理快捷键（`Space`, `Z`, `R`, `[`, `]`），在快捷键激活时不转移焦点，无任何屏幕失焦跳转。
- **屏幕阅读器支持 (Screen Readers)**：
  - 大打卡按钮包含属性 `aria-label="打卡增加一次，当前累计 {current} 次，目标 {target} 次"`。
  - 计数值节点标注 `aria-live="polite"`，当打卡递增时无障碍引擎自动播报最新遍数。
