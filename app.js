/* ═══════════════════════════════════════════════════════════════
   وحدات جدارات الكهرباء — App محسّن
   ═══════════════════════════════════════════════════════════════ */

// ─── State ───
const state = {
  selectedIds: new Set(),
  favorites: new Set(JSON.parse(localStorage.getItem('elec_favorites') || '[]')),
  view: localStorage.getItem('elec_view') || 'grid',
  theme: localStorage.getItem('elec_theme') || 'light',
  searchQuery: '',
  filters: JSON.parse(localStorage.getItem('elec_filters') || '{}'),
  sortBy: localStorage.getItem('elec_sort') || 'name',
  debounceTimer: null
};

// ─── DOM refs ───
const $ = id => document.getElementById(id);
const els = {
  search: $('searchInput'),
  grade: $('filterGrade'),
  specialty: $('filterSpecialty'),
  type: $('filterType'),
  term: $('filterTerm'),
  sortBy: $('sortBy'),
  container: $('filesContainer'),
  empty: $('emptyState'),
  emptyTitle: $('emptyTitle'),
  emptyMessage: $('emptyMessage'),
  btnResetEmpty: $('btnResetEmpty'),
  resultCount: $('statResultCount'),
  selectedCount: $('selectedCount'),
  btnDownload: $('btnDownloadSelected'),
  btnSelectAll: $('btnSelectAll'),
  btnClear: $('btnClearSelection'),
  btnReset: $('btnResetFilters'),
  btnPrint: $('btnPrint'),
  themeToggle: $('themeToggle'),
  themeIcon: $('themeIcon'),
  scrollTop: $('scrollTop'),
  toastContainer: $('toastContainer'),
  activeFilters: $('activeFilters'),
  statTotalFiles: $('statTotalFiles'),
  btnFilterToggle: $('btnFilterToggle'),
  filterBody: $('filterBody'),
  filterChevron: $('filterChevron')
};

// ─── Helpers ───
const gradeLabel = g => g === 1 ? 'الأول' : g === 2 ? 'الثاني' : 'الثالث';
const termLabel = t => t === 1 ? 'الأول' : t === 2 ? 'الثاني' : '';

const typeBadgeClass = type => {
  if (type === 'معلم') return 'type-teacher';
  if (type === 'طالب') return 'type-student';
  if (type === 'تقييم') return 'type-eval';
  return '';
};

const typeIcon = type => {
  if (type === 'معلم') return '👨‍🏫';
  if (type === 'طالب') return '📖';
  if (type === 'تقييم') return '📋';
  return '📄';
};

const escapeHtml = text => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ─── Toast ───
function toast(msg, type = 'success', duration = 3000) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  t.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${escapeHtml(msg)}</span>`;
  els.toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ─── Theme ───
function applyTheme() {
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    els.themeIcon.className = 'fas fa-sun';
    els.themeToggle.title = 'الوضع النهاري (Ctrl+Shift+L)';
  } else {
    document.documentElement.removeAttribute('data-theme');
    els.themeIcon.className = 'fas fa-moon';
    els.themeToggle.title = 'الوضع الليلي (Ctrl+Shift+L)';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('elec_theme', state.theme);
  applyTheme();
  toast(state.theme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري', 'info', 2000);
}

// ─── Scroll to Top ───
function onScroll() {
  els.scrollTop.classList.toggle('visible', window.scrollY > 400);
}

// ─── Restore Filters ───
function restoreFilters() {
  if (state.filters.grade) els.grade.value = state.filters.grade;
  if (state.filters.specialty) els.specialty.value = state.filters.specialty;
  if (state.filters.type) els.type.value = state.filters.type;
  if (state.filters.term) els.term.value = state.filters.term;
  if (state.sortBy) els.sortBy.value = state.sortBy;
}

function saveFilters() {
  state.filters = {
    grade: els.grade.value,
    specialty: els.specialty.value,
    type: els.type.value,
    term: els.term.value
  };
  localStorage.setItem('elec_filters', JSON.stringify(state.filters));
  localStorage.setItem('elec_sort', els.sortBy.value);
}

// ─── View Toggle ───
function setView(view) {
  state.view = view;
  localStorage.setItem('elec_view', view);
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render();
}

// ─── Get Filtered Files ───
function getFilteredFiles() {
  const q = state.searchQuery.trim().toLowerCase();
  const grade = els.grade.value;
  const specialty = els.specialty.value;
  const type = els.type.value;
  const term = els.term.value;
  const sortKey = els.sortBy.value;

  let list = FILES.filter(f => {
    if (f.isFolder) return false;
    if (grade && String(f.grade) !== grade) return false;
    if (specialty && f.specialty !== specialty) return false;
    if (type && f.type !== type) return false;
    if (term && String(f.term) !== term) return false;
    if (q) {
      const hay = `${f.name} ${f.specialty || ''} ${f.type || ''} ${f.grade || ''} ${termLabel(f.term) || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    if (sortKey === 'grade') return a.grade - b.grade || a.name.localeCompare(b.name, 'ar');
    if (sortKey === 'gradeDesc') return b.grade - a.grade || a.name.localeCompare(b.name, 'ar');
    if (sortKey === 'specialty') return (a.specialty || '').localeCompare(b.specialty || '', 'ar') || a.name.localeCompare(b.name, 'ar');
    if (sortKey === 'type') return (a.type || '').localeCompare(b.type || '', 'ar') || a.name.localeCompare(b.name, 'ar');
    if (sortKey === 'nameDesc') return b.name.localeCompare(a.name, 'ar');
    return a.name.localeCompare(b.name, 'ar');
  });

  return list;
}

