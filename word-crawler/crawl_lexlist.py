# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.31",
#     "beautifulsoup4>=4.12",
#     "lxml>=5.0",
#     "truststore>=0.9",
# ]
# ///
"""
香港小學學習字詞表 抓取工具 (HK Primary School Learning Chinese Lexical List crawler)
=====================================================================================

自動從教育局《香港小學學習字詞表》網上查詢系統
(https://www.edbchinese.hk/lexlist_ch/) 抓取全部學習字詞，並匯出 CSV。

背景
----
該查詢系統的資料庫其實是《常用字字形表》4,762 字，其中屬《香港小學學習字詞表》的字
（本次抓取實得 3,129 字）。凡屬字詞表的字，其結果頁都會出現「小學學習字詞表」表格
(id="tblCi")，並以 ks1 / ks2 標示第一 / 第二學習階段；不屬字詞表的字（如「宋」）則
只有《常用字字形表》附表，沒有學習階段。本工具即以查詢系統實際回傳的 tblCi 表為準，
逐字判定並只匯出屬字詞表的字，不預設固定字數（坊間「3,171 字」為官方概述，與線上
系統即時結果略有出入）。

抓取流程
--------
1. 以「總筆畫數」1–32 逐一查詢 charlist.jsp，列舉資料庫全部字的 id（去重）。
2. 逐一抓取 result.jsp?id=XXXX 詳細頁，解析：
   繁體字、部首、筆畫、普通話拼音、粵拼、學習階段、相關詞語（連拼音、階段）。
3. 只保留屬《香港小學學習字詞表》的字，匯出兩個 CSV：
   - characters.csv  每字一列（含相關詞語匯總）
   - words.csv       每個相關詞語一列（長格式，保留逐詞拼音與階段）

原始 HTML 會快取到本機，方便斷點續抓與重複解析，亦避免對教育局伺服器造成負擔。

用法
----
    uv run crawl_lexlist.py                 # 完整抓取，輸出到 ./out/
    uv run crawl_lexlist.py --limit 50      # 只抓前 50 個字（測試用）
    uv run crawl_lexlist.py --workers 4 --delay 0.3
    uv run crawl_lexlist.py --out mydir --keep-non-list   # 連非字詞表的字一併匯出
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.edbchinese.hk/lexlist_ch"
CHARLIST_URL = BASE + "/charlist.jsp"
RESULT_URL = BASE + "/result.jsp"
UA = "Mozilla/5.0 (compatible; lexlist-crawler/1.0; educational use)"

PHASE_NAME = {"ks1": "第一學習階段", "ks2": "第二學習階段"}


# --------------------------------------------------------------------------- #
# Data model
# --------------------------------------------------------------------------- #
@dataclass
class Word:
    word: str
    pinyin: str
    jyutping: str
    phase: str  # 第一學習階段 / 第二學習階段


@dataclass
class CharEntry:
    id: str
    char: str = ""
    radical: str = ""          # 部首, e.g. 一
    stroke: str = ""           # 總筆畫數, e.g. 3
    pinyin: str = ""           # 普通話拼音 (可多讀音，以 ；分隔)
    jyutping: str = ""         # 粵拼 (可多讀音，以 ；分隔)
    phase: str = ""            # 學習階段 (該字所屬)
    examples: str = ""         # 字例，如 ①上山 ②上月
    in_list: bool = False      # 是否屬《香港小學學習字詞表》
    words: list[Word] = field(default_factory=list)  # 相關詞語


# --------------------------------------------------------------------------- #
# HTTP with cache + retry
# --------------------------------------------------------------------------- #
class Fetcher:
    def __init__(self, cache_dir: Path, delay: float, retries: int = 3,
                 verify: bool = True):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = UA
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay = delay
        self.retries = retries
        self.verify = verify

    def get(self, url: str, params: dict, cache_key: str) -> str:
        cache_file = self.cache_dir / cache_key
        if cache_file.exists() and cache_file.stat().st_size > 0:
            return cache_file.read_text(encoding="utf-8")

        last_err: Exception | None = None
        for attempt in range(self.retries):
            try:
                resp = self.session.get(url, params=params, timeout=30,
                                         verify=self.verify)
                resp.encoding = "utf-8"
                if resp.status_code == 200 and resp.text:
                    cache_file.write_text(resp.text, encoding="utf-8")
                    if self.delay:
                        time.sleep(self.delay)
                    return resp.text
                last_err = RuntimeError(f"HTTP {resp.status_code}")
            except requests.RequestException as e:
                last_err = e
            time.sleep(1.0 + attempt * 1.5)
        raise RuntimeError(f"failed to fetch {url} {params}: {last_err}")


# --------------------------------------------------------------------------- #
# Parsing helpers
# --------------------------------------------------------------------------- #
_ID_RE = re.compile(r"result\.jsp\?id=(\d+)")
_STROKE_RE = re.compile(r"(\d+)\s*畫")


def enumerate_ids(fetcher: Fetcher) -> list[tuple[str, str]]:
    """Return sorted unique (id, char) via stroke-count listing 1..32."""
    found: dict[str, str] = {}
    for stk in range(1, 33):
        html = fetcher.get(
            CHARLIST_URL,
            {"searchMethod": "stk", "searchCriteria": str(stk)},
            f"charlist_stk_{stk:02d}.html",
        )
        soup = BeautifulSoup(html, "lxml")
        for a in soup.select("td.zht a[href]"):
            m = _ID_RE.search(a["href"])
            if m:
                found[m.group(1).zfill(4)] = a.get_text(strip=True)
        print(f"  筆畫 {stk:>2}: 累計 {len(found)} 字", file=sys.stderr)
    return sorted(found.items())


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def _parse_radical_stroke(soup: BeautifulSoup) -> tuple[str, str]:
    """Radical (部首) and total stroke count from the top summary table."""
    radical = stroke = ""
    header = soup.find(lambda t: t.name == "td" and t.get_text(strip=True) == "部首")
    if header:
        row = header.find_parent("tr")
        nxt = row.find_next_sibling("tr") if row else None
        if nxt:
            cells = nxt.find_all("td")
            if len(cells) >= 2:
                radical = _clean(cells[0].get_text())
                radical = re.sub(r"部$", "", radical)  # 一部 -> 一
                sm = _STROKE_RE.search(cells[1].get_text())
                stroke = sm.group(1) if sm else _clean(cells[1].get_text())
    return radical, stroke


def _parse_char_sound(soup: BeautifulSoup) -> tuple[str, str]:
    """Character-level 普通話拼音 and 粵拼 from the 字音 block."""
    pinyin = jyutping = ""

    py_cell = soup.find("td", class_="pinyin12")
    if py_cell:
        # readings separated by <br>
        parts = [
            _clean(seg)
            for seg in py_cell.get_text("\n").split("\n")
        ]
        pinyin = "；".join(p for p in parts if p)

    # jyutping: each reading in a span.jyutping12, optional 〔..〕 annotation follows
    jps: list[str] = []
    for span in soup.find_all("span", class_="jyutping12"):
        val = _clean(span.get_text())
        if not val:
            continue
        annot = ""
        sib = span.next_sibling
        while sib is not None:
            txt = sib.get_text() if hasattr(sib, "get_text") else str(sib)
            m = re.search(r"〔[^〕]*〕", txt)
            if m:
                annot = m.group(0)
                break
            if hasattr(sib, "name") and sib.name == "br":
                break
            sib = sib.next_sibling
        jps.append(val + annot)
    jyutping = "；".join(jps)
    return pinyin, jyutping


def _row_readings(row) -> tuple[str, str]:
    py = row.find("div", class_="pinyinGreen")
    jp = row.find("div", class_="jyutpingGreen")
    return (
        _clean(py.get_text()) if py else "",
        _clean(jp.get_text()) if jp else "",
    )


def _parse_wordlist(soup: BeautifulSoup, char: str) -> tuple[str, str, str, list[Word]]:
    """Parse the 小學學習字詞表 table (id=tblCi).

    Returns (char_phase, examples, in_list, words). char_phase == '' means the
    character has no 學習字詞表 table (i.e. not part of the 3,171-char list).
    """
    table = soup.find("table", id="tblCi")
    if table is None:
        return "", "", False, []

    words: list[Word] = []
    char_phase = ""
    examples = ""
    phases_seen: list[str] = []

    for row in table.find_all("tr"):
        cls = row.get("class") or []
        phase_key = "ks1" if "ks1" in cls else "ks2" if "ks2" in cls else ""
        if not phase_key:
            continue  # header / radio-button rows
        phases_seen.append(phase_key)

        ci = row.find("td", class_="ci")
        ctx = row.find("td", class_="context")
        if ctx is not None:
            # usage examples for the head character, e.g. ①上山 ②上月
            if not examples:
                examples = _clean(ctx.get_text())
            continue
        if ci is None:
            continue
        text = _clean(ci.get_text())
        if not text or text == " ":
            continue

        if text == char:
            # the head single-character entry -> defines the char's phase
            if not char_phase:
                char_phase = PHASE_NAME[phase_key]
            continue

        py, jp = _row_readings(row)
        words.append(Word(text, py, jp, PHASE_NAME[phase_key]))

    if not char_phase and phases_seen:
        # char has no standalone entry (e.g. 狐 -> 狐狸); use earliest phase
        earliest = "ks1" if "ks1" in phases_seen else "ks2"
        char_phase = PHASE_NAME[earliest]

    return char_phase, examples, True, words


def parse_result(html: str, entry: CharEntry) -> CharEntry:
    soup = BeautifulSoup(html, "lxml")
    entry.radical, entry.stroke = _parse_radical_stroke(soup)
    entry.pinyin, entry.jyutping = _parse_char_sound(soup)
    phase, examples, in_list, words = _parse_wordlist(soup, entry.char)
    entry.phase = phase
    entry.examples = examples
    entry.in_list = in_list
    entry.words = words
    return entry


# --------------------------------------------------------------------------- #
# Crawl driver
# --------------------------------------------------------------------------- #
def crawl(fetcher: Fetcher, ids: list[tuple[str, str]], workers: int) -> list[CharEntry]:
    def work(item: tuple[str, str]) -> CharEntry:
        cid, char = item
        entry = CharEntry(id=cid, char=char)
        html = fetcher.get(
            RESULT_URL,
            {"id": cid, "sortBy": "stroke", "jpC": "lshk"},
            f"result_{cid}.html",
        )
        return parse_result(html, entry)

    results: list[CharEntry] = []
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(work, it): it for it in ids}
        for fut in as_completed(futures):
            cid, char = futures[fut]
            try:
                results.append(fut.result())
            except Exception as e:  # noqa: BLE001
                print(f"  [WARN] id={cid} {char}: {e}", file=sys.stderr)
            done += 1
            if done % 100 == 0 or done == len(ids):
                print(f"  已抓取 {done}/{len(ids)}", file=sys.stderr)
    results.sort(key=lambda e: e.id)
    return results


# --------------------------------------------------------------------------- #
# CSV output
# --------------------------------------------------------------------------- #
CHAR_FIELDS = [
    "id", "繁體字", "部首", "筆畫", "普通話拼音", "粵拼",
    "學習階段", "字例", "相關詞語數目", "相關詞語",
]
WORD_FIELDS = [
    "字id", "繁體字", "相關詞語", "普通話拼音", "粵拼", "學習階段",
]


def write_characters(path: Path, entries: list[CharEntry]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(CHAR_FIELDS)
        for e in entries:
            w.writerow([
                e.id, e.char, e.radical, e.stroke, e.pinyin, e.jyutping,
                e.phase, e.examples, len(e.words),
                "、".join(wd.word for wd in e.words),
            ])


def write_words(path: Path, entries: list[CharEntry]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(WORD_FIELDS)
        for e in entries:
            for wd in e.words:
                w.writerow([e.id, e.char, wd.word, wd.pinyin, wd.jyutping, wd.phase])


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(
        description="抓取《香港小學學習字詞表》全部字詞並匯出 CSV",
    )
    ap.add_argument("--out", default="out", help="輸出目錄 (預設 ./out)")
    ap.add_argument("--cache-dir", default="cache", help="HTML 快取目錄 (預設 ./cache)")
    ap.add_argument("--workers", type=int, default=6, help="並發數 (預設 6)")
    ap.add_argument("--delay", type=float, default=0.15,
                    help="每次網絡請求後的延遲秒數 (預設 0.15，讀快取時不生效)")
    ap.add_argument("--limit", type=int, default=0,
                    help="只處理前 N 個字 (測試用，0 表示全部)")
    ap.add_argument("--keep-non-list", action="store_true",
                    help="連非《字詞表》的字（僅《常用字字形表》）一併匯出")
    ap.add_argument("--insecure", action="store_true",
                    help="停用 TLS 憑證驗證（最後手段）")
    args = ap.parse_args()

    # EDB 伺服器的憑證鏈需用作業系統信任庫驗證；改用 truststore（同 curl / 瀏覽器）。
    verify = not args.insecure
    if verify:
        try:
            import truststore
            truststore.inject_into_ssl()
        except Exception as e:  # noqa: BLE001
            print(f"  [WARN] 無法載入 truststore（{e}），沿用預設憑證庫。",
                  file=sys.stderr)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    fetcher = Fetcher(Path(args.cache_dir), args.delay, verify=verify)

    print("步驟 1/3：以筆畫列舉全部字 id …", file=sys.stderr)
    ids = enumerate_ids(fetcher)
    if args.limit:
        ids = ids[: args.limit]
    print(f"共 {len(ids)} 個字待抓取。", file=sys.stderr)

    print("步驟 2/3：抓取並解析詳細頁 …", file=sys.stderr)
    entries = crawl(fetcher, ids, args.workers)

    in_list = [e for e in entries if e.in_list]
    export = entries if args.keep_non_list else in_list

    print("步驟 3/3：匯出 CSV …", file=sys.stderr)
    char_csv = out_dir / "characters.csv"
    word_csv = out_dir / "words.csv"
    write_characters(char_csv, export)
    write_words(word_csv, export)

    total_words = sum(len(e.words) for e in export)
    print(
        f"\n完成！\n"
        f"  資料庫（常用字字形表）字數：{len(entries)}\n"
        f"  《香港小學學習字詞表》字數：{len(in_list)}\n"
        f"    ├─ 第一學習階段：{sum(1 for e in in_list if e.phase == '第一學習階段')}\n"
        f"    └─ 第二學習階段：{sum(1 for e in in_list if e.phase == '第二學習階段')}\n"
        f"  相關詞語總數（已匯出）：{total_words}\n"
        f"  輸出：{char_csv}\n"
        f"        {word_csv}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
