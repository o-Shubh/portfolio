"""Build the static site from content.json; Python standard library only."""
import json
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
def build():
    c = json.loads((ROOT / 'content.json').read_text(encoding='utf-8'))
    import re
    for video in c['videos']:
        if not re.fullmatch(r'[\w-]{11}', video['id']):
            raise ValueError('Each video needs an 11-character YouTube video ID')
    for stat in c['stats']:
        if stat['value'] is not None and (not isinstance(stat['value'], (int, float)) or stat['value'] < 0):
            raise ValueError('Stats must be non-negative numbers or null')
    if c['formEndpoint'] and not c['formEndpoint'].startswith('https://'):
        raise ValueError('The form endpoint must use HTTPS')
    def e(value): return escape(str(value), quote=True)
    def link(item, cls=''):
        return f'<a class="{cls}" href="{e(item["url"])}" target="_blank" rel="noopener noreferrer">{e(item["label"])} <span aria-hidden="true">↗</span></a>'
    socials = ''.join(link(x, 'social-link') for x in c['links'])
    stats = ''.join(f'<div class="stat"><strong data-count="{e(s["value"] if s["value"] is not None else "")}" data-suffix="{e(s["suffix"])}">{e(str(s["value"])+s["suffix"] if s["value"] is not None else "—")}</strong><span>{e(s["label"])}</span><small>{e(s["note"])}</small></div>' for s in c['stats'])
    videos = ''.join(f'<article class="video-card card"><div class="video-frame" data-video="{e(v["id"])}"><button class="video-load" type="button" aria-label="Play {e(v["title"])}"><span aria-hidden="true">▶</span>{e(c["ui"]["playVideo"])}</button></div><h3>{e(v["title"])}</h3><p>{e(v.get("description", ""))}</p></article>' for v in c['videos'])
    if not videos: videos = f'<div class="empty-state card"><span class="empty-icon" aria-hidden="true">▶</span><h3>{e(c["ui"]["videosEmptyTitle"])}</h3><p>{e(c["ui"]["videosEmpty"])}</p></div>'
    quotes = ''.join(f'<figure class="quote card" {"hidden" if i else ""}><blockquote>{e(t["quote"])}</blockquote><figcaption><strong>{e(t["name"])}</strong><span>{e(t["role"])}</span></figcaption></figure>' for i,t in enumerate(c['testimonials']))
    if not quotes: quotes = f'<div class="empty-state card"><h3>{e(c["ui"]["testimonialsEmptyTitle"])}</h3><p>{e(c["ui"]["testimonialsEmpty"])}</p></div>'
    controls = f'<div class="carousel-controls"><button type="button" data-carousel="-1" aria-label="{e(c["ui"]["previous"])}">←</button><span id="slide-status" aria-live="polite">1 / {len(c["testimonials"])}</span><button type="button" data-carousel="1" aria-label="{e(c["ui"]["next"])}">→</button></div>' if len(c['testimonials']) > 1 else ''
    sections = dict(c['sections'])
    # Keep the original text, adding timeline semantics around the existing role.
    sections['experience'] = sections['experience'].replace('<article class="experience">', '<ol class="timeline" aria-label="Professional timeline"><li><article class="experience">').replace('</article>', '</article></li></ol>')
    resume = f'<a class="button secondary" href="{e(c["resume"])}" download>{e(c["ui"]["resume"])} <span aria-hidden="true">↓</span></a>'
    nav = ''.join(f'<a href="#{e(n["id"])}">{e(n["label"])}</a>' for n in c['navigation'])
    html = (ROOT / 'template.html').read_text(encoding='utf-8')
    replacements = dict(name=e(c['name']), title=e(c['seo']['title']), description=e(c['seo']['description']), site=e(c['seo']['url']), hero=sections['hero'], sections=''.join(sections[key] for key in ['experience','projects','writing','about','skills','approach','education','exploring']), stats=stats, socials=socials, nav=nav, videos=videos, quotes=quotes+controls, resume=resume, dialog=sections['dialog'], roles=e(' · '.join(c['roles'])), year=c['year'])
    replacements.update({f'ui.{key}':e(value) for key,value in c['ui'].items()})
    replacements.update({'youtube':e(c['youtube']), 'email':e(c['email']), 'whatsapp':e(c['whatsapp'])})
    for key, value in replacements.items(): html = html.replace('{{'+key+'}}', str(value))
    if '{{' in html: raise ValueError('Unresolved template value')
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {c["seo"]["url"]}sitemap.xml\n')
    (ROOT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{e(c["seo"]["url"])}</loc></url></urlset>\n')
    print('Built index.html, robots.txt and sitemap.xml from content.json')
if __name__ == '__main__': build()
