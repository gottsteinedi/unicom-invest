document.addEventListener('DOMContentLoaded', function () {
  initNavToggle();
  initSliders();
  initProjectsGridSizing();
  initGalleryFilter();
  initLightbox();
  initApartments();
});

function initNavToggle() {
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
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

    function goTo(index) {
      slides[current].classList.remove('active');
      if (dots[current]) dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      if (dots[current]) dots[current].classList.add('active');
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

    resetAutoplay();
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

  var currentUrls = [];
  var currentIndex = 0;

  /* Izvlači URL slike iz inline "background-image: url(...)" stila —
     isti stil koriste .gallery-img elementi u HTML-u, pa ne treba
     dupliranje URL-a u posebnom data-atributu. */
  function backgroundImageUrl(el) {
    var match = el.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : '';
  }

  function show(index) {
    currentIndex = (index + currentUrls.length) % currentUrls.length;
    image.src = currentUrls[currentIndex];
  }

  document.querySelectorAll('.gallery-img').forEach(function (img) {
    img.addEventListener('click', function () {
      var group = img.closest('.gallery-project-block') || document;
      var groupImages = Array.from(group.querySelectorAll('.gallery-img'));
      currentUrls = groupImages.map(backgroundImageUrl);
      show(groupImages.indexOf(img));
      modal.classList.add('open');
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { show(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { show(currentIndex + 1); });
  if (closeBtn) closeBtn.addEventListener('click', function () { modal.classList.remove('open'); });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') modal.classList.remove('open');
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

  var itemsPerPage = 12; /* koliko stanova prikazujemo po strani tabele */
  var currentPage = 1;

  var modal = document.getElementById('sketch-modal');
  var modalClose = document.getElementById('modal-close');
  var modalTitle = document.getElementById('modal-title');
  var modalMeta = document.getElementById('modal-meta');
  var modalSketchWrap = document.getElementById('modal-sketch-wrap');
  var modalDownload = document.getElementById('modal-download');

  if (!csvUrl) return;

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

      tr.innerHTML =
        '<td><button class="view-btn" aria-label="Pregled stana ' + a.stan + '">Pregled</button></td>' +
        '<td>' + a.stan + '</td>' +
        '<td class="col-sprat">' + a.sprat + '</td>' +
        '<td class="col-tip">' + capitalize(a.tip) + '</td>' +
        '<td class="col-sobe">' + tipToSobe(a.tip) + '</td>' +
        '<td class="col-neto">' + formatBroj(a.povrsina) + ' m&sup2;</td>' +
        '<td class="col-komercijalna">' + formatBroj(a.komercijalna) + ' m&sup2;</td>' +
        '<td class="col-status"><span class="status-pill ' + statusInfo.cls + '">' + statusInfo.label + '</span></td>';

      tbody.appendChild(tr);
    });
  }

  function updateTotals(apartments) {
    if (metaUkupnoStanova) metaUkupnoStanova.textContent = apartments.length;
    if (metaUkupnaKvadratura) {
      var total = apartments.reduce(function (sum, a) { return sum + (parseFloat(a.povrsina) || 0); }, 0);
      metaUkupnaKvadratura.textContent = formatBroj(total) + ' m²';
    }
  }

  function attachFilterEvents() {
    function applyFilters() {
      currentPage = 1; /* nova pretraga/filter uvek počinje od prve strane */
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

  /* Glavna funkcija za prikaz tabele: primeni filter, izračunaj koliko
     strana ima (na osnovu itemsPerPage), pa prikaži samo redove koji
     pripadaju trenutnoj strani (currentPage). Zove se i pri promeni
     filtera i pri klik na broj strane. */
  function renderTable() {
    var allRows = Array.from(tbody.querySelectorAll('tr'));
    var filtered = getFilteredRows();
    var totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * itemsPerPage;
    var visibleOnPage = filtered.slice(start, start + itemsPerPage);

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
        var neto = row.querySelector('.col-neto').textContent;
        var komercijalna = row.querySelector('.col-komercijalna').textContent;
        var status = row.querySelector('.col-status').textContent;

        if (modalTitle) modalTitle.textContent = 'Stan ' + stan;
        if (modalMeta) {
          modalMeta.innerHTML =
            '<span><strong>Sprat:</strong>' + sprat + '</span>' +
            '<span><strong>Tip:</strong>' + tip + '</span>' +
            '<span><strong>Sobe:</strong>' + sobe + '</span>' +
            '<span><strong>Neto:</strong>' + neto + '</span>' +
            '<span><strong>Komercijalna:</strong>' + komercijalna + '</span>' +
            '<span><strong>Status:</strong>' + status + '</span>';
        }

        showSketch(row.dataset.skicaPdf);
        if (modal) modal.classList.add('open');
      });
    });
  }

  /* Puni #modal-sketch-wrap zavisno od toga da li stan ima data-skica-pdf
     (link ka PDF-u na Google Drive-u, iz SKICA kolone u sheet-u). Ako ima —
     ugrađen PDF viewer + dugme za preuzimanje. Ako nema — generička
     placeholder skica, dok se pravi PDF ne doda u sheet za taj stan. */
  function showSketch(driveLink) {
    var urls = driveLink ? driveEmbedUrls(driveLink) : null;

    if (urls) {
      modalSketchWrap.innerHTML = '<iframe class="modal-sketch-frame" src="' + urls.preview + '" title="Skica stana (PDF)"></iframe>';
      modalDownload.href = urls.download;
      modalDownload.style.display = '';
    } else {
      modalSketchWrap.innerHTML =
        '<img class="modal-sketch" src="images/skica-placeholder.svg" alt="Skica stana (privremeni primer)">' +
        '<p class="modal-empty-note">Prava skica (PDF) za ovaj stan uskoro stiže.</p>';
      modalDownload.style.display = 'none';
    }
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

  if (modalClose && modal) {
    modalClose.addEventListener('click', function () { modal.classList.remove('open'); });
  }
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('open');
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal) modal.classList.remove('open');
  });
}

/* ==========================================================================
   Pomoćne funkcije za Google Sheets -> tabelu stanova (koristi initApartments)
   ========================================================================== */

/* Sirovi CSV tekst -> niz objekata { stan, tip, povrsina, komercijalna,
   sprat, status, skicaPdf }. Nazivi kolona MORAJU odgovarati zaglavlju u
   Google Sheet-u (prvi red): STAN, TIP, POVRSINA, Komercijalna površina (m2),
   Sprat, STATUS, SKICA. Ako promeniš naziv kolone u sheet-u, promeni ga i
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

  return dataRows.map(function (row) {
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
