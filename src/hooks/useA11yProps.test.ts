import { renderHook } from '@testing-library/react-native';
import { useA11yProps, useA11yHidden, useA11yGroup } from './useA11yProps';

describe('useA11yProps', () => {
  it('returns accessible props with required label', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Test Button' }));

    expect(result.current).toEqual({
      accessible: true,
      accessibilityRole: undefined,
      accessibilityLabel: 'Test Button',
      accessibilityHint: undefined,
      accessibilityState: undefined,
      accessibilityValue: undefined,
      importantForAccessibility: 'yes',
      testID: undefined,
    });
  });

  it('includes role when provided', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Submit', role: 'button' }));

    expect(result.current.accessibilityRole).toBe('button');
  });

  it('includes hint when provided', () => {
    const { result } = renderHook(() =>
      useA11yProps({ label: 'Submit', hint: 'Double tap to submit form' })
    );

    expect(result.current.accessibilityHint).toBe('Double tap to submit form');
  });

  it('sets disabled state correctly', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Submit', disabled: true }));

    expect(result.current.accessibilityState).toEqual({ disabled: true });
  });

  it('handles disabled false state', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Submit', disabled: false }));

    expect(result.current.accessibilityState).toBeUndefined();
  });

  it('converts value to string', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Counter', value: 42 }));

    expect(result.current.accessibilityValue).toEqual({ text: '42' });
  });

  it('includes testID when provided', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Submit', testID: 'form.submit' }));

    expect(result.current.testID).toBe('form.submit');
  });

  it('memoizes result with same props', () => {
    const props = { label: 'Test', role: 'button' as const };
    const { result, rerender } = renderHook(() => useA11yProps(props));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('creates new object when props change', () => {
    const { result, rerender } = renderHook(({ label }) => useA11yProps({ label }), {
      initialProps: { label: 'Test 1' },
    });

    const firstResult = result.current;
    rerender({ label: 'Test 2' });
    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
    expect(secondResult.accessibilityLabel).toBe('Test 2');
  });
});

describe('useA11yHidden', () => {
  it('returns props to hide element from screen readers', () => {
    const { result } = renderHook(() => useA11yHidden());

    expect(result.current).toEqual({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no',
    });
  });

  it('memoizes result without dependencies', () => {
    const { result, rerender } = renderHook(() => useA11yHidden());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });
});

describe('useA11yGroup', () => {
  it('returns props for grouping elements', () => {
    const { result } = renderHook(() => useA11yGroup('Form fields'));

    expect(result.current).toEqual({
      accessible: true,
      accessibilityLabel: 'Form fields',
      accessibilityRole: 'none',
    });
  });

  it('memoizes result with same label', () => {
    const { result, rerender } = renderHook(() => useA11yGroup('Group 1'));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('creates new object when label changes', () => {
    const { result, rerender } = renderHook(({ label }) => useA11yGroup(label), {
      initialProps: { label: 'Group 1' },
    });

    const firstResult = result.current;
    rerender({ label: 'Group 2' });
    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
    expect(secondResult.accessibilityLabel).toBe('Group 2');
  });
});

describe('useA11yProps edge cases', () => {
  it('handles empty string label', () => {
    const { result } = renderHook(() => useA11yProps({ label: '' }));

    expect(result.current.accessibilityLabel).toBe('');
    // Empty label should still create valid props
    expect(result.current.accessible).toBe(true);
  });

  it('handles very long labels correctly', () => {
    const longLabel = 'A'.repeat(10000);
    const { result } = renderHook(() => useA11yProps({ label: longLabel }));

    expect(result.current.accessibilityLabel).toBe(longLabel);
    expect(result.current.accessible).toBe(true);
  });

  it('handles special characters and potential XSS in labels', () => {
    const xssLabel = '<script>alert("xss")</script>';
    const { result } = renderHook(() => useA11yProps({ label: xssLabel }));

    // Should pass through as-is (React Native handles sanitization)
    expect(result.current.accessibilityLabel).toBe(xssLabel);
  });

  it('handles rapid prop updates efficiently', () => {
    const { result, rerender } = renderHook(({ label }) => useA11yProps({ label }), {
      initialProps: { label: 'Initial' },
    });

    // Simulate rapid updates
    for (let i = 0; i < 100; i++) {
      rerender({ label: `Label ${i}` });
    }

    expect(result.current.accessibilityLabel).toBe('Label 99');
  });

  it('handles all props being undefined except label', () => {
    const { result } = renderHook(() =>
      useA11yProps({
        label: 'Test',
        role: undefined,
        hint: undefined,
        disabled: undefined,
        value: undefined,
        testID: undefined,
      })
    );

    expect(result.current).toEqual({
      accessible: true,
      accessibilityRole: undefined,
      accessibilityLabel: 'Test',
      accessibilityHint: undefined,
      accessibilityState: undefined,
      accessibilityValue: undefined,
      importantForAccessibility: 'yes',
      testID: undefined,
    });
  });

  it('handles numeric values correctly', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Counter', value: 0 }));

    // 0 should be treated as a valid value
    expect(result.current.accessibilityValue).toEqual({ text: '0' });

    // Test with non-zero value
    const { result: nonZeroResult } = renderHook(() =>
      useA11yProps({ label: 'Counter', value: 5 })
    );
    expect(nonZeroResult.current.accessibilityValue).toEqual({ text: '5' });
  });

  it('handles negative numeric values', () => {
    const { result } = renderHook(() => useA11yProps({ label: 'Temperature', value: -273.15 }));

    expect(result.current.accessibilityValue).toEqual({ text: '-273.15' });
  });

  it('handles boolean conversion for value', () => {
    // TypeScript would prevent this, but testing runtime behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { result } = renderHook(() => useA11yProps({ label: 'Toggle', value: true as any }));

    expect(result.current.accessibilityValue).toEqual({ text: 'true' });
  });

  it('maintains referential equality for same prop values', () => {
    const props = {
      label: 'Button',
      role: 'button' as const,
      hint: 'Tap to submit',
      disabled: false,
      value: 42,
      testID: 'submit-btn',
    };

    const { result, rerender } = renderHook(() => useA11yProps(props));
    const firstResult = result.current;

    // Rerender with same values
    rerender();
    expect(result.current).toBe(firstResult);

    // Change one value
    const newProps = { ...props, value: 43 };
    const { result: newResult } = renderHook(() => useA11yProps(newProps));
    expect(newResult.current).not.toBe(firstResult);
  });
});

describe('useA11yHidden edge cases', () => {
  it('always returns the same reference', () => {
    const { result: result1 } = renderHook(() => useA11yHidden());
    const { result: result2 } = renderHook(() => useA11yHidden());

    // Different hook instances should return equivalent objects
    expect(result1.current).toEqual(result2.current);
  });

  it('is truly hidden from accessibility tree', () => {
    const { result } = renderHook(() => useA11yHidden());

    expect(result.current.accessible).toBe(false);
    expect(result.current.accessibilityElementsHidden).toBe(true);
    expect(result.current.importantForAccessibility).toBe('no');
  });
});

describe('useA11yGroup edge cases', () => {
  it('handles empty string label', () => {
    const { result } = renderHook(() => useA11yGroup(''));

    expect(result.current.accessibilityLabel).toBe('');
    expect(result.current.accessible).toBe(true);
  });

  it('handles very long group labels', () => {
    const longLabel = 'Group '.repeat(1000);
    const { result } = renderHook(() => useA11yGroup(longLabel));

    expect(result.current.accessibilityLabel).toBe(longLabel);
  });
});
