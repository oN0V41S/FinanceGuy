/**
 * E2E-style integration test for MonthFilter
 *
 * BUG: SelectValue renders the raw value ("01") instead of the month name ("Janeiro").
 * This test suite exposes that bug with clear assertions.
 *
 * NOTE: base-ui Select uses Portals that don't render in jsdom, so we test the
 * SelectValue rendering bug directly and verify state changes via hidden inputs.
 */

import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MonthFilter } from '../components/MonthFilter';

/**
 * Wrapper component that manages MonthFilter state like page.tsx does.
 */
function MonthFilterHarness() {
  const [month, setMonth] = useState('01');
  const [year, setYear] = useState('2026');

  return (
    <div>
      <MonthFilter
        value={month}
        onChange={(m) => m && setMonth(m)}
        year={year}
        onYearChange={setYear}
      />
      <p data-testid="debug-month">{month}</p>
      <p data-testid="debug-year">{year}</p>
    </div>
  );
}

describe('MonthFilter E2E — BUG: SelectValue shows number, not month name', () => {
  const user = userEvent.setup();

  /**
   * CORE BUG TEST: The SelectValue should display the month NAME ("Janeiro"),
   * but instead displays the raw VALUE ("01").
   *
   * This test WILL FAIL until the bug is fixed.
   */
  it('FAILS: SelectValue shows "01" instead of "Janeiro" for initial value', () => {
    render(<MonthFilterHarness />);

    // The select trigger contains a hidden input with the raw value
    const hiddenInput = document.querySelector('input[aria-hidden="true"]');
    expect(hiddenInput).toHaveValue('01');

    // The SelectValue span should show the month NAME, not the number
    const selectValue = document.querySelector('[data-slot="select-value"]');
    expect(selectValue).not.toBeNull();

    // BUG ASSERTION: This FAILS because selectValue.textContent is "01", not "Janeiro"
    // Expected: "Janeiro"
    // Received: "01"
    expect(selectValue).toHaveTextContent('Janeiro');
  });

  /**
   * After programmatically changing the value to "06" (June),
   * the SelectValue should show "Junho", not "06".
   */
  it('FAILS: SelectValue shows "06" instead of "Junho" after state change', () => {
    const { rerender } = render(
      <MonthFilter value="01" onChange={() => {}} />
    );

    // Verify initial display
    const selectValue = document.querySelector('[data-slot="select-value"]');
    expect(selectValue).toHaveTextContent('Janeiro');

    // Re-render with a different value (simulating parent state change)
    rerender(
      <MonthFilter value="06" onChange={() => {}} />
    );

    // BUG ASSERTION: Shows "06" instead of "Junho"
    expect(selectValue).toHaveTextContent('Junho');
  });

  /**
   * ALL 12 MONTHS: Each value should map to its Portuguese name in the trigger.
   * This test iterates all months and checks the SelectValue display.
   */
  it.each([
    ['01', 'Janeiro'],
    ['02', 'Fevereiro'],
    ['03', 'Março'],
    ['04', 'Abril'],
    ['05', 'Maio'],
    ['06', 'Junho'],
    ['07', 'Julho'],
    ['08', 'Agosto'],
    ['09', 'Setembro'],
    ['10', 'Outubro'],
    ['11', 'Novembro'],
    ['12', 'Dezembro'],
  ])('FAILS: value "%s" should display "%s", not the number', (value, expectedLabel) => {
    const { rerender } = render(
      <MonthFilter value="01" onChange={() => {}} />
    );

    const selectValue = document.querySelector('[data-slot="select-value"]');

    // Change to this month
    rerender(
      <MonthFilter value={value} onChange={() => {}} />
    );

    // BUG ASSERTION: selectValue shows the number, not the label
    expect(selectValue).toHaveTextContent(expectedLabel);
  });

  /**
   * Verify the hidden input holds the correct value for form submission,
   * while the visible text shows the human-readable label.
   */
  it('FAILS: hidden input has "03" but visible text should show "Março"', () => {
    const { rerender } = render(
      <MonthFilter value="01" onChange={() => {}} />
    );

    rerender(
      <MonthFilter value="03" onChange={() => {}} />
    );

    // Hidden input (for form submission) should have the numeric value
    const hiddenInput = document.querySelector('input[aria-hidden="true"]');
    expect(hiddenInput).toHaveValue('03');

    // Visible text should have the month name (BUG: shows "03" instead)
    const selectValue = document.querySelector('[data-slot="select-value"]');
    expect(selectValue).toHaveTextContent('Março');
  });

  /**
   * Year selector: Verify year value is displayed correctly.
   * This one might PASS since year values are already human-readable.
   */
  it('year selector shows "2025" when changed (year is already readable)', () => {
    const { rerender } = render(
      <MonthFilter value="01" onChange={() => {}} year="2026" onYearChange={() => {}} />
    );

    const yearInputs = document.querySelectorAll('input[aria-hidden="true"]');
    const yearInput = yearInputs[1]; // Second hidden input is for year
    expect(yearInput).toHaveValue('2026');

    rerender(
      <MonthFilter value="01" onChange={() => {}} year="2025" onYearChange={() => {}} />
    );

    expect(yearInput).toHaveValue('2025');
  });
});
