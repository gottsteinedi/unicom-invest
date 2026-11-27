document.addEventListener('DOMContentLoaded', function () {
  initNavToggle();
  initSliders();
  initProjectsGridSizing();
  initGalleryFilter();
  initLightbox();
  initApartments();
  initVideo();
  initMapFacades();
  initBackToTop();
});

function initNavToggle() {
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    mainNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

function initSliders() {
  document.querySelectorAll('.slider').forEach(function (root) {
    var slides = root.querySelectorAll('.slider-slide');
    var dots = root.querySelectorAll('.slider-dot');
    var prevBtn = root.querySelector('.slider-prev');
    var nextBtn = root.querySelector('.slider-next');
    if (!slides.length) return;

    var current = 0;
    var timer;

    /* Slajdovi 2..N imaju sliku u data-bg i učitavaju se tek kad zatrebaju
       (trenutni + sledeći), da stranica ne povuče sve slike odjednom. */
    function loadSlide(i) {
      var s = slides[(i + slides.length) % slides.length];
      if (s && s.dataset.bg && !s.style.backgroundImage) {
        s.style.backgroundImage = "url('" + s.dataset.bg + "')";
      }
    }

    function goTo(index) {
      slides[current].classList.remove('active');
      if (dots[current]) dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      loadSlide(current);
      loadSlide(current + 1);
      loadSlide(current - 1);
      slides[current].classList.add('active');
      if (dots[current]) dots[current].classList.add('active');
      root.dataset.current = current; /* da initLightbox zna koji je slajd trenutno prikazan */
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function resetAutoplay() {
      clearInterval(timer);
      var interval = parseInt(root.dataset.autoplay || '0', 10);
      if (interval) timer = setInterval(next, interval);
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); resetAutoplay(); });
    });

    if (nextBtn) nextBtn.addEventListener('click', function () { next(); resetAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); resetAutoplay(); });

    root.dataset.current = current;
    resetAutoplay();
    // kad se stranica učita, unapred spremi drugi slajd da prvi klik bude bez čekanja
    window.addEventListener('load', function () { loadSlide(1); });
  });
}

/* Broji koliko .project-card ima unutar .projects-grid (na Početnoj i na
   Projekti stranici) i dodaje klasu "count-1" ili "count-2" na sam grid.
   CSS (u style.css, odmah ispod .project-card) onda pravi veće kartice
   kad ih ima malo — realno će najčešće biti 1, možda 2 aktuelna projekta. */
function initProjectsGridSizing() {
  document.querySelectorAll('.projects-grid').forEach(function (grid) {
    var count = grid.querySelectorAll('.project-card').length;
    grid.classList.remove('count-1', 'count-2');
    if (count === 1) grid.classList.add('count-1');
    else if (count === 2) grid.classList.add('count-2');
  });
}

function initGalleryFilter() {
  var buttons = document.querySelectorAll('.filter-btn');
  var blocks = document.querySelectorAll('.gallery-project-block');
  if (!buttons.length || !blocks.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.dataset.filter;
      blocks.forEach(function (block) {
        block.style.display = (filter === 'sve' || block.dataset.project === filter) ? '' : 'none';
      });
    });
  });
}

/* ==========================================================================
   REFERENCE (reference.html) — lightbox: klik na sliku je uveća, strelice
   (i tastatura levo/desno) prelaze na prethodnu/sledeću sliku UNUTAR ISTOG
   projekta (.gallery-project-block), Escape ili klik van slike zatvara.
   ========================================================================== */
