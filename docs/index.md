<div class="generator-page">
  <p class="generator-page__lead">Generate printable TriOrb markers and export them as SVG or PDF.</p>
  <iframe
    id="generator-iframe"
    class="generator-page__frame"
    src="app/index.html"
    title="TriOrb Marker Generator"
  ></iframe>
</div>

<script>
  (function () {
    const iframe = document.getElementById('generator-iframe');
    if (!iframe) return;

    const defaultHeight = 960;
    const baseSrc = iframe.getAttribute('src').split('?')[0];
    const query = window.location.search || '';

    function getAvailableHeight() {
      const footer = document.querySelector('footer.col-md-12');
      const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
      const frameTop = iframe.getBoundingClientRect().top;
      const availableHeight = window.innerHeight - frameTop - footerHeight;
      return Math.max(defaultHeight, Math.floor(availableHeight));
    }

    function syncFrameHeight() {
      const height = getAvailableHeight();
      iframe.style.height = height + 'px';
    }

    window.addEventListener('message', function (event) {
      if (!event || !event.data || event.data.type !== 'triorb-generator-height') {
        return;
      }

      syncFrameHeight();
    });

    window.addEventListener('resize', function () {
      syncFrameHeight();
    });

    iframe.addEventListener('load', function () {
      requestAnimationFrame(function () {
        syncFrameHeight();
      });
    });

    syncFrameHeight();
    iframe.setAttribute('src', baseSrc + query);
  })();
</script>
