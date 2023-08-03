import { timeToLocal } from '/static/js/chartResources.js';
let indicatorsObjList = [];
let tradesObjList = [];
let candlestickData = undefined;

const SECONDS_IN_A_MINUTE = 60;
const LWTypetoArray = {
  lines: 'sdata',
  baselines: 'bdata',
  histograms: 'hdata',
}

const initialColorSetting = {
  long: {
    baseValue: { type: 'price', price: 0 },
    topFillColor1: 'rgba(36, 164, 156, 0.3)',
    topFillColor2: 'rgba(36, 164, 156, 0.3)',
    topLineColor: 'rgba(36, 164, 156, 0)',
    bottomFillColor1: 'rgba(236, 84, 84, 0.3)',
    bottomFillColor2: 'rgba(236, 84, 84, 0.3)',
    bottomLineColor: 'rgba(236, 84, 84, 0)',
    axisLabelVisible: false,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  },
  short: {
    baseValue: { type: 'price', price: 0 },
    topFillColor1: 'rgba(236, 84, 84, 0.3)',
    topFillColor2: 'rgba(236, 84, 84, 0.3)',
    topLineColor: 'rgba(236, 84, 84, 0)',
    bottomFillColor1: 'rgba(36, 164, 156, 0.3)',
    bottomFillColor2: 'rgba(36, 164, 156, 0.3)',
    bottomLineColor: 'rgba(36, 164, 156, 0)',
    axisLabelVisible: false,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  },
  win: {
    baseValue: { type: 'price', price: 0 },
    topFillColor1: 'rgba(36, 164, 156, 0.3)',
    topFillColor2: 'rgba(36, 164, 156, 0.3)',
    topLineColor: 'rgba(36, 164, 156, 0)',
    bottomFillColor1: 'rgba(236, 84, 84, 0.3)',
    bottomFillColor2: 'rgba(236, 84, 84, 0.3)',
    bottomLineColor: 'rgba(236, 84, 84, 0)',
    axisLabelVisible: false,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  },
  loss: {
    baseValue: { type: 'price', price: 0 },
    topFillColor1: 'rgba(236, 84, 84, 0.3)',
    topFillColor2: 'rgba(236, 84, 84, 0.3)',
    topLineColor: 'rgba(236, 84, 84, 0)',
    bottomFillColor1: 'rgba(36, 164, 156, 0.3)',
    bottomFillColor2: 'rgba(36, 164, 156, 0.3)',
    bottomLineColor: 'rgba(36, 164, 156, 0)',
    axisLabelVisible: false,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  },
}

export const initializeIndicators = (InitializeCandlestickApiObj, indicators, timeframe) => {
  removeIndicatorsData(indicators);
  let externalIndicatorCount = TOUCH & window.innerWidth <= 430 ? null : initializeExternalIndicators(indicators);
  const paddingPx = InitializeCandlestickApiObj.open[0].toFixed(2).toString().length;
  for (let i=0; i<indicators.length; i++) {
    switch(indicators[i].indicator) {
      case 'volume':
        new Volume('volume', timeframe);
        break;
      
      case 'sma':
        new Sma('main', indicators[i], indicators[i].color);
        break;
      
      case 'ema':
        new Ema('main', indicators[i], indicators[i].color);
        break;

      case 'rsi':
        externalIndicatorCount -= 1;
        TOUCH & window.innerWidth <= 430 ? null : new Rsi('rsi', indicators[i], indicators[i].color, externalIndicatorCount==0, paddingPx);
        break;
      
      case 'macd':
        TOUCH & window.innerWidth <= 430 ? null : new Macd('macd', indicators[i], timeframe, indicators[i].color, externalIndicatorCount==0, paddingPx);
        break;
    }
  }
  return indicatorsObjList;
}


