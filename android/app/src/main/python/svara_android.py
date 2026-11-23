"""Nyalain server.py Svara di dalam app Android (dipanggil dari Java lewat Chaquopy).

File web + server.py udah disalin ke web_dir sama MainActivity, jadi server nyajiin file dari situ.
Fungsi start() nge-block selamanya, makanya dipanggil dari thread sendiri.
"""
import os
import sys


def start(web_dir, cache_dir, save_dir, saved_index, port):
    import certifi

    os.environ.update({
        'PUTAR_PORT': str(port),
        'PUTAR_CACHE_DIR': cache_dir,
        'PUTAR_SAVE_DIR': save_dir,
        'PUTAR_SAVED_INDEX': saved_index,
        # Nggak bisa bikin proses Python baru di Android: yt-dlp jalan di proses ini
        'PUTAR_INPROC': '1',
        # Nggak ada Deno/Node: pakai client YouTube yang nggak butuh runtime JS
        'PUTAR_NO_JS': '1',
        'SSL_CERT_FILE': certifi.where(),
        'HOME': os.path.dirname(cache_dir),
    })
    if web_dir not in sys.path:
        sys.path.insert(0, web_dir)
    os.chdir(web_dir)
    import server
    server.main()
