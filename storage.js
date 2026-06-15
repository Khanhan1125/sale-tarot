/* ============================================================
   STORAGE MODULE — localStorage CRUD for orders
   ============================================================
   Data format in localStorage (key: 'salary_tracker_orders'):
   [
     {
       id: "k7x3m9...",         // unique ID
       date: "2026-06-15",      // ISO date string
       sale_amount: 500000,     // original order amount
       commission: 150000,      // total = (sale*0.25) + reviewBonus
       customerName: "Ngọc",    // optional customer name
       reviewBonus: 25000       // review count * 5000
     },
     ...
   ]
   ============================================================ */

var Storage = (function () {
  'use strict';

  var STORAGE_KEY = 'salary_tracker_orders';
  var COMMISSION_RATE = 0.25;
  var REVIEW_BONUS_PER = 5000;

  // ---- Helpers ----

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  function getAllOrders() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveAllOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }

  function formatDate(d) {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function getTodayStr() {
    return formatDate(new Date());
  }

  // ---- Week Calculation ----

  function getCurrentWeekRange() {
    var today = new Date();
    var dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    var monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      monday: formatDate(monday),
      sunday: formatDate(sunday),
    };
  }

  function getWeekDays() {
    var range = getCurrentWeekRange();
    var parts = range.monday.split('-');
    var mondayDate = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
    var dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      days.push({
        label: dayNames[i],
        dateLabel: d.getDate() + '/' + (d.getMonth() + 1),
        dateStr: formatDate(d),
      });
    }
    return days;
  }

  // ---- CRUD ----

  function getOrdersByDate(dateStr) {
    return getAllOrders().filter(function (o) {
      return o.date === dateStr;
    });
  }

  function addOrder(dateStr, saleAmount, customerName, reviewCount) {
    var orders = getAllOrders();
    customerName = customerName || '';
    reviewCount = reviewCount || 0;
    var reviewBonus = Math.round(reviewCount * REVIEW_BONUS_PER);
    var baseCommission = Math.round(saleAmount * COMMISSION_RATE);
    var newOrder = {
      id: generateId(),
      date: dateStr,
      sale_amount: saleAmount,
      commission: baseCommission + reviewBonus,
      customerName: customerName,
      reviewBonus: reviewBonus,
    };
    orders.push(newOrder);
    saveAllOrders(orders);
    return newOrder;
  }

  function deleteOrder(orderId) {
    var orders = getAllOrders().filter(function (o) {
      return o.id !== orderId;
    });
    saveAllOrders(orders);
  }

  // ---- Aggregations ----

  function getDailyTotal(dateStr) {
    return getOrdersByDate(dateStr).reduce(function (sum, o) {
      return sum + o.commission;
    }, 0);
  }

  function getWeeklyTotal() {
    var range = getCurrentWeekRange();
    var orders = getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    });
    return orders.reduce(function (sum, o) {
      return sum + o.commission;
    }, 0);
  }

  function getWeeklyRevenue() {
    var range = getCurrentWeekRange();
    var orders = getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    });
    return orders.reduce(function (sum, o) {
      return sum + o.sale_amount;
    }, 0);
  }

  function getWeeklyOrderCount() {
    var range = getCurrentWeekRange();
    return getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    }).length;
  }

  function resetWeek() {
    var range = getCurrentWeekRange();
    var orders = getAllOrders().filter(function (o) {
      return o.date < range.monday || o.date > range.sunday;
    });
    saveAllOrders(orders);
  }

  // ---- Public API ----
  return {
    getTodayStr: getTodayStr,
    getWeekDays: getWeekDays,
    getOrdersByDate: getOrdersByDate,
    addOrder: addOrder,
    deleteOrder: deleteOrder,
    getDailyTotal: getDailyTotal,
    getWeeklyTotal: getWeeklyTotal,
    getWeeklyRevenue: getWeeklyRevenue,
    getWeeklyOrderCount: getWeeklyOrderCount,
    resetWeek: resetWeek,
  };
})();