export const clearChart = () => {
  const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');

  if(chartElement.hdata.length > 0){
    let histogramsLength = chartElement.hdata.length;
    for(let i=0; i<histogramsLength; i++) {
      chartElement.chart.removeSeries(chartElement.histograms[0]);
      chartElement.histograms.splice(0, 1);
      chartElement.hdata.splice(0, 1);
    }
  }

  if(chartElement.bdata.length > 0){
    let baselinesLength = chartElement.bdata.length;
    for(let i=0; i<baselinesLength; i++) {
      chartElement.chart.removeSeries(chartElement.baselines[0]);
      chartElement.baselines.splice(0, 1);
      chartElement.bdata.splice(0, 1);
    }
  }

  if(chartElement.sdata.length > 0){
    let linesLength = chartElement.sdata.length;
    for(let i=0; i<linesLength; i++) {
      chartElement.chart.removeSeries(chartElement.lines[0]);
      chartElement.lines.splice(0, 1);
      chartElement.sdata.splice(0, 1);
    }
  }
  return;
}


export const initializeTrades = (candlestick) => {
  tradesObjList = []
  candlestickData = candlestick;
  for (let i=0; i<candlestickData.trades.length; i++) {
    if (!(tradesObjList.map(t => t.start).includes(candlestickData.trades[i].startDate))) {
      const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');

      if (!candlestickData.trades[i].endDate) candlestickData.trades[i].endDate = candlestickData.timestamp[candlestickData.timestamp.length - 1];
      let tradeStartIndex = candlestickData.timestamp.indexOf(candlestickData.trades[i].startDate);
      let tradeEndIndex = candlestickData.timestamp.indexOf(candlestickData.trades[i].endDate);
      let tpBaseline = [];
      let slBaseline = [];
      let priceFollowBaseline = [];

      while (tradeStartIndex <= tradeEndIndex) {
        priceFollowBaseline.push({time: candlestickData.date[tradeStartIndex], value: candlestickData.close[tradeStartIndex]});
        tpBaseline.push({time: candlestickData.date[tradeStartIndex], value: candlestickData.trades[i].takeProfit});
        slBaseline.push({time: candlestickData.date[tradeStartIndex], value: candlestickData.trades[i].stopLoss});
        tradeStartIndex += 1;
      }

      chartElement.bdata = tpBaseline;
      chartElement.bdata = slBaseline;
      chartElement.bdata = priceFollowBaseline;
      
      candlestickData.trades[i].position ? initialColorSetting.long.baseValue.price = candlestickData.trades[i].openPrice : initialColorSetting.short.baseValue.price = candlestickData.trades[i].openPrice;
      chartElement.baselines[chartElement.bdata.length - 3].applyOptions(candlestickData.trades[i].position ? initialColorSetting.long : initialColorSetting.short);
      chartElement.baselines[chartElement.bdata.length - 2].applyOptions(candlestickData.trades[i].position ? initialColorSetting.long : initialColorSetting.short);
      chartElement.baselines[chartElement.bdata.length - 1].applyOptions(candlestickData.trades[i].position ? initialColorSetting.long : initialColorSetting.short);
      tradesObjList.push({position: candlestickData.trades[i].position,
                          start: timeToLocal(candlestickData.trades[i].startDate),
                          end: timeToLocal(candlestickData.trades[i].endDate),
                          open: candlestickData.trades[i].openPrice,
                          takeProfit: tpBaseline[0].value,
                          stopLoss: slBaseline[0].value,
                          result: candlestickData.trades[i].result});
    }
  }
  return tradesObjList;
}

