'use client';

import { render, screen } from '@testing-library/react';
import { PasswordRequirements } from '../PasswordRequirements';

const requirements = [
  { key: "length", label: "Mínimo 8 caracteres", test: (pwd: string) => pwd.length >= 8 },
  { key: "uppercase", label: "Uma letra maiúscula", test: (pwd: string) => /[A-Z]/.test(pwd) },
  { key: "lowercase", label: "Uma letra minúscula", test: (pwd: string) => /[a-z]/.test(pwd) },
  { key: "number", label: "Um número", test: (pwd: string) => /\d/.test(pwd) },
  { key: "symbol", label: "Um símbolo (@$!%*?&)", test: (pwd: string) => /[@$!%*?&]/.test(pwd) },
];

describe('PasswordRequirements', () => {
  // Test initial state with empty password
  test('displays all requirements as unmet (red) when password is empty', () => {
    render(<PasswordRequirements passwordValue="" />);

    const requirementItems = screen.getAllByText(/Mínimo 8 caracteres|Uma letra maiúscula|Uma letra minúscula|Um número|Um símbolo/);
    expect(requirementItems).toHaveLength(5);

    requirementItems.forEach((label) => {
      const item = label.closest('div');
      if (!item) throw new Error('Could not find parent div');

      // No badge is rendered while the password is empty
      expect(item.querySelector('span.w-4.h-4')).toBeNull();

      // Label uses the expense token and is not struck through
      expect(label).toHaveClass('text-finance-expense');
      expect(label).not.toHaveClass('line-through');
    });
  });

  // Test with valid password
  test('shows all requirements as met (green) when password is valid', () => {
    const validPassword = 'Abcdefg1!';
    render(<PasswordRequirements passwordValue={validPassword} />);

    const requirementLabels = screen.getAllByText(/Mínimo 8 caracteres|Uma letra maiúscula|Uma letra minúscula|Um número|Um símbolo/);
    expect(requirementLabels).toHaveLength(5);

    requirementLabels.forEach((label) => {
      const item = label.closest('div');
      if (!item) throw new Error('Could not find parent div');

      const circle = item.querySelector('span.w-4.h-4');
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveClass('bg-finance-income');
      expect(circle).toHaveClass('text-white');

      expect(label).toHaveClass('text-finance-income');
      expect(label).toHaveClass('line-through');
    });
  });

  // Test each requirement individually
  test.each([
    { key: 'length', value: 'Abcdefg1!', expected: true, description: 'length' },
    { key: 'length', value: 'Ab1!', expected: false, description: 'length too short' },
    { key: 'uppercase', value: 'abcdefg1!', expected: false, description: 'no uppercase' },
    { key: 'uppercase', value: 'Abcdefg1!', expected: true, description: 'has uppercase' },
    { key: 'lowercase', value: 'ABCDEFG1!', expected: false, description: 'no lowercase' },
    { key: 'lowercase', value: 'Abcdefg1!', expected: true, description: 'has lowercase' },
    { key: 'number', value: 'Abcdefg!', expected: false, description: 'no number' },
    { key: 'number', value: 'Abcdefg1!', expected: true, description: 'has number' },
    { key: 'symbol', value: 'Abcdefg1', expected: false, description: 'no symbol' },
    { key: 'symbol', value: 'Abcdefg1!', expected: true, description: 'has symbol' },
  ])('correctly validates $description', ({ key, value, expected }) => {
    render(<PasswordRequirements passwordValue={value} />);

    const labelText = requirements.find((r) => r.key === key)!.label;
    const requirementLabel = screen.getByText(labelText);
    const requirementItem = requirementLabel.closest('div');

    if (!requirementItem) throw new Error('Could not find requirement item');

    const circle = requirementItem.querySelector('span.w-4.h-4');

    if (expected) {
      expect(circle).toHaveClass('bg-finance-income');
      expect(circle).toHaveClass('text-white');
      expect(requirementLabel).toHaveClass('text-finance-income');
      expect(requirementLabel).toHaveClass('line-through');
    } else {
      expect(circle).toHaveClass('bg-finance-expense/20');
      expect(circle).toHaveClass('text-finance-expense');
      expect(requirementLabel).toHaveClass('text-finance-expense');
      expect(requirementLabel).not.toHaveClass('line-through');
    }
  });

  // Test transition from empty to valid
  test('transitions correctly from empty to valid state', () => {
    const { rerender } = render(<PasswordRequirements passwordValue="" />);

    let requirementLabels = screen.getAllByText(/Mínimo 8 caracteres|Uma letra maiúscula|Uma letra minúscula|Um número|Um símbolo/);
    requirementLabels.forEach((label) => {
      const item = label.closest('div');
      if (!item) throw new Error('Could not find parent div');
      expect(item.querySelector('span.w-4.h-4')).toBeNull();
      expect(label).toHaveClass('text-finance-expense');
      expect(label).not.toHaveClass('line-through');
    });

    rerender(<PasswordRequirements passwordValue="Abcdefg1!" />);

    requirementLabels = screen.getAllByText(/Mínimo 8 caracteres|Uma letra maiúscula|Uma letra minúscula|Um número|Um símbolo/);
    requirementLabels.forEach((label) => {
      const item = label.closest('div');
      if (!item) throw new Error('Could not find parent div');
      const circle = item.querySelector('span.w-4.h-4');
      expect(circle).toHaveClass('bg-finance-income');
      expect(circle).toHaveClass('text-white');
      expect(label).toHaveClass('text-finance-income');
      expect(label).toHaveClass('line-through');
    });
  });

  // Message text colors follow §8.7 (income when satisfied, expense when not)
  test('applies text-finance-income/expense tokens to the message label', () => {
    const { rerender } = render(<PasswordRequirements passwordValue="short" />);
    const lengthLabel = screen.getByText('Mínimo 8 caracteres');
    expect(lengthLabel).toHaveClass('text-finance-expense');

    rerender(<PasswordRequirements passwordValue="longenough" />);
    expect(lengthLabel).toHaveClass('text-finance-income');
    expect(lengthLabel).toHaveClass('line-through');
  });
});
