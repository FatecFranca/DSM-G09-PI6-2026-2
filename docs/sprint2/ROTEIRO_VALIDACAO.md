# Roteiro de validação presencial / para apresentação

## Preparação

1. Instale PostgreSQL e .NET 10 SDK. Use um banco de testes chamado `livros_pi`.
2. Defina a conexão por variável de ambiente (não faça commit de credenciais).
3. Configure o ambiente Python conforme `ml/README.md` se for demonstrar a mineração.
4. Mantenha dois terminais abertos: API e servidor web estático.

## A. Banco de dados

1. No pgAdmin, conectado a `livros_pi`, execute `database/01_criar_tabelas.sql`.
2. Execute a migration EF Core conforme `database/README.md`.
3. Execute `database/02_dados_teste.sql` e depois `database/03_verificar_banco.sql`.
4. Registre E05/E06. Confirme os totais reais na saída em vez de assumir resultado.

## B. API ASP.NET Core

1. Na raiz, rode `dotnet run --project src/Livros.Api --launch-profile http`.
2. Confira no terminal a porta efetivamente utilizada; abra o Swagger se disponível.
3. Teste `/livros`, `/categorias`, `/saude` e CRUD de `/usuarios`, utilizando dados de demonstração.
4. Registre E01/E02 com status HTTP. Não use usuários reais.

## C. Frontend integrado

1. Abra outro terminal e execute `python -m http.server 5500 -d web`.
2. Visite `http://localhost:5500/pesquisa.html`, busque um livro e abra a tela de detalhe.
3. Na aba Network do navegador, verifique que a requisição vem da API, não de lista estática.
4. Registre E03/E04; se falhar, confira `API_BASE` em `web/Javascript/script.js`.

## D. Mineração de Dados

1. Instale os requisitos conforme `ml/README.md` e configure a URL do banco.
2. Execute os testes descritos naquele guia e registre E10.
3. Para E11, use o dataset real apenas se disponível e seguindo o procedimento de treinamento. Evite `--limpar` em bancos contendo dados valiosos.

## E. Google Cloud

1. Leia `cloud/README.md`, confirme autorização, cotas e custo estimado antes de provisionar.
2. Configure Cloud Run, Cloud SQL e Secret Manager usando as credenciais da equipe.
3. Execute o deploy e teste o endpoint hospedado; registre E08/E09 **somente se houver implantação real**.
4. Se não houver conta/faturamento, mantenha o status como “configuração preparada; implantação pendente”.

## F. Commits

1. Consulte a branch `PI6-Sprint1` ou a branch usada na entrega no GitHub.
2. Confirme commits autorais reais de cada integrante. Registre E07.
3. Não confunda assinaturas de commits com a lista de nomes no README.

## Critério de encerramento

A Sprint só deve ser declarada integralmente concluída quando **cada requisito exigido estiver implementado, executado e acompanhado de evidência real**. Este ZIP contém código e modelos de documentação, não comprova implantação ou testes externos.