export const updateTrade = (trade) => {
  const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
  if (trade.endDate == true) {
    tradesObjList.push({position: candlestickData.trades[candlestickData.trades.length - 1].position,
                        start: timeToLocal(candlestickData.trades[candlestickData.trades.length - 1].startDate),
                        end: timeToLocal(candlestickData.trades[candlestickData.trades.length - 1].endDate),
                        takeProfit: tpBaseline[0].value,
                        stopLoss: slBaseline[0].value,
                        result: candlestickData.trades[candlestickData.trades.length - 1].result});
  }
  else if ((candlestickData.trades.length == 0) || ((trade.startDate)&&(candlestickData.trades[candlestickData.trades.length - 1].startDate !== trade.startDate))) {
    candlestickData.trades.push(trade);
    chartElement.bdata = [{time: candlestickData.date[candlestickData.date.length - 1], value: candlestickData.trades[candlestickData.trades.length - 1].takeProfit}];
    chartElement.bdata = [{time: candlestickData.date[candlestickData.date.length - 1], value: candlestickData.trades[candlestickData.trades.length - 1].stopLoss}];
    chartElement.bdata = [{time: candlestickData.date[candlestickData.date.length - 1], value: candlestickData.close[candlestickData.close.length - 1]}];
    
    candlestickData.trades[candlestickData.trades.length - 1].position ? initialColorSetting.long.baseValue.price = candlestickData.trades[candlestickData.trades.length - 1].openPrice : initialColorSetting.short.baseValue.price = candlestickData.trades[candlestickData.trades.length - 1].openPrice;
    chartElement.baselines[chartElement.bdata.length - 3].applyOptions(candlestickData.trades[candlestickData.trades.length - 1].position ? initialColorSetting.long : initialColorSetting.short);
    chartElement.baselines[chartElement.bdata.length - 2].applyOptions(candlestickData.trades[candlestickData.trades.length - 1].position ? initialColorSetting.long : initialColorSetting.short);
    chartElement.baselines[chartElement.bdata.length - 1].applyOptions(candlestickData.trades[candlestickData.trades.length - 1].position ? initialColorSetting.long : initialColorSetting.short);
  }
  else {
    chartElement.baselines[chartElement.bdata.length - 3].update({time: candlestickData.date[candlestickData.date.length - 1], value: candlestickData.trades[candlestickData.trades.length - 1].takeProfit});
    chartElement.baselines[chartElement.bdata.length - 2].update({time: candlestickData.date[candlestickData.date.length - 1], value: candlestickData.trades[candlestickData.trades.length - 1].stopLoss});
    chartElement.baselines[chartElement.bdata.length - 1].update({time: candlestickData.date[candlestickData.date.length - 1], value: candlestickData.close[candlestickData.close.length - 1]});
  }
}

import { secondaryChart } from '/static/js/indicator_chart.js';
import { TOUCH } from '/static/js/chartResources.js';

function removeIndicatorsData(indicators) {
  for (let i=0; i<indicatorsObjList.length; i++) {
    try{
      if (indicatorsObjList[i].chart === 'main' || indicatorsObjList[i].chart === 'volume') {
        const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
        chartElement.chart.removeSeries(chartElement[indicatorsObjList[i].type][0]);
        chartElement[indicatorsObjList[i].type].splice(0, 1);
        chartElement[LWTypetoArray[indicatorsObjList[i].type]].splice(0, 1);
      }
      else {
        const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${indicatorsObjArray[i].name}-${indicatorsObjArray[i].period}`).shadowRoot.querySelector(`#${indicatorsObjList[i].name}`);
        chartElement.chart.removeSeries(chartElement[indicatorsObjList[i].type][0]);  
        chartElement[indicatorsObjList[i].type].splice(0, 1);
        chartElement[LWTypetoArray[indicatorsObjList[i].type]].splice(0, 1);       
      }
    }catch{}
    indicators[i].color = indicatorsObjList[i].color;
  }
  indicatorsObjList.length = 0;
}




function initializeExternalIndicators(indicators) {
  let externalIndicatorCount = indicators.map(indicators => indicators.chart).filter(chart => chart === true).length;
  for (let i=0; i<indicators.length; i++) {
    let period = undefined;
    switch(indicators[i].indicator) {
      case 'rsi':
        period = JSON.parse(indicators[i].params).close;
        try{
          document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`rsi-${period}`).shadowRoot.querySelector(`#rsi`);	
        }catch{
          secondaryChart('rsi', period, indicatorsObjList);
        }
        break;
      
      case 'macd':
        period = JSON.parse(indicators[i].params).close;
        try{
          document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`macd-${period}`).shadowRoot.querySelector(`#macd`);	
        }catch{
          secondaryChart('macd', period, indicatorsObjList);
        }
        break;
    }
  }
  return externalIndicatorCount;
}



