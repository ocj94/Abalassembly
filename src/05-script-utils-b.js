<script>
(function(){
  try {
    if (sessionStorage.getItem('abaIntroShown')) {
      var el = document.getElementById('intro-splash');
      if (el) el.classList.add('intro-gone');
      return;
    }
    sessionStorage.setItem('abaIntroShown', '1');
  } catch(e) { /* stockage indisponible (navigation privée...) — l'intro joue quand même, sans persistance */ }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window._introTimer = setTimeout(function(){
    var el = document.getElementById('intro-splash');
    if (el) el.classList.add('intro-gone');
  }, reduced ? 1300 : 5100);
})();
function skipIntro(){
  if (window._introTimer != null) clearTimeout(window._introTimer);
  var el = document.getElementById('intro-splash');
  if (el) el.classList.add('intro-gone');
}
document.addEventListener('keydown', function(e){
  if ((e.key === 'Escape' || e.key === ' ') && document.getElementById('intro-splash') && !document.getElementById('intro-splash').classList.contains('intro-gone')) {
    skipIntro();
  }
});
(function(){
  var el = document.getElementById('intro-splash');
  if (el) el.addEventListener('click', function(e){ if (e.target === el || e.target.closest('.intro-marbles')) skipIntro(); });
})();
</script>