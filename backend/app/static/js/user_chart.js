import '/static/js/lw-chart.js';

let RATE_OF_RETURN = 0;

(async function InitializeChart() {

	const serverResponse = await fetch(`${window.origin}/api/user`, {
		method: 'POST',
		credentials: 'include',
		cache: 'no-cache',
		headers: new Headers({
			'content-type': 'application/json'
		})
	});
	
	let candlesticksData = await serverResponse.json();
	console.log(candlesticksData);


	const themeColors = {DARK: {CHART_TEXT_COLOR: '#606060',
															CHART_BACKGROUND_COLOR: '#141414',
                            	CHART_BORDER_COLOR: '#141414',},
											 LIGHT: {CHART_TEXT_COLOR: '#606060',
															 CHART_BACKGROUND_COLOR: '#ededed',
															 CHART_BORDER_COLOR: '#ededed',}};

	const checkPageTheme = () =>
		document.documentElement.getAttribute('data-theme') === 'dark';

	const timeToLocal = (originalTime) => {
			const d = new Date(originalTime * 1000);
			return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
		}
	
	const SECONDS_IN_A_DAY = 86400;

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

		.chart-icon {
			height: 15px;
			width: 15px;
			filter: invert(var(--color-invert));
		}

		.chart-icon:hover {
			height: 16px;
			width: 16px;
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


	</style>

		<div class="inner-container">
			<div id="line-chart-container">
            <lightweight-chart id="line-chart"
                autosize
                type="line"
            ></lightweight-chart>
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

		
	const initialColorSetting = {
		baseline: {
			baseValue: { type: 'price', price: 0 },
			topFillColor1: 'rgba(36, 164, 156, 0.6)',
			topFillColor2: 'rgba(36, 164, 156, 0)',
			topLineColor: 'rgba(36, 164, 156, 0.7)',
			bottomFillColor1: 'rgba(236, 84, 84, 0.6)',
			bottomFillColor2: 'rgba(236, 84, 84, 0)',
			bottomLineColor: 'rgba(236, 84, 84, 0.7)',
		},
	}

	class LightweightChartExampleWC extends HTMLElement {
		constructor() {
			super();
			this.chartElement = undefined;
		}

		connectedCallback() {
			initializeBalance();
			initializePieCharts(candlesticksData);
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
			this.chartElement.chart.applyOptions({autoSize: true});

			this.chartElement.chart.timeScale().fitContent();
			this.chartElement.chart.timeScale().applyOptions({visible: true});
			this.chartElement.baselines[0].applyOptions({priceScaleId: 'right',
																										visible: true});
 			if (localStorage.getItem('show-balance') != 'true')
			 	document.querySelector('#user-balance').innerHTML = `<h2>******* ≈ ****</h2> 
			 																											 <span class="secondary-info">**********************************</span>`;
			else 
				document.querySelector('#user-balance').innerHTML = `<h2>${(RATE_OF_RETURN).toFixed(5)}% ≈ ${(RATE_OF_RETURN).toFixed(2)}$</h2> 
																														 <span class="secondary-info">with an initial investment of 100$</span>`;
			document.querySelector('lightweight-performance-chart').classList.add('loaded');
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
			let strategyPerformance = [];
			let earning = 0;
			let tradeIndex = 0;
			let date = timeToLocal(candlesticksData.startDate);

			while (date < timeToLocal(candlesticksData.endDate)) {
				while (tradeIndex < candlesticksData.dates.length && candlesticksData.dates[tradeIndex] <= date) {
					earning = earning + candlesticksData.values[tradeIndex];
					tradeIndex += 1;
				}
				strategyPerformance.push({time: date,
																	value: earning});
				date += SECONDS_IN_A_DAY
			}
			RATE_OF_RETURN = earning;
			this.chartElement.bdata = strategyPerformance;
			this.chartElement.baselinesOptions = initialColorSetting.baseline;
		}

		disconnectedCallback() {}

		changeChartTheme(isDark) {
			if (!this.chartElement) return;
			const theme = isDark ? themeColors.DARK : themeColors.LIGHT;
			const gridColor = isDark ? '#141414' : '#ededed';
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
		'lightweight-performance-chart',
		LightweightChartExampleWC
	);
})();

function initializeBalance() {
	if (localStorage.getItem('show-balance') != 'true') document.querySelector('#portfolio-hide-balance').classList.add('hide');
	else document.querySelector('#portfolio-show-balance').classList.add('hide');
	document.querySelector('#portfolio-hide-balance').addEventListener('click', () => {
		localStorage.setItem('show-balance', false);
		document.querySelector('#portfolio-hide-balance').classList.add('hide');
		document.querySelector('#portfolio-show-balance').classList.remove('hide');
		document.querySelector('#user-balance').innerHTML = `<h2>******* ≈ ****</h2> 
																												 <span class="secondary-info">**********************************</span>`;
	})
	document.querySelector('#portfolio-show-balance').addEventListener('click', () => {
		localStorage.setItem('show-balance', true);
		document.querySelector('#portfolio-show-balance').classList.add('hide');
		document.querySelector('#portfolio-hide-balance').classList.remove('hide');
		document.querySelector('#user-balance').innerHTML = `<h2>${(RATE_OF_RETURN).toFixed(5)}% ≈ ${(RATE_OF_RETURN).toFixed(2)}$</h2> 
																												 <span class="secondary-info">with an initial investment of 100$</span>`;
	})
}

function initializePieCharts(candlesticksData) {
	let assetsChart = document.querySelector("#user-assets").querySelector("canvas").getContext("2d");
	let values = Object.keys(candlesticksData.assets).map(function(key){
		return candlesticksData.assets[key];
	});
	let labels = Object.keys(candlesticksData.assets).map(function(key){
		return key;
	});
	new Chart(assetsChart, {
		type: 'doughnut',
		data: {
			labels: labels,
			datasets: [{
					data: values,
					borderWidth: 0,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					font: {
						family: "'Montserrat'",
						size: 18,
						weight: 'lighter',
					},
					text: 'Assets distribution'
				},
				legend: {
					position: 'right',
					align: 'center',
					labels: {
						boxWidth: 12,
						boxHeight: 12,
					},
				},
				tooltip: {
					enabled: false
				},
			},
		},
	});
	let strategiesChart = document.querySelector("#user-strategies").querySelector("canvas").getContext("2d");
	values = Object.keys(candlesticksData.strategies).map(function(key){
		return candlesticksData.strategies[key];
	});
	labels = Object.keys(candlesticksData.strategies).map(function(key){
		return key;
	});
	new Chart(strategiesChart, {
		type: 'doughnut',
		data: {
			labels: labels,
			datasets: [{
					data: values,
					borderWidth: 0,
			}],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					font: {
						family: "'Montserrat'",
						size: 18,
						weight: 'lighter',
					},
					text: 'Trading distribution'
				},
				legend: {
					position: 'right',
					align: 'center',
					labels: {
						boxWidth: 12,
						boxHeight: 12,
					},
				},
				tooltip: {
					enabled: false
				},
			},
		},
	});
}