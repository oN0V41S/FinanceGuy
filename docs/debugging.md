# Depuração – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Fluxo de Investigação de Falhas](#fluxo-de-investigação-de-falhas)
2. [Logs e Console](#logs-e-console)
3. [Modo Debug do Jest](#modo-debug-do-jest)
4. [Banco de Dados e Migrations](#banco-de-dados-e-migrations)
5. [Depuração no Frontend](#depuração-no-frontend)
6. [Ambiente de Teste](#ambiente-de-teste)
7. [Documentação e Reporte](#documentação-e-reporte)

---

## Fluxo de Investigação de Falhas

- Em caso de falha, verifique `src/features/.../__tests__` para entender como a funcionalidade é testada.
- Verifique `TECHNICAL_DOCS.md` para decisões arquiteturais documentadas.
- Em caso de dúvidas, consulte o `TECHNICAL_DOCS.md` e procure por decisões de design anteriores.

## Logs e Console

- Adicione logs apenas se necessário e garanta que não sejam permanentes.
- Use `console.log` com cautela em ambientes de teste; prefira assertions e mocks.

## Modo Debug do Jest

- Utilize o modo debug do Jest com `node --inspect-brk node_modules/.bin/jest --runInBand <teste>` para investigar falhas complexas.

## Banco de Dados e Migrations

- Se um teste falhar devido a alterações no banco, verifique se a migration necessária foi aplicada.

## Depuração no Frontend

- Em caso de bugs persistentes no frontend, utilize as ferramentas de desenvolvimento do navegador (simuladas se possível) ou os relatórios de erro do sistema.

## Ambiente de Teste

- Sempre limpe o ambiente de teste após execução (mocks devem ser resetados ou limpos).
- Mantenha mocks atualizados com o contrato real do serviço ou repositório.
- Documente padrões de erro recorrentes encontrados em `src/shared/utils.ts` ou similares.
- Se necessário, refatore o código para torná-lo mais testável, seguindo princípios de injeção de dependência.

## Documentação e Reporte

- Reporte problemas estruturais através do fluxo `/bug` ou via issue no GitHub.
- Mantenha a documentação atualizada conforme refatora o código.
