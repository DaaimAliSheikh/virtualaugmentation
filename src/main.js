/*
 * Site entry. Every file in ./js is a small feature module whose default export is an
 * init function. Modules look for their own markup and return quietly when it is absent,
 * so one bundle serves every page and adding a feature is just adding a file.
 */
const modules = import.meta.glob('./js/*.js', { eager: true });

for (const [file, module] of Object.entries(modules)) {
  try {
    module.default?.();
  } catch (error) {
    console.error(`[site] ${file} failed to initialise`, error);
  }
}

// Tells the inline guard in <head> that scripting is alive (see src/partials/head.html).
window.__siteReady = true;
