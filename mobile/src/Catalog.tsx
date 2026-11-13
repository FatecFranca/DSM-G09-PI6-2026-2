import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, View, Pressable } from 'react-native';
import { api } from './api';
import type { Categoria, Livro } from './types';
import { BookRow, Button, colors, Empty, Field, Notice, s } from './ui';
export function Catalog({ open }: { open: (id: number) => void }) {
  const [draft, setDraft] = useState(''); const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState(''); const [cats, setCats] = useState<Categoria[]>([]);
  const [items, setItems] = useState<Livro[]>([]); const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0); const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [catError, setCatError] = useState(''); const seq = useRef(0); const lock = useRef(false);
  async function load(p = 1) {
    if (p > 1 && lock.current) return;
    lock.current = true; const id = ++seq.current; setBusy(true); setError('');
    try {
      const data = await api.livros(p, busca, categoria);
      if (id !== seq.current) return;
      setItems(old => p === 1 ? data.itens : [...old, ...data.itens.filter(x => !old.some(y => y.id_livro === x.id_livro))]);
      setPage(data.pagina); setPages(data.total_paginas); setTotal(data.total);
    } catch (e) { if (id === seq.current) setError((e as Error).message); }
    finally { if (id === seq.current) { lock.current = false; setBusy(false); } }
  }
  function loadCats() { setCatError(''); api.categorias().then(setCats).catch(() => setCatError('As categorias não carregaram.')); }
  useEffect(() => { loadCats(); }, []);
  useEffect(() => { setItems([]); setPage(0); void load(); return () => { seq.current++; lock.current = false; }; }, [busca, categoria]);
  return <FlatList data={items} keyExtractor={b => String(b.id_livro)} contentContainerStyle={s.content}
    refreshing={busy && page === 1} onRefresh={() => load()} ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    ListHeaderComponent={<View style={{ gap: 16, marginBottom: 18 }}>
      <View style={[s.card, { backgroundColor: colors.purple, borderColor: colors.purple, padding: 24 }]}><Text style={{ color: '#D9D0FF', fontWeight: '700', letterSpacing: 2 }}>SUA PRÓXIMA HISTÓRIA</Text><Text style={[s.title, { color: '#FFF', fontSize: 30 }]}>Um novo livro.{'\n'}Um novo universo.</Text><Text style={{ color: '#EAE5FF', lineHeight: 22 }}>Descubra leituras que combinam com você.</Text></View>
      <Text accessibilityRole="header" style={s.title}>Explorar catálogo</Text>
      <Field label="Título ou autor" placeholder="O que vamos ler hoje?" value={draft} onChangeText={setDraft} returnKeyType="search" onSubmitEditing={() => { if (draft.trim() === busca) void load(); else setBusca(draft.trim()); }} />
      <Button title="Buscar livros" onPress={() => { if (draft.trim() === busca) void load(); else setBusca(draft.trim()); }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ categoria: '', total_livros: 0 }, ...cats].map(c => <Pressable key={c.categoria} accessibilityRole="button" accessibilityState={{ selected: categoria === c.categoria }} onPress={() => setCategoria(c.categoria)} style={[s.chip, categoria === c.categoria && { backgroundColor: colors.light, borderColor: colors.purple }]}><Text style={{ color: colors.purple }}>{c.categoria || 'Todos'}</Text></Pressable>)}
      </ScrollView>
      {catError ? <Notice message={catError} retry={loadCats} /> : undefined}
      <Text style={s.subtitle}>{total.toLocaleString('pt-BR')} livros encontrados</Text>
      {error ? <Notice message={error} retry={() => load(page > 0 && items.length ? page + 1 : 1)} /> : undefined}
    </View>}
    renderItem={({ item }) => <BookRow livro={item} open={open} />}
    ListEmptyComponent={busy ? <ActivityIndicator color={colors.purple} /> : !error ? <Empty title="Nenhum livro encontrado" text="Experimente outro título, autor ou categoria." /> : undefined}
    ListFooterComponent={items.length && page < pages ? <View style={{ marginTop: 16 }}><Button title="Carregar mais livros" busy={busy} secondary onPress={() => load(page + 1)} /></View> : undefined} />;
}
