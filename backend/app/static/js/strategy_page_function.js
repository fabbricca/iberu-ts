import { addHistoricalCandlesticks } from '/static/js/chartResources.js';
import { getUpdatingCandlesticksLock } from '/static/js/chartResources.js';
import { getCandlesticksData } from '/static/js/chartResources.js';
import { uidTokenApi } from '/static/js/base.js';
import { TOUCH } from '/static/js/chartResources.js';

const LABELS_NUMBER = 8;
const PANEL_ORDER = {
  'header-container': '#description-container',
  'description-container': '#buy-container',
  'buy-container': '#performance-container',
  'performance-container': '#chart-container',
  'chart-container': '#earning-container',
  'earning-container': '#info-container',
  'info-container': '#trade-distribution-container',
  '#trade-distribution-container': '#trades-container',
};

let candlestickData = getCandlesticksData();
let candlestickDate = candlestickData.date[0];

function showTradeOnChart(fromDate, toDate) {
  if (!fromDate && !toDate) return;
  fromDate = parseInt(fromDate);
  toDate = parseInt(toDate);
  const candlestickChartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
  const visibleRange = candlestickChartElement.chart.timeScale().getVisibleRange();
  const visibleRangeWidth = (visibleRange.to - visibleRange.from > 25000) ? 25000 : visibleRange.to - visibleRange.from

  candlestickChartElement.chart.timeScale().setVisibleRange({from: fromDate - visibleRangeWidth, to: fromDate + visibleRangeWidth});
  candlestickChartElement.chart.priceScale().applyOptions({autoScale: true});
}


async function monthlyTradesDropdown(monthIndex, startPeriod) {
  const dropdown = document.querySelector(`#dropdown-monthly-performance-${monthIndex}`);
  const dropdownTrades = document.querySelector(`#dropdown-monthly-performance-${monthIndex}-trades`);
  if (!dropdownTrades.classList.contains('hide')) {
    dropdown.querySelector('.fa-angle-up').classList.add('hide');
    dropdown.querySelector('.fa-angle-down').classList.remove('hide');
    dropdownTrades.classList.add('hide');
    return;
  }
  dropdown.querySelector('.fa-angle-down').classList.add('hide');
  dropdown.querySelector('.loader').classList.remove('hide');
  const candlestickChartContainer = document.querySelector('lightweight-chart-container');
  const visibleRange = candlestickChartContainer ? candlestickChartContainer.shadowRoot.querySelector('#candlestick-chart').chart.timeScale().getVisibleRange() : undefined;
  let historicalCandlesticksRequest = !getUpdatingCandlesticksLock();
  while (candlestickDate > startPeriod && historicalCandlesticksRequest === true) {
    historicalCandlesticksRequest = await addHistoricalCandlesticks();
    candlestickDate = getCandlesticksData().date[0];
  }
  dropdown.querySelector('.loader').classList.add('hide');
  dropdown.querySelector('.fa-angle-up').classList.remove('hide');
  dropdownTrades.classList.remove('hide');
  if (candlestickChartContainer) candlestickChartContainer.shadowRoot.querySelector('#candlestick-chart').chart.timeScale().setVisibleRange(visibleRange);
}


function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return false;
}

const new_user = getCookie('uid');
if (new_user === false) {
  const cookie = await uidTokenApi();
  const tutorial = document.querySelector('.tutorial');
  const startTutorial = document.querySelector('#start-tutorial');
  document.cookie = `uid=${cookie.uidToken}`;
  if(TOUCH === false & tutorial){
    tutorial.classList.add('show');
    tutorial.querySelector('.next-btn').addEventListener('click', () => {
      tutorial.classList.remove('show');
      startTutorial.click();
    });
  }
}


const easyPieContainer = document.querySelector('#strategy-doughnut-chart');
const easyPieCharts = document.querySelectorAll('.easy-pie-chart');
easyPieCharts.forEach(chart => {
  new EasyPieChart(chart, {
                    size: 50,
                    barColor: chart.dataset.percent >= 0 ? "rgba(36, 164, 156, 0.8)" : "rgba(236, 84, 84, 0.8)",
                    scaleLength: 0,
                    lineWidth: 3,
                    trackColor: "#606060",
                    lineCap: "circle",
  });
});
easyPieContainer.classList.remove('hide');


const tradeDistributionChart = document.querySelector("#trade-distribution");
const noTrades = document.querySelectorAll(".no-trade");
const divisor = -Math.min(...candlestickData.trades_result) > Math.max(...candlestickData.trades_result) ? 
                -Math.min(...candlestickData.trades_result) * 2 / LABELS_NUMBER :
                 Math.max(...candlestickData.trades_result) * 2 / LABELS_NUMBER;