function initLightbox() {
  var modal = document.getElementById('lightbox-modal');
  if (!modal) return;

  var image = document.getElementById('lightbox-image');
  var closeBtn = document.getElementById('lightbox-close');
  var prevBtn = document.getElementById('lightbox-prev');
  var nextBtn = document.getElementById('lightbox-next');

  var caption = document.getElementById('lightbox-caption');
  var counter = document.getElementById('lightbox-counter');

  var currentUrls = [];
  var currentCaptions = [];
  var currentIndex = 0;

  /* Izvlači URL slike iz inline "background-image: url(...)" stila —
     isti stil koriste .gallery-img elementi u HTML-u, pa ne treba
     dupliranje URL-a u posebnom data-atributu. */
  function backgroundImageUrl(el) {
    var match = el.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : '';
  }

  /* Velika slika: data-full (reference) ili background-image (slajder projekta) */
  function fullUrl(el) {
    return el.dataset.full || el.dataset.bg || backgroundImageUrl(el);
  }

  function show(index) {
    var n = currentUrls.length;
    currentIndex = (index + n) % n;
    image.src = currentUrls[currentIndex];
    image.alt = currentCaptions[currentIndex] || 'Uvećana slika';
    if (caption) caption.textContent = currentCaptions[currentIndex] || '';
    if (counter) counter.textContent = n > 1 ? (currentIndex + 1) + ' / ' + n : '';
    // unapred učitaj sledeću sliku da listanje bude bez čekanja
    if (n > 1) { var pre = new Image(); pre.src = currentUrls[(currentIndex + 1) % n]; }
  }

  function open() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.gallery-img').forEach(function (img) {
    img.addEventListener('click', function () {
      var group = img.closest('.gallery-project-block') || document;
      var groupImages = Array.from(group.querySelectorAll('.gallery-img'));
      currentUrls = groupImages.map(fullUrl);
      currentCaptions = groupImages.map(function (el) {
        var i = el.querySelector('img');
        return i ? i.alt : '';
      });
      show(groupImages.indexOf(img));
      open();
    });
  });

  /* Dugme za uvećavanje na slajderu projekta (projekat.html) — otvara isti
     lightbox, kreće od slajda koji je TRENUTNO prikazan (root.dataset.current,
     vidi initSliders) i dozvoljava prelazak kroz sve slike tog slajdera. */
  document.querySelectorAll('.slider-zoom-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var root = btn.closest('.slider');
      if (!root) return;
      var slides = Array.from(root.querySelectorAll('.slider-slide'));
      currentUrls = slides.map(fullUrl);
      currentCaptions = [];
      show(parseInt(root.dataset.current, 10) || 0);
      open();
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { show(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { show(currentIndex + 1); });
  if (closeBtn) closeBtn.addEventListener('click', close);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });

  // Telefon: prevlačenje prstom levo/desno menja sliku
  var touchX = null;
  modal.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  modal.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) show(currentIndex + (dx < 0 ? 1 : -1));
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(currentIndex - 1);
    if (e.key === 'ArrowRight') show(currentIndex + 1);
  });
}

/* ==========================================================================
   PROJEKAT (projekat.html) — tabela stanova, uživo povučena iz Google Sheets

   Tok:
   1. Pročita link iz data-csv-url atributa na <table id="apartments-table">
   2. fetch() povuče sirovi CSV tekst (Sheet mora biti "Publish to web" -> CSV)
   3. parseApartmentsCSV pretvori tekst u niz objekata (jedan po stanu)
   4. Iz tih podataka gradimo: opcije filtera, redove tabele, i ukupne brojeve
      (Ukupno stanova / Ukupna kvadratura) u chipovima na vrhu stranice
   5. Klik na red i dalje otvara modal sa skicom (PDF sa Google Drive-a ako
      postoji link u SKICA koloni, inače privremeni placeholder)

   Ako promeniš nešto u samom Google Sheet-u (cenu, status, dodaš stan...),
   ta promena je vidljiva čim se stranica ponovo učita — ništa ovde nije
   ručno upisano.
   ========================================================================== */
