; Svara installer customisations (electron-builder assisted NSIS installer)

; Classic wizard opening: a Welcome page with the Svara sidebar before the licence.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Svara Setup"
  !define MUI_WELCOMEPAGE_TEXT "This will install Svara ${VERSION} on your computer.$\r$\n$\r$\nSvara is a music player for the music catalogue: charts, new releases, artists, lyrics and your own playlists.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend
