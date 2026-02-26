// Prevent happy-dom from loading real pages inside iframes.
// Tests only need iframe.src to return the correct URL — they simulate
// postMessage via window.dispatchEvent, so no real navigation is needed.
// Without this, happy-dom fetches the real HTML in CI and tries to import
// SvelteKit scripts, causing ERR_MODULE_NOT_FOUND unhandled rejections.
if (typeof HTMLIFrameElement !== 'undefined') {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (descriptor) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      get() {
        return this.getAttribute('src') || '';
      },
      set(value: string) {
        this.setAttribute('src', value);
      },
      configurable: true,
    });
  }
}