function initApartments() {
  var table = document.getElementById('apartments-table');
  if (!table) return;

  var csvUrl = table.dataset.csvUrl;
  var tableWrap = document.getElementById('table-wrap');
  var tableStatus = document.getElementById('table-status');
  var tbody = document.getElementById('apartments-body');
  var floorFilter = document.getElementById('filter-sprat');
  var typeFilter = document.getElementById('filter-tip');
  var resetBtn = document.getElementById('filter-reset');
  var paginationEl = document.getElementById('pagination');
  var metaUkupnoStanova = document.getElementById('meta-ukupno-stanova');
  var metaUkupnaKvadratura = document.getElementById('meta-ukupna-kvadratura');

  var itemsPerPage = 12; /* koliko stanova po strani; strane se pojavljuju tek kad ima više od 12 redova */
  var currentPage = 1;

  var modal = document.getElementById('sketch-modal');
  var modalClose = document.getElementById('modal-close');
  var modalTitle = document.getElementById('modal-title');
  var modalMeta = document.getElementById('modal-meta');
  var modalSketchWrap = document.getElementById('modal-sketch-wrap');
  var modalDownload = document.getElementById('modal-download');

  if (!csvUrl) return;

  /* Na telefonu se ne prikazuje svih 50+ stanova odjednom, nego po 12,
     sa dugmetom "Prikaži još stanova" ispod tabele. */
  var mobileStep = 12;
  var mobileShown = mobileStep;
  var showMoreBtn = document.createElement('button');
  showMoreBtn.type = 'button';
  showMoreBtn.className = 'btn btn-ghost show-more-btn';
  showMoreBtn.hidden = true;
  if (tableWrap) tableWrap.insertAdjacentElement('afterend', showMoreBtn);
  showMoreBtn.addEventListener('click', function () {
    mobileShown += mobileStep;
    renderTable();
  });

  /* Kad neko otvori link projekat.html#stanovi, browser skroluje dok je
     tabela još prazna (stanovi stižu iz Sheet-a tek posle ~0,5–1 s), pa
     stranica završi na pogrešnom mestu. Zato, kad se tabela popuni,
     ponovo skrolujemo do naslova "Stanovi u ponudi" — ali samo u prvih
     nekoliko sekundi, da ne trgnemo stranicu nekome ko je već skrolovao. */
  var pageLoadedAt = Date.now();
  function scrollToHashAfterLoad() {
    if (location.hash !== '#stanovi' || Date.now() - pageLoadedAt > 4000) return;
    var section = document.getElementById('stanovi');
    if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  /* cache: 'no-store' + jedinstven "_=..." parametar na kraju linka teraju
     i browser i Google-ov CDN da svaki put vrate SVEŽ CSV, ne stari
     zapamćeni odgovor — bez ovoga izmene u Sheet-u znale su da ne stignu
     na stranicu dok se keš sam ne istekne. */
  var freshCsvUrl = csvUrl + (csvUrl.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now();

  fetch(freshCsvUrl, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (csvText) {
      var apartments = parseApartmentsCSV(csvText);
      buildFilterOptions(apartments);
      buildRows(apartments);
      updateTotals(apartments);
      attachFilterEvents();
      attachRowEvents();
      renderTable();
      if (tableStatus) tableStatus.style.display = 'none';
      if (tableWrap) tableWrap.style.display = '';
      scrollToHashAfterLoad();
    })
    .catch(function (err) {
      console.error('Ne mogu da učitam stanove iz Google Sheets-a:', err);
      if (tableStatus) tableStatus.textContent = 'Trenutno ne možemo da učitamo listu stanova. Pokušajte kasnije ili nas kontaktirajte.';
    });

  function buildFilterOptions(apartments) {
    var floors = uniqueSorted(apartments.map(function (a) { return a.sprat; }), floorRank);
    var tips = uniqueSorted(apartments.map(function (a) { return a.tip; }), tipRank);

    floors.forEach(function (f) {
      var opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      floorFilter.appendChild(opt);
    });

    tips.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = capitalize(t);
      typeFilter.appendChild(opt);
    });
  }

  function buildRows(apartments) {
    tbody.innerHTML = '';
    apartments.forEach(function (a) {
      var statusInfo = normalizeStatus(a.status);
      var tr = document.createElement('tr');
      tr.dataset.stan = a.stan;
      tr.dataset.sprat = a.sprat;
      tr.dataset.tip = a.tip;
      tr.dataset.skicaPdf = a.skicaPdf;
      tr.dataset.komercijalna = parseFloat(String(a.komercijalna).replace(',', '.')) || 0;
      if (statusInfo.cls === 'status-prodato') tr.classList.add('is-sold'); /* prodati stanovi su sivlji u tabeli */

      tr.innerHTML =
        '<td class="col-pregled"><button class="view-btn" aria-label="Pregled stana ' + a.stan + '">' +
          '<span class="view-btn-text">Pregled</span>' +
          '<span class="view-btn-icon" aria-hidden="true">&#128269;</span>' +
        '</button></td>' +
        '<td class="col-stan"><strong>' + a.stan + '</strong><span class="stan-sprat">' + a.sprat + '</span></td>' +
        '<td class="col-sprat">' + a.sprat + '</td>' +
        '<td class="col-tip">' + capitalize(a.tip) + '</td>' +
        '<td class="col-sobe">' + tipToSobe(a.tip) + '</td>' +
        '<td class="col-komercijalna">' + formatBroj(a.komercijalna) + ' m&sup2;</td>' +
        '<td class="col-status"><span class="status-pill ' + statusInfo.cls + '">' + statusInfo.label + '</span></td>';

      tbody.appendChild(tr);
    });
  }

  /* Ukupan broj stanova (54) i kvadratura (2.740 m²) su upisani ručno u projekat.html.
     Ovde samo prebrojimo statuse iz Sheet-a i popunimo traku "dostupnost"
     u tabli sa podacima (koliko je stanova slobodno / rezervisano / prodato). */
  function updateTotals(apartments) {
    var box = document.getElementById('availability');
    if (!box || !apartments.length) return;
    var counts = { 'status-dostupno': 0, 'status-rezervisano': 0, 'status-prodato': 0 };
    apartments.forEach(function (a) {
      var cls = normalizeStatus(a.status).cls;
      if (counts.hasOwnProperty(cls)) counts[cls] += 1;
    });
    var total = counts['status-dostupno'] + counts['status-rezervisano'] + counts['status-prodato'];
    if (!total) return;
    function pct(n) { return (n / total * 100).toFixed(1) + '%'; }
    document.getElementById('availability-text').textContent =
      'Slobodno: ' + counts['status-dostupno'] + ' od ' + total + ' stanova';
    document.getElementById('availability-bar').innerHTML =
      '<span class="a-dostupno" style="width:' + pct(counts['status-dostupno']) + '"></span>' +
      '<span class="a-rezervisano" style="width:' + pct(counts['status-rezervisano']) + '"></span>' +
      '<span class="a-prodato" style="width:' + pct(counts['status-prodato']) + '"></span>';
    document.getElementById('availability-legend').textContent =
      'Rezervisano: ' + counts['status-rezervisano'] + ', prodato: ' + counts['status-prodato'];
    box.hidden = false;
  }

  function attachFilterEvents() {
    function applyFilters() {
      currentPage = 1; /* nova pretraga/filter uvek počinje od prve strane */
      mobileShown = mobileStep;
      renderTable();
    }

    if (floorFilter) floorFilter.addEventListener('change', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        floorFilter.value = 'sve';
        typeFilter.value = 'sve';
        applyFilters();
      });
    }
  }

  /* Vraća samo redove koji odgovaraju trenutno izabranim filterima
     (sprat/tip) — bez obzira na paginaciju, ovo je "sve što treba da postoji
     na nekoj strani od 1 do N". */
  function getFilteredRows() {
    var sprat = floorFilter.value;
    var tip = typeFilter.value;
    return Array.from(tbody.querySelectorAll('tr')).filter(function (row) {
      var matchSprat = sprat === 'sve' || row.dataset.sprat === sprat;
      var matchTip = tip === 'sve' || row.dataset.tip === tip;
      return matchSprat && matchTip;
    });
  }

  /* Na mobilnom (ispod 720px) tabela stanova prikazuje manje kolona
     (vidi CSS) i učitava se cela odjednom, bez paginacije — zato ovde
     "stranica" postaje cela lista kad je ekran uzak. */
  function isMobileTable() {
    return window.matchMedia('(max-width: 720px)').matches;
  }

  /* Glavna funkcija za prikaz tabele: primeni filter, izračunaj koliko
     strana ima (na osnovu itemsPerPage), pa prikaži samo redove koji
     pripadaju trenutnoj strani (currentPage). Zove se i pri promeni
     filtera i pri klik na broj strane. Na mobilnom se paginacija
     isključuje — effectivePerPage postaje ceo broj (filtriranih) redova,
     pa renderPagination prirodno ne iscrta ništa (totalPages === 1). */
  function renderTable() {
    var allRows = Array.from(tbody.querySelectorAll('tr'));
    var filtered = getFilteredRows();
    /* Do 12 redova (npr. kad je izabran sprat ili tip) sve je na jednoj strani, bez brojeva.
       Preko 12 tabela se deli na strane po 12. */
    var effectivePerPage = (isMobileTable() || filtered.length <= itemsPerPage) ? Math.max(filtered.length, 1) : itemsPerPage;
    var totalPages = Math.max(1, Math.ceil(filtered.length / effectivePerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * effectivePerPage;
    var visibleOnPage = filtered.slice(start, start + effectivePerPage);

    /* Telefon: prikaži prvih mobileShown stanova + dugme za još */
    var remaining = 0;
    if (isMobileTable()) {
      remaining = Math.max(0, filtered.length - mobileShown);
      visibleOnPage = filtered.slice(0, mobileShown);
    }
    showMoreBtn.hidden = remaining === 0;
    showMoreBtn.textContent = 'Prikaži još stanova (' + remaining + ')';

    allRows.forEach(function (row) { row.style.display = 'none'; });
    visibleOnPage.forEach(function (row) { row.style.display = ''; });

    renderPagination(totalPages);
  }

  /* Crta dugmiće za strane (‹ 1 2 3 › ...) ispod tabele. Klik na broj ili
     na strelicu menja currentPage i ponovo poziva renderTable(). Kad ima
     samo 1 strana, ne prikazuje se ništa (nema smisla). */
  function renderPagination(totalPages) {
    if (!paginationEl) return;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    var html = '<button class="page-btn page-nav" data-page="prev"' +
      (currentPage === 1 ? ' disabled' : '') +
      ' aria-label="Prethodna strana">&#10094;</button>';

    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="page-btn' + (i === currentPage ? ' active' : '') +
        '" data-page="' + i + '">' + i + '</button>';
    }

    html += '<button class="page-btn page-nav" data-page="next"' +
      (currentPage === totalPages ? ' disabled' : '') +
      ' aria-label="Sledeća strana">&#10095;</button>';

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var page = btn.dataset.page;
        if (page === 'prev') currentPage -= 1;
        else if (page === 'next') currentPage += 1;
        else currentPage = parseInt(page, 10);
        renderTable();
        tableWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function attachRowEvents() {
    tbody.querySelectorAll('tr').forEach(function (row) {
      row.addEventListener('click', function () {
        var stan = row.dataset.stan;
        var sprat = row.querySelector('.col-sprat').textContent;
        var tip = row.querySelector('.col-tip').textContent;
        var sobe = row.querySelector('.col-sobe').textContent;
        var komercijalna = row.querySelector('.col-komercijalna').textContent;
        var status = row.querySelector('.col-status').textContent;

        if (modalTitle) modalTitle.textContent = 'Stan ' + stan;
        if (modalMeta) {
          modalMeta.innerHTML =
            '<span>Sprat<strong>' + sprat + '</strong></span>' +
            '<span>Tip<strong>' + tip + '</strong></span>' +
            '<span>Sobe<strong>' + sobe + '</strong></span>' +
            '<span>Kvadratura<strong>' + komercijalna + '</strong></span>' +
            '<span>Status<strong>' + status + '</strong></span>';
        }

        showSketch(row.dataset.skicaPdf, row.dataset.stan);
        openModal();
      });
    });
  }

  /* Puni #modal-sketch-wrap za izabrani stan. Skice su na sajtu, po oznaci stana:
       - slika za prikaz:     images/skice/S8-mala.webp (1600 px)
       - puna veličina:       images/skice/S8.webp (na klik)
       - PDF za preuzimanje:  skice-pdf/S8.pdf
     Nova ili izmenjena skica = zameni PDF u skice-pdf/ i napravi novu sliku.
     Rezerva (npr. za stanove iz sledećih faza dok se ne ubace fajlovi):
     ako slike nema, koristi se link iz kolone SKICA u Sheet-u (PDF sa
     Google Drive-a), a ako ni njega nema — privremena (generička) skica. */
  function showSketch(driveLink, stan) {
    var urls = driveLink ? driveEmbedUrls(driveLink) : null;

    function showFallback() {
      if (urls) {
        modalSketchWrap.innerHTML = '<iframe class="modal-sketch-frame" src="' + urls.preview + '" title="Skica stana (PDF)"></iframe>';
        modalDownload.href = urls.download;
        modalDownload.removeAttribute('download');
        modalDownload.style.display = '';
      } else {
        modalSketchWrap.innerHTML =
          '<img class="modal-sketch" src="images/skica-placeholder.svg" alt="Skica stana (privremeni primer)">' +
          '<p class="modal-empty-note">Prava skica za ovaj stan uskoro stiže.</p>';
        modalDownload.style.display = 'none';
      }
    }

    if (!stan) { showFallback(); return; }

    var name = encodeURIComponent(stan);
    var src = 'images/skice/' + name + '.webp';          /* velika — otvara se na klik */
    var srcMala = 'images/skice/' + name + '-mala.webp'; /* manja (~100 KB) — prikaz u prozoru */
    modalDownload.href = 'skice-pdf/' + name + '.pdf';
    modalDownload.setAttribute('download', 'Presernova-8-stan-' + stan + '.pdf');
    modalDownload.style.display = '';
    modalSketchWrap.innerHTML =
      '<a class="modal-sketch-link" href="' + src + '" target="_blank" rel="noopener" title="Otvori skicu u punoj veličini">' +
        '<img class="modal-sketch" src="' + srcMala + '" width="1600" height="1131" decoding="async" alt="Skica stana ' + stan + '">' +
      '</a>' +
      '<p class="modal-empty-note">Kliknite na skicu za prikaz u punoj veličini.</p>';
    var img = modalSketchWrap.querySelector('img');
    img.addEventListener('error', function () {
      if (modalSketchWrap.contains(img)) showFallback();
    });
  }

  /* Google Drive share link (npr. .../file/d/ID/view?usp=sharing ili
     ...?id=ID) -> { preview, download } linkovi za ugrađivanje u iframe
     i za direktno preuzimanje PDF-a. */
  function driveEmbedUrls(shareLink) {
    var match = shareLink.match(/\/d\/([a-zA-Z0-9_-]+)/) || shareLink.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    var id = match[1];
    return {
      preview: 'https://drive.google.com/file/d/' + id + '/preview',
      download: 'https://drive.google.com/uc?export=download&id=' + id
    };
  }

  /* Otvaranje/zatvaranje prozora sa detaljima stana. Fokus tastature ide
     na dugme "Zatvori", a posle zatvaranja se vraća tamo gde je bio
     (bitno za korisnike tastature i čitača ekrana). */
  var lastFocused = null;
  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('open');
    if (modalClose) modalClose.focus({ preventScroll: true });
  }
  function closeModal() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* Ako se pređe preko 720px praga (rotacija telefona, promena veličine
     prozora), ponovo iscrtaj tabelu da uključi/isključi paginaciju. */
  var wasMobileTable = isMobileTable();
  window.addEventListener('resize', function () {
    var nowMobileTable = isMobileTable();
    if (nowMobileTable !== wasMobileTable) {
      wasMobileTable = nowMobileTable;
      currentPage = 1;
      renderTable();
    }
  });
}

