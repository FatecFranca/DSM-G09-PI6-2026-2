// Processo principal do Electron. A interface React executa sem acesso a Node ou IPC.
'use strict'
const path = require('node:path')
const { app, BrowserWindow, shell, session } = require('electron')
const { iniciarServidor } = require('./servidor.cjs')

let servidorLocal
let origemLocal
let janela

function urlExternaValida(valor) {
  try { return new URL(valor).protocol === 'https:' }
  catch { return false }
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1250,
    height: 860,
    minWidth: 870,
    minHeight: 600,
    title: 'NextRead',
    autoHideMenuBar: true,
    backgroundColor: '#F3EBDD',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      navigateOnDragDrop: false,
    },
  })
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (urlExternaValida(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  janela.webContents.on('will-navigate', (evento, url) => {
    if (url === origemLocal || url.startsWith(origemLocal + '/')) return
    evento.preventDefault()
    if (urlExternaValida(url)) void shell.openExternal(url)
  })
  void janela.loadURL(origemLocal)
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permissao, resposta) => resposta(false))
  try {
    const local = await iniciarServidor({ arquivos: path.join(__dirname, 'renderer') })
    servidorLocal = local.servidor
    origemLocal = local.origem
    criarJanela()
  } catch (erro) {
    const { dialog } = require('electron')
    dialog.showErrorBox('Falha ao iniciar NextRead', erro.message)
    app.quit()
  }
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && origemLocal) criarJanela() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { if (servidorLocal) servidorLocal.close() })
