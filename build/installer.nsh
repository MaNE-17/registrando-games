; Instala em  %LOCALAPPDATA%\Registrando Games\Programa
; (os dados do usuario ficam ao lado, em  ...\Registrando Games\Dados, e nunca sao apagados pelo instalador)
!macro preInit
  SetRegView 64
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Registrando Games\Programa"
  SetRegView 32
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Registrando Games\Programa"
!macroend
