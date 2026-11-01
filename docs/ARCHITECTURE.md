# 乔木阅读 · DSH 插件 — 架构与接口契约

> 维护说明（2026-11-01）：下文保留上游开发阶段的历史契约，不约束当前 fork。`1.2.0-dev.1` 客户端只注册文档历史主面板与原生对话文档动作；独立书库、伴读会话入口已移除。Host/Client 使用 Typert Remote，新增独立历史索引，原书库数据不变。当前实现与验收以 [对话文档计划](CONVERSATION-READER-PLAN.md) 和 [维护记录](MAINTENANCE.md) 为准；下文 overlay、通信、会话 cwd 及并行开发约定不代表现状。

本文件是所有并行开发者必须遵守的**冻结契约**。任何一方不得单方面修改接口；需要改动时先告知 Lead。

## 1. 目标

把 Obsidian 插件 `qiaomu-reader`（23,282 行）的核心阅读体验，重写为 DeepSeek Harness（DSH）的插件：

- **宿主半（Host）**：Cordis 插件，负责书库目录、书籍字节、持久化状态、命令、给 Agent 用的工具。
- **客户端半（Client）**：浏览器半边，一个自包含的惰性 CJS 模块（`client.js`），注册到 DSH Web UI 的 Slot 上，用 React 渲染书库与阅读器。
- **不依赖**任何 DSH Client 包（`@deepseek-ai/dsh-client-ui-primitives` 等一律不 require）。只 require 平台种子表里的 `react`。
- 一切样式只使用 DSH 主题令牌 `--dsw-alias-*`。

## 2. 交付物与目录

```
qiaomu-reader-dsh/
  package.json            # dsh.bundle.patch + dsh.client + meta/icon
  cordis.patch.yml        # 插入宿主行
  icon.svg
  locale/{zh,en}.json     # 插件卡片标题/描述（Plugin Manager 读取）
  index.js                # 宿主半入口（esbuild 产物，源码在 src/host/index.js）
  client.js               # 客户端半（esbuild 产物，源码在 src/client/index.js）
  scripts/build.mjs       # 构建：esbuild 打包 src/host -> index.js，src/client -> client.js
  scripts/make-starter-books.mjs  # 从参考项目 EPUB 生成 media/starter-books.js
  media/starter-books.js  # 内置公版书（base64），由脚本生成，勿手改
  src/host/               # 宿主源码（Node ESM）
  src/core/               # 纯逻辑核心：无 DOM、无 React、可在 Node 中单测
  src/client/             # 客户端：index.js + ui/*.js（DOM/React）
  test/*.test.mjs         # node --test 单测
  docs/
```

## 3. 宿主半（Host）

### 3.1 入口形式

`src/host/index.js` 必须导出：

```js
export const inject = ['tools', 'commands', 'sessions'];   // 全部可选服务放这里
export function apply(ctx, config) { /* 所有注册都用 ctx.effect / ctx.on 包裹并返回 disposer */ }
export const Config = { /* JSON Schema 形如 { type:'object', properties:{...} } */ };
```

- 只用 Node 内置模块（`node:fs/promises`、`node:path`、`node:crypto`）。
- 绝对不要在这里 import React、DOM 或客户端代码。
- 每个注册资源必须用 `ctx.effect(() => {...; return disposer}, '描述')` 登记。

### 3.2 书库目录

根目录解析顺序（`workspaceRoot(ctx)`）：

1. `ctx.get('sessions')` 当前 Agent → 找不到就退回；
2. `process.env.DSH_WORKSPACE`；
3. `process.cwd()`。

书库根 = `<workspaceRoot>/乔木阅读`；书籍 = `<root>/books`（文件名 `<id>.epub|.pdf|.txt`）；
状态 = `<root>/state/<id>.json`；索引 = `<root>/library.json`。

所有路径必须**先 resolve 再校验前缀**，禁止 `..` 逃逸。

### 3.3 持久化模型

`<root>/library.json`：

