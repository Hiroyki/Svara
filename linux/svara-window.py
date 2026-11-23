"""Jendela Svara buat Linux pakai WebKitGTK dari sistem (dijalanin pakai /usr/bin/python3, bukan Python bawaan).

  svara-window.py --check              keluar 0 kalau WebKitGTK + PyGObject ada
  svara-window.py URL DATA_DIR ICON    buka jendelanya, nge-block sampai ditutup

Coba WebKit2 4.1 / 4.0 (GTK 3) dulu, terus WebKit 6.0 (GTK 4).
"""
import os
import sys
import urllib.parse

import gi

API = None
# WebKit dulu (yang gagal nggak ngunci versi apa-apa), baru GTK yang cocok sama versinya
for ns, webkit, gtk in (('WebKit2', '4.1', '3.0'), ('WebKit2', '4.0', '3.0'), ('WebKit', '6.0', '4.0')):
    try:
        gi.require_version(ns, webkit)
    except ValueError:
        continue
    try:
        gi.require_version('Gtk', gtk)
    except ValueError:
        sys.exit(1)
    API = webkit
    break
if API is None:
    sys.exit(1)

from gi.repository import Gio, GLib, Gtk  # noqa: E402

if API == '6.0':
    from gi.repository import WebKit  # noqa: E402
else:
    from gi.repository import WebKit2 as WebKit  # noqa: E402

if len(sys.argv) > 1 and sys.argv[1] == '--check':
    sys.exit(0)

URL, DATA, ICON = sys.argv[1], sys.argv[2], sys.argv[3]
HOST = urllib.parse.urlparse(URL).netloc
DOWNLOADS = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD) or os.path.expanduser('~/Downloads')


def is_local(uri):
    u = urllib.parse.urlparse(uri or '')
    return u.scheme in ('blob', 'data', 'about') or u.netloc == HOST


def open_outside(uri):
    try:
        Gio.AppInfo.launch_default_for_uri(uri, None)
    except Exception as e:
        print('gagal buka link:', e)


def on_policy(view, decision, kind):
    nav_types = (WebKit.PolicyDecisionType.NAVIGATION_ACTION, WebKit.PolicyDecisionType.NEW_WINDOW_ACTION)
    if kind in nav_types:
        uri = decision.get_navigation_action().get_request().get_uri()
        if not is_local(uri) or kind == WebKit.PolicyDecisionType.NEW_WINDOW_ACTION:
            if not is_local(uri):
                open_outside(uri)
            decision.ignore()
            return True
    if kind == WebKit.PolicyDecisionType.RESPONSE and not decision.is_mime_type_supported():
        decision.download()
        return True
    return False


def on_download(_src, download):
    # Kartu share ("Simpan gambar") disimpan ke folder Unduhan
    def decide(d, name):
        os.makedirs(DOWNLOADS, exist_ok=True)
        base, ext = os.path.splitext(os.path.basename(name) or 'svara.png')
        dest, n = os.path.join(DOWNLOADS, base + ext), 2
        while os.path.exists(dest):
            dest, n = os.path.join(DOWNLOADS, f'{base} ({n}){ext}'), n + 1
        if API == '6.0':
            d.set_destination(dest)
        else:
            d.set_destination(GLib.filename_to_uri(dest, None))
        return True
    download.connect('decide-destination', decide)


def settings_for(view):
    s = view.get_settings()
    s.set_enable_developer_extras(bool(os.environ.get('SVARA_DEBUG')))
    s.set_media_playback_requires_user_gesture(False)


def build_gtk3():
    mgr = WebKit.WebsiteDataManager(base_data_directory=os.path.join(DATA, 'webkit'),
                                    base_cache_directory=os.path.join(DATA, 'webkit-cache'))
    ctx = WebKit.WebContext.new_with_website_data_manager(mgr)
    ctx.connect('download-started', on_download)
    view = WebKit.WebView.new_with_context(ctx)
    settings_for(view)
    view.connect('decide-policy', on_policy)
    win = Gtk.Window(title='Svara')
    win.set_default_size(1280, 820)
    win.set_size_request(380, 560)
    try:
        win.set_icon_from_file(ICON)
    except Exception:
        pass
    win.set_wmclass('svara', 'Svara')
    win.add(view)
    win.connect('destroy', Gtk.main_quit)
    view.load_uri(URL)
    win.show_all()
    Gtk.main()


def build_gtk4():
    session = WebKit.NetworkSession.new(os.path.join(DATA, 'webkit'), os.path.join(DATA, 'webkit-cache'))
    session.connect('download-started', on_download)
    view = WebKit.WebView(network_session=session)
    settings_for(view)
    view.connect('decide-policy', on_policy)
    app = Gtk.Application(application_id='site.faquloh.svara')

    def activate(a):
        win = Gtk.ApplicationWindow(application=a, title='Svara')
        win.set_default_size(1280, 820)
        win.set_child(view)
        view.load_uri(URL)
        win.present()
    app.connect('activate', activate)
    app.run([])


if __name__ == '__main__':
    GLib.set_prgname('svara')
    GLib.set_application_name('Svara')
    build_gtk4() if API == '6.0' else build_gtk3()
