import '/static/js/lw-chart.js';
import { themeColors } from '/static/js/chartResources.js';

let indicatorsObjArray = undefined;
let initialDate = undefined; //needed 'cause we don't know the external indicator type in this script
let crosshairPosition = {x: undefined,
												 y: undefined,};

const TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||	(navigator.msMaxTouchPoints > 0);


export let secondaryChart = (name, period, indicators) => {

	const externalIndicatorChart = document.querySelector('lightweight-chart-container').shadowRoot.querySelector('#external-chart-container');
	let newIndicatorInnerHTML = `
		<${name}-${period} autosize type="line" class="external-indicator">
		</${name}-${period}>`;

	indicatorsObjArray = indicators;

	const template = document.createElement('template');
	template.innerHTML = `
		<style>
			.inner-container {
				position: relative;
				height: 100%;
				width: 100%;
			}

			#${name} {
				display: flex;
    		flex-grow: 1;
    		height: inherit;
			}

			.chart-legend {
				position: absolute; 
				top: 0;
				left: 5px;
				z-index: 1;
				color: var(--color-text);
				font-weight: 300;
			}
			
			.chart-legend p{
				margin-block-start: 6px;
				margin-block-end: 6px;
			}

			.legend-information {
				color: #646363;
			}

			@media all and (display-mode: fullscreen) {
				.chart-legend {
					font-size: 15px;
				}
			}
		</style>
		<div class="inner-container">
			<lightweight-chart id="${name}"
					autosize
					type="line"
			></lightweight-chart>

			<div class="chart-legend">
				
			</div>
		</div>
  `;

	externalIndicatorChart.innerHTML += newIndicatorInnerHTML;

	const checkPageTheme = () =>
		document.documentElement.getAttribute('data-theme') === 'dark';


	class LightweightChartExampleWC extends HTMLElement {
		constructor() {
			super();
			this.chartElement = undefined;
			this.charts = undefined;
		}

		connectedCallback() {
			this.attachShadow({ mode: 'open' });
			this.shadowRoot.appendChild(template.content.cloneNode(true));

			if (window.MutationObserver) {
				const callback = _ => {
					this.changeChartTheme(checkPageTheme());
				};
				this.observer = new window.MutationObserver(callback);
				this.observer.observe(document.documentElement, { attributes: true });
			}

			this.chartElement = this.shadowRoot.querySelector(`#${name}`);

			this._changeData();
			this.changeChartTheme(checkPageTheme());

			this.chartElement.chart.timeScale().applyOptions({timeVisible: true});
			if (TOUCH){
				this.chartElement.chart.applyOptions({trackingMode: {exitMode: 0}});
				this.handleTouchCrosshair();
			}
			else
				this.handleDesktopCrosshair();
		}

		_changeData() {
			if (!this.chartElement) {
				return;
			}
		}
		

		disconnectedCallback() {}

		changeChartTheme(isDark) {
			if (!this.chartElement) {
				return;
			}
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
							clientY: param.point.y * 2,
						}
					))
				});
			})
		}


		updateOnCrosshairMove() {

			this.chartElement.chart.subscribeCrosshairMove(param => {
				if(!TOUCH)
				window.onmousemove = (e) => this._updateCrosshair(param.point ? true : false, {point:{x: e.clientX, y: e.clientY}})
			});
			this.chartElement.ontouchstart = (e) => this.manageTouch(e, true);
			this.chartElement.ontouchmove = (e) => this.manageTouch(e, true);
			this.chartElement.ontouchend = (e) => this.manageTouch(e, false);
		}


		handleDesktopCrosshair() {
			this.chartElement.chart.subscribeCrosshairMove(param => {
				window.onmousemove = (e) => this._updateCrosshair(param.point ? true : false, {point:{x: e.clientX, y: e.clientY}});
			});
		}


		handleTouchCrosshair() {
			this.chartElement.addEventListener("touchstart", (e) => {
				if (e.cancelable) e.preventDefault();
				const crosshairHandler = (param) => {
					if (param.point){
						let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
						let touch = evt.changedTouches[0] || evt.touches[0];

						this.chartElement.chart.applyOptions({crosshair: {
							horzLine: {
								labelVisible: true,
								visible: true,
							}
						}});
						this._updateCrosshair(param, {point:{x: touch.clientX, y: touch.clientY}});
					}
					this.chartElement.chart.unsubscribeCrosshairMove(crosshairHandler);
				};
				this.chartElement.chart.subscribeCrosshairMove(crosshairHandler);
			});

			this.chartElement.addEventListener("touchmove", (e) => {
				const crosshairHandler = (param) => {
					if (e.cancelable) e.preventDefault();
					if (param.point){
						let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
						let touch = evt.changedTouches[0] || evt.touches[0];

						this.chartElement.chart.applyOptions({crosshair: {
							horzLine: {
								labelVisible: true,
								visible: true,
							}
						}});
						this._updateCrosshair(param, {point:{x: touch.clientX, y: touch.clientY}});
					}
					this.chartElement.chart.unsubscribeCrosshairMove(crosshairHandler);
				};
				this.chartElement.chart.subscribeCrosshairMove(crosshairHandler);
			});

			this.chartElement.addEventListener("touchend", (e) => {
				let evt = (typeof e.originalEvent === 'undefined') ? e : e.originalEvent;
				let touch = evt.changedTouches[0] || evt.touches[0];

				this.chartElement.chart.applyOptions({crosshair: {
					horzLine: {
						labelVisible: true,
						visible: true,
					}
				}});
				this._updateCrosshair(false, {point:{x: touch.clientX, y: touch.clientY}});
				return;
			});
		}
	}

	window.customElements.define(
		`${name}-${period}`,
		LightweightChartExampleWC
	);
};