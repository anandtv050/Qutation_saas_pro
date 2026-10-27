"""Looks inside a ReportLab PDF (streams are ASCII85 + Flate, which text tools can't grep).

    python tests/pdf_check.py <file.pdf> <#rrggbb> [text that must NOT appear]

Prints one JSON line: {"colour": bool, "forbidden_found": bool, "has_item_code_header": bool}.
`colour` = some fill/stroke colour in the page streams equals the hex (within 0.5%).
"""
import base64
import json
import re
import sys
import zlib


def decode_streams(raw: bytes):
    for m in re.finditer(rb"stream\r?\n(.*?)endstream", raw, re.S):
        body = m.group(1).strip()
        try:
            if body.endswith(b"~>"):
                body = base64.a85decode(body[:-2])
            yield zlib.decompress(body)
        except Exception:
            continue


def main():
    path, hex_colour = sys.argv[1], sys.argv[2].lstrip("#")
    forbidden = sys.argv[3].encode() if len(sys.argv) > 3 else None
    want = [int(hex_colour[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    raw = open(path, "rb").read()
    text = b"\n".join(decode_streams(raw))
    colour = False
    for m in re.finditer(rb"([\d.]+) ([\d.]+) ([\d.]+) (?:rg|RG)", text):
        got = [float(m.group(i)) for i in (1, 2, 3)]
        if all(abs(a - b) < 0.005 for a, b in zip(got, want)):
            colour = True
            break
    print(json.dumps({
        "colour": colour,
        "forbidden_found": bool(forbidden and forbidden in text),
        "has_item_code_header": b"Item Code" in text,
        "streams": text.count(b"BT"),
    }))


main()
