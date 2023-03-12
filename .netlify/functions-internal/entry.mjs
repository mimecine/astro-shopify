import * as adapter from '@astrojs/netlify/netlify-functions.js';
import { s as server_default, g as deserializeManifest } from './chunks/astro.e7f1e798.mjs';
import { _ as _page0, a as _page1, b as _page2 } from './chunks/pages/all.fd55a051.mjs';
import 'mime';
import 'cookie';
import 'html-escaper';
import 'kleur/colors';
import 'slash';
import 'path-to-regexp';
import 'string-width';
import 'zod';
import 'nanostores';
import '@nanostores/persistent';
/* empty css                               */
function check(Component) {
	return Component['render'] && Component['$$render'];
}

async function renderToStaticMarkup(Component, props, slotted) {
	const slots = {};
	for (const [key, value] of Object.entries(slotted)) {
		slots[key] = () =>
			`<astro-slot${key === 'default' ? '' : ` name="${key}"`}>${value}</astro-slot>`;
	}
	const { html } = Component.render(props, { $$slots: slots });
	return { html };
}

const _renderer1 = {
	check,
	renderToStaticMarkup,
};

const pageMap = new Map([["src/pages/index.astro", _page0],["src/pages/products/[...handle].astro", _page1],["src/pages/404.astro", _page2],]);
const renderers = [Object.assign({"name":"astro:jsx","serverEntrypoint":"astro/jsx/server.js","jsxImportSource":"astro"}, { ssr: server_default }),Object.assign({"name":"@astrojs/svelte","clientEntrypoint":"@astrojs/svelte/client.js","serverEntrypoint":"@astrojs/svelte/server.js"}, { ssr: _renderer1 }),];

const _manifest = Object.assign(deserializeManifest({"adapterName":"@astrojs/netlify/functions","routes":[{"file":"","links":["_astro/404.f1f69d30.css"],"scripts":[],"routeData":{"route":"/","type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["_astro/404.f1f69d30.css"],"scripts":[],"routeData":{"route":"/products/[...handle]","type":"page","pattern":"^\\/products(?:\\/(.*?))?\\/?$","segments":[[{"content":"products","dynamic":false,"spread":false}],[{"content":"...handle","dynamic":true,"spread":true}]],"params":["...handle"],"component":"src/pages/products/[...handle].astro","prerender":false,"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":["_astro/404.f1f69d30.css"],"scripts":[],"routeData":{"route":"/404","type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":false,"_meta":{"trailingSlash":"ignore"}}}],"base":"/","markdown":{"drafts":false,"syntaxHighlight":"shiki","shikiConfig":{"langs":[],"theme":"github-dark","wrap":false},"remarkPlugins":[],"rehypePlugins":[],"remarkRehype":{},"gfm":true,"smartypants":true},"pageMap":null,"propagation":[],"renderers":[],"entryModules":{"\u0000@astrojs-ssr-virtual-entry":"_@astrojs-ssr-virtual-entry.mjs","/Users/mimecine/Projects/kastro/src/components/CartIcon.svelte":"_astro/CartIcon.3b4e9c35.js","/Users/mimecine/Projects/kastro/src/components/AddToCartForm.svelte":"_astro/AddToCartForm.1896ff11.js","/Users/mimecine/Projects/kastro/src/components/CartDrawer.svelte":"_astro/CartDrawer.e8fe44c2.js","@astrojs/svelte/client.js":"_astro/client.c4e17359.js","astro:scripts/before-hydration.js":""},"assets":["/_astro/404.f1f69d30.css","/favicon.svg","/_astro/AddToCartForm.1896ff11.js","/_astro/CartDrawer.e8fe44c2.js","/_astro/CartIcon.3b4e9c35.js","/_astro/cart.164e8c9f.js","/_astro/client.c4e17359.js"]}), {
	pageMap: pageMap,
	renderers: renderers
});
const _args = {};
const _exports = adapter.createExports(_manifest, _args);
const handler = _exports['handler'];

const _start = 'start';
if(_start in adapter) {
	adapter[_start](_manifest, _args);
}

export { handler, pageMap, renderers };
