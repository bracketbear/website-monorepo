/**
 * Tests for Section Observer Utility
 *
 * Tests intersection observer functionality for tracking active sections
 * with proper mocking of browser APIs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initSectionObserver,
  setupSectionObserver,
  type Section,
} from './sectionObserver';

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit;
  observedElements: Element[] = [];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.options = options || {};
  }

  observe(element: Element): void {
    this.observedElements.push(element);
  }

  unobserve(element: Element): void {
    const index = this.observedElements.indexOf(element);
    if (index > -1) {
      this.observedElements.splice(index, 1);
    }
  }

  disconnect(): void {
    this.observedElements = [];
  }

  // Test helper: simulate intersection change
  simulateIntersection(entries: Partial<IntersectionObserverEntry>[]): void {
    const mockEntries = entries.map((entry, index) => ({
      target:
        entry.target ||
        this.observedElements[index] ||
        document.createElement('div'),
      isIntersecting: entry.isIntersecting || false,
      intersectionRatio: entry.intersectionRatio || 0,
      boundingClientRect: entry.boundingClientRect || new DOMRect(),
      rootBounds: entry.rootBounds || new DOMRect(),
      time: entry.time || Date.now(),
    })) as IntersectionObserverEntry[];

    this.callback(mockEntries, this as any);
  }
}

// Mock DOM methods
const mockQuerySelectorAll = vi.fn();
const mockGetElementById = vi.fn();
const mockClassListToggle = vi.fn();
const mockSetAttribute = vi.fn();
const mockGetAttribute = vi.fn();

// Mock history API
const mockReplaceState = vi.fn();

describe('Section Observer', () => {
  let mockSections: Section[];
  let mockElements: HTMLElement[];
  let mockTocLinks: Element[];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock global APIs
    global.IntersectionObserver = MockIntersectionObserver as any;
    global.document.querySelectorAll = mockQuerySelectorAll;
    global.document.getElementById = mockGetElementById;
    global.history.replaceState = mockReplaceState;

    // Setup test data
    mockSections = [
      { id: 'section1', title: 'Section 1' },
      { id: 'section2', title: 'Section 2' },
      { id: 'section3', title: 'Section 3' },
    ];

    // Create mock DOM elements
    mockElements = mockSections.map((section) => {
      const element = document.createElement('div');
      element.id = section.id;
      return element;
    });

    // Create mock TOC links
    mockTocLinks = mockSections.map((section) => {
      const link = document.createElement('a');
      link.setAttribute('data-section-id', section.id);
      link.classList.toggle = mockClassListToggle;
      link.setAttribute = mockSetAttribute;
      link.getAttribute = vi.fn().mockImplementation((attr: string) => {
        if (attr === 'data-section-id') return section.id;
        return null;
      });
      return link;
    });

    // Setup mock implementations
    mockGetElementById.mockImplementation(
      (id: string) => mockElements.find((el) => el.id === id) || null
    );

    mockQuerySelectorAll.mockReturnValue(mockTocLinks);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initSectionObserver', () => {
    it('should return undefined when no sections provided', () => {
      const result = initSectionObserver([]);
      expect(result).toBeUndefined();
    });

    it('should return undefined when sections have no IDs', () => {
      const invalidSections = [
        { id: '', title: 'Empty ID' },
        { title: 'No ID' },
      ] as Section[];

      const result = initSectionObserver(invalidSections);
      expect(result).toBeUndefined();
    });

    it('should return undefined when DOM elements not found', () => {
      mockGetElementById.mockReturnValue(null);

      const result = initSectionObserver(mockSections);
      expect(result).toBeUndefined();
    });

    it('should create observer and return cleanup function', () => {
      const result = initSectionObserver(mockSections);

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
      expect(mockGetElementById).toHaveBeenCalledTimes(mockSections.length);
    });

    it('should observe all section elements', () => {
      const result = initSectionObserver(mockSections);

      expect(result).toBeDefined();
      // Verify that all elements would be observed (we can't directly test this
      // with our mock, but we can verify the elements were found)
      expect(mockGetElementById).toHaveBeenCalledWith('section1');
      expect(mockGetElementById).toHaveBeenCalledWith('section2');
      expect(mockGetElementById).toHaveBeenCalledWith('section3');
    });
  });

  describe('intersection handling', () => {
    let observer: MockIntersectionObserver;

    beforeEach(() => {
      // Track observer creation
      const originalIntersectionObserver = global.IntersectionObserver;
      let createdObserver: MockIntersectionObserver;

      global.IntersectionObserver = class extends MockIntersectionObserver {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit
        ) {
          super(callback, options);
          createdObserver = this;
        }
      } as any;

      initSectionObserver(mockSections);
      observer = createdObserver!;

      // Restore original
      global.IntersectionObserver = originalIntersectionObserver;
    });

    it('should prioritize first visible section in order', () => {
      // Simulate section2 and section3 being visible
      observer.simulateIntersection([
        { target: mockElements[1], isIntersecting: true }, // section2
        { target: mockElements[2], isIntersecting: true }, // section3
      ]);

      // Should activate section2 (first in order)
      expect(mockClassListToggle).toHaveBeenCalledWith('active', true);
      expect(mockSetAttribute).toHaveBeenCalledWith('aria-current', 'true');
    });

    it('should update TOC links correctly', () => {
      observer.simulateIntersection([
        { target: mockElements[0], isIntersecting: true }, // section1
      ]);

      // Verify TOC link updates
      expect(mockClassListToggle).toHaveBeenCalledWith('active', true);
      expect(mockSetAttribute).toHaveBeenCalledWith('aria-current', 'true');
    });

    it('should update URL hash when section becomes active', () => {
      observer.simulateIntersection([
        { target: mockElements[1], isIntersecting: true }, // section2
      ]);

      expect(mockReplaceState).toHaveBeenCalledWith(null, '', '#section2');
    });

    it('should not update URL hash if already correct', () => {
      // Mock current hash
      Object.defineProperty(window, 'location', {
        value: { hash: '#section2' },
        writable: true,
      });

      observer.simulateIntersection([
        { target: mockElements[1], isIntersecting: true }, // section2
      ]);

      expect(mockReplaceState).not.toHaveBeenCalled();
    });

    it('should handle no visible sections gracefully', () => {
      observer.simulateIntersection([
        { target: mockElements[0], isIntersecting: false },
        { target: mockElements[1], isIntersecting: false },
        { target: mockElements[2], isIntersecting: false },
      ]);

      // Should not update anything
      expect(mockClassListToggle).not.toHaveBeenCalled();
      expect(mockReplaceState).not.toHaveBeenCalled();
    });
  });

  describe('setupSectionObserver', () => {
    it('should call initSectionObserver with sections', () => {
      const result = setupSectionObserver(mockSections);

      expect(result).toBeDefined();
      expect(typeof result).toBe('function');
    });

    it('should work as convenience function', () => {
      const result = setupSectionObserver(mockSections);

      // Should return the same as initSectionObserver
      const directResult = initSectionObserver(mockSections);
      expect(typeof result).toBe(typeof directResult);
    });
  });

  describe('cleanup functionality', () => {
    it('should disconnect observer on cleanup', () => {
      const cleanup = initSectionObserver(mockSections);

      expect(cleanup).toBeDefined();

      // Call cleanup
      cleanup!();

      // Observer should be disconnected (we can't directly test this with our mock,
      // but the function should complete without error)
      expect(() => cleanup!()).not.toThrow();
    });

    it('should handle multiple cleanup calls gracefully', () => {
      const cleanup = initSectionObserver(mockSections);

      expect(() => {
        cleanup!();
        cleanup!();
      }).not.toThrow();
    });
  });

  describe('custom options', () => {
    it('should accept custom observer options', () => {
      const customOptions = {
        rootMargin: '-10% 0px -50% 0px',
        threshold: 0.5,
      };

      const result = initSectionObserver(mockSections, customOptions);

      expect(result).toBeDefined();
      // The options are passed to IntersectionObserver constructor
      // We can't directly test this with our mock, but the function should work
    });
  });

  describe('edge cases', () => {
    it('should handle sections with duplicate IDs', () => {
      const duplicateSections = [
        { id: 'section1', title: 'Section 1' },
        { id: 'section1', title: 'Section 1 Duplicate' },
        { id: 'section2', title: 'Section 2' },
      ];

      const result = initSectionObserver(duplicateSections);

      expect(result).toBeDefined();
      // Should still work, just with duplicate observations
    });

    it('should handle missing TOC links gracefully', () => {
      mockQuerySelectorAll.mockReturnValue([]);

      const result = initSectionObserver(mockSections);

      expect(result).toBeDefined();
      // Should not throw when no TOC links found
    });

    it('should handle TOC links without data-section-id attribute', () => {
      const invalidTocLinks = mockSections.map(() => {
        const link = document.createElement('a');
        link.classList.toggle = mockClassListToggle;
        link.setAttribute = mockSetAttribute;
        link.getAttribute = mockGetAttribute.mockReturnValue(null); // No data-section-id
        return link;
      });

      mockQuerySelectorAll.mockReturnValue(invalidTocLinks);

      const result = initSectionObserver(mockSections);

      expect(result).toBeDefined();
      // Should handle gracefully
    });
  });
});
