// Prevent happy-dom from loading real pages inside iframes.
// Tests only need iframe.src to return the correct URL — they simulate
// postMessage via window.dispatchEvent, so no real navigation is needed.
// Without this, happy-dom fetches the real HTML in CI and tries to import
// SvelteKit scripts, causing ERR_MODULE_NOT_FOUND unhandled rejections.
//
// Strategy: override HTMLIFrameElement's [connectToNode] lifecycle to skip
// the page loader entirely. We find the symbol by inspecting the prototype
// rather than importing it, because Vitest may load happy-dom from source
// (.ts) while require() loads the compiled output (.js), producing two
// distinct Symbol instances.
if (typeof HTMLIFrameElement !== 'undefined') {
  const proto = HTMLIFrameElement.prototype;
  const connectToNode = Object.getOwnPropertySymbols(proto).find(
    (s) => s.toString() === 'Symbol(connectToNode)',
  );

  if (connectToNode) {
    // Grab the grandparent (HTMLElement) implementation that doesn't load pages
    const htmlElementConnect =
      Object.getPrototypeOf(Object.getPrototypeOf(proto))[connectToNode];

    if (htmlElementConnect) {
      // @ts-expect-error -- indexing with a symbol from happy-dom internals
      proto[connectToNode] = function (parentNode: unknown) {
        htmlElementConnect.call(this, parentNode);
      };
    }
  }
}
