import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Account } from './src/Account';
import { BookDetails } from './src/BookDetails';
import { Catalog } from './src/Catalog';
import { Library } from './src/Library';
import { SessionProvider } from './src/session';
import { colors, s } from './src/ui';
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
      {bookId !== undefined && <Pressable
        accessibilityRole="button" accessibilityLabel="Voltar"
        accessibilityHint="Retorna à tela anterior" onPress={back}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.light : colors.paper, borderWidth: 1, borderColor: colors.border })}>
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: 20, height: 20 }}>
          <View style={{ position: 'absolute', left: 2, top: 9, width: 17, height: 2, borderRadius: 1, backgroundColor: colors.purple }} />
          <View style={{ position: 'absolute', left: 2, top: 4, width: 12, height: 12, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.purple, transform: [{ rotate: '45deg' }] }} />
        </View>
      </Pressable>}
      <Text style={{ fontSize: 23, fontWeight: '800', color: colors.purple }}>NextRead<Text style={{ color: colors.ink }}>.</Text></Text>
    </View>
    <View style={{ flex: 1 }}>
      {bookId !== undefined ? <BookDetails key={bookId} id={bookId} open={open} login={login} /> : tab === 'catalogo' ? <Catalog open={open} /> : tab === 'conta' ? <Account /> : <Library key={tab} recommendations={tab === 'sugestoes'} open={open} login={login} />}
    </View>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.border }}>
      {([{ id: 'catalogo', label: 'Explorar', icon: '⌕' }, { id: 'salvos', label: 'Salvos', icon: '▤' }, { id: 'sugestoes', label: 'Para você', icon: '✧' }, { id: 'conta', label: 'Conta', icon: '○' }] as const).map(t => <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id && !stack.length }} onPress={() => { setStack([]); setTab(t.id); }} style={{ flex: 1, paddingVertical: 10, minHeight: 62, alignItems: 'center', gap: 2 }}>
        <Text style={{ fontSize: 23, color: tab === t.id ? colors.purple : colors.muted }}>{t.icon}</Text><Text style={{ fontSize: 11, fontWeight: tab === t.id ? '800' : '400', color: tab === t.id ? colors.purple : colors.muted }}>{t.label}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><SessionProvider><Navigation /></SessionProvider></SafeAreaProvider>; }
