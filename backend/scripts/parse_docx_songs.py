#!/usr/bin/env python3
import argparse
import html
import json
import re
import zipfile
from xml.etree import ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
W_NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R_NS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
REL_NS = '{http://schemas.openxmlformats.org/package/2006/relationships}'

TITLE_STYLE_NAMES = {'heading 1', 'heading 2'}
SONGWRITER_STYLE_NAMES = {'heading 3'}
SECTION_RE = re.compile(r'^(verse|chorus|bridge|refrain|tag|pre-chorus|intro|outro)\b', re.IGNORECASE)
TRACK_RE = re.compile(r'^\s*(\d{1,3})\s*[\).:-]\s*(.+)$')
YOUTUBE_URL_RE = re.compile(
    r'https?://(?:www\.)?(?:youtube\.com|youtu\.be|music\.youtube\.com)/[^\s<>"\']+',
    re.IGNORECASE,
)


def normalize_style(style_name: str) -> str:
    return (style_name or '').strip().lower()


def parse_styles(styles_xml: bytes):
    style_map = {}
    if not styles_xml:
        return style_map

    root = ET.fromstring(styles_xml)
    for style in root.findall('w:style', NS):
        style_id = style.attrib.get(f'{W_NS}styleId', '')
        name_node = style.find('w:name', NS)
        style_name = name_node.attrib.get(f'{W_NS}val', '') if name_node is not None else ''
        if style_id:
            style_map[style_id] = style_name
    return style_map


def parse_relationships(rels_xml: bytes):
    relationships = {}
    if not rels_xml:
        return relationships

    root = ET.fromstring(rels_xml)
    for rel in root.findall(f'{REL_NS}Relationship'):
        rel_id = rel.attrib.get('Id')
        target = rel.attrib.get('Target')
        if rel_id and target:
            relationships[rel_id] = target
    return relationships


def is_enabled(prop):
    if prop is None:
        return False
    val = prop.attrib.get(f'{W_NS}val')
    if val is None:
        return True
    return val.lower() not in {'0', 'false', 'off', 'no'}


def run_to_html(run):
    rpr = run.find('w:rPr', NS)
    bold = is_enabled(rpr.find('w:b', NS)) if rpr is not None else False
    italic = is_enabled(rpr.find('w:i', NS)) if rpr is not None else False

    pieces = []
    for child in list(run):
        tag = child.tag
        if tag == f'{W_NS}t':
            pieces.append(html.escape(child.text or ''))
        elif tag == f'{W_NS}br':
            pieces.append('<br />')
        elif tag == f'{W_NS}tab':
            pieces.append('&nbsp;&nbsp;&nbsp;&nbsp;')

    text_html = ''.join(pieces)
    if bold:
        text_html = f'<strong>{text_html}</strong>'
    if italic:
        text_html = f'<em>{text_html}</em>'
    return text_html


def paragraph_runs_and_links(paragraph, relationships):
    runs = []
    links = []

    for child in list(paragraph):
        if child.tag == f'{W_NS}r':
            runs.append(child)
            continue

        if child.tag == f'{W_NS}hyperlink':
            rel_id = child.attrib.get(f'{R_NS}id')
            if rel_id and relationships.get(rel_id):
                links.append(relationships[rel_id])
            runs.extend(child.findall('w:r', NS))

    return runs, links


def first_youtube_url(*values):
    for value in values:
        if not value:
            continue
        if isinstance(value, list):
            found = first_youtube_url(*value)
            if found:
                return found
            continue
        match = YOUTUBE_URL_RE.search(str(value))
        if match:
            return match.group(0).rstrip('.,);]')
    return None


def is_url_metadata_line(text, youtube_url):
    normalized = (text or '').strip()
    if not normalized:
        return False
    if re.match(r'^url\s*:?\s*$', normalized, re.IGNORECASE):
        return True
    if youtube_url and (
        re.match(r'^url\s*:', normalized, re.IGNORECASE)
        or normalized == youtube_url
        or normalized.replace(' ', '') == youtube_url
    ):
        return True
    return False


