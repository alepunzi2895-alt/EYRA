# Directives (D di DOE)

SOP in linguaggio naturale. Dicono **cosa** fare e **quale script** usare.
- Orchestration (O) = agente LLM: legge directive, decide, chiama script.
- Execution (E) = tool deterministici dell'app (`patch_proponi`, `patch_applica`, …). Mai logica fragile nel prompt.

Ogni directive ha sezione `## Lezioni apprese`: l'agente la aggiorna quando sbaglia (self-annealing).
