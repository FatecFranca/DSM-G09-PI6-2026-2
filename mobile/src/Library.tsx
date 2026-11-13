import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { api } from './api';
import { recomendar } from './recommendations';
import { useSession } from './session';
import type { SugestaoComOrigem } from './types';
import { BookRow, Button, colors, Empty, Notice, s } from './ui';
export function Library({ open, login, recommendations = false }: { open: (id: number) => void; login: () => void; recommendations?: boolean }) {
  const { usuario, salvos, loading, erro, refresh } = useSession();
  const [items, setItems] = useState<SugestaoComOrigem[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [partial, setPartial] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]); setError(''); setPartial(false);
    if (!recommendations || !usuario || !salvos.length) { setBusy(false); return; }
    setBusy(true);
    recomendar(salvos, api.similares).then(data => {
      if (active) { setItems(data.itens); setPartial(data.falhas > 0); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [recommendations, usuario?.id_usuario, salvos, retry]);
  const header = <View style={{ gap: 14, marginBottom: 16 }}><Text style={s.label}>SUA ESTANTE</Text><Text accessibilityRole="header" style={s.title}>{recommendations ? 'Feito para você' : 'Livros salvos'}</Text><Text style={s.subtitle}>{recommendations ? 'Novas histórias a partir dos seus livros salvos. As sugestões usam conteúdo semelhante, sem avaliações pessoais.' : 'Reúna aqui os livros que quer conhecer.'}</Text>
    {erro ? <Notice message={erro} retry={() => void refresh()} /> : undefined}
    {error ? <Notice message={error} retry={() => setRetry(r => r + 1)} /> : undefined}
    {partial ? <Notice message="Algumas sugestões não carregaram. Os resultados disponíveis estão abaixo." retry={() => setRetry(r => r + 1)} /> : undefined}
  </View>;
  if (!usuario) return <View style={s.content}>{header}<Empty title="Sua biblioteca começa com você" text="Entre ou cadastre-se para salvar livros e receber sugestões." /><Button title="Entrar ou criar conta" onPress={login} /></View>;
  const books = recommendations ? items.map(i => i.livro) : salvos.map(i => i.livro);
  return <FlatList data={books} keyExtractor={b => String(b.id_livro)} contentContainerStyle={s.content}
    ListHeaderComponent={header} refreshing={loading || busy} onRefresh={() => { void refresh(); setRetry(r => r + 1); }}
    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    renderItem={({ item }) => {
      const rec = items.find(i => i.livro.id_livro === item.id_livro);
      return <BookRow livro={item} open={open} extra={recommendations ? rec?.origem === 'tabela' ? 'Semelhança de conteúdo · TF-IDF' : 'Sugestão pela categoria' : undefined} />;
    }}
    ListEmptyComponent={loading || busy ? <ActivityIndicator color={colors.purple} /> : !error && !erro ? <Empty title={salvos.length ? 'Sem sugestões por enquanto' : 'Sua estante está vazia'} text={salvos.length ? 'Experimente salvar outros livros para descobrir novas recomendações.' : 'Explore o catálogo, abra um livro e toque em Salvar livro.'} /> : undefined} />;
}
