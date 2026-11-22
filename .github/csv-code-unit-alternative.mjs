export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const rows = [];
  const errors = [];
  const length = text.length;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let columns = null;
  let width = -1;

  while (pos < length) {
    const first = text.charCodeAt(pos);
    if (first === 10 || (first === 13 && text.charCodeAt(pos + 1) === 10)) {
      pos += first === 10 ? 1 : 2;
      line++;
      continue;
    }

    const recordLine = line;
    const row = header && columns === null ? null : rows.length;
    const fields = [];
    let delimiter;
    let quoted;

    do {
      let value = '';
      quoted = text.charCodeAt(pos) === 34;

      if (quoted) {
        const opening = pos;
        let start = opening + 1;
        let close = text.indexOf('"', start);
        while (close !== -1 && text.charCodeAt(close + 1) === 34) {
          value += text.slice(start, close + 1);
          start = close + 2;
          close = text.indexOf('"', start);
        }

        if (close === -1) {
          errors.push({ code: 'unterminated_quote', line: recordLine, row });
          value = '';
          quoted = false;
        } else {
          value += text.slice(start, close);
          value = value.replace(/\r\n?|\n/g, () => {
            line++;
            return '\n';
          });
          pos = close + 1;
        }
      }

      let hasText = false;
      for (;;) {
        const start = pos;
        while (pos < length) {
          const code = text.charCodeAt(pos);
          if (code === 44 || code === 10 || code === 13) break;
          pos++;
        }
        if (pos > start) {
          hasText = true;
          value += text.slice(start, pos);
        }

        delimiter = text.charCodeAt(pos);
        if (delimiter !== 13 || text.charCodeAt(pos + 1) === 10) break;
        errors.push({ code: 'stray_cr', line: recordLine, row });
        pos++;
      }

      if (quoted && hasText) {
        errors.push({ code: 'quote_junk', line: recordLine, row });
      }
      fields.push(value);

      if (delimiter === 44) {
        pos++;
      } else if (delimiter === 10 || delimiter === 13) {
        pos += delimiter === 10 ? 1 : 2;
        line++;
      }
    } while (delimiter === 44);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width === -1) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }

    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row, extra: fields.slice(width) });
      fields.length = width;
    }
    rows.push(fields);
  }

  return { columns: header ? (columns ?? []) : null, rows, errors };
}