```json
{
  "version": 1,
  "updatedAt": 1735689600000,
  "books": [
    {
      "id": "sha1-…","title":"道德经","author":"老子","format":"epub",
      "file":"books/<id>.epub","bytes":123456,"cover":null,
      "addedAt":1735689600000,"openedAt":null,"source":"starter|upload",
      "language":"zh","chapterCount":81
    }
  ]
}
```

`<root>/state/<id>.json`：

```json
{
  "version": 1,
  "bookId":"…",
  "locator": { "chapterIndex": 0, "chapterHref":"text/ch1.xhtml", "scroll": 0.0, "textQuote":"…" },
  "updatedAt": 1735689600000,
  "highlights": [
    { "id":"h1","chapterHref":"text/ch1.xhtml","text":"…","note":"",
      "color":"yellow|green|blue|pink","createdAt":0,"percent":0.12 }
  ],
  "bookmarks": [ { "id":"b1","chapterHref":"…","percent":0.3,"label":"…","createdAt":0 } ],
  "settings": { "theme":"paper","fontSize":18,"lineHeight":1.75,"fontFamily":"serif","margin":64 }
}
```

写文件必须**原子写**：先写 `<file>.tmp-<pid>` 再 `rename`。同时最多一个写队列（per path 串行）。

### 3.4 宿主服务方法（给客户端 RPC 用）

宿主通过 `ctx.reflect.provide(...)` 不适用于跨端；客户端半边与宿主半边各自是独立运行时。
**跨端一律走已经存在的 Host Remote，不新增 Remote 协议。**

客户端可用的既有 Remote（已实测存在）：

- `ctx.remote.workspaceFiles.readBytes(scope, path, options, signal)`
  `scope` 是 `sessionId`（字符串）；`options` 形如 `{ maxBytes }`；返回 `{ bytes: Uint8Array }`（以实际返回为准，见下）。
- `ctx.remote.workspaceFiles.stat(scope, path, signal)`
- `ctx.remote.fileUploads.upload(encoded, signal)`，`encoded = { data: base64String, name }`。

因此**导入书籍**的链路由宿主插件负责落盘：客户端把文件 base64 交给宿主，
宿主用 `ctx.attachments.fileHostPath(ref)` 拿到临时文件真实路径后复制到书库。
为了让这一步在客户端可用，宿主**必须**在 `apply` 内注册一个 Session Command：

```
/reader  library      → 列出书库（文本摘要）
/reader  import <path> → 把工作区里已有的 epub/pdf/txt 导入书库
```

命令定义参考 `commands` 服务（`ctx.commands.register({name, description, handler})`，
`handler(invocation) => { kind:'success', text } | { kind:'error', text }`）。

### 3.5 Agent 工具

`src/host/index.js` 通过 `ctx.tools.register({...})` 注册一个工具 `reader_library`：

- `action: 'list' | 'read' | 'import' | 'highlights' | 'export'`
- `list` 返回书库 JSON 摘要；
- `read` 参数 `{ id, chapter? }` 返回该章纯文本（截断到 8000 字符）；
- `highlights` 返回某书的划线列表；`export` 返回该书的 Markdown 阅读笔记；`import` 从工作区路径导入。

工具定义参考 `tools` 服务签名：`register(definition: ToolDefinition)`。
若 `ToolDefinition` 形状不确定，**先跑 `cordis_inspect_query` 查 `tools`**，不要猜。

#### `output.schema` 必须是**原生 JSON Schema 子集**（已踩过的坑）

`tools.register()` 直接对 `definition.output.schema` 调用
`assertSupportedJsonSchema()`，**不做作者层编译**。所以：

- `output.schema = { type: 'json' }` 会抛
  `JsonSchemaError: unsupported JSON schema: schema.type must be one of object/array/string/number/integer/boolean/null`
  —— `json` 只属于「作者层 spec」（`valueSchemaSpecToJsonSchema` 的输入），不是合法 raw schema。
- 正确写法是对象根 + 显式 `additionalProperties`，例如本项目：
  `{ type:'object', additionalProperties:true, properties:{ action:{type:'string'}, ... } }`。
