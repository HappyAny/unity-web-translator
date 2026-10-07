# Chinese fallback font

`cjk-fallback.ttf` is a static weight 500, BMP subset of Noto Sans SC, renamed
**Unity Translator CJK**. It includes 30,445 Unicode characters. It is loaded only
by a compatible native text adapter and uses Unity's own text renderer.

Source: https://github.com/google/fonts/tree/main/ofl/notosanssc

License: SIL Open Font License 1.1, included in `OFL.txt`. This font retains its
own license; the extension's GPL-3.0-only license does not replace it.

To reproduce, use fontTools to instantiate `NotoSansSC[wght].ttf` at weight 500,
subset Unicode U+0000–U+FFFF, retain all name records, and rename family,
full-name, PostScript-name and typographic-family records to the names above.
Astral characters outside the BMP and missing source glyphs are not covered.
