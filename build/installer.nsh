; Padrao: %LOCALAPPDATA%\Registrando Games\Programa
; A pessoa pode escolher outra pasta no instalador. O app sempre fica em "...\Registrando Games\Programa"
; e os dados ao lado, em "...\Registrando Games\Dados" (nunca apagados pelo instalador/desinstalador).
!macro preInit
  SetRegView 64
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 +2
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Registrando Games\Programa"
  SetRegView 32
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 +2
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\Registrando Games\Programa"
!macroend

; Depois de escolher a pasta: garante "...\Registrando Games\Programa" (os Dados ficam ao lado, fora da pasta do programa)
!macro customPageAfterChangeDir
  Page custom rgFixDir
  Function rgFixDir
    StrCpy $1 $INSTDIR "" -1
    StrCmp $1 "\" 0 +2
    StrCpy $INSTDIR $INSTDIR -1
    StrCpy $0 $INSTDIR "" -9
    StrCmp $0 "\Programa" rgdone
    StrCpy $0 $INSTDIR "" -18
    StrCmp $0 "\Registrando Games" 0 rgsub
    StrCpy $INSTDIR "$INSTDIR\Programa"
    Goto rgdone
    rgsub:
    StrCpy $INSTDIR "$INSTDIR\Registrando Games\Programa"
    rgdone:
    Abort
  FunctionEnd
!macroend