let tradeDistributionLabels = [];
let tradesData = new Array(LABELS_NUMBER).fill(0);
if (candlestickData.trades_result.length > 0) {
  for (let i = 0; i <= LABELS_NUMBER; i++) {
    if (i != LABELS_NUMBER / 2)
      -Math.min(...candlestickData.trades_result) > Math.max(...candlestickData.trades_result) ?
      tradeDistributionLabels.push((Math.min(...candlestickData.trades_result) + i * divisor).toFixed(2)) : 
      tradeDistributionLabels.push((-Math.max(...candlestickData.trades_result) + i * divisor).toFixed(2));
  }
  candlestickData.trades_result.forEach(trade => {
    let check = false;
    let i = 0;
    while (check === false) {
      if (trade <= parseFloat(tradeDistributionLabels[i])) {
        check = true;
        trade >= 0 ? tradesData[i] += 1 : tradesData[i == 0 ? i : i - 1] += 1;
      }
      i += 1;
    }
  });
}
else {
  tradeDistributionChart.classList.add('fade');
  noTrades[0].classList.remove('hide');
  tradesData = [0, 2, 1, 7, 16, 33, 12, 7];
}
new Chart(tradeDistributionChart.getContext("2d"), {
  type: 'bar',
  data: {
    labels: tradeDistributionLabels,
    datasets: [{
        data: tradesData,
        backgroundColor: ['rgba(236, 84, 84, 0.5)', 'rgba(236, 84, 84, 0.5)', 'rgba(236, 84, 84, 0.5)', 'rgba(236, 84, 84, 0.5)', 'rgba(36, 164, 156, 0.5)', 'rgba(36, 164, 156, 0.5)', 'rgba(36, 164, 156, 0.5)', 'rgba(36, 164, 156, 0.5)'],
        borderWidth: 2,
        categoryPercentage: 1.0,
        barPercentage: 1.0,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: function(tooltipItems, data) {
            if (tooltipItems[0].dataIndex < 3) return `${tradeDistributionLabels[tooltipItems[0].dataIndex]}% and ${parseFloat(tradeDistributionLabels[tooltipItems[0].dataIndex + 1] - 0.01).toFixed(2)}%`;
            else if (tooltipItems[0].dataIndex == 3) return `${tradeDistributionLabels[3]}% and -0.01%`;
            else if (tooltipItems[0].dataIndex == 4) return `0.00% and ${tradeDistributionLabels[4]}%`;
            return `${parseFloat(tradeDistributionLabels[tooltipItems[0].dataIndex - 1] + 0.01).toFixed(2)}% and ${tradeDistributionLabels[tooltipItems[0].dataIndex]}%`;
          },
          label: function(tooltipItems, data) {
            return 'Trades: ' + tradesData[tooltipItems.dataIndex]
          }
        },
      },
    },
    scales: {
      y: {
        ticks: {
            display: false
        },
        grid: {
          drawBorder: false,
          display: false,
        },
      },
      x: {
        ticks: {
          display: !TOUCH,
        },
        grid: {
          drawBorder: false,
          display: false,
        },
      },
    }
  },
});


const timeDistributionChart = document.querySelector("#time-distribution");
let backgroundColor = [];
let tradesResult = [];
if (candlestickData.trades_result.length > 0) {
  candlestickData.trades_result.forEach(trade => {
    trade < 0 ? backgroundColor.push('rgba(236, 84, 84, 0.5)') : backgroundColor.push('rgba(36, 164, 156, 0.5)');
    tradesResult.push(trade);
  });
  if (tradesResult.length < 20) 
    for (let i = tradesResult.length; i < 20; i++) {
      tradesResult.push(0);
    }
}
else {
  document.querySelector("#time-distribution").classList.add('fade');
  document.querySelectorAll(".no-trade")[1].classList.remove('hide');
  tradesResult = [1.3, .4, 1, -1.2, .3, -.7, 1.3, -1.3, 2.07, -.5, -.7, 1.45, .3, -.7, 1.3, 1.3, .4, 1, -1.2, 2.07, -.5, -.7, 1.45, .3, -.7, -0.9];
}
new Chart(timeDistributionChart.getContext("2d"), {
  type: 'bar',
  data: {
    labels: tradesResult.map((value, index) => `Label ${index}`),
    datasets: [{
        data: tradesResult,
        backgroundColor: backgroundColor,
        borderWidth: 2,
        categoryPercentage: 1.0,
        barPercentage: 1.0,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      },
    },
    scales: {
      y: {
        grid: {
          drawBorder: false,
          display: false,
        },
      },
      x: {
        ticks: {
          display: false
        },
        grid: {
          drawBorder: false,
          display: false,
        },
      },
    }
  },
});


