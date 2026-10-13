<script>
// Version anglaise choisie (?lang=en ou choix memorise) : la langue de la page est posee tout de suite,
// pour que le CSS montre deja les blocs anglais, et l'intro est traduite avant d'apparaitre. Le reste est
// traduit par le dictionnaire du script principal (section i18n), qui suit les memes regles.
(function(){
  try {
    var m = /[?&]lang=(en|fr)(?:&|$)/i.exec(location.search || ''), lg = m ? m[1] : localStorage.getItem('abalone_lang');
    if (String(lg || '').toUpperCase() !== 'EN') return;
    document.documentElement.lang = 'en';
    var t = document.querySelector('#intro-splash .intro-tagline'); if (t) t.textContent = 'The classic strategy game';
    var b = document.getElementById('intro-skip'); if (b) b.textContent = 'Skip ›';
  } catch (e) {}
})();
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
  }, reduced ? 1300 : 6700);
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
  if (el) el.addEventListener('click', function(e){ if (e.target === el || e.target.closest('.intro-title')) skipIntro(); });
})();
</script>