/* ==========================================================================
   Pomoćne funkcije za Google Sheets -> tabelu stanova (koristi initApartments)
   ========================================================================== */

/* Sirovi CSV tekst -> niz objekata { stan, tip, povrsina, komercijalna,
   sprat, status, skicaPdf }. Nazivi kolona MORAJU odgovarati zaglavlju u
   Google Sheet-u (prvi red): STAN, TIP, POVRSINA, Komercijalna površina (m2),
   Sprat, STATUS, SKICA (SKICA je opciona — skice su sada u images/skice i skice-pdf). Ako promeniš naziv kolone u sheet-u, promeni ga i
   ovde (u pozivima funkcije col). */
function parseApartmentsCSV(text) {
  var table = parseCSV(text);
  if (!table.length) return [];

  var headers = table[0].map(function (h) { return h.trim(); });
  var dataRows = table.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell.trim() !== ''; });
  });

  function col(row, name) {
    var i = headers.indexOf(name);
    return i === -1 ? '' : (row[i] || '').trim();
  }

  /* Red bez oznake stana (kolona STAN prazna) se preskače — tako prazan ili
     poluprazan red na dnu Sheet-a ne pravi "- m² -" red u tabeli. */
  return dataRows.filter(function (row) {
    return col(row, 'STAN') !== '';
  }).map(function (row) {
    return {
      stan: col(row, 'STAN'),
      tip: col(row, 'TIP').toLowerCase(),
      povrsina: col(row, 'POVRSINA'),
      komercijalna: col(row, 'Komercijalna površina (m2)'),
      sprat: col(row, 'Sprat'),
      status: col(row, 'STATUS'),
      skicaPdf: col(row, 'SKICA')
    };
  });
}

