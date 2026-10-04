# 发布为 npm 包（PUBLISHING）

本文说明如何把 `dsh-email-push-master` 以 **npm 包**的形式发布，并让用户用 `dsh plugin add` 直接安装。

以下结论均来自对**实际发布版 DSH `0.2.0-rc.2`** 源码（`resources/app.asar` 内的 `@deepseek-ai/*`）与
真实安装日志的核对，不是推测。每条都标注了证据位置。

---

## 1. 结论速览

| 问题 | 结论 |
|---|---|
| 必须叫 `dsh-plugin-*` 吗？ | **不必须**。只校验 npm 包名正则 `/^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/`。`dsh-cost-meter`、`@xmanrui/dsh-im` 都是反例。 |
| 必须有 `dsh.bundle.patch` 吗？ | **必须**。否则 `dsh plugin add` 报 `not-bundle` 并回滚。 |
| 必须有 `dsh.client` 吗？ | 可选。但**一旦声明**，`exports["./client"]` 必须存在且是字符串或 `{ default: string }`，否则抛错。 |
| 需要打包器吗？ | **不需要**。DSH 不要求任何 bundler 配置；`client.js` 手写 `window.__ModuleLoader__.load({...})` 即可（本插件就是这么做的）。 |
| 需要 `engines.dsh` 吗？ | 可选——**DSH 核心不校验 `engines`**。真正生效的是 `peerDependencies`。 |
| `dsh.compatibility` / `dshhub` 生效吗？ | DSH 核心不读（`dshReleases` 在 `@deepseek-ai/*` 中零命中）。它们是第三方 hub 的元数据，写上是给 hub 用的。 |
| 装了会自动更新吗？ | **不会**。profile 里记的是范围（如 `^1.3.0`），需手动 `add <pkg>@latest` 或 `update`。 |

当前 npm 上 `@deepseek-ai/dsh` 的 `latest` 就是 **`0.2.0-rc.2`**，而 `dsh-email-push-master` **尚未被占用**（`npm view` 返回 404）。

---

## 2. DSH 的安装与校验流程

`dsh plugin --profile <name> <args…>` 本质是**把参数透传给 profile 目录里的 pnpm**，然后在 pnpm 成功后做校验。
接受的 spec 形式：npm 包名（可带 `@range`）、绝对路径 / `file:` / `link:`、`github:` 简写或仓库 URL、`.tgz` 压缩包。

安装时的校验链（顺序很重要）：

1. **兼容性预检**：对 registry spec 会先 `pnpm view` 取 manifest 再校验；失败则 `dsh: nothing was installed`。
2. **pnpm 安装**，失败则回滚 `package.json` / `pnpm-lock.yaml`。
3. **必须是 bundle**：`manifest.dsh.bundle === undefined` → `not-bundle` 错误。
4. **解析补丁文件**：`dsh.bundle.patch` 指向的 YAML 必须是合法的顶层补丁数组。
5. **写入** `dsh.profile.bundles` 并默认启用。

### 兼容性校验规则（关键）

只检查 `peerDependencies` 中名字**恰好是 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头**的项：

```js
// @deepseek-ai/dsh-app-boot/lib/index.js  evaluatePluginCompatibility()
if (name !== "@deepseek-ai/dsh" && !name.startsWith("@deepseek-ai/dsh-")) continue
if (!semver.satisfies(runtimeVersion, requirement, { includePrerelease: true })) peers[name] = range
```

三个推论：

- **没有 `peerDependencies` 字段 ⇒ 完全不校验**（早期插件因此"什么 DSH 都能装"）。
- `@deepseek-ai/schemastery`、`@deepseek-ai/cordis` **不参与**校验（前缀不匹配）。
- 用户可以用 `dsh plugin allow-version <pkg>@<ver> --dsh-version <ver> --accept-risk`（或插件管理器）
  给出**精确到版本**的豁免，豁免记录写在 profile 的 `compatibility.json`。

> 因此 `"*"` 虽然"永不被拒"，但也等于主动放弃这层保护。本插件改为写真实范围
> `">=0.2.0-rc.2 <0.3.0-0"`：不兼容的 DSH 在**安装阶段**就被明确拒绝，而不是留到运行期崩溃。

### 依赖为什么能解析

profile 的 `pnpm-workspace.yaml` 是 `nodeLinker: hoisted` + **`autoInstallPeers: false`**。
插件 peer 声明的 `@deepseek-ai/*` 并不是从 npm 装的，而是由 DSH 把**自身安装目录**里的包投影进
profile 的 `node_modules`（app-boot 的 runtime resolution + link projection）。投影的名字集合正是
`dependencies` **加** `peerDependencies` 的 key。

**实践含义：插件 import 了哪个 `@deepseek-ai/*` 包，就应在 `peerDependencies` 里声明它。**
本插件只 import `@deepseek-ai/dsh-skill-filesystem`，因此只声明这一个。

---

## 3. 客户端 bundle 契约

