import '/static/js/lw-chart.js';
import { getCandlesticksData } from '/static/js/chartResources.js';
import { addPageChart } from '/static/js/chartResources.js';
import { addHistoricalCandlesticks } from '/static/js/chartResources.js';
import { getAddHistoricalCandlesticksRequest } from '/static/js/chartResources.js';
import { getUpdatingCandlesticksLock } from '/static/js/chartResources.js';
import { changeColorApi } from '/static/js/chartResources.js';
import { themeColors } from '/static/js/chartResources.js';
import { initializeColorPicker } from '/static/js/chartResources.js';
import { TOUCH } from '/static/js/chartResources.js'


(async function InitializeChart() {

	function hexToRgbA(hex, alpha=1){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+`,${alpha})`;
    }
    throw new Error('Bad Hex');
	}

	let candlesticksData = getCandlesticksData();


	const checkPageTheme = () =>
		document.documentElement.getAttribute('data-theme') === 'dark';

	
	const POPRTFOLIO_LIQUIDITY = 100;
	const SECONDS_IN_A_DAY = 86400;
	const COLOR_PICKER_WIDTH = 150;
	const COLOR_PICKER_HEIGHT = TOUCH ? 20 : 15;

	const template = document.createElement('template');
	template.innerHTML = `
    <style>
    :host {
        display: block;
    }
    :host[hidden] {
        display: none;
    }
		.inner-container {
			font-family: 'Montserrat', sans-serif;
			display: block;
			position: relative;
			font-size: 13px;
			height: 100%;
		}

		#line-chart-container {
			display: flex;
			flex-direction: column;
			height: 100%;
			cursor: crosshair;
		}

		#line-chart {
			display: flex;
			flex-grow: 1;
			height: inherit;
		}

		.hide {
			display: none;
		}

		.show {
			display: block;
		}

		.positive {
				color: #24A49C;
		}
		
		.negative {
				color: #EC5454;
		}

		.fade {
			opacity: .7;
			transition : opacity .05s ease-in-out;
		}

		.fade {
			opacity: .7;
			transition : opacity .05s ease-in-out;
		}

		.chart-modal {
			position: absolute;
			display: none;
			background: white;
			min-width: 150px;
			width: fit-content;
			padding: 15px;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 5;
			color: #202020;
			border-radius: 10px;
		}
		.modal-header {
			display: flex;
			margin: 0 0 10px 0;
			padding: 0;
			justify-content: space-between;
			border-bottom: solid 2px var(--color-separator);
		}

		.modal-header h2 {
			display: inline-block;
			margin: 0;
		}

		.close-btn {	
			display: inline-block;
			height: fit-content;
			background: transparent;
			border: none;
			cursor: pointer;
		}

		.chart-modal label {
				display: block;
		}
		.chart-modal label:first-child {
			padding-top: 10px;
		}
		.chart-modal label:last-child {
			padding-bottom: 10px;
		}

		.submit {
				display: block;
				margin: 0 0 0 auto;
				padding: 9px 14px;
				background: var(--color-iberu);
				border: 1px solid var(--color-iberu);
				border-radius: 5px;
				color: white;
				cursor: pointer;
				text-decoration: none;
		}
		.chart-modal.show {
				display: block;
		}
		.settings.hide {
			display: none !important;
		}

		.color-picker {
			appearance: none;
			width: 24px;
			height: 24px;
			border: none;
			cursor: pointer;
		}

		.color-picker::-webkit-color-swatch {
			border-radius: 1px;
			border: none;
		}
	
		.color-picker::-moz-color-swatch {
			border-radius: 1px;
			border: none;
		}

		.canvas-picker {
			display: none;
			min-width: 150px;
			width: fit-content;
			max-width: 150px;
			height: fit-content;
		}
		.canvas-picker.show {
			display: block;
		}
		#color-picker,
		#tone-picker {
			border-radius: 5px;
		}

		.chart-func-btns {
			position: absolute;
			right: 65px;
			top: 5px;
			z-index: 5;
		}

		.chart-btn {
			margin-top: 4px;
			margin-right: 7px;
			padding: 0;	
			border: none;
			background: transparent;
			cursor: pointer;
		}

		.chart-btn:hover {
			margin-top: 3px;
			margin-right: 6px;
		}

		.close-icon {
			height: 15px;
			width: 15px;
		}

		.chart-icon {
			height: 15px;
			width: 15px;
			filter: invert(var(--color-invert));
		}

		.chart-icon:hover {
			height: 16px;
			width: 16px;
		}

		.chart-title {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			z-index: 1;
		}
		.chart-title h2 {
			text-align: center;
			font-size: 16px;
		}

    .chart-legend {
      position: absolute; 
      top: 5px; 
      max-width: 70%;
      left: 5px;
      z-index: 1; 
      color: var(--color-text);
      font-weight: 300;
    }

    .chart-legend p{
      margin-block-start: 6px;
      margin-block-end: 6px;
    }

    .legend-paragraph span {
      display: inline-block;
      min-width: 68px;
      width: fit-content;
    }
    .legend-information {
      color: #646363;
    }

		.tradingview-btn {
			position: absolute;
			background: #131722;
			bottom: 40px;
			left: 10px;
			height: 30px;
			width: 30px;
			border: none;
			border-radius: 15px;
			z-index: 5;
		}

		.tradingview-btn a {
			height: 100%;
			width: 100%;
		}
		.tradingview-btn a:focus-visible > img {
			border: 2px solid #b2b2b2;
			border-radius: 15px;
		}

		.tradingview-logo {
			position: absolute;
			height: 30px;
			border-radius: 50%;
			bottom: 0;
			left: 0;
		}

		#tradingview-extended-img{
			display: none;
			height: 18px;
			width: 166px;
			margin-top: 0;
			margin-left: 0;
		}

		.tradingview-btn:hover {
			height: fit-content;
			width: fit-content;
			padding: 6px 2px;
			border-radius: 25px;
		}

		.tradingview-btn:hover #tradingview-img{
			display: none;
		}

		.tradingview-btn:hover #tradingview-extended-img{
			display: block;
		}

		@media all and (max-width: 720px) {
			.chart-title {
				display: none;
			}
		}

	</style>

		<div class="inner-container">

			<div class="chart-func-btns">
				<button class="chart-btn" id="chart-setting" aria-label="Chart settings">
					<img class="chart-icon" src="/static/img/settings.svg" alt="Chart setting button"/>
				</button>
			</div>

			<div class="chart-modal">
				<div class="settings">
					<div class="modal-header">
						<h2>Setting</h2>
						<button class="close-btn" aria-label="Close chart settings">
							<img id="chart-modal-close" class="close-icon" src="/static/img/close.png" alt="Close modal"/>
						</button>
					</div>
					<form>
						<label for="color-picker-strategy"> 
							<input type="color" id="color-picker-strategy" value="${candlesticksData.color}" class="color-picker" aria-label="Strategy color picker" disabled></input>
							Linear Regression
						</label>
					</form>
					<button id="chart-modal-confirm" class="submit" type="button" aria-label="Confirm settings">Confirm</button>
				</div>
				<div class="canvas-picker">
					<div class="modal-header">
						<h2>Color</h2>
						<button class="close-btn" id="color-picker-close" aria-label="Close color picker">
							<img id="chart-modal-close" class="close-icon" src="/static/img/close.png" alt="Close color picker"/>
						</button>
					</div>
          <canvas id="tone-picker"></canvas>
          <canvas id="color-picker"></canvas>
					<button id="color-picker-confirm" class="submit" type="button" aria-label="Confirm color">Confirm</button>
        </div>
			</div>

			<div id="line-chart-container">
            <lightweight-chart id="line-chart"
                autosize
                type="line"
            ></lightweight-chart>
				<div class="chart-title">
					<h2>Asset Performance vs Strategy Performance </h2>
				</div>

        <div class="chart-legend">
          <div class="strategy-earning">
          </div>
        </div>

				<button class="tradingview-btn" tabindex="-1">
					<a href="https://www.tradingview.com" target="_blank" aria-label="Visit TradingView.com">
						<img src="/static/img/tradingview-logo.png" class="tradingview-logo" id="tradingview-img" alt="Trading View logo"/>
						<img src="/static/img/tradingview-extended-logo.png" id="tradingview-extended-img" alt="Trading View logo extended"/>
					</a>
				</button>
      </div>

			</div>
		</div>
  `;


	class LightweightChartExampleWC extends HTMLElement {
		constructor() {
			super();
			this.chartElement = undefined;
		}

		connectedCallback() {
			addPageChart('lightweight-performance-chart');
			this.attachShadow({ mode: 'open' });
			this.shadowRoot.appendChild(template.content.cloneNode(true));

			if (window.MutationObserver) {
				const callback = _ => {
					this.changeChartTheme(checkPageTheme());
				};
				this.observer = new window.MutationObserver(callback);
				this.observer.observe(document.documentElement, { attributes: true });
			}

			this.chartElement = this.shadowRoot.querySelector('#line-chart');

			this._changeData();
			this.changeChartTheme(checkPageTheme());

      initializeChartLegend();

			this.chartElement.chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);

			this.colorPicker = initializeColorPicker(this.shadowRoot.querySelector('#color-picker'), COLOR_PICKER_WIDTH, COLOR_PICKER_HEIGHT, 
				this.shadowRoot.querySelector('#tone-picker'), this.shadowRoot.querySelector('.selected'));

			this.addButtonClickHandlers();
			this.chartElement.chart.timeScale().fitContent();
      this.updateOnCrosshairMove();
			document.querySelector('lightweight-performance-chart').classList.add('loaded');
		}


		addButtonClickHandlers() {
			const lightweightPerformanceChart = document.querySelector('lightweight-performance-chart');
			this.changeColours = () => this._changeColours();
			const settingChartBtn = lightweightPerformanceChart.shadowRoot.querySelector("#chart-setting");
			const settingChartCloseBtn = lightweightPerformanceChart.shadowRoot.querySelector("#chart-modal-close");
			const settingChartConfirmBtn = lightweightPerformanceChart.shadowRoot.querySelector("#chart-modal-confirm");
			const colorPickerCloseBtn = lightweightPerformanceChart.shadowRoot.querySelector("#color-picker-close");
			const colorPickerConfirmBtn = lightweightPerformanceChart.shadowRoot.querySelector("#color-picker-confirm");

			settingChartConfirmBtn.addEventListener('click', this.changeColours);

			settingChartBtn.addEventListener("click", toggleModal);
			settingChartCloseBtn.addEventListener("click", toggleModal);
			colorPickerCloseBtn.addEventListener("click", () => {
				this.shadowRoot.querySelector('.canvas-picker').classList.toggle('show');
				this.shadowRoot.querySelector('.settings').classList.toggle('hide');
			});
			colorPickerConfirmBtn.addEventListener("click", () => {
				this.colorPicker.input.value = this.colorPicker.value;
				this.shadowRoot.querySelector('.canvas-picker').classList.toggle('show');
				this.shadowRoot.querySelector('.settings').classList.toggle('hide');
			});			
			Array.from(this.shadowRoot.querySelector('form').querySelectorAll('label')).forEach((el) => {
				el.addEventListener('click', () => {
					this.shadowRoot.querySelector('.canvas-picker').classList.toggle('show');
					this.shadowRoot.querySelector('.settings').classList.toggle('hide');
					this.colorPicker.input = el.querySelector('input');
				});
			});
		}

		_changeColours() {
			if (!this.chartElement) {
				return;
			}

			let color = this.shadowRoot.querySelector("#color-picker-strategy").value;
			let entry = [];
			entry.push({
				strategy: document.querySelector("lightweight-performance-chart").dataset.strategy,
				color: color,
			})
			
			this.chartElement.baselinesOptions = baselineColorSetting(color);
			candlesticksData.color = color;
			changeColorApi(entry);
			toggleModal();
			return;
		}

		_clearChartData() {
			if(this.chartElement.hdata.length > 0){
				let histogramsLength = this.chartElement.hdata.length;
				for(let i=0; i<histogramsLength; i++) {
					this.chartElement.chart.removeSeries(this.chartElement.histograms[0]);
					this.chartElement.histograms.splice(0, 1);
					this.chartElement.hdata.splice(0, 1);
				}
			}

			if(this.chartElement.bdata.length > 0){
				let baselinesLength = this.chartElement.bdata.length;
				for(let i=0; i<baselinesLength; i++) {
					this.chartElement.chart.removeSeries(this.chartElement.baselines[0]);
					this.chartElement.baselines.splice(0, 1);
					this.chartElement.bdata.splice(0, 1);
				}
			}

			if(this.chartElement.sdata.length > 0){
				let linesLength = this.chartElement.sdata.length;
				for(let i=0; i<linesLength; i++) {
					this.chartElement.chart.removeSeries(this.chartElement.lines[0]);
					this.chartElement.lines.splice(0, 1);
					this.chartElement.sdata.splice(0, 1);
				}
			}
			return;
		}

		_changeData() {
			this._clearChartData();
      const assetLength = Object.keys(candlesticksData.close).length;
      const assetColors = Object.keys(candlesticksData.trades_asset_dist).map(key => candlesticksData.trades_asset_dist[key].color);
      let earning = 0;
      let marketPerformanceIndex = 0;
			let strategyPerformanceIndex = 0;
			let marketPerformance = Array.from({ length: assetLength }, () => []);;
			let strategyPerformance = new Array();

      Object.keys(candlesticksData.close).forEach(key => {
        for (let j = 0; j < candlesticksData.timestamp.length; j++) {
          let value = candlesticksData.close[key][j] ? 
          POPRTFOLIO_LIQUIDITY / candlesticksData.close[key][0] * candlesticksData.close[key][j] - POPRTFOLIO_LIQUIDITY : 
          POPRTFOLIO_LIQUIDITY / candlesticksData.close[key][0] * candlesticksData.close[key][candlesticksData.close[key].length - 1] - POPRTFOLIO_LIQUIDITY;
          marketPerformance[marketPerformanceIndex].push({time: candlesticksData.date[j],
                                                          value: isNaN(value) ? 0 : value});
        }
        marketPerformanceIndex += 1;
        console.log(marketPerformance);
      });
      for (let j = 0; j < candlesticksData.timestamp.length; j++) {
        while (strategyPerformanceIndex < candlesticksData.trades.length && candlesticksData.trades[strategyPerformanceIndex].endDate <= candlesticksData.date[j]) {
          earning += candlesticksData.trades[strategyPerformanceIndex].result
					strategyPerformanceIndex += 1;
        }
        strategyPerformance.push({time: candlesticksData.date[j],
                                  value: earning});
      }
      for (let i = 0; i < assetLength; i++) {
        this.chartElement.sdata = marketPerformance[i];
			  this.chartElement.lines[i].applyOptions({color: assetColors[i]});
				if (assetLength > 3) this.chartElement.lines[i].applyOptions({lineWidth: 1});
      }
			if (strategyPerformance) {
				this.chartElement.bdata = strategyPerformance;
				this.chartElement.baselinesOptions = baselineColorSetting(candlesticksData.color);
			}
		}

		_updateTrade(trade) {
			trade = JSON.parse(`${trade}`);
			if (trade.result == "False") return false;
			if (trade.close == "True") {
				let time = this.chartElement.bdata[0][this.chartElement.bdata[0].length - 2].time;
				let percentage = this.chartElement.bdata[0][this.chartElement.bdata[0].length - 1].value + trade.percentage;
				if ((new Date().getTime() / 1000) < time + SECONDS_IN_A_DAY * 2) time = this.chartElement.bdata[0][this.chartElement.bdata[0].length - 1].time;
				else time = new Date(hours=0, minutes=0, seconds=0, milliseconds=0).getTime() / 1000;
				this.chartElement.baselines[0].update({value: percentage, time: time});
			}
		}

    _updateLegend(coordinates) {
			document.querySelector('lightweight-performance-chart').shadowRoot.querySelector('.chart-title').classList.add('hide');
			const time = this.chartElement.chart.timeScale().coordinateToTime(coordinates);
			const chartLegend = document.querySelector('lightweight-performance-chart').shadowRoot.querySelector('#line-chart-container').querySelector('.chart-legend');
			const strategyEarning = chartLegend.querySelector('.strategy-earning');

			let baselineArrayIndex = candlesticksData.date.indexOf(time);

      if (getUpdatingCandlesticksLock() === true) return;
			if (isNaN(baselineArrayIndex)) baselineArrayIndex = this.chartElement.bdata[0].length - 1;

			strategyEarning.innerHTML = 
				`<p class="legend-paragraph">Strategy &middot
         <span><strong style="color:${candlesticksData.color};">${this.chartElement.bdata[0][baselineArrayIndex].value.toFixed(2)}%
				 </strong></span></p>`;

      Object.keys(candlesticksData.trades_asset_dist).forEach((key, index) => {
        let div = chartLegend.querySelector(`#legend-${key}`);
        div.innerHTML = `<p class="legend-paragraph">${key} &middot
												 <strong style="color:${candlesticksData.trades_asset_dist[key].color};">
                         ${this.chartElement.sdata[index][baselineArrayIndex].value.toFixed(3)}%</strong></p>`;
      });
		}

    updateOnCrosshairMove() {
			this.chartElement.chart.subscribeCrosshairMove(param => {
				if(param.time) this._updateLegend(this.chartElement.chart.timeScale().timeToCoordinate(param.time));
			});
		}

		disconnectedCallback() {}

		changeChartTheme(isDark) {
			if (!this.chartElement) return;
			const theme = isDark ? themeColors.DARK : themeColors.LIGHT;
			const gridColor = isDark ? '#242424' : '#d2d2d2';
			this.chartElement.options = {
				layout: {
					textColor: theme.CHART_TEXT_COLOR,
					background: {
						color: theme.CHART_BACKGROUND_COLOR,
					},
				},
				grid: {
					vertLines: {
						color: gridColor,
					},
					horzLines: {
						color: gridColor,
					},
				},
				timeScale: {
					borderColor: theme.CHART_BORDER_COLOR,
				},
				rightPriceScale: {
					borderColor: theme.CHART_BORDER_COLOR,
				},
			};
		}
	}

	
	async function onVisibleLogicalRangeChanged(newVisibleLogicalRange) {
		const chartElement = document.querySelector('lightweight-performance-chart').shadowRoot.querySelector('#line-chart');
    const barsInfo = chartElement.lines[0].barsInLogicalRange(newVisibleLogicalRange);
    
    if (barsInfo !== null && barsInfo.barsBefore < 2) {
			if (getAddHistoricalCandlesticksRequest() === true && getUpdatingCandlesticksLock() === false) {
				const visibleRange = chartElement.chart.timeScale().getVisibleRange();
				await addHistoricalCandlesticks();
				chartElement.chart.timeScale().setVisibleRange({from: visibleRange.from, to: visibleRange.to});
			}
    }
	}


	function toggleModal() {
		const chartInnerContainer = document.querySelector('lightweight-performance-chart').shadowRoot.querySelector('.inner-container');
		const lineChart = chartInnerContainer.querySelector('#line-chart-container');

		lineChart.classList.contains('fade') ? lineChart.classList.remove('fade') : lineChart.classList.add('fade');
		chartInnerContainer.querySelector('.chart-modal').classList.contains('show') ? chartInnerContainer.querySelector('.chart-modal').classList.remove('show') : chartInnerContainer.querySelector('.chart-modal').classList.add('show');
	}


	function baselineColorSetting(color, price=0) {
		return {
			baseValue: { type: 'price', price: price },
			topFillColor1: hexToRgbA(color, 0.8),
			topFillColor2: hexToRgbA(color, 0.5),
			topLineColor: hexToRgbA(color),
			bottomFillColor1: hexToRgbA(color, 0.8),
			bottomFillColor2: hexToRgbA(color, 0.5),
			bottomLineColor: hexToRgbA(color),
		};
	}

	window.customElements.define(
		'lightweight-performance-chart',
		LightweightChartExampleWC
	);

  function initializeChartLegend() {
		const chartLegend = document.querySelector('lightweight-performance-chart').shadowRoot.querySelector('#line-chart-container').querySelector('.chart-legend');
    console.log(candlesticksData);
    Object.keys(candlesticksData.trades_asset_dist).forEach(key => {
      let newDiv = document.createElement('div');
      newDiv.id = `legend-${key}`;
      chartLegend.appendChild(newDiv);
    });
	}
})();