- `parameters` 走的是作者层编译（`parameterSchemaSpecToJsonSchema`），`{type:'object', properties, required}` 即可，
  但每个属性仍需 `additionalProperties` 只在对象子节点上显式声明。

> Lead 会在集成阶段实测并可能调整 3.4/3.5 的细节；核心数据契约（3.3）不变。

## 4. 核心模块契约（`src/core/*`）

**硬性要求：`src/core/` 下所有文件不得引用 `window`、`document`、`navigator`，也不得 import React。**
这样它们能在 Node 里被 `node --test` 直接单测（Node 24 内置 `DecompressionStream`、`TextDecoder`、`DOMParser` 除外——**不要用 DOMParser**，用正则/手写解析）。

### 4.1 `src/core/zip.js`

```js
/** 读取 zip（EPUB 就是 zip）。input: Uint8Array | ArrayBuffer */
export async function openZip(input): Promise<ZipArchive>

interface ZipArchive {
  entries(): { name: string, size: number, compressedSize: number }[]
  has(name: string): boolean
  /** 解压某个条目为 Uint8Array；不存在返回 undefined */
  read(name: string): Promise<Uint8Array | undefined>
  /** 解压为 UTF-8 文本 */
  readText(name: string): Promise<string | undefined>
}
```

- 必须支持 stored（0）与 deflate（8）。deflate 用 `DecompressionStream('deflate-raw')`（Node 18+/Chromium 均支持）。
- 必须处理：数据描述符（bit 3）、UTF-8 标志（bit 11）、zip64 的 `0xFFFFFFFF` 哨兵、
  中央目录定位（从尾部 `0x06054b50` 向前扫描，容忍注释）。
- **必须做 CRC32 校验**，失败时抛出可读错误。

### 4.2 `src/core/epub.js`

```js
export async function parseEpub(bytes: Uint8Array): Promise<EpubBook>

interface EpubBook {
  title: string
  author: string
  language: string
  publisher: string
  description: string
  identifier: string
  /** 章节正文，按 spine 顺序 */
  chapters: EpubChapter[]
  toc: TocEntry[]              // { label, href, children: TocEntry[] }
  /** 相对 zip 根的路径 -> { href, mediaType }，图片/样式用 */
  resources: Record<string, { mediaType: string, href: string }>
  coverHref: string | null
  /** zip 根前缀，如 "OEBPS/" */
  rootDir: string
  /** 读原始资源（图片、css） */
  resourceBytes(href: string): Promise<Uint8Array | undefined>
}

interface EpubChapter {
  index: number
  href: string        // 相对 zip 根（已展开 rootDir），如 "OEBPS/text/ch1.xhtml"
  id: string
  mediaType: string
  /** 该章**原始** XHTML 字符串；清洗与取 body 一律交给 html.js，epub.js 不做删改 */
  xhtml: string
  /** spine 里 linear="no" 的章节标记为 false，其余 true */
  linear: boolean
  /** 章节显示名：从 <title> 或首个 h1..h3 猜，猜不到则为 href 的文件名 */
  label: string
}
```

解析要点：

- `META-INF/container.xml` → `rootfile@full-path`；
- OPF：`metadata`（dc:title/creator/language/publisher/description/identifier）、
  `manifest`、`spine`（`itemref@idref`，`linear="no"` 仍保留但标记 `linear:false`）；
- 目录：优先 EPUB3 `manifest` 里 `properties="nav"` 的 nav 文档（`nav[epub:type=toc]`），
  否则 EPUB2 `toc.ncx` 的 `navMap`；路径要相对 nav/ncx 自身解析再归一化到 zip 根；
- 封面：`<meta name="cover" content="id">` → manifest item，或 `properties="cover-image"`，或文件名含 cover 的图片；
- **XML 解析不要用 DOMParser**：写一个宽松的标签/属性扫描器，够用即可；属性值实体要解码
  （`&amp; &lt; &gt; &quot; &#39; &#xNN; &#NN;`）。
- 容错第一：缺 OPF、缺 spine、坏 href 时抛明确错误，不要让 `undefined` 冒泡。

