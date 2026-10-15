# Cenários — Metas

**Versão**: 1.0 | **Última atualização**: 2026-10-14
Código: `src/features/goals/` · Formato: [README](./README.md)

Contrato (de `validations.ts`): `name` 1–100 · `targetValue` > 0 · `currentValue` ≥ 0 (padrão 0) · `deadlineLabel` ≤ 100 (texto livre).

| ID | Persona | Dado / Ação | Esperado | Técnica | Risco | Nível |
|----|---------|-------------|----------|---------|-------|-------|
| G-01 | P1 | Criar "Reserva de emergência", alvo `R$ 10.000,00`, prazo "12 meses" | Meta criada com progresso 0% | EP | M | I |
| G-02 | P1 | Alvo `0`, negativo; nome vazio e com 101 caracteres | Recusa com mensagem; nada gravado | BVA/NEG | M | U |
| G-03 | P1 | `currentValue` negativo | Recusa "Valor atual não pode ser negativo" | BVA | M | U |
| G-04 | P1 | Progresso com atual 0, 50%, 100% e acima do alvo | Percentual correto; acima de 100% não quebra o layout nem mostra valor negativo | BVA | M | U |
| G-05 | P2 | Editar só o valor atual | Demais campos preservados | EP | M | I |
| G-06 | P3 | Usuário B acessa meta de A | 403/404 | AUTH | A | I |
| G-07 | P1 | Lista de metas vazia / falha da API | Estado vazio acolhedor / mensagem amigável com tentar de novo | NEG | M | E |

## Charter sugerido

- **P1**: "Explorar a criação da primeira meta para descobrir se o usuário entende alvo, prazo e progresso sem ajuda."
