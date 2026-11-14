import { Outlet } from 'react-router'
import Cabecalho from './Cabecalho'
import Rodape from './Rodape'

export default function Layout() {
  return (
    <>
      <Cabecalho />
      <main className="container">
        <Outlet />
      </main>
      <Rodape />
    </>
  )
}