### 4.3 `src/core/html.js`

```js
/** 提取 body 内 HTML（无 body 则整段），并移除 script/style/link/iframe/object/embed 与事件属性 */
export function extractBody(xhtml: string): string
/** 深度清洗：白名单标签与属性，href 只保留 http(s)/#/相对路径；返回干净 HTML 字符串 */
export function sanitizeHtml(html: string): string
/** 纯文本化（用于搜索与 Agent 读取） */
export function toPlainText(html: string): string
/** 用 <mark class="qm-hit"> 包裹匹配串做搜索高亮（大小写不敏感）；返回 { html, count } */
export function highlightTerms(html: string, query: string): { html: string, count: number }
/** 给相对路径补基址：把 src/href 相对值变为绝对 zip 路径 */
export function absolutize(html: string, baseDir: string): string
/** 把 <img src> 等替换为一个可注入的 URL 供给函数 */
export function rewriteResources(html: string, baseDir: string, resolve: (zipPath: string) => string | null): string
```

### 4.4 `src/core/reader.js`

```js
export function createReaderEngine(book: EpubBook): ReaderEngine

interface ReaderEngine {
  book: EpubBook
  chapterCount(): number
  /** 该章可渲染的干净 HTML（已 absolutize + rewriteResources） */
  render(chapterIndex, resolveResource: (zipPath: string) => string | null): Promise<string>
  plainTextOf(chapterIndex): Promise<string>
  /** 全书搜索，返回最多 limit 条命中 */
  search(query: string, limit?): Promise<SearchHit[]>
  /** spine 内相对链接解析：给定当前章与 href，返回目标章 index 或 null */
  resolveLink(currentIndex: number, href: string): number | null
  /** 从 href 找 TOC 路径 */
  tocFor(chapterIndex: number): TocEntry[]
}

interface SearchHit { chapterIndex: number, chapterLabel: string, snippet: string, offset: number, percent: number }
```

### 4.5 `src/core/state.js`（纯函数 + 内存 store，可单测）

```js
export const DEFAULT_READER_SETTINGS = {
  theme: 'paper', fontSize: 18, lineHeight: 1.75,
  fontFamily: 'serif', margin: 64, flow: 'paginated', justify: true,
}

/** 归一化任意来源的 library 数据 */
export function normalizeLibrary(raw): Library
/** 归一化任意来源的 book state 数据 */
export function normalizeState(raw, bookId): BookState
export function createBookState(bookId): BookState
export function addHighlight(state, input): { state, highlight }
export function removeHighlight(state, id): { state, removed: boolean }
export function updateHighlightNote(state, id, note): state
export function addBookmark(state, input): { state, bookmark }
export function removeBookmark(state, id): state
/** 进度百分比：以“第 index 章 + 章内比例”估算 */
export function progressOf(state, chapterCount): number
/** 合并两台设备的划线（同一 id 以 updatedAt 新者胜） */
export function mergeStates(a, b): BookState
/** 按 书id 生成稳定 id */
export function stableId(...parts): string
```

### 4.6 `src/core/search.js`

```js
export function makeSnippet(text: string, at: number, span: number, width?: number): string
export function searchInText(text: string, query: string, opts?): { index: number, length: number }[]
/** 中文友好：CJK 单字不要求词边界；英文按不区分大小写的子串 */
export function normalizeQuery(q: string): string
```

## 5. 客户端半（Client）

### 5.1 模块壳（`src/client/index.js` 打包后生成 `client.js`）

最终 `client.js` 的形态由 esbuild 生成自下面源码：

```js
import * as React from 'react';           // 由 esbuild 打成 require('react')
import { registerPanel } from './ui/panel.js';
import { createStore } from './state.js';

export const inject = ['slots', 'locale'];
export function apply(ctx) {
  // 用 ctx.effect 登记 slot，返回 disposer
}
```

构建时用 esbuild 的 `--external:react --format=cjs` 并按
`window.__ModuleLoader__.load({ id:'@local/qiaomu-reader', factory(require){...} })`
包裹（见 `scripts/build.mjs`，Lead 负责）。

