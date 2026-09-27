"""Render the reviewed, offline inventory. Never import or connect to the application."""
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape
import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether, Flowable
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output/pdf'
DATA = json.loads((OUT / 'eyra-system.json').read_text(encoding='utf-8'))
CAT = DATA['catalog']
FONT_DIR = Path(reportlab.__file__).parent / 'fonts'
pdfmetrics.registerFont(TTFont('Doc', str(FONT_DIR / 'Vera.ttf')))
pdfmetrics.registerFont(TTFont('DocBold', str(FONT_DIR / 'VeraBd.ttf')))
pdfmetrics.registerFontFamily('Doc', normal='Doc', bold='DocBold', italic='Doc', boldItalic='DocBold')
INK = colors.HexColor('#172d27')
MUTED = colors.HexColor('#51665e')
GREEN = colors.HexColor('#087654')
PALE = colors.HexColor('#edf6f1')
DARK = colors.HexColor('#071710')
LINE = colors.HexColor('#d8e6df')
W, H = A4
MARGIN = 48
WIDTH = W - 2 * MARGIN
styles = {
    'body': ParagraphStyle('body', fontName='Doc', fontSize=9.2, leading=14, textColor=INK, spaceAfter=8, splitLongWords=True),
    'small': ParagraphStyle('small', fontName='Doc', fontSize=7.8, leading=11, textColor=MUTED, spaceAfter=6, splitLongWords=True),
    'ref': ParagraphStyle('ref', fontName='Doc', fontSize=7.8, leading=11, textColor=MUTED, spaceAfter=6, keepWithNext=True),
    'h1': ParagraphStyle('h1', fontName='DocBold', fontSize=24, leading=30, textColor=INK, spaceAfter=18, keepWithNext=True),
    'h2': ParagraphStyle('h2', fontName='DocBold', fontSize=16, leading=21, textColor=GREEN, spaceBefore=8, spaceAfter=12, keepWithNext=True),
    'h3': ParagraphStyle('h3', fontName='DocBold', fontSize=10, leading=15, textColor=GREEN, spaceBefore=10, spaceAfter=5, keepWithNext=True),
    'cover': ParagraphStyle('cover', fontName='DocBold', fontSize=34, leading=42, textColor=colors.white, spaceAfter=20),
    'coverbody': ParagraphStyle('coverbody', fontName='Doc', fontSize=13, leading=21, textColor=colors.HexColor('#b5dfcc'), spaceAfter=14),
    'cell': ParagraphStyle('cell', fontName='Doc', fontSize=8, leading=11.5, textColor=INK, splitLongWords=True),
    'cellhead': ParagraphStyle('cellhead', fontName='DocBold', fontSize=8, leading=11, textColor=colors.white),
}


def clean(s):
    return str(s).replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-').replace('→', ' > ').replace('\t', ' ')


def p(s, style='body'):
    return Paragraph(escape(clean(s)).replace('\n', '<br/>'), styles[style])


story = []
heading_number = 0


def heading(s, level=0):
    global heading_number
    item = p(s, 'h1' if level == 0 else 'h2')
    item.bookmark = f'section-{heading_number}'
    item.level = level
    item.heading_text = clean(s)
    heading_number += 1
    story.append(item)


def label(title, content):
    story.append(p(title.upper(), 'h3'))
    if isinstance(content, list):
        for n, item in enumerate(content, 1):
            story.append(p(f'{n:02d}  {item}'))
    else:
        story.append(p(content))


def table(headers, rows, widths):
    data = [[p(v, 'cellhead') for v in headers]] + [[p(v, 'cell') for v in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, PALE]),
        ('LINEBELOW', (0, 0), (-1, -1), .4, LINE),
    ]))
    story.extend([t, Spacer(1, 12)])


