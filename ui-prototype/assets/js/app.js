/* ==========================================================================
   VIZO ERP — Application Shell + Shared UI Logic
   --------------------------------------------------------------------------
   Single entry point loaded on every authenticated page. Responsibilities:
     1. Render Sidebar + TopBar from VIZO.menu / VIZO.currentUser
     2. Theme toggle (light / dark) with persistence
     3. Sidebar collapse + mobile drawer
     4. Notification & user-menu dropdowns (Alpine.js)
     5. Lucide icon hydration
     6. Helpers: money formatting, toast, modal/drawer open
   ========================================================================== */

(function () {
  'use strict';

  /* ─── Theme ───────────────────────────────────────────────────────── */
  const THEME_KEY = 'vizo-theme';
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }
  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
  }
  // Apply ASAP to avoid flash
  applyTheme(getTheme());

  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    // Re-init icons to pick up dark variants if any
    if (window.lucide) lucide.createIcons();
  }

  /* ─── Sidebar collapse ────────────────────────────────────────────── */
  const SIDEBAR_KEY = 'vizo-sidebar-collapsed';
  function isSidebarCollapsed() {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  }
  function setSidebarCollapsed(v) {
    localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0');
    document.body.classList.toggle('sidebar-collapsed', v);
  }
  function toggleSidebar() {
    setSidebarCollapsed(!isSidebarCollapsed());
  }
  function toggleMobileSidebar() {
    document.getElementById('vizo-sidebar').classList.toggle('hidden-mobile');
    document.getElementById('vizo-mobile-backdrop').classList.toggle('hidden');
  }

  /* ─── Helpers ─────────────────────────────────────────────────────── */
  function fmtMoney(n, opts = {}) {
    const { currency = 'PKR', showSymbol = true, decimals = 0 } = opts;
    const formatter = new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const num = formatter.format(Math.abs(n));
    const sign = n < 0 ? '-' : '';
    return showSymbol ? `${sign}${currency} ${num}` : `${sign}${num}`;
  }
  function fmtNumber(n) { return new Intl.NumberFormat('en-PK').format(n); }

  /* ─── Sidebar Render ──────────────────────────────────────────────── */
  function activeMatch(currentMatch, target) {
    if (!currentMatch || !target) return false;
    return currentMatch === target || currentMatch.startsWith(target + '.');
  }

  function renderSidebar(activeMatchKey) {
    const items = VIZO.menu.map((node) => {
      if (node.type === 'section') {
        return `<div class="nav-section">${node.label}</div>`;
      }
      if (node.type === 'item') {
        const isActive = activeMatch(activeMatchKey, node.match);
        const badge = node.badge
          ? `<span class="badge badge-${node.badge.variant} ml-auto nav-label">${node.badge.text}</span>`
          : '';
        return `
          <a href="${node.href}" class="nav-item ${isActive ? 'active' : ''}" data-match="${node.match}">
            <i data-lucide="${node.icon}" class="icon-md"></i>
            <span class="nav-label">${node.label}</span>
            ${badge}
          </a>`;
      }
      if (node.type === 'group') {
        const isOpen = node.children.some((c) => activeMatch(activeMatchKey, c.match));
        const childrenHTML = node.children.map((c) => {
          const isActive = activeMatch(activeMatchKey, c.match);
          const badge = c.badge
            ? `<span class="badge badge-${c.badge.variant} ml-auto">${c.badge.text}</span>`
            : '';
          return `
            <a href="${c.href}" class="nav-subitem ${isActive ? 'active' : ''}">
              <span>${c.label}</span>
              ${badge}
            </a>`;
        }).join('');

        return `
          <div x-data="{ open: ${isOpen} }">
            <button type="button"
                    @click="open = !open"
                    class="nav-item w-full ${isOpen ? '' : ''}">
              <i data-lucide="${node.icon}" class="icon-md"></i>
              <span class="nav-label flex-1 text-left">${node.label}</span>
              <span class="nav-chevron inline-flex transition-transform duration-200"
                    :class="open ? 'rotate-180' : ''">
                <i data-lucide="chevron-down" class="icon-sm"></i>
              </span>
            </button>
            <div x-show="open" x-collapse class="mt-0.5 space-y-0.5">
              ${childrenHTML}
            </div>
          </div>`;
      }
      return '';
    }).join('');

    return `
      <aside id="vizo-sidebar"
             class="sidebar fixed lg:sticky inset-y-0 left-0 z-30 w-64 bg-white dark:bg-navy-950 border-r border-slate-200 dark:border-navy-800 flex flex-col h-screen transition-transform lg:translate-x-0">
        <!-- Brand -->
        <div class="h-16 flex items-center gap-3 px-4 border-b border-slate-200 dark:border-navy-800 flex-shrink-0">
          <img src="../assets/images/vizo-logo.png" alt="VIZO" class="h-8 w-8 rounded-md object-cover dark:hidden" />
          <img src="../assets/images/vizo-logo-dark.jpg" alt="VIZO" class="h-8 w-8 rounded-md object-cover hidden dark:block" />
          <div class="sidebar-brand-text">
            <div class="text-sm font-bold text-navy-900 dark:text-white leading-tight">VIZO ERP</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 leading-tight">Sales · Inventory · Accounting</div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
          ${items}
        </nav>

        <!-- Footer: collapse + version -->
        <div class="px-3 py-3 border-t border-slate-200 dark:border-navy-800 flex items-center justify-between flex-shrink-0">
          <div class="text-2xs text-slate-400 dark:text-slate-500 nav-label">v2.0 · Build 2026.05</div>
          <button type="button" id="vizo-sidebar-toggle"
                  class="btn btn-ghost btn-icon" title="Collapse sidebar">
            <i data-lucide="panel-left-close" class="icon-md"></i>
          </button>
        </div>
      </aside>

      <!-- Mobile backdrop -->
      <div id="vizo-mobile-backdrop"
           class="hidden lg:hidden fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-20"
           onclick="VIZO.toggleMobileSidebar()"></div>
    `;
  }

  /* ─── TopBar Render ───────────────────────────────────────────────── */
  function renderTopBar({ pageTitle = '', breadcrumbs = [] } = {}) {
    const user = VIZO.currentUser;
    const branch = VIZO.branches.find((b) => b.id === user.branchId);
    const unreadCount = VIZO.notifications.filter((n) => n.unread).length;

    const branchOptions = VIZO.branches.map((b) =>
      `<a href="#" class="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-800 ${b.id === user.branchId ? 'text-brand-yellow font-semibold' : 'text-slate-700 dark:text-slate-200'}">
         <div class="flex items-center justify-between">
           <span>${b.name}</span>
           ${b.id === user.branchId ? '<i data-lucide="check" class="icon-sm"></i>' : ''}
         </div>
         <div class="text-xs text-slate-500 dark:text-slate-400">${b.city}</div>
       </a>`
    ).join('');

    const quickCreateItems = VIZO.quickCreate.map((qc) =>
      `<a href="${qc.href}" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200">
         <i data-lucide="${qc.icon}" class="icon-md text-slate-400"></i>
         <span class="flex-1">${qc.label}</span>
         <kbd class="text-2xs px-1.5 py-0.5 bg-slate-100 dark:bg-navy-700 rounded font-mono text-slate-500 dark:text-slate-400">⌘${qc.shortcut}</kbd>
       </a>`
    ).join('');

    const notificationItems = VIZO.notifications.slice(0, 5).map((n) => {
      const colorMap = {
        success: 'text-success bg-success/10',
        warning: 'text-warning bg-warning/10',
        danger:  'text-danger  bg-danger/10',
        info:    'text-info    bg-info/10',
      };
      return `
        <div class="flex gap-3 p-3 hover:bg-slate-50 dark:hover:bg-navy-800 cursor-pointer ${n.unread ? 'bg-brand-yellow/5' : ''}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[n.type]}">
            <i data-lucide="${n.icon}" class="icon-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-navy-900 dark:text-white truncate">${n.title}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${n.body}</div>
            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">${n.time}</div>
          </div>
          ${n.unread ? '<span class="w-2 h-2 rounded-full bg-brand-yellow flex-shrink-0 mt-2"></span>' : ''}
        </div>`;
    }).join('');

    const breadcrumbHTML = breadcrumbs.length > 0
      ? `<nav class="breadcrumb">
           ${breadcrumbs.map((b, i) => {
             const isLast = i === breadcrumbs.length - 1;
             return isLast
               ? `<span class="text-navy-900 dark:text-white font-medium">${b.label}</span>`
               : `<a href="${b.href || '#'}" class="hover:text-navy-900 dark:hover:text-white">${b.label}</a><i data-lucide="chevron-right" class="icon-xs text-slate-300"></i>`;
           }).join('')}
         </nav>`
      : '';

    return `
      <header class="topbar sticky top-0 z-20 h-16 bg-white dark:bg-navy-950 border-b border-slate-200 dark:border-navy-800 flex items-center px-4 gap-3 flex-shrink-0">
        <!-- Mobile menu button -->
        <button type="button" onclick="VIZO.toggleMobileSidebar()"
                class="btn btn-ghost btn-icon lg:hidden">
          <i data-lucide="menu" class="icon-lg"></i>
        </button>

        <!-- Branch switcher -->
        <div x-data="{ open: false }" class="relative">
          <button type="button" @click="open = !open"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
            <i data-lucide="building-2" class="icon-sm text-brand-yellow"></i>
            <div class="text-left">
              <div class="text-2xs text-slate-500 dark:text-slate-400 leading-none">Branch</div>
              <div class="text-sm font-semibold text-navy-900 dark:text-white leading-tight">${branch?.name || 'Select'}</div>
            </div>
            <i data-lucide="chevron-down" class="icon-xs text-slate-400"></i>
          </button>
          <div x-show="open" @click.outside="open = false" x-transition
               class="absolute top-full mt-1 left-0 w-64 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg shadow-elevated py-1 z-50">
            <div class="px-3 py-2 text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wide">Switch Branch</div>
            ${branchOptions}
          </div>
        </div>

        <!-- Search -->
        <div class="hidden md:flex flex-1 max-w-md mx-4 relative">
          <i data-lucide="search" class="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
          <input type="text"
                 placeholder="Search anything…  (or press ⌘K)"
                 class="input pl-9 pr-16 bg-slate-50 dark:bg-navy-900 border-transparent focus:bg-white dark:focus:bg-navy-800" />
          <kbd class="hidden lg:flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-2xs bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded font-mono text-slate-500 dark:text-slate-400">⌘K</kbd>
        </div>

        <div class="flex-1 lg:hidden"></div>

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <!-- Quick Create -->
          <div x-data="{ open: false }" class="relative">
            <button type="button" @click="open = !open"
                    class="btn btn-accent btn-sm gap-1.5 hidden sm:inline-flex">
              <i data-lucide="plus" class="icon-sm"></i>
              <span>Create</span>
            </button>
            <button type="button" @click="open = !open"
                    class="btn btn-icon sm:hidden text-brand-yellow">
              <i data-lucide="plus" class="icon-lg"></i>
            </button>
            <div x-show="open" @click.outside="open = false" x-transition
                 class="absolute top-full mt-1 right-0 w-64 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg shadow-elevated py-1 z-50">
              <div class="px-3 py-2 text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wide">Quick Create</div>
              ${quickCreateItems}
            </div>
          </div>

          <!-- AI Assistant -->
          <button type="button" onclick="VIZO.openAIDrawer()"
                  class="btn btn-ghost btn-icon relative" title="AI Assistant">
            <i data-lucide="sparkles" class="icon-lg text-brand-yellow"></i>
          </button>

          <!-- Notifications -->
          <div x-data="{ open: false }" class="relative">
            <button type="button" @click="open = !open"
                    class="btn btn-ghost btn-icon relative" title="Notifications">
              <i data-lucide="bell" class="icon-lg"></i>
              ${unreadCount > 0 ? `<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white dark:ring-navy-950"></span>` : ''}
            </button>
            <div x-show="open" @click.outside="open = false" x-transition
                 class="absolute top-full mt-1 right-0 w-96 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg shadow-elevated z-50 overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-200 dark:border-navy-800 flex items-center justify-between">
                <div class="text-sm font-semibold text-navy-900 dark:text-white">Notifications</div>
                <button class="text-xs text-brand-yellow hover:underline font-medium">Mark all read</button>
              </div>
              <div class="max-h-96 overflow-y-auto scrollbar-thin">
                ${notificationItems}
              </div>
              <a href="#" class="block px-4 py-3 text-sm text-center text-brand-yellow hover:bg-slate-50 dark:hover:bg-navy-800 font-medium border-t border-slate-200 dark:border-navy-800">View all notifications</a>
            </div>
          </div>

          <!-- Theme toggle -->
          <button type="button" onclick="VIZO.toggleTheme()"
                  class="btn btn-ghost btn-icon" title="Toggle theme">
            <i data-lucide="moon" class="icon-lg dark:hidden"></i>
            <i data-lucide="sun" class="icon-lg hidden dark:block"></i>
          </button>

          <!-- User menu -->
          <div x-data="{ open: false }" class="relative ml-1">
            <button type="button" @click="open = !open"
                    class="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
              <div class="avatar avatar-md">${user.initials}</div>
              <div class="hidden md:block text-left">
                <div class="text-sm font-semibold text-navy-900 dark:text-white leading-none">${user.fullName}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">${user.role}</div>
              </div>
              <i data-lucide="chevron-down" class="icon-xs text-slate-400 hidden md:block"></i>
            </button>
            <div x-show="open" @click.outside="open = false" x-transition
                 class="absolute top-full mt-1 right-0 w-56 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-lg shadow-elevated py-1 z-50">
              <div class="px-3 py-3 border-b border-slate-200 dark:border-navy-800">
                <div class="text-sm font-semibold text-navy-900 dark:text-white">${user.fullName}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${user.email}</div>
              </div>
              <a href="/profile" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200">
                <i data-lucide="user" class="icon-sm text-slate-400"></i> My Profile
              </a>
              <a href="/profile/preferences" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200">
                <i data-lucide="settings" class="icon-sm text-slate-400"></i> Preferences
              </a>
              <a href="/profile/security" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200">
                <i data-lucide="lock" class="icon-sm text-slate-400"></i> Security
              </a>
              <div class="border-t border-slate-200 dark:border-navy-800 my-1"></div>
              <a href="../index.html" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-danger/10 text-danger">
                <i data-lucide="log-out" class="icon-sm"></i> Sign out
              </a>
            </div>
          </div>
        </div>
      </header>

      ${(pageTitle || breadcrumbs.length) ? `
      <div class="px-6 pt-6 pb-2 bg-slate-50 dark:bg-navy-900">
        ${breadcrumbHTML}
      </div>
      ` : ''}
    `;
  }

  /* ─── AI Drawer (placeholder) ─────────────────────────────────────── */
  function openAIDrawer() {
    let drawer = document.getElementById('vizo-ai-drawer');
    if (drawer) { drawer.classList.remove('hidden'); return; }
    drawer = document.createElement('div');
    drawer.id = 'vizo-ai-drawer';
    drawer.innerHTML = `
      <div class="backdrop" onclick="document.getElementById('vizo-ai-drawer').classList.add('hidden')"></div>
      <aside class="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-white dark:bg-navy-950 border-l border-slate-200 dark:border-navy-800 z-50 flex flex-col animate-slide-in-right">
        <header class="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-navy-800 flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center">
              <i data-lucide="sparkles" class="icon-md text-brand-yellow"></i>
            </div>
            <div>
              <div class="text-sm font-semibold text-navy-900 dark:text-white">AI Assistant</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Ask anything about your business</div>
            </div>
          </div>
          <button onclick="document.getElementById('vizo-ai-drawer').classList.add('hidden')"
                  class="btn btn-ghost btn-icon">
            <i data-lucide="x" class="icon-lg"></i>
          </button>
        </header>
        <div class="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <div class="text-center py-8">
            <div class="w-14 h-14 rounded-2xl bg-brand-yellow/10 flex items-center justify-center mx-auto mb-3">
              <i data-lucide="sparkles" class="icon-xl text-brand-yellow"></i>
            </div>
            <h3 class="text-base font-semibold text-navy-900 dark:text-white">How can I help?</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Try one of these suggestions:</p>
          </div>
          <div class="space-y-2">
            ${[
              "Which product sold most last month?",
              "Show me overdue invoices in Karachi",
              "Summarise this month's P&L",
              "Who should I call for collections today?",
              "Why did COGS spike in March?",
            ].map((q) => `
              <button class="w-full text-left p-3 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-navy-800 hover:bg-brand-yellow/10 hover:text-navy-900 dark:hover:text-white rounded-lg transition-colors border border-transparent hover:border-brand-yellow/30">
                ${q}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="p-4 border-t border-slate-200 dark:border-navy-800 flex-shrink-0">
          <div class="relative">
            <input type="text" placeholder="Ask the AI assistant…"
                   class="input pr-12 bg-slate-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-800" />
            <button class="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-accent btn-icon" style="height:1.875rem;width:1.875rem;">
              <i data-lucide="send-horizonal" class="icon-sm"></i>
            </button>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(drawer);
    if (window.lucide) lucide.createIcons();
  }

  /* ─── Init ────────────────────────────────────────────────────────── */
  function initShell({ activeMatch: am = '', pageTitle = '', breadcrumbs = [] } = {}) {
    const root = document.getElementById('app-root');
    if (!root) return;

    const pageHTML = root.innerHTML; // page-specific content
    root.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-navy-900 flex">
        ${renderSidebar(am)}
        <div class="flex-1 flex flex-col min-w-0 lg:ml-0">
          ${renderTopBar({ pageTitle, breadcrumbs })}
          <main class="flex-1 overflow-y-auto">
            <div class="p-6 max-w-[1600px] mx-auto w-full">
              ${pageHTML}
            </div>
          </main>
        </div>
      </div>
    `;

    // Apply persisted sidebar state
    if (isSidebarCollapsed()) document.body.classList.add('sidebar-collapsed');

    // Wire collapse button
    const collapseBtn = document.getElementById('vizo-sidebar-toggle');
    if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);

    // Cmd+K → search focus (placeholder for command palette)
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const search = document.querySelector('header.topbar input[type="text"]');
        if (search) search.focus();
      }
    });

    // Hydrate Lucide icons
    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 0);
  }

  /* ─── Toast helper (used by demo buttons) ─────────────────────────── */
  function toast(msg, type = 'success') {
    const colors = {
      success: 'bg-success text-white',
      error:   'bg-danger text-white',
      info:    'bg-info text-white',
      warn:    'bg-warning text-white',
    };
    const el = document.createElement('div');
    el.className = `fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-elevated ${colors[type]} animate-slide-in-right text-sm font-medium`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 200ms';
      setTimeout(() => el.remove(), 250);
    }, 3000);
  }

  /* ─── Public API ──────────────────────────────────────────────────── */
  window.VIZO = Object.assign(window.VIZO || {}, {
    initShell,
    toggleTheme,
    toggleSidebar,
    toggleMobileSidebar,
    openAIDrawer,
    fmtMoney,
    fmtNumber,
    toast,
  });
})();
