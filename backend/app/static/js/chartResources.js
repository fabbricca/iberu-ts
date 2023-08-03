import { getAccessToken, refreshTokenApi } from '/static/js/base.js';

const sStrategy = document.documentElement.getAttribute('data-multiStrategy') === "false";
export const themeColors = {DARK: {CHART_TEXT_COLOR: '#606060',
														CHART_BACKGROUND_COLOR: '#202020',
                            CHART_BORDER_COLOR: '#202020',},
										LIGHT: {CHART_TEXT_COLOR: '#606060',
														CHART_BACKGROUND_COLOR: '#ededed',
                            CHART_BORDER_COLOR: '#ededed',}};

export const TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||	(navigator.msMaxTouchPoints > 0);

export const changeColorApi = async (entry) => {
  const token = await refreshTokenApi();

  if (!token) return;

  const serverResponse = fetch(`${window.origin}/api/user/color`, {
                                  method: 'POST',
                                  credentials: 'include',
                                  body: JSON.stringify(entry),
                                  cache: 'no-cache',
                                  headers: new Headers({
                                    'authorization': `bearer ${token}`,
                                    'content-type': 'application/json'
                                  })
                                }).then(function (response) {
                                      if (response.status !== 200) console.log(`Response status was not 200: ${response.status}`); 
                                      return false;
                                    })

  return true;
}




let addCandlestickApiObjRequest = true;

export const getAddHistoricalCandlesticksRequest = () => {
  return addCandlestickApiObjRequest;
}

export const setAddHistoricalCandlesticksRequest = (value) => {
  addCandlestickApiObjRequest = value;
}


let updateCandlestickObj = false;

export const getUpdatingCandlesticksLock = () => {
  return updateCandlestickObj;
}

export const setUpdatingCandlesticksLock = (value) => {
  updateCandlestickObj = value;
}


Date.prototype.nextCandlestickTime = () => {
  return this.setMinutes(this.getMinutes() + candlesticksData.timeframe);
}

