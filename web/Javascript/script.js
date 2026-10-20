"use strict";

// Servidor local. Em producao, a Etapa 10 configurara a URL por ambiente.
const API_BASE = "http://localhost:5267";
const TAMANHO_PAGINA = 12;
let promessaUsuario = null;

async function requisitarApi(caminho, metodo = "GET", dados = undefined) {
    const mutavel = !["GET", "HEAD"].includes(metodo);
    const cabecalhos = { Accept: "application/json" };
    if (dados !== undefined) cabecalhos["Content-Type"] = "application/json";
    if (mutavel) cabecalhos["X-NextRead-Request"] = "1";
    const resposta = await fetch(`${API_BASE}${caminho}`, {
        method: metodo,
        credentials: "include",  // Cookie de sessao HttpOnly gerenciado pelo navegador
        headers: cabecalhos,
        ...(dados === undefined ? {} : { body: JSON.stringify(dados) })
    });
    const tipo = resposta.headers.get("content-type") || "";
    const corpo = resposta.status !== 204 && tipo.includes("json") ? await resposta.json() : null;
    if (!resposta.ok) {
        const erro = new Error(corpo?.title || corpo?.mensagem || `API retornou HTTP ${resposta.status}`);
        erro.status = resposta.status;
        throw erro;
    }
    return corpo;
}
function consultarApi(caminho) { return requisitarApi(caminho); }
function apiComMetodo(caminho, metodo, dados) { return requisitarApi(caminho, metodo, dados); }

function usuarioAutenticado() {
    if (!promessaUsuario) {
        promessaUsuario = consultarApi("/auth/me").catch(erro => {
            if (erro.status === 401) return null;
            promessaUsuario = null;
            throw erro;
        });
    }
    return promessaUsuario;
}
function definirUsuario(usuario) { promessaUsuario = Promise.resolve(usuario); }

async function iniciarCabecalho() {
    const botao = document.querySelector(".btn-login");
    if (!botao) return;
    try {
        const usuario = await usuarioAutenticado();
        if (!usuario) return;
        const sair = document.createElement("button");
        sair.type = "button";
        sair.className = "btn-login botao-sair";
        sair.textContent = `Sair (${usuario.nome.split(" ")[0]})`;
        sair.addEventListener("click", async () => {
            sair.disabled = true;
            try {
                await apiComMetodo("/auth/sair", "POST");
                definirUsuario(null);
                location.href = "index.html";
            } catch (erro) {
                sair.disabled = false;
                alert("Não foi possível encerrar a sessão. Tente novamente.");
            }
        });
        botao.replaceWith(sair);
    } catch (erro) { console.warn("Sessão indisponível:", erro); }
}

