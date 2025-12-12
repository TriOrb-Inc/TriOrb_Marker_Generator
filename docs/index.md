# TriOrb Marker Generator

Welcome to the TriOrb marker generator site. Use the hosted tool to create printable markers and export them as SVG or PDF files.

- **Launch the generator:** [Open the web app](app/index.html)
- **About the tool:** The app is bundled as a static HTML experience under `app/` and is included in versioned documentation builds produced by MkDocs and mike.

<style>
  /* タイトルバーの配色と検索非表示を確実に反映（Bootstrap 5 nav対応） */
  .navbar.fixed-top {
    background-color: rgb(34, 59, 128) !important;
    border-color: rgb(34, 59, 128) !important;
    --bs-navbar-color: #fff;
    --bs-navbar-hover-color: #fff;
    --bs-navbar-brand-color: #fff;
    --bs-navbar-brand-hover-color: #fff;
  }
  .navbar.fixed-top .navbar-brand,
  .navbar.fixed-top .nav-link {
    color: #fff !important;
  }
  #navbar-collapse .nav-link[data-bs-target="#mkdocs_search_modal"],
  #navbar-collapse .fa-search,
  #navbar-collapse .nav.navbar-nav.ms-md-auto {
    display: none !important;
  }
</style>

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
