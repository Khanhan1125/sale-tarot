/* ============================================================
   APP MODULE — UI Logic & Event Handlers
   ============================================================
   Depends on: Storage (global from storage.js)
   ============================================================ */

(function () {
  'use strict';

  var selectedDate = Storage.getTodayStr();
  var reviewCount = 0;
  var weekOffset = 0; // 0 = tuần này, -1 = tuần trước
  var editingOrderId = null;
  var editReviewCount = 0;

  // ---- Money Formatter ----
  var moneyFormatter = new Intl.NumberFormat('vi-VN');

  function formatMoney(amount) {
    if (amount == null) return '0';
    return moneyFormatter.format(Math.round(amount));
  }

  // ---- Init ----
  function initApp() {
    renderDaySelector();
    updateWeekNavUI();
    bindEvents();

    // Firebase real-time listener callback
    Storage.setOnDataChanged(function() {
      renderAll();
      scrollToActiveDay();
      Storage.cleanupOldData(); // Dọn dẹp dữ liệu cũ
    });
  }

  // ---- Render Functions ----

  function renderAll() {
    renderWeeklyStats();
    renderDailyOrders();
  }

  function renderWeeklyStats() {
    var total = Storage.getWeeklyTotal(weekOffset);
    var revenue = Storage.getWeeklyRevenue(weekOffset);
    var count = Storage.getWeeklyOrderCount(weekOffset);

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
    var days = Storage.getWeekDays(weekOffset);
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
          '<div class="order-actions">' +
          '<button class="btn-edit" data-id="' +
          order.id +
          '" aria-label="Sửa đơn hàng ' +
          (i + 1) +
          '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
          '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
          '</svg>' +
          '</button>' +
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
          '</div>' +
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

    // Edit / Delete order — event delegation
    document
      .getElementById('order-list')
      .addEventListener('click', function (e) {
        var btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
          handleDeleteOrder(btnDelete.dataset.id);
          return;
        }
        var btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
          openEditModal(btnEdit.dataset.id);
        }
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

    // Edit Modal events
    document.getElementById('btn-edit-cancel').addEventListener('click', closeEditModal);
    document.getElementById('btn-edit-save').addEventListener('click', handleSaveEdit);
    document.getElementById('edit-sale-amount').addEventListener('input', handleInputFormat);
    
    document.getElementById('btn-edit-review-plus').addEventListener('click', function() {
      editReviewCount++;
      document.getElementById('edit-review-count').textContent = editReviewCount;
    });
    
    document.getElementById('btn-edit-review-minus').addEventListener('click', function() {
      if (editReviewCount > 0) editReviewCount--;
      document.getElementById('edit-review-count').textContent = editReviewCount;
    });

    // Week navigation
    document
      .getElementById('btn-week-prev')
      .addEventListener('click', function () {
        handleWeekNav(-1);
      });
    document
      .getElementById('btn-week-next')
      .addEventListener('click', function () {
        handleWeekNav(0);
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
    Storage.addOrder(selectedDate, value, customerName, reviewCount)
      .then(function() {
        showToast('✅ Đã thêm đơn ' + formatMoney(value) + 'đ', 'success');
      })
      .catch(function(err) {
        showToast('❌ Lỗi thêm đơn: ' + err.message, 'error');
      });

    // Reset entire form immediately for fast entry
    input.value = '';
    document.getElementById('txt-customer-name').value = '';
    reviewCount = 0;
    updateReviewUI();
    input.focus();
  }

  function handleDeleteOrder(orderId) {
    var item = document.querySelector('.order-item[data-id="' + orderId + '"]');
    if (!item) return;

    // Optimistic UI: animate out first
    item.classList.add('removing');

    setTimeout(function () {
      Storage.deleteOrder(orderId).catch(function(err) {
        showToast('❌ Lỗi xóa đơn: ' + err.message, 'error');
        renderAll(); // Phục hồi UI nếu lỗi
      });
    }, 280);
  }

  // ---- Edit Modal Functions ----

  function openEditModal(orderId) {
    var orders = Storage.getAllOrders();
    var order = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].id === orderId) {
        order = orders[i];
        break;
      }
    }
    if (!order) return;

    editingOrderId = orderId;
    
    // Populate form
    var inputSale = document.getElementById('edit-sale-amount');
    inputSale.value = formatMoney(order.sale_amount);
    document.getElementById('edit-customer-name').value = order.customerName || '';
    
    // Review count backward calculation (reviewBonus = count * 5000)
    editReviewCount = (order.reviewBonus || 0) / 5000;
    document.getElementById('edit-review-count').textContent = editReviewCount;

    var modal = document.getElementById('edit-modal');
    modal.classList.add('show');
    inputSale.focus();
  }

  function closeEditModal() {
    var modal = document.getElementById('edit-modal');
    modal.classList.remove('show');
    editingOrderId = null;
  }

  function handleSaveEdit() {
    if (!editingOrderId) return;

    var input = document.getElementById('edit-sale-amount');
    var rawValue = input.value.replace(/,/g, '').trim();

    if (!rawValue) {
      showToast('⚠️ Vui lòng nhập số tiền!', 'warning');
      input.focus();
      shakeElement(document.getElementById('edit-modal').querySelector('.modal-content'));
      return;
    }

    var value = parseFloat(rawValue);
    if (isNaN(value) || value <= 0) {
      showToast('⚠️ Số tiền phải lớn hơn 0!', 'warning');
      input.focus();
      input.select();
      shakeElement(document.getElementById('edit-modal').querySelector('.modal-content'));
      return;
    }

    var customerName = document.getElementById('edit-customer-name').value.trim();
    var btnSave = document.getElementById('btn-edit-save');
    btnSave.disabled = true;

    Storage.updateOrder(editingOrderId, value, customerName, editReviewCount)
      .then(function() {
        showToast('✅ Đã cập nhật đơn hàng!', 'success');
        closeEditModal();
      })
      .catch(function(err) {
        showToast('❌ Lỗi cập nhật: ' + err.message, 'error');
      })
      .finally(function() {
        btnSave.disabled = false;
      });
  }

  function handleResetWeek() {
    var label = weekOffset === 0 ? 'tuần này' : 'tuần trước';
    if (
      !confirm(
        '⚠️ XÓA TOÀN BỘ dữ liệu ' + label + '?\n\nHành động này không thể hoàn tác!'
      )
    ) {
      return;
    }

    Storage.resetWeek(weekOffset).then(function() {
      showToast('🔄 Đã reset ' + label + '!', 'info');
    }).catch(function(err) {
      showToast('❌ Lỗi reset: ' + err.message, 'error');
    });
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

  // ---- Week Navigation ----

  function handleWeekNav(newOffset) {
    // Giới hạn: chỉ 0 (tuần này) hoặc -1 (tuần trước)
    if (newOffset < -1 || newOffset > 0) return;
    weekOffset = newOffset;

    // Auto-chọn ngày đầu tuần nếu chuyển sang tuần khác
    var days = Storage.getWeekDays(weekOffset);
    var todayStr = Storage.getTodayStr();

    // Nếu tuần hiện tại → chọn ngày hôm nay
    // Nếu tuần trước → chọn thứ Hai của tuần đó
    if (weekOffset === 0) {
      selectedDate = todayStr;
    } else {
      selectedDate = days[0].dateStr; // Thứ Hai tuần trước
    }

    renderDaySelector();
    renderAll();
    updateWeekNavUI();
    scrollToActiveDay();
  }

  function updateWeekNavUI() {
    var btnPrev = document.getElementById('btn-week-prev');
    var btnNext = document.getElementById('btn-week-next');
    var label = document.getElementById('week-nav-label');
    var inputSection = document.querySelector('.input-section');

    // Cập nhật label
    if (weekOffset === 0) {
      var range = Storage.getWeekRange(0);
      label.textContent = '📅 Tuần này';
      label.classList.remove('week-nav-label--past');
    } else {
      var range = Storage.getWeekRange(-1);
      label.textContent = '📅 Tuần trước';
      label.classList.add('week-nav-label--past');
    }

    // Hiển thị khoảng ngày
    var mondayParts = range.monday.split('-');
    var sundayParts = range.sunday.split('-');
    var dateRange = mondayParts[2] + '/' + mondayParts[1] +
      ' – ' + sundayParts[2] + '/' + sundayParts[1];
    label.innerHTML = (weekOffset === 0 ? '📅 Tuần này' : '📅 Tuần trước') +
      ' <span class="week-nav-date-range">' + dateRange + '</span>';

    // Enable/disable buttons
    btnPrev.disabled = (weekOffset <= -1);
    btnNext.disabled = (weekOffset >= 0);

    // Ẩn input section khi xem tuần trước (không cho thêm đơn vào tuần cũ)
    if (inputSection) {
      inputSection.style.display = (weekOffset === 0) ? '' : 'none';
    }
  }

  // ---- Bootstrap ----
  document.addEventListener('DOMContentLoaded', initApp);
})();