// ─── Active Filter Chips ───
function renderActiveFilters() {
  const chips = [];
  const addChip = (label, value, clearFn) => {
    if (value) chips.push({ label, value, clear: clearFn });
  };

  addChip('الصف', els.grade.value && gradeLabel(parseInt(els.grade.value)), () => { els.grade.value = ''; render(); });
  addChip('التخصص', els.specialty.value, () => { els.specialty.value = ''; render(); });
  addChip('النوع', els.type.value, () => { els.type.value = ''; render(); });
  addChip('الترم', els.term.value && termLabel(parseInt(els.term.value)), () => { els.term.value = ''; render(); });

  if (state.searchQuery.trim()) {
    chips.push({ label: 'بحث', value: state.searchQuery.trim(), clear: () => { els.search.value = ''; state.searchQuery = ''; render(); } });
  }

  els.activeFilters.innerHTML = chips.map(c => `
    <span class="filter-chip">
      ${escapeHtml(c.label)}: ${escapeHtml(c.value)}
      <button onclick="(${c.clear.toString()})()" aria-label="إزالة الفلتر"><i class="fas fa-times"></i></button>
    </span>
  `).join('');
}

// ─── Render ───
function render() {
  const list = getFilteredFiles();
  els.resultCount.textContent = list.length;
  els.container.innerHTML = '';

  renderActiveFilters();
  saveFilters();

  if (list.length === 0) {
    els.container.style.display = 'none';
    if (els.container.classList.contains('files-list')) {
      els.container.classList.remove('files-list');
      els.container.classList.add('files-grid');
    }
    els.empty.hidden = false;

    const hasAnyFilter = state.searchQuery.trim() || els.grade.value || els.specialty.value || els.type.value || els.term.value;
    if (!hasAnyFilter) {
      els.emptyTitle.textContent = 'مرحباً بك في مركز وحدات الكهرباء';
      els.emptyMessage.textContent = 'استخدم البحث أو الفلاتر أعلاه للعثور على الملفات التي تحتاجها';
      els.btnResetEmpty.style.display = 'none';
    } else {
      els.emptyTitle.textContent = 'لا توجد نتائج مطابقة';
      els.emptyMessage.textContent = 'جرب تغيير معايير البحث أو إزالة بعض الفلاتر';
      els.btnResetEmpty.style.display = 'inline-flex';
    }
    return;
  }

  els.empty.hidden = true;

  if (state.view === 'grid') {
    els.container.className = 'files-grid';
    els.container.style.display = 'grid';

    list.forEach((f, i) => {
      const isSel = state.selectedIds.has(f.id);
      const isFav = state.favorites.has(f.id);
      const card = document.createElement('article');
      card.className = 'file-card' + (isSel ? ' selected' : '');
      card.dataset.id = f.id;
      card.style.animationDelay = `${Math.min(i * 0.04, 0.5)}s`;

      const icon = f.isFolder ? '📁' : typeIcon(f.type);
      const termBadge = f.term ? `<span class="badge">الترم ${termLabel(f.term)}</span>` : '';
      const specialtyBadge = f.specialty ? `<span class="badge">${f.specialty === 'آلات' ? 'آلات كهربية' : f.specialty === 'تركيبات' ? 'تركيبات' : 'صيانة أجهزة'}</span>` : '';
      const typeBadge = f.type ? `<span class="badge ${typeBadgeClass(f.type)}">${f.type === 'معلم' ? 'دليل معلم' : f.type === 'طالب' ? 'دليل طالب' : f.type}</span>` : '';

      card.innerHTML = `
        <input type="checkbox" class="checkbox" ${isSel ? 'checked' : ''} aria-label="تحديد ${escapeHtml(f.name)}">
        <button class="fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}" data-id="${f.id}">
          <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="file-icon">${icon}</div>
        <h3 class="file-title">${escapeHtml(f.name)}</h3>
        <div class="file-meta">
          ${f.grade ? `<span class="badge grade-${f.grade}">الصف ${gradeLabel(f.grade)}</span>` : ''}
          ${specialtyBadge}
          ${typeBadge}
          ${termBadge}
        </div>
        <div class="file-actions">
          <a href="${f.downloadLink}" target="_blank" rel="noopener" class="btn-download">
            <i class="fas fa-download"></i> ${f.isFolder ? 'فتح المجلد' : 'تحميل'}
          </a>
          <a href="${f.folderLink}" target="_blank" rel="noopener" class="btn-view">
            <i class="fas fa-external-link-alt"></i> عرض
          </a>
          <button class="btn-copy" title="نسخ الرابط" data-link="${f.folderLink}">
            <i class="fas fa-link"></i>
          </button>
        </div>
      `;

      // Checkbox
      const cb = card.querySelector('.checkbox');
      cb.addEventListener('change', () => {
        if (cb.checked) state.selectedIds.add(f.id);
        else state.selectedIds.delete(f.id);
        updateSelectionUI();
        card.classList.toggle('selected', cb.checked);
      });

      // Favorite
      const favBtn = card.querySelector('.fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(f.id, favBtn);
      });

      // Copy link
      const copyBtn = card.querySelector('.btn-copy');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(copyBtn.dataset.link, copyBtn);
      });

      // Card click toggles selection
      card.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('button') || e.target === cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });

      els.container.appendChild(card);
    });
  } else {
    // List view
    els.container.className = 'files-list';
    els.container.style.display = 'block';

    const header = document.createElement('div');
    header.className = 'list-header';
    header.innerHTML = `
      <div></div>
      <div>الاسم</div>
      <div>الصف</div>
      <div>التخصص</div>
      <div>النوع</div>
      <div>الترم</div>
      <div>الإجراءات</div>
    `;
    els.container.appendChild(header);

    list.forEach(f => {
      const isSel = state.selectedIds.has(f.id);
      const row = document.createElement('div');
      row.className = 'list-row' + (isSel ? ' selected' : '');
      row.dataset.id = f.id;

      const icon = f.isFolder ? '📁' : typeIcon(f.type);

      row.innerHTML = `
        <input type="checkbox" class="checkbox" ${isSel ? 'checked' : ''} aria-label="تحديد ${escapeHtml(f.name)}">
        <div class="list-name">
          <span class="file-icon">${icon}</span>
          ${escapeHtml(f.name)}
        </div>
        <div class="list-cell">${f.grade ? 'الصف ' + gradeLabel(f.grade) : '-'}</div>
        <div class="list-cell">${f.specialty || '-'}</div>
        <div class="list-cell">${f.type || '-'}</div>
        <div class="list-cell">${f.term ? termLabel(f.term) : '-'}</div>
        <div class="list-actions">
          <a href="${f.downloadLink}" target="_blank" rel="noopener" class="btn-download" style="padding:6px 10px;font-size:0.78rem;">
            <i class="fas fa-download"></i> ${f.isFolder ? 'فتح' : 'تحميل'}
          </a>
          <a href="${f.folderLink}" target="_blank" rel="noopener" class="btn-view" style="padding:6px 10px;font-size:0.78rem;">
            <i class="fas fa-external-link-alt"></i> عرض
          </a>
          <button class="btn-copy" style="padding:6px 10px;font-size:0.78rem;flex:0 0 auto;width:34px;" data-link="${f.folderLink}" title="نسخ الرابط">
            <i class="fas fa-link"></i>
          </button>
        </div>
      `;

      const cb = row.querySelector('.checkbox');
      cb.addEventListener('change', () => {
        if (cb.checked) state.selectedIds.add(f.id);
        else state.selectedIds.delete(f.id);
        updateSelectionUI();
        row.classList.toggle('selected', cb.checked);
      });

      row.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('button') || e.target === cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });

      const copyBtn = row.querySelector('.btn-copy');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(copyBtn.dataset.link, copyBtn);
      });

      els.container.appendChild(row);
    });
  }
}

