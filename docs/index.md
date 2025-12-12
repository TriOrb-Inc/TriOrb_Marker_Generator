# TriOrb Marker Generator

Welcome to the TriOrb marker generator site. Use the hosted tool to create printable markers and export them as SVG or PDF files.

- **Launch the generator:** [Open the web app](app/index.html)
- **About the tool:** The app is bundled as a static HTML experience under `app/` and is included in versioned documentation builds produced by MkDocs and mike.

<iframe id="generator-iframe" src="app/index.html" title="TriOrb Marker Generator" style="width: 100%; height: 900px; border: 1px solid #ddd; border-radius: 8px;"></iframe>

<script>
  (function () {
    const iframe = document.getElementById('generator-iframe');
    if (!iframe) return;
    const baseSrc = iframe.getAttribute('src').split('?')[0];
    const query = window.location.search || '';
    iframe.setAttribute('src', baseSrc + query);
  })();
</script>
