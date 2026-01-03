;(function(){
  const placeholder = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
  const selector = 'img';
  let observer = null;

  function shouldSkip(img){
    if(!img) return true;
    if (img.dataset && img.dataset.nolazy !== undefined) return true;
    if (img.getAttribute && img.getAttribute('fetchpriority') === 'high') return true;
    if (img.closest && img.closest('.carousel-container')) return true;
    if (img.loading === 'eager') return true;
    return false;
  }

  function prepareImage(img){
    if (shouldSkip(img)) return;
    if (img.dataset && img.dataset.src) return;
    try {
      const src = img.getAttribute('src') || '';
      if (!src) return;
      img.setAttribute('data-src', src);
      img.setAttribute('src', placeholder);
      img.classList.add('lazy-img');
      img.setAttribute('decoding', 'async');
    } catch(e) { /* ignore */ }
  }

  function loadImageNow(img){
    if (!img || !img.dataset) return;
    const src = img.dataset.src;
    if (!src) return;
    img.removeAttribute('data-src');
    img.src = src;
    img.classList.remove('lazy-img');
    try { img.setAttribute('decoding','async'); } catch(e){}
  }

  function onIntersect(entries){
    const visible = entries.filter(e => e.isIntersecting).sort((a,b)=> a.boundingClientRect.top - b.boundingClientRect.top);
    visible.forEach((entry, idx) => {
      const img = entry.target;
      setTimeout(()=> {
        loadImageNow(img);
        if (observer) observer.unobserve(img);
      }, idx * 40);
    });
  }

  function initObserver(){
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(onIntersect, { root: null, rootMargin: '400px 0px', threshold: 0.01 });
  }

  function getAllImages(){
    return Array.from(document.querySelectorAll(selector));
  }

  function isStructureImage(img){
    try {
      if (!img) return false;
      if (img.getAttribute && img.getAttribute('fetchpriority') === 'high') return true;
      if (img.id === 'siteLogo' || img.classList.contains('site-logo')) return true;
      if (img.closest && img.closest('header')) return true;
      if (img.closest && img.closest('.carousel-container')) return true;
      if (img.dataset && img.dataset.priority === '1') return true;
    } catch(e){}
    return false;
  }

  function isTopImage(img){
    try {
      if (!img) return false;
      if (img.dataset && (img.dataset.priority === '1' || img.dataset.priority === '2')) return true;
      const rect = img.getBoundingClientRect();
      if (rect && rect.top < window.innerHeight * 1.2) return true;
    } catch(e){}
    return false;
  }

  // load images that match a predicate immediately (staggered)
  function priorityLoad(predicate, staggerMs){
    const imgs = getAllImages().filter(i => i.dataset && i.dataset.src && predicate(i));
    imgs.forEach((img, idx) => setTimeout(()=>{ loadImageNow(img); try{ if (observer) observer.unobserve(img); }catch(e){} }, idx * (staggerMs||30)));
  }

  function refresh(){
    if (!observer) initObserver();
    const imgs = getAllImages();
    imgs.forEach(img => {
      try {
        if (shouldSkip(img)) return;
        if (!img.dataset || !img.dataset.src) {
          if (img.getAttribute('src') && !img.getAttribute('src').startsWith('data:')) prepareImage(img);
        }
        if (img.dataset && img.dataset.src) observer.observe(img);
      } catch(e) { /* ignore */ }
    });

    // Priority sequence: structure -> top -> rest via observer
    // 1) structure images (logo, header, hero) load immediately
    priorityLoad(isStructureImage, 20);

    // 2) small delay then load top/above-fold images
    setTimeout(()=> priorityLoad(isTopImage, 30), 60);
  }

  function init(){
    initObserver();
    refresh();
    // expose API
    window.lazyLoader = { init, refresh };

    // wrap existing enhanceImages if present so dynamic images are picked up
    if (window.enhanceImages && typeof window.enhanceImages === 'function'){
      const orig = window.enhanceImages;
      window.enhanceImages = function(){ try{ orig(); }catch(e){}; window.lazyLoader.refresh(); };
    }

    // observe DOM mutations to catch dynamically inserted images
    const mo = new MutationObserver((mutations)=>{
      for (const m of mutations){
        if (!m.addedNodes || m.addedNodes.length === 0) continue;
        m.addedNodes.forEach(node => {
          try {
            if (node.nodeType === 1 && node.tagName === 'IMG') { prepareImage(node); observer.observe(node); }
            if (node.querySelectorAll) node.querySelectorAll('img').forEach(img => { prepareImage(img); observer.observe(img); });
          } catch(e){}
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
