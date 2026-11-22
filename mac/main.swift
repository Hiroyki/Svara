// Svara untuk Mac: jendela WebKit + server lokal yang ikut nyala & mati bareng app.
import Cocoa
import WebKit

let port = 5560
let homeURL = URL(string: "http://127.0.0.1:\(port)/")!
let bgColor = NSColor(red: 0x12 / 255.0, green: 0x11 / 255.0, blue: 0x18 / 255.0, alpha: 1)

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKUIDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var server: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1360, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered, defer: false)
        window.title = "Svara"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = bgColor
        window.minSize = NSSize(width: 420, height: 620)
        window.delegate = self
        window.center()
        window.setFrameAutosaveName("SenandungWindow")

        let config = WKWebViewConfiguration()
        config.userContentController.addScriptMessageHandler(ShareBridge(owner: self), contentWorld: .page, name: "svaraShare")
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.isElementFullscreenEnabled = true
        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.navigationDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        web.allowsBackForwardNavigationGestures = true
        window.contentView = web
        web.loadHTMLString(Self.loadingHTML, baseURL: nil)
        window.makeKeyAndOrderFront(nil)

        startServerIfNeeded { [weak self] ok in
            guard let self else { return }
            if ok { self.web.load(URLRequest(url: homeURL)) }
            else { self.web.loadHTMLString(Self.errorHTML, baseURL: nil) }
        }
    }

    // Tutup jendela = sembunyi, musik tetap jalan. Keluar beneran pakai Cmd+Q.
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        server?.terminate()
    }

    // ---------- server ----------

    /// nil = nggak ada server; isinya jawaban /api/yt/ping (ada "root" = folder server.py-nya).
    func ping(_ done: @escaping ([String: Any]?) -> Void) {
        var req = URLRequest(url: homeURL.appendingPathComponent("api/yt/ping"))
        req.timeoutInterval = 1
        URLSession.shared.dataTask(with: req) { data, resp, _ in
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { return done(nil) }
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
            done(json ?? [:])
        }.resume()
    }

    var bundledWebDir: String? {
        Bundle.main.resourceURL?.appendingPathComponent("web").resolvingSymlinksInPath().path
    }

    func startServerIfNeeded(_ done: @escaping (Bool) -> Void) {
        ping { [weak self] info in
            guard let self else { return }
            if let info {
                if let root = info["root"] as? String, root == self.bundledWebDir {
                    return DispatchQueue.main.async { done(true) }
                }
                // Server lain yang nyala duluan (mis. ./senandung dari Terminal, kodenya bisa udah basi):
                // matiin, biar yang jalan selalu server bawaan app ini.
                self.stopForeignServer()
            }
            DispatchQueue.main.async {
                self.launchServer()
                self.waitForServer(tries: 100, done: done)
            }
        }
    }

    /// PID proses yang lagi dengerin port Senandung.
    func listenerPids() -> [pid_t] {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        p.arguments = ["-ti", "tcp:\(port)", "-sTCP:LISTEN"]
        let out = Pipe()
        p.standardOutput = out
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return [] }
        p.waitUntilExit()
        let text = String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        return text.split(separator: "\n").compactMap { pid_t($0.trimmingCharacters(in: .whitespaces)) }
    }

    func stopForeignServer() {
        let pids = listenerPids()
        for pid in pids where pid != getpid() { kill(pid, SIGTERM) }
        // Tunggu portnya lepas (maks ~3 detik) sebelum server app nyala.
        for _ in 0..<30 {
            if listenerPids().isEmpty { return }
            usleep(100_000)
        }
        for pid in listenerPids() where pid != getpid() { kill(pid, SIGKILL) }
        usleep(200_000)
    }

    func launchServer() {
        guard let dir = Bundle.main.resourceURL?.appendingPathComponent("web") else { return }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        p.arguments = ["server.py"]
        p.currentDirectoryURL = dir
        var env = ProcessInfo.processInfo.environment
        // App dari Finder nggak bawa PATH Homebrew; yt-dlp, ffmpeg, deno ada di sana
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        env["PUTAR_PORT"] = String(port)
        p.environment = env
        let log = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs/Svara.log")
        FileManager.default.createFile(atPath: log.path, contents: nil)
        if let h = try? FileHandle(forWritingTo: log) {
            p.standardOutput = h
            p.standardError = h
        }
        try? p.run()
        server = p
    }

    func waitForServer(tries: Int, done: @escaping (Bool) -> Void) {
        ping { [weak self] info in
            DispatchQueue.main.async {
                if info != nil { return done(true) }
                if tries <= 0 { return done(false) }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    self?.waitForServer(tries: tries - 1, done: done)
                }
            }
        }
    }

    // ---------- web ----------

    // Link keluar (target=_blank) dibuka di browser biasa
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert()
        a.messageText = message
        a.addButton(withTitle: "Ya")
        a.addButton(withTitle: "Batal")
        completionHandler(a.runModal() == .alertFirstButtonReturn)
    }

    @objc func reload() { web.load(URLRequest(url: homeURL)) }
    @objc func showMain() { window.makeKeyAndOrderFront(nil) }

    // ---------- menu (Edit perlu ada biar Cmd+C/V jalan di kolom cari) ----------

    func buildMenu() {
        let main = NSMenu()
        func add(_ title: String, _ items: [NSMenuItem]) {
            let item = NSMenuItem()
            let menu = NSMenu(title: title)
            items.forEach { menu.addItem($0) }
            item.submenu = menu
            main.addItem(item)
        }
        func it(_ t: String, _ a: Selector?, _ k: String, _ m: NSEvent.ModifierFlags = .command) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: a, keyEquivalent: k)
            i.keyEquivalentModifierMask = m
            return i
        }
        add("Svara", [
            it("Tentang Svara", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), ""),
            .separator(),
            it("Sembunyikan Svara", #selector(NSApplication.hide(_:)), "h"),
            it("Sembunyikan Lainnya", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            .separator(),
            it("Keluar dari Svara", #selector(NSApplication.terminate(_:)), "q"),
        ])
        add("Edit", [
            it("Urungkan", Selector(("undo:")), "z"),
            it("Ulangi", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            it("Potong", #selector(NSText.cut(_:)), "x"),
            it("Salin", #selector(NSText.copy(_:)), "c"),
            it("Tempel", #selector(NSText.paste(_:)), "v"),
            it("Pilih Semua", #selector(NSText.selectAll(_:)), "a"),
        ])
        add("Tampilan", [
            it("Muat Ulang", #selector(reload), "r"),
            it("Layar Penuh", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control]),
        ])
        add("Jendela", [
            it("Kecilkan", #selector(NSWindow.performMiniaturize(_:)), "m"),
            it("Svara", #selector(showMain), "1"),
        ])
        NSApp.mainMenu = main
    }

    static let loadingHTML = """
    <html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#a29fb2;font:16px -apple-system,sans-serif">
    <div style="text-align:center"><div style="width:22px;height:22px;margin:0 auto 14px;border-radius:50%;border:3px solid #26262f;border-top-color:#ffc94a;animation:b .8s linear infinite"></div>Lagi nyiapin Svara…</div>
    <style>@keyframes b{to{transform:rotate(360deg)}}</style></body></html>
    """

    static let errorHTML = """
    <html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#efedf5;font:15px -apple-system,sans-serif">
    <div style="max-width:420px;text-align:center;line-height:1.5"><b style="font-size:18px">Server Svara gagal nyala</b>
    <p style="color:#a29fb2">Pastikan yt-dlp sama ffmpeg udah terpasang (brew install yt-dlp ffmpeg), terus buka ulang app-nya.
    Catatan error ada di ~/Library/Logs/Svara.log</p></div></body></html>
    """
}

// ---------- kartu share: WKWebView nggak bisa download blob / Web Share, jadi lewat native ----------
// JS: await webkit.messageHandlers.svaraShare.postMessage({ action: 'share'|'save'|'copy', name, data: <base64 PNG>, rect? })
final class ShareBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var owner: AppDelegate?
    init(owner: AppDelegate) { self.owner = owner }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let b64 = body["data"] as? String,
              let png = Data(base64Encoded: b64), let image = NSImage(data: png),
              let owner, let web = owner.web, let window = owner.window
        else { return replyHandler(nil, "data kartu rusak") }
        var name = (body["name"] as? String ?? "svara.png").replacingOccurrences(of: "/", with: "-")
        if !name.lowercased().hasSuffix(".png") { name += ".png" }

        switch action {
        case "copy":
            let pb = NSPasteboard.general
            pb.clearContents()
            pb.declareTypes([.png, .tiff], owner: nil)
            pb.setData(png, forType: .png)
            pb.setData(image.tiffRepresentation, forType: .tiff)
            replyHandler("copied", nil)

        case "save":
            let panel = NSSavePanel()
            panel.nameFieldStringValue = name
            panel.allowedContentTypes = [.png]
            panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
            panel.beginSheetModal(for: window) { res in
                guard res == .OK, let url = panel.url else { return replyHandler("cancel", nil) }
                do {
                    try png.write(to: url, options: .atomic)
                    NSWorkspace.shared.activateFileViewerSelecting([url])
                    replyHandler("saved", nil)
                } catch { replyHandler(nil, error.localizedDescription) }
            }

        case "share":
            // File beneran (bukan cuma NSImage) biar AirDrop/Pesan/Foto dapet PNG dengan nama yang rapi
            let dir = FileManager.default.temporaryDirectory.appendingPathComponent("svara-share", isDirectory: true)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let url = dir.appendingPathComponent(name)
            do { try png.write(to: url, options: .atomic) } catch { return replyHandler(nil, error.localizedDescription) }
            var rect = NSRect(x: web.bounds.midX - 1, y: web.bounds.midY - 1, width: 2, height: 2)
            if let r = body["rect"] as? [String: Any],
               let x = (r["x"] as? NSNumber)?.doubleValue, let y = (r["y"] as? NSNumber)?.doubleValue,
               let w = (r["w"] as? NSNumber)?.doubleValue, let h = (r["h"] as? NSNumber)?.doubleValue {
                // koordinat CSS dari atas-kiri; WKWebView itu flipped, jadi kalau nggak flipped dibalik
                rect = NSRect(x: x, y: web.isFlipped ? y : web.bounds.height - y - h, width: w, height: h)
            }
            NSSharingServicePicker(items: [url]).show(relativeTo: rect, of: web, preferredEdge: .minY)
            replyHandler("shown", nil)

        default:
            replyHandler(nil, "aksi nggak dikenal")
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.activate(ignoringOtherApps: true)
app.run()
