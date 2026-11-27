"""
Read-only adapter for ashish-jabble/vibe-check (MIT License).
Runs VibeCodingAnalyzer signal detection against pre-captured DOM HTML and CSS/JS assets
without disabling or modifying upstream SSRF protections.
"""

import json
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from requests.structures import CaseInsensitiveDict

VENDOR_DIR = Path(__file__).resolve().parent.parent / "vendor" / "vibe-check-python"
sys.path.insert(0, str(VENDOR_DIR))

from analyzer import VibeCodingAnalyzer, PageData, _compute_tiered_score  # noqa: E402


def run_capture(payload_path: Path) -> dict:
    data = json.loads(payload_path.read_text(encoding="utf-8"))
    pages = []
    for item in data.get("pages", []):
        html = item.get("html") or ""
        headers = CaseInsensitiveDict(item.get("headers") or {})
        soup = BeautifulSoup(html, "lxml")
        pages.append(PageData(item.get("url") or "https://local.invalid/", html, headers, soup))

    if not pages:
        return {"error": "No captured pages supplied to vibecheck_runner.py"}

    asset_text = data.get("asset_text") or ""
    analyzer = VibeCodingAnalyzer()

    # Evaluate all DOM/content/design/accessibility/SEO checks without re-fetching loopback URLs.
    categories = {
        "ai_platforms": analyzer._check_ai_platforms(pages, asset_text),
        "ui_libraries": analyzer._check_ui_libraries(pages, asset_text),
        "frameworks": analyzer._check_frameworks(pages, asset_text),
        "content": analyzer._check_content(pages),
        "code_quality": analyzer._check_code_quality(pages, asset_text),
        "design_patterns": analyzer._check_design_patterns(pages, asset_text),
        "accessibility": analyzer._check_accessibility(pages),
        "seo_quality": analyzer._check_seo(pages),
    }

    all_findings = []
    for cat in categories.values():
        all_findings.extend(cat.findings)

    overall = _compute_tiered_score(all_findings)
    verdict, verdict_emoji = analyzer._get_verdict(overall)
    evidence_summary = analyzer._build_evidence_summary(all_findings)

    return {
        "overall_score": overall,
        "verdict": verdict,
        "verdict_emoji": verdict_emoji,
        "pages_analyzed": len(pages),
        "pages_list": [p.url for p in pages],
        "evidence_summary": evidence_summary,
        "categories": {k: v.to_dict() for k, v in categories.items()},
        "note": "Deployment network probes skipped on local capture to preserve SSRF restrictions.",
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: vibecheck_runner.py <capture.json>"}))
        return 1
    payload_path = Path(sys.argv[1])
    result = run_capture(payload_path)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
