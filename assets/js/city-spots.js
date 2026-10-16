(function () {
  var cityCatalog = {
    beijing: { label: "北京", searchCity: "北京", center: [116.407394, 39.904211] },
    shanghai: { label: "上海", searchCity: "上海", center: [121.473701, 31.230416] },
    guangzhou: { label: "广州", searchCity: "广州", center: [113.264385, 23.129112] },
    shenzhen: { label: "深圳", searchCity: "深圳", center: [114.057868, 22.543099] },
    hangzhou: { label: "杭州", searchCity: "杭州", center: [120.15507, 30.274084] },
    chengdu: { label: "成都", searchCity: "成都", center: [104.066541, 30.572269] },
    nanjing: { label: "南京", searchCity: "南京", center: [118.796877, 32.060255] },
    wuhan: { label: "武汉", searchCity: "武汉", center: [114.305393, 30.593099] }
  };

  var amapConfig = window.AMAP_CONFIG || {
    key: "01c62dbb840ff3a9608824515767257a",
    securityJsCode: "15ad4d83b7c5222fb9809fcb2d3b9d58"
  };

  if (window.AMAP_CONFIG) {
    amapConfig.securityJsCode = window.AMAP_CONFIG.securityJsCode || window.AMAP_CONFIG.securityCode || amapConfig.securityJsCode;
  }

  var ui = {
    cityInput: document.getElementById("city-input"),
    applyCityButton: document.getElementById("apply-city"),
    keywordInput: document.getElementById("poi-keyword"),
    searchButton: document.getElementById("search-poi"),
    resultsList: document.getElementById("search-results"),
    pinnedList: document.getElementById("pinned-places"),
    clearPinsButton: document.getElementById("clear-pins"),
    status: document.getElementById("map-status"),
    statCity: document.getElementById("stat-city"),
    statPins: document.getElementById("stat-pins"),
    pendingPointPanel: document.getElementById("pending-point-panel"),
    pendingPointName: document.getElementById("pending-point-name"),
    pendingPointAddress: document.getElementById("pending-point-address"),
    confirmPointButton: document.getElementById("confirm-point"),
    cancelPointButton: document.getElementById("cancel-point"),
    optimizeRouteButton: document.getElementById("optimize-route"),
    exportRouteImageButton: document.getElementById("export-route-image"),
    routeInfo: document.getElementById("route-info"),
    routeMode: document.getElementById("route-mode"),
    routePoster: document.getElementById("route-poster")
  };

  var map = null;
  var placeSearch = null;
  var geocoder = null;
  var infoWindow = null;
  var currentCity = {
    key: "beijing",
    label: cityCatalog.beijing.label,
    searchCity: cityCatalog.beijing.searchCity,
    center: cityCatalog.beijing.center
  };
  var markers = [];
  var pinnedPlaces = [];
  var pendingSelection = null;
  var pendingMarker = null;
  var citySwitchToken = 0;
  var routePolylines = [];       // flat list for bulk clear
  var segmentPolylines = [];     // per-segment arrays: segmentPolylines[i] = [poly1, poly2, ...]
  // per-segment polylines are stored in segmentPolylines
  var isRouteActive = false;
  var dragFromIndex = -1;
  var html2CanvasLoading = null;
  var driving = null;
  var walking = null;
  var riding = null;
  var transportMode = "driving";  // "driving" | "walking" | "riding"

  function getCurrentCity() {
    return currentCity;
  }

  function cloneCityFromCatalog(key) {
    var city = cityCatalog[key] || cityCatalog.beijing;
    return {
      key: key,
      label: city.label,
      searchCity: city.searchCity,
      center: city.center
    };
  }

  function findCatalogKeyByLabel(label) {
    var cityName = (label || "").trim();
    return Object.keys(cityCatalog).find(function (key) {
      return cityCatalog[key].label === cityName;
    }) || null;
  }

  function applyCityInputs(city) {
    var cityName = city && city.label ? city.label : "";
    ui.cityInput.value = cityName;
  }

  function setCitySwitching(isBusy, cityName) {
    ui.cityInput.disabled = isBusy;
    ui.applyCityButton.disabled = isBusy;
    ui.searchButton.disabled = isBusy;

    if (isBusy) {
      ui.applyCityButton.classList.add("is-loading");
      ui.applyCityButton.textContent = "切换中...";
      setStatus("正在切换到" + cityName + "...");
    } else {
      ui.applyCityButton.classList.remove("is-loading");
      ui.applyCityButton.textContent = "切换城市";
    }
  }

  function setStatus(message) {
    ui.status.textContent = message;
  }

  function formatTimeForPoster(totalMin) {
    if (!totalMin || totalMin <= 0) { return "待生成"; }
    if (totalMin >= 60) {
      return Math.floor(totalMin / 60) + "h" + (totalMin % 60) + "min";
    }
    return totalMin + "分钟";
  }

  function getRouteSummary() {
    var totalKm = 0;
    var totalMin = 0;
    var hasTraffic = false;

    for (var i = 0; i < pinnedPlaces.length - 1; i++) {
      var st = pinnedPlaces[i].segmentTraffic;
      if (!st) { continue; }
      var kmMatch = st.match(/([\d.]+)\s*km/);
      var minMatch = st.match(/(\d+)\s*(分钟|min)/) || st.match(/(\d+)h(\d+)?min/);
      if (kmMatch) {
        totalKm += parseFloat(kmMatch[1]);
        hasTraffic = true;
      }
      if (minMatch) {
        if (minMatch[2]) { totalMin += parseInt(minMatch[1], 10); }
        else { totalMin += parseInt(minMatch[1], 10) * 60 + (parseInt(minMatch[2], 10) || 0); }
      }
    }

    if (!hasTraffic && pinnedPlaces.length >= 2) {
      for (var j = 1; j < pinnedPlaces.length; j++) {
        totalKm += haversineKm(
          pinnedPlaces[j - 1].lng,
          pinnedPlaces[j - 1].lat,
          pinnedPlaces[j].lng,
          pinnedPlaces[j].lat
        );
      }
    }

    return {
      totalKm: totalKm,
      totalMin: totalMin,
      hasTraffic: hasTraffic
    };
  }

  function buildPosterHtml() {
    var city = escapeHtml(getCurrentCity().label);
    var summary = getRouteSummary();
    var now = new Date();
    var dateText = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var kmText = summary.totalKm > 0 ? summary.totalKm.toFixed(1) + " km" : "--";
    var timeText = formatTimeForPoster(summary.totalMin);

    var placesHtml = pinnedPlaces.map(function (place, idx) {
      var name = escapeHtml(place.name || "未命名地点");
      var address = escapeHtml(place.address || (place.lng.toFixed(6) + ", " + place.lat.toFixed(6)));
      return "<li>" +
        "<span class='city-spots-export-idx'>" + (idx + 1) + "</span>" +
        "<div>" +
          "<p class='city-spots-export-name'>" + name + "</p>" +
          "<p class='city-spots-export-address'>" + address + "</p>" +
        "</div>" +
      "</li>";
    }).join("");

    var segHtml = [];
    for (var i = 0; i < pinnedPlaces.length - 1; i++) {
      var from = escapeHtml(pinnedPlaces[i].name || ("地点" + (i + 1)));
      var to = escapeHtml(pinnedPlaces[i + 1].name || ("地点" + (i + 2)));
      var rawTraffic = pinnedPlaces[i].segmentTraffic || "";
      var traffic = rawTraffic.replace(/🚗|🚶|🚴/g, "").replace(/\s+/g, " ").trim();
      if (!traffic) { traffic = "数据待补充"; }
      segHtml.push("<li>" +
        "<p class='city-spots-export-seg-title'>第" + (i + 1) + "段 · " + from + " 至 " + to + "</p>" +
        "<p class='city-spots-export-seg-meta'>通行信息：" + escapeHtml(traffic) + "</p>" +
      "</li>");
    }

    return "<div class='city-spots-export-head'>" +
        "<div>" +
          "<h3 class='city-spots-export-title'>出行路线方案</h3>" +
          "<p class='city-spots-export-subtitle'>" + city + " · 按当前路线顺序生成</p>" +
        "</div>" +
        "<span class='city-spots-export-badge'>ROUTE BRIEF</span>" +
      "</div>" +
      "<div class='city-spots-export-summary'>" +
        "<div class='city-spots-export-metric'><label>路线总里程</label><strong>" + kmText + "</strong></div>" +
        "<div class='city-spots-export-metric'><label>预计总耗时</label><strong>" + timeText + "</strong></div>" +
        "<div class='city-spots-export-metric'><label>停靠点数量</label><strong>" + pinnedPlaces.length + " 个</strong></div>" +
      "</div>" +
      "<div class='city-spots-export-panel'>" +
        "<h4>站点顺序（含起终点）</h4>" +
        "<ul class='city-spots-export-places'>" + placesHtml + "</ul>" +
      "</div>" +
      "<div class='city-spots-export-panel'>" +
        "<h4>分段通行摘要</h4>" +
        "<ul class='city-spots-export-segments'>" + segHtml.join("") + "</ul>" +
      "</div>" +
      "<div class='city-spots-export-foot'>" +
        "<span>生成日期：" + dateText + "</span>" +
        "<span>数据来源：高德路线服务（实时计算）</span>" +
      "</div>";
  }

  function loadHtml2Canvas() {
    if (window.html2canvas) { return Promise.resolve(window.html2canvas); }
    if (html2CanvasLoading) { return html2CanvasLoading; }

    html2CanvasLoading = new Promise(function (resolve, reject) {
      var existing = document.getElementById("html2canvas-lib");
      if (existing) {
        existing.addEventListener("load", function () { resolve(window.html2canvas); });
        existing.addEventListener("error", function () { reject(new Error("截图组件加载失败")); });
        return;
      }

      var script = document.createElement("script");
      script.id = "html2canvas-lib";
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = function () { resolve(window.html2canvas); };
      script.onerror = function () { reject(new Error("截图组件加载失败")); };
      document.head.appendChild(script);
    });

    return html2CanvasLoading;
  }

  function exportRoutePoster() {
    if (!isRouteActive || pinnedPlaces.length < 2) {
      setStatus("请先生成路线，再导出路线。");
      return;
    }

    ui.exportRouteImageButton.disabled = true;
    ui.exportRouteImageButton.classList.add("is-loading");
    setStatus("正在生成路线图片...");

    loadHtml2Canvas()
      .then(function (html2canvasRef) {
        ui.routePoster.innerHTML = buildPosterHtml();
        return html2canvasRef(ui.routePoster, {
          backgroundColor: null,
          useCORS: true,
          scale: 2
        });
      })
      .then(function (canvas) {
        var city = getCurrentCity().label;
        var now = new Date();
        var stamp = now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0");
        var fileName = "路线清单-" + city + "-" + stamp + ".png";
        var link = document.createElement("a");
        link.download = fileName;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus("路径图片已导出，可在手机查看。");
      })
      .catch(function (err) {
        setStatus(err && err.message ? err.message : "导出路线失败，请重试。");
      })
      .finally(function () {
        ui.exportRouteImageButton.disabled = false;
        ui.exportRouteImageButton.classList.remove("is-loading");
      });
  }

  // riding debug removed

  function syncStats() {
    var city = getCurrentCity();
    ui.statCity.textContent = city.label;
    ui.statPins.textContent = String(pinnedPlaces.length);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderSearchResults(list) {
    if (!list.length) {
      ui.resultsList.innerHTML = "<li class='city-spots-item'><div class='city-spots-item__meta'><strong>未找到地点</strong><span>请尝试更换关键词。</span></div></li>";
      return;
    }

    ui.resultsList.innerHTML = list
      .map(function (poi, index) {
        var name = escapeHtml(poi.name || "未命名地点");
        var address = escapeHtml(poi.address || poi.district || "无详细地址");
        return "<li class='city-spots-item'>" +
          "<div class='city-spots-item__meta'><strong>" + name + "</strong><span>" + address + "</span></div>" +
          "<button class='city-spots-btn city-spots-btn--ghost' type='button' data-result-index='" + index + "'>添加</button>" +
        "</li>";
      })
      .join("");
  }

  function renderPinnedPlaces() {
    if (!pinnedPlaces.length) {
      ui.pinnedList.innerHTML = "<li class='city-spots-item'><div class='city-spots-item__meta'><strong>暂无地点</strong><span>可通过搜索或地图点选添加。</span></div></li>";
      return;
    }

    ui.pinnedList.innerHTML = pinnedPlaces
      .map(function (place, index) {
        var name = escapeHtml(place.name || "未命名地点");
        var coords = escapeHtml(place.address || (place.lng.toFixed(6) + ", " + place.lat.toFixed(6)));
        var itemClass = isRouteActive ? "city-spots-item city-spots-item--routed" : "city-spots-item";
        var seqBadge = "";
        if (isRouteActive) {
          var seqClass = "city-spots-seq-badge";
          if (index === 0) { seqClass += " city-spots-seq-badge--start"; }
          else if (index === pinnedPlaces.length - 1) { seqClass += " city-spots-seq-badge--end"; }
          seqBadge = "<span class='" + seqClass + "'>" + (index + 1) + "</span>";
        }

        // Segment traffic info (for active route, all except the last item)
        var trafficHtml = "";
        if (isRouteActive && index < pinnedPlaces.length - 1) {
          var nextName = escapeHtml(pinnedPlaces[index + 1].name || "下一站");
          var segMode = place.segmentMode || transportMode;
          var drivingSel = segMode === "driving" ? " sel" : "";
          var walkingSel = segMode === "walking" ? " sel" : "";
          var ridingSel = segMode === "riding" ? " sel" : "";

          var infoText = "";
          if (place.segmentTraffic) {
            infoText = "→ " + nextName + "&nbsp;&nbsp;<strong>" + place.segmentTraffic + "</strong>";
          } else if (place.segmentTrafficLoading) {
            infoText = "→ " + nextName + "&nbsp;&nbsp;查询中...";
          } else {
            infoText = "→ " + nextName;
          }

          trafficHtml = "<div class='city-spots-item__traffic'>" +
            infoText +
            "<span class='city-spots-seg-mode'>" +
              "<button class='city-spots-seg-btn" + drivingSel + "' data-sid='" + index + "' data-mode='driving'>🚗</button>" +
              "<button class='city-spots-seg-btn" + walkingSel + "' data-sid='" + index + "' data-mode='walking'>🚶</button>" +
              "<button class='city-spots-seg-btn" + ridingSel + "' data-sid='" + index + "' data-mode='riding'>🚴</button>" +
            "</span>" +
          "</div>";
        }

        return "<li class='" + itemClass + "' data-pin-item-index='" + index + "' draggable='true'>" +
          "<div style='min-width:0;flex:1;'>" +
            "<div style='display:flex;align-items:center;gap:0.55rem;'>" +
              seqBadge +
              "<div class='city-spots-item__meta' style='flex:1;'><strong>" + name + "</strong><span>" + coords + "</span></div>" +
              "<div style='display:flex;align-items:center;gap:0.4rem;flex-shrink:0;'>" +
                "<button class='city-spots-btn city-spots-btn--ghost' type='button' data-pin-index='" + index + "' data-action='delete'>删除</button>" +
              "</div>" +
            "</div>" +
            trafficHtml +
          "</div>" +
        "</li>";
      })
      .join("");
  }

  function clearAllPins() {
    markers.forEach(function (marker) {
      marker.setMap(null);
    });
    markers = [];
    pinnedPlaces = [];
    clearRouteDisplay();
    renderPinnedPlaces();
    syncStats();
  }

  function clearPendingSelection() {
    pendingSelection = null;
    if (pendingMarker) {
      pendingMarker.setMap(null);
    }
    pendingMarker = null;
    ui.pendingPointPanel.classList.add("is-hidden");
  }

  function getPixelFromLngLat(lng, lat) {
    if (!map || typeof map.lngLatToContainer !== "function") {
      return null;
    }

    var pixel = map.lngLatToContainer([lng, lat]);
    if (!pixel) {
      return null;
    }

    var x = Number(pixel.x != null ? pixel.x : (typeof pixel.getX === "function" ? pixel.getX() : NaN));
    var y = Number(pixel.y != null ? pixel.y : (typeof pixel.getY === "function" ? pixel.getY() : NaN));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return { x: x, y: y };
  }

  function positionPendingPanel() {
    if (!pendingSelection || !map) {
      return;
    }

    var pixel = getPixelFromLngLat(pendingSelection.lng, pendingSelection.lat);
    if (!pixel) {
      return;
    }

    var mapContainer = map.getContainer ? map.getContainer() : document.getElementById("city-spots-map");
    if (!mapContainer) {
      return;
    }

    var panel = ui.pendingPointPanel;
    var panelWidth = panel.offsetWidth || 320;
    var panelHeight = panel.offsetHeight || 64;
    var containerWidth = mapContainer.clientWidth;
    var containerHeight = mapContainer.clientHeight;
    var edgeGap = 12;
    var markerGap = 16;

    var left = pixel.x + markerGap;
    var top = pixel.y - panelHeight - markerGap;

    if (top < edgeGap) {
      top = pixel.y + markerGap;
    }

    if (left + panelWidth > containerWidth - edgeGap) {
      left = pixel.x - panelWidth - markerGap;
    }

    left = Math.max(edgeGap, Math.min(left, containerWidth - panelWidth - edgeGap));
    top = Math.max(edgeGap, Math.min(top, containerHeight - panelHeight - edgeGap));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  function showPendingSelection() {
    if (!pendingSelection) {
      clearPendingSelection();
      return;
    }

    ui.pendingPointName.textContent = pendingSelection.name;
    ui.pendingPointAddress.textContent = pendingSelection.address;
    ui.pendingPointPanel.classList.remove("is-hidden");
    requestAnimationFrame(positionPendingPanel);
  }

  function confirmPendingSelection() {
    if (!pendingSelection) {
      return;
    }

    addPin(
      pendingSelection.name,
      pendingSelection.address,
      pendingSelection.lng,
      pendingSelection.lat
    );
    clearPendingSelection();
  }

  function moveToCity(cityKey) {
    var nextCity = cloneCityFromCatalog(cityKey in cityCatalog ? cityKey : "beijing");
    var localSwitchToken = citySwitchToken + 1;
    citySwitchToken = localSwitchToken;
    currentCity = nextCity;

    clearPendingSelection();
    applyCityInputs(nextCity);
    setCitySwitching(true, nextCity.label);

    function finalizeSwitch() {
      if (localSwitchToken !== citySwitchToken || !map) {
        return;
      }

      if (typeof map.setZoomAndCenter === "function") {
        map.setZoomAndCenter(11, nextCity.center);
      } else {
        map.setCenter(nextCity.center);
        map.setZoom(11);
      }

      if (placeSearch) {
        placeSearch.setCity(nextCity.searchCity);
      }

      clearAllPins();
      ui.resultsList.innerHTML = "";
      syncStats();
      setCitySwitching(false);
      setStatus("已切换到" + nextCity.label + "，已清空当前点位。");
    }

    if (!map) {
      syncStats();
      setCitySwitching(false);
      return;
    }

    if (typeof map.setCity === "function" && map.setCity.length >= 2) {
      map.setCity(nextCity.searchCity, finalizeSwitch);
      setTimeout(finalizeSwitch, 420);
    } else {
      map.setCity(nextCity.searchCity);
      requestAnimationFrame(finalizeSwitch);
    }
  }

  function moveToCustomCity(cityName) {
    var name = (cityName || "").trim();
    if (!name) {
      setStatus("请输入城市名称。");
      return;
    }

    var matchedKey = findCatalogKeyByLabel(name);
    if (matchedKey) {
      moveToCity(matchedKey);
      return;
    }

    if (!geocoder || typeof geocoder.getLocation !== "function") {
      setStatus("地图服务尚未就绪，请稍后再试。");
      return;
    }

    clearPendingSelection();
    setCitySwitching(true, name);

    geocoder.getLocation(name, function (status, result) {
      if (status !== "complete" || !result || !result.geocodes || !result.geocodes.length) {
        setCitySwitching(false);
        setStatus("未能识别该城市，请检查输入。");
        return;
      }

      var location = result.geocodes[0].location;
      var lng = Number(location && location.lng);
      var lat = Number(location && location.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        setCitySwitching(false);
        setStatus("城市定位结果无效，请重试。");
        return;
      }

      currentCity = {
        key: null,
        label: name,
        searchCity: name,
        center: [lng, lat]
      };

      if (map) {
        map.setCity(name);
        if (typeof map.setZoomAndCenter === "function") {
          map.setZoomAndCenter(11, [lng, lat]);
        } else {
          map.setCenter([lng, lat]);
          map.setZoom(11);
        }
      }

      if (placeSearch) {
        placeSearch.setCity(name);
      }

      clearAllPins();
      ui.resultsList.innerHTML = "";
      syncStats();
      applyCityInputs(currentCity);
      setCitySwitching(false);
      setStatus("已切换到" + name + "，已清空当前点位。");
    });
  }

  function makeMarkerPin() {
    return "<div style='" +
      "width:24px;height:24px;" +
      "display:flex;align-items:center;justify-content:center;" +
      "background:linear-gradient(135deg,#0b91d8,#0978c0);" +
      "border-radius:999px 999px 999px 4px;" +
      "transform:rotate(-45deg);" +
      "box-shadow:0 4px 16px rgba(11,145,216,0.4), 0 1px 3px rgba(0,0,0,0.15);" +
      "border:2.5px solid #fff;" +
      "'>" +
      "<span style='transform:rotate(45deg);width:7px;height:7px;border-radius:999px;background:#fff;opacity:0.9;'></span>" +
    "</div>";
  }

  function addPin(name, address, lng, lat) {
    if (!map) {
      return;
    }

    var duplicate = pinnedPlaces.some(function (place) {
      return Math.abs(place.lng - lng) < 0.00001 && Math.abs(place.lat - lat) < 0.00001;
    });
    if (duplicate) {
      setStatus("该地点已在列表中。");
      return;
    }

    var marker = new AMap.Marker({
      position: [lng, lat],
      title: name,
      map: map,
      zIndex: 120,
      offset: new AMap.Pixel(-12, -12),
      content: makeMarkerPin()
    });

    markers.push(marker);
    pinnedPlaces.push({
      name: name || "未命名地点",
      address: address || "",
      lng: lng,
      lat: lat,
      marker: marker
    });

    marker.on("click", function () {
      var content = "<div style='font-size:13px;line-height:1.5;'>" +
        "<strong>" + escapeHtml(name || "未命名地点") + "</strong><br/>" +
        "<span>" + escapeHtml(address || getCurrentCity().label) + "</span>" +
        "</div>";
      if (!infoWindow) {
        infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -20) });
      }
      infoWindow.setContent(content);
      infoWindow.open(map, marker.getPosition());
    });

    map.setCenter([lng, lat]);
    map.setZoom(13);
    if (isRouteActive) {
      // New pin invalidates previous segment data; clear route
      clearRouteDisplay();
    }
    renderPinnedPlaces();
    syncStats();
    setStatus("已添加地点：" + (name || "未命名地点"));
  }

  function addPinFromPoi(poi) {
    if (!poi || !poi.location) {
      return;
    }

    var lng = Number(poi.location.lng);
    var lat = Number(poi.location.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return;
    }

    addPin(poi.name || "未命名地点", poi.address || poi.district || getCurrentCity().label, lng, lat);
  }

  function addPinFromMapPoint(lnglat) {
    if (!lnglat) {
      return;
    }

    var lng = Number(lnglat.lng != null ? lnglat.lng : lnglat[0]);
    var lat = Number(lnglat.lat != null ? lnglat.lat : lnglat[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return;
    }

    clearPendingSelection();

    pendingMarker = new AMap.Marker({
      position: [lng, lat],
      map: map,
      zIndex: 250,
      offset: new AMap.Pixel(-12, -12),
      content: "<div style='" +
        "width:24px;height:24px;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:linear-gradient(135deg,#e8950a,#d87a06);" +
        "border-radius:999px 999px 999px 4px;" +
        "transform:rotate(-45deg);" +
        "box-shadow:0 4px 16px rgba(232,149,10,0.45), 0 1px 3px rgba(0,0,0,0.15);" +
        "border:2.5px solid #fff;" +
        "animation:cs-pulse 0.9s ease-in-out infinite;" +
        "'>" +
        "<span style='transform:rotate(45deg);width:7px;height:7px;border-radius:999px;background:#fff;opacity:0.9;'></span>" +
      "</div>",
      title: "待确认点位"
    });

    var fallbackName = "地图点位";
    var fallbackAddress = getCurrentCity().label + " · " + lng.toFixed(5) + ", " + lat.toFixed(5);

    pendingSelection = {
      name: fallbackName,
      address: fallbackAddress,
      lng: lng,
      lat: lat
    };
    showPendingSelection();
    setStatus("已选中点位，请点击 √ 确认或 × 取消。");

    if (geocoder && typeof geocoder.getAddress === "function") {
      geocoder.getAddress([lng, lat], function (status, result) {
        if (!pendingSelection || Math.abs(pendingSelection.lng - lng) > 0.00001 || Math.abs(pendingSelection.lat - lat) > 0.00001) {
          return;
        }

        var name = fallbackName;
        var address = fallbackAddress;

        if (status === "complete" && result && result.regeocode) {
          address = result.regeocode.formattedAddress || address;
          if (result.regeocode.pois && result.regeocode.pois.length) {
            name = result.regeocode.pois[0].name || name;
            address = result.regeocode.pois[0].address || address;
          }
        }

        pendingSelection.name = name;
        pendingSelection.address = address;
        showPendingSelection();
      });
      return;
    }
  }

  function searchPlaces() {
    if (!map || !placeSearch) {
      setStatus("地图尚未就绪。");
      return;
    }

    var keyword = (ui.keywordInput.value || "").trim();
    if (!keyword) {
      setStatus("请先输入关键词。");
      return;
    }

    var city = getCurrentCity();
    setStatus("正在“" + city.label + "”搜索“" + keyword + "”...");
    placeSearch.setCity(city.searchCity);
    placeSearch.search(keyword, function (status, result) {
      if (status !== "complete" || !result || !result.poiList || !Array.isArray(result.poiList.pois)) {
        renderSearchResults([]);
        setStatus("未找到相关地点。");
        return;
      }

      var pois = result.poiList.pois.filter(function (poi) {
        return poi && poi.location && Number.isFinite(Number(poi.location.lng)) && Number.isFinite(Number(poi.location.lat));
      });

      renderSearchResults(pois);
      ui.resultsList.dataset.raw = JSON.stringify(pois.map(function (p) {
        return {
          name: p.name,
          address: p.address,
          district: p.district,
          location: {
            lng: p.location.lng,
            lat: p.location.lat
          }
        };
      }));

      setStatus("在" + city.label + "找到 " + pois.length + " 个地点。");
    });
  }

  /* ── Route Optimization ── */

  function haversineKm(lng1, lat1, lng2, lat2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function buildDistanceMatrix(places) {
    var n = places.length;
    var matrix = [];
    for (var i = 0; i < n; i++) {
      matrix[i] = [];
      for (var j = 0; j < n; j++) {
        if (i === j) { matrix[i][j] = 0; }
        else { matrix[i][j] = haversineKm(places[i].lng, places[i].lat, places[j].lng, places[j].lat); }
      }
    }
    return matrix;
  }

  function nearestNeighborOrder(matrix) {
    var n = matrix.length;
    if (n <= 1) { return Array.from({ length: n }, function (_, i) { return i; }); }

    var visited = new Array(n).fill(false);
    var order = [0];
    visited[0] = true;

    for (var step = 1; step < n; step++) {
      var last = order[step - 1];
      var best = -1;
      var bestDist = Infinity;
      for (var j = 0; j < n; j++) {
        if (!visited[j] && matrix[last][j] < bestDist) {
          bestDist = matrix[last][j];
          best = j;
        }
      }
      if (best >= 0) {
        visited[best] = true;
        order.push(best);
      }
    }
    return order;
  }

  function totalRouteDistance(order, matrix) {
    var dist = 0;
    for (var i = 1; i < order.length; i++) {
      dist += matrix[order[i - 1]][order[i]];
    }
    return dist;
  }

  function clearRouteDisplay() {
    clearPolylines();
    isRouteActive = false;
    // riding debug removed

    pinnedPlaces.forEach(function (place) {
      place.segmentTraffic = null;
      place.segmentTrafficLoading = false;
      if (place.marker) {
        place.marker.setLabel({ content: "", offset: null });
      }
    });

    ui.routeInfo.classList.add("is-hidden");
    ui.routeInfo.textContent = "";
    ui.routeMode.classList.add("is-hidden");
  }

  function clearPolylines() {
    routePolylines.forEach(function (line) { line.setMap(null); });
    routePolylines = [];
    segmentPolylines = [];
  }

  function clearSegmentPolylines(index) {
    if (!segmentPolylines[index] || !segmentPolylines[index].length) { return; }
    var segLines = segmentPolylines[index];
    segLines.forEach(function (line) { line.setMap(null); });
    routePolylines = routePolylines.filter(function (line) {
      return segLines.indexOf(line) === -1;
    });
    segmentPolylines[index] = [];
    // cleared per-segment polylines above
  }

  function displayRoute(orderedPlaces, totalKm) {
    clearRouteDisplay();
    isRouteActive = true;

    orderedPlaces.forEach(function (place, idx) {
      var marker = place.marker;
      if (!marker) { return; }

      var isStart = (idx === 0);
      var isEnd = (idx === orderedPlaces.length - 1);
      var cssClass = "city-spots-seq-badge";
      if (isStart) { cssClass += " city-spots-seq-badge--start"; }
      else if (isEnd) { cssClass += " city-spots-seq-badge--end"; }

      var labelContent = "<div style='" +
        "display:inline-flex;align-items:center;justify-content:center;" +
        "width:22px;height:22px;border-radius:999px;" +
        (isStart ? "background:linear-gradient(135deg,#16a34a,#15803d);" :
         isEnd ? "background:linear-gradient(135deg,#e9a54a,#d97706);" :
         "background:linear-gradient(135deg,#0b91d8,#0a74bb);") +
        "color:#fff;font-size:11px;font-weight:800;" +
        "box-shadow:0 3px 10px rgba(0,0,0,0.25);" +
        "'>" + (idx + 1) + "</div>";

      marker.setLabel({
        content: labelContent,
        direction: "top",
        offset: new AMap.Pixel(0, -8)
      });

      // route order follows current pinnedPlaces sequence
    });

    var infoText = "路线总长度约 <strong>" + totalKm.toFixed(1) + "</strong> km · 共 <strong>" + orderedPlaces.length + "</strong> 个地点";
    ui.routeInfo.innerHTML = infoText;
    ui.routeInfo.classList.remove("is-hidden");
    ui.routeMode.classList.remove("is-hidden");

    // Fit map to show all markers
    if (orderedPlaces.length >= 2) {
      var allLngLats = orderedPlaces.map(function (p) { return [p.lng, p.lat]; });
      var bounds = new AMap.Bounds(
        [Math.min.apply(null, allLngLats.map(function(c) { return c[0]; })),
         Math.min.apply(null, allLngLats.map(function(c) { return c[1]; }))],
        [Math.max.apply(null, allLngLats.map(function(c) { return c[0]; })),
         Math.max.apply(null, allLngLats.map(function(c) { return c[1]; }))]
      );
      map.setBounds(bounds, false, [60, 60, 60, 120]);
    }

    // Kick off per-segment driving/walking/riding queries with real route drawing
    queryAllSegments();
  }

  function queryAllSegments() {
    if (pinnedPlaces.length < 2) { return; }

    // Clear old route lines before drawing new ones
    clearPolylines();

    // Mark all segments as loading, clear previous results
    for (var i = 0; i < pinnedPlaces.length - 1; i++) {
      pinnedPlaces[i].segmentTraffic = null;
      pinnedPlaces[i].segmentTrafficLoading = true;
    }
    renderPinnedPlaces();

    function querySegment(index) {
      if (index >= pinnedPlaces.length - 1) {
        updateRouteInfoSummary();
        return;
      }
      if (!isRouteActive) { return; }

      doSegmentQuery(index, function () {
        setTimeout(function () { querySegment(index + 1); }, 400);
      });
    }

    querySegment(0);
  }

  function querySingleSegment(index) {
    if (!isRouteActive) { return; }
    if (index < 0 || index >= pinnedPlaces.length - 1) { return; }
    // Only remove this segment's old polylines, keep others
    clearSegmentPolylines(index);
    doSegmentQuery(index, function () {
      updateRouteInfoSummary();
    });
  }

  function getSegmentService(index) {
    var segMode = pinnedPlaces[index].segmentMode || transportMode;
    if (segMode === "walking") return { service: walking, emoji: "🚶", label: "步行" };
    if (segMode === "riding")  return { service: riding,  emoji: "🚴", label: "骑行" };
    return { service: driving, emoji: "🚗", label: "驾车" };
  }

  function doSegmentQuery(index, callback) {
    var from = pinnedPlaces[index];
    var to = pinnedPlaces[index + 1];
    if (!from || !to) { callback(); return; }

    var svc = getSegmentService(index);
    if (!svc.service) {
      from.segmentTraffic = "路线不可用";
      from.segmentTrafficLoading = false;
      renderPinnedPlaces();
      callback();
      return;
    }

    svc.service.search(
      [from.lng, from.lat],
      [to.lng, to.lat],
      function (status, result) {
        if (!isRouteActive) { return; }

        try {
          var route = null;
          if (result) {
            if (result.routes && result.routes.length) {
              route = result.routes[0];
            } else if (result.route) {
              route = result.route;
            } else if (result.data && result.data.routes && result.data.routes.length) {
              route = result.data.routes[0];
            } else if (result.paths && result.paths.length) {
              route = result.paths[0];
            }
          }

          var hasRidingPayload = result && ((result.rides && result.rides.length) || (result.paths && result.paths.length) || result.path);
          if (status === "complete" && (route || hasRidingPayload)) {
            var distMeters = (route && route.distance) || (result && result.distance);
            var timeSec = (route && route.time) || (result && result.time);
            if ((!distMeters || !timeSec) && route && route.rides && route.rides.length) {
              distMeters = distMeters || route.rides[0].distance;
              timeSec = timeSec || route.rides[0].time;
            }
            if ((!distMeters || !timeSec) && result && result.rides && result.rides.length) {
              distMeters = distMeters || result.rides[0].distance;
              timeSec = timeSec || result.rides[0].time;
            }
            var distKm = distMeters ? (distMeters / 1000).toFixed(1) : "-";
            var min = timeSec ? Math.round(timeSec / 60) : 0;
            var timeText = min >= 60
              ? Math.floor(min / 60) + "h" + (min % 60) + "min"
              : min + "分钟";
            var distText = distKm === "-" ? "-" : distKm + "km";
            var timeLabel = min ? "约" + timeText : "-";
            from.segmentTraffic = svc.emoji + " " + svc.label + " " + distText + " · " + timeLabel;

            var drawn = false;
            var routeCandidates = [];
            if (route) { routeCandidates.push(route); }
            if (result && result !== route) { routeCandidates.push(result); }
            for (var c = 0; c < routeCandidates.length; c++) {
              var candidate = routeCandidates[c];
              var drawnPts = drawSegmentPolyline(candidate, index);
              if (drawnPts >= 2) {
                drawn = true;
                break;
              }
            }
            // Fallback: if path extraction failed, draw straight line
            if (!drawn) {
              drawStraightSegment(route || result, index);
            }

            // riding debug removed
          } else {
            from.segmentTraffic = svc.label + "路线不可用";
            // riding debug removed
          }
        } catch (err) {
          from.segmentTraffic = svc.label + "绘制异常";
          // riding debug removed
        } finally {
          from.segmentTrafficLoading = false;
          renderPinnedPlaces();
          callback();
        }
      }
    );
  }

  function drawSegmentPolyline(route, segmentIndex) {
    if (!route || !map) { return 0; }

    var pathPoints = [];

    // Prefer a full extraction summary when available (fixes cases where
    // route contains many points but the step-based parser only picks a few)
    try {
      var extracted = extractRoutePoints(route);
      if (extracted && extracted.length >= 2) {
        pathPoints = extracted;
      }
    } catch (e) {
      // ignore and continue with original parsing
    }

    // Helper: push clean coords
    function pushPt(pt) {
      var lng, lat;
      if (!pt) { return; }
      if (typeof pt.getLng === "function") {
        lng = pt.getLng(); lat = pt.getLat();
      } else if (typeof pt.lng === "number" && typeof pt.lat === "number") {
        lng = pt.lng; lat = pt.lat;
      } else if (Array.isArray(pt) && pt.length >= 2) {
        lng = Number(pt[0]); lat = Number(pt[1]);
      } else {
        return;
      }
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        pathPoints.push([lng, lat]);
      }
    }

    // Helper: normalize path payloads (array, string, or single point)
    function pushPathValue(pathValue) {
      if (!pathValue) { return; }
      if (typeof pathValue === "string") {
        var pairs = pathValue.split(";");
        for (var i = 0; i < pairs.length; i++) {
          var parts = pairs[i].split(",");
          if (parts.length >= 2) {
            pushPt([Number(parts[0]), Number(parts[1])]);
          }
        }
        return;
      }
      if (Array.isArray(pathValue)) {
        for (var j = 0; j < pathValue.length; j++) {
          pushPt(pathValue[j]);
        }
        return;
      }
      pushPt(pathValue);
    }

    // Strategy 0: route.rides[] (Riding API variants)
    if (route.rides && route.rides.length) {
      for (var r = 0; r < route.rides.length; r++) {
        var ride = route.rides[r];
        if (!ride) { continue; }
        if (ride.steps && ride.steps.length) {
          for (var rs = 0; rs < ride.steps.length; rs++) {
            pushPathValue(ride.steps[rs].path);
          }
        }
        if (pathPoints.length < 2 && ride.path) {
          pushPathValue(ride.path);
        }
        if (pathPoints.length < 2 && ride.paths) {
          pushPathValue(ride.paths);
        }
      }
    }

    // Strategy 1: route.steps[].path (Driving, Walking, Riding)
    if (pathPoints.length < 2 && route.steps && route.steps.length) {
      for (var s = 0; s < route.steps.length; s++) {
        pushPathValue(route.steps[s].path);
      }
    }

    // Strategy 2: route.path / route.paths as flat array (some API versions)
    if (pathPoints.length < 2 && route.path) {
      pushPathValue(route.path);
    }
    if (pathPoints.length < 2 && route.paths) {
      pushPathValue(route.paths);
    }

    // Strategy 3: route.start + route.end as fallback straight line
    if (pathPoints.length < 2) {
      pushPt(route.origin);
      pushPt(route.destination);
    }

    if (pathPoints.length < 2) { return 0; }

    // Color per mode
    var segMode = pinnedPlaces[segmentIndex].segmentMode || transportMode;
    var routeColor;
    if (segMode === "walking") {
      routeColor = "#10b981";  // green
    } else if (segMode === "riding") {
      routeColor = "#8b5cf6";  // purple
    } else {
      routeColor = "#0b91d8";  // blue (driving)
    }

    var lines = [];

    // Outer glow
    var outerGlow = new AMap.Polyline({
      path: pathPoints,
      strokeColor: routeColor,
      strokeWeight: segMode === 'riding' ? 18 : 14,
      strokeOpacity: segMode === 'riding' ? 0.14 : 0.08,
      lineJoin: "round", lineCap: "round",
      strokeStyle: "solid", showDir: false,
      zIndex: 1200
    });
    outerGlow.setMap(map);
    lines.push(outerGlow);

    // Inner glow
    var innerGlow = new AMap.Polyline({
      path: pathPoints,
      strokeColor: routeColor,
      strokeWeight: segMode === 'riding' ? 9 : 7,
      strokeOpacity: segMode === 'riding' ? 0.26 : 0.18,
      lineJoin: "round", lineCap: "round",
      strokeStyle: "solid", showDir: false,
      zIndex: 1201
    });
    innerGlow.setMap(map);
    lines.push(innerGlow);

    // White core
    var whiteCore = new AMap.Polyline({
      path: pathPoints,
      strokeColor: "#ffffff",
      strokeWeight: segMode === 'riding' ? 5.5 : 4.5,
      strokeOpacity: 0.85,
      lineJoin: "round", lineCap: "round",
      strokeStyle: "solid", showDir: false,
      zIndex: 1202
    });
    whiteCore.setMap(map);
    lines.push(whiteCore);

    // Main dashed line
    var main = new AMap.Polyline({
      path: pathPoints,
      strokeColor: routeColor,
      strokeWeight: segMode === 'riding' ? 4.6 : 3.2,
      strokeOpacity: segMode === 'riding' ? 1.0 : 0.92,
      lineJoin: "round", lineCap: "round",
      strokeStyle: "dashed",
      strokeDasharray: [18, 7],
      showDir: false,
      zIndex: 1203
    });
    main.setMap(map);
    lines.push(main);

    // Store per-segment polylines
    segmentPolylines[segmentIndex] = lines;
    routePolylines = routePolylines.concat(lines);
    // riding mid-point debug marker removed
    return pathPoints.length;
  }

  // Extract route points without drawing — used for debug summaries
  function extractRoutePoints(route) {
    var pts = [];
    if (!route) { return pts; }

    function pushPtDebug(pt) {
      if (!pt) { return; }
      if (typeof pt.getLng === 'function') {
        pts.push([+pt.getLng(), +pt.getLat()]);
      } else if (typeof pt.lng === 'number' && typeof pt.lat === 'number') {
        pts.push([+pt.lng, +pt.lat]);
      } else if (Array.isArray(pt) && pt.length >= 2) {
        pts.push([+pt[0], +pt[1]]);
      }
    }

    function pushPathValueDebug(pathValue) {
      if (!pathValue) { return; }
      if (typeof pathValue === 'string') {
        var pairs = pathValue.split(';');
        for (var i = 0; i < pairs.length; i++) {
          var parts = pairs[i].split(',');
          if (parts.length >= 2) { pushPtDebug([Number(parts[0]), Number(parts[1])]); }
        }
        return;
      }
      if (Array.isArray(pathValue)) {
        for (var j = 0; j < pathValue.length; j++) { pushPtDebug(pathValue[j]); }
        return;
      }
      pushPtDebug(pathValue);
    }

    // ride-level
    if (route.rides && route.rides.length) {
      for (var r = 0; r < route.rides.length; r++) {
        var ride = route.rides[r];
        if (!ride) { continue; }
        if (ride.steps && ride.steps.length) {
          for (var rs = 0; rs < ride.steps.length; rs++) { pushPathValueDebug(ride.steps[rs].path); }
        }
        if (route.rides && route.rides.length && ride.path) { pushPathValueDebug(ride.path); }
        if (ride.paths) { pushPathValueDebug(ride.paths); }
      }
    }

    if (route.steps && route.steps.length) {
      for (var s = 0; s < route.steps.length; s++) { pushPathValueDebug(route.steps[s].path); }
    }
    if (route.path) { pushPathValueDebug(route.path); }
    if (route.paths) { pushPathValueDebug(route.paths); }
    // fallback
    if (pts.length < 2) {
      if (route.origin) { pushPtDebug(route.origin); }
      if (route.destination) { pushPtDebug(route.destination); }
    }

    return pts;
  }

  function drawStraightSegment(route, segmentIndex) {
    if (!route || !map) { return; }
    var from = pinnedPlaces[segmentIndex];
    var to = pinnedPlaces[segmentIndex + 1];
    if (!from || !to) { return; }

    var segMode = pinnedPlaces[segmentIndex].segmentMode || transportMode;
    var routeColor = segMode === "walking" ? "#10b981" : segMode === "riding" ? "#8b5cf6" : "#0b91d8";
    var lines = [];

    var main = new AMap.Polyline({
      path: [[from.lng, from.lat], [to.lng, to.lat]],
      strokeColor: routeColor,
      strokeWeight: 3.2,
      strokeOpacity: 0.85,
      lineJoin: "round", lineCap: "round",
      strokeStyle: "dashed",
      strokeDasharray: [18, 7],
      showDir: false
    });
    main.setMap(map);
    lines.push(main);

    segmentPolylines[segmentIndex] = lines;
    routePolylines = routePolylines.concat(lines);
  }

  function updateRouteInfoSummary() {
    var totalKm = 0;
    var totalMin = 0;
    for (var i = 0; i < pinnedPlaces.length - 1; i++) {
      var st = pinnedPlaces[i].segmentTraffic;
      if (!st) { continue; }
      var kmMatch = st.match(/([\d.]+)\s*km/);
      var minMatch = st.match(/(\d+)\s*(分钟|min)/) || st.match(/(\d+)h(\d+)?min/);
      if (kmMatch) { totalKm += parseFloat(kmMatch[1]); }
      if (minMatch) {
        if (minMatch[2]) { totalMin += parseInt(minMatch[1], 10); }
        else { totalMin += parseInt(minMatch[1], 10) * 60 + (parseInt(minMatch[2], 10) || 0); }
      }
    }
    if (totalKm > 0) {
      var timeText = totalMin >= 60
        ? Math.floor(totalMin / 60) + "h" + (totalMin % 60) + "min"
        : totalMin + "分钟";
      ui.routeInfo.innerHTML = "路线总长度约 <strong>" + totalKm.toFixed(1) + "</strong> km" +
        (totalMin > 0 ? " · 预计耗时 <strong>" + timeText + "</strong>" : "") +
        " · 共 <strong>" + pinnedPlaces.length + "</strong> 个地点";
    } else {
      ui.routeInfo.innerHTML = "路线总长度约 <strong>--</strong> km · 共 <strong>" + pinnedPlaces.length + "</strong> 个地点";
    }
  }

  function optimizeRoute() {
    clearRouteDisplay();

    if (pinnedPlaces.length < 2) {
      setStatus("至少需要 2 个地点才能规划路径。");
      return;
    }

    var orderedPlaces = pinnedPlaces.slice();
    var totalKm = 0;
    for (var i = 1; i < orderedPlaces.length; i++) {
      totalKm += haversineKm(
        orderedPlaces[i - 1].lng,
        orderedPlaces[i - 1].lat,
        orderedPlaces[i].lng,
        orderedPlaces[i].lat
      );
    }

    displayRoute(orderedPlaces, totalKm);
    renderPinnedPlaces();
    setStatus("路径已生成（按当前地点顺序）。");
  }

  function permutations(arr) {
    if (arr.length <= 1) { return [arr]; }
    var result = [];
    for (var i = 0; i < arr.length; i++) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1));
      var subPerms = permutations(rest);
      for (var j = 0; j < subPerms.length; j++) {
        result.push([arr[i]].concat(subPerms[j]));
      }
    }
    return result;
  }

  function bindEvents() {
    ui.applyCityButton.addEventListener("click", function () {
      moveToCustomCity(ui.cityInput.value);
    });

    ui.cityInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        moveToCustomCity(ui.cityInput.value);
      }
    });

    ui.confirmPointButton.addEventListener("click", function () {
      confirmPendingSelection();
    });

    ui.cancelPointButton.addEventListener("click", function () {
      clearPendingSelection();
      setStatus("已取消点位选择。");
    });

    ui.searchButton.addEventListener("click", function () {
      searchPlaces();
    });

    ui.keywordInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        searchPlaces();
      }
    });

    ui.resultsList.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-result-index]");
      if (!button) {
        return;
      }

      var raw = ui.resultsList.dataset.raw;
      var parsed = raw ? JSON.parse(raw) : [];
      var index = Number(button.dataset.resultIndex);
      var poi = parsed[index];
      if (!poi) {
        return;
      }

      addPinFromPoi(poi);
    });

    ui.pinnedList.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-pin-index]");
      if (!button) {
        return;
      }

      var index = Number(button.dataset.pinIndex);
      if (!Number.isInteger(index) || index < 0 || index >= pinnedPlaces.length) {
        return;
      }

      var action = button.dataset.action;
      if (action === "delete") {
        var selected = pinnedPlaces[index];
        if (selected && selected.marker) {
          selected.marker.setMap(null);
        }
        pinnedPlaces.splice(index, 1);
        markers = pinnedPlaces.map(function (place) {
          return place.marker;
        });
        if (isRouteActive) { clearRouteDisplay(); }
        renderPinnedPlaces();
        syncStats();
        setStatus("已删除该地点。");
      }
    });

    ui.pinnedList.addEventListener("dragstart", function (event) {
      var item = event.target.closest("li[data-pin-item-index]");
      if (!item) { return; }
      dragFromIndex = Number(item.dataset.pinItemIndex);
      if (!Number.isInteger(dragFromIndex) || dragFromIndex < 0 || dragFromIndex >= pinnedPlaces.length) {
        dragFromIndex = -1;
        return;
      }
      item.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(dragFromIndex));
      }
    });

    ui.pinnedList.addEventListener("dragover", function (event) {
      var item = event.target.closest("li[data-pin-item-index]");
      if (!item) { return; }
      event.preventDefault();
      var all = ui.pinnedList.querySelectorAll("li[data-pin-item-index]");
      all.forEach(function (el) { el.classList.remove("is-drop-target"); });
      item.classList.add("is-drop-target");
    });

    ui.pinnedList.addEventListener("drop", function (event) {
      event.preventDefault();
      var toItem = event.target.closest("li[data-pin-item-index]");
      if (!toItem || dragFromIndex < 0) { return; }
      var toIndex = Number(toItem.dataset.pinItemIndex);
      if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= pinnedPlaces.length || toIndex === dragFromIndex) {
        return;
      }

      var moved = pinnedPlaces.splice(dragFromIndex, 1)[0];
      pinnedPlaces.splice(toIndex, 0, moved);
      markers = pinnedPlaces.map(function (place) { return place.marker; });

      if (isRouteActive) {
        clearRouteDisplay();
      }

      renderPinnedPlaces();
      setStatus("地点顺序已更新，可点击“生成路线”按该顺序规划。");
      dragFromIndex = -1;
    });

    ui.pinnedList.addEventListener("dragend", function () {
      dragFromIndex = -1;
      var all = ui.pinnedList.querySelectorAll("li[data-pin-item-index]");
      all.forEach(function (el) {
        el.classList.remove("is-dragging");
        el.classList.remove("is-drop-target");
      });
    });

    ui.clearPinsButton.addEventListener("click", function () {
      clearAllPins();
      setStatus("已清空所有地点。");
    });

    ui.optimizeRouteButton.addEventListener("click", function () {
      optimizeRoute();
    });

    ui.exportRouteImageButton.addEventListener("click", function () {
      exportRoutePoster();
    });

    // Global transport mode radio change — resets all segments to this default
    var modeRadios = document.querySelectorAll("input[name='route-mode']");
    for (var mi = 0; mi < modeRadios.length; mi++) {
      modeRadios[mi].addEventListener("change", function () {
        if (this.checked) {
          transportMode = this.value;
        }
        // Reset per-segment overrides
        for (var i = 0; i < pinnedPlaces.length - 1; i++) {
          pinnedPlaces[i].segmentMode = null;
        }
        if (isRouteActive) {
          queryAllSegments();
        }
      });
    }

    // Per-segment transport mode click handler
    ui.pinnedList.addEventListener("click", function (event) {
      var segBtn = event.target.closest(".city-spots-seg-btn");
      if (!segBtn) { return; }
      if (!isRouteActive) { return; }

      var sid = parseInt(segBtn.dataset.sid, 10);
      var mode = segBtn.dataset.mode;
      if (sid < 0 || sid >= pinnedPlaces.length - 1) { return; }

      pinnedPlaces[sid].segmentMode = mode;
      pinnedPlaces[sid].segmentTraffic = null;
      pinnedPlaces[sid].segmentTrafficLoading = true;
      renderPinnedPlaces();
      querySingleSegment(sid);
    });

    window.addEventListener("resize", function () {
      positionPendingPanel();
    });
  }

  function loadAmapScript(key, securityCode) {
    if (window.AMap && typeof window.AMap.Map === "function") {
      return Promise.resolve(window.AMap);
    }

    window._AMapSecurityConfig = {
      securityJsCode: securityCode
    };

    return new Promise(function (resolve, reject) {
      var existing = document.getElementById("amap-jsapi-script");
      if (existing) {
        existing.addEventListener("load", function () {
          resolve(window.AMap);
        });
        existing.addEventListener("error", function () {
          reject(new Error("Failed to load AMap JS API."));
        });
        return;
      }

      var script = document.createElement("script");
      script.id = "amap-jsapi-script";
      script.src = "https://webapi.amap.com/maps?v=2.0&key=" + encodeURIComponent(key) + "&plugin=AMap.PlaceSearch,AMap.Geocoder,AMap.Driving,AMap.Walking,AMap.Riding";
      script.async = true;
      script.onload = function () {
        resolve(window.AMap);
      };
      script.onerror = function () {
        reject(new Error("Failed to load AMap JS API."));
      };
      document.head.appendChild(script);
    });
  }

  function bootstrapMap(key, securityCode) {
    setStatus("正在加载地图服务...");

    loadAmapScript(key, securityCode)
      .then(function (AMapRef) {
        if (!map) {
          map = new AMapRef.Map("city-spots-map", {
            zoom: 11,
            center: cityCatalog.beijing.center,
            viewMode: "2D"
          });
        }

        geocoder = new AMapRef.Geocoder({ extensions: "all" });
        placeSearch = new AMapRef.PlaceSearch({
          city: getCurrentCity().searchCity,
          citylimit: true,
          pageSize: 20,
          pageIndex: 1,
          map: null,
          panel: null,
          autoFitView: false
        });

        if (typeof AMapRef.Driving === "function") {
          driving = new AMapRef.Driving({
            policy: AMapRef.DrivingPolicy.LEAST_TIME,
            map: null
          });
        }
        if (typeof AMapRef.Walking === "function") {
          walking = new AMapRef.Walking({ map: null });
        }
        if (typeof AMapRef.Riding === "function") {
          riding = new AMapRef.Riding({ map: null });
        }

        map.off("click");
        map.off("mapmove", positionPendingPanel);
        map.off("zoomchange", positionPendingPanel);
        map.on("click", function (event) {
          addPinFromMapPoint(event.lnglat);
        });
        map.on("mapmove", positionPendingPanel);
        map.on("zoomchange", positionPendingPanel);

        renderPinnedPlaces();
        syncStats();
        applyCityInputs(getCurrentCity());
        setStatus("地图已加载，当前城市：" + getCurrentCity().label + "。点击地图后可确认添加点位。");
      })
      .catch(function (error) {
        setStatus(error && error.message ? error.message : "地图初始化失败。");
      });
  }

  bindEvents();
  renderPinnedPlaces();

    bootstrapMap(amapConfig.key, amapConfig.securityJsCode);
})();
