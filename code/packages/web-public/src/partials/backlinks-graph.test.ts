import { describe, expect, it } from 'vitest';
import {
  buildNeighborhood,
  layoutNeighborhood,
  renderBacklinksGraph,
  renderBacklinksGraphSection,
} from './backlinks-graph.js';

describe('buildNeighborhood', () => {
  it('returns empty neighbors when there are no links', () => {
    const n = buildNeighborhood({
      slug: 'a',
      title: 'A',
      backlinks: [],
      outlinks: [],
    });
    expect(n.slug).toBe('a');
    expect(n.title).toBe('A');
    expect(n.neighbors).toEqual([]);
  });

  it('merges backlinks and outlinks, marking bidirectional as both', () => {
    const n = buildNeighborhood({
      slug: 'a',
      title: 'A',
      backlinks: [
        { src_slug: 'b', title: 'B' },
        { src_slug: 'c', title: 'C' },
      ],
      outlinks: [
        { dst_slug: 'b', title: 'B' }, // bidirectional with b
        { dst_slug: 'd', title: 'D' },
      ],
    });
    // sorted by slug
    expect(n.neighbors.map((x) => x.slug)).toEqual(['b', 'c', 'd']);
    const map = new Map(n.neighbors.map((x) => [x.slug, x.direction]));
    expect(map.get('b')).toBe('both');
    expect(map.get('c')).toBe('in');
    expect(map.get('d')).toBe('out');
  });

  it('drops self-links and falls back to slug as title when missing', () => {
    const n = buildNeighborhood({
      slug: 'a',
      title: 'A',
      backlinks: [
        { src_slug: 'a', title: 'A' }, // self
        { src_slug: 'b', title: '' },
      ],
      outlinks: [
        { dst_slug: null, title: 'unresolved' },
        { dst_slug: 'a', title: 'A' }, // self
      ],
    });
    expect(n.neighbors).toHaveLength(1);
    expect(n.neighbors[0]).toEqual({ slug: 'b', title: 'b', direction: 'in' });
  });
});

describe('layoutNeighborhood', () => {
  it('places center at the middle of the SVG', () => {
    const laid = layoutNeighborhood(
      { slug: 'a', title: 'A', neighbors: [] },
      { size: 220 },
    );
    expect(laid).toHaveLength(1);
    expect(laid[0]).toMatchObject({ slug: 'a', x: 110, y: 110, isCenter: true });
  });

  it('places a single neighbor on the circle (start angle = -π/2 → directly above)', () => {
    const laid = layoutNeighborhood(
      {
        slug: 'a',
        title: 'A',
        neighbors: [{ slug: 'b', title: 'B', direction: 'in' }],
      },
      { size: 220, radius: 80 },
    );
    expect(laid).toHaveLength(2);
    const nb = laid[1]!;
    expect(nb.slug).toBe('b');
    expect(nb.x).toBeCloseTo(110, 5);
    expect(nb.y).toBeCloseTo(30, 5); // 110 + sin(-π/2)*80 = 30
    expect(nb.isCenter).toBe(false);
  });

  it('distributes 4 neighbors at cardinal positions', () => {
    const laid = layoutNeighborhood(
      {
        slug: 'a',
        title: 'A',
        neighbors: [
          { slug: 'n1', title: 'n1', direction: 'in' },
          { slug: 'n2', title: 'n2', direction: 'in' },
          { slug: 'n3', title: 'n3', direction: 'in' },
          { slug: 'n4', title: 'n4', direction: 'in' },
        ],
      },
      { size: 220, radius: 80 },
    );
    // start at -π/2 (top), then +π/2 each step → top, right, bottom, left
    expect(laid[1]).toMatchObject({ slug: 'n1' });
    expect(laid[1]!.x).toBeCloseTo(110, 5);
    expect(laid[1]!.y).toBeCloseTo(30, 5);
    expect(laid[2]!.x).toBeCloseTo(190, 5); // right
    expect(laid[2]!.y).toBeCloseTo(110, 5);
    expect(laid[3]!.x).toBeCloseTo(110, 5); // bottom
    expect(laid[3]!.y).toBeCloseTo(190, 5);
    expect(laid[4]!.x).toBeCloseTo(30, 5); // left
    expect(laid[4]!.y).toBeCloseTo(110, 5);
  });

  it('is deterministic for the same input', () => {
    const input = {
      slug: 'a',
      title: 'A',
      neighbors: [
        { slug: 'b', title: 'B', direction: 'in' as const },
        { slug: 'c', title: 'C', direction: 'out' as const },
        { slug: 'd', title: 'D', direction: 'both' as const },
      ],
    };
    const a = layoutNeighborhood(input);
    const b = layoutNeighborhood(input);
    expect(a).toEqual(b);
  });
});

describe('renderBacklinksGraph', () => {
  it('returns empty string when there are no neighbors', () => {
    expect(
      renderBacklinksGraph({ slug: 'a', title: 'A', neighbors: [] }),
    ).toBe('');
    expect(
      renderBacklinksGraphSection({ slug: 'a', title: 'A', neighbors: [] }),
    ).toBe('');
  });

  it('emits an svg with center + neighbor + edge for one neighbor', () => {
    const svg = renderBacklinksGraph({
      slug: 'a',
      title: 'A',
      neighbors: [{ slug: 'b', title: 'Neighbor B', direction: 'in' }],
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('wsa-minigraph__node--center');
    expect(svg).toContain('wsa-minigraph__node--neighbor');
    expect(svg).toContain('<line');
    expect(svg).toContain('href="/posts/b.html"');
    expect(svg).toContain('Neighbor B');
  });

  it('escapes attributes and labels safely', () => {
    const svg = renderBacklinksGraph({
      slug: 'a',
      title: 'A',
      neighbors: [
        {
          slug: 'evil"slug',
          title: '<script>alert(1)</script>',
          direction: 'in',
        },
      ],
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('truncates long labels to ~12 chars with ellipsis', () => {
    const svg = renderBacklinksGraph({
      slug: 'a',
      title: 'A',
      neighbors: [
        {
          slug: 'b',
          title: 'A very long title that exceeds twelve chars',
          direction: 'in',
        },
      ],
    });
    expect(svg).toContain('…');
  });
});
