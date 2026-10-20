const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const fonte = fs.readFileSync(path.join(__dirname, '../../web/Javascript/script.js'), 'utf8');
class FakeElement {
    constructor(tag = 'div') {
        this.tagName = tag;
        this.children = [];
        this.textContent = '';
        this.hidden = false;
        this.className = '';
        this.href = '';
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; }
    querySelector(seletor) {
        if (seletor === '.livro-info') return this.children.find(item => item?.className === 'livro-info') || null;
        return null;
    }
    setAttribute() {}
}
function ambiente(rotas, pesquisa = '') {
    const elementos = new Map();
    const requisicoes = [];
    const contexto = vm.createContext({
        URLSearchParams, encodeURIComponent, String, Number, Promise, Set, Map,
        console,
        location: {search: pesquisa},
        document: {
            addEventListener() {},
            createElement(tag) { return new FakeElement(tag); },
            getElementById(id) {
                if (!elementos.has(id)) elementos.set(id, new FakeElement());
                return elementos.get(id);
            },
            querySelector() { return null; }
        },
        fetch: async url => {
            const rota = new URL(url).pathname + new URL(url).search;
            requisicoes.push(rota);
            if (!Object.hasOwn(rotas, rota)) throw new Error(`Rota nao mockada: ${rota}`);
            const valor = rotas[rota];
            return {status: 200, ok: true, headers: {get: () => 'application/json'}, json: async () => valor};
        }
    });
    vm.runInContext(fonte, contexto);
    return {contexto, elementos, requisicoes};
}
function livro(id, titulo) {
    return {id_livro: id, titulo, autores: 'Teste', categoria: 'Fantasia', imagem_capa: null};
}

test('inicio so exibe titulos retornados pelo PostgreSQL via API', async () => {
    const base = ambiente({'/livros?pagina=1&tamanhoPagina=4': {itens: [livro(10, 'LIVRO REAL 1'), livro(11, 'LIVRO REAL 2')]}});
    await vm.runInContext('iniciarInicio()', base.contexto);
    const lista = base.elementos.get('lista-destaques');
    assert.equal(lista.children.length, 2);
    assert.equal(lista.children[0].children[1].children[1].textContent, 'LIVRO REAL 1');
    assert.equal(lista.children[0].children[1].children[3].href, 'livro.html?id=10');
    assert.equal(base.elementos.get('mensagem-destaques').hidden, true);
});

test('recomendacoes usam salvos, excluem salvos e duplicados', async () => {
    const base = ambiente({
        '/auth/me': {id_usuario: 5, nome: 'Teste'},
        '/usuarios/5/livros-salvos': [{livro: livro(10, 'Salvo A')}, {livro: livro(11, 'Salvo B')}],
        '/livros/10/recomendacoes?total=12': {origem: 'categoria', recomendacoes: [
            {livro: livro(11, 'Salvo B'), score: 0},
            {livro: livro(20, 'Relacionado'), score: 0}
        ]},
        '/livros/11/recomendacoes?total=12': {origem: 'tabela', recomendacoes: [
            {livro: livro(20, 'Relacionado'), score: 0.85},
            {livro: livro(21, 'Outro'), score: 0.52}
        ]}
    });
    await vm.runInContext('iniciarRecomendacoes()', base.contexto);
    const lista = base.elementos.get('lista-recomendacoes');
    assert.equal(lista.children.length, 2);
    assert.equal(lista.children[0].children[1].children[1].textContent, 'Relacionado');
    assert.equal(lista.children[1].children[1].children[1].textContent, 'Outro');
    assert.equal(base.elementos.get('mensagem-recomendacoes').hidden, true);
    assert.equal(base.requisicoes.includes('/livros?pagina=1&tamanhoPagina=1'), false);
});

test('sem login nao mostra livros aleatorios e indica entrar', async () => {
    const base = ambiente({'/auth/me': null});
    await vm.runInContext('iniciarRecomendacoes()', base.contexto);
    assert.equal(base.elementos.get('lista-recomendacoes').children.length, 0);
    assert.equal(base.requisicoes.length, 1);
});

test('detalhes de livro pedem sugestoes para o id selecionado', async () => {
    const base = ambiente({
        '/livros/8': livro(8, 'Referencia'),
        '/livros/8/recomendacoes?total=12': {origem: 'categoria', recomendacoes: [{livro: livro(9, 'Relacionado'), score: 0}]}
    }, '?id=8');
    await vm.runInContext('iniciarRecomendacoes()', base.contexto);
    assert.equal(base.elementos.get('lista-recomendacoes').children.length, 1);
    assert.deepEqual(base.requisicoes.sort(), ['/livros/8', '/livros/8/recomendacoes?total=12'].sort());
});
