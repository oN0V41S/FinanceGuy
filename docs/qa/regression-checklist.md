# Checklist de Regressão — FinanceGuy

**Versão**: 1.0 | **Status**: Ativo | **Última atualização**: 2026-10-14

Rodar antes de release ou PR que toque transações, investimentos, metas, dashboard ou autenticação. Marque só o que for afetado, mas **sempre** o bloco "Automático".

## 1. Automático (sempre)

- [ ] `pnpm lint` sem erros
- [ ] `pnpm exec tsc --noEmit` sem erros
- [ ] `npm run test` verde (conferir se algo novo entrou em `testPathIgnorePatterns`: precisa de issue)
- [ ] `npm run test:coverage`: features críticas ≥ 80%
- [ ] Nenhum marcador de conflito (`<<<<<<<`, `>>>>>>>`) no repo: `git grep -n "^<<<<<<<\|^>>>>>>>"`
- [ ] Sem segredos/`.env` no diff

## 2. Autenticação e acesso

- [ ] Login/logout; rota protegida sem sessão redireciona ou responde 401
- [ ] Recurso de outro usuário responde 403/404 (transação, investimento, meta)

## 3. Transações (cenários T-*)

- [ ] Criar receita e despesa; valor, data, categoria, responsável exibidos corretamente
- [ ] Parcelado: soma das parcelas = total; numeração `n/total`
- [ ] Recorrente: ocorrências geradas; editar/excluir "somente esta" × "esta e futuras"
- [ ] Troca de mês/quinzena: lista, totais e **saldo inicial** coerentes
- [ ] Filtros combinados (tipo, categoria, responsável, pago, busca) afetam lista **e** saldo inicial
- [ ] Marcar como pago atualiza totais
- [ ] Erro de API: mensagem amigável e tela utilizável

## 4. Investimentos (cenários I-*)

- [ ] Cadastro manual (Renda Fixa) e de mercado (ticker) com histórico de tickers recentes
- [ ] Índice (`^BVSP`) bloqueado com orientação para ETF
- [ ] Cotação indisponível: valor investido continua visível, com aviso
- [ ] Data de compra não recua um dia (fuso) e futura é recusada
- [ ] Resgate: prévia (bruto, IR, líquido) = valor confirmado; parcial mantém `ACTIVE`, total vira `REDEEMED`
- [ ] Modal rolável em tela baixa

## 5. Metas e dashboard (cenários G-*)

- [ ] Criar/editar meta; progresso `currentValue/targetValue` correto, inclusive `0` e ≥ 100%
- [ ] Dashboard usa dados reais (sem `MOCK_DATA`); skeleton só em seções assíncronas

## 6. UI transversal

- [ ] `Select` (base-ui) mostra o **rótulo**, não a chave interna
- [ ] Mobile (375 px) e desktop sem overflow horizontal; modo escuro legível
- [ ] Estados vazio, carregando e erro existem para cada lista

## 7. IA (quando a feature estiver na branch alvo)

- [ ] Proposta exige confirmação por card; recusar não grava nada
- [ ] Sem recomendação de ativo específico; aviso de que não é consultoria financeira
- [ ] Campo Perfil aceita até 2000 caracteres e recusa 2001

## Registro

Anotar no PR: data, branch, quem executou, personas usadas, itens não aplicáveis e bugs abertos.
