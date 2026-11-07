package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ensureRuntime ngebongkar payload ke base/<id> sekali aja, terus buang versi lama.
// Dibongkar ke folder sementara dulu, jadi bongkaran yang putus di tengah nggak pernah kepakai.
func ensureRuntime(payload []byte, id, base string) (string, error) {
	dest := filepath.Join(base, id)
	if _, err := os.Stat(filepath.Join(dest, "app", "server.py")); err == nil {
		return dest, nil
	}
	if err := os.MkdirAll(base, 0o755); err != nil {
		return "", err
	}
	tmp, err := os.MkdirTemp(base, ".unpack-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmp)
	if err := unzip(payload, tmp); err != nil {
		return "", err
	}
	os.RemoveAll(dest)
	if err := os.Rename(tmp, dest); err != nil {
		return "", err
	}
	if old, err := os.ReadDir(base); err == nil {
		for _, e := range old {
			if e.Name() != id {
				os.RemoveAll(filepath.Join(base, e.Name()))
			}
		}
	}
	return dest, nil
}

func unzip(payload []byte, dest string) error {
	r, err := zip.NewReader(bytes.NewReader(payload), int64(len(payload)))
	if err != nil {
		return err
	}
	root := filepath.Clean(dest) + string(os.PathSeparator)
	for _, f := range r.File {
		p := filepath.Join(dest, filepath.FromSlash(f.Name))
		if !strings.HasPrefix(p, root) {
			return fmt.Errorf("path payload nggak valid: %s", f.Name)
		}
		if strings.HasSuffix(f.Name, "/") {
			if err := os.MkdirAll(p, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			return err
		}
		if err := writeFile(f, p); err != nil {
			return err
		}
	}
	return nil
}

func writeFile(f *zip.File, p string) error {
	src, err := f.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	out, err := os.Create(p)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, src); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}
