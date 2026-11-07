// Senandung untuk Windows: jendela WebView2 + server lokal yang ikut nyala & mati bareng app.
// Python, yt-dlp, deno, dan ffmpeg dibundel di dalam exe, jadi nggak perlu pasang apa-apa.
package main

import (
	_ "embed"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
	"github.com/jchv/go-webview2/webviewloader"
	"golang.org/x/sys/windows"
)

const (
	port    = "5560"
	homeURL = "http://127.0.0.1:" + port + "/"
	title   = "Senandung"
	// Halaman baru: petunjuk pintasan di kolom cari ditulis buat Mac
	initJS = `addEventListener('DOMContentLoaded',()=>{const k=document.querySelector('.search kbd');if(k)k.textContent='Ctrl K'})`
)

//go:embed payload.zip
var payload []byte

//go:embed payload.id
var payloadID string

var (
	user32     = windows.NewLazySystemDLL("user32.dll")
	dwmapi     = windows.NewLazySystemDLL("dwmapi.dll")
	findWindow = user32.NewProc("FindWindowW")
	showWindow = user32.NewProc("ShowWindow")
	setFront   = user32.NewProc("SetForegroundWindow")
	messageBox = user32.NewProc("MessageBoxW")
	sysMetrics = user32.NewProc("GetSystemMetrics")
	dpiForSys  = user32.NewProc("GetDpiForSystem")
	dwmSetAttr = dwmapi.NewProc("DwmSetWindowAttribute")
	serverJob  windows.Handle // disimpan terus: pas app mati, Windows ikut matiin server + worker
)

func init() { runtime.LockOSThread() }

func alert(msg string) {
	t, _ := windows.UTF16PtrFromString(title)
	m, _ := windows.UTF16PtrFromString(msg)
	messageBox.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}

// Buka app dua kali = munculin jendela yang udah ada, bukan server kedua.
func focusExisting() bool {
	name, _ := windows.UTF16PtrFromString(`Local\SenandungApp`)
	_, err := windows.CreateMutex(nil, false, name)
	if err != windows.ERROR_ALREADY_EXISTS {
		return false
	}
	class, _ := windows.UTF16PtrFromString("webview")
	win, _ := windows.UTF16PtrFromString(title)
	if h, _, _ := findWindow.Call(uintptr(unsafe.Pointer(class)), uintptr(unsafe.Pointer(win))); h != 0 {
		showWindow.Call(h, 9) // SW_RESTORE
		setFront.Call(h)
	}
	return true
}

// Ukuran awal ngikutin skala layar, dan nggak lebih gede dari layarnya.
func windowSize() (w, h, minW, minH uint) {
	dpi := uintptr(96)
	if dpiForSys.Find() == nil {
		if d, _, _ := dpiForSys.Call(); d != 0 {
			dpi = d
		}
	}
	scale := func(v uint) uint { return v * uint(dpi) / 96 }
	sw, _, _ := sysMetrics.Call(0)
	sh, _, _ := sysMetrics.Call(1)
	return min(scale(1280), uint(sw)*9/10), min(scale(800), uint(sh)*9/10), scale(420), scale(620)
}

func darkTitleBar(hwnd uintptr) {
	on := int32(1)
	if dwmSetAttr.Find() == nil {
		dwmSetAttr.Call(hwnd, 20, uintptr(unsafe.Pointer(&on)), 4) // DWMWA_USE_IMMERSIVE_DARK_MODE
	}
}

func newJob() (windows.Handle, error) {
	job, err := windows.CreateJobObject(nil, nil)
	if err != nil {
		return 0, err
	}
	info := windows.JOBOBJECT_EXTENDED_LIMIT_INFORMATION{}
	info.BasicLimitInformation.LimitFlags = windows.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
	_, err = windows.SetInformationJobObject(job, windows.JobObjectExtendedLimitInformation,
		uintptr(unsafe.Pointer(&info)), uint32(unsafe.Sizeof(info)))
	return job, err
}

