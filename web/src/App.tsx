import { Route, Routes } from 'react-router'
import Layout from './componentes/Layout'
import RedirecionarUrlAntiga from './componentes/RedirecionarUrlAntiga'
import Biblioteca from './paginas/Biblioteca'
import Entrar from './paginas/Entrar'
import Explorar from './paginas/Explorar'
import Inicio from './paginas/Inicio'
import Livro from './paginas/Livro'
import Recomendacoes from './paginas/Recomendacoes'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="explorar" element={<Explorar />} />
        <Route path="livro/:id" element={<Livro />} />
        <Route path="recomendacoes" element={<Recomendacoes />} />
        <Route path="biblioteca" element={<Biblioteca />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="*" element={<RedirecionarUrlAntiga />} />
      </Route>
    </Routes>
  )
}