async function iniciarLogin() {
    const area = document.getElementById("autenticacao");
    if (!area) return;
    const mensagem = document.getElementById("mensagem-auth");
    const entrar = document.getElementById("form-entrar");
    const cadastro = document.getElementById("form-cadastro");
    const abas = document.querySelectorAll("[data-aba-auth]");
    const destinoPedido = new URLSearchParams(location.search).get("retorno") || "";
    const destino = /^(?:index|pesquisa|livro|salvos|recomendacoes)\.html(?:\?[^#]*)?$/.test(destinoPedido)
        ? destinoPedido : "salvos.html";

    function selecionar(aba) {
        const criando = aba === "cadastro";
        entrar.hidden = criando;
        cadastro.hidden = !criando;
        abas.forEach(b => {
            b.setAttribute("aria-selected", String(b.dataset.abaAuth === aba));
            b.classList.toggle("selecionado", b.dataset.abaAuth === aba);
        });
        mensagem.textContent = "";
    }
    abas.forEach(b => b.addEventListener("click", () => selecionar(b.dataset.abaAuth)));
    selecionar("entrar");

    async function enviar(form, caminho, incluirNome) {
        const botao = form.querySelector('button[type="submit"]');
        const dados = Object.fromEntries(new FormData(form).entries());
        if (incluirNome && dados.senha !== dados.confirmar_senha) {
            mensagem.textContent = "A confirmação de senha não confere.";
            return;
        }
        delete dados.confirmar_senha;
        botao.disabled = true;
        mensagem.textContent = "Aguarde...";
        try {
            const usuario = await apiComMetodo(caminho, "POST", dados);
            definirUsuario(usuario);
            location.href = destino;
        } catch (erro) {
            mensagem.textContent = erro.status === 429 ? "Muitas tentativas. Aguarde um minuto." : erro.message;
        } finally { botao.disabled = false; }
    }
    entrar.addEventListener("submit", evento => { evento.preventDefault(); enviar(entrar, "/auth/entrar", false); });
    cadastro.addEventListener("submit", evento => { evento.preventDefault(); enviar(cadastro, "/auth/cadastro", true); });
    try { if (await usuarioAutenticado()) location.href = destino; }
    catch { mensagem.textContent = "Não foi possível conectar à API. Verifique se ela está em execução."; }
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined && texto !== null) elemento.textContent = String(texto);
    return elemento;
}

function adicionarCapa(container, url, titulo) {
    if (url && /^https?:\/\//i.test(url)) {
        const img = criarElemento("img", "imagem-capa-api");
        img.src = url;
        img.alt = `Capa de ${titulo}`;
        img.loading = "lazy";
        img.onerror = () => { img.remove(); container.append(criarElemento("span", "", "SEM CAPA")); };
        container.append(img);
    } else {
        container.append(criarElemento("span", "", "SEM CAPA"));
    }
}

function montarCard(livro) {
    const card = criarElemento("article", "livro-card");
    const capa = criarElemento("div", "livro-capa");
    adicionarCapa(capa, livro.imagem_capa, livro.titulo || "Livro");
    const info = criarElemento("div", "livro-info");
    info.append(criarElemento("span", "categoria", livro.categoria || "Sem categoria"));
    info.append(criarElemento("h3", "", livro.titulo || "Sem título"));
    info.append(criarElemento("p", "", livro.autores || "Autor desconhecido"));
    const link = criarElemento("a", "", "Ver detalhes");
    link.href = `livro.html?id=${encodeURIComponent(livro.id_livro)}`;
    info.append(link);
    card.append(capa, info);
    return card;
}

// A pagina inicial exibe somente livros reais retornados pela API.
async function iniciarInicio() {
    const lista = document.getElementById("lista-destaques");
    if (!lista) return;
    const mensagem = document.getElementById("mensagem-destaques");
    lista.replaceChildren();
    mensagem.hidden = false;
    mensagem.textContent = "Carregando livros do catálogo...";
    try {
        const resposta = await consultarApi("/livros?pagina=1&tamanhoPagina=4");
        const livros = Array.isArray(resposta?.itens) ? resposta.itens : [];
        for (const livro of livros) lista.append(montarCard(livro));
        mensagem.textContent = livros.length ? "" : "Ainda não existem livros cadastrados no catálogo.";
        mensagem.hidden = livros.length > 0;
    } catch (erro) {
        mensagem.textContent = "Não foi possível carregar o catálogo. Confira se a API está em execução.";
        console.error("Destaques indisponíveis:", erro);
    }
}

async function iniciarPesquisa() {
    const form = document.getElementById("form-pesquisa");
    if (!form) return;
    const entrada = document.getElementById("busca");
    const buscaInicial = new URLSearchParams(location.search).get("busca");
    if (buscaInicial) entrada.value = buscaInicial;
    const categoria = document.getElementById("categoria");
    const lista = document.getElementById("lista-livros");
    const mensagem = document.getElementById("mensagem-resultados");
    const contador = document.querySelector(".quantidade-resultados");
    const anterior = document.getElementById("pagina-anterior");
    const proxima = document.getElementById("pagina-proxima");
    const paginaAtual = document.getElementById("pagina-atual");
    let pagina = 1;
    let requisicao = 0;

    async function carregarCategorias() {
        try {
            const dados = await consultarApi("/categorias?limite=500");
            for (const item of dados) {
                if (!item.categoria) continue;
                const opcao = document.createElement("option");
                opcao.value = item.categoria;
                opcao.textContent = item.categoria;
                categoria.append(opcao);
            }
        } catch (erro) {
            console.warn("Categorias indisponíveis:", erro);
        }
    }

    async function carregarLivros() {
        const atual = ++requisicao;
        mensagem.textContent = "Carregando livros...";
        mensagem.hidden = false;
        lista.replaceChildren();
        anterior.disabled = true;
        proxima.disabled = true;
        const parametros = new URLSearchParams({ pagina: String(pagina), tamanhoPagina: String(TAMANHO_PAGINA) });
        if (entrada.value.trim()) parametros.set("busca", entrada.value.trim());
        if (categoria.value) parametros.set("categoria", categoria.value);
        try {
            const dados = await consultarApi(`/livros?${parametros}`);
            if (atual !== requisicao) return;
            const livros = Array.isArray(dados.itens) ? dados.itens : [];
            for (const livro of livros) lista.append(montarCard(livro));
            contador.textContent = `${Number(dados.total || 0).toLocaleString("pt-BR")} livros encontrados`;
            paginaAtual.textContent = `Página ${dados.pagina} de ${Math.max(1, dados.total_paginas || 0)}`;
            anterior.disabled = pagina <= 1;
            proxima.disabled = pagina >= dados.total_paginas;
            mensagem.textContent = livros.length ? "" : "Nenhum livro encontrado para os filtros selecionados.";
            mensagem.hidden = livros.length > 0;
        } catch (erro) {
            if (atual !== requisicao) return;
            contador.textContent = "Catálogo indisponível";
            paginaAtual.textContent = "Página indisponível";
            mensagem.textContent = "Não foi possível carregar os livros. Verifique se a API está em execução em http://localhost:5267 e se o banco está acessível.";
            console.error(erro);
        }
    }

    form.addEventListener("submit", evento => { evento.preventDefault(); pagina = 1; carregarLivros(); });
    document.getElementById("aplicar-filtros").addEventListener("click", () => { pagina = 1; carregarLivros(); });
    anterior.addEventListener("click", () => { if (pagina > 1) { pagina--; carregarLivros(); } });
    proxima.addEventListener("click", () => { if (!proxima.disabled) { pagina++; carregarLivros(); } });
    carregarCategorias();
    carregarLivros();
}

async function iniciarDetalhes() {
    const container = document.getElementById("detalhes-livro");
    if (!container) return;
    const mensagem = document.getElementById("mensagem-livro");
    const id = new URLSearchParams(location.search).get("id");
    if (!id || !/^\d+$/.test(id)) {
        mensagem.textContent = "Livro não selecionado. Volte à página Explorar e escolha um livro.";
        return;
    }
    try {
        const livro = await consultarApi(`/livros/${encodeURIComponent(id)}`);
        document.getElementById("titulo-detalhe").textContent = livro.titulo || "Sem título";
        document.getElementById("categoria-detalhe").textContent = livro.categoria || "Sem categoria";
        document.getElementById("autor-detalhe").textContent = `por ${livro.autores || "Autor desconhecido"}`;
        document.getElementById("editora-detalhe").textContent = livro.editora || "Não informada";
        document.getElementById("publicacao-detalhe").textContent = [livro.mes_publicacao, livro.ano_publicacao].filter(Boolean).join(" de ") || "Não informada";
        document.getElementById("preco-detalhe").textContent = livro.preco_inicial == null ? "Não informado" : `US$ ${Number(livro.preco_inicial).toLocaleString("pt-BR", {minimumFractionDigits: 2,maximumFractionDigits:2})}`;
        document.getElementById("descricao-detalhe").textContent = livro.descricao || "Descrição não disponível.";
        const capa = document.getElementById("capa-detalhe");
        capa.replaceChildren();
        adicionarCapa(capa, livro.imagem_capa, livro.titulo || "Livro");
        document.getElementById("link-semelhantes").href = `recomendacoes.html?id=${encodeURIComponent(id)}`;
        mensagem.hidden = true;
        container.hidden = false;
        const botao = document.getElementById("botao-salvar-detalhe");
        if (botao) {
            try {
                const usuario = await usuarioAutenticado();
                botao.disabled = false;
                if (!usuario) {
                    botao.textContent = "Entrar para salvar";
                    botao.title = "Faça login para salvar este livro";
                    botao.addEventListener("click", () => {
                        location.href = `login.html?retorno=${encodeURIComponent(`livro.html?id=${id}`)}`;
                    });
                } else {
                    botao.title = "Salvar livro na sua biblioteca";
                    botao.addEventListener("click", async () => {
                        botao.disabled = true;
                        try {
                            await apiComMetodo(`/usuarios/${usuario.id_usuario}/livros-salvos/${encodeURIComponent(id)}`, "POST");
                            botao.textContent = "♥ Salvo na biblioteca";
                        } catch (erro) {
                            alert(erro.status === 401 ? "Sessão expirada. Entre novamente." : "Não foi possível salvar o livro.");
                            console.error(erro);
                        } finally { botao.disabled = false; }
                    });
                }
            } catch (erro) {
                botao.textContent = "Sessão indisponível";
                console.error(erro);
            }
        }
    } catch (erro) {
        mensagem.textContent = "Não foi possível obter os detalhes deste livro. Verifique a API e tente novamente.";
        console.error(erro);
    }
}

// Junta resultados de varios livros salvos sem recomendar livros ja salvos.
// A pontuacao vem apenas do modelo TF-IDF. O plano B por categoria nao tem porcentagem.
function agruparRecomendacoes(resultados, salvos, limite = 12) {
    const excluidos = new Set(salvos.map(item => String(item.livro.id_livro)));
    const encontrados = new Map();
    let ordem = 0;
    for (const resultado of resultados) {
        for (const item of resultado.recomendacoes || []) {
            const livro = item.livro;
            if (!livro?.id_livro || excluidos.has(String(livro.id_livro))) continue;
            const chave = String(livro.id_livro);
            if (!encontrados.has(chave)) {
                encontrados.set(chave, { livro, fontes: new Set(), melhorScore: 0, comModelo: false, ordem: ordem++ });
            }
            const alvo = encontrados.get(chave);
            alvo.fontes.add(resultado.referencia);
            if (resultado.origem === "tabela" && Number.isFinite(Number(item.score))) {
                alvo.comModelo = true;
                alvo.melhorScore = Math.max(alvo.melhorScore, Number(item.score));
            }
        }
    }
    return [...encontrados.values()]
        .sort((a, b) => b.fontes.size - a.fontes.size || b.melhorScore - a.melhorScore || a.ordem - b.ordem)
        .slice(0, limite);
}

function mostrarRecomendacao(lista, livro, textoFonte, score = null) {
    const card = montarCard(livro);
    const info = card.querySelector(".livro-info");
    if (info) {
        info.append(criarElemento("span", "recomendado-por", textoFonte));
        if (score !== null) {
            const percentual = Math.round(Math.max(0, Math.min(1, score)) * 100);
            info.append(criarElemento("span", "recomendado-por", `Similaridade TF-IDF: ${percentual}%`));
        }
    }
    lista.append(card);
}

async function iniciarRecomendacoes() {
    const lista = document.getElementById("lista-recomendacoes");
    if (!lista) return;
    const mensagem = document.getElementById("mensagem-recomendacoes");
    const referencia = document.getElementById("livro-referencia");
    const id = new URLSearchParams(location.search).get("id");
    lista.replaceChildren();
    mensagem.hidden = false;
    mensagem.textContent = "Buscando livros semelhantes...";

    try {
        // Chegou de detalhes de um livro: recomendacoes desse titulo especifico.
        if (id !== null) {
            if (!/^\d+$/.test(id)) {
                mensagem.textContent = "Livro inválido. Escolha um livro pelo catálogo.";
                return;
            }
            const [base, resultado] = await Promise.all([
                consultarApi(`/livros/${encodeURIComponent(id)}`),
                consultarApi(`/livros/${encodeURIComponent(id)}/recomendacoes?total=12`)
            ]);
            referencia.replaceChildren("Livros semelhantes a ", criarElemento("strong", "", base.titulo || `Livro ${id}`), ". ");
            const link = criarElemento("a", "", "Ver livro de referência");
            link.href = `livro.html?id=${encodeURIComponent(id)}`;
            referencia.append(link);
            const itens = Array.isArray(resultado.recomendacoes) ? resultado.recomendacoes : [];
            for (const item of itens) {
                if (!item.livro || String(item.livro.id_livro) === id) continue;
                const possuiModelo = resultado.origem === "tabela";
                mostrarRecomendacao(lista, item.livro,
                    possuiModelo ? "Recomendação por similaridade de conteúdo" : "Livro da mesma categoria",
                    possuiModelo ? Number(item.score) : null);
            }
            mensagem.textContent = lista.children.length ? "" : "Não encontramos livros semelhantes a este título no catálogo. Verifique se há outros livros da mesma categoria ou execute o treinamento do recomendador.";
            mensagem.hidden = lista.children.length > 0;
            return;
        }

        // A pagina de recomendacoes sem ?id utiliza OS LIVROS SALVOS do usuario.
        const usuario = await usuarioAutenticado();
        if (!usuario) {
            referencia.textContent = "Entre na sua conta e salve livros para receber recomendações relacionadas à sua biblioteca.";
            mensagem.replaceChildren("Faça login para ver recomendações personalizadas. ");
            const entrar = criarElemento("a", "", "Entrar ou criar conta");
            entrar.href = "login.html?retorno=recomendacoes.html";
            mensagem.append(entrar);
            return;
        }

        const itensSalvos = await consultarApi(`/usuarios/${usuario.id_usuario}/livros-salvos`);
        const salvos = Array.isArray(itensSalvos) ? itensSalvos.filter(item => item?.livro?.id_livro) : [];
        if (!salvos.length) {
            referencia.textContent = "Nenhum livro salvo na sua biblioteca ainda.";
            mensagem.replaceChildren("Salve um livro no catálogo para encontrar títulos semelhantes. ");
            const explorar = criarElemento("a", "", "Explorar livros");
            explorar.href = "pesquisa.html";
            mensagem.append(explorar);
            return;
        }

        // Considera ate os 8 livros mais recentemente salvos para limitar o uso da API.
        const amostra = salvos.slice(0, 8);
        referencia.textContent = `Sugestões com base em ${amostra.length} livro(s) salvo(s) na sua biblioteca${salvos.length > amostra.length ? " (os 8 mais recentes)" : ""}.`;
        const chamadas = await Promise.allSettled(amostra.map(async salvo => {
            const dados = await consultarApi(`/livros/${encodeURIComponent(salvo.livro.id_livro)}/recomendacoes?total=12`);
            return { referencia: salvo.livro.titulo || "Livro salvo", origem: dados.origem, recomendacoes: dados.recomendacoes };
        }));
        const resultados = chamadas.filter(item => item.status === "fulfilled").map(item => item.value);
        const falhas = chamadas.filter(item => item.status === "rejected");
        for (const falha of falhas) console.error("Recomendação de livro salvo falhou:", falha.reason);
        const sugestoes = agruparRecomendacoes(resultados, salvos);
        for (const sugestao of sugestoes) {
            const referencias = [...sugestao.fontes];
            const motivo = `Semelhante a: ${referencias.slice(0, 2).join(", ")}${referencias.length > 2 ? ` e mais ${referencias.length - 2}` : ""}`;
            mostrarRecomendacao(lista, sugestao.livro, motivo,
                sugestao.comModelo ? sugestao.melhorScore : null);
        }
        if (!sugestoes.length) {
            mensagem.textContent = falhas.length === chamadas.length
                ? "Não foi possível consultar as recomendações. Abra a API e verifique o erro no terminal do backend."
                : "Não encontramos outros livros relacionados aos seus salvos. Cadastre mais títulos das mesmas categorias ou treine o modelo de recomendações.";
            mensagem.hidden = false;
        } else {
            mensagem.textContent = falhas.length ? "Alguns livros salvos não puderam ser analisados; exibindo as recomendações disponíveis." : "";
            mensagem.hidden = falhas.length === 0;
        }
    } catch (erro) {
        mensagem.textContent = erro.status === 401
            ? "Sua sessão expirou. Faça login novamente para consultar os livros salvos."
            : "Não foi possível consultar sua biblioteca ou a API. Verifique se o backend está em execução.";
        console.error("Recomendações indisponíveis:", erro);
    }
}

async function iniciarSalvos() {
    const lista = document.getElementById("lista-salvos");
    if (!lista) return;
    const mensagem = document.getElementById("mensagem-salvos");
    const busca = document.getElementById("busca-salvos");
    const ordem = document.getElementById("ordenacao-salvos");
    const total = document.getElementById("total-salvos");
    const categorias = document.getElementById("total-categorias-salvas");
    let usuario = null;
    let itens = [];

    function atualizarTotais() {
        total.textContent = String(itens.length);
        categorias.textContent = String(new Set(itens.map(x => x.livro.categoria).filter(Boolean)).size);
    }
    function mostrar() {
        const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
        const filtrados = itens.filter(x => `${x.livro.titulo} ${x.livro.autores || ""} ${x.livro.categoria || ""}`.toLocaleLowerCase("pt-BR").includes(termo));
        filtrados.sort((a, b) => {
            if (ordem.value === "Título A-Z") return a.livro.titulo.localeCompare(b.livro.titulo, "pt-BR");
            if (ordem.value === "Título Z-A") return b.livro.titulo.localeCompare(a.livro.titulo, "pt-BR");
            const dif = new Date(b.data_salvo) - new Date(a.data_salvo);
            return ordem.value === "Mais antigos" ? -dif : dif;
        });
        lista.replaceChildren();
        for (const item of filtrados) {
            const card = montarCard(item.livro);
            const acoes = criarElemento("div", "card-acoes");
            const remover = criarElemento("button", "", "Remover dos salvos");
            remover.type = "button";
            remover.addEventListener("click", async () => {
                remover.disabled = true;
                try {
                    await apiComMetodo(`/usuarios/${usuario.id_usuario}/livros-salvos/${item.livro.id_livro}`, "DELETE");
                    itens = itens.filter(x => x.id_salvo !== item.id_salvo);
                    atualizarTotais(); mostrar();
                } catch (erro) {
                    mensagem.textContent = erro.status === 401 ? "Sessão expirada. Entre novamente." : "Falha ao remover o livro.";
                    remover.disabled = false;
                }
            });
            acoes.append(remover);
            card.querySelector(".livro-info").append(acoes);
            lista.append(card);
        }
        mensagem.textContent = filtrados.length ? "" : "Nenhum livro salvo encontrado.";
    }
    busca.addEventListener("input", mostrar);
    ordem.addEventListener("change", mostrar);
    try {
        usuario = await usuarioAutenticado();
        if (!usuario) {
            mensagem.replaceChildren("Entre na sua conta para visualizar a biblioteca. ");
            const link = criarElemento("a", "", "Entrar ou criar conta");
            link.href = "login.html?retorno=salvos.html";
            mensagem.append(link);
            return;
        }
        mensagem.textContent = `Carregando biblioteca de ${usuario.nome}...`;
        const resposta = await consultarApi(`/usuarios/${usuario.id_usuario}/livros-salvos`);
        itens = Array.isArray(resposta) ? resposta : [];
        atualizarTotais(); mostrar();
    } catch (erro) {
        lista.replaceChildren();
        mensagem.textContent = "Não foi possível carregar a biblioteca. Verifique sua sessão e a API.";
        console.error(erro);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarCabecalho();
    iniciarLogin();
    iniciarInicio();
    iniciarPesquisa();
    iniciarDetalhes();
    iniciarRecomendacoes();
    iniciarSalvos();
});
