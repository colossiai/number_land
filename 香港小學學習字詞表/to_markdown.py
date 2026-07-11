# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
把 out/characters.csv、out/words.csv 轉成方便在 GitHub 上瀏覽的 Markdown 表格。
=====================================================================================

GitHub 會直接渲染 Markdown 表格。為免單一巨表過大（GitHub 對過大檔案會改顯示原始
碼），本工具按「總筆畫數」分節，並在檔首附目錄 (TOC) 方便跳轉；字詞語則另存於
words/ 子目錄（每個筆畫一檔），每檔皆小、渲染穩定。

目錄結構
--------
    number_land/                     # 版本庫根目錄
    ├── word-crawler/
    │   └── out/                     # crawl_lexlist.py 匯出的 CSV（輸入）
    │       ├── characters.csv
    │       └── words.csv
    └── 香港小學學習字詞表/           # 本工具與其 Markdown 輸出（本檔所在目錄）
        ├── to_markdown.py
        ├── characters.md
        └── words/stroke-NN.md

用法
----
    uv run 香港小學學習字詞表/to_markdown.py    # 於版本庫根目錄執行
    # 預設由 ../word-crawler/out 讀 CSV，Markdown 寫回本檔所在目錄；
    # 可用 --csv-dir/--md-dir 覆寫
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path


def read_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def md_cell(text: str) -> str:
    """Escape a value so it is safe inside a Markdown table cell."""
    return text.replace("|", "\\|").replace("\n", " ").strip()


def stroke_key(row: dict) -> int:
    s = row.get("筆畫", "")
    return int(s) if s.isdigit() else 0


def anchor(stroke: int) -> str:
    # Must match GitHub's auto-generated slug for a heading "## N 畫".
    return f"{stroke}-畫"


def write_characters(rows: list[dict], out_dir: Path) -> Path:
    rows = sorted(rows, key=lambda r: (stroke_key(r), r["id"]))
    strokes = sorted({stroke_key(r) for r in rows})

    ks1 = sum(1 for r in rows if r["學習階段"] == "第一學習階段")
    ks2 = sum(1 for r in rows if r["學習階段"] == "第二學習階段")

    lines: list[str] = []
    lines.append("# 香港小學學習字詞表 — 全部字（按筆畫瀏覽）\n")
    lines.append(
        f"共 **{len(rows)}** 字："
        f"第一學習階段 **{ks1}**、第二學習階段 **{ks2}**。"
        f"每字的相關詞語（連逐詞拼音／粵拼／階段）見 "
        f"[`words/`](words/) 目錄。\n"
    )
    lines.append("> 小技巧：在 GitHub 檔案頁按 <kbd>t</kbd>／<kbd>/</kbd> 或瀏覽器 "
                 "<kbd>Ctrl/⌘</kbd>+<kbd>F</kbd> 可快速搜尋。\n")

    # TOC — links rely on GitHub's auto-generated heading slugs.
    lines.append("## 目錄\n")
    toc = "  ".join(
        f"[{s} 畫](#{anchor(s)})"
        for s in strokes
    )
    lines.append(toc + "\n")

    header = ("| 字 | id | 部首 | 普通話拼音 | 粵拼 | 學習階段 | 詞數 | 相關詞語 |\n"
              "| :-: | :-- | :-: | :-- | :-- | :-- | --: | :-- |")
    for s in strokes:
        group = [r for r in rows if stroke_key(r) == s]
        lines.append(f"\n## {s} 畫\n")
        lines.append(f"（{len(group)} 字）\n")
        lines.append(header)
        for r in group:
            lines.append(
                "| {字} | {id} | {部首} | {普通話拼音} | {粵拼} | {學習階段} "
                "| {詞數} | {相關詞語} |".format(
                    字=md_cell(r["繁體字"]),
                    id=r["id"],
                    部首=md_cell(r["部首"]),
                    普通話拼音=md_cell(r["普通話拼音"]),
                    粵拼=md_cell(r["粵拼"]),
                    學習階段=r["學習階段"].replace("學習階段", ""),  # 第一 / 第二
                    詞數=r["相關詞語數目"],
                    相關詞語=md_cell(r["相關詞語"]) or "—",
                )
            )
        lines.append("\n[↑ 回目錄](#目錄)")

    path = out_dir / "characters.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def write_words(char_rows: list[dict], word_rows: list[dict], out_dir: Path) -> Path:
    # map 字id -> 筆畫 so words can be grouped by their head char's stroke count
    stroke_of = {c["id"]: stroke_key(c) for c in char_rows}
    words_dir = out_dir / "words"
    words_dir.mkdir(parents=True, exist_ok=True)

    by_stroke: dict[int, list[dict]] = {}
    for w in word_rows:
        by_stroke.setdefault(stroke_of.get(w["字id"], 0), []).append(w)

    header = ("| 字 | 相關詞語 | 普通話拼音 | 粵拼 | 學習階段 |\n"
              "| :-: | :-- | :-- | :-- | :-- |")

    index: list[str] = ["# 相關詞語（按字的筆畫分檔）\n"]
    index.append(f"共 **{len(word_rows)}** 條詞語列。每個筆畫一個檔案：\n")

    for s in sorted(by_stroke):
        group = sorted(by_stroke[s], key=lambda w: (w["字id"], w["相關詞語"]))
        fname = f"stroke-{s:02d}.md"
        lines = [f"# {s} 畫的字 — 相關詞語（{len(group)} 條）\n",
                 "[← 返回字詞語目錄](README.md)　·　"
                 "[字表](../characters.md#" + anchor(s) + ")\n",
                 header]
        for w in group:
            lines.append(
                "| {字} | {詞} | {py} | {jp} | {ph} |".format(
                    字=md_cell(w["繁體字"]),
                    詞=md_cell(w["相關詞語"]),
                    py=md_cell(w["普通話拼音"]),
                    jp=md_cell(w["粵拼"]),
                    ph=w["學習階段"].replace("學習階段", ""),
                )
            )
        (words_dir / fname).write_text("\n".join(lines) + "\n", encoding="utf-8")
        index.append(f"- [{s} 畫（{len(group)} 條）](./{fname})")

    idx_path = words_dir / "README.md"
    idx_path.write_text("\n".join(index) + "\n", encoding="utf-8")
    return idx_path


def main() -> int:
    here = Path(__file__).resolve().parent          # …/香港小學學習字詞表
    ap = argparse.ArgumentParser(description="把 CSV 轉成 GitHub 可瀏覽的 Markdown")
    ap.add_argument("--csv-dir", default=str(here.parent / "word-crawler" / "out"),
                    help="CSV 輸入目錄（預設 ../word-crawler/out）")
    ap.add_argument("--md-dir", default=str(here),
                    help="Markdown 輸出目錄（預設本檔所在目錄）")
    args = ap.parse_args()

    csv_dir = Path(args.csv_dir)
    md_dir = Path(args.md_dir)
    md_dir.mkdir(parents=True, exist_ok=True)
    char_rows = read_rows(csv_dir / "characters.csv")
    word_rows = read_rows(csv_dir / "words.csv")

    cpath = write_characters(char_rows, md_dir)
    wpath = write_words(char_rows, word_rows, md_dir)

    print(f"已輸出：\n  {cpath}\n  {wpath} (+ words/stroke-NN.md)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