def paragraph_record(paragraph, style_lookup, relationships):
    ppr = paragraph.find('w:pPr', NS)
    style_id = None
    style_name = 'Normal'

    if ppr is not None:
        pstyle = ppr.find('w:pStyle', NS)
        if pstyle is not None:
            style_id = pstyle.attrib.get(f'{W_NS}val')
            style_name = style_lookup.get(style_id, style_id or style_name)

    run_html_parts = []
    raw_text_parts = []

    runs, links = paragraph_runs_and_links(paragraph, relationships)

    for run in runs:
        run_html = run_to_html(run)
        if run_html:
            run_html_parts.append(run_html)

        run_text = ''
        for t in run.findall('w:t', NS):
            run_text += t.text or ''
        for _ in run.findall('w:br', NS):
            run_text += '\n'
        raw_text_parts.append(run_text)

    inline_html = ''.join(run_html_parts)
    raw_text = ''.join(raw_text_parts).replace('\u00A0', ' ')

    return {
        'style_id': style_id,
        'style_name': style_name,
        'style_name_norm': normalize_style(style_name),
        'text': raw_text.strip(),
        'inline_html': inline_html,
        'links': links,
    }


def parse_docx(path):
    with zipfile.ZipFile(path, 'r') as zf:
        document_xml = zf.read('word/document.xml')
        styles_xml = zf.read('word/styles.xml') if 'word/styles.xml' in zf.namelist() else b''
        rels_xml = zf.read('word/_rels/document.xml.rels') if 'word/_rels/document.xml.rels' in zf.namelist() else b''

    style_lookup = parse_styles(styles_xml)
    relationships = parse_relationships(rels_xml)
    doc_root = ET.fromstring(document_xml)
    paragraphs = []

    for p in doc_root.findall('.//w:body/w:p', NS):
        paragraphs.append(paragraph_record(p, style_lookup, relationships))

    title_indices = [
        i for i, p in enumerate(paragraphs)
        if p['style_name_norm'] in TITLE_STYLE_NAMES and p['text']
    ]

    if not title_indices:
        raise ValueError('No song title headings found. Use Heading 1 or Heading 2 for song titles.')

    songs = []

    for idx, start in enumerate(title_indices):
        end = title_indices[idx + 1] if idx + 1 < len(title_indices) else len(paragraphs)
        title_raw = paragraphs[start]['text']

        track_number = None
        title = title_raw
        m = TRACK_RE.match(title_raw)
        if m:
            try:
                track_number = int(m.group(1))
            except ValueError:
                track_number = None
            title = m.group(2).strip()

        songwriters = None
        youtube_url = None
        lyrics_parts = []
        consumed_songwriter = False
        started_lyrics = False

        for para in paragraphs[start + 1:end]:
            style_norm = para['style_name_norm']
            text = para['text']
            inline_html = para['inline_html']
            para_youtube_url = first_youtube_url(para['links'], text)
            if para_youtube_url and not youtube_url:
                youtube_url = para_youtube_url

            if is_url_metadata_line(text, para_youtube_url):
                continue

            if not consumed_songwriter and style_norm in SONGWRITER_STYLE_NAMES and text:
                songwriters = text
                consumed_songwriter = True
                continue

            if not text and not started_lyrics:
                continue

            if not text and started_lyrics:
                lyrics_parts.append('<p></p>')
                continue

            started_lyrics = True

            if style_norm in TITLE_STYLE_NAMES:
                lyrics_parts.append(f'<h2>{html.escape(text)}</h2>')
            elif style_norm in SONGWRITER_STYLE_NAMES:
                lyrics_parts.append(f'<h3>{html.escape(text)}</h3>')
            elif SECTION_RE.match(text) and len(text) <= 70:
                lyrics_parts.append(f'<h2>{html.escape(text)}</h2>')
            else:
                lyrics_parts.append(f'<p>{inline_html or html.escape(text)}</p>')

        lyrics_html = ''.join(lyrics_parts).strip()
        if not title:
            continue

        songs.append({
            'title': title,
            'track_number': track_number,
            'songwriters': songwriters,
            'youtube_url': youtube_url,
            'lyrics': lyrics_html or None,
        })

    if len(songs) > 1:
        first_title = songs[0]['title'].lower()
        if 'lyrics' in first_title and songs[0]['track_number'] is None:
            songs = songs[1:]

    return songs


def main():
    parser = argparse.ArgumentParser(description='Parse songs from a DOCX file using heading styles.')
    parser.add_argument('path', help='Path to .docx file')
    args = parser.parse_args()

    songs = parse_docx(args.path)
    print(json.dumps({'songs': songs}, ensure_ascii=False))


if __name__ == '__main__':
    main()