/* Jednostavan CSV parser — razume zarez kao razdvajač polja i navodnike
   oko polja (Google Sheets tako izveze polje koje samo sadrži zarez). */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
      continue;
    }

    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignoriši — \r\n se svodi na \n */ }
    else { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  return rows;
}

/* Broj soba po tipu stana + redosled tipova (za sortiranje filtera).
   Dodaj novi tip ovde ako se pojavi u sheet-u, inače pada na "-" u tabeli. */
var TIP_SOBE = {
  'garsonjera': '1',
  'jednosoban': '1',
  'jednoiposoban': '1.5',
  'dvosoban': '2',
  'dvoiposoban': '2.5',
  'trosoban': '3',
  'troiposoban': '3.5',
  'cetvorosoban': '4',
  'četvorosoban': '4'
};
var TIP_REDOSLED = ['garsonjera', 'jednosoban', 'jednoiposoban', 'dvosoban', 'dvoiposoban', 'trosoban', 'troiposoban', 'cetvorosoban', 'četvorosoban'];

function tipToSobe(tip) {
  return TIP_SOBE[tip] || '-';
}

function tipRank(tip) {
  var i = TIP_REDOSLED.indexOf(tip);
  return i === -1 ? 999 : i;
}

/* "Prizemlje" -> 0, "I sprat"/"II sprat"/... -> rimski broj, nepoznato -> na kraj */
function floorRank(label) {
  var norm = (label || '').trim().toLowerCase();
  if (norm === 'prizemlje' || norm === 'pr') return 0;
  if (norm === 'suteren' || norm === 'podrum') return -1;
  var match = (label || '').trim().match(/^([ivxlc]+)\s*sprat/i);
  if (match) return romanToInt(match[1].toUpperCase());
  return 999;
}

