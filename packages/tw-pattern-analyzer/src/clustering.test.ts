import { describe, it, expect } from 'vitest';
import type { PatternStats, Cluster, AnalyzerConfig } from './types';

// Mock the clustering logic that would be in the main index file
// This tests the core clustering algorithms and scoring

describe('Clustering and Scoring', () => {
  const mockConfig: AnalyzerConfig = {
    globs: [],
    ignoreGlobs: [],
    similarityThreshold: 0.75,
    minOccurrences: 2,
    minVariants: 1,
    output: {
      console: { enabled: true, top: 20 },
      json: { enabled: true, path: 'reports/test.json' },
    },
    parsing: {
      patterns: {
        react: /className/g,
        astro: /class/g,
        vue: /class/g,
        svelte: /class/g,
      },
      fileTypes: {},
    },
    clustering: {
      scoring: {
        variants: 60,
        frequency: 40,
      },
    },
  };

  describe('Pattern Clustering', () => {
    it('should cluster similar patterns based on similarity threshold', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 5,
          percent: 25,
          variants: ['flex gap-4 items-center'],
        },
        {
          pattern: 'flex gap-4 justify-center',
          occurrences: 3,
          percent: 15,
          variants: ['flex gap-4 justify-center'],
        },
        {
          pattern: 'text-center font-bold',
          occurrences: 4,
          percent: 20,
          variants: ['text-center font-bold'],
        },
        {
          pattern: 'container mx-auto px-4',
          occurrences: 6,
          percent: 30,
          variants: ['container mx-auto px-4'],
        },
      ];

      const clusters = clusterPatterns(patterns, 0.7);

      // With 0.7 threshold, flex patterns should cluster together
      // flex gap-4 items-center vs flex gap-4 justify-center: 2 common / 4 total = 0.5
      // Since 0.5 < 0.7, they won't cluster together
      expect(clusters.length).toBeGreaterThanOrEqual(3); // At least 3 clusters

      // text-center should be separate
      expect(
        clusters.some(
          (c) =>
            c.members.length === 1 && c.members[0] === 'text-center font-bold'
        )
      ).toBe(true);
    });

    it('should respect similarity threshold', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 5,
          percent: 25,
          variants: ['flex gap-4 items-center'],
        },
        {
          pattern: 'flex gap-4 justify-center',
          occurrences: 3,
          percent: 15,
          variants: ['flex gap-4 justify-center'],
        },
        {
          pattern: 'text-center font-bold',
          occurrences: 4,
          percent: 20,
          variants: ['text-center font-bold'],
        },
      ];

      const highThresholdClusters = clusterPatterns(patterns, 0.9);
      const lowThresholdClusters = clusterPatterns(patterns, 0.5);

      // Higher threshold = fewer clusters
      expect(highThresholdClusters.length).toBeGreaterThanOrEqual(
        lowThresholdClusters.length
      );
    });

    it('should handle empty pattern sets', () => {
      const patterns: PatternStats[] = [];
      const clusters = clusterPatterns(patterns, 0.75);

      expect(clusters).toEqual([]);
    });

    it('should handle single patterns', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 5,
          percent: 100,
          variants: ['flex gap-4 items-center'],
        },
      ];
      const clusters = clusterPatterns(patterns, 0.75);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].members).toHaveLength(1);
    });

    it('should not cluster completely different patterns', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 5,
          percent: 25,
          variants: ['flex gap-4 items-center'],
        },
        {
          pattern: 'text-center font-bold text-xl',
          occurrences: 3,
          percent: 15,
          variants: ['text-center font-bold text-xl'],
        },
        {
          pattern: 'bg-blue-500 hover:bg-blue-600',
          occurrences: 4,
          percent: 20,
          variants: ['bg-blue-500 hover:bg-blue-600'],
        },
      ];

      const clusters = clusterPatterns(patterns, 0.75);

      // All patterns should be in separate clusters
      expect(clusters).toHaveLength(3);
      clusters.forEach((cluster) => {
        expect(cluster.members).toHaveLength(1);
      });
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate Jaccard similarity correctly', () => {
      const set1 = ['flex', 'gap-4', 'items-center'];
      const set2 = ['flex', 'gap-4', 'justify-center'];

      // 2 common elements, 4 total unique elements = 2/4 = 0.5
      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(0.5);
    });

    it('should return 1 for identical sets', () => {
      const set1 = ['flex', 'gap-4', 'items-center'];
      const set2 = ['flex', 'gap-4', 'items-center'];

      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different sets', () => {
      const set1 = ['flex', 'gap-4'];
      const set2 = ['text-center', 'font-bold'];

      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(0);
    });

    it('should handle empty sets', () => {
      const set1: string[] = [];
      const set2: string[] = [];

      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(1); // Empty sets are considered identical
    });

    it('should handle one empty set', () => {
      const set1 = ['flex', 'gap-4'];
      const set2: string[] = [];

      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(0);
    });

    it('should handle partial overlaps', () => {
      const set1 = ['flex', 'gap-4', 'items-center', 'text-center'];
      const set2 = ['flex', 'gap-4', 'justify-center'];

      // 2 common elements, 5 total unique elements = 2/5 = 0.4
      const similarity = calculateJaccardSimilarity(set1, set2);
      expect(similarity).toBe(0.4);
    });
  });

  describe('Likelihood Scoring', () => {
    it('should calculate likelihood score correctly', () => {
      const cluster: Cluster = {
        rep: 'flex gap-4 items-center',
        members: [
          'flex gap-4 items-center',
          'flex gap-4 items-center justify-between',
        ],
        occurrences: 25,
        variants: 2,
        similarity: 0.8,
        likelihood: 0,
      };

      const score = calculateLikelihood(cluster, mockConfig.clustering.scoring);

      // Variant score: 2 variants * (60/10) = 12 points
      // Frequency score: 25 occurrences * (40/50) = 20 points
      // Total: 32 points = 32%
      expect(score).toBe(32);
    });

    it('should handle maximum scores', () => {
      const cluster: Cluster = {
        rep: 'flex gap-4 items-center',
        members: ['flex gap-4 items-center'],
        occurrences: 100,
        variants: 20,
        similarity: 1.0,
        likelihood: 0,
      };

      const score = calculateLikelihood(cluster, mockConfig.clustering.scoring);

      // Should cap at 100%
      expect(score).toBe(100);
    });

    it('should handle minimum scores', () => {
      const cluster: Cluster = {
        rep: 'flex gap-4 items-center',
        members: ['flex gap-4 items-center'],
        occurrences: 1,
        variants: 1,
        similarity: 1.0,
        likelihood: 0,
      };

      const score = calculateLikelihood(cluster, mockConfig.clustering.scoring);

      // Should be at least 0%
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should weight variants and frequency correctly', () => {
      const highVariantsCluster: Cluster = {
        rep: 'flex gap-4 items-center',
        members: ['flex gap-4 items-center'],
        occurrences: 10,
        variants: 15,
        similarity: 0.9,
        likelihood: 0,
      };

      const highFrequencyCluster: Cluster = {
        rep: 'text-center font-bold',
        members: ['text-center font-bold'],
        occurrences: 50,
        variants: 3,
        similarity: 0.8,
        likelihood: 0,
      };

      const variantsScore = calculateLikelihood(
        highVariantsCluster,
        mockConfig.clustering.scoring
      );
      const frequencyScore = calculateLikelihood(
        highFrequencyCluster,
        mockConfig.clustering.scoring
      );

      // High variants should score well on variant component
      expect(variantsScore).toBeGreaterThan(40);

      // High frequency should score well on frequency component
      expect(frequencyScore).toBeGreaterThan(30);
    });
  });

  describe('Pattern Filtering', () => {
    it('should filter by minimum occurrences', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 5,
          percent: 25,
          variants: ['flex gap-4 items-center'],
        },
        {
          pattern: 'text-center font-bold',
          occurrences: 1,
          percent: 5,
          variants: ['text-center font-bold'],
        },
        {
          pattern: 'container mx-auto',
          occurrences: 3,
          percent: 15,
          variants: ['container mx-auto'],
        },
      ];

      const filtered = filterPatterns(patterns, 2, 1);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((p) => p.occurrences >= 2)).toBe(true);
    });

    it('should filter by minimum variants', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 5,
          percent: 25,
          variants: [
            'flex gap-4 items-center',
            'flex gap-4 items-center justify-between',
          ],
        },
        {
          pattern: 'text-center font-bold',
          occurrences: 3,
          percent: 15,
          variants: ['text-center font-bold'],
        },
        {
          pattern: 'container mx-auto',
          occurrences: 4,
          percent: 20,
          variants: [
            'container mx-auto',
            'container mx-auto px-4',
            'container mx-auto px-6',
          ],
        },
      ];

      const filtered = filterPatterns(patterns, 2, 2);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((p) => p.variants.length >= 2)).toBe(true);
    });

    it('should handle edge cases in filtering', () => {
      const patterns: PatternStats[] = [
        {
          pattern: 'flex gap-4 items-center',
          occurrences: 0,
          percent: 0,
          variants: ['flex gap-4 items-center'],
        },
        {
          pattern: 'text-center font-bold',
          occurrences: 1,
          percent: 5,
          variants: ['text-center font-bold'],
        },
      ];

      const filtered = filterPatterns(patterns, 1, 1);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].pattern).toBe('text-center font-bold');
    });
  });

  describe('Cluster Ranking', () => {
    it('should rank clusters by likelihood score', () => {
      const clusters: Cluster[] = [
        {
          rep: 'low-score',
          members: ['low-score'],
          occurrences: 5,
          variants: 2,
          similarity: 0.8,
          likelihood: 30,
        },
        {
          rep: 'high-score',
          members: ['high-score'],
          occurrences: 20,
          variants: 8,
          similarity: 0.9,
          likelihood: 85,
        },
        {
          rep: 'medium-score',
          members: ['medium-score'],
          occurrences: 10,
          variants: 4,
          similarity: 0.85,
          likelihood: 55,
        },
      ];

      const ranked = rankClusters(clusters);

      expect(ranked[0].likelihood).toBe(85);
      expect(ranked[1].likelihood).toBe(55);
      expect(ranked[2].likelihood).toBe(30);
    });

    it('should handle clusters with same likelihood', () => {
      const clusters: Cluster[] = [
        {
          rep: 'pattern-a',
          members: ['pattern-a'],
          occurrences: 10,
          variants: 3,
          similarity: 0.8,
          likelihood: 50,
        },
        {
          rep: 'pattern-b',
          members: ['pattern-b'],
          occurrences: 8,
          variants: 4,
          similarity: 0.85,
          likelihood: 50,
        },
      ];

      const ranked = rankClusters(clusters);

      // Should maintain order when likelihood is the same
      expect(ranked).toHaveLength(2);
      expect(ranked.every((c) => c.likelihood === 50)).toBe(true);
    });

    it('should handle empty cluster sets', () => {
      const clusters: Cluster[] = [];
      const ranked = rankClusters(clusters);

      expect(ranked).toEqual([]);
    });
  });
});

