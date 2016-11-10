import merge from 'lodash/merge';
import get from 'lodash/get';
import map from 'lodash/map';
import partial from 'lodash/partial';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import cloneDeep from 'lodash/cloneDeep';
import every from 'lodash/every';
import cx from 'classnames';

import {
    stripColors,
    numberFormat
} from 'gdc-numberjs/lib/number';

import { BAR_CHART, COLUMN_CHART, LINE_CHART } from '../../VisualizationTypes';

const EMPTY_DATA = { categories: [], series: [] };

const ALIGN_LEFT = 'left';
const ALIGN_RIGHT = 'right';
const ALIGN_CENTER = 'center';

const TOOLTIP_ARROW_OFFSET = 23;
const TOOLTIP_FULLSCREEN_THRESHOLD = 480;
const TOOLTIP_MAX_WIDTH = 366;
const TOOLTIP_BAR_CHART_VERTICAL_OFFSET = 5;
const TOOLTIP_VERTICAL_OFFSET = 14;

const escapeAngleBrackets = str => str && str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

function getTitleConfiguration(chartOptions) {
    return {
        yAxis: {
            title: {
                text: escapeAngleBrackets(get(chartOptions, 'title.y', ''))
            }
        },
        xAxis: {
            title: {
                text: escapeAngleBrackets(get(chartOptions, 'title.x', ''))
            }
        }
    };
}

function formatAsPercent() {
    const val = parseFloat((this.value * 100).toPrecision(14));
    return `${val}%`;
}

function getShowInPercentConfiguration(chartOptions) {
    const showInPercent = chartOptions.showInPercent;

    return showInPercent ? {
        yAxis: {
            labels: {
                formatter: formatAsPercent
            }
        }
    } : {};
}

function getArrowAlignment(arrowPosition, chartWidth) {
    const minX = -TOOLTIP_ARROW_OFFSET;
    const maxX = chartWidth + TOOLTIP_ARROW_OFFSET;

    if (
        arrowPosition + (TOOLTIP_MAX_WIDTH / 2) > maxX &&
        arrowPosition - (TOOLTIP_MAX_WIDTH / 2) > minX
    ) {
        return ALIGN_RIGHT;
    }

    if (
        arrowPosition - (TOOLTIP_MAX_WIDTH / 2) < minX &&
        arrowPosition + (TOOLTIP_MAX_WIDTH / 2) < maxX
    ) {
        return ALIGN_LEFT;
    }

    return ALIGN_CENTER;
}

const getTooltipHorizontalStartingPosition = (arrowPosition, chartWidth, tooltipWidth) => {
    switch (getArrowAlignment(arrowPosition, chartWidth)) {
        case ALIGN_RIGHT:
            return (arrowPosition - tooltipWidth) + TOOLTIP_ARROW_OFFSET;
        case ALIGN_LEFT:
            return arrowPosition - TOOLTIP_ARROW_OFFSET;
        default:
            return arrowPosition - (tooltipWidth / 2);
    }
};

function getArrowHorizontalPosition(chartType, stacking, dataPointEnd, dataPointHeight) {
    if (chartType === BAR_CHART && stacking) {
        return dataPointEnd - (dataPointHeight / 2);
    }

    return dataPointEnd;
}

function getDataPointEnd(chartType, isNegative, endPoint, height, stacking) {
    return (chartType === BAR_CHART && isNegative && stacking) ? endPoint + height : endPoint;
}

function getDataPointStart(chartType, isNegative, endPoint, height, stacking) {
    return (chartType === COLUMN_CHART && isNegative && stacking) ? endPoint - height : endPoint;
}

function getTooltipVerticalOffset(chartType, stacking, point) {
    if (chartType === COLUMN_CHART && (stacking || point.negative)) {
        return 0;
    }

    if (chartType === BAR_CHART) {
        return TOOLTIP_BAR_CHART_VERTICAL_OFFSET;
    }

    return TOOLTIP_VERTICAL_OFFSET;
}

function positionTooltip(chartType, stacking, labelWidth, labelHeight, point) {
    const dataPointEnd = getDataPointEnd(chartType, point.negative, point.plotX, point.h, stacking);
    const arrowPosition = getArrowHorizontalPosition(chartType, stacking, dataPointEnd, point.h);
    const chartWidth = this.chart.plotWidth;

    const tooltipHorizontalStartingPosition = getTooltipHorizontalStartingPosition(
        arrowPosition,
        chartWidth,
        labelWidth
    );

    const verticalOffset = getTooltipVerticalOffset(chartType, stacking, point);

    const dataPointStart = getDataPointStart(
        chartType,
        point.negative,
        point.plotY,
        point.h,
        stacking
    );

    return {
        x: this.chart.plotLeft + tooltipHorizontalStartingPosition,
        y: (this.chart.plotTop + dataPointStart) - (labelHeight + verticalOffset)
    };
}

const showFullscreenTooltip = () => {
    return window.innerWidth <= TOOLTIP_FULLSCREEN_THRESHOLD;
};

