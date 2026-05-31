function resolveAssetUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.replace(/^\.\//, '');
  return new URL(normalized, `${window.location.origin}/`).href;
}

// Muat template HTML modul ke dalam $refs.moduleRoot, lalu aktifkan Alpine
export async function initModulePage(component, htmlPath) {
  if (!component?.$nextTick) {
    throw new Error('Komponen Alpine tidak valid');
  }

  await component.$nextTick();
  const rootEl = component.$refs?.moduleRoot;
  if (!rootEl) {
    throw new Error(`Elemen moduleRoot tidak ditemukan (${htmlPath})`);
  }

  const url = resolveAssetUrl(htmlPath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat ${url} (${response.status})`);
  }

  rootEl.innerHTML = await response.text();

  if (typeof Alpine !== 'undefined') {
    Alpine.initTree(rootEl);
  }
}

/** @deprecated gunakan initModulePage */
export async function loadModuleTemplate(rootEl, htmlPath) {
  if (!rootEl) throw new Error(`Root element tidak ditemukan (${htmlPath})`);
  const response = await fetch(htmlPath);
  if (!response.ok) throw new Error(`Gagal memuat ${htmlPath}`);
  rootEl.innerHTML = await response.text();
  if (typeof Alpine !== 'undefined') Alpine.initTree(rootEl);
}