const tradeAssetDistributionChart = document.querySelector('#trade-asset-distribution');
if (tradeAssetDistributionChart) {
  const assetKeys = Object.keys(candlestickData.trades_asset_dist);
  const assetValues = assetKeys.map(key => candlestickData.trades_asset_dist[key].value);
  const assetColors = assetKeys.map(key => candlestickData.trades_asset_dist[key].color);
  const assetSymbols = assetKeys.map(key => candlestickData.trades_asset_dist[key].symbol);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (error) => reject(error);
      image.src = src;
    });
  };

  const drawImagePlugin = {
    id: 'drawImagePlugin',
    afterDraw: (chart) => {
      if (chart.config.type !== 'bar') return;

      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      const barHeight = meta.data[0].height;

      Promise.all(assetKeys.map(name => {
        const src = '/static/img/assets_icons/' + name.toLowerCase() + '.png';
        return loadImage(src);
      })).then(images => {
        images.forEach((image, index) => {
          const x = meta.data[index].x;
          const y = meta.data[index].y;
          if (image.complete) {
            ctx.drawImage(image, x + 2, y - (barHeight / 2), barHeight, barHeight);
          }
        });
      }).catch(error => {
        console.error("Error loading images:", error);
      });
    }
  };

  const chartConfig = {
    type: 'bar',
    data: {
      labels: assetSymbols,
      datasets: [{
        data: assetValues,
        backgroundColor: assetColors,
        borderWidth: 2,
        categoryPercentage: 1.0,
        barPercentage: 0.5,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            label: function(tooltipItems, data) {
              return 'Trades: ' + assetValues[tooltipItems.dataIndex];
            }
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            display: true,
          },
          grid: {
            drawBorder: false,
            display: false,
          },
        },
        x: {
          grace: 0.5,
          ticks: {
            display: false,
          },
          grid: {
            drawBorder: false,
            display: false,
          },
        },
      },
    },
    plugins: [drawImagePlugin], // Add the drawImagePlugin to the plugins array
  };

  new Chart(tradeAssetDistributionChart.getContext("2d"), chartConfig);
}


const startTutorialBtn = document.querySelector('#start-tutorial');
startTutorialBtn.addEventListener('click', (el) => {
  document.querySelector(PANEL_ORDER['header-container']).classList.add('current');
  document.querySelector(PANEL_ORDER['header-container']).querySelector('.panel-about').classList.add('show');
});


const panels = document.querySelectorAll(".panel");
panels.forEach((el) => {
  if (el.querySelector('.panel-about')) {
    el.querySelector('.panel-about').querySelector('.close').addEventListener('click', () => {
      el.classList.remove('current');
      el.querySelector('.panel-about').classList.remove('show');
    });
    if (el.querySelector('.next-btn'))
      el.querySelector('.next-btn').addEventListener('click', () => {
        el.classList.remove('current');
        el.querySelector('.panel-about').classList.remove('show');
        let nextPanel = document.querySelector(PANEL_ORDER[el.id]);
        nextPanel.classList.add('current');
        nextPanel.querySelector('.panel-about').classList.add('show');
        nextPanel.scrollIntoView();
      });
  }
});


const earnings = document.querySelector('#earning').querySelectorAll(".hlist");
earnings.forEach((el) => {
  el.querySelectorAll('button').forEach((elem) => {
    elem.addEventListener('click', () => {
      showTradeOnChart(elem.getAttribute("data-startDate"), elem.getAttribute("data-endDate"));
    });
  })
});


const earningsDropdownBtn = document.querySelectorAll(".dropdown-button");
earningsDropdownBtn.forEach((el) => {
  el.addEventListener('click', () => {
    monthlyTradesDropdown(el.getAttribute("data-id"), el.getAttribute("data-startPeriod"));
  });
});


const buyICheck = document.querySelector("#conditions");
const buyModal = document.querySelector("#strategy-terms-conditions");
const buyConfirmBtn = document.querySelector("#buy-button");
buyICheck.addEventListener("change", () => {
  if (!buyICheck.checked) {
    buyConfirmBtn.classList.toggle("disabled");
    buyConfirmBtn.disabled = true;
  }
  else {
    buyModal.classList.toggle("show");
    termsConditions.scrollTop = 0;
    buyModal.querySelector(".close").classList.toggle("hide");
    buyConfirmBtn.disabled = false;
  }
});


const buyCancelBtn = buyModal.querySelector(".close");
buyCancelBtn.addEventListener("click", () => {
  buyModal.classList.toggle("show");
  buyConfirmBtn.classList.toggle("disabled");
  buyConfirmBtn.disabled = false;
});


const termsConditions = buyModal.querySelector(".body");
termsConditions.onscroll = () => {
  if ((termsConditions.scrollTop + termsConditions.clientHeight + 200) >= termsConditions.scrollHeight) {
    buyModal.querySelector(".close").classList.remove("hide");
  }
};