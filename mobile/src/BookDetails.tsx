import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { api } from './api';
import { useSession } from './session';
import type { Detalhe, Recomendacoes } from './types';
import { BookRow, Button, colors, Cover, Empty, Notice, s } from './ui';
export function BookDetails({ id, open, login }: { id: number; open: (id: number) => void; login: () => void }) {
  const { usuario, salvos, refresh, erro: libraryError } = useSession();
  const [book, setBook] = useState<Detalhe | null>(null);
  const [similar, setSimilar] = useState<Recomendacoes | null>(null);
  const [error, setError] = useState(''); const [similarError, setSimilarError] = useState('');
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0);
  const saved = salvos.some(s => s.livro.id_livro === id);
  useEffect(() => {
    let active = true; setBook(null); setSimilar(null); setError(''); setSimilarError('');
    api.detalhe(id).then(b => { if (active) setBook(b); }).catch(e => { if (active) setError(e.message); });
    api.similares(id).then(r => { if (active) setSimilar(r); }).catch(e => { if (active) setSimilarError(e.message); });
    return () => { active = false; };
  }, [id, retry]);
  async function toggle() {
    if (!usuario) { login(); return; }
    setBusy(true); setActionError('');
    try { if (saved) await api.remover(usuario.id_usuario, id); else await api.salvar(usuario.id_usuario, id); await refresh(); }
    catch (e) { setActionError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={s.content}>
    {error ? <Notice message={error} retry={() => setRetry(r => r + 1)} /> : !book ? <ActivityIndicator color={colors.purple} /> : <>
      <View style={{ alignItems: 'center', paddingVertical: 12 }}><Cover key={book.id_livro} livro={book} large /></View>
      <Text style={s.label}>{book.categoria || 'LITERATURA'}</Text><Text accessibilityRole="header" style={s.title}>{book.titulo}</Text><Text style={s.subtitle}>{book.autores || 'Autor não informado'}</Text>
      <Button title={usuario ? saved ? 'Remover dos salvos' : 'Salvar livro' : 'Entrar para salvar'} busy={busy} onPress={() => void toggle()} />
      {actionError || libraryError ? <Notice message={actionError || libraryError} retry={() => void refresh()} /> : null}
      <View style={s.card}><Text style={[s.text, { fontWeight: '700' }]}>Sobre o livro</Text><Text style={s.text}>{book.descricao || 'Descrição não disponível para este título.'}</Text></View>
      <View style={s.card}>{[
        ['Editora', book.editora], ['Publicação', book.ano_publicacao], ['ISBN', book.isbn], ['Avaliação do catálogo', book.avaliacao_media],
      ].map(([label, value]) => <Text key={label} style={s.text}>{label}: {value ?? 'Não informado'}</Text>)}</View>
      <Text style={[s.title, { fontSize: 23 }]}>Continue descobrindo</Text>
      {similar && <Text style={s.subtitle}>{similar.origem === 'tabela' ? 'Livros com conteúdo semelhante, calculados pelo modelo TF-IDF.' : 'Sugestões da mesma categoria. O modelo ainda não retornou similares para este livro.'}</Text>}
      {similarError ? <Notice message={similarError} retry={() => setRetry(r => r + 1)} /> : !similar ? <ActivityIndicator color={colors.purple} /> : similar.recomendacoes.length ? similar.recomendacoes.map(r => <BookRow key={r.livro.id_livro} livro={r.livro} open={open} />) : <Empty title="Nenhum similar encontrado" text="Explore outros títulos no catálogo." />}
    </>}
  </ScrollView>;
}
