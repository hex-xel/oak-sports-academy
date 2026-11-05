"""Make focused OOXML text/alignment edits while preserving all other parts."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\ventura\Downloads\PBL Milestone 1 (2).docx')
OUT = ROOT / 'PBL Milestone 1.docx'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
M = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
NS = {'w': W, 'm': M}
q = lambda local: '{' + W + '}' + local

with ZipFile(SOURCE) as original:
    infos = original.infolist()
    parts = {info.filename: original.read(info.filename) for info in infos}

baseline_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
xml = etree.fromstring(parts['word/document.xml'])
before_math = [etree.tostring(e) for e in xml.findall('.//{' + M + '}oMath')]
before_drawings = [etree.tostring(e) for e in xml.findall('.//' + q('drawing'))]
replacements = {
    'This proposal presents the revised algorithmic design of the Oak Sports Academy Training Registration and Management System based on the clarified client workflow. It replaces the previous preference-weighted schedule recommendation algorithm because the revised workflow allows students to select available schedules but does not establish a schedule recommendation feature.':
    'This proposal presents the algorithmic design of the Oak Sports Academy Training Registration and Management System. The system supports participant registration, free-trial assessment, enrollment, attendance monitoring, training-package management, and digital document collection. The proposed algorithms maintain consistent participant records, support explainable participation-risk classification, and validate uploaded image documents.',
    'The revised design contains three concrete algorithms:':
    'The proposed design contains three concrete algorithms:',
    'The revised client workflow requires newly white-belt and colored-belt students to undergo a free-trial assessment before enrollment. After attendance and assessment, authorized academy staff approve or reject the applicant. An accepted student must enroll within one week; otherwise, the account is deleted [1].':
    'The academy workflow requires newly white-belt and colored-belt students to undergo a free-trial assessment before enrollment. After attendance and assessment, authorized academy staff approve or reject the applicant. An accepted student must enroll within one week; otherwise, the account is deleted [1].',
    'The revised flow establishes the following requirements [1]:':
    'The academy workflow establishes the following requirements [1]:',
    'As an academy administrator, I want assessment and enrollment events validated by a lifecycle FSM and uploaded IDs checked against their actual image format so that participant records follow the revised workflow and inadequate uploads can be corrected.':
    'As an academy administrator, I want assessment and enrollment events validated by a lifecycle FSM and uploaded IDs checked against their actual image format so that participant records follow academy procedures and inadequate uploads can be corrected.',
    'Obtain approval for specification reconciliation.':
    'Confirm the lifecycle transition table and unresolved business policies.',
}

def text(p):
    return ''.join(p.xpath('.//w:t/text()', namespaces=NS))

def replace_text_preserve_runs(p, old, new):
    """Distribute replacement text through retained original runs."""
    nodes = p.xpath('.//w:t', namespaces=NS)
    assert ''.join(n.text or '' for n in nodes) == old
    remaining = new
    for i, node in enumerate(nodes):
        take = len(node.text or '') if i < len(nodes)-1 else len(remaining)
        node.text = remaining[:take]
        remaining = remaining[take:]
        node.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')

def alignment(p, value):
    pr = p.find(q('pPr'))
    if pr is None:
        pr = etree.Element(q('pPr'))
        p.insert(0, pr)
    jc = pr.find(q('jc'))
    if jc is None:
        jc = etree.Element(q('jc'))
        pr.append(jc)
    jc.set(q('val'), value)

def paragraph_flag(p, name):
    pr = p.find(q('pPr'))
    if pr is None:
        pr = etree.Element(q('pPr'))
        p.insert(0,pr)
    flag = pr.find(q(name))
    if flag is None:
        flag = etree.SubElement(pr,q(name))
    flag.set(q('val'),'1')

edited = []
for p in xml.findall('.//' + q('p')):
    old = text(p)
    if old in replacements:
        new = replacements[old]
        replace_text_preserve_runs(p, old, new)
        edited.append({'before':old,'after':new})
assert len(edited) == len(replacements), (len(edited),len(replacements))

# Chat copy delimiters identify code blocks in this source. They are not content.
# Keep their original fonts/indents but left-align the code itself.
in_code = False
justified = 0
code_count = 0
removed_delimiters = 0
for p in xml.findall('./' + q('body') + '/' + q('p')):
    original_text = text(p)
    starts_code = '\uec03' in original_text
    ends_code = '\uec02' in original_text
    if starts_code:
        in_code = True
    is_code = in_code and not ends_code
    for t in p.xpath('.//w:t', namespaces=NS):
        val = t.text or ''
        removed_delimiters += val.count('\uec03') + val.count('\uec02')
        t.text = val.replace('\uec03','').replace('\uec02','')
    if ends_code:
        in_code = False
    content = text(p).strip()
    style_node = p.find('./' + q('pPr') + '/' + q('pStyle'))
    style = style_node.get(q('val'), '') if style_node is not None else ''
    if is_code:
        alignment(p, 'left')
        code_count += 1
    elif style.lower().startswith(('heading','title','subtitle')):
        paragraph_flag(p,'keepLines')
        paragraph_flag(p,'keepNext')
    elif content and not style.lower().startswith(('heading','title','subtitle')):
        if content.startswith('<!--'):
            alignment(p,'left')
        else:
            alignment(p,'both')
            paragraph_flag(p,'widowControl')
            justified += 1

after_math = [etree.tostring(e) for e in xml.findall('.//{' + M + '}oMath')]
after_drawings = [etree.tostring(e) for e in xml.findall('.//' + q('drawing'))]
assert before_math == after_math
assert before_drawings == after_drawings
assert not re.search(r'\brevis(?:ed|ion|ions)\b', ' '.join(xml.xpath('//w:t/text()',namespaces=NS)), re.I)
parts['word/document.xml'] = etree.tostring(xml,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(OUT,'w') as package:
    for info in infos:
        package.writestr(info, parts[info.filename])

with ZipFile(SOURCE) as source_zip, ZipFile(OUT) as out_zip:
    changed = [n for n in source_zip.namelist() if source_zip.read(n) != out_zip.read(n)]
assert changed == ['word/document.xml'], changed
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == baseline_hash

(ROOT/'qa'/'edits.json').write_text(json.dumps({
    'source':str(SOURCE),'source_sha256':baseline_hash,
    'edits':edited,'justified_paragraphs':justified,
    'code_paragraphs_preserved':code_count,
    'removed_chat_delimiters':removed_delimiters,
    'preserved_equations':len(before_math),'changed_package_parts':changed
},indent=2),encoding='utf-8')
(ROOT/'qa'/'artifact.md').write_text(f'''# Focused document edit contract
Source: {SOURCE}
Source SHA256: {baseline_hash}
Design authority: attached document, source render qa/source.pdf.
Preserve: all styles, margins, section geometry, header logo, tables, hyperlinks,
numbering, all {len(before_math)} equation objects, all relationships and package parts.
Editable: six identified revision-related paragraphs in word/document.xml;
body prose justification; code alignment and copied chat-delimiter cleanup.
Heading keep-together and prose widow/orphan controls prevent broken page boundaries.
Body prose justified; title, heading, table and equation alignment preserved.
All package parts except word/document.xml remain byte-for-byte unchanged.
No algorithm changes, specification edits, added slides or invented dates.
Native Word PDF export is used for visual QA; LibreOffice unavailable.
''',encoding='utf-8')
print(OUT)
print('Text changes:',len(edited))
print('Justified body paragraphs:',justified)
print('Preserved native equations:',len(before_math))
print('Changed package parts:',changed)