const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;



class Volume {
  name = 'volume';
  type = 'histograms';
  index = undefined;
  chart = undefined;
  #data = [];
  displayValue = true;

  constructor(chart, timeframe){
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    this.index = chartElement.histograms.length;
    this.chart = chart;
    this.Volume(timeframe);
  }

  initializeVolume(timeframe){
    let tempDate = candlestickData.date;
    for (let i=0; i<candlestickData.volume.length; i++) {
      let color = ((candlestickData.open[i] > candlestickData.close[i]) ? '#EC5454' : '#24A49C');
      this.#data.push({time: tempDate,
                       value: candlestickData.volume[i],
                       color: color});

      tempDate += 60 * timeframe;
    }
    return;
  }

  update(values, color) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    let date = this.#data[-1].time * 2 - this.#data[-2].time;
    chartElement.lines[this.index].update({time: date,
                                            value: values,
                                            color: color});
    return;
  }

  Volume(timeframe) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    this.initializeVolume(timeframe);
    chartElement.hdata = this.#data;
    indicatorsObjList.push(this);

    chartElement.histograms[this.index].applyOptions({priceScaleId: 'left',
                                                       scaleMargins: {
                                                        top: 0.7,
                                                        bottom: 0
                                                        }});
}
}




class Sma {
  name = 'sma';
  type = 'lines';
  index = undefined;
  chart = undefined;
  period = undefined;
  color = undefined;
  #data = [];
  displayValue = true;


  constructor(chart, indicator, color) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    this.period = JSON.parse(indicator.params).close;
    this.index = chartElement.sdata.length;
    this.chart = chart;
    this.color = color;
    this.Sma(indicator);
  }

  initializeSma(values, time) {
    for (let i=0; i<time.length; i++) {
      this.#data.push( i < this.period ? {time: time[i]} : {time: time[i], value: values[i - this.period]});
    }
    return;
  }

  update(time) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    let nextValue = sma(candlestickData.close, this.period);
    chartElement.lines[this.index].update({time: time,
                                            value: nextValue[nextValue.length - 1]});
    this.#data[this.#data.length - 1].time == time ? this.#data[this.#data.length - 1].value = nextValue[nextValue.length - 1] : this.#data.push({time: time, value: nextValue[nextValue.length - 1]});
    return;
  }

  Sma(indicator) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    this.initializeSma(sma(candlestickData.close, this.period), candlestickData.date);
    chartElement.sdata = this.#data;

    indicatorsObjList.push(this);

    if (this.chart == 'volume') {
      chartElement.lines[this.index].applyOptions({priceScaleId: 'left'});
    }
    chartElement.lines[this.index].applyOptions({lineWidth: 2,
                                                  color: indicator.color,
                                                  priceScale: {
                                                    autoScale: false
                                                  }});
  }
}




class Ema {
  name = 'ema';
  type = 'lines';
  index = undefined;
  chart = undefined;
  period = undefined;
  color = undefined;
  #data = [];
  displayValue = true;