### 5.2 Slot 注册（已核实的写法）

主界面 = **全屏浮层**（root 作用域，不受会话约束），再加侧栏图标：

```js
ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
  name: 'shell.overlay',
  id: 'qiaomu-reader',
  locale: 'qiaomu-reader',
  // 注意：store **不能**写在这里（见下方「store 必须是 handle」）
  inject: () => ({ store, getBooks, getStatus, engineOf, stateOf, progressOf, actions, host, data }),
}, ReaderOverlay)), 'qiaomu-reader: overlay');
```

- `shell.overlay`：`kind: 'list'`、`scope: 'root'`，注册字段 `{id, order?, label?}` + 组件。
- 侧栏图标：`sidebar.panellist`（`kind:'list'`, `scope:'root'`，字段同上）。
- 组件自动收到的 props（由 DSH 注入，已核实）：`useStore(selector)`、`t(key)`、以及 `inject`
  返回对象的全部字段。示例见 `dsh-client-ui-shortcuts` 的 `ShortcutReference`。
- **`inject` 只在挂载时调用一次**：书库这类会变化的数据必须以**函数**给出
  （`getBooks()`），不能给数组快照，否则预载完成后界面永远停在空列表。
- 组件必须**自包含**、任何异常都不能冒泡（否则 `slot entry crashed in '<slot>'`）。
- 在组件外层套 Error Boundary，失败时显示可读错误行。

#### store 必须是 DSH 的 store handle（已踩过的坑）

注册选项里的 `store` 只有一种合法形状：`defineStore()` 产出的
**handle**（`{ spec, create(scopeKey) }`）。renderer 渲染每个 entry 前会执行
`host.storeOf(entry)` → `resolveStore(entry.store)` → `handle.create()`：

- 传普通对象（例如自己实现的 `createUiStore()` 返回的 `{get,set,subscribe}`）会在
  `resolveStore` 里因 `handle.create is not a function` 抛错，浮层根本装配不起来。
- 本项目自带 store（不引入 `@deepseek-ai/dsh-client-store`，保持「只需 react」），
  所以**把 store 放进 `inject()`** 当作普通 props 传给组件；组件自己用
  `useSyncExternalStore` 订阅它。代价是不使用 DSH 注入的 `useStore(selector)`。

### 5.2.1 界面 props 契约（冻结）

```js
{
  useStore: (selector) => value,        // DSH 注入
  t: (key) => string,                   // DSH 注入
  getBooks: () => Book[],
  getStatus: () => ({ status: 'idle'|'loading'|'ready', error: string }),
  engineOf: (bookId) => ReaderEngine | undefined,
  stateOf: (bookId) => Promise<BookState>,   // async，首次按需加载
  progressOf: (bookId) => number,            // 0..1
  actions: {
    refreshLibrary(), openBook(id), readBook(id), importBook(File),
    removeBook(id), saveState(id, nextState), exportNotes(id), open(id?), close(),
  },                                          // 全部 async，失败返回 { ok:false, error }
  host: object | null,                        // null = 宿主不可用，退化本地模式
  data: object,                               // 数据层，仅诊断用
}
```

store 的键：`{ visible, view:'library'|'reader', bookId, panel, searchQuery, selection,
notice, lastError, openSignal, dataRevision }`。`visible === false` 时组件必须返回 `null`。

### 5.2.2 宿主数据面的可用性（重要）

安装型客户端模块与宿主半是**两个独立运行时**，没有可直接使用的双向 RPC。
因此 `host` 允许为 `null`，此时数据层退化为：

1. 内置公版书（内联在 `client.js`，永远可用）；
2. 浏览器 IndexedDB 的字节缓存（用户导入的书本机可读、刷新后可读）；
3. 进度 / 划线 / 设置存 IndexedDB + localStorage。

宿主半若在同一 Cordis 反射层注册了 `qiaomuReader` 数据面，则额外获得
「落到工作区文件系统 + Agent 可读 + 跨浏览器同步」的能力。两条路径功能都完整。

