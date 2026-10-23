# Sprint 2 — Relatório intermediário de implementação e evidências

**Projeto:** NextRead — Grupo 09 — DSM / Fatec Franca — 2026/2  
**Branch de origem:** `PI6-Sprint1`  
**Data de preparação deste relatório:** 19/10/2026

## Objetivo

Registrar a evolução do sistema de recomendação de livros na Sprint 2, distinguindo funcionalidades implementadas no repositório, ações que precisam ser executadas e evidências ainda não coletadas. **Este relatório não atesta execução de testes, implantação no Google Cloud ou contribuição individual via Git.**

## Matriz de atendimento

| Requisito | Implementação no repositório | Situação verificável nesta entrega | Evidência solicitada |
|---|---|---|---|
| Backend com CRUD | `src/Livros.Api/Controllers/UsuariosController.cs`, serviços e DTOs | CRUD de usuários presente no código; execução não comprovada | E01 e E02 |
| Frontend parcialmente integrado | `web/pesquisa.html`, `web/livro.html`, `web/Javascript/script.js` | Integração programada; funcionamento ponta a ponta não comprovado | E03 e E04 |
| Banco criado e com testes | `database/01_criar_tabelas.sql`, `02_dados_teste.sql`, `03_verificar_banco.sql`, migration EF Core | Scripts presentes; execução e dados no banco não comprovados | E05 e E06 |
| Commits de todos os integrantes | Histórico Git remoto | Não verificável por ZIP de código | E07 |
| Computação em Nuvem II | `cloud/Dockerfile`, `cloud/deploy.sh`, `cloud/README.md` | Configuração preparada; implantação não comprovada | E08 e E09 |
| Mineração de Dados | `ml/Mineracao/`, `ml/Scripts/`, `ml/testes/` | Ingestão e recomendação TF-IDF/cosseno implementadas; execução atual não comprovada | E10 e E11 |
| Documentação intermediária | READMEs, `Documentacao.pdf`, este relatório | Documentação de implementação incluída; capturas de execução pendentes | E01–E11 |

## Arquitetura implementada e proposta

- **Front-end:** HTML/CSS/JavaScript em `web/`; pesquisa e detalhes consultam a API (a integração depende de backend e banco ativos).
- **Back-end:** API ASP.NET Core em `src/`, com endpoints de usuários, livros, categorias e recomendações.
- **Banco:** PostgreSQL; quatro tabelas-base definidas em SQL e `livros_similares` por migration EF Core.
- **Mineração:** Python com ingestão, vetorização TF-IDF e similaridade de cosseno; grava recomendações no PostgreSQL.
- **Nuvem:** configuração inicial prevista para Cloud Run + Cloud SQL + Secret Manager; não há evidência de provisionamento efetivo. O plano original em PDF menciona outros serviços e deve ser entendido como planejamento histórico, não como infraestrutura provisionada.

## Limitações atuais

1. API, banco e páginas ainda devem ser executados em conjunto e evidenciados.
2. O frontend de salvos e a página de recomendações ainda não estão integralmente conectados a serviços personalizados; login HTML está vazio.
3. Os scripts de banco incluem dados fictícios apenas para demonstração, não substituem o dataset real.
4. A infraestrutura Google Cloud só pode ser considerada criada após configuração e capturas no projeto GCP da equipe.
5. Commits individuais precisam ser conferidos na interface do GitHub ou com `git log` em um clone com histórico.
6. Senhas e credenciais não devem constar em capturas de tela nem no repositório.

## Como finalizar a entrega

Siga `ROTEIRO_VALIDACAO.md`, registre capturas segundo `CHECKLIST_EVIDENCIAS.md` e coloque os arquivos em `docs/sprint2/evidencias/`. Substitua os campos **PENDENTE** nas fichas apenas depois da execução. Use `COMANDOS_VALIDACAO.md` como referência para os testes manuais. Não altere os estados para “concluído” sem evidência correspondente.