  constructor(chart, indicator, color) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    this.period = JSON.parse(indicator.params).close;
    this.index = chartElement.sdata.length;
    this.chart = chart;
    this.color = color;
    this.Ema(indicator);
  }

  initializeEma(values, time) {
    for (let i=0; i<time.length; i++) {
      this.#data.push( i < this.period ? {time: time[i]} : {time: time[i], value: values[i - this.period]});
    }
    return;
  }

  update(time) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart')
    let nextValue = ema(candlestickData.close, this.period);
    chartElement.lines[this.index].update({time: time, 
                                           value: nextValue[nextValue.length - 1]});
    this.#data[this.#data.length - 1].time == time ? this.#data[this.#data.length - 1].value = nextValue[nextValue.length - 1] : this.#data.push({time: time, value: nextValue[nextValue.length - 1]});
    return;
  }

  Ema(indicator) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    this.initializeEma(ema(candlestickData.close, this.period), candlestickData.date);
    chartElement.sdata = this.#data;

    indicatorsObjList.push(this);

    if (this.chart == 'volume') {
      chartElement.lines[this.index].applyOptions({priceScaleId: 'left'});
    }
    chartElement.lines[this.index].applyOptions({lineWidth: 2,
                                                  color: indicator.color,
                                                  priceScale: {
                                                    autoScale: false
                                                  }});
  }
}




class Rsi {
  name = 'rsi';
  type = 'lines';
  index = undefined;
  chart = undefined;
  period = undefined;
  averageGain = 0;
  averageLoss = 0;
  color = undefined;
  #data = [];
  displayValue = true;


  constructor(chart, indicator, color, timeScale, padding) {
    this.period = JSON.parse(indicator.params).close;
    this.index = 0;
    this.chart = chart;
    this.color = color;
    this.Rsi(indicator, timeScale, padding);
  }

  initializeRsi(rsiValues, time) {
    for (let i=0; i<time.length; i++) {
      this.#data.push( i < this.period ? {time: time[i]} : {time: time[i], value: rsiValues[i - this.period]});
    }
    return;
  }

  update(time) {
    const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);
    let nextValue = RSI.calculate({values: candlestickData.close, period: this.period});
    chartElement.lines[this.index].update({time: time,
                                            value: nextValue[nextValue.length - 1]});
    this.#data[this.#data.length - 1].time == time ? this.#data[this.#data.length - 1].value = nextValue[nextValue.length - 1] : this.#data.push({time: time, value: nextValue[nextValue.length - 1]});
    return;
  }

  addTrades() {
    for (let i=0; i<candlestickData.trades.length; i++) {
      const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);

      let tradeStartIndex = candlestickData.timestamp.indexOf(candlestickData.trades[i].startDate);
      let tradeEndIndex = candlestickData.timestamp.indexOf(candlestickData.trades[i].endDate);
      let rsiBaseline = [];

      while (tradeStartIndex <= tradeEndIndex) {
        rsiBaseline.push({time: candlestickData.date[tradeStartIndex], value: 70});
        tradeStartIndex += 1;
      }
    
      chartElement.bdata = rsiBaseline;
      chartElement.baselines[i].applyOptions((tradesObjList[i].result >= 0) ? initialColorSetting.win : initialColorSetting.loss);
    }
  }

  clearChart() {
    let chartElement = undefined;

    try {
      chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);
      if (!chartElement) return;
    }catch {return;}

    let rsiPriceLinesLength = chartElement.sdata.length;
    let rsiTradesLength = chartElement.bdata.length;

    for (let i=0; i<rsiPriceLinesLength; i++) {
      chartElement.chart.removeSeries(chartElement.lines[0]);
      chartElement.lines.splice(0, 1);
      chartElement.sdata.splice(0, 1);
    }

    for (let i=0; i<rsiTradesLength; i++) {
      chartElement.chart.removeSeries(chartElement.baselines[0]);
      chartElement.baselines.splice(0, 1);
      chartElement.bdata.splice(0, 1);
    }
  }

  Rsi(indicator, timeScale, padding) {
    this.clearChart();
    let chartElement = undefined;
    this.initializeRsi(RSI.calculate({values: candlestickData.close, period: this.period}), candlestickData.date);

    chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);	
    chartElement.sdata = this.#data;
    this.index = chartElement.lines.length - 1;

    this.addTrades();

    indicatorsObjList.push(this);

    chartElement.chart.applyOptions({localization: {
                              priceFormatter: (price) => `${price.toFixed(padding - (price.toFixed(0).toString().length + 1))}`,
                              },
                              handleScale: {
                                axisPressedMouseMove: {
                                  price: false,
                                },
                              },
                            });
    chartElement.chart.timeScale().applyOptions({visible: timeScale});
    chartElement.lines[this.index].applyOptions({lineWidth: TOUCH ? 1 : 2,
                                                  color: indicator.color});
  }
}