function romanToInt(roman) {
  var values = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  var total = 0;
  for (var i = 0; i < roman.length; i++) {
    var current = values[roman[i]];
    var next = values[roman[i + 1]];
    total += (next && current < next) ? -current : current;
  }
  return total;
}

/* Sheet može da koristi razne reči za isto stanje ("slobodan", "dostupno"...)
   — ovde ih svodimo na 3 poznata statusa (isti kao status-pill klase u
   style.css). Nepoznata reč se i dalje prikaže (sivo), ništa se ne gubi. */
function normalizeStatus(raw) {
  var norm = (raw || '').trim().toLowerCase();
  if (norm === 'slobodan' || norm === 'slobodno' || norm === 'dostupan' || norm === 'dostupno') {
    return { label: 'Dostupno', cls: 'status-dostupno' };
  }
  if (norm === 'rezervisan' || norm === 'rezervisano') {
    return { label: 'Rezervisano', cls: 'status-rezervisano' };
  }
  if (norm === 'prodat' || norm === 'prodato' || norm === 'prodan') {
    return { label: 'Prodato', cls: 'status-prodato' };
  }
  return { label: raw || '-', cls: 'status-nepoznato' };
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/* Broj u srpskom formatu: tačka razdvaja hiljade, zarez decimale (npr. 58.55 -> "58,55") */
function formatBroj(value) {
  var num = parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return value || '-';
  return num.toLocaleString('sr-RS', { maximumFractionDigits: 2 });
}

/* Jedinstvene vrednosti iz niza (bez praznih), sortirane po zadatoj funkciji ranga */
function uniqueSorted(values, rankFn) {
  var seen = {};
  var unique = [];
  values.forEach(function (v) {
    if (v && !seen[v]) { seen[v] = true; unique.push(v); }
  });
  unique.sort(function (a, b) { return rankFn(a) - rankFn(b); });
  return unique;
}


/* ==========================================================================
   PROJEKAT — Video prezentacija
   Video se NE pušta sam: korisnik klikne "Pogledajte video", otvori se
   prozor i tek tada krene. Zvuk se gasi preko ugrađenih kontrola plejera.
   ========================================================================== */
function initVideo() {
  var modal = document.getElementById('video-modal');
  var video = document.getElementById('project-video');
  if (!modal || !video) return;
  var closeBtn = document.getElementById('video-close');

  function open() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    video.pause();
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-video-open]').forEach(function (btn) {
    btn.addEventListener('click', open);
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
}


