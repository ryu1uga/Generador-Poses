; Personalizacion del instalador NSIS de electron-builder.
;
; El unico motivo de existir de este archivo es que la aplicacion guarda las
; poses del usuario en la carpeta de datos de Electron. Sin esto, el
; desinstalador estandar dejaria ese archivo huerfano en el disco sin
; mencionarlo. Aqui se pregunta de forma explicita, conservando por defecto.
;
; La instalacion es SIEMPRE por usuario (perMachine false, allowElevation
; false). Es deliberado: si el instalador permitiera "para todos los usuarios",
; el desinstalador correria elevado y $APPDATA apuntaria al perfil del
; administrador, no al de quien guardo las poses. Asi la ruta siempre coincide.
;
; OJO con el nombre de la carpeta: Electron usa app.getName(), que devuelve
; `productName` ("Manga Pose Studio") y NO `name` ("manga-pose-studio"). Por
; eso se comprueban las dos variantes: PRODUCT_NAME es la buena hoy, y
; APP_PACKAGE_NAME cubre el caso de que productName se elimine en el futuro.
;
; Las variables tienen que salir de la lista que electron-builder pasa a
; makensis (se ve en el log del build como "Command line defined"). NSIS trata
; los avisos como errores, asi que un nombre inventado tumba la compilacion.

!macro customUnInstall
  ${ifNot} ${Silent}
    StrCpy $R0 ""
    IfFileExists "$APPDATA\${PRODUCT_NAME}\poses-usuario.json" 0 +3
      StrCpy $R0 "$APPDATA\${PRODUCT_NAME}"
      Goto preguntar
    IfFileExists "$APPDATA\${APP_PACKAGE_NAME}\poses-usuario.json" 0 fin
      StrCpy $R0 "$APPDATA\${APP_PACKAGE_NAME}"

    preguntar:
      StrCmp $R0 "" fin
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
        "¿Quieres borrar también las poses que has guardado?$\r$\n$\r$\nSe encuentran en:$\r$\n$R0$\r$\n$\r$\nElige No si piensas volver a instalar el programa y quieres conservarlas." \
        /SD IDNO IDYES borrar IDNO fin

    borrar:
      RMDir /r "$R0"
      DetailPrint "Poses del usuario eliminadas de $R0"

    fin:
  ${endIf}
!macroend
