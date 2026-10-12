/** Evaluate arithmetic only. Formulas cannot call functions or execute JavaScript. */
export function evaluateFormula(source, variables = {}) {
  if (typeof source !== 'string' || source.length > 2000) return null;
  const input = source.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/');
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\*\*|[+\-*/%^()]|\S/gi) || [];
  if (!tokens.length || tokens.length > 500) return null;
  let cursor = 0;
  const peek = () => tokens[cursor];
  const atom = () => {
    const token = tokens[cursor++];
    if (token === '(') {
      const value = sum();
      if (tokens[cursor++] !== ')') throw new Error('Missing parenthesis');
      return value;
    }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token || '')) return Number(token);
    if (/^[A-Za-z_][A-Za-z_0-9]*$/.test(token || '') && Object.hasOwn(variables, token)) {
      const value = variables[token];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    throw new Error('Invalid operand');
  };
  const power = () => {
    const value = atom();
    if (peek() === '^' || peek() === '**') { cursor++; return value ** unary(); }
    return value;
  };
  const unary = () => {
    if (peek() === '+') { cursor++; return unary(); }
    if (peek() === '-') { cursor++; return -unary(); }
    return power();
  };
  const product = () => {
    let value = unary();
    while (['*', '/', '%'].includes(peek())) {
      const operator = tokens[cursor++];
      const right = unary();
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
    }
    return value;
  };
  const sum = () => {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[cursor++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  try {
    const value = sum();
    return cursor === tokens.length && Number.isFinite(value) ? value : null;
  } catch { return null; }
}
