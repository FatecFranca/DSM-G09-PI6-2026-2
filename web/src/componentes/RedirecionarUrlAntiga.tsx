import { Navigate, useLocation } from 'react-router'
import { converterUrlAntiga } from '../logica/urlsAntigas'
import NaoEncontrada from '../paginas/NaoEncontrada'

export default function RedirecionarUrlAntiga() {
  const { pathname, search } = useLocation()
  const destino = converterUrlAntiga(pathname, search)
  return destino ? <Navigate to={destino} replace /> : <NaoEncontrada />
}