/* ==========================================================================
   Google mapa na klik (projekat.html, kontakt.html)
   Umesto da se mapa (~0,5–1 MB) učita odmah, prikazuje se dugme
   "Prikaži mapu"; tek na klik se ubacuje pravi Google Maps iframe.
   ========================================================================== */
function initMapFacades() {
  document.querySelectorAll('.map-facade').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = btn.dataset.mapSrc;
      iframe.title = btn.dataset.mapTitle || 'Mapa';
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
    });
  });
}


/* ==========================================================================
   SVE STRANICE — dugme "Na vrh" (dole desno, pojavi se kad se skroluje)
   Pravi se ovde u JS-u, pa ne mora da se dodaje u svaki HTML fajl.
   ========================================================================== */
function initBackToTop() {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-top';
  btn.setAttribute('aria-label', 'Na vrh stranice');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5l-7 7m7-7l7 7M12 5v14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(btn);

  /* Na telefonu dugme stoji iznad donje trake, desno — baš preko tačkica
     statusa u tabeli stanova. Dok je tabela ispod dugmeta, sakrij ga. */
  var tableWrap = document.getElementById('table-wrap');
  function overTable() {
    if (!tableWrap || window.innerWidth > 720) return false;
    var r = tableWrap.getBoundingClientRect();
    var btnTop = window.innerHeight - 140, btnBottom = window.innerHeight - 80;
    return r.height > 0 && r.top < btnBottom && r.bottom > btnTop;
  }

  var ticking = false;
  function update() {
    btn.classList.toggle('is-visible', window.scrollY > 600 && !overTable());
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
