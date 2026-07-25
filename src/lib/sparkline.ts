export type SparkPoint = {
  x: number;
  y: number;
};

export type SparkDirection = 'up' | 'down' | 'flat';

export type SparklineShape = {
  points: SparkPoint[];
  line: string;
  area: string;
  direction: SparkDirection;
  width: number;
  height: number;
};

export const sparklineSize = {
  width: 120,
  height: 36,
} as const;

export function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeSeries(values: number[], limit: number) {
  if (limit <= 0) {
    return [];
  }

  return values.slice(-limit).filter((value) => Number.isFinite(value));
}

export function buildSparkPoints(values: number[], width: number, height: number): SparkPoint[] {
  if (values.length < 2) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const span = range === 0 ? 1 : range;
  const step = width / (values.length - 1);

  return values.map((value, index) => ({
    x: roundCoordinate(index * step),
    y: roundCoordinate(height - ((value - min) / span) * height),
  }));
}

export function toPolyline(points: SparkPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function toAreaPath(points: SparkPoint[], width: number, height: number) {
  if (points.length === 0) {
    return '';
  }

  const body = points.map((point) => `L${point.x} ${point.y}`).join(' ');

  return `M0 ${height} ${body} L${width} ${height} Z`;
}

export function resolveDirection(values: number[]): SparkDirection {
  if (values.length < 2) {
    return 'flat';
  }

  const delta = values[values.length - 1] - values[0];

  if (delta > 0) {
    return 'up';
  }

  if (delta < 0) {
    return 'down';
  }

  return 'flat';
}

export function buildSparkline(
  values: number[],
  limit = 30,
  width: number = sparklineSize.width,
  height: number = sparklineSize.height,
): SparklineShape | null {
  const series = normalizeSeries(values, limit);
  const points = buildSparkPoints(series, width, height);

  if (points.length === 0) {
    return null;
  }

  return {
    points,
    line: toPolyline(points),
    area: toAreaPath(points, width, height),
    direction: resolveDirection(series),
    width,
    height,
  };
}
