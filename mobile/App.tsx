import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Account } from './src/Account';
import { BookDetails } from './src/BookDetails';
import { Catalog } from './src/Catalog';
import { Library } from './src/Library';
import { SessionProvider } from './src/session';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import { colors, fonts, s } from './src/ui';
type Tab = 'catalogo' | 'salvos' | 'sugestoes' | 'conta';
function Navigation() {
  const [tab, setTab] = useState<Tab>('catalogo'); const [stack, setStack] = useState<number[]>([]);
  const open = (id: number) => setStack(old => [...old, id]);
  const back = () => setStack(old => old.slice(0, -1));
  const login = () => { setStack([]); setTab('conta'); };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length) { back(); return true; }
      if (tab !== 'catalogo') { setTab('catalogo'); return true; }
      return false;
    }); return () => subscription.remove();
  }, [stack.length, tab]);
  const bookId = stack[stack.length - 1];
  return <SafeAreaView style={s.page}><StatusBar barStyle="dark-content" />
    <View style={{ paddingHorizontal: 20, paddingVertical: 10, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Image source={require('./assets/logo-nextread.png')} accessibilityLabel="NextRead" style={{ width: 150, height: 41, resizeMode: 'contain' }} />
      <View style={{ flex: 1 }} />
      {bookId !== undefined && <Pressable accessibilityRole="button" accessibilityLabel="Voltar" accessibilityHint="Retorna à tela anterior" onPress={back}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.light : 'transparent' })}>
        <Feather name="arrow-left" size={24} color={colors.primary} />
      </Pressable>}
    </View>
    <View style={{ flex: 1 }}>
      {bookId !== undefined ? <BookDetails key={bookId} id={bookId} open={open} login={login} /> : tab === 'catalogo' ? <Catalog open={open} /> : tab === 'conta' ? <Account /> : <Library key={tab} recommendations={tab === 'sugestoes'} open={open} login={login} />}
    </View>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.border }}>
      {([{ id: 'catalogo', label: 'Explorar', icon: 'search' }, { id: 'salvos', label: 'Salvos', icon: 'bookmark' }, { id: 'sugestoes', label: 'Para você', icon: 'compass' }, { id: 'conta', label: 'Conta', icon: 'user' }] as const).map(t => <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id && !stack.length }} onPress={() => { setStack([]); setTab(t.id); }} style={{ flex: 1, paddingVertical: 10, minHeight: 62, alignItems: 'center', gap: 2 }}>
        <Feather name={t.icon} size={22} color={tab === t.id ? colors.primary : colors.muted} /><Text style={{ fontSize: 11, fontFamily: tab === t.id ? fonts.strong : fonts.body, color: tab === t.id ? colors.primary : colors.muted }}>{t.label}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}
export default function App() {
  const [loaded, error] = useFonts({
    Fraunces: require('./assets/fonts/Fraunces_600SemiBold.ttf'),
    FrauncesItalic: require('./assets/fonts/Fraunces_400Regular_Italic.ttf'),
    Inter: require('./assets/fonts/Inter_400Regular.ttf'),
    InterMedium: require('./assets/fonts/Inter_500Medium.ttf'),
    InterSemiBold: require('./assets/fonts/Inter_600SemiBold.ttf'),
    ...Feather.font,
  });
  return <SafeAreaProvider>{!loaded && !error ? <SafeAreaView style={[s.page, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></SafeAreaView> : <SessionProvider><Navigation /></SessionProvider>}</SafeAreaProvider>;
}