export const timeToLocal = (originalTime) => {
  const d = new Date(originalTime * 1000);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const serverResponse = await fetch(`${window.origin}/api/strategy/candlestick`, {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({strategy: document.getElementById("line-chart").dataset.strategy}),
  cache: 'no-cache',
  headers: new Headers({
    'content-type': 'application/json'
  })
});

let candlesticksData = await serverResponse.json();
candlesticksData.timestamp = [];
for (let i=0; i < candlesticksData.date.length; i++) {
  candlesticksData.timestamp.push(candlesticksData.date[i]);
  candlesticksData.date[i] = timeToLocal(candlesticksData.date[i]);
}

export const getCandlesticksData = () => {
  return candlesticksData;
}


let pageChart = [];

export const addPageChart = (chart) => {
  pageChart.push(chart);
}

export const getPageChart = () => {
  return pageChart;
}



export const addHistoricalCandlesticks = async () => {
  setUpdatingCandlesticksLock(true);
  const serverResponse = await fetch(`${window.origin}/api/strategy/historical_candlestick`, {
                                        method: 'POST',
                                        credentials: 'include',
                                        body: JSON.stringify({strategy: document.getElementById("line-chart").dataset.strategy,
                                                              end_period: candlesticksData.timestamp[0],
                                                              timeframe: candlesticksData.timeframe}),
                                        cache: 'no-cache',
                                        headers: new Headers({
                                          'content-type': 'application/json'
                                        })
                                      });

  let historicalCandlesticksData = await serverResponse.json();

  if (historicalCandlesticksData.result === false) {
    setAddHistoricalCandlesticksRequest(false);
    setUpdatingCandlesticksLock(false);
    return false;
  }

  candlesticksData.timestamp = historicalCandlesticksData.date.concat(candlesticksData.timestamp); 
  for (let i=0; i < historicalCandlesticksData.date.length; i++) {
    historicalCandlesticksData.date[i] = timeToLocal(historicalCandlesticksData.date[i]);
  }
  candlesticksData.date = historicalCandlesticksData.date.concat(candlesticksData.date);
  candlesticksData.trades = historicalCandlesticksData.trades.concat(candlesticksData.trades);
  if (sStrategy) {
    candlesticksData.open = historicalCandlesticksData.open.concat(candlesticksData.open);
    candlesticksData.high = historicalCandlesticksData.high.concat(candlesticksData.high);
    candlesticksData.low = historicalCandlesticksData.low.concat(candlesticksData.low);
    candlesticksData.close = historicalCandlesticksData.close.concat(candlesticksData.close);
    candlesticksData.volume = historicalCandlesticksData.volume.concat(candlesticksData.volume);
  }
  else {
    Object.keys(candlesticksData.close).forEach(key => {
      candlesticksData.close[key] = historicalCandlesticksData.close[key].concat(candlesticksData.close[key]);
    })
  }


  pageChart.map(chart => {
    let chartElement = document.querySelector(chart);
    chartElement._changeData();
  });

  setAddHistoricalCandlesticksRequest(true);
  setUpdatingCandlesticksLock(false);

  return true;
}

let candlestickSource = new EventSource(`${window.origin}/stream/${candlesticksData.symbol}/${candlesticksData.timeframe}`);
candlestickSource.onmessage = function(event) {
  updateCandlestick(event.data);
};

let tradeSource = new EventSource(`${window.origin}/stream/${document.querySelector("lightweight-performance-chart").dataset.strategy}`);
tradeSource.onmessage = function(event) {
  updateTrade(event.data);
};

export const updateCandlestick = (data) => {
  pageChart.map(chart => {
    let chartElement = document.querySelector(chart);
    try {
      chartElement._updateData(data);
    }catch {
      null;
    }
  })
}

export const updateTrade = (data) => {
  pageChart.map(chart => {
    let chartElement = document.querySelector(chart);
    try {
      chartElement._updateTrade(data);
    }catch {
      null;
    }
  })
}


class TonePicker {
  constructor(target, width, height) {
    this.target = target;
    this.width = width;
    this.height = height;
    this.target.width = width;
    this.target.height = height;
    this.color = {r: 255, g: 0, b: 0};

    this.context = this.target.getContext("2d", { willReadFrequently: true });

    this.pickerCircle = {x: 10, y: 10, width: 9, height: 9};
    this.pickerBorder = {x: 10, y: 10, width: 10, height: 10};

    this.listenForEvents();
  }

  draw() {
    this.build();
  }

  build() {
    let gradient = this.context.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, `rgb(${this.color.r > 0 ? this.color.r - 1 : this.color.r}, ${this.color.g > 0 ? this.color.g - 1 : this.color.g},
                              ${this.color.b > 0 ? this.color.b - 1 : this.color.b})`);
    gradient.addColorStop(1, `rgb(${this.color.r < 255 ? this.color.r + 1 : this.color.r}, ${this.color.g < 255 ? this.color.g + 1 : this.color.g},
                              ${this.color.b < 255 ? this.color.b + 1 : this.color.b})`);

    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);

    gradient = this.context.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.33, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.33, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);

    this.context.beginPath();
    this.context.arc(this.pickerCircle.x, this.pickerCircle.y, this.pickerCircle.width, 0, 2 * Math.PI);
    this.context.lineWidth = 2;
    this.context.strokeStyle = "white";
    this.context.stroke();
    this.context.closePath();

    this.context.beginPath();
    this.context.arc(this.pickerBorder.x, this.pickerBorder.y, this.pickerBorder.width, 0, 2 * Math.PI);
    this.context.lineWidth = 1;
    this.context.strokeStyle = "black";
    this.context.stroke();
    this.context.closePath();
  }

  listenForEvents() {
    let isMouseDown = false;

    const onMouseDown = (e) => {
      isMouseDown = true;
      let offset = this.target.getBoundingClientRect();
      let currentX = e.clientX - offset.left;
      let currentY = e.clientY - offset.top;
      this.pickerCircle.x = currentX;
      this.pickerCircle.y = currentY;
      this.pickerBorder.x = currentX;
      this.pickerBorder.y = currentY;
    }
    const onMouseMove = (e) => {
      if (isMouseDown) {
        let offset = this.target.getBoundingClientRect();
        let currentX = e.clientX - offset.left;
        let currentY = e.clientY - offset.top;
        this.pickerCircle.x = currentX;
        this.pickerCircle.y = currentY;
        this.pickerBorder.x = currentX;
        this.pickerBorder.y = currentY;
      }
    }
    const onMouseUp = () => {
      isMouseDown = false;
    }

    const onTouchStart = (e) => {
      if (e.cancelable) e.preventDefault();
      isMouseDown = true;
      let offset = this.target.getBoundingClientRect();
      let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
			let touch = evt.changedTouches[0] || evt.touches[0];
      let currentX = touch.clientX - offset.left;
      let currentY = touch.clientY - offset.top;
      this.pickerCircle.x = currentX;
      this.pickerCircle.y = currentY;
      this.pickerBorder.x = currentX;
      this.pickerBorder.y = currentY;
    }
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      let offset = this.target.getBoundingClientRect();
      let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
			let touch = evt.changedTouches[0] || evt.touches[0];
      let currentX = touch.clientX - offset.left;
      let currentY = touch.clientY - offset.top;
      this.pickerCircle.x = currentX;
      this.pickerCircle.y = currentY;
      this.pickerBorder.x = currentX;
      this.pickerBorder.y = currentY;
    }
    const onTouchEnd = () => {
      isMouseDown = false;
    }

    if (TOUCH) {
      this.target.addEventListener("touchstart", onTouchStart);
      this.target.addEventListener("touchmove", onTouchMove);
      this.target.addEventListener("touchmove", () => this.onChangeCallback(this.getPickedColor()));
      this.target.addEventListener("touchend", onTouchEnd);
    }
    else {
      this.target.addEventListener("mousedown", onMouseDown);
      this.target.addEventListener("mousemove", onMouseMove);
      this.target.addEventListener("mousemove", () => this.onChangeCallback(this.getPickedColor()));
      document.addEventListener("mouseup", onMouseUp);
    }
  }

  onRisize(width, height) {
    this.width = width;
    this.height = height;
  }

  getPickedColor() {
    let imageData = this.context.getImageData(this.pickerCircle.x, this.pickerCircle.y, 1, 1);
    return { r: imageData.data[0], g: imageData.data[1], b: imageData.data[2] };
  }

  onChange(callback) {
    this.onChangeCallback = callback;
  }
}


