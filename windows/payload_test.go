package main

import (
	"archive/zip"
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func makeZip(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var b bytes.Buffer
	w := zip.NewWriter(&b)
	for name, body := range files {
		f, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		f.Write([]byte(body))
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func TestEnsureRuntimeUnpacksAndDropsOldVersion(t *testing.T) {
	base := t.TempDir()
	os.MkdirAll(filepath.Join(base, "versi-lama", "app"), 0o755)
	z := makeZip(t, map[string]string{"app/server.py": "x", "bin/ffmpeg.exe": "y"})

	dir, err := ensureRuntime(z, "versi-baru", base)
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := os.ReadFile(filepath.Join(dir, "bin", "ffmpeg.exe")); string(got) != "y" {
		t.Fatalf("isi file salah: %q", got)
	}
	if _, err := os.Stat(filepath.Join(base, "versi-lama")); !os.IsNotExist(err) {
		t.Fatal("versi lama masih ada")
	}
	left, _ := os.ReadDir(base)
	if len(left) != 1 {
		t.Fatalf("sisa folder sementara: %v", left)
	}
}

func TestEnsureRuntimeSkipsExistingVersion(t *testing.T) {
	base := t.TempDir()
	z := makeZip(t, map[string]string{"app/server.py": "x"})
	dir, err := ensureRuntime(z, "v1", base)
	if err != nil {
		t.Fatal(err)
	}
	marker := filepath.Join(dir, "penanda")
	os.WriteFile(marker, nil, 0o644)
	if _, err := ensureRuntime([]byte("bukan zip"), "v1", base); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatal("versi yang sama kebongkar ulang")
	}
}

func TestEnsureRuntimeRejectsPathTraversal(t *testing.T) {
	base := t.TempDir()
	z := makeZip(t, map[string]string{"../../jahat.txt": "x"})
	if _, err := ensureRuntime(z, "v1", base); err == nil {
		t.Fatal("harusnya ditolak")
	}
	if _, err := os.Stat(filepath.Join(base, "v1")); !os.IsNotExist(err) {
		t.Fatal("bongkaran gagal nggak boleh jadi runtime")
	}
}
