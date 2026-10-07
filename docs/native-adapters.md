# 原生文本接入

## 内置原生组件适配器

匹配已核对的 IL2CPP WebAssembly 构建时，资源规则可以留空。先选择 Profile、授权实际页面及嵌入框架，然后刷新页面，让适配器在引擎初始化前接入。弹出菜单会显示「原生组件适配已就绪」。未知构建不会套用其他版本的内存地址。

适配器只在经过确认的字符串和组件函数入口读取文本，不进行整个堆的字符串扫描；译文通过原来的 TextMeshPro 赋值函数回写。托管 GC 句柄保护当前组件和原文，组件停用或销毁时释放。旧句、已销毁组件和旧 Profile 的异步结果不再回写。

剧情气泡在初始化时绑定完整句子；逐帧显示的短前缀不会另发翻译请求。异步译文到达时，通过原有气泡初始化函数生成译文的逐字显示。下一句开始、组件关闭或 Profile 变化后，旧结果不再写入。

Naninovel RevealableText 在完整渲染字符串赋值时绑定对白，角色名提供历史参考中的说话人。异步译文只刷新文本渲染层，并按新字数恢复原来的显示进度；原始剧情、配音控制和历史记录保持由应用处理。脚本预读仅处理有界的普通文本行，跳过指令和表达式；已编译脚本仍在实际显示时翻译。

界面适配还覆盖已核对构建的旧版 `UnityEngine.UI.Text`、TextMeshPro 的公共文字处理入口，以及场景中的 TextMeshPro 生命周期。后者可以读取直接 `SetText`、格式化数值、StringBuilder 和字符数组生成的完整文本。旧版 UI.Text 优先使用能够显示译文的原字体；缺字时，通过原生 `Font` 的文件路径构造函数加载同一份内置字体，并请求、检查探测字形。实际字形和排版需要在客户端确认。字号、样式与颜色保持原组件的设置，两类组件不会混用字体函数。字体构造入口依据[Unity 官方参考源码](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Modules/TextRendering/TextRendering.bindings.cs)，并核对实际模块的函数签名。

剧情脚本预读用于准备缓存；显示顺序和历史参考仍以实际文字绑定为准。资源包、目录和网络校验值保持原样。尚未匹配的 Unity 版本、其他文字组件和图片文字仍需要适配。

内置组件适配器随扩展加载 OFL 1.1 许可的中文字体，不联网下载。字体只写入当前引擎的内存文件系统，使用原生 TextMeshPro 动态图集渲染译文；暂停、恢复原文或释放绑定时恢复原字体。覆盖基本多文种平面内的 30,445 个字符；字形覆盖和实际排版仍需要按画面验证。其他接入路径不自动替换字体。详见[字体来源和许可](../extension/fonts/README.md)。

WebAssembly 适配的自动测试覆盖函数分派、原函数保留、指纹不匹配回退、UTF-16 字符串、GC 句柄释放和过期结果；不能代替实际游戏的显示及玩法验证。

## JSON 资源

先在浏览器开发者工具确认文本资源的实际 URL、编码和字段。规则只是解析声明，不是要执行的代码；不支持自定义 JavaScript。

```json
[
  {
    "url": "/StreamingAssets/story/*.json",
    "fields": [
      { "path": "lines[*].text", "kind": "story", "speaker": "speaker" },
      { "path": "lines[*].speaker", "kind": "name" },
      { "path": "choices[*].label", "kind": "story" }
    ]
  },
  {
    "url": "https://assets.example.test/localization/menu.json",
    "fields": [{ "path": "labels[*].text", "kind": "ui" }]
  }
]
```

- `url` 为当前框架域名下的绝对路径，或固定 HTTP(S) 域名的完整 URL；`*` 匹配路径。不匹配查询参数和片段，规则不得包含凭据。
- `path` 支持对象键、数组下标和 `[*]`。例如 `chapters[0].lines[*].text`。不递归改写所有字符串。
- `kind` 只能为 `story`、`name` 或 `ui`。姓名随剧情开关，界面字段随界面开关。
- `speaker` 可选，表示与文本同一对象中的姓名字段，为模型提供当前说话人。载入文件的先后顺序不能证明对白已播放，因此 JSON 预载不会产生历史参考。

仅支持成功 GET 的 UTF-8 JSON 响应。异步 XHR 支持 text / json / arraybuffer；同步 XHR、POST、部分响应、图片、二进制包和 WASM 不改写。匹配 XHR 的完成事件会在翻译完成后异步重发；应用若要求可信原生事件，应使用文本桥或其他适配。未匹配请求保持原生事件流程。

每个资源最多 1 MiB、10000 个 JSON 节点、64 层、32 条文本；每条最多 2000 字符，最多 20 条规则。超过限制时整个资源使用原文，缩小字段范围后重试。资源拦截最多等待 15 秒；超时、无权限、接口失败、暂停或配置变化均回退。后台已完成的译文可被后续请求复用。

原始字符串 token 是替换范围，其他 JSON 字节保持不变。不会通过 `JSON.stringify` 整个原资源，从而保留大整数 ID、小数精度表示、重复键、控制命令和空白。XHR 的 `responseType = json` 本来就由浏览器解析成对象，其数字语义仍遵循浏览器 JSON 解析规则。

保存规则后刷新页面。首次授权后的临时注入无法改写已经读入 Unity 的数据，也无法拦截之前保存的原始网络函数。已经通过响应读取的文本无法通用地追踪回 Unity 组件，暂停或切换 Profile 后刷新才能全面更新这部分文字。

## Unity 文本桥

这条路径用于自己能修改的 Unity 项目，不能直接给已编译的第三方成品补上 C# 方法。

1. 把 [UnityWebTranslator.jslib](../examples/unity/UnityWebTranslator.jslib) 放到 `Assets/Plugins/WebGL/`。
2. 把 [UnityWebTextBridge.cs](../examples/unity/UnityWebTextBridge.cs) 加入 Unity 项目。
3. 创建一个唯一命名的 GameObject，添加 `UnityWebTextBridge`。名称应在 80 字符以内，每个组件使用不同的 GameObject 名称。
4. 在 `onText` 事件中连接实际 UI.Text / TextMeshPro 组件的 text 属性，或自己的文本赋值方法。
5. 将原本的 `label.text = dialogue` 改为 `bridge.ShowDialogue(dialogue, speaker)`。设置 `kind` 区分剧情、姓名或菜单。
6. 切换剧情时设置组件的 `sceneId`。目标字体与换行布局由游戏自己处理。

未安装扩展时先显示原文；翻译失败也保留原文。结果通过 `Module.SendMessage` 调用本项目组件的 `OnTranslation`，组件校验请求 ID，避免旧句覆盖新句。异步任务不持有 WASM 堆指针、不扫描或改写托管内存。

只要页面已经授权并绑定 Profile，也可从已有的 JavaScript 文本接口使用：

```js
// Your native text setter, supplied by your application.
const release = window.UnityWebTranslator.bind(
  'dialogue-slot',
  originalText,
  text => gameTextApi.setText(text),
  { kind: 'story', speaker: speakerName, scene: sceneId }
);
// Dispose when this native text slot is no longer active.
release();
```

`bind` 只在仍有效的当前文字真正回写后记录历史。最多保留设置的最近句数，不持久保存；场景、Profile、目标语言、翻译服务变化和关闭参考时清空。最多 256 个绑定。暂停时恢复原文，恢复翻译时重译当前绑定。

`translate(text, options)` 返回译文 Promise。对于由应用自己赋值的接口，只有确认会显示该句时才使用 `recordHistory: true`；默认不自动记录。`resetHistory()` 可主动清除场景参考。

官方接口依据：[Unity 浏览器脚本交互](https://docs.unity3d.com/Manual/webgl-interactingwithbrowserscripting.html)、[JavaScript 插件](https://docs.unity3d.com/Manual/web-interacting-browser-js.html)、[SendMessage](https://docs.unity3d.com/Manual/web-interacting-browser-unity-to-js.html)。本项目不认为 `SendMessage` 能读取任意编译后的 Text 组件。

## 诊断与验证边界

弹出菜单显示各授权框架上报的计数与最近资源路径。诊断仅存在扩展后台内存，最多 128 个框架，2 分钟过期；不记录资源查询参数、密钥或对白全文。页面本身可以伪造自己的状态，诊断不构成受信的引擎证明。

仓库测试验证 JSON/XHR/文本桥协议与真实后台和缓存之间的调用流程。尚未提供已编译的 Unity 示例构建，C# 需自行在 Unity 编辑器内编译。成功跑通协议不能证明某一第三方应用已经适配。
