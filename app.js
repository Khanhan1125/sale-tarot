/* ============================================================
   APP MODULE — UI Logic & Event Handlers
   ============================================================
   Depends on: Storage (global from storage.js)
   ============================================================ */

(function () {
  'use strict';

  var selectedDate = Storage.getTodayStr();
  var reviewCount = 0;

  // ---- Money Formatter ----
  var moneyFormatter = new Intl.NumberFormat('vi-VN');

  function formatMoney(amount) {
    if (amount == null) return '0';
    return moneyFormatter.format(Math.round(amount));
  }

  // ---- Init ----
  function initApp() {
    renderDaySelector();
    renderAll();
    bindEvents();
    scrollToActiveDay();
  }

  // ---- Render Functions ----

  function renderAll() {
    renderWeeklyStats();
    renderDailyOrders();
  }

  function renderWeeklyStats() {
    var total = Storage.getWeeklyTotal();
    var revenue = Storage.getWeeklyRevenue();
    var count = Storage.getWeeklyOrderCount();

    var salaryEl = document.getElementById('weekly-salary');
    salaryEl.textContent = formatMoney(total) + 'đ';
    salaryEl.classList.remove('pulse');
    void salaryEl.offsetWidth; // force reflow
    salaryEl.classList.add('pulse');

    document.getElementById('weekly-order-count').textContent = count;
    document.getElementById('weekly-revenue').textContent =
      formatMoney(revenue) + 'đ';
  }

  function renderDaySelector() {
    var container = document.getElementById('day-selector');
    var days = Storage.getWeekDays();
    var todayStr = Storage.getTodayStr();

    var html = '';
    for (var i = 0; i < days.length; i++) {
      var day = days[i];
      var classes = 'day-pill';
      if (day.dateStr === selectedDate) classes += ' active';
      if (day.dateStr === todayStr) classes += ' today';

      html +=
        '<button class="' +
        classes +
        '" data-date="' +
        day.dateStr +
        '"' +
        ' aria-label="' +
        day.label +
        ' ' +
        day.dateLabel +
        '">' +
        '<span class="day-name">' +
        day.label +
        '</span>' +
        '<span class="day-date">' +
        day.dateLabel +
        '</span>' +
        '</button>';
    }
    container.innerHTML = html;
  }

  function renderDailyOrders() {
    var orders = Storage.getOrdersByDate(selectedDate);
    var container = document.getElementById('order-list');
    var dailyTotal = Storage.getDailyTotal(selectedDate);

    // Update count badge
    document.getElementById('order-count-badge').textContent = orders.length;

    if (orders.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">📭</div>' +
        '<p class="empty-text">Chưa có đơn hàng nào</p>' +
        '<p class="empty-hint">Nhập số tiền ở trên để thêm đơn</p>' +
        '</div>';
    } else {
      var html = '';
      for (var i = 0; i < orders.length; i++) {
        var order = orders[i];

        // Customer name line (if exists)
        var customerHtml = '';
        if (order.customerName) {
          customerHtml =
            '<span class="order-customer">👤 ' +
            order.customerName +
            '</span>';
        }

        // Review bonus badge (if > 0)
        var bonusBadgeHtml = '';
        if (order.reviewBonus && order.reviewBonus > 0) {
          bonusBadgeHtml =
            ' <span class="bonus-badge">+' +
            formatMoney(order.reviewBonus) +
            'đ</span>';
        }

        html +=
          '<div class="order-item" data-id="' +
          order.id +
          '" style="--delay: ' +
          i * 0.04 +
          's">' +
          '<div class="order-left">' +
          '<span class="order-index">' +
          (i + 1) +
          '</span>' +
          '<div class="order-details">' +
          customerHtml +
          '<span class="order-sale">' +
          formatMoney(order.sale_amount) +
          'đ</span>' +
          '<span class="order-commission">+' +
          formatMoney(order.commission) +
          'đ hoa hồng' +
          bonusBadgeHtml +
          '</span>' +
          '</div>' +
          '</div>' +
          '<button class="btn-delete" data-id="' +
          order.id +
          '" aria-label="Xóa đơn hàng ' +
          (i + 1) +
          '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="3 6 5 6 21 6"></polyline>' +
          '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
          '</svg>' +
          '</button>' +
          '</div>';
      }
      container.innerHTML = html;
    }

    document.getElementById('daily-total-amount').textContent =
      formatMoney(dailyTotal) + 'đ';
  }

  function scrollToActiveDay() {
    var active = document.querySelector('.day-pill.active');
    if (active) {
      active.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }

  // ---- Event Binding ----

  function bindEvents() {
    // Day selector
    document
      .getElementById('day-selector')
      .addEventListener('click', function (e) {
        var pill = e.target.closest('.day-pill');
        if (!pill) return;
        selectedDate = pill.dataset.date;
        renderDaySelector();
        renderDailyOrders();
      });

    // Add order — button click
    document
      .getElementById('btn-add')
      .addEventListener('click', handleAddOrder);

    // Add order — Enter key
    document
      .getElementById('txt-sale-amount')
      .addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddOrder();
        }
      });

    // Live format input with commas as user types
    document
      .getElementById('txt-sale-amount')
      .addEventListener('input', handleInputFormat);

    // Delete order — event delegation
    document
      .getElementById('order-list')
      .addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-delete');
        if (!btn) return;
        handleDeleteOrder(btn.dataset.id);
      });

    // Reset week
    document
      .getElementById('btn-reset')
      .addEventListener('click', handleResetWeek);

    // Review stepper — plus
    document
      .getElementById('btn-review-plus')
      .addEventListener('click', function () {
        reviewCount++;
        updateReviewUI();
      });

    // Review stepper — minus
    document
      .getElementById('btn-review-minus')
      .addEventListener('click', function () {
        if (reviewCount > 0) reviewCount--;
        updateReviewUI();
      });
  }

  function updateReviewUI() {
    document.getElementById('review-count').textContent = reviewCount;
    var bonus = reviewCount * 5000;
    document.getElementById('review-bonus-preview').textContent =
      '+' + formatMoney(bonus) + 'đ';
  }

  // ---- Event Handlers ----

  // ---- Live format input with commas ----

  function handleInputFormat(e) {
    var input = e.target;
    // Get cursor position before formatting
    var cursorPos = input.selectionStart;
    var oldValue = input.value;
    var oldLength = oldValue.length;

    // Strip everything except digits
    var digits = oldValue.replace(/[^0-9]/g, '');

    // Don't format empty string
    if (digits === '') {
      input.value = '';
      return;
    }

    // Format with commas
    var formatted = Number(digits).toLocaleString('en-US');
    input.value = formatted;

    // Adjust cursor position
    var newLength = formatted.length;
    var diff = newLength - oldLength;
    var newCursor = cursorPos + diff;
    if (newCursor < 0) newCursor = 0;
    if (newCursor > newLength) newCursor = newLength;
    input.setSelectionRange(newCursor, newCursor);
  }

  function handleAddOrder() {
    var input = document.getElementById('txt-sale-amount');
    // Strip commas to get raw number
    var rawValue = input.value.replace(/,/g, '').trim();

    if (!rawValue) {
      showToast('⚠️ Vui lòng nhập số tiền!', 'warning');
      input.focus();
      shakeElement(document.getElementById('input-wrapper'));
      return;
    }

    var value = parseFloat(rawValue);

    if (isNaN(value) || value <= 0) {
      showToast('⚠️ Số tiền phải lớn hơn 0!', 'warning');
      input.focus();
      input.select();
      shakeElement(document.getElementById('input-wrapper'));
      return;
    }

    // Get customer name and review count
    var customerName = document.getElementById('txt-customer-name').value.trim();

    // Add to storage (with new fields)
    Storage.addOrder(selectedDate, value, customerName, reviewCount);

    // Reset entire form
    input.value = '';
    document.getElementById('txt-customer-name').value = '';
    reviewCount = 0;
    updateReviewUI();
    input.focus();

    // Refresh UI
    renderAll();

    showToast('✅ Đã thêm đơn ' + formatMoney(value) + 'đ', 'success');
  }

  function handleDeleteOrder(orderId) {
    var item = document.querySelector('.order-item[data-id="' + orderId + '"]');
    if (!item) return;

    // Optimistic UI: animate out first
    item.classList.add('removing');

    setTimeout(function () {
      Storage.deleteOrder(orderId);
      renderAll();
    }, 280);
  }

  function handleResetWeek() {
    if (
      !confirm(
        '⚠️ XÓA TOÀN BỘ dữ liệu tuần này?\n\nHành động này không thể hoàn tác!'
      )
    ) {
      return;
    }

    Storage.resetWeek();
    renderAll();
    showToast('🔄 Đã reset tuần mới!', 'info');
  }

  // ---- Toast ----

  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 2200);
  }

  // ---- Shake animation ----

  function shakeElement(el) {
    if (!el) return;
    el.classList.add('shake');
    el.addEventListener(
      'animationend',
      function () {
        el.classList.remove('shake');
      },
      { once: true }
    );
  }

  // ---- Bootstrap ----
  document.addEventListener('DOMContentLoaded', initApp);
})();
