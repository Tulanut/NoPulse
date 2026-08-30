import React, { useState, useMemo } from 'react';
import { Workout } from '../types/workout';
import { TrendingUp, Award, Info, Sparkles, Activity, Layers } from 'lucide-react';
import { formatStandardDate } from '../utils/dateUtils';

type TimeRange = 'week' | 'month' | 'year';
type MetricType = 'weight' | 'e1rm' | 'volume';

interface ProgressionChartProps {
  workouts: Workout[];
  exerciseName: string;
}

interface DataPoint {
  id: string;
  date: string;
  displayDate: string;
  timestamp: number;
  value: number;
  weight: number;
  sets: number;
  reps: number;
  rir: number;
  x: number;
  y: number;
}

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  workouts,
  exerciseName,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [metric, setMetric] = useState<MetricType>('weight');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Filter workouts by time range and sort chronologically
  const chartData = useMemo(() => {
    if (!workouts || workouts.length === 0) return [];

    const now = new Date();
    let cutoff = new Date();

    if (timeRange === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoff.setDate(now.getDate() - 30);
    } else if (timeRange === 'year') {
      cutoff.setFullYear(now.getFullYear() - 1);
    }

    const cutoffTime = cutoff.getTime();

    // Sort ascending by date
    const sorted = [...workouts]
      .filter((w) => {
        const itemTime = new Date(w.date).getTime();
        return !isNaN(itemTime) && itemTime >= cutoffTime;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sorted.map((w) => {
      const weightVal = w.weight ?? 0;
      let calculatedValue = 0;

      if (metric === 'weight') {
        calculatedValue = weightVal > 0 ? weightVal : w.reps;
      } else if (metric === 'e1rm') {
        calculatedValue =
          weightVal > 0
            ? Math.round(weightVal * (1 + w.reps / 30) * 10) / 10
            : w.reps;
      } else if (metric === 'volume') {
        calculatedValue =
          weightVal > 0 ? w.sets * w.reps * weightVal : w.sets * w.reps;
      }

      return {
        id: w.id,
        date: w.date,
        displayDate: formatStandardDate(w.date),
        timestamp: new Date(w.date).getTime(),
        value: calculatedValue,
        weight: weightVal,
        sets: w.sets,
        reps: w.reps,
        rir: w.rir,
      };
    });
  }, [workouts, timeRange, metric]);

  // Maintained Enlarged Graph Dimensions
  const svgWidth = 760;
  const svgHeight = 360;
  const originX = 70;
  const paddingTop = 32;
  const originY = 300; // Baseline Y = 0
  const chartInnerWidth = svgWidth - originX - 35;
  const chartInnerHeight = originY - paddingTop;

  // Compute strictly from 0 to maxValue
  const {
    maxValue,
    pointsWithCoords,
    deltaPercent,
    deltaValue,
    peakPoint,
    latestPoint,
    yTicks,
  } = useMemo(() => {
    if (chartData.length === 0) {
      return {
        maxValue: 100,
        pointsWithCoords: [] as DataPoint[],
        deltaPercent: null,
        deltaValue: null,
        peakPoint: null,
        latestPoint: null,
        yTicks: [0, 25, 50, 75, 100],
      };
    }

    const values = chartData.map((d) => d.value);
    const rawMax = Math.max(...values);

    let calculatedMax = Math.ceil((rawMax * 1.25) / 10) * 10 || 20;
    if (calculatedMax < 20) calculatedMax = 20;

    const ticks = [
      0,
      Math.round((calculatedMax * 0.25) * 10) / 10,
      Math.round((calculatedMax * 0.5) * 10) / 10,
      Math.round((calculatedMax * 0.75) * 10) / 10,
      calculatedMax,
    ];

    const points: DataPoint[] = chartData.map((d, index) => {
      const stepX = chartInnerWidth / Math.max(1, chartData.length);
      const x = originX + (index + 0.5) * stepX;
      const y = originY - (d.value / calculatedMax) * chartInnerHeight;

      return {
        ...d,
        x,
        y,
      };
    });

    const first = points[0];
    const latest = points[points.length - 1];
    const peak = [...points].sort((a, b) => b.value - a.value)[0];

    const diff = latest.value - first.value;
    const pct = first.value > 0 ? Math.round((diff / first.value) * 1000) / 10 : null;

    return {
      maxValue: calculatedMax,
      pointsWithCoords: points,
      deltaPercent: pct,
      deltaValue: Math.round(diff * 10) / 10,
      peakPoint: peak,
      latestPoint: latest,
      yTicks: ticks,
    };
  }, [chartData, chartInnerWidth, chartInnerHeight, originX, originY]);

  // Construct Standard Straight Line Graph Path (Lineto) & Area
  const { linePath, areaPath } = useMemo(() => {
    if (pointsWithCoords.length === 0) return { linePath: '', areaPath: '' };

    let path = `M ${pointsWithCoords[0].x} ${pointsWithCoords[0].y}`;
    for (let i = 1; i < pointsWithCoords.length; i++) {
      path += ` L ${pointsWithCoords[i].x} ${pointsWithCoords[i].y}`;
    }

    const firstX = pointsWithCoords[0].x;
    const lastX = pointsWithCoords[pointsWithCoords.length - 1].x;

    const area = `${path} L ${lastX} ${originY} L ${firstX} ${originY} Z`;

    return { linePath: path, areaPath: area };
  }, [pointsWithCoords, originY]);

  const getMetricLabel = () => {
    if (metric === 'weight') return 'Weight (kg)';
    if (metric === 'e1rm') return 'Estimated 1RM (kg)';
    return 'Workout Volume Load';
  };

  const getMetricUnit = () => {
    if (metric === 'weight' || metric === 'e1rm') return 'kg';
    return 'load';
  };

  const getMetricDescription = () => {
    if (metric === 'weight') return 'Peak load lifted per session';
    if (metric === 'e1rm') return 'Estimated 1-Rep Maximum strength capacity';
    return 'Total workout volume (Sets × Reps × Weight)';
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header with Clear Growth Summary */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-3 border-b border-[#383530]/50">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#CC6543]" />
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F2EB]">
                Progression Graph
              </h2>
            </div>
            <p className="text-xs text-[#A8A297] mt-1">
              {getMetricDescription()} for <strong className="font-bold text-[#F5F2EB] text-sm">{exerciseName}</strong>
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-[#252320] border border-[#383530] p-0.5 rounded-full self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider transition-all duration-200 ${
                timeRange === 'week'
                  ? 'bg-[#CC6543] text-white font-bold shadow-sm'
                  : 'text-[#A8A297] hover:text-[#F5F2EB]'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider transition-all duration-200 ${
                timeRange === 'month'
                  ? 'bg-[#CC6543] text-white font-bold shadow-sm'
                  : 'text-[#A8A297] hover:text-[#F5F2EB]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider transition-all duration-200 ${
                timeRange === 'year'
                  ? 'bg-[#CC6543] text-white font-bold shadow-sm'
                  : 'text-[#A8A297] hover:text-[#F5F2EB]'
              }`}
            >
              Year
            </button>
          </div>
        </div>

        {/* 2. Key Insights Banner */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#252320]/70 border border-[#383530]/80 rounded-2xl p-4 sm:p-5">
            {/* Column 1: Current Weight */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="h-5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#A8A297]">
                <Activity className="w-3.5 h-3.5 text-[#A8A297]" />
                <span>Current Weight</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#F5F2EB] leading-none tracking-tight">
                  {latestPoint?.value}
                </span>
                <span className="text-xs uppercase text-[#A8A297]">
                  {getMetricUnit()}
                </span>
              </div>
            </div>

            {/* Column 2: Peak Record */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="h-5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#A8A297]">
                <Award className="w-3.5 h-3.5 text-[#E08E45]" />
                <span>Peak Record</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#E08E45] leading-none tracking-tight">
                  {peakPoint?.value}
                </span>
                <span className="text-xs uppercase text-[#A8A297]">
                  {getMetricUnit()}
                </span>
              </div>
            </div>

            {/* Column 3: Growth */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="h-5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#A8A297]">
                <Sparkles className="w-3.5 h-3.5 text-[#789D74]" />
                <span>Growth</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-3xl font-bold leading-none tracking-tight ${
                    deltaValue && deltaValue >= 0 ? 'text-[#789D74]' : 'text-[#D45B5B]'
                  }`}
                >
                  {deltaValue && deltaValue >= 0 ? '+' : ''}
                  {deltaValue}
                </span>
                <span className="text-xs text-[#A8A297]">
                  ({deltaPercent && deltaPercent >= 0 ? '+' : ''}
                  {deltaPercent}%)
                </span>
              </div>
            </div>

            {/* Column 4: Sessions */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="h-5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#A8A297]">
                <Layers className="w-3.5 h-3.5 text-[#A8A297]" />
                <span>Sessions ({timeRange})</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#F5F2EB] leading-none tracking-tight">
                  {chartData.length}
                </span>
                <span className="text-xs text-[#A8A297]">
                  {chartData.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Metric Selector Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#A8A297] mr-1">View by:</span>
        <button
          onClick={() => setMetric('weight')}
          className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
            metric === 'weight'
              ? 'bg-[#CC6543] text-white font-bold shadow-sm'
              : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
          }`}
        >
          Peak Weight
        </button>
        <button
          onClick={() => setMetric('e1rm')}
          className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
            metric === 'e1rm'
              ? 'bg-[#CC6543] text-white font-bold shadow-sm'
              : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
          }`}
        >
          Est. 1RM Max
        </button>
        <button
          onClick={() => setMetric('volume')}
          className={`px-3 py-1 rounded-full text-xs transition-all duration-200 ${
            metric === 'volume'
              ? 'bg-[#CC6543] text-white font-bold shadow-sm'
              : 'bg-[#252320] border border-[#383530] text-[#A8A297] hover:text-[#F5F2EB]'
          }`}
        >
          Total Volume
        </button>
      </div>

      {/* 4. Substantially Bigger Cartesian Line Graph */}
      {chartData.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#383530] rounded-2xl bg-[#252320]/20 animate-pop-in">
          <Info className="w-6 h-6 text-[#A8A297] mx-auto mb-2" />
          <p className="text-base text-[#F5F2EB] font-medium">
            No recorded workouts in the last <span className="capitalize">{timeRange}</span>.
          </p>
          <p className="text-xs text-[#706B62] mt-1">
            Log your next set in the box to start building your progression curve.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden bg-[#1E1D1A]/80 border border-[#383530]/80 rounded-2xl p-3 sm:p-5 shadow-md">
          {/* Active Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-4 right-4 z-20 bg-[#252320]/95 border border-[#CC6543]/50 rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-md animate-pop-in text-left pointer-events-none">
              <div className="text-xs font-bold text-[#CC6543] tracking-wide">
                {hoveredPoint.displayDate}
              </div>
              <div className="text-base font-bold text-[#F5F2EB] mt-0.5">
                {hoveredPoint.value} {getMetricUnit()}
              </div>
              <div className="text-[11px] text-[#A8A297] mt-1">
                {hoveredPoint.sets} sets × {hoveredPoint.reps} reps · {hoveredPoint.rir} RIR
              </div>
            </div>
          )}

          {/* SVG Vector Cartesian Line Graph */}
          <div className="w-full aspect-[1.8/1] sm:aspect-[2.1/1] min-h-[300px] sm:min-h-[360px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="lineGraphGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CC6543" stopOpacity="0.38" />
                  <stop offset="75%" stopColor="#CC6543" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#CC6543" stopOpacity="0.0" />
                </linearGradient>

                <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#CC6543" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Y-AXIS TITLE (Clean Bold Sans) */}
              <text
                transform="rotate(-90)"
                x={-(paddingTop + chartInnerHeight / 2)}
                y={20}
                textAnchor="middle"
                fontSize="12"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontWeight="bold"
                fill="#CC6543"
                letterSpacing="0.06em"
              >
                {getMetricLabel()}
              </text>

              {/* X-AXIS TITLE (Clean Bold Sans) */}
              <text
                x={originX + chartInnerWidth / 2}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="12"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontWeight="bold"
                fill="#CC6543"
                letterSpacing="0.06em"
              >
                Timeline / Workout Sessions →
              </text>

              {/* Y-Axis Horizontal Gridlines */}
              {yTicks.map((val, i) => {
                const y = originY - (val / maxValue) * chartInnerHeight;

                return (
                  <g key={i}>
                    <line
                      x1={originX}
                      y1={y}
                      x2={svgWidth - 30}
                      y2={y}
                      stroke="#383530"
                      strokeWidth={val === 0 ? '2' : '1'}
                      strokeDasharray={val === 0 ? 'none' : '4 4'}
                      strokeOpacity={val === 0 ? '1' : '0.6'}
                    />
                    <text
                      x={originX - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      fill={val === 0 ? '#F5F2EB' : '#8A8477'}
                      fontWeight={val === 0 ? 'bold' : 'normal'}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Solid Y-Axis Line */}
              <line
                x1={originX}
                y1={originY}
                x2={originX}
                y2={paddingTop - 10}
                stroke="#5E584E"
                strokeWidth="2"
              />

              {/* Solid X-Axis Line */}
              <line
                x1={originX}
                y1={originY}
                x2={svgWidth - 25}
                y2={originY}
                stroke="#5E584E"
                strokeWidth="2"
              />

              {/* (0, 0) Origin label */}
              <text
                x={originX - 10}
                y={originY + 15}
                textAnchor="end"
                fontSize="9"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fill="#CC6543"
                fontWeight="bold"
              >
                (0,0)
              </text>

              {/* Area Under Line */}
              {areaPath && (
                <path d={areaPath} fill="url(#lineGraphGradient)" />
              )}

              {/* Straight Line Graph Path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#CC6543"
                  strokeWidth="3.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Nodes */}
              {pointsWithCoords.map((point) => {
                const isHovered = hoveredPoint?.id === point.id;
                const isPeak = peakPoint?.id === point.id && pointsWithCoords.length > 1;

                return (
                  <g
                    key={point.id}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer group"
                  >
                    {/* Large Hit Target */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="18"
                      fill="transparent"
                    />

                    {/* Vertical drop guide line to (0) X-Axis */}
                    {isHovered && (
                      <line
                        x1={point.x}
                        y1={point.y}
                        x2={point.x}
                        y2={originY}
                        stroke="#CC6543"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        opacity="0.9"
                      />
                    )}

                    {/* Peak Star Annotation */}
                    {isPeak && (
                      <g>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="10"
                          fill="#E08E45"
                          opacity="0.25"
                        />
                        <text
                          x={point.x}
                          y={point.y - 12}
                          textAnchor="middle"
                          fontSize="11"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                          fontWeight="bold"
                          fill="#E08E45"
                        >
                          ★ PB
                        </text>
                      </g>
                    )}

                    {/* Outer Glow Halo on Hover */}
                    {isHovered && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="9"
                        fill="#CC6543"
                        opacity="0.3"
                        className="animate-ping"
                      />
                    )}

                    {/* Inner Node */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? 6.5 : isPeak ? 5 : 4}
                      fill={isHovered ? '#DE7C5A' : isPeak ? '#E08E45' : '#CC6543'}
                      stroke="#191816"
                      strokeWidth="2.5"
                      filter="url(#nodeGlow)"
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}

              {/* X-Axis Date Labels along the Bottom X-Axis */}
              {pointsWithCoords.map((point, idx) => (
                <text
                  key={point.id}
                  x={point.x}
                  y={originY + 18}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fill={hoveredPoint?.id === point.id ? '#F5F2EB' : '#706B62'}
                  fontWeight={hoveredPoint?.id === point.id ? 'bold' : 'normal'}
                >
                  {pointsWithCoords.length > 5 && idx % 2 !== 0 && idx !== pointsWithCoords.length - 1
                    ? ''
                    : point.date.slice(5)}
                </text>
              ))}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
