import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { api } from './api';
import { useSession } from './session';
import { Button, Field, Notice, s } from './ui';
export function Account() {
  const { usuario, setUsuario } = useSession();
  const [register, setRegister] = useState(false); const [nome, setNome] = useState('');
  const [email, setEmail] = useState(''); const [senha, setSenha] = useState('');
  const [nova, setNova] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { setNome(usuario?.nome || ''); setEmail(usuario?.email || ''); setSenha(''); setNova(''); setConfirm(''); setError(''); setMessage(''); }, [usuario?.id_usuario]);
  async function run(action: string, fn: () => Promise<void>) {
    if (busy) return; setBusy(action); setError(''); setMessage('');
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  function validateIdentity() {
    if ((register || usuario) && (nome.trim().length < 2 || nome.trim().length > 150)) throw new Error('Informe um nome com 2 a 150 caracteres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 255) throw new Error('Informe um e-mail válido.');
  }
  async function authenticate() {
    validateIdentity();
    if (!senha || senha.length > 100 || (register && senha.length < 8)) throw new Error(register ? 'A senha deve ter de 8 a 100 caracteres.' : 'Informe sua senha (até 100 caracteres).');
    if (register && senha !== confirm) throw new Error('As senhas não coincidem.');
    const user = register ? await api.cadastrar(nome.trim(), email.trim(), senha) : await api.entrar(email.trim(), senha);
    // Confirma que o transporte aceitou o cookie antes de liberar a biblioteca.
    try { await api.me(); } catch { throw new Error('O servidor não manteve a sessão. Confira HTTPS e a configuração de cookies da API.'); }
    setUsuario(user); setSenha(''); setConfirm('');
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Text style={s.label}>NEXTREAD · SUA CONTA</Text><Text accessibilityRole="header" style={s.title}>{usuario ? 'Olá, ' + usuario.nome.split(' ')[0] : register ? 'Sua próxima leitura começa aqui' : 'Que bom ter você aqui'}</Text>
      <Text style={s.subtitle}>{usuario ? 'Cuide do seu perfil e da sua conta.' : 'Entre para guardar suas descobertas e encontrar novas histórias.'}</Text>
      {error ? <Notice message={error} /> : null}{message ? <View style={s.card}><Text accessibilityRole="alert" style={s.text}>{message}</Text></View> : null}
      <View style={s.card}>
        {(register || usuario) && <Field label="Nome" value={nome} onChangeText={setNome} autoComplete="name" maxLength={150} />}
        <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={255} />
        {!usuario && <><Field label="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" maxLength={100} autoComplete={register ? 'new-password' : 'current-password'} />
          {register && <Field label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" maxLength={100} />}
          <Button title={register ? 'Criar conta' : 'Entrar'} busy={busy === 'auth'} disabled={!!busy} onPress={() => void run('auth', authenticate)} />
          <Button title={register ? 'Já tenho uma conta' : 'Quero me cadastrar'} secondary disabled={!!busy} onPress={() => { setRegister(!register); setError(''); setSenha(''); setConfirm(''); }} /></>}
        {usuario && <Button title="Salvar perfil" busy={busy === 'profile'} disabled={!!busy} onPress={() => void run('profile', async () => { validateIdentity(); const u = await api.perfil(usuario.id_usuario, nome.trim(), email.trim()); setUsuario(u); setMessage('Perfil atualizado.'); })} />}
      </View>
      {usuario && <><View style={s.card}><Text style={[s.text, { fontWeight: '700' }]}>Alterar senha</Text>
        <Field label="Senha atual" value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" maxLength={100} />
        <Field label="Nova senha" value={nova} onChangeText={setNova} secureTextEntry autoCapitalize="none" maxLength={100} />
        <Field label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" maxLength={100} />
        <Button title="Atualizar senha" secondary busy={busy === 'password'} disabled={!!busy} onPress={() => void run('password', async () => {
          if (!senha || nova.length < 8 || nova.length > 100) throw new Error('Informe a senha atual e uma nova senha com 8 a 100 caracteres.');
          if (nova !== confirm) throw new Error('As senhas não coincidem.');
          await api.senha(usuario.id_usuario, senha, nova); setSenha(''); setNova(''); setConfirm(''); setMessage('Senha atualizada.');
        })} /></View>
        <Button title="Sair da conta" secondary busy={busy === 'logout'} disabled={!!busy} onPress={() => void run('logout', async () => { await api.sair(); setUsuario(null); })} />
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
