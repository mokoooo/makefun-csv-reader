export function run({ text, header }) {
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = 0;
  let line = 1;

  if (text[0] === '\uFEFF') pos = 1;

  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  function at(i) {
    return i < text.length ? text[i] : '';
  }

  function normalizeQuoted(value) {
    let count = 0;
    let result = '';
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '\r') {
        count++;
        if (i + 1 < value.length && value[i + 1] === '\n') {
          result += '\n';
          i++;
        } else {
          result += '\n';
        }
      } else if (value[i] === '\n') {
        count++;
        result += '\n';
      } else {
        result += value[i];
      }
    }
    return { normalized: result, lineCount: count };
  }

  function readUnquoted() {
    const start = pos;
    
    // Find all \r positions and the end of this unquoted field (comma or \n)
    let comma = text.indexOf(',', pos);
    let lf = text.indexOf('\n', pos);
    
    if (comma === -1) comma = text.length;
    if (lf === -1) lf = text.length;
    
    let fieldEnd = Math.min(comma, lf);
    
    // Find all \r positions in [pos, fieldEnd)
    let crPositions = [];
    for (let i = pos; i < fieldEnd; i++) {
      if (text[i] === '\r') {
        crPositions.push(i);
      }
    }
    
    // If there are \r characters, handle them
    if (crPositions.length > 0) {
      // Check if the last \r is followed by \n at fieldEnd (CRLF)
      const lastCr = crPositions[crPositions.length - 1];
      const isCrLfAtEnd = fieldEnd === lf && lastCr + 1 === fieldEnd && text[fieldEnd] === '\n';
      
      if (isCrLfAtEnd) {
        // The last \r is part of CRLF terminator
        // Count only the non-CRLF \r positions as stray_cr
        for (let crIndex = 0; crIndex < crPositions.length - 1; crIndex++) {
          error('stray_cr');
        }
        
        // Build value without any CR characters
        let value = '';
        let lastPos = start;
        for (const cr of crPositions) {
          value += text.slice(lastPos, cr);
          lastPos = cr + 1;
        }
        value += text.slice(lastPos, lastCr);
        
        pos = fieldEnd + 1;
        line++;
        return { value, ended: 'line break' };
      } else {
        // All \r in this segment are single CRs - each is a stray_cr
        for (let crIndex = 0; crIndex < crPositions.length; crIndex++) {
          error('stray_cr');
        }
        
        // Build value without any CR characters
        let value = '';
        let lastPos = start;
        for (const cr of crPositions) {
          value += text.slice(lastPos, cr);
          lastPos = cr + 1;
        }
        value += text.slice(lastPos, lastCr);
        
        pos = lastCr + 1;
        
        // If we're at the end of text, return the value without recursion
        if (pos >= text.length) {
          return { value, ended: 'end' };
        }
        
        const result = readUnquoted();
        return { value: value + result.value, ended: result.ended };
      }
    }
    
    // No \r in field slice, handle normal terminators
    const value = text.slice(start, fieldEnd);
    const nextChar = at(fieldEnd);
    
    if (nextChar === ',') {
      pos = fieldEnd + 1;
      return { value, ended: 'comma' };
    }
    if (nextChar === '\n') {
      pos = fieldEnd + 1;
      line++;
      return { value, ended: 'line break' };
    }
    
    // End of text
    pos = fieldEnd;
    return { value, ended: 'end' };
  }

  function readQuoted() {
    const openPos = pos;
    const openLine = line;
    let value = '';
    pos++; // skip opening quote

    // Find the closing quote using indexOf
    let quotePos;
    while (pos < text.length) {
      quotePos = text.indexOf('"', pos);
      if (quotePos === -1) {
        // No closing quote found - unterminated
        break;
      }
      
      // Check if this is an escaped quote
      if (quotePos + 1 < text.length && text[quotePos + 1] === '"') {
        // Escaped quote - add the quote and skip both
        value += text.slice(pos, quotePos + 1);
        pos = quotePos + 2;
      } else {
        // Found closing quote
        value += text.slice(pos, quotePos);
        pos = quotePos + 1;
        break;
      }
    }

    if (quotePos === -1) {
      // No closing quote found - unterminated
      pos = openPos + 1;
      line = openLine;
      error('unterminated_quote');
      const result = readUnquoted();
      return { value: '"' + result.value, ended: result.ended };
    }

    // Normalize CR/CRLF in quoted field value
    const { normalized, lineCount } = normalizeQuoted(value);
    value = normalized;
    line += lineCount;

    // After closing quote, handle junk or terminator
    if (pos >= text.length) {
      return { value, ended: 'end' };
    }

    const c = text[pos];
    if (c === ',') {
      pos++;
      return { value, ended: 'comma' };
    }
    if (c === '\n') {
      pos++;
      line++;
      return { value, ended: 'line break' };
    }
    if (c === '\r' && at(pos + 1) === '\n') {
      pos += 2;
      line++;
      return { value, ended: 'line break' };
    }

    // quote_junk: collect characters until comma, \n, or \r
    const junkStart = pos;
    let junkEnd = text.length;
    const nextComma = text.indexOf(',', pos);
    const nextLf = text.indexOf('\n', pos);
    const nextCr = text.indexOf('\r', pos);
    
    if (nextComma !== -1) junkEnd = Math.min(junkEnd, nextComma);
    if (nextLf !== -1) junkEnd = Math.min(junkEnd, nextLf);
    if (nextCr !== -1) junkEnd = Math.min(junkEnd, nextCr);
    
    const junk = text.slice(junkStart, junkEnd);
    pos = junkEnd;

    if (junk.length > 0) {
      error('quote_junk');
      value += junk;
    }

    const nextChar = at(pos);
    if (nextChar === ',') {
      pos++;
      return { value, ended: 'comma' };
    }
    if (nextChar === '\n' || (nextChar === '\r' && at(pos + 1) === '\n')) {
      if (nextChar === '\r') pos++;
      pos++;
      line++;
      return { value, ended: 'line break' };
    }
    // At end of text
    return { value, ended: 'end' };
  }

  // Skip empty lines
  function skipEmptyLines() {
    while (pos < text.length) {
      if (text[pos] === '\n') {
        pos++;
        line++;
      } else if (text[pos] === '\r' && at(pos + 1) === '\n') {
        pos += 2;
        line++;
      } else {
        break;
      }
    }
  }

  while (true) {
    skipEmptyLines();
    if (pos >= text.length) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    const fields = [];
    let field;
    do {
      const isQuoted = text[pos] === '"';
      field = isQuoted ? readQuoted() : readUnquoted();
      fields.push(field.value);
    } while (field.ended === 'comma' && pos < text.length);

    // Skip empty lines that appeared during field reading
    skipEmptyLines();

    // Check if this is a valid record
    if (fields.length === 1 && fields[0] === '' && field.ended !== 'comma') continue;

    if (width < 0) width = fields.length;

    if (header && columns === null) {
      columns = fields;
      continue;
    }

    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      const extra = fields.slice(width);
      fields.length = width;
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra });
    }

    rows.push(fields);
  }

  return { columns: header ? (columns ?? []) : null, rows, errors };
}
