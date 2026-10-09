# Unity Web翻译机

[English](docs/README.en.md) · [下载浏览器插件](https://github.com/HappyAny/unity-web-translator/releases/latest) · GNU GPL v3 only

通过原生文本接口翻译 Unity Web 文字的 Chrome / Edge 扩展。**本项目需要可读取的文本接口，并非安装后就能翻译所有 Unity 网页。**

目前提供三条接入路径：

- **结构化资源**：按 Profile 配置 GET JSON 的资源路径和字符串字段，在 `fetch` / 异步 `XMLHttpRequest` 返回给应用前替换文字。适用于独立加载、未加密的 UTF-8 JSON 文本。
- **Unity 文本桥**：在自己可修改的 Unity 项目中接入 `.jslib` 与 C# 示例，把译文写回原本的 Text / TextMeshPro 等组件。无需增加游戏内悬浮框。
- **原生组件适配器**：对已经核对的 IL2CPP WebAssembly 构建，在文本解析和 TextMeshPro 赋值时取得原文，异步翻译后写回同一个原生组件。按完整模块的 SHA-256 匹配构建；其他版本保持原有行为，不通用扫描游戏内存。

文字需要匹配资源规则、文本桥或内置适配器。Unity 引擎检测只是诊断信息。原生适配器直接处理引擎显示的文字，不改动服务器资源包和校验值；它不覆盖所有 Unity 版本、文字组件或图片中的文字。本项目不包含 OCR。

## 安装与使用

1. 从 [Releases](https://github.com/HappyAny/unity-web-translator/releases/latest) 下载 `unity-web-translator-v版本.zip` 并解压，保留这个目录。
2. 在浏览器扩展管理页打开开发者模式，选择「加载已解压的扩展」，选中其中的 **`extension` 文件夹**。
3. 打开扩展设置，配置共用翻译服务，点击「试译一句」。支持 MyMemory 或 OpenAI 兼容 Chat Completions；API 密钥只保存在扩展中。
4. 为网页创建 Profile。匹配内置组件适配器时，资源规则可留空；其他网页按实际结构配置规则，或在可修改的 Unity 项目中接入文本桥。
5. 回到网页，通过扩展弹出菜单选择 Profile，确认页面与嵌入域名授权，然后 **刷新网页**。无需再次点击启用按钮。
6. 在「原生文本接入」检查已读取字段和已替换文字的数量。启用页面权限不等于已经适配文本。

资源规则示例：

```json
[
  {
    "url": "/StreamingAssets/story/*.json",
    "fields": [
      { "path": "lines[*].text", "kind": "story", "speaker": "speaker" },
      { "path": "lines[*].speaker", "kind": "name" }
    ]
  }
]
```

以上只是格式示例，并非所有网页都使用这个路径。假如资源包含 `{"lines":[{"speaker":"アリス","text":"こんにちは"}]}`，这些字段会被替换；控制指令和其他内容不会改变。详见 [原生文本接入](docs/native-adapters.md)。

## 设置、缓存和更新

- 翻译服务、密钥、附加 Body JSON、禁止思考参数、目标语言、插件界面语言、提前翻译句数和翻译开关共用。
- 在「共用翻译与语言设置 → 提前翻译」设置句数，默认 2 句，范围 0–20，0 关闭预翻译。需要适配器能取得后续剧情；已接入的编译消息脚本随实际对白推进补充缓存，普通脚本适配器仅预读载入时的开头几句。未知格式和运行时才生成的对白仍在显示时翻译。
- Profile 独立保存文本规则、额外 Prompt、自动缓存和个人译文。目标语言不同，缓存和修订也分别保存。
- 缓存使用 IndexedDB、SHA-256 请求标识和有界内存 LRU。可导出 JSON，在本地修改后重新导入；个人修订优先。文件不包含密钥。
- 中英文插件界面，七种目标语言。文本桥可按句数参考已经显示的角色名与对白；预翻译与预载 JSON 不加入历史。预翻译使用请求当时的已播放历史，准备好的译文在实际显示时才记入参考，不因历史变化重复请求。
- 小菜单可暂停翻译并切换 Profile。文本桥的当前绑定会恢复原文；已经加载到应用内的 JSON 字符串需要刷新网页才能全面恢复。
- 更新时在插件更新页拖入新版 ZIP，选原来的 `extension` 目录，校验后覆盖并重新加载。也可运行 ZIP 中的 `update.cmd`。**沿用原目录和原扩展，才能保留设置与缓存；不要删除再安装。**

从 0.1.0 更新时，旧更新页不识别新增的字体文件。请使用新版发布包的 `update.cmd`，或新版独立更新页 `unity-web-translator-updater.html`，选择原来的 `extension` 目录完成更新。

JSON 拦截每次最多 1 MiB / 32 条选定文本，翻译等待最多 15 秒，超时使用原资源。尚未译出的内容可在缓存准备好后刷新重试。原始 JSON 的其他字节，包括大整数 ID、小数表示、重复键和空白布局，保持不变。

内置原生组件适配器自带中文备用字体，在显示译文时使用 Unity 的原生字体渲染；暂停时恢复组件的原字体。字体以 SIL OFL 1.1 许可单独发布，覆盖基本多文种平面的 30,445 个字符，不能覆盖所有生僻字。其他接入路径的字体仍由 Unity 项目管理。

已核对的组件路径包括逐字对话窗口和 Naninovel 的 RevealableText / TextMeshPro 组件。后者翻译完整对白与角色名，异步刷新保留逐字显示进度；不会重新执行剧情指令或增加游戏历史记录。支持范围仍以构建指纹为准。

新增 Utage 和基于 UI.Text 的逐字消息组件接入，按完整对白绑定并提供说话人参考。压缩导出名的构建通过专属指纹映射接入。新增构建已通过实际 WASM 编译校验和自动回归测试；客户端中的字形、排版和玩法仍需实测。

已接入的 Utage novel 窗口按当前原生指令区分点击段落；提前翻译只准备后续句子的缓存，当前组件不会提前显示整页内容。中文可见进度随原生进度换算，点击完成本句和推进下一句的行为由引擎处理。

已核对构建的界面接入还覆盖 `UnityEngine.UI.Text`、TextMeshPro 格式化文字和场景文字，供教程、菜单及状态文字使用。旧版 UI.Text 优先保留能够显示译文的原字体，缺字时尝试独立的原生中文字体适配；实际字形和排版需要在客户端确认。图片或贴图中的字仍需要另外处理。

## 开发与验证

需要 Node.js 22+；Windows 更新器验证使用 Python 3。

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

`dist/` 输出可直接加载的插件 ZIP、独立更新页、`SHA256SUMS.txt` 与逐文件校验清单。CI 在 Windows / Linux 执行检查。测试覆盖原生资源替换、WASM 函数适配、托管字符串生命周期、XHR 完成事件、后台与页面桥、缓存隔离、暂停、过期结果、权限、个人修订和更新回滚。Unity C# 示例需在自己的 Unity 项目中编译和验证；自动检查不等价于实际画面、字体和玩法的兼容性验证。

[Unity SDK 示例](examples/unity/) · [英文说明](docs/README.en.md) · [架构](docs/architecture.md) · [隐私](docs/privacy.md) · [安全报告](SECURITY.md)

## 许可

Copyright © 2026 HappyAny。以 [GPL-3.0-only](LICENSE) 发布，不代表 Unity 官方产品或与 Unity 有从属关系。依赖保留各自许可。
