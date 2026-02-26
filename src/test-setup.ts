// Iframe page loading is disabled via vitest.config.ts:
//   environmentOptions.happyDOM.settings.disableIframePageLoading = true
//
// Without this, happy-dom fetches real HTML from iframe src URLs in CI
// and tries to import SvelteKit scripts, causing ERR_MODULE_NOT_FOUND
// unhandled rejections that fail the test run.
