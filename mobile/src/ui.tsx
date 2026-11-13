import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import type { Livro } from './types';
export const colors = { bg: '#F5F3EE', paper: '#FFFFFF', ink: '#242038', muted: '#716D80', purple: '#4C3898', light: '#E8E3FF', border: '#E3DFD7', danger: '#A12636' };
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, gap: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink }, subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },
  text: { fontSize: 15, lineHeight: 23, color: colors.ink }, label: { fontSize: 13, fontWeight: '700', color: colors.purple, letterSpacing: 1 },
  card: { backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.ink, minHeight: 48 },
  button: { backgroundColor: colors.purple, padding: 14, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  chip: { borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
});
export function Button({ title, onPress, busy = false, secondary = false, disabled = false }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} onPress={onPress} disabled={busy || disabled} style={[s.button, secondary && { backgroundColor: colors.light }, (busy || disabled) && { opacity: .6 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.purple : '#FFF'} /> : <Text style={[s.buttonText, secondary && { color: colors.purple }]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={s.text}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={s.input} {...props} /></View>;
}
export function Notice({ message, retry }: { message: string; retry?: () => void }) {
  return <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{message}</Text>{retry && <Button title="Tentar novamente" secondary onPress={retry} />}</View>;
}
export function Empty({ title, text }: { title: string; text: string }) {
  return <View style={s.card}><Text style={[s.title, { fontSize: 20 }]}>{title}</Text><Text style={s.subtitle}>{text}</Text></View>;
}
export function Cover({ livro, large = false }: { livro: Livro; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = { width: large ? 144 : 68, height: large ? 212 : 102 };
  const url = livro.imagem_capa?.replace(/^http:\/\//i, 'https://');
  return url && /^https:\/\//i.test(url) && !failed
    ? <Image accessibilityLabel={`Capa de ${livro.titulo}`} source={{ uri: url }} onError={() => setFailed(true)} style={[size, { borderRadius: 8, backgroundColor: colors.light }]} resizeMode="cover" />
    : <View style={[size, { backgroundColor: colors.light, borderRadius: 8, padding: 8, justifyContent: 'center' }]}><Text numberOfLines={4} style={{ color: colors.purple, fontWeight: '700', fontSize: large ? 18 : 11 }}>{livro.titulo}</Text></View>;
}
export function BookRow({ livro, open, extra }: { livro: Livro; open: (id: number) => void; extra?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${livro.titulo}`} onPress={() => open(livro.id_livro)} style={[s.card, s.row]}>
    <Cover livro={livro} /><View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={[s.text, { fontWeight: '700' }]}>{livro.titulo}</Text><Text numberOfLines={2} style={s.subtitle}>{livro.autores || 'Autor não informado'}</Text><Text numberOfLines={1} style={{ color: colors.purple, fontSize: 12 }}>{extra || livro.categoria || 'Literatura'}</Text></View><Text style={{ color: colors.purple }}>›</Text>
  </Pressable>;
}
