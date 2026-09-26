# Convenzioni

## Naming
- File: `kebab-case.md`, niente spazi/accenti.
- Contratti: `aaaa-tipo-oggetto.md` → `2026-affitto-casa-ibiza-1.md`
- Scadenze singole: `aaaa-mm-gg-oggetto.md`
- Decisioni: `aaaa-mm-gg-titolo.md`

## Frontmatter comune (tutti i file)
```yaml
id: mia-srl          # = nome file
tipo: entita               # entita|immobile|barca|contratto|scadenza|decisione|procedura|modulo|fonte|documento
titolo: Mia srl
entita: [mia-srl]    # soggetti coinvolti (id)
stato: attivo              # attivo|bozza|chiuso|archiviato
aggiornato: 2026-09-26
validato: false            # true solo dopo conferma professionista
tags: []
```

## Campi per tipo
**entita**: `paese`, `forma` (persona-fisica|autonomo|ditta-individuale|srl|sl|startup), `id_fiscale`, `regime`, `professionista`, `inizio_attivita`
**immobile**: `paese`, `comune`, `intestatario`, `quota`, `uso` (abitazione|lungo-termine|turistico|commerciale|vuoto), `rif_catastale`, `licenza_turistica`, `mutuo` (id contratto)
**barca**: `modello`, `lunghezza_m`, `bandiera`, `matricola`, `lista` (6|7 per ES), `uso` (charter|privato), `base`, `intestatario`, `licenza_charter`
**contratto**: `categoria` (affitto-attivo|affitto-passivo|mutuo|assicurazione|ormeggio|fornitore|lavoro), `controparte`, `asset`, `inizio`, `fine`, `rinnovo`, `importo`, `periodicita`, `giorno_pagamento`, `deposito`, `regime_fiscale`
**scadenza**: vedi sotto
**decisione**: `data`, `decisore`, `alternative`, `esito`
**fonte**: `url`, `ente`, `ambito`, `verificata_il`

## Scadenze
Singola:
```yaml
data: 2026-10-20
```
Ricorrente (una o più regole):
```yaml
ricorrenza:
  mensile: 16                 # giorno del mese
  annuale: ["05-16", "11-30"] # MM-GG
  slitta_weekend: true        # sabato/domenica → lunedì
```
Comuni:
```yaml
preavviso_gg: 15
importo: null
responsabile: commercialista   # titolare|commercialista|gestoria|agente
modulo: fisco-it
```

## Link
- Interni: `[[id]]`. Validati dall'app (dashboard: errori di struttura).
- Documenti: link Drive in `80-documenti/`, mai il file nel repo.

## Corpo del file (ordine consigliato)
1. `## Sintesi` (3 righe max)
2. `## Dettagli`
3. `## Rischi / da verificare`
4. `## Storico` (data — cosa cambiato)
