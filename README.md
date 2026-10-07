# Unity Web翻译机

[English](docs/README.en.md) · [下载浏览器插件](https://github.com/HappyAny/unity-web-translator/releases/latest) · GNU GPL v3 only

通过原生文本接口翻译 Unity Web 文字的 Chrome / Edge 扩展。**本项目需要可读取的文本接口，并非安装后就能翻译所有 Unity 网页。**

目前提供两条接入路径：

- **结构化资源**：按 Profile 配置 GET JSON 的资源路径和字符串字段，在 `fetch` / 异步 `XMLHttpRequest` 返回给应用前替换文字。适用于独立加载、未加密的 UTF-8 JSON 文本。
- **Unity 文本桥**：在自己可修改的 Unity 项目中接入 `.jslib` 与 C# 示例，把译文写回原本的 Text / TextMeshPro 等组件。无需增加游戏内悬浮框。

文字只有在实际匹配规则、或应用调用文本桥后才会翻译。Unity 引擎检测只是诊断信息。编译进 WASM、`.data`、AssetBundle 或加密资源中的文字尚不支持；没有接口的第三方成品游戏需要另行适配。首版不包含 OCR。

## 安装与使用

1. 从 [Releases](https://github.com/HappyAny/unity-web-translator/releases/latest) 下载 `unity-web-translator-v版本.zip` 并解压，保留这个目录。
2. 在浏览器扩展管理页打开开发者模式，选择「加载已解压的扩展」，选中其中的 **`extension` 文件夹**。
3. 打开扩展设置，配置共用翻译服务，点击「试译一句」。支持 MyMemory 或 OpenAI 兼容 Chat Completions；API 密钥只保存在扩展中。
4. 为有原生文本接口的网页创建 Profile，按实际文本结构配置资源规则，或在可修改的 Unity 项目中接入文本桥。
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

- 翻译服务、密钥、附加 Body JSON、禁止思考参数、目标语言、插件界面语言和翻译开关共用。
- Profile 独立保存文本规则、额外 Prompt、自动缓存和个人译文。目标语言不同，缓存和修订也分别保存。
- 缓存使用 IndexedDB、SHA-256 请求标识和有界内存 LRU。可导出 JSON，在本地修改后重新导入；个人修订优先。文件不包含密钥。
- 中英文插件界面，七种目标语言。文本桥可按句数参考已经显示的角色名与对白；预载 JSON 不加入历史。
- 小菜单可暂停翻译并切换 Profile。文本桥的当前绑定会恢复原文；已经加载到应用内的 JSON 字符串需要刷新网页才能全面恢复。
- 更新时在插件更新页拖入新版 ZIP，选原来的 `extension` 目录，校验后覆盖并重新加载。也可运行 ZIP 中的 `update.cmd`。**沿用原目录和原扩展，才能保留设置与缓存；不要删除再安装。**

JSON 拦截每次最多 1 MiB / 32 条选定文本，翻译等待最多 15 秒，超时使用原资源。尚未译出的内容可在缓存准备好后刷新重试。原始 JSON 的其他字节，包括大整数 ID、小数表示、重复键和空白布局，保持不变。

字体由 Unity 项目管理。即使替换成功，原字体没有目标语言字形时仍可能显示缺字；本扩展不替换 Unity 字体。

## 开发与验证

需要 Node.js 22+；Windows 更新器验证使用 Python 3。

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

`dist/` 输出可直接加载的插件 ZIP、独立更新页、`SHA256SUMS.txt` 与逐文件校验清单。CI 在 Windows / Linux 执行检查。测试覆盖原生资源替换、XHR 完成事件、扩展后台与页面桥、缓存隔离、暂停、过期结果、权限、个人修订和更新回滚。Unity C# 示例需在自己的 Unity 项目中编译和验证；本仓库的自动测试不等价于真实游戏兼容性验证。

[Unity SDK 示例](examples/unity/) · [英文说明](docs/README.en.md) · [架构](docs/architecture.md) · [隐私](docs/privacy.md) · [安全报告](SECURITY.md)

## 许可

Copyright © 2026 HappyAny。以 [GPL-3.0-only](LICENSE) 发布，不代表 Unity 官方产品或与 Unity 有从属关系。依赖保留各自许可。
