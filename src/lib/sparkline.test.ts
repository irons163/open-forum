import { describe, expect, it } from 'vitest';
import {
  buildSparkPoints,
  buildSparkline,
  normalizeSeries,
  resolveDirection,
  roundCoordinate,
  sparklineSize,
  toAreaPath,
  toPolyline,
} from './sparkline';

describe('sparkline geometry', () => {
  it('rounds coordinates to two decimals', () => {
    expect(roundCoordinate(1.23456)).toBe(1.23);
    expect(roundCoordinate(10)).toBe(10);
  });

  it('keeps only the most recent finite values', () => {
    expect(normalizeSeries([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(normalizeSeries([1, Number.NaN, 3], 3)).toEqual([1, 3]);
    expect(normalizeSeries([1, 2, 3], 0)).toEqual([]);
    expect(normalizeSeries([1, 2, 3], -5)).toEqual([]);
  });

  it('needs at least two values to plot points', () => {
    expect(buildSparkPoints([], 100, 20)).toEqual([]);
    expect(buildSparkPoints([5], 100, 20)).toEqual([]);
  });

  it('maps values across the full drawing box', () => {
    const points = buildSparkPoints([0, 10], 100, 20);

    expect(points).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 0 },
    ]);
  });

  it('centers a flat series instead of dividing by zero', () => {
    const points = buildSparkPoints([7, 7, 7], 100, 20);

    expect(points).toEqual([
      { x: 0, y: 20 },
      { x: 50, y: 20 },
      { x: 100, y: 20 },
    ]);
  });

  it('serializes points into polyline and area strings', () => {
    const points = buildSparkPoints([0, 10], 100, 20);

    expect(toPolyline(points)).toBe('0,20 100,0');
    expect(toAreaPath(points, 100, 20)).toBe('M0 20 L0 20 L100 0 L100 20 Z');
    expect(toAreaPath([], 100, 20)).toBe('');
  });

  it('detects series direction', () => {
    expect(resolveDirection([])).toBe('flat');
    expect(resolveDirection([3])).toBe('flat');
    expect(resolveDirection([1, 5])).toBe('up');
    expect(resolveDirection([5, 1])).toBe('down');
    expect(resolveDirection([4, 9, 4])).toBe('flat');
  });
});

describe('buildSparkline', () => {
  it('returns null when there is not enough history', () => {
    expect(buildSparkline([])).toBeNull();
    expect(buildSparkline([42])).toBeNull();
    expect(buildSparkline([1, 2], 0)).toBeNull();
  });

  it('builds a drawable shape with default dimensions', () => {
    const shape = buildSparkline([1, 2, 3]);

    expect(shape).not.toBeNull();
    expect(shape?.width).toBe(sparklineSize.width);
    expect(shape?.height).toBe(sparklineSize.height);
    expect(shape?.direction).toBe('up');
    expect(shape?.points).toHaveLength(3);
    expect(shape?.line.split(' ')).toHaveLength(3);
    expect(shape?.area.startsWith('M0 36')).toBe(true);
  });

  it('honours explicit limit and dimensions', () => {
    const shape = buildSparkline([9, 8, 7, 6], 2, 40, 10);

    expect(shape?.width).toBe(40);
    expect(shape?.height).toBe(10);
    expect(shape?.direction).toBe('down');
    expect(shape?.points).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 10 },
    ]);
  });
});