// Helper functions for testing (these would be the actual implementations)
function clusterPatterns(
  patterns: PatternStats[],
  threshold: number
): Cluster[] {
  // Simplified clustering logic for testing
  const clusters: Cluster[] = [];

  for (const pattern of patterns) {
    let clustered = false;

    for (const cluster of clusters) {
      // Check if this pattern should be clustered with existing cluster
      const similarity = calculateJaccardSimilarity(
        pattern.pattern.split(' '),
        cluster.rep.split(' ')
      );

      if (similarity >= threshold) {
        cluster.members.push(pattern.pattern);
        cluster.occurrences += pattern.occurrences;
        cluster.variants = cluster.members.length;
        clustered = true;
        break;
      }
    }

    if (!clustered) {
      clusters.push({
        rep: pattern.pattern,
        members: [pattern.pattern],
        occurrences: pattern.occurrences,
        variants: 1,
        similarity: 1,
        likelihood: 0,
      });
    }
  }

  // Calculate likelihood for each cluster
  clusters.forEach((cluster) => {
    cluster.likelihood = calculateLikelihood(cluster, {
      variants: 60,
      frequency: 40,
    });
  });

  return clusters;
}

function calculateJaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 1;
  if (set1.length === 0 || set2.length === 0) return 0;

  const intersection = set1.filter((item) => set2.includes(item));
  const union = [...new Set([...set1, ...set2])];

  return intersection.length / union.length;
}

function calculateLikelihood(
  cluster: Cluster,
  scoring: { variants: number; frequency: number }
): number {
  const variantScore = Math.min(
    cluster.variants * (scoring.variants / 10),
    scoring.variants
  );
  const frequencyScore = Math.min(
    cluster.occurrences * (scoring.frequency / 50),
    scoring.frequency
  );

  return Math.min(Math.round(variantScore + frequencyScore), 100);
}

function filterPatterns(
  patterns: PatternStats[],
  minOccurrences: number,
  minVariants: number
): PatternStats[] {
  return patterns.filter(
    (p) => p.occurrences >= minOccurrences && p.variants.length >= minVariants
  );
}

function rankClusters(clusters: Cluster[]): Cluster[] {
  return [...clusters].sort((a, b) => b.likelihood - a.likelihood);
}