func startServer(dir, logPath string) (*exec.Cmd, error) {
	l, err := net.Listen("tcp", "127.0.0.1:"+port)
	if err != nil {
		return nil, fmt.Errorf("port %s lagi dipakai app lain", port)
	}
	l.Close()

	logFile, err := os.Create(logPath)
	if err != nil {
		return nil, err
	}
	py := filepath.Join(dir, "python", "python.exe")
	cmd := exec.Command(py, "-X", "utf8", "server.py")
	cmd.Dir = filepath.Join(dir, "app")
	cmd.Stdout, cmd.Stderr = logFile, logFile
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: windows.CREATE_NO_WINDOW}
	cmd.Env = append(os.Environ(),
		"PATH="+filepath.Join(dir, "bin")+";"+os.Getenv("PATH"),
		"PUTAR_PYTHON="+py,
		"PUTAR_PORT="+port,
	)
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	if serverJob, err = newJob(); err == nil {
		h, e := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_TERMINATE, false, uint32(cmd.Process.Pid))
		if e == nil {
			windows.AssignProcessToJobObject(serverJob, h)
			windows.CloseHandle(h)
		}
	}
	return cmd, nil
}

func waitForServer(cmd *exec.Cmd) error {
	dead := make(chan error, 1)
	go func() { dead <- cmd.Wait() }()
	client := http.Client{Timeout: time.Second}
	// Pertama kali bisa lama: antivirus biasanya mindai python & deno dulu
	for end := time.Now().Add(90 * time.Second); time.Now().Before(end); time.Sleep(200 * time.Millisecond) {
		select {
		case err := <-dead:
			return fmt.Errorf("server berhenti: %v", err)
		default:
		}
		if r, err := client.Get(homeURL + "api/yt/ping"); err == nil {
			r.Body.Close()
			if r.StatusCode == 200 {
				return nil
			}
		}
	}
	return fmt.Errorf("server nggak jawab")
}

func boot(base, logPath string) error {
	dir, err := ensureRuntime(payload, strings.TrimSpace(payloadID), filepath.Join(base, "runtime"))
	if err != nil {
		return err
	}
	cmd, err := startServer(dir, logPath)
	if err != nil {
		return err
	}
	return waitForServer(cmd)
}

func page(body string) string {
	return `<!doctype html><meta charset=utf-8><body style="margin:0;height:100vh;display:grid;place-items:center;background:#121118;color:#a29fb2;font:16px 'Segoe UI',sans-serif">` + body
}

func errorPage(err error, logPath string) string {
	esc := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;")
	return page(`<div style="max-width:440px;text-align:center;line-height:1.5"><b style="font-size:18px;color:#efedf5">Senandung gagal nyala</b><p>` +
		esc.Replace(err.Error()) + `</p><p style="font-size:13px">Catatan error ada di ` + esc.Replace(logPath) + `</p></div>`)
}

func main() {
	if focusExisting() {
		return
	}
	if v, err := webviewloader.GetInstalledVersion(); err != nil || v == "" {
		alert("Senandung butuh Microsoft Edge WebView2 Runtime.\n\nPasang dulu dari:\nhttps://developer.microsoft.com/microsoft-edge/webview2/")
		return
	}
	base := filepath.Join(os.Getenv("LOCALAPPDATA"), "Senandung")
	if err := os.MkdirAll(base, 0o755); err != nil {
		alert("Folder data nggak bisa dibikin: " + err.Error())
		return
	}
	logPath := filepath.Join(base, "senandung.log")

	// Lagu berikutnya harus tetap nyala walau jendelanya diminimize
	os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
		"--autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding")

	width, height, minW, minH := windowSize()
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     os.Getenv("SENANDUNG_DEBUG") != "",
		DataPath:  filepath.Join(base, "webview"),
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title: title, Width: width, Height: height, IconId: 1, Center: true,
		},
	})
	if w == nil {
		alert("Jendela WebView2 gagal dibuka.")
		return
	}
	defer w.Destroy()
	darkTitleBar(uintptr(w.Window()))
	w.SetSize(int(minW), int(minH), webview2.HintMin)
	w.Init(initJS)
	w.SetHtml(page(`<div style="text-align:center"><div style="width:14px;height:14px;margin:0 auto 14px;background:#ffc94a;animation:b 1s steps(2) infinite"></div>Lagi nyiapin Senandung…</div><style>@keyframes b{50%{opacity:.2}}</style>`))

	go func() {
		err := boot(base, logPath)
		w.Dispatch(func() {
			if err != nil {
				w.SetHtml(errorPage(err, logPath))
				return
			}
			w.Navigate(homeURL)
		})
	}()
	w.Run()
}
