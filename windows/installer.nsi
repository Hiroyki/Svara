; Svara Windows installer (Next → Next → Install → Finish wizard).
; Dibikin dari Mac: makensis -DVERSION=2.0.0 windows/installer.nsi  (dipanggil build-windows.sh)
; Pasang per-user ke %LOCALAPPDATA%\Programs\Svara, jadi nggak perlu izin admin.

Unicode true
SetCompressor /SOLID lzma
RequestExecutionLevel user
ManifestDPIAware true

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define APP "Svara"
!define EXE "Svara.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}"

Name "${APP}"
Caption "${APP} ${VERSION} Setup"
BrandingText "${APP} ${VERSION}"
OutFile "..\dist-windows\Svara-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
InstallDirRegKey HKCU "Software\${APP}" "InstallDir"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT License"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "svara.ico"
!define MUI_UNICON "svara.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEFINISHPAGE_BITMAP "wizard.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "wizard.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "header.bmp"

!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_TEXT "$(DesktopShortcut)"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateDesktopShortcut

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

LangString DesktopShortcut ${LANG_ENGLISH} "Create a desktop shortcut"
LangString RemoveData ${LANG_ENGLISH} "Also delete Svara's data (library, history, cache)?$\r$\nChoose No to keep it for a later reinstall."

Function CreateDesktopShortcut
  CreateShortcut "$DESKTOP\${APP}.lnk" "$INSTDIR\${EXE}"
FunctionEnd

Section "Svara" SecMain
  SectionIn RO
  ; Tutup Svara yang lagi jalan biar file-nya bisa ditimpa
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  Sleep 500

  SetOutPath "$INSTDIR"
  File "..\dist-windows\${EXE}"
  File "/oname=LICENSE.txt" "..\LICENSE"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortcut "$SMPROGRAMS\${APP}.lnk" "$INSTDIR\${EXE}"

  WriteRegStr HKCU "Software\${APP}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "URLInfoAbout" "https://github.com/Hiroyki/Svara"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  ; Ukuran (KB) buat ditampilin di Apps & features
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  Sleep 500
  Delete "$INSTDIR\${EXE}"
  Delete "$INSTDIR\LICENSE.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\${APP}.lnk"
  Delete "$DESKTOP\${APP}.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\${APP}"
  ; Data app (runtime Python yang dibongkar, WebView, koleksi) ada di %LOCALAPPDATA%\Senandung
  IfSilent done
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "$(RemoveData)" IDNO done
    RMDir /r "$LOCALAPPDATA\Senandung"
  done:
SectionEnd
