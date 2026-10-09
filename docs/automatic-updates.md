# 更新兼容机制 / Automatic compatible updates

从 v0.2.22 起，整份 WASM 的 SHA-256 只用于快速匹配已核对构建。未命中时，扩展会自动识别已支持适配器的兼容更新。用户无需填写文件指纹或函数编号，也无需重新创建 Profile。更新扩展时仍应覆盖原目录，保留原扩展及设置。

## 如何识别

- 解析 WASM 的类型、导入、函数、代码、函数表、导出与静态数据区，不扫描运行时堆。
- 对函数生成结构描述，忽略重排后的函数编号、类型编号与重定位的静态地址；保留参数和返回值类型、控制流程、字段访问偏移、局部变量、小常量、同一静态指针的重复使用及原生调用名称。
- 快速索引只筛选候选，再以 SHA-256 校验结构。辅助函数的调用特征、已知函数之间的调用关系，以及多个已确认的函数表邻居共同消除歧义。
- 字体和文本类型地址从独立的已匹配探针重新取得，检查重复引用一致、地址边界、对齐和 IL2CPP 类型槽标记。不会直接使用旧地址。
- 仅处理参数、不读取渲染器内部字段的剧情入口，可沿已验证调用点定位；参数类型必须保持一致，原生渲染器的新实现仍被保留。

所有必需入口都通过后才改写模块。候选有歧义、字段或接口不兼容、结构无法解析，以及 Profile 停用时，执行原始模块。保留原有逐字显示、预翻译、暂停、GC 生命周期和字体检查。

它覆盖的是已支持适配器的兼容更新。换引擎、改写文字组件或改变字段布局仍可能需要维护适配器；不能据此承诺翻译任意 Unity 网页或覆盖所有文字。

## 已完成的验证

四种既有适配器均在关闭完整指纹查询后重新定位，并核对全部入口、辅助函数、字体与文本布局参数，再重写和编译完整模块。

| 适配器模板 | 文字与生命周期入口 | 辅助函数 |
| --- | ---: | ---: |
| 模板 A | 25 | 26 |
| 模板 B | 18 | 33 |
| 模板 C | 18 | 32 |
| 模板 D | 12 | 19 |

另以模板 A 的旧模块生成规则，单独提供旧模板识别它的更新模块，排除更新模块的完整指纹和专用计划。51 个函数及字体类型地址均与独立核对的结果一致，重写后的完整 WASM 编译成功。此更新同时改变了整体哈希、函数编号、静态地址及两处渲染器内部实现；没有把新编号写入这次识别规则。其余三个模板目前只有原始构建和模拟更新验证，尚无各自第二个真实版本的验证证据。

在当前开发机上，五次完整模块的结构识别约需 2–4 秒；这是启动阶段的本机测量，不保证其他设备的时间。已知完整指纹仍走快速路径。

可分发的回归测试只使用项目自己构造的 WASM，覆盖函数、类型、导入和导出名重排，字体地址移动，调用点后的实现变化，生命周期歧义，字段及类型槽变化，强摘要失败，识别过程中停用 Profile，以及不兼容模块保持原行为。客户端二进制不随仓库或发布包分发。

这些检查证明定位与改写机制，不替代更新扩展后的实际字体、排版和玩法验证。

## 维护规则

规则只包含不透明摘要、接口角色、关系及经过核对的布局配置。维护者可从本地已核对的模块重新生成：

```sh
node scripts/generate-native-profiles.mjs --output extension/native-profiles.js verified-a.wasm verified-b.wasm verified-c.wasm verified-d.wasm
npm run check
npm test
npm run build
```

生成器要求模块已有人工核对的入口和布局计划，拒绝把未知模块直接当作新适配器。客户端模块与元数据应留在本地，不提交到公开仓库。

## English

Full-module hashes remain a fast path. Unlisted modules are automatically matched to the four supported adapter families through canonical function SHA-256 digests, ABI, call edges, several table anchors, pointer-reuse patterns and relocated metadata type probes. Function/type/import numbering and static addresses can change without requiring a new hard-coded build entry. Argument-only story hooks can follow an unchanged verified caller while preserving a changed renderer body.

All required roles must resolve before patching. Ambiguity, incompatible fields/types or an inactive profile retain the original module. This supports compatible updates of existing adapters; it does not establish compatibility with arbitrary Unity versions or new text components.

All four original modules pass structural resolution and compilation without exact-hash lookup. An independently checked update of template A also resolves all 25 hooks, 26 helpers and its font address using only the older template. The other three families have original-build and synthetic-update checks only. Actual rendering and gameplay remain separate verification steps. No client binaries or source bodies are distributed in these rules.
