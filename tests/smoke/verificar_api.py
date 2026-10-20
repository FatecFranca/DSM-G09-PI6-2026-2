"""Teste HTTP de integracao NextRead (Etapa 9).
Executar apenas contra banco de DESENVOLVIMENTO, com PostgreSQL inicializado.
Uso: python tests/smoke/verificar_api.py --base-url http://localhost:5267
Nao instala pacotes: usa cookies, urllib e biblioteca padrao.
"""
import argparse
import json
import sys
import uuid
from http.cookiejar import CookieJar
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener


def client():
    return build_opener(HTTPCookieProcessor(CookieJar()))


def request(opener, base, method, path, payload=None, custom_header=True):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if method not in ("GET", "HEAD") and custom_header:
        headers["X-NextRead-Request"] = "1"
    req = Request(base.rstrip("/") + path, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=15) as res:
            body = res.read().decode("utf-8")
            return res.status, json.loads(body) if body else None
    except HTTPError as err:
        body = err.read().decode("utf-8")
        try:
            result = json.loads(body) if body else None
        except ValueError:
            result = body[:300]
        return err.code, result


def require(condition, description):
    if not condition:
        raise AssertionError(description)
    print("[OK]", description)


def main(base):
    anon, a, b = client(), client(), client()
    usuario_a = usuario_b = None
    suffix = uuid.uuid4().hex[:12]
    email_a = f"nextread-etapa9-a-{suffix}@example.invalid"
    email_b = f"nextread-etapa9-b-{suffix}@example.invalid"
    senha = "SenhaTeste123!"
    try:
        status, body = request(anon, base, "GET", "/pronto")
        require(status == 200 and body.get("status") == "iniciado", "GET /pronto = 200")

        status, body = request(anon, base, "GET", "/livros?pagina=1&tamanhoPagina=5")
        require(status == 200 and isinstance(body.get("itens"), list), "Catalogo disponivel")
        livro = body["itens"][0]["id_livro"] if body["itens"] else None
        if livro is None:
            print("[AVISO] Nenhum livro: teste de salvar nao sera realizado")

        status, _ = request(anon, base, "GET", "/auth/me")
        require(status == 401, "GET /auth/me sem cookie = 401")
        status, _ = request(anon, base, "GET", "/usuarios/1/livros-salvos")
        require(status == 401, "Livros salvos sem cookie = 401")
        status, _ = request(anon, base, "POST", "/auth/cadastro",
                            {"nome": "Teste", "email": email_a, "senha": senha}, custom_header=False)
        require(status == 400, "POST sem header anti-CSRF = 400")

        dados_a = {"nome": "Teste Etapa Nove", "email": email_a, "senha": senha}
        status, body = request(a, base, "POST", "/auth/cadastro", dados_a)
        require(status == 201 and isinstance(body.get("id_usuario"), int), "Cadastro cria usuario e sessao")
        usuario_a = body["id_usuario"]
        require("senha_hash" not in body, "Hash de senha nao e exposto")
        status, _ = request(anon, base, "POST", "/auth/cadastro", dados_a)
        require(status == 409, "E-mail duplicado = 409")

        status, body = request(a, base, "GET", "/auth/me")
        require(status == 200 and body.get("id_usuario") == usuario_a, "Sessao identifica titular")
        status, _ = request(a, base, "GET", "/usuarios")
        require(status == 403, "Listagem geral de contas bloqueada para usuarios comuns")
        status, _ = request(a, base, "PUT", f"/usuarios/{usuario_a}",
                            {"nome": "Teste Atualizado", "email": email_a})
        require(status == 200, "Usuario atualiza os proprios dados")

        status, body = request(b, base, "POST", "/auth/cadastro",
                               {"nome": "Outra Pessoa", "email": email_b, "senha": senha})
        require(status == 201, "Segundo cadastro criado")
        usuario_b = body["id_usuario"]
        status, _ = request(b, base, "GET", f"/usuarios/{usuario_a}")
        require(status == 403, "Uma conta nao le os dados de outra")
        status, _ = request(b, base, "GET", f"/usuarios/{usuario_a}/livros-salvos")
        require(status == 403, "Uma conta nao le os salvos da outra")
        status, _ = request(b, base, "DELETE", f"/usuarios/{usuario_a}")
        require(status == 403, "Uma conta nao exclui outra")
        if livro is not None:
            status, _ = request(b, base, "POST", f"/usuarios/{usuario_a}/livros-salvos/{livro}")
            require(status == 403, "Uma conta nao salva livros para outra")
            status, _ = request(a, base, "POST", f"/usuarios/{usuario_a}/livros-salvos/{livro}")
            require(status in (200, 201), "Titular pode salvar livro")
            status, salvos = request(a, base, "GET", f"/usuarios/{usuario_a}/livros-salvos")
            require(status == 200 and any(x["livro"]["id_livro"] == livro for x in salvos),
                    "Livro salvo aparece na biblioteca")
            status, _ = request(a, base, "DELETE", f"/usuarios/{usuario_a}/livros-salvos/{livro}")
            require(status == 204, "Titular pode remover livro salvo")

        status, _ = request(a, base, "POST", "/auth/sair")
        require(status == 204, "Logout encerra sessao")
        status, _ = request(a, base, "GET", "/auth/me")
        require(status == 401, "Cookie invalido apos logout")
        status, _ = request(a, base, "POST", "/auth/entrar", {"email": email_a, "senha": "errada"})
        require(status == 401, "Senha incorreta = 401")
        status, body = request(a, base, "POST", "/auth/entrar", {"email": email_a, "senha": senha})
        require(status == 200 and body.get("id_usuario") == usuario_a, "Login com senha correta")
        status, _ = request(a, base, "DELETE", f"/usuarios/{usuario_a}")
        require(status == 204, "Titular remove sua conta de teste")
        usuario_a = None
        status, _ = request(a, base, "GET", "/auth/me")
        require(status == 401, "Sessao encerrada apos exclusao")
        status, _ = request(b, base, "DELETE", f"/usuarios/{usuario_b}")
        require(status == 204, "Segundo usuario de teste removido")
        usuario_b = None
        print("\nRESULTADO: validacao de autenticacao e autorizacao aprovada.")
        return 0
    except (AssertionError, URLError, TimeoutError, ValueError, KeyError, TypeError, AttributeError) as erro:
        print("\n[FALHA]", erro, file=sys.stderr)
        return 1
    finally:
        for opener, usuario in ((a, usuario_a), (b, usuario_b)):
            if usuario is not None:
                try:
                    status, _ = request(opener, base, "DELETE", f"/usuarios/{usuario}")
                    print(f"[LIMPEZA] {usuario}: HTTP {status}")
                except Exception as erro:
                    print(f"[AVISO] Remova manualmente usuario {usuario}: {erro}", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:5267")
    args = parser.parse_args()
    sys.exit(main(args.base_url))
