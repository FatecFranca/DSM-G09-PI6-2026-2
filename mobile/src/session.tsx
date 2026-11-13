import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import type { Salvo, Usuario } from './types';
interface Session {
  usuario: Usuario | null; setUsuario: (u: Usuario | null) => void;
  salvos: Salvo[]; loading: boolean; erro: string; refresh: () => Promise<void>;
}
const Context = createContext<Session>(null!);
export const useSession = () => useContext(Context);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [salvos, setSalvos] = useState<Salvo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const generation = React.useRef(0);
  const currentUser = React.useRef<number | null>(null);
  const updateUser = (u: Usuario | null) => {
    if (!u) generation.current++;
    if (currentUser.current !== (u?.id_usuario ?? null)) { generation.current++; setSalvos([]); }
    currentUser.current = u?.id_usuario ?? null;
    setErro(''); setUsuario(u);
  };
  async function refresh() {
    if (!usuario) return;
    const current = generation.current;
    setLoading(true); setErro('');
    try { const items = await api.salvos(usuario.id_usuario); if (current === generation.current) setSalvos(items); }
    catch (e) { if (current === generation.current) setErro((e as Error).message); }
    finally { if (current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    api.onExpired(() => updateUser(null));
    // O cookie fica no transporte nativo; senha e cookie não são copiados para armazenamento JS.
    const initial = generation.current;
    api.me().then(u => { if (generation.current === initial) updateUser(u); }).catch(() => {});
    return () => api.onExpired(() => {});
  }, []);
  useEffect(() => { if (usuario) void refresh(); else { setSalvos([]); setLoading(false); } }, [usuario?.id_usuario]);
  return <Context.Provider value={{ usuario, setUsuario: updateUser, salvos, loading, erro, refresh }}>{children}</Context.Provider>;
}