class Macd {
  name = 'macd';
  index = undefined;
  chart = undefined;
  period = undefined;
  averageGain = 0;
  averageLoss = 0;
  color = undefined;
  #data = [];


  constructor(chart, indicator, timeframe, color, timeScale, padding) {
    this.period = JSON.parse(indicator.params).close;
    this.index = 0;
    this.chart = chart;
    this.color = color;
    this.Macd(indicator, timeframe, timeScale, padding);
  }

  initializeMacd(rsiValues, date, timeframe) {
    let tempDate = date;
    for (let i=0; i<rsiValues.length + parseInt(this.period); i++) {
      this.#data.push( i < this.period ? {time: tempDate} : {time: tempDate, value: rsiValues[i - this.period]});
      tempDate += 60 * timeframe;
    }
    return;
  }

  update(values) {
    return;
  }

  addTrades(timeframe) {
    for (let i=0; i<tradesObjList.length; i++) {
      const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);

      let tradeTime = tradesObjList[i].start;
      let macdBaseline = [];

      while (tradeTime <= tradesObjList[i].end) {
        macdBaseline.push({time: tradeTime, value: 70});
        tradeTime += timeframe * 60;
      }
    
      chartElement.bdata = macdBaseline;
      chartElement.baselines[i].applyOptions((tradesObjList[i].result >= 0) ? initialColorSetting.win : initialColorSetting.loss);
    }
  }

  clearChart() {
    let chartElement = undefined;

    try {
      chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);
      if (!chartElement) return;
    }catch {return;}

    let macdPriceLinesLength = chartElement.sdata.length;
    let macdTradesLength = chartElement.bdata.length;

    for (let i=0; i<macdPriceLinesLength; i++) {
      chartElement.chart.removeSeries(chartElement.lines[0]);
      chartElement.lines.splice(0, 1);
      chartElement.sdata.splice(0, 1);
    }

    for (let i=0; i<macdTradesLength; i++) {
      chartElement.chart.removeSeries(chartElement.baselines[0]);
      chartElement.baselines.splice(0, 1);
      chartElement.bdata.splice(0, 1);
    }
  }

  Macd(indicator, timeframe, timeScale, padding) {
    this.clearChart();
    let chartElement = undefined;
    let rsiValues = RSI.calculate({values: candlestickData.close, period: this.period});
    let rsiDate = candlestickData.date[0];
    this.initializeMacd(rsiValues, rsiDate, timeframe);

    chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${this.name}-${this.period}`).shadowRoot.querySelector(`#${this.name}`);	
    chartElement.sdata = this.#data;
    this.index = chartElement.lines.length - 1;

    this.addTrades(timeframe);

    let dataLenght = this.#data[this.#data.length - 1]['value'].toFixed(2).toString().length;

    indicatorsObjList.push({name: this.name,
                            type: 'lines',
                            period: this.period,
                            index: this.index,
                            chart: this.chart,
                            color: this.color,
                            displayValue: true,
                            averageGain: this.averageGain,
                            averageLoss: this.averageLoss});

    chartElement.chart.applyOptions({localization: {
                              priceFormatter: (price) => `${price.toFixed(2).padEnd(3 * (padding - dataLenght) + 1)}`,
                              },
                              handleScale: {
                                axisPressedMouseMove: {
                                  price: false,
                                },
                              },
                            });
    chartElement.chart.timeScale().applyOptions({visible: timeScale});
    chartElement.lines[this.index].applyOptions({lineWidth: TOUCH ? 1 : 2,
                                                  color: indicator.color});
  }
}