function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}


class ColorPicker {
  constructor(target, width, height, tonePickerElement) {
    this.target = target;
    this.width = width;
    this.height = height;
    this.target.width = width;
    this.target.height = height;
    this.tonePicker = new TonePicker(tonePickerElement, width, width);
    this.input = undefined;
    this.value = {r: 255, g: 0, b: 0};

    setInterval(() => this.tonePicker.draw(), 1);
    this.tonePicker.onChange((color) => {
      this.value = rgbToHex(color.r, color.g, color.b);
    });

    this.context = this.target.getContext("2d", { willReadFrequently: true });

    this.pickerCircle = {x: 0, y: 7, width: 6, height: 8};

    this.listenForEvents();
  }

  draw() {
    this.build();
  }

  build() {
    let gradient = this.context.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, "rgb(255, 0, 0)");
    gradient.addColorStop(0.15, "rgb(255, 0, 255)");
    gradient.addColorStop(0.33, "rgb(0, 0, 255)");
    gradient.addColorStop(0.49, "rgb(0, 255, 255)");
    gradient.addColorStop(0.67, "rgb(0, 255, 0)");
    gradient.addColorStop(0.84, "rgb(255, 255, 0)");
    gradient.addColorStop(1, "rgb(255, 0, 0)");

    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);

    this.context.beginPath();
    this.context.arc(this.pickerCircle.x, this.pickerCircle.y, this.pickerCircle.width, 0, 2 * Math.PI);
    this.context.lineWidth = 2;
    this.context.strokeStyle = "white";
    this.context.stroke();
    this.context.closePath();
  }

  listenForEvents() {
    let isMouseDown = false;

    const onMouseDown = (e) => {
      let offset = this.target.getBoundingClientRect();
      let currentX = e.clientX - offset.left;
      let currentY = 7;
      isMouseDown = true;
      this.pickerCircle.x = currentX;
      this.pickerCircle.y = currentY;
    }
    const onMouseMove = (e) => {
      if (isMouseDown) {
        let offset = this.target.getBoundingClientRect();
        let currentX = e.clientX - offset.left;
        let currentY = 7;
        this.pickerCircle.x = currentX;
        this.pickerCircle.y = currentY;
      }
    }
    
    const onMouseUp = () => {
      isMouseDown = false;
    }

    const onTouchStart = (e) => {
      if (e.cancelable) e.preventDefault();
      isMouseDown = true;
      let offset = this.target.getBoundingClientRect();
      let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
			let touch = evt.changedTouches[0] || evt.touches[0];
      let currentX = touch.clientX - offset.left;
      let currentY = 7;
      this.pickerCircle.x = currentX;
      this.pickerCircle.y = currentY;
    }
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      let offset = this.target.getBoundingClientRect();
      let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
			let touch = evt.changedTouches[0] || evt.touches[0];
      let currentX = touch.clientX - offset.left;
      let currentY = 7;
      this.pickerCircle.x = currentX;
      this.pickerCircle.y = currentY;
    }
    const onTouchEnd = () => {
      isMouseDown = false;
    }

    if (TOUCH) {
      this.target.addEventListener("touchstart", onTouchStart);
      this.target.addEventListener("touchmove", onTouchMove);
      this.target.addEventListener("touchmove", () => this.onChangeCallback(this.getPickedColor()));
      this.target.addEventListener("touchend", onTouchEnd);
    }
    else {
      this.target.addEventListener("mousedown", onMouseDown);
      this.target.addEventListener("mousemove", onMouseMove);
      this.target.addEventListener("mousemove", () => this.onChangeCallback(this.getPickedColor()));
      document.addEventListener("mouseup", onMouseUp);
    }
  }

  onRisize(width, height) {
    this.width = width;
    this.height = height;
  }

  getPickedColor() {
    let imageData = this.context.getImageData(this.pickerCircle.x, this.pickerCircle.height - 1, this.pickerCircle.width, this.pickerCircle.height);
    return { r: imageData.data[0], g: imageData.data[1], b: imageData.data[2] };
  }

  onChange(callback) {
    this.onChangeCallback = callback;
  }

  setToneColor(color) {
    this.tonePicker.color = color;
  }
}

export const initializeColorPicker = (colorPickerElement, colorPickerWidth, colorPickerHeight, tonePickerElement, colorBox) => {
  let colorPicker = new ColorPicker(colorPickerElement, colorPickerWidth, colorPickerHeight, tonePickerElement, colorBox);

  setInterval(() => colorPicker.draw(), 1);
  colorPicker.onChange((color) => {
    colorPicker.setToneColor(color);
    let tone = colorPicker.tonePicker.getPickedColor();
    colorPicker.value = rgbToHex(tone.r, tone.g, tone.b);
  });

  return colorPicker;
}