function formatTooltip(chartType, stacking, tooltipCallback) {
    const { chart } = this.series;

    // when brushing, do not show tooltip
    if (chart.mouseIsDown) {
        return false;
    }

    const dataPointEnd = (chartType === LINE_CHART)
        ? this.point.plotX
        : getDataPointEnd(
            chartType,
            this.point.negative,
            this.point.tooltipPos[0],
            this.point.tooltipPos[2],
            stacking
        );

    const dataPointHeight = (chartType === LINE_CHART) ? 0 : this.point.shapeArgs.height;

    const arrowPosition = getArrowHorizontalPosition(
        chartType,
        stacking,
        dataPointEnd,
        dataPointHeight
    );

    const chartWidth = chart.plotWidth;
    const align = getArrowAlignment(arrowPosition, chartWidth);

    const tailStyle = showFullscreenTooltip() ?
        `style="left: ${arrowPosition + chart.plotLeft}px;"` : '';

    const getTailClasses = (classname) => {
        return cx(classname, {
            [align]: !showFullscreenTooltip()
        });
    };

    return (
        `<div class="hc-tooltip">
            <div class="content">
                ${tooltipCallback(this.point)}
            </div>
            <div class="${getTailClasses('tail1')}" ${tailStyle}></div>
            <div class="${getTailClasses('tail2')}" ${tailStyle}></div>
        </div>`
    );
}

function formatLabel(value, format) {
    // no labels for missing values
    if (value === null) {
        return null;
    }

    const stripped = stripColors(format || '');
    return escapeAngleBrackets(String(numberFormat(value, stripped)));
}

function labelFormatter() {
    return formatLabel(this.y, get(this, 'point.format'));
}

// check whether series contains only positive values, not consider nulls
function hasOnlyPositiveValues(series, x) {
    return every(series, (seriesItem) => {
        const dataPoint = seriesItem.yData[x];
        return dataPoint !== null && dataPoint >= 0;
    });
}

function stackLabelFormatter() {
    // show labels: always for negative,
    // without negative values or with non-zero total for positive
    const showStackLabel =
        this.isNegative || hasOnlyPositiveValues(this.axis.series, this.x) || this.total !== 0;
    return showStackLabel ?
        formatLabel(this.total, get(this, 'axis.userOptions.defaultFormat')) : null;
}
function getTooltipConfiguration(chartOptions) {
    const tooltipAction = get(chartOptions, 'actions.tooltip');
    const chartType = chartOptions.type;
    const stacking = chartOptions.stacking;

    return tooltipAction ? {
        tooltip: {
            borderWidth: 0,
            borderRadius: 0,
            shadow: false,
            useHTML: true,
            positioner: partial(positionTooltip, chartType, stacking),
            formatter: partial(formatTooltip, chartType, stacking, tooltipAction)
        }
    } : {};
}

function getLabelsConfiguration(chartOptions) {
    const style = chartOptions.stacking ? {
        color: '#ffffff',
        textShadow: '0 0 1px #000000'
    } : {
        color: '#000000',
        textShadow: 'none'
    };

    return {
        plotOptions: {
            bar: {
                dataLabels: {
                    formatter: labelFormatter,
                    style,
                    allowOverlap: false
                }
            },
            column: {
                dataLabels: {
                    formatter: labelFormatter,
                    style,
                    allowOverlap: false
                }
            }
        },
        yAxis: {
            defaultFormat: get(chartOptions, 'title.yFormat')
        }
    };
}

function getStackingConfiguration(chartOptions) {
    const stacking = chartOptions.stacking;

    return stacking ? {
        plotOptions: {
            series: {
                stacking
            }
        },
        yAxis: {
            stackLabels: {
                formatter: stackLabelFormatter
            }
        }
    } : {};
}

function getSeries(series, colorPalette = []) {
    return series.map((seriesItem, index) => {
        const item = cloneDeep(seriesItem);
        item.color = colorPalette[index % colorPalette.length];
        // Escaping is handled by highcharts so we don't want to provide escaped input.
        // With one exception, though. Highcharts supports defining styles via
        // for example <b>...</b> and parses that from series name.
        // So to avoid this parsing, escape only < and > to &lt; and &gt;
        // which is understood by highcharts correctly
        item.name = item.name && escapeAngleBrackets(item.name);

        return item;
    });
}

function getDataConfiguration(chartOptions) {
    const data = chartOptions.data || EMPTY_DATA;
    const series = getSeries(data.series, chartOptions.colorPalette);
    const categories = map(data.categories, escapeAngleBrackets);

    return {
        series,
        xAxis: {
            labels: {
                enabled: !isEmpty(compact(categories))
            },
            categories
        }
    };
}

function getZoomableConfiguration(chartOptions) {
    return chartOptions.zoomable ? {
        chart: {
            zoomType: 'x'
        }
    } : {};
}

export function getCustomizedConfiguration(chartOptions) {
    const configurators = [
        getTitleConfiguration,
        getStackingConfiguration,
        getShowInPercentConfiguration,
        getLabelsConfiguration,
        getDataConfiguration,
        getTooltipConfiguration,
        getZoomableConfiguration
    ];

    const commonData = configurators.reduce((config, configurator) => {
        return merge(config, configurator(chartOptions));
    }, {});

    return merge({}, commonData);
}
