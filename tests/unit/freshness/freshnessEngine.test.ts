import { describe, expect, it } from 'vitest';
import { classifyFreshness, ageDescription } from '@domain/freshness/freshnessEngine';

describe('freshness / freshnessEngine', () => {
  const now = new Date('2026-08-31T12:00:00Z');

  it('returns LIVE for <= 6 hours', () => {
    const last = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    expect(classifyFreshness(last, now)).toBe('LIVE');
  });

  it('returns FRESH for 6-24 hours', () => {
    const last = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    expect(classifyFreshness(last, now)).toBe('FRESH');
  });

  it('returns RECENT for 24-72 hours', () => {
    const last = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    expect(classifyFreshness(last, now)).toBe('RECENT');
  });

  it('returns AGING for 3-7 days', () => {
    const last = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(classifyFreshness(last, now)).toBe('AGING');
  });

  it('returns HISTORICAL for > 7 days', () => {
    const last = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(classifyFreshness(last, now)).toBe('HISTORICAL');
  });

  it('returns HISTORICAL for null', () => {
    expect(classifyFreshness(null, now)).toBe('HISTORICAL');
  });

  it('accepts string dates', () => {
    const last = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(classifyFreshness(last, now)).toBe('LIVE');
  });

  it('ageDescription is human-friendly', () => {
    const last = new Date(now.getTime() - 38 * 60 * 1000);
    expect(ageDescription(last, now)).toBe('verified 38m ago');
  });

  it('ageDescription handles null', () => {
    expect(ageDescription(null, now)).toBe('no verification on record');
  });
});
