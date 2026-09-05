<script>
(function(){
  var p = new URLSearchParams(location.search).get('projector');
  if (p === '1d' || p === '2d' || p === '3d') {
    window._isProjector = true;
    window._projectorDim = p;
    document.body.classList.add('projector-mode');
  }
})();
</script>