class Architecture(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = WIDTH, 348

    def draw(self):
        c = self.canv
        def box(x, y, w, h, title, body, dark=False):
            c.setFillColor(DARK if dark else PALE)
            c.setStrokeColor(GREEN)
            c.roundRect(x, y, w, h, 8, stroke=1, fill=1)
            title_style = ParagraphStyle('boxhead', parent=styles['h3'], textColor=colors.HexColor('#6ee7b7') if dark else GREEN, spaceBefore=0)
            body_style = ParagraphStyle('boxbody', parent=styles['small'], textColor=colors.white if dark else INK, spaceAfter=0)
            for value, style, top in [(title, title_style, y+h-13), (body, body_style, y+h-32)]:
                paragraph = Paragraph(escape(value), style)
                _, height = paragraph.wrap(w-24, h)
                paragraph.drawOn(c, x+12, top-height)
        def arrow(x1, y1, x2, y2):
            c.setStrokeColor(GREEN); c.setLineWidth(1.2); c.line(x1, y1, x2, y2)
            c.line(x2, y2, x2-3, y2+6); c.line(x2, y2, x2+3, y2+6)
        box(0, 272, WIDTH, 68, 'PERSONA E CANALI', 'Home e chat web | WhatsApp | Telegram | documenti')
        arrow(WIDTH/2, 272, WIDTH/2, 251)
        box(0, 177, WIDTH, 74, 'NEXT.JS / VERCEL', 'Sessioni, route, Server Actions, controlli, cron e streaming', True)
        arrow(WIDTH*.25, 177, WIDTH*.25, 156); arrow(WIDTH*.75, 177, WIDTH*.75, 156)
        box(0, 81, WIDTH/2-9, 75, 'AGENTE CLAUDE', 'Prompt + router + directive; strumenti e proposte')
        box(WIDTH/2+9, 81, WIDTH/2-9, 75, 'SERVIZI DI DOMINIO', 'Patch, scadenze, workflow, notifiche e connettori')
        arrow(WIDTH*.25, 81, WIDTH*.25, 60); arrow(WIDTH*.75, 81, WIDTH*.75, 60)
        box(0, 0, WIDTH, 60, 'DATI E INTEGRAZIONI', 'Drive + Turso | Gmail + Calendar | messaggistica | audio opzionale')


class Manual(BaseDocTemplate):
    def afterFlowable(self, item):
        if hasattr(item, 'bookmark'):
            self.canv.bookmarkPage(item.bookmark)
            self.canv.addOutlineEntry(item.heading_text, item.bookmark, item.level)
            self.notify('TOCEntry', (item.level, item.heading_text, self.page, item.bookmark))


def page_background(c, doc):
    c.saveState()
    if doc.page == 1:
        c.setFillColor(DARK); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(GREEN); c.rect(0, H-12, W, 12, fill=1, stroke=0)
        c.drawImage(str(ROOT/'public/eyra-wordmark.png'), MARGIN, H-160, width=260, height=86.67, mask='auto')
        c.setStrokeColor(GREEN); c.line(MARGIN, 152, W-MARGIN, 152)
        c.setFillColor(colors.HexColor('#a4c9b8'))
    else:
        c.setFillColor(DARK); c.roundRect(MARGIN, H-47, 70, 24, 3, fill=1, stroke=0)
        c.drawImage(str(ROOT/'public/eyra-wordmark.png'), MARGIN+6, H-43, width=58, height=19.33, mask='auto')
        c.setFillColor(MUTED); c.setFont('Doc', 8)
        c.drawString(MARGIN+83, H-37, 'MANUALE DEL SISTEMA')
        c.setStrokeColor(LINE); c.line(MARGIN, H-59, W-MARGIN, H-59)
        c.line(MARGIN, 38, W-MARGIN, 38)
    c.setFont('Doc', 7)
    c.drawString(MARGIN, 24, f"Rev. {DATA['revision'][:8]}  |  {DATA['generatedAt'][:10]}  |  {DATA['digest'][:12]}")
    c.drawRightString(W-MARGIN, 24, f'{doc.page:02d}')
    c.restoreState()


doc = Manual(str(OUT/'eyra-manuale-sistema.pdf'), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=78, bottomMargin=52, title='EYRA - Manuale del sistema', author='EYRA - documentazione del progetto', allowSplitting=True)
doc.addPageTemplates([PageTemplate(id='manual', frames=[Frame(MARGIN, 52, WIDTH, H-130, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=page_background)])
story.extend([Spacer(1, 145), p(CAT['title'], 'cover'), p(CAT['subtitle'], 'coverbody'), Spacer(1, 35), p('01  Comprendere il sistema\n02  Leggere architettura e flussi\n03  Consultare funzioni, strumenti e competenze\n04  Mantenere la documentazione nel tempo', 'coverbody'), Spacer(1, 25), p(f"Revisione {DATA['revision'][:8]}" + (' + modifiche locali' if DATA['dirty'] else '') + f"\n{len(CAT['features'])} schede funzionali | {len(DATA['specialists'])} aree specialistiche\nGenerato il {DATA['generatedAt'][:10]} - inventario offline", 'coverbody'), PageBreak()])
story.append(p('Indice di lettura', 'h1'))
story.append(p('Le prime sezioni descrivono il progetto senza richiedere conoscenze di programmazione. Le schede successive collegano ogni funzione alle sue sorgenti; le appendici riportano gli elementi estratti automaticamente dal codice.'))
toc = TableOfContents()
toc.levelStyles = [ParagraphStyle('toc0', fontName='DocBold', fontSize=10, leading=16, textColor=INK, spaceBefore=8), ParagraphStyle('toc1', fontName='Doc', fontSize=8.4, leading=13, leftIndent=15, textColor=MUTED)]
story.extend([toc, PageBreak()])
heading('01 / Il sistema in breve')
for item in CAT['overview']: story.append(p(item))
table(['Responsabilità', 'Dove vive'], [
    ['Capire e rispondere', 'Claude API, coordinata da lib/agent.ts'],
    ['Decidere cosa può essere applicato', 'Codice di controllo, proposte e approvazione della titolare'],
    ['Conoscenza e documenti', 'Markdown e allegati su Google Drive'],
    ['Stato delle conversazioni e dei lavori', 'Tabelle Turso / libSQL'],
    ['Procedure e competenze', 'AGENT.md, router, directive e moduli della KB'],
    ['Voce', 'Browser; servizio OpenAI opzionale separato'],
], [175, WIDTH-175])
label('Come leggere lo stato di una funzione', 'Implementata indica presenza nel codice. Configurabile indica che occorrono chiavi, permessi o destinatari. Da collaudare indica che il test automatico non prova il servizio esterno o il dispositivo reale. Futuro indica una capacità descritta ma non implementata.')
story.append(PageBreak())
heading('02 / Architettura')
story.append(Architecture())
story.append(Spacer(1, 15))
for layer in CAT['layers']:
    story.extend([p(layer['name'], 'h3'), p(layer['text'])])
story.append(PageBreak())
heading('03 / Flussi e confini operativi')
for i, flow in enumerate(CAT['flows']):
    if i == 2: story.append(PageBreak())
    heading(flow['title'], 1)
    for n, step in enumerate(flow['steps'], 1): story.append(p(f'{n}. {step}'))
    story.append(Spacer(1, 9))
story.append(PageBreak())
heading('04 / Schede delle funzioni')
story.append(p('Ogni scheda distingue scopo, ingresso, processo, risultati, persistenza e limiti. I riferimenti finali indicano file effettivamente presenti nella revisione documentata. I controlli elencati descrivono cosa verificare, non attestano da soli l’esito di un collaudo in produzione.'))
for number, feature in enumerate(CAT['features'], 1):
    if number > 1: story.append(PageBreak())
    heading(f"{number:02d}. {feature['title']}", 1)
    story.append(p(feature['purpose']))
    label('Quando si attiva', feature['trigger'])
    label('Dati in ingresso', feature['inputs'])
    label('Come funziona', feature['process'])
    label('Risultati e persistenza', feature['outputs'] + ' ' + feature['storage'])
    label('Limiti e dipendenze', feature['limits'])
    label('Verifica prevista', feature['verification'])
    refs = [m['path'] for m in DATA['modules'] if feature['id'] in m['owners']]
    if not refs: refs = [p for p in DATA['hashes'] if any(re.fullmatch(re.escape(pattern).replace(r'\*\*', '.*').replace(r'\*', '[^/]*'), p) for pattern in feature['patterns'])]
    story.extend([p('SORGENTI', 'h3'), p(' | '.join(refs), 'small')])
story.append(PageBreak())
heading('05 / Agente e strumenti')
story.append(p('Gli strumenti seguenti sono estratti dalla definizione tools in lib/agent.ts. Sono operazioni invocabili dal medesimo agente; la descrizione dichiarativa non sostituisce i controlli del relativo handler. Le descrizioni e gli schemi si aggiornano automaticamente dal codice.'))
for tool in DATA['tools']:
    heading(tool['name'], 1)
    story.append(p(tool.get('description') or f"Strumento gestito dal provider: {tool.get('type', '')}. Massimo utilizzi per richiesta: {tool.get('max_uses', 'definito dal provider')}."))
    schema = tool.get('input_schema') or {}
    args = []
    for key, value in schema.get('properties', {}).items():
        args.append(f"{key}: {value.get('type', 'valore')}" + (' (obbligatorio)' if key in schema.get('required', []) else ' (opzionale)'))
    story.append(p('Parametri: ' + ('; '.join(args) if args else 'nessun parametro applicativo dichiarato'), 'small'))
story.append(PageBreak())
heading('06 / Le nove aree specialistiche')
story.append(p('Le schede riprendono il catalogo della pagina DNA. Sono nove prospettive dello stesso assistente; i moduli di instradamento della KB sono una struttura diversa e vengono elencati nelle fonti. Capacità future e integrazioni attive non devono essere confuse.'))
for i, specialist in enumerate(DATA['specialists']):
    if i: story.append(PageBreak())
    heading(specialist['name'], 1)
    story.append(p(specialist['subject'], 'small'))
    story.append(p(specialist['description']))
    for title, key in [('Supporto disponibile', 'available'), ('Cosa può apprendere dopo approvazione', 'learns'), ('Sviluppi futuri', 'future')]: label(title, specialist[key])
    label('Documenti utili', specialist['documents'])
    label('Esempio', specialist['example'])
    label('Competenze collegate', ', '.join(specialist['connections']))
    story.append(p('Fonti: ' + ' | '.join(specialist['sources']), 'small'))
story.append(PageBreak())
heading('07 / Pagine e API')
story.append(p('Inventario automatico dell’App Router. I percorsi dinamici mantengono la notazione del framework. Le protezioni sono descritte nelle schede dei canali e dell’accesso; questa lista non attesta una verifica di autorizzazione per ogni singola richiesta.'))
table(['Pagina', 'Sorgente'], [[r['path'], r['source']] for r in DATA['pages']], [160, WIDTH-160])
table(['API / metodi', 'Sorgente'], [[r['path']+'\n'+', '.join(r['methods']), r['source']] for r in DATA['routes']], [210, WIDTH-210])
story.append(PageBreak())
heading('08 / Dati e configurazione')
label('Schema del database', 'Le definizioni seguenti sono estratte dalle istruzioni CREATE TABLE. Non sono stati letti dati dal database. Il collegamento tra messages.conversation_id e conversations.id è applicativo; non va interpretato come un vincolo SQL dichiarato nello schema.')
for row in DATA['tables']:
    story.extend([p(row['name'], 'h3'), p(row['schema'], 'small')])
label('Impostazioni non segrete', 'Nomi e descrizioni provengono da DEFS. Non vengono esportati valori correnti o default; il PDF non è un backup della configurazione.')
table(['Nome', 'Ruolo'], [[r['name'], r['label'] + ('\n'+r['help'] if r['help'] else '')] for r in DATA['config']], [190, WIDTH-190])
label('Credenziali: soltanto i nomi', 'Questa tabella identifica cosa configurare nell’ambiente server. Non contiene valori, token o dati della titolare.')
table(['Variabile', 'Scopo'], [[r['name'], r['label']] for r in DATA['secretNames']], [190, WIDTH-190])
story.append(PageBreak())
heading('09 / Riferimento del codice')
story.append(p('Inventario automatico di funzioni, classi, metodi pubblici e tipi esportati. Le funzioni interne non esportate non costituiscono un’API e non sono censite qui. I commenti presenti nel codice sono riportati quando disponibili; scopo e comportamento operativo sono descritti nelle schede funzionali. I numeri di riga valgono per l’impronta di questa edizione.'))
for module in DATA['modules']:
    if not module['symbols']: continue
    story.append(p(module['path'], 'h3'))
    story.append(p('Schede: ' + ', '.join(module['owners']), 'ref'))
    entries = []
    for symbol in module['symbols']:
        desc = f"{symbol['kind']} | riga {symbol['line']}"
        if symbol.get('parameters'): desc += ' | ingressi: ' + symbol['parameters']
        if symbol.get('comment'): desc += '\n' + symbol['comment']
        entries.append([symbol['name'], desc])
    table(['Elemento', module['path']], entries, [170, WIDTH-170])
story.append(Spacer(1, 18))
heading('10 / Procedure, esercizio e aggiornamento')
label('Procedure e moduli versionati', 'Sono indicati percorso e titoli dei documenti progettuali. Le copie personalizzate su Drive non vengono acquisite da questa pipeline.')
table(['Fonte KB', 'Sezioni'], [[r['path'], ' / '.join(r['headings'])] for r in DATA['procedures']], [225, WIDTH-225])
label('Versioni risolte dal lockfile', '\n'.join(f'{name}: {version}' for name, version in DATA['versions'].items()))
label('Pianificazione nel repository', '\n'.join(f"{r['path']} - {r['schedule']} (UTC)" for r in DATA['cron']))
label('Aggiornare il manuale', [
    'Aggiornare docs/system/catalog.json quando cambia una funzione, un limite, un ingresso o una responsabilità.',
    'Aggiornare lib/dna.ts quando cambia una capacità specialistica; aggiungere commenti mirati alle API pubbliche quando utili.',
    'Eseguire npm run docs:update dopo la revisione, poi npm run check. Il controllo rileva cambiamenti delle sorgenti, non dimostra la correttezza semantica della prosa.',
    'Generare localmente con npm run docs:pdf, oppure scaricare PDF e JSON dagli artifact del workflow Documentazione sistema su GitHub.',
    'Su GitHub, ogni push e pull request genera una nuova edizione se i controlli passano. Nessun segreto applicativo è necessario e nessuna API AI viene chiamata.',
])
label('Provenienza dell’edizione', f"Commit: {DATA['revision']}\nWorking tree con modifiche: {'sì' if DATA['dirty'] else 'no'}\nImpronta SHA-256 delle sorgenti: {DATA['digest']}\nSorgenti censite: {len(DATA['hashes'])}\nData UTC di generazione: {DATA['generatedAt']}\nL’inventario JSON conserva le impronte per file. I test e le prove fisiche dei servizi restano distinti dalla generazione del manuale.")
doc.multiBuild(story)
reader = PdfReader(OUT/'eyra-manuale-sistema.pdf')
texts = [page.extract_text() or '' for page in reader.pages]
if len(texts) < 10 or any(len(t.strip()) < 60 for t in texts):
    raise RuntimeError('Controllo PDF fallito: pagine vuote o contenuto incompleto.')
all_text = '\n'.join(texts)
for required in ['Il sistema in breve', 'Agente e strumenti', 'patch_applica', 'webhook_events', DATA['revision']]:
    if required not in all_text:
        raise RuntimeError(f'Contenuto PDF mancante: {required}')
print(f'PDF generato e verificato: {len(texts)} pagine, output/pdf/eyra-manuale-sistema.pdf')