// ─── Favorites ───
function toggleFavorite(id, btn) {
  const isFav = state.favorites.has(id);
  if (isFav) {
    state.favorites.delete(id);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="far fa-heart"></i>';
    btn.title = 'إضافة للمفضلة';
    toast('تمت الإزالة من المفضلة', 'info', 2000);
  } else {
    state.favorites.add(id);
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-heart"></i>';
    btn.title = 'إزالة من المفضلة';
    toast('تمت الإضافة للمفضلة', 'success', 2000);
  }
  localStorage.setItem('elec_favorites', JSON.stringify([...state.favorites]));
}

// ─── Copy Link ───
async function copyToClipboard(link, btn) {
  try {
    await navigator.clipboard.writeText(link);
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    toast('تم نسخ الرابط!', 'success', 2000);
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fas fa-link"></i>';
    }, 2000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('تم نسخ الرابط!', 'success', 2000);
  }
}

// ─── Selection UI ───
function updateSelectionUI() {
  const count = state.selectedIds.size;
  els.selectedCount.textContent = count;
  els.btnDownload.disabled = count === 0;
}

// ─── Events ───
function onSearch() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    state.searchQuery = els.search.value;
    render();
  }, 200);
}

els.search.addEventListener('input', onSearch);
[els.grade, els.specialty, els.type, els.term, els.sortBy].forEach(el => {
  el.addEventListener('change', () => {
    if (window.innerWidth <= 768 && !els.filterBody.classList.contains('expanded')) {
      els.filterBody.classList.add('expanded');
      els.btnFilterToggle.setAttribute('aria-expanded', 'true');
    }
    render();
  });
});

