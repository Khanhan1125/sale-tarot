/* ============================================================
   STORAGE MODULE — Firebase Firestore for orders
   ============================================================ */

var Storage = (function () {
  'use strict';

  var COMMISSION_RATE = 0.25;
  var REVIEW_BONUS_PER = 5000;

  // Cấu hình Firebase thực tế của Khánh An
  const firebaseConfig = {
    apiKey: "AIzaSyDrvTLfvRetZoDOlr-Icx-fTNXMmjEXR_Y",
    authDomain: "sale-tarot-shared.firebaseapp.com",
    projectId: "sale-tarot-shared",
    storageBucket: "sale-tarot-shared.firebasestorage.app",
    messagingSenderId: "279667166075",
    appId: "1:279667166075:web:086da8f1fff9983a8e8bde"
  };

  // Khởi tạo Firebase Đám mây
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  var cachedOrders = [];
  var onDataChangedCallback = null;
  var isLoaded = false;

  // Lắng nghe dữ liệu realtime từ Firestore
  db.collection('orders').orderBy('createdAt', 'asc').onSnapshot(function(snapshot) {
    var newOrders = [];
    snapshot.forEach(function(doc) {
      var data = doc.data();
      data.id = doc.id;
      newOrders.push(data);
    });
    cachedOrders = newOrders;
    isLoaded = true;
    if (onDataChangedCallback) {
      onDataChangedCallback();
    }
  });

  function setOnDataChanged(cb) {
    onDataChangedCallback = cb;
    // Kích hoạt ngay nếu dữ liệu đã tải xong trước khi gắn callback
    if (isLoaded && cb) {
      cb();
    }
  }

  // ---- Helpers ----

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

  function getWeekRange(offset) {
    offset = offset || 0;
    var today = new Date();
    var dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    var monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (offset * 7));

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      monday: formatDate(monday),
      sunday: formatDate(sunday),
    };
  }

  function getWeekDays(offset) {
    var range = getWeekRange(offset);
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

  // ---- Internal Data Accessors ----

  function getAllOrders() {
    return cachedOrders;
  }

  // ---- CRUD ----

  function getOrdersByDate(dateStr) {
    return getAllOrders().filter(function (o) {
      return o.date === dateStr;
    });
  }

  function addOrder(dateStr, saleAmount, customerName, reviewCount) {
    customerName = customerName || '';
    reviewCount = reviewCount || 0;
    var reviewBonus = Math.round(reviewCount * REVIEW_BONUS_PER);
    var baseCommission = Math.round(saleAmount * COMMISSION_RATE);
    var newOrder = {
      date: dateStr,
      sale_amount: saleAmount,
      commission: baseCommission + reviewBonus,
      customerName: customerName,
      reviewBonus: reviewBonus,
      createdAt: Date.now()
    };
    
    // Trả về promise để xử lý UI
    return db.collection('orders').add(newOrder);
  }

  function deleteOrder(orderId) {
    return db.collection('orders').doc(orderId).delete();
  }

  function updateOrder(orderId, saleAmount, customerName, reviewCount) {
    customerName = customerName || '';
    reviewCount = reviewCount || 0;
    var reviewBonus = Math.round(reviewCount * REVIEW_BONUS_PER);
    var baseCommission = Math.round(saleAmount * COMMISSION_RATE);
    var updatedData = {
      sale_amount: saleAmount,
      commission: baseCommission + reviewBonus,
      customerName: customerName,
      reviewBonus: reviewBonus
    };
    
    return db.collection('orders').doc(orderId).update(updatedData);
  }

  // ---- Aggregations ----

  function getDailyTotal(dateStr) {
    return getOrdersByDate(dateStr).reduce(function (sum, o) {
      return sum + o.commission;
    }, 0);
  }

  function getWeeklyTotal(offset) {
    var range = getWeekRange(offset);
    var orders = getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    });
    return orders.reduce(function (sum, o) {
      return sum + o.commission;
    }, 0);
  }

  function getWeeklyRevenue(offset) {
    var range = getWeekRange(offset);
    var orders = getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    });
    return orders.reduce(function (sum, o) {
      return sum + o.sale_amount;
    }, 0);
  }

  function getWeeklyOrderCount(offset) {
    var range = getWeekRange(offset);
    return getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    }).length;
  }

  function resetWeek(offset) {
    var range = getWeekRange(offset);
    var ordersToDelete = getAllOrders().filter(function (o) {
      return o.date >= range.monday && o.date <= range.sunday;
    });
    
    var batch = db.batch();
    ordersToDelete.forEach(function(o) {
      batch.delete(db.collection('orders').doc(o.id));
    });
    return batch.commit();
  }

  function cleanupOldData() {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    var cutoffStr = formatDate(cutoff);
    var ordersToDelete = getAllOrders().filter(function (o) {
      return o.date < cutoffStr;
    });
    
    if (ordersToDelete.length > 0) {
      var batch = db.batch();
      ordersToDelete.forEach(function(o) {
        batch.delete(db.collection('orders').doc(o.id));
      });
      batch.commit();
    }
  }

  // ---- Public API ----
  return {
    setOnDataChanged: setOnDataChanged,
    getTodayStr: getTodayStr,
    getWeekDays: getWeekDays,
    getWeekRange: getWeekRange,
    getOrdersByDate: getOrdersByDate,
    addOrder: addOrder,
    updateOrder: updateOrder,
    deleteOrder: deleteOrder,
    getDailyTotal: getDailyTotal,
    getWeeklyTotal: getWeeklyTotal,
    getWeeklyRevenue: getWeeklyRevenue,
    getWeeklyOrderCount: getWeeklyOrderCount,
    resetWeek: resetWeek,
    cleanupOldData: cleanupOldData,
  };
})();
