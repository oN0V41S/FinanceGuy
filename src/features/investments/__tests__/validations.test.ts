import { CreateInvestmentSchema, UpdateInvestmentSchema } from '../validations';

describe('CreateInvestmentSchema', () => {
  const validData = {
    name: 'Tesouro Selic',
    type: 'Renda Fixa' as const,
    value: 1000,
    quantity: '10 cotas',
    term: '2 anos',
  };

  it('accepts valid data', () => {
    const result = CreateInvestmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts valid data without optional fields', () => {
    const { quantity, term, ...rest } = validData;
    const result = CreateInvestmentSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, type: 'Cripto' });
    expect(result.success).toBe(false);
  });

  it('accepts type Renda Variável', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, type: 'Renda Variável' });
    expect(result.success).toBe(true);
  });

  it('rejects zero value', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, value: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative value', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, value: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validData;
    const result = CreateInvestmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('does not accept id, createdAt or updatedAt fields as required', () => {
    const result = CreateInvestmentSchema.safeParse({ ...validData, id: 'x', createdAt: new Date() });
    // omit() means these keys are stripped/ignored by schema definition; parsing should still succeed since schema doesn't define them
    expect(result.success).toBe(true);
  });
});

describe('UpdateInvestmentSchema', () => {
  it('accepts partial data', () => {
    const result = UpdateInvestmentSchema.safeParse({ value: 500 });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = UpdateInvestmentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid type on partial update', () => {
    const result = UpdateInvestmentSchema.safeParse({ type: 'Invalido' });
    expect(result.success).toBe(false);
  });

  it('rejects negative value on partial update', () => {
    const result = UpdateInvestmentSchema.safeParse({ value: -1 });
    expect(result.success).toBe(false);
  });
});
