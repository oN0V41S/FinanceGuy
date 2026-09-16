import { CreateGoalSchema, UpdateGoalSchema } from '../validations';

describe('CreateGoalSchema', () => {
  const validData = {
    name: 'Viagem para o Japão',
    targetValue: 20000,
    currentValue: 5000,
    deadlineLabel: '6 meses restantes',
  };

  it('accepts valid data', () => {
    const result = CreateGoalSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('defaults currentValue to 0 when omitted', () => {
    const { currentValue, ...rest } = validData;
    const result = CreateGoalSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentValue).toBe(0);
    }
  });

  it('accepts without optional deadlineLabel', () => {
    const { deadlineLabel, ...rest } = validData;
    const result = CreateGoalSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateGoalSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    const result = CreateGoalSchema.safeParse({ ...validData, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects zero targetValue', () => {
    const result = CreateGoalSchema.safeParse({ ...validData, targetValue: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative targetValue', () => {
    const result = CreateGoalSchema.safeParse({ ...validData, targetValue: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative currentValue', () => {
    const result = CreateGoalSchema.safeParse({ ...validData, currentValue: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts currentValue of 0', () => {
    const result = CreateGoalSchema.safeParse({ ...validData, currentValue: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validData;
    const result = CreateGoalSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing targetValue', () => {
    const { targetValue, ...rest } = validData;
    const result = CreateGoalSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('UpdateGoalSchema', () => {
  it('accepts partial data', () => {
    const result = UpdateGoalSchema.safeParse({ currentValue: 100 });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = UpdateGoalSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects negative targetValue on partial update', () => {
    const result = UpdateGoalSchema.safeParse({ targetValue: -1 });
    expect(result.success).toBe(false);
  });
});