- 发现条件：某个**已启用的 Loader 行**，其包声明了 `dsh.client` 且 `dsh.client.platform === "web"`。
- **桌面版也算 web**——Electron 外壳复用同一个 web server，所以 `platform: "web"` 同时覆盖网页端与桌面版。
- 行 id **就是 npm 包名**，因此 `window.__ModuleLoader__.load({ id })` 必须 **等于包名**：
  本插件是 `id: "dsh-email-push-master"`。
- `dsh.client.inject` / `external` 只是**加载顺序提示**：未命中的 `inject` 会被静默跳过，不会报错。
- 免声明的"基座"（seed）模块：`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、
  `@deepseek-ai/cordis`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-slots`、
  `@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-dockkit`。
  本插件只用 `react`，所以既不需要 `inject` 也不需要 `external`。

`cordis.patch.yml` 的补丁写法（`- insert:`）在 0.2.0-rc.2 仍然有效，无需改动。

---

## 4. 发布步骤

### 4.1 前置检查

```powershell
npm login                                   # 当前机器 npm whoami 会返回 ENEEDAUTH，需先登录
npm view dsh-email-push-master              # 404 表示名字可用（已确认）
node -v                                     # 本插件要求 >=18
```

### 4.2 检查 tarball 内容

`files` 白名单决定发布内容。务必确认 patch 文件与客户端 bundle 在内：

```powershell
cd <repo>
npm run verify                              # node --check 三个入口文件
npm pack --dry-run                          # 必须能看到 cordis.patch.yml / client/client.js / skills/notify/SKILL.md / sender.mjs
```

> `config.json` 已被 `.gitignore` 且**存放在包目录之外**（`~/.config/dsh-email-push-master/config.json`，
> 可用 `DSH_EMAIL_PUSH_CONFIG` 覆盖），所以既不会被 `pnpm install` 删掉，也不可能被打进 tarball。

### 4.3 发布

```powershell
npm publish --access public                 # 非 scoped 包时 --access public 是空操作，写了更稳
npm publish --access public --otp=123456    # 账号开启了 auth-and-writes 两步验证时需要
```

- **provenance**：`npm publish --provenance` 只有在支持 OIDC 的 CI（如 GitHub Actions 且 `id-token: write`）
  里才能用，本地直接跑会失败。
- `package.json` 里已写 `publishConfig.access = public`。

### 4.4 验证与安装

```powershell
npm view dsh-email-push-master version
npm view dsh-email-push-master dist.tarball

# 网页端
dsh plugin --profile web add dsh-email-push-master

# 桌面端：先「完全退出」桌面版（它持有 profile 锁），且该 profile 已初始化过
dsh plugin --profile desktop add dsh-email-push-master
```

用户侧更新（不会自动更新）：

```powershell
dsh plugin --profile web add dsh-email-push-master@latest
```

### 4.5 发布前本地试装（推荐）

不必先发 npm，可以先打 tarball 走真实安装链路：

```powershell
npm pack
$env:DSH_HOME = "D:\tmp\dsh-test"           # 隔离，避免动到自己的 profile
dsh plugin --profile web add "<repo>\dsh-email-push-master-1.3.0.tgz"
dsh --profile web --dump-config             # 确认插件行已合入且未被 disabled
```

---

## 5. 容易踩的坑

| 坑 | 说明 |
|---|---|
| `files` 漏文件 | `cordis.patch.yml`、`client/`、`skills/`、`sender.mjs` 任一漏掉，装上就是残废。发布前用 `npm pack --dry-run` 逐项确认。 |
| `dsh.client` 声明了却漏 `exports["./client"]` | 直接抛 `declares dsh.client but exports no "./client" bundle`。且不能写成只有 `import` 条件的对象。 |
| `__ModuleLoader__` 的 `id` 与包名不一致 | 客户端 bundle 永远不被 materialize。 |
| slot 名字过时 | 例如 0.2.0-rc.2 已无 `settings.plugin.item`；`slots.inject` 对不存在的 slot 是**静默不注册**，表现为"界面消失但无报错"。改 DSH 版本后要重新核对 slot。 |
| `type: "module"` + `exports` | 服务端入口用 ESM（`index.mjs`），客户端 bundle 是 **classic script**（`window.__ModuleLoader__`），两者不要混。 |
| 重发同一版本号 | npm 不允许，必须 bump `version`。 |
| 把 `config.json` / `notify.log` 提交 | 授权码泄露等于别人能用你的邮箱发信。 |

---

## 6. 与 DSH 版本升级的关系

DSH 的插件 API 变动频繁（本插件在 `0.1.2-rc.1` 遇到过 `settingsNamespace` 被移除，在 `0.2.0-rc.2` 遇到
`settings.register` 被移除 + `settings.plugin.item` slot 被重命名）。因此每次 DSH 升级后建议：

1. 更新 `peerDependencies` 的范围（这一步会**自动**把不兼容的 DSH 挡在安装阶段）。
2. 重新核对 slot 名与宿主服务 API（slot 目录可从 `@deepseek-ai/dsh-cordis-client-runner/lib/client.js`
   内嵌的 slot 契约表读出）。
3. 用隔离 `DSH_HOME` 做一次真实 `dsh plugin add` + `--dump-config` + 启动验证。
