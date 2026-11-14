import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, useWindowDimensions } from 'react-native';
import type { Livro } from './types';
import { colors, fonts, coverColor } from './theme';
export { colors, fonts } from './theme';
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, gap: 16, paddingBottom: 36 },
  title: { fontFamily: fonts.heading, fontSize: 30, lineHeight: 36, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.muted },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.ink },
  label: { fontFamily: fonts.strong, fontSize: 11, lineHeight: 16, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: colors.paper, borderRadius: 3, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  input: { fontFamily: fonts.body, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, color: colors.ink, minHeight: 48 },
  button: { backgroundColor: colors.primary, padding: 14, borderRadius: 3, borderWidth: 1, borderColor: colors.primary, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.medium, color: colors.bg, fontSize: 15 },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14, lineHeight: 22 },
  chip: { borderRadius: 3, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16 },
});
export function useBookGrid() {
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 700 ? 3 : width < 350 || fontScale > 1.3 ? 1 : 2;
  return { columns, cardWidth: (width - 40 - 16 * (columns - 1)) / columns };
}
export function Button({ title, onPress, busy = false, secondary = false, disabled = false }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} onPress={onPress} disabled={busy || disabled} style={({ pressed }) => [s.button, secondary && { backgroundColor: 'transparent' }, (busy || disabled || pressed) && { opacity: .65 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.primary : colors.bg} /> : <Text style={[s.buttonText, secondary && { color: colors.primary }]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 6 }}><Text style={[s.text, { fontFamily: fonts.medium, fontSize: 14 }]}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} onFocus={e => { setFocused(true); props.onFocus?.(e); }} onBlur={e => { setFocused(false); props.onBlur?.(e); }} style={[s.input, focused && { borderColor: colors.accent }, props.style]} /></View>;
}
export function Notice({ message, retry }: { message: string; retry?: () => void }) {
  return <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{message}</Text>{retry && <Button title="Tentar novamente" secondary onPress={retry} />}</View>;
}
export function Empty({ title, text }: { title: string; text: string }) {
  return <View style={s.card}><Text style={[s.title, { fontSize: 23, lineHeight: 29 }]}>{title}</Text><Text style={s.subtitle}>{text}</Text></View>;
}
export function Cover({ livro, large = false, width }: { livro: Livro; large?: boolean; width?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [livro.id_livro, livro.imagem_capa]);
  const w = width ?? (large ? 184 : 72);
  const size = { width: w, height: w * 1.5, borderTopLeftRadius: 2, borderBottomLeftRadius: 2, borderTopRightRadius: 4, borderBottomRightRadius: 4 };
  const url = livro.imagem_capa?.replace(/^http:\/\//i, 'https://');
  if (url && /^https:\/\//i.test(url) && !failed) return <Image accessibilityLabel={`Capa de ${livro.titulo}`} source={{ uri: url }} onError={() => setFailed(true)} style={[size, { backgroundColor: colors.paper }]} resizeMode="cover" />;
  return <View accessible accessibilityLabel={`Capa de ${livro.titulo}`} style={[size, { backgroundColor: coverColor(livro.id_livro), paddingHorizontal: w * .14, justifyContent: 'center', gap: 10, overflow: 'hidden' }]}>
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: '#00000033' }} />
    <View style={{ position: 'absolute', left: 13, right: 6, top: 6, bottom: 6, borderWidth: 1, borderColor: '#f3ebdd47' }} />
    <Text numberOfLines={4} style={{ fontFamily: fonts.heading, fontSize: w >= 180 ? 21 : w >= 130 ? 17 : 11, color: colors.bg, textAlign: 'center', lineHeight: w >= 180 ? 26 : w >= 130 ? 21 : 14 }}>{livro.titulo}</Text>
    {w >= 130 && livro.autores ? <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 10, color: colors.bg, textAlign: 'center', opacity: .85 }}>{livro.autores}</Text> : null}
  </View>;
}
export function BookCard({ livro, open, width, extra }: { livro: Livro; open: (id: number) => void; width: number; extra?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${livro.titulo}`} onPress={() => open(livro.id_livro)} style={({ pressed }) => ({ width, gap: 4, opacity: pressed ? .7 : 1 })}>
    <Cover livro={livro} width={width} />
    <Text numberOfLines={1} style={[s.label, { marginTop: 8, fontSize: 10 }]}>{livro.categoria || 'Literatura'}</Text>
    <Text numberOfLines={2} style={{ fontFamily: fonts.heading, fontSize: 18, lineHeight: 23, color: colors.ink }}>{livro.titulo}</Text>
    <Text numberOfLines={1} style={[s.subtitle, { fontSize: 12, lineHeight: 19 }]}>{livro.autores || 'Autor não informado'}</Text>
    {extra && <Text style={[s.subtitle, { fontSize: 11, lineHeight: 17 }]}>{extra}</Text>}
  </Pressable>;
}
export function BookRow({ livro, open, extra }: { livro: Livro; open: (id: number) => void; extra?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${livro.titulo}`} onPress={() => open(livro.id_livro)} style={[s.row, s.divider]}>
    <Cover livro={livro} /><View style={{ flex: 1, gap: 5 }}><Text style={s.label} numberOfLines={1}>{livro.categoria || 'Literatura'}</Text><Text numberOfLines={2} style={[s.title, { fontSize: 19, lineHeight: 25 }]}>{livro.titulo}</Text><Text numberOfLines={2} style={[s.subtitle, { fontSize: 13 }]}>{livro.autores || 'Autor não informado'}</Text>{extra && <Text style={s.subtitle}>{extra}</Text>}</View>
  </Pressable>;
}
