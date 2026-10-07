# Unity Web Translator / Unity Web翻译机

Chrome / Edge extension for native Unity Web text through configured JSON resources, an integrated text bridge, or a fingerprint-matched component adapter.

Installation: enable Developer mode in the browser's extension manager, choose **Load unpacked**, then select this `extension` directory.

在浏览器扩展管理页启用开发者模式，加载当前 `extension` 文件夹。进入设置测试翻译服务，为网页选择 Profile 并授权，配置实际的文本接口后刷新网页。

Compatibility requires a supported native text interface or engine build. Installing the extension or detecting Unity alone is insufficient. No OCR is included. The component adapter leaves resource bundles unchanged and writes translated strings through native text setters.

更新时保留原扩展与原目录，在更新页拖入本项目新版 ZIP，或运行压缩包内的 `update.cmd`，然后重新加载扩展并刷新网页。删除后安装可能丢失设置和缓存。

Documentation and source: https://github.com/HappyAny/unity-web-translator

Copyright (C) 2026 HappyAny. Licensed under GNU GPL v3 only. See the package's `LICENSE` file.
