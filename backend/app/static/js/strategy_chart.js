import '/static/js/lw-chart.js';
import { initializeIndicators, initializeTrades } from '/static/js/indicators.js';
import { getAddHistoricalCandlesticksRequest } from '/static/js/chartResources.js';
import { getCandlesticksData } from '/static/js/chartResources.js';
import { getUpdatingCandlesticksLock } from '/static/js/chartResources.js';
import { addPageChart } from '/static/js/chartResources.js';
import { addHistoricalCandlesticks } from '/static/js/chartResources.js';
import { changeColorApi } from '/static/js/chartResources.js';
import { themeColors } from '/static/js/chartResources.js';
import { initializeColorPicker } from '/static/js/chartResources.js';
import { timeToLocal } from '/static/js/chartResources.js';
import { TOUCH } from '/static/js/chartResources.js';
import { updateTrade } from '/static/js/indicators.js';
import { clearChart } from '/static/js/indicators.js';

Date.prototype.nextCandlestickTime = () => {
	return this.setMinutes(this.getMinutes() + candlesticksData.timeframe);
}

(async function InitializeChart() {

	const LWTYPE_TO_ARRAY = {lines: 'sdata',
												 baselines: 'bdata',
												 histograms: 'hdata',
												};

	const EXTERNAL_CONTAINER = document.querySelector('#strategy-chart');

	const EXTERNAL_INDICATORS = parseInt(document.querySelector('lightweight-chart-container').getAttribute('data-indicators'));

	const TOOLTIP_TOP_MARGIN = 10;
	const TOOLTIP_WIDTH = 144;
	const TOOLTIP_HEIGHT = 144;
	const TOOLTIP_LEFT_MARGIN = 74;

	const COLOR_PICKER_WIDTH = TOUCH * (window.innerWidth < 720) ? 250 : 150;
	const COLOR_PICKER_HEIGHT = TOUCH ? 20 : 15;

	let indicatorsObjArray = undefined;
	let tradesObjArray = undefined;
	
	let candlesticksData = getCandlesticksData();

	const checkPageTheme = () =>
		document.documentElement.getAttribute('data-theme') === 'dark';
	
	const checkExternalStrategyIndicator = () =>
		EXTERNAL_INDICATORS > 0;
	
	const checkStrategyIndicator = () =>
		candlesticksData.indicators.length > 0;

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

			#candlestick-chart-container {
				position: relative;
				display: flex;
				flex-direction: column;
				height:${checkExternalStrategyIndicator() ? 200 / (EXTERNAL_INDICATORS + 2) : 100}%;
				cursor: crosshair;
			}

			#candlestick-chart {
				display: flex;
				flex-grow: 1;
				height: inherit;
			}

			#external-chart-container {
				display: flex;
				flex-direction: column;
				height:${checkExternalStrategyIndicator() ? 100 - 200 / (EXTERNAL_INDICATORS + 2) : 0}%;
				cursor: crosshair;
			}

			.external-indicator {
				display: flex;
				flex-direction: column;
				height: ${100 / EXTERNAL_INDICATORS}%;
				cursor: crosshair;
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
			.chart-title.hide {
				display: none;
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
				padding: 5px 0 15px 0;
				justify-content: space-between;
				border-bottom: solid 2px var(--color-separator);
			}

			.modal-header h2 {
				display: inline-block;
				margin: 0;
			}

			.close {	
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

			.chart-tooltip {
				position: absolute; 
				display: none; 
				background-color: var(--color-panel);
				color: var(--color-text);
				padding: 8px;  
				z-index: 4; 
				pointer-events: none; 
				border: 1px solid; 
			}
			
			.chart-tooltip.positive-border {
				border-color: #24A49C;
			}
		
			.chart-tooltip.negative-border {
				border-color: #EC5454;
			}

			.chart-tooltip.show { 
				display: block; 
			}

			.tooltip-header {
				top: 0;
				padding-bottom: 5px;
				border-bottom: 1px solid #b2b2b2;
			}

			.tooltip-header h3 {
				display: inline;
			}

			.tradingview-btn {
				position: absolute;
				background: #131722;
				${checkExternalStrategyIndicator() & window.innerWidth >= 430 ? 'bottom: 10px;' : 'bottom: 40px;'}
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

			@media all and (max-width: 1080px) {
				.chart-legend { 
					max-width: 60%;
				}
				#chart-expand {
					display: none;
				}
			}

			@media all and (max-width: 720px) {
				.canvas-picker {
					max-width: 250px;
				}

				.chart-title {
					display: none;
				}
			}

			@media all and (max-width: 430px) {
				#candlestick-chart-container {
					height: 100%;
				}
	
				#external-chart-container {
					display: none;
					height:0%;
				}
			}

			@media all and (display-mode: fullscreen) {
				#chart-expand {
					display: none;
				}

				.chart-legend {
					font-size: 15px;
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
					margin-top: 2px;
					margin-right: 5px;
				}
	
				.chart-icon {
					height: 20px;
					width: 20px;
				}
	
				.chart-icon:hover {
					height: 22px;
					width: 22px;
				}

				#chart-reduce {
					display: inline;
				}
			}
		
    </style>


    <div class="inner-container">

			<div class="chart-func-btns">
				<button class="chart-btn ${checkStrategyIndicator() & window.innerWidth >= 430 ? '' : 'hide'}" id="chart-setting">
					<img class="chart-icon" src="/static/img/settings.svg" alt="Chart setting button"/>
				</button>
				<button class="chart-btn" id="chart-expand">
					<img class="chart-icon" src="/static/img/expand.png" alt="Expand chart button"/>
				</button>
				<button class="chart-btn hide" id="chart-reduce">
					<img class="chart-icon" src="/static/img/minimize.png" alt="Reduce chart button"/>
				</button>
			</div>

			<div class="chart-modal">
				<div class="settings">
					<div class="modal-header">
						<h2>Setting</h2>
						<button class="close" id="chart-modal-close">
							<img id="chart-modal-close" class="close-icon" src="/static/img/close.png" alt="Close modal"/>
						</button>
					</div>
				</div>
				<div class="canvas-picker">
						<div class="modal-header">
								<h2>Color</h2>
								<button class="close" id="color-picker-close">
									<img id="chart-modal-close" class="close-icon" src="/static/img/close.png" alt="Close color picker"/>
								</button>
						</div>
            <canvas id="tone-picker"></canvas>
            <canvas id="color-picker"></canvas>
						<button id="color-picker-confirm" class="submit" type="button">Confirm</button>
          </div>
			</div>

			<div class="chart-tooltip">
				<div class="tooltip-header">
					<h3>⬤ ${EXTERNAL_CONTAINER.querySelector('lightweight-chart-container').dataset.market}USDT</h3>
				</div>
				<div class="tooltip-body">
				</div>
			</div>

      <div id="candlestick-chart-container">
        <lightweight-chart id="candlestick-chart"
            autosize
            type="line"
        ></lightweight-chart>
				<div class="chart-title">
					<h2>Candlestick Asset Chart</h2>
				</div>

				<div class="chart-legend">
					<div class="market-price">
					</div>
				</div>

				<button class="tradingview-btn" tabindex="-1">
					<a href="https://www.tradingview.com" target="_blank" aria-label="Visit TradingView.com">
						<img src="/static/img/tradingview-logo.png" class="tradingview-logo" id="tradingview-img" alt="Trading View logo"/>
						<img src="/static/img/tradingview-extended-logo.png" id="tradingview-extended-img" alt="Trading View logo extended"/>
					</a>
				</button>

      </div>
			<div id="external-chart-container">
      </div>
    </div>
  `;


	class LightweightChartExampleWC extends HTMLElement {
		constructor() {
			super();
			this.chartElement = undefined;
			this.charts = undefined;
		}

		connectedCallback() {
			addPageChart('lightweight-chart-container');
			this.attachShadow({ mode: 'open' });
			this.shadowRoot.appendChild(template.content.cloneNode(true));

			if (window.MutationObserver) {
				const callback = _ => {
					this.changeChartTheme(checkPageTheme());
				};
				this.observer = new window.MutationObserver(callback);
				this.observer.observe(document.documentElement, { attributes: true });
			}

			this.chartElement = this.shadowRoot.querySelector('#candlestick-chart');
			
			this._changeData();
			this.changeChartTheme(checkPageTheme());
			this.chartElement.chart.applyOptions({autoSize: true});

			this.chartElement.chart.priceScale().applyOptions({leftPriceScale: {visible: false},
																												 autoScale: false,
																												 scaleMargins: {
																												 	 top: 0.05,
																												 	 bottom: 0.05,
																													},
																												});

			this.chartElement.chart.timeScale().applyOptions({timeVisible: true});
			this.chartElement.chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);

			if (TOUCH){
				this.chartElement.chart.applyOptions({trackingMode: {exitMode: 0}});
				this.handleTouchCrosshair();
			}
			else
				this.handleDesktopCrosshair();

			initializeChartLegend();
			initializeIndicatorsSettings();
			this.colorPicker = initializeColorPicker(this.shadowRoot.querySelector('#color-picker'), COLOR_PICKER_WIDTH, COLOR_PICKER_HEIGHT, 
				this.shadowRoot.querySelector('#tone-picker'), this.shadowRoot.querySelector('.selected'));

			this.addButtonClickHandlers();

			if (!isMultiplePanesChart) return;
			
			multipleChartSyncronization();
			this.updateOnCrosshairMove();
			document.querySelector('lightweight-chart-container').classList.add('loaded');
		}


		_transformData() {
			let candlesticksObjArray = [];

			for (let i=0; i<candlesticksData.open.length; i++) {
				candlesticksObjArray.push({time: candlesticksData.date[i],
																	 open: candlesticksData.open[i],
																   high: candlesticksData.high[i],
																	 low: candlesticksData.low[i],
																	 close: candlesticksData.close[i],
																	});
			}
			return candlesticksObjArray;
		}

		_changeData() {
			if (!this.chartElement) return;

			clearChart();
			
			tradesObjArray = initializeTrades(candlesticksData);

			
			indicatorsObjArray = initializeIndicators(candlesticksData, 
																							 candlesticksData.indicators, 
																							 candlesticksData.timeframe,
																							 []);
			
			this.chartElement.cdata = this._transformData();

			if (isMultiplePanesChart()) this.chartElement.chart.timeScale().applyOptions({visible: false});
		}

		_updateData(candlestick) {
			candlestick = JSON.parse(`${candlestick}`);
			if (candlestick.result == "False") return false;
			candlestick.timestamp = timeToLocal(candlestick.timestamp);
			candlestick = {
				time: parseInt(candlestick.timestamp),
				open: parseFloat(candlestick.open),
				high: parseFloat(candlestick.high),
				low: parseFloat(candlestick.low),
				close: parseFloat(candlestick.close),
			};
		  this.chartElement.candlestick.update(candlestick);
			for (let i=0; i<indicatorsObjArray.length; i++) {
				indicatorsObjArray[i].update(candlestick.time);
			}

			if (candlesticksData.date[candlesticksData.date.length - 1] == candlestick.time) {
				candlesticksData.open[candlesticksData.open.length - 1] = candlestick.open;
				candlesticksData.high[candlesticksData.high.length - 1] = candlestick.high;
				candlesticksData.low[candlesticksData.low.length - 1] = candlestick.low;
				candlesticksData.close[candlesticksData.close.length - 1] = candlestick.close;
				candlesticksData.volume[candlesticksData.volume.length - 1] = candlestick.volume;
				this.chartElement.cdata[this.chartElement.cdata.length - 1] = candlestick;
			}
			else {
				candlesticksData.open.push(candlestick.open);
				candlesticksData.high.push(candlestick.high);
				candlesticksData.low.push(candlestick.low);
				candlesticksData.close.push(candlestick.close);
				candlesticksData.volume.push(candlestick.volume);
				candlesticksData.date.push(candlestick.time);
				this.chartElement.cdata.push(candlestick);
			}
			return true;
		}


		_updateTrade(trade) {
			trade = JSON.parse(`${trade}`);
			if (trade.result == "False") return false;
			if (trade.close == "True") trade = {endDate: candlesticksData.date[candlesticksData.date.length - 1]};
			else {
				trade = {startDate: parseInt(trade.open),
								 position: parseFloat(trade.position),
								 openPrice: parseFloat(trade.price),
								 takeProfit: parseFloat(trade.tp),
								 stopLoss: parseFloat(trade.sl),
								};
				let result = trade.position ? 100 * (1 - trade.openPrice/candlesticksData.close[candlesticksData.close.length - 1]) : 100 * (1 - candlesticksData.close[candlesticksData.close.length - 1]/trade.openPrice);
				if (tradesObjArray[tradesObjArray.length - 1].start == timeToLocal(trade.startDate)) {
					tradesObjArray[tradesObjArray.length - 1].end = candlesticksData.date[candlesticksData.date.length - 1];
					tradesObjArray[tradesObjArray.length - 1].result = result;
				}
				else tradesObjArray.push({position: trade.position > 0,
																	start: timeToLocal(trade.startDate),
																	end: candlesticksData.date[candlesticksData.date.length - 1],
																	open: trade.openPrice,
																	takeProfit: trade.takeProfit,
																	stopLoss: trade.stopLoss,
																	result: result,
																});
			}
			updateTrade(trade);
		}


		_updateLegend(coordinates) {
			document.querySelector('lightweight-chart-container').shadowRoot.querySelector('.chart-title').classList.add('hide');
			const time = this.chartElement.chart.timeScale().coordinateToTime(coordinates);
			const chartLegend = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart-container').querySelector('.chart-legend');
			const externalIndicatorChartContainer = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#external-chart-container');
			const marketSymbol = `${EXTERNAL_CONTAINER.querySelector('lightweight-chart-container').dataset.market}USDT &middot`;
			const marketPrice = chartLegend.querySelector('.market-price');

			let candlesticksArrayIndex = candlesticksData.date.indexOf(time);

			if (isNaN(candlesticksArrayIndex) || getUpdatingCandlesticksLock() === true) candlesticksArrayIndex = this.chartElement.cdata.length - 1;
			let htmlElementClass = (this.chartElement.cdata[candlesticksArrayIndex].open > this.chartElement.cdata[candlesticksArrayIndex].close) ? 'negative' : 'positive';

			marketPrice.innerHTML = 
				`<p class="legend-paragraph">${marketSymbol} <span>O <strong class="${htmlElementClass}">${this.chartElement.cdata[candlesticksArrayIndex].open.toFixed(2)}
					</strong></span> <span>H <strong class="${htmlElementClass}">${this.chartElement.cdata[candlesticksArrayIndex].high.toFixed(2)}</strong></span> 
					<span>L <strong class="${htmlElementClass}">${this.chartElement.cdata[candlesticksArrayIndex].low.toFixed(2)}</strong></span> <span>C <strong class="${htmlElementClass}">
					${this.chartElement.cdata[candlesticksArrayIndex].close.toFixed(2)}</strong></span></p>`;

			for (let i=0; i<indicatorsObjArray.length; i++){
				const {displayValue, name, period, chart, color, type, index} = indicatorsObjArray[i];

				if (displayValue === false) continue;

				let div = period ? chartLegend.querySelector(`#legend-${name}-${period}`) : chartLegend.querySelector(`#legend-${name}`);
					
				if (chart === 'volume' && name === 'volume') 
					div.innerHTML = `<p class="legend-paragraph">${name} <strong class="${htmlElementClass}">${this.chartElement.hdata[index][candlesticksArrayIndex].value.toFixed(3)}</strong></p>`;
					
				else if (chart === 'main') {
					try {
						div.innerHTML = `<p class="legend-paragraph">${name} <span class="legend-information">close ${period}</span>
																	 <strong style="color:${color};">${this.chartElement[LWTYPE_TO_ARRAY[type]][index][candlesticksArrayIndex].value.toFixed(3)}</strong></p>`;
					}catch {
						div.innerHTML = `<p class="legend-paragraph">${name} <span class="legend-information">close ${period}</span>
																	 <strong style="color:${color};">NaN</strong></p>`;
					}
				} 
				else { 
					let externalIndicatorChart = externalIndicatorChartContainer.querySelector(`${name}-${period}`).shadowRoot.querySelector(`.chart-legend`);
					let externalIndicatorChartElement = externalIndicatorChartContainer.querySelector(`${name}-${period}`).chartElement;
					try {
						
						externalIndicatorChart.innerHTML = `<p class="legend-paragraph">${name} <span class="legend-information">close ${period}</span>
														<strong style="color:${color};">${externalIndicatorChartElement[LWTYPE_TO_ARRAY[type]][index][candlesticksArrayIndex].value.toFixed(3)}</strong></p>`;
						
					}catch {
						externalIndicatorChart.innerHTML = `<p class="legend-paragraph">${name} <span class="legend-information">close ${period}</span>
														<strong style="color:${color};">NaN</strong></p>`;
					}
				}
				
			}
		}


		_updateToolTip(param) {
			const chartTooltip = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('.chart-tooltip');
			const chartTooltipHeader = chartTooltip.querySelector('.tooltip-header');

			let tradesObjArrayIndex = 0;
			let tradesObjArrayLocked = false;

			while (tradesObjArrayIndex<tradesObjArray.length && tradesObjArrayLocked === false) {
				if (param.time >= tradesObjArray[tradesObjArrayIndex].start && param.time <= tradesObjArray[tradesObjArrayIndex].end) {
					tradesObjArrayLocked = true;

					let htmlElementClass = (tradesObjArray[tradesObjArrayIndex].result < 0) ? 'negative' : 'positive';
					let tradePositionType = (tradesObjArray[tradesObjArrayIndex].position === true) ? 'long' : 'short';

					chartTooltip.classList.add('show');
					if (chartTooltipHeader.classList.contains('positive')) {
						chartTooltipHeader.classList.remove('positive');
						chartTooltip.classList.remove('positive-border');
					}
					else if (chartTooltipHeader.classList.contains('negative')) {
						chartTooltipHeader.classList.remove('negative');
						chartTooltip.classList.remove('negative-border');
					}
					chartTooltipHeader.classList.add(htmlElementClass);
					chartTooltip.classList.add(`${htmlElementClass}-border`);
					chartTooltip.querySelector('.tooltip-body').innerHTML = `
						<p>take profit:	${tradesObjArray[tradesObjArrayIndex].takeProfit}</p>
						<p>stop loss:	${tradesObjArray[tradesObjArrayIndex].stopLoss}</p>
						<p>position:	${tradePositionType}</p>`;
					
					const y = param.point.y;
					let left = param.point.x;
					let top = y + TOOLTIP_TOP_MARGIN;

					if (left > EXTERNAL_CONTAINER.clientWidth - TOOLTIP_LEFT_MARGIN - TOOLTIP_WIDTH) left = left - TOOLTIP_WIDTH;
					if (top > EXTERNAL_CONTAINER.clientHeight - TOOLTIP_LEFT_MARGIN - TOOLTIP_HEIGHT) top = top - TOOLTIP_HEIGHT;

					chartTooltip.style.left = left + 'px';
					chartTooltip.style.top = top + 'px';
				}

				else {
					chartTooltip.classList.remove('show');
					tradesObjArrayIndex += 1;
				}
			}
		}


		_updateCrosshair(chartParam, param) {
			if (this.chartElement.chart.options().crosshair.mode === 1) return;

			this.chartElement.chart.applyOptions({crosshair: {
				horzLine: {
					labelVisible: true,
					visible: true,
				}
			}});

			this.chartElement.charts.filter(c => c.chart !== this.chartElement.chart).forEach(c => {
				if (!c) return;


				c.chart.applyOptions({crosshair: {
																horzLine: {
																	labelVisible: false,
																	visible: false,
																}
															}
														});
				let canvasLWChart = c.shadowRoot.querySelector('.chart-container').querySelectorAll('canvas');
				canvasLWChart = [canvasLWChart[0], canvasLWChart[1]];
				canvasLWChart.forEach(canvas => {
					if (!chartParam){
						canvas.dispatchEvent(new MouseEvent('mouseleave'));
						return;
					}					
					
					canvas.dispatchEvent(new MouseEvent(
						'mouseenter',
						{
							view: window,
							bubbles: true,
							cancelable: true,
							clientX: param.point.x,
							clientY: param.point.y,
						}
					));
				});
			})
		}


		updateOnCrosshairMove() {
			this.chartElement.chart.subscribeCrosshairMove(param => {
				if(param.time) this._updateLegend(this.chartElement.chart.timeScale().timeToCoordinate(param.time));
				this._updateToolTip(param);
			});
		}


		handleDesktopCrosshair() {
			this.chartElement.chart.subscribeCrosshairMove(param => {
				window.onmousemove = (e) => this._updateCrosshair(param.point ? true : false, {point:{x: e.clientX, y: e.clientY}});
			});
		}


		handleTouchCrosshair() {
			const crosshairHandler = (param) => {
				if (param.point){
					this.chartElement.shadowRoot.querySelector('tr').querySelectorAll('canvas').forEach(c => { c.ontouchmove = (e) => {
						let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
						let touch = evt.changedTouches[0] || evt.touches[0];
						this._updateCrosshair(param, {point:{x: touch.clientX, y: touch.clientY}});
					}
					})
				}
			};

			this.chartElement.shadowRoot.querySelector('tr').querySelectorAll('canvas').forEach(c => {
				c.addEventListener("touchstart", (e) => {
				if (e.cancelable) e.preventDefault();
					this.chartElement.chart.subscribeCrosshairMove(crosshairHandler);
				});
			});

			this.chartElement.shadowRoot.querySelector('tr').querySelectorAll('canvas').forEach(c => {c.addEventListener("touchend", (e) => {
				let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
				let touch = evt.changedTouches[0] || evt.touches[0];
				this._updateCrosshair(false, {point:{x: touch.clientX, y: touch.clientY}});
				return;
			});})
		}


		addButtonClickHandlers() {
			const lightweightChartContainer = document.querySelector('lightweight-chart-container');
			const chartExternalContainer = document.querySelector('#chart');
			this.changeColours = () => this._changeColours();
			const expandChartBtn = lightweightChartContainer.shadowRoot.querySelector("#chart-expand");
			const reduceChartBtn = lightweightChartContainer.shadowRoot.querySelector("#chart-reduce");
			const settingChartBtn = lightweightChartContainer.shadowRoot.querySelector("#chart-setting");
			const settingChartCloseBtn = lightweightChartContainer.shadowRoot.querySelector("#chart-modal-close");
			const settingChartConfirmBtn = lightweightChartContainer.shadowRoot.querySelector("#chart-modal-confirm");
			const colorPickerCloseBtn = lightweightChartContainer.shadowRoot.querySelector("#color-picker-close");
			const colorPickerConfirmBtn = lightweightChartContainer.shadowRoot.querySelector("#color-picker-confirm");
 
			expandChartBtn.addEventListener("click", () => {
  			if (chartExternalContainer.requestFullscreen) chartExternalContainer.requestFullscreen();
				else if (chartExternalContainer.webkitRequestFullscreen)chartExternalContainer.webkitRequestFullscreen(); 
				else if (chartExternalContainer.msRequestFullscreen) chartExternalContainer.msRequestFullscreen();
			});
			reduceChartBtn.addEventListener("click", () => {
				if (document.exitFullscreen) document.exitFullscreen();
				else if (document.webkitExitFullscreen)document.webkitExitFullscreen(); 
				else if (document.msExitFullscreen) document.msExitFullscreen();
			});
			settingChartConfirmBtn.addEventListener('click', this.changeColours);

			settingChartBtn.addEventListener("click", toggleModal);
			settingChartCloseBtn.addEventListener("click", toggleModal);
			colorPickerCloseBtn.addEventListener("click", () => {
				this.shadowRoot.querySelector('.canvas-picker').classList.toggle('show');
				this.shadowRoot.querySelector('.settings').classList.toggle('hide');
			});
			colorPickerConfirmBtn.addEventListener("click", () => {
				this.shadowRoot.querySelector('.canvas-picker').classList.toggle('show');
				this.shadowRoot.querySelector('.settings').classList.toggle('hide');
				this.colorPicker.input.value = this.colorPicker.value;
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
			if (!this.chartElement) return;

			let entry = [];
			const lightweightChartContainer = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(".chart-modal");
			const lightweightChartLegend = document.querySelector('lightweight-chart-container').shadowRoot.querySelector(".chart-legend");
			const changeableColorIndicatorsObjArray = indicatorsObjArray.filter(i => i.name !== 'volume');
			for (let i=0; i<changeableColorIndicatorsObjArray.length; i++) {
				if (changeableColorIndicatorsObjArray[i].displayValue === true) {

					entry.push({
						indicator: changeableColorIndicatorsObjArray[i].name,
						color: lightweightChartContainer.querySelector("#color-picker-".concat(i)).value
					});

					changeableColorIndicatorsObjArray[i].color = lightweightChartContainer.querySelector("#color-picker-".concat(i)).value; 

					if (changeableColorIndicatorsObjArray[i].chart === 'main' || changeableColorIndicatorsObjArray[i].name === 'volume') {
						this.chartElement[changeableColorIndicatorsObjArray[i].type][changeableColorIndicatorsObjArray[i].index]
							.applyOptions({color: changeableColorIndicatorsObjArray[i].color});
						lightweightChartLegend.querySelector(`#legend-${changeableColorIndicatorsObjArray[i].name}-${changeableColorIndicatorsObjArray[i].period}`)
							.querySelector("strong").style = `color:${changeableColorIndicatorsObjArray[i].color};`;
					}
					else {
						const externalIndicatorChart = document.querySelector('lightweight-chart-container')
																						.shadowRoot.querySelector(`${changeableColorIndicatorsObjArray[i].name}-${changeableColorIndicatorsObjArray[i].period}`);
						externalIndicatorChart.shadowRoot.querySelector(`#${changeableColorIndicatorsObjArray[i].name}`)
							[changeableColorIndicatorsObjArray[i].type][changeableColorIndicatorsObjArray[i].index].applyOptions({color: changeableColorIndicatorsObjArray[i].color});
						try {
							externalIndicatorChart.shadowRoot.querySelector("strong").style = `color:${changeableColorIndicatorsObjArray[i].color};`;
						}catch {
							continue;
						}
					}

				}
			}
			
			changeColorApi(entry);

			toggleModal();
			return;
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

	window.customElements.define(
		'lightweight-chart-container',
		LightweightChartExampleWC
	);


	function isMultiplePanesChart() {
		let indicatorIndex = 0;
		while (indicatorIndex < indicatorsObjArray.length) {
			if (!(['main', 'volume'].includes(indicatorsObjArray[indicatorIndex].chart))) return true;
			indicatorIndex += 1;
		}
		return false;
	}


	async function onVisibleLogicalRangeChanged(newVisibleLogicalRange) {
		const chartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');
    const barsInfo = chartElement.candlestick.barsInLogicalRange(newVisibleLogicalRange);
    
    if (barsInfo !== null && barsInfo.barsBefore < 50) {
			if (getAddHistoricalCandlesticksRequest() === true && getUpdatingCandlesticksLock() === false) {
				const visibleRange = chartElement.chart.timeScale().getVisibleRange();
				await addHistoricalCandlesticks();
				chartElement.chart.timeScale().setVisibleRange({from: visibleRange.from, to: visibleRange.to});
			}
    }
	}

	
	function getAllChartPanesElement() {
		const candlestickChartElement = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart');	
		const secondaryChartElement = [];	

		for (let i=0; i<indicatorsObjArray.length; i++) {
			if (indicatorsObjArray[i].chart === 'main' || indicatorsObjArray[i].chart === 'volume') continue;
			secondaryChartElement.push(document.querySelector('lightweight-chart-container').shadowRoot.querySelector(`${indicatorsObjArray[i].name}-${indicatorsObjArray[i].period}`).shadowRoot.querySelector(`#${indicatorsObjArray[i].name}`));
		}

		return [candlestickChartElement, ...secondaryChartElement];
	}

	function multipleChartSyncronization() {
		const charts = getAllChartPanesElement();

		charts.forEach(c => {
			c.charts = charts;
			let div = c.getBoundingClientRect();
			c.top = div.top;
			c.bottom = div.bottom;
		})

		charts.map(chart => chart.chart)
		.forEach((chart) => {
			if (!chart) return;
			chart.timeScale().subscribeVisibleTimeRangeChange((e) => {
				charts.map(c => c.chart).filter((c) => c !== chart).forEach((c) => {
					c.timeScale().applyOptions({
																			rightOffset: chart.timeScale().scrollPosition()
																		});
																	});
			});
			chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
				if (range) {
					charts.map(c => c.chart).filter((c) => c !== chart).forEach((c) => {
						c.timeScale().setVisibleLogicalRange({
																									from: range?.from,
																									to: range?.to,
																								});
																							});
				}
			});
		});
	}
	

	function initializeIndicatorsSettings() {
		const lightweightChartContainer = document.querySelector('lightweight-chart-container');
		let indicatorColorPicker = (n, c, l) => `<label for="color-picker-${n}"> 
																								<input type="color" id="color-picker-${n}" value="${c}" class="color-picker" alt="${n} color picker" disabled></input>
																								${l}
																						 </label>`;

		const modal = lightweightChartContainer.shadowRoot.querySelector('.chart-modal');
		const settings = modal.querySelector('.settings');
		settings.innerHTML += `		
		<form>
		  ${indicatorsObjArray.filter(i => i.displayValue === true).filter(i => i.name !== 'volume').map((i, index) => (`${indicatorColorPicker(index, i.color, i.name)}`)).join("")}
		</form>
		<button id="chart-modal-confirm" class="submit" type="submit">Confirm</button>
		`;
	}


	function toggleModal() {
		const chartInnerContainer = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('.inner-container');
		const candlestickChart = chartInnerContainer.querySelector('#candlestick-chart-container');
		const externalIndicatorsChart = chartInnerContainer.querySelector('#external-chart-container');

		candlestickChart.classList.contains('fade') ? candlestickChart.classList.remove('fade') : candlestickChart.classList.add('fade');
		externalIndicatorsChart.classList.contains('fade') ? externalIndicatorsChart.classList.remove('fade') : externalIndicatorsChart.classList.add('fade');
		chartInnerContainer.querySelector('.chart-modal').classList.contains('show') ?
		chartInnerContainer.querySelector('.chart-modal').classList.remove('show') : chartInnerContainer.querySelector('.chart-modal').classList.add('show');
	}



	function initializeChartLegend() {
		const chartLegend = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#candlestick-chart-container').querySelector('.chart-legend');


		for (let i=0; i<indicatorsObjArray.length; i++) {
			if (indicatorsObjArray[i].displayValue === false) continue;

			let newDiv = document.createElement('div');
			newDiv.id = indicatorsObjArray[i].period ? `legend-${indicatorsObjArray[i].name}-${indicatorsObjArray[i].period}` : `legend-${indicatorsObjArray[i].name}`;

			if (indicatorsObjArray[i].chart === 'main' || indicatorsObjArray[i].chart === 'volume') {
				newDiv.className = (indicatorsObjArray[i].name !== 'volume') ? 'indicator-legend' : 'volume-indicator'
				chartLegend.appendChild(newDiv);
			}
		}
	}
})();