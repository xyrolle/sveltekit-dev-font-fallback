<script>
	import '../app.css';
	import font from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preload" as="font" type="font/woff2" href={font} crossorigin="anonymous" />
</svelte:head>

{@render children()}
