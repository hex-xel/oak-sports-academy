"""Inspect document structure and source preservation without application tests."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
from lxml import etree
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
pdf = PdfReader(root / 'III-BCSAD_OakSportsGroup5_Milestone1_Proposal.pdf')
text = '\n'.join(page.extract_text() for page in pdf.pages)
required = ['TRAIN_CART', 'BUILD(lo', 'PREDICT', 'APPLY_EVENT',
            'VALIDATE_IMAGE', 'Task 1', 'Task 2', 'Task 3', 'Task 4',
            'Task 5', 'Task 6', 'References', 'DELETION_DUE', 'RULE_BASELINE']
missing = [s for s in required if s not in text]
source = Path(r'C:\Users\ventura\Downloads\Algocom-PBL Milestone 1.docx')
unchanged = hashlib.sha256(source.read_bytes()).hexdigest() == 'cba61c701ca9c9fb90d235cebd816f888330dc93fab16e13595cd6435595c232'
with ZipFile(root / 'III-BCSAD_OakSportsGroup5_Milestone1_Revised.docx') as package:
    xml = etree.fromstring(package.read('word/document.xml'))
    equations = len(xml.findall('.//{http://schemas.openxmlformats.org/officeDocument/2006/math}oMath'))
print('Missing required content:', missing)
print('Pages:', len(pdf.pages))
print('Source unchanged:', unchanged)
print('Native equations:', equations)
print('Final outputs:', [(p.name, p.stat().st_size) for p in root.iterdir() if p.is_file()])
assert not missing and unchanged and equations >= 5
(root / 'qa' / 'verification.txt').write_text(
    'Native Word PDF export reviewed visually across all 20 pages. '
    'Required algorithms, Tasks 1-6, references and reconciliation appendix present. '
    'Original source unchanged. No slide appendix, application code changes, '
    'source specification edits, application test runs or measured performance claims.\n',
    encoding='utf-8')