### 5.3 全屏浮层的行为

- 默认隐藏。由侧栏图标、`Ctrl/Cmd+Shift+R`、或 `ctx.slots` 内部 action 打开。
- 打开时铺满整个窗口（`position: fixed; inset: 0; z-index` 高），自带滚动容器。
- `Esc` 在“非全屏书页”状态关闭；阅读中 `Esc` 先关弹层再关阅读器。
- **不写 `document.body`**，不替换 root。

### 5.4 界面（对齐 qiaomu-reader 的信息架构）

1. **书库**：网格卡片（封面 or 首字色块、标题、作者、进度环、划线数）＋搜索框＋
   排序（最近阅读/标题/加入时间）＋筛选（在读/已读/有划线）＋「导入书籍」按钮（`<input type=file>`）。
2. **阅读器**：顶部工具条（返回、书名、进度百分比、目录、搜索、划线列表、设置、全屏）；
   正文区（分页或滚动）；底部进度条可拖拽跳章；左右翻页按钮；键盘 ←/→/Space/Home/End。
3. **目录侧滑**：TOC 树、当前章高亮。
4. **划线面板**：按位置分组，点条目跳原文；可改色、写批注、删除。
5. **搜索面板**：全书命中列表 + 高亮 + Enter 下一个 / Shift+Enter 上一个 / Esc 关闭。
6. **设置面板**：主题（纸白/暖纸/青瓷/月白/夜间）、字号、行高、字体（系统衬线/无衬线/宋体）、
   页边距、单双页、两端对齐。
7. **选中即菜单**：选中正文文字后弹出小工具条——三色划线 + 复制 + 批注。
8. **阅读笔记**：每本书的划线/批注汇总视图，可复制为 Markdown。

### 5.5 主题令牌

只用这些（已由 `Theme.listTokens` 确认）：
`--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1`、`--dsw-alias-bg-layer-2`、`--dsw-alias-bg-overlay`、
`--dsw-alias-border-l1`、`--dsw-alias-border-l2`、`--dsw-alias-brand-primary`、
`--dsw-alias-label-primary`、`--dsw-alias-label-secondary`、
`--dsw-alias-state-error-primary`、`--dsw-alias-state-success-primary`、`--dsw-alias-state-warn-primary`、
`--dsw-specific-sidebar-fill`。

**书页本身**（纸张底色、字体颜色）允许使用阅读主题自带颜色——那是书法/纸张表现，不是 UI 外壳。

## 6. 客户端 → 宿主的书字节通路（确定性回退链）

客户端读一本书的字节，按此顺序，前一步成功就停：

1. **内存缓存**：本次会话已解析过的 `EpubBook` 直接复用。
2. **内置书**：`media/starter-books.js` 里的 base64（随 `client.js` 一起加载）。
3. **工作区**：`ctx.remote.workspaceFiles.readBytes(sessionId, '乔木阅读/books/<id>.epub', {}, signal)`。

导入新书：客户端 `<input type=file>` 读为 base64 → 交给宿主落盘（见 3.4 的
`/reader import` 或宿主提供的 Remote）→ 刷新 `library.json`。

## 7. 验收标准

1. `node scripts/build.mjs` 产出 `index.js`（宿主，ESM）与 `client.js`（惰性 CJS 壳），无警告。
2. `node --test test/*.test.mjs` 全绿，覆盖 zip / epub / html / state / search 五个核心模块。
   （不要写 `node --test test/`：Node 24 会把目录参数当成入口模块而报
   `Cannot find module .../test`；用 glob 或 `npm test`。）
3. `plugin_manager install_bundle` 返回 `application: applied`。
4. `cordis_inspect_query` 能看到新宿主行处于激活状态，无 `failed`。
5. 浏览器控制台无 `slot entry crashed`。
6. 书库能列出内置公版书；打开后能翻页、划线、写批注、搜索、改主题；刷新后进度与划线仍在。
7. 主题令牌：浅色/深色下都只能看到令牌色（书页纸张色除外）。
