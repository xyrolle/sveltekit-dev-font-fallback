// Loads the page several times and reports, for each load, the font the text ended up rendered
// with, the status of every request for the font file, and any layout shift.
//
//   node probe.js [url]                     defaults to http://localhost:5173/
//   LATENCY=10 node probe.js                adds 10 ms of DevTools network latency
//   CHANNEL=chrome node probe.js            uses the installed Google Chrome
//   RUNS=12 node probe.js
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const runs = Number(process.env.RUNS ?? 12);
const latency = Number(process.env.LATENCY ?? 0);

const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
console.log(`${browser.version()} ${url} latency=${latency}ms`);

let fallbacks = 0;

for (let i = 1; i <= runs; i += 1) {
	const context = await browser.newContext();
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);

	if (latency) {
		await cdp.send('Network.enable');
		await cdp.send('Network.emulateNetworkConditions', {
			offline: false,
			latency,
			downloadThroughput: -1,
			uploadThroughput: -1
		});
	}

	/** @type {number[]} */
	const font_responses = [];
	page.on('response', (response) => {
		if (response.url().endsWith('.woff2')) font_responses.push(response.status());
	});

	await page.addInitScript(() => {
		window.shifts = [];
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) window.shifts.push(Number(entry.value.toFixed(5)));
		}).observe({ type: 'layout-shift', buffered: true });
	});

	await page.goto(url);
	await page.waitForTimeout(2000);

	await cdp.send('DOM.enable');
	await cdp.send('CSS.enable');
	const { root } = await cdp.send('DOM.getDocument');
	const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#text' });
	const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
	const rendered = fonts.map((font) => font.familyName).join(', ');
	const shifts = await page.evaluate(() => window.shifts);

	if (!fonts.some((font) => font.familyName === 'Geist')) fallbacks += 1;
	console.log(`load ${i}: rendered with ${rendered}; font responses ${font_responses.join(', ')}; layout shifts [${shifts.join(', ')}]`);

	await context.close();
}

await browser.close();
console.log(`${fallbacks}/${runs} loads ended up in the fallback font`);