els.btnSelectAll.addEventListener('click', () => {
  getFilteredFiles().forEach(f => state.selectedIds.add(f.id));
  updateSelectionUI();
  render();
  toast(`تم تحديد ${state.selectedIds.size} ملف`, 'success', 2000);
});

els.btnClear.addEventListener('click', () => {
  const was = state.selectedIds.size;
  state.selectedIds.clear();
  updateSelectionUI();
  render();
  if (was > 0) toast('تم إلغاء التحديد', 'info', 2000);
});

els.btnDownload.addEventListener('click', () => {
  const toDownload = FILES.filter(f => state.selectedIds.has(f.id));
  if (toDownload.length === 0) return;

  toDownload.forEach((f, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = f.downloadLink;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 350);
  });

  toast(`جاري فتح ${toDownload.length} رابط تحميل...`, 'success', 4000);
});

els.btnPrint.addEventListener('click', () => window.print());

els.btnReset.addEventListener('click', resetAll);
els.btnResetEmpty.addEventListener('click', resetAll);

function resetAll() {
  els.search.value = '';
  state.searchQuery = '';
  els.grade.value = '';
  els.specialty.value = '';
  els.type.value = '';
  els.term.value = '';
  els.sortBy.value = 'name';
  state.selectedIds.clear();
  updateSelectionUI();
  saveFilters();
  render();
  toast('تم إعادة ضبط جميع الفلاتر', 'info', 2000);
}

els.themeToggle.addEventListener('click', toggleTheme);

// ─── Filter Toggle (Mobile) ───
function toggleFilters() {
  const expanded = els.filterBody.classList.toggle('expanded');
  els.btnFilterToggle.setAttribute('aria-expanded', expanded);
  if (els.filterChevron) els.filterChevron.style.transform = expanded ? 'rotate(180deg)' : '';
  try { localStorage.setItem('elec_filters_open', expanded ? '1' : '0'); } catch {}
}
els.btnFilterToggle.addEventListener('click', toggleFilters);

// View toggle buttons
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

// ─── Keyboard Shortcuts ───
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    els.search.focus();
    els.search.select();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    window.print();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
    e.preventDefault();
    toggleTheme();
  }
  if (e.key === 'Escape' && document.activeElement === els.search) {
    els.search.value = '';
    state.searchQuery = '';
    render();
    els.search.blur();
  }
});

// ─── Scroll ───
window.addEventListener('scroll', onScroll, { passive: true });

// ─── Init ───
function init() {
  els.statTotalFiles.textContent = FILES.filter(f => !f.isFolder).length;
  if (window.innerWidth <= 768 && localStorage.getItem('elec_filters_open') === '1') {
    els.filterBody.classList.add('expanded');
    els.btnFilterToggle.setAttribute('aria-expanded', 'true');
  }
  applyTheme();
  restoreFilters();
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  render();
  updateSelectionUI();
  toast('مرحباً! استخدم Ctrl+K للبحث السريع', 'info', 4000);
}

init();