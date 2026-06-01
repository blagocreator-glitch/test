(function () {
  const A4_PORTRAIT = {
    widthPx: 794,
    heightPx: 1123,
    widthPt: 595.28,
    heightPt: 841.89
  };

  function encodeText(value) {
    return new TextEncoder().encode(String(value));
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    parts.forEach(part => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = String(dataUrl).split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function buildPdfFromJpegs(images, filename) {
    const objects = [];
    const addObject = bodyParts => {
      const id = objects.length + 1;
      objects.push({ id, bodyParts: Array.isArray(bodyParts) ? bodyParts : [bodyParts] });
      return id;
    };

    const pageIds = [];
    const imageEntries = images.map((image, index) => {
      const imageBytes = dataUrlToBytes(image.dataUrl);
      const imageId = addObject([
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
        imageBytes,
        '\nendstream'
      ]);
      const content = `q\n${A4_PORTRAIT.widthPt} 0 0 ${A4_PORTRAIT.heightPt} 0 0 cm\n/Im${index + 1} Do\nQ\n`;
      const contentId = addObject(`<< /Length ${encodeText(content).length} >>\nstream\n${content}endstream`);
      const pageId = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_PORTRAIT.widthPt} ${A4_PORTRAIT.heightPt}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
      return { imageId, contentId, pageId };
    });

    const catalogId = 1;
    const pagesId = 2;
    objects.unshift(
      { id: catalogId, bodyParts: [`<< /Type /Catalog /Pages ${pagesId} 0 R >>`] },
      { id: pagesId, bodyParts: [`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`] }
    );
    objects.forEach((object, index) => {
      object.id = index + 1;
    });
    imageEntries.forEach((entry, index) => {
      const baseId = 3 + index * 3;
      entry.imageId = baseId;
      entry.contentId = baseId + 1;
      entry.pageId = baseId + 2;
    });
    objects[1].bodyParts = [`<< /Type /Pages /Kids [${imageEntries.map(entry => `${entry.pageId} 0 R`).join(' ')}] /Count ${imageEntries.length} >>`];
    imageEntries.forEach((entry, index) => {
      const imageObject = objects[entry.imageId - 1];
      const contentObject = objects[entry.contentId - 1];
      const imageBytes = dataUrlToBytes(images[index].dataUrl);
      imageObject.bodyParts = [
        `<< /Type /XObject /Subtype /Image /Width ${images[index].width} /Height ${images[index].height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
        imageBytes,
        '\nendstream'
      ];
      const content = `q\n${A4_PORTRAIT.widthPt} 0 0 ${A4_PORTRAIT.heightPt} 0 0 cm\n/Im${index + 1} Do\nQ\n`;
      contentObject.bodyParts = [`<< /Length ${encodeText(content).length} >>\nstream\n${content}endstream`];
      objects[entry.pageId - 1].bodyParts = [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_PORTRAIT.widthPt} ${A4_PORTRAIT.heightPt}] /Resources << /XObject << /Im${index + 1} ${entry.imageId} 0 R >> >> /Contents ${entry.contentId} 0 R >>`];
    });

    const parts = [encodeText('%PDF-1.4\n')];
    const offsets = [0];
    let byteLength = parts[0].length;
    objects.forEach(object => {
      offsets[object.id] = byteLength;
      const objectParts = [
        encodeText(`${object.id} 0 obj\n`),
        ...object.bodyParts.map(part => typeof part === 'string' ? encodeText(part) : part),
        encodeText('\nendobj\n')
      ];
      objectParts.forEach(part => {
        parts.push(part);
        byteLength += part.length;
      });
    });
    const xrefOffset = byteLength;
    const xrefRows = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
    for (let id = 1; id <= objects.length; id += 1) {
      xrefRows.push(`${String(offsets[id]).padStart(10, '0')} 00000 n `);
    }
    const trailer = `${xrefRows.join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(encodeText(trailer));
    downloadBlob(new Blob([concatBytes(parts)], { type: 'application/pdf' }), filename);
  }

  function getDocumentStyles(doc) {
    return Array.from(doc.querySelectorAll('style'))
      .map(style => style.textContent || '')
      .join('\n');
  }

  function svgPageToImage(svg, width, height) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
  }

  async function renderHtmlPageToJpeg(doc, pageIndex, pageCount, scale = 1.6) {
    const width = A4_PORTRAIT.widthPx;
    const height = A4_PORTRAIT.heightPx;
    const offsetY = pageIndex * height;
    const styles = getDocumentStyles(doc);
    const bodyClass = doc.body.className ? ` class="${doc.body.className}"` : '';
    const bodyContent = doc.body.innerHTML
      .replace(/&nbsp;/g, '&#160;')
      .replace(/&copy;/g, '&#169;')
      .replace(/&reg;/g, '&#174;')
      .replace(/&trade;/g, '&#8482;');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="${width}" height="${height}">
          <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <style>${styles}</style>
              <style>
                html, body { width:${width}px !important; margin:0 !important; background:#fff !important; overflow:visible !important; }
                body { transform: translateY(-${offsetY}px); transform-origin: top left; }
                @page { size: A4 portrait; margin: 0; }
              </style>
            </head>
            <body${bodyClass}>${bodyContent}</body>
          </html>
        </foreignObject>
      </svg>`;
    const image = await svgPageToImage(svg, width, height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', pageCount > 10 ? 0.82 : 0.9),
      width: canvas.width,
      height: canvas.height
    };
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function getFallbackDocumentLines(doc, filename) {
    const sections = Array.from(doc.querySelectorAll('.estimate-table-section'));
    if (!sections.length) {
      return (doc.body?.innerText || doc.body?.textContent || filename || 'Документ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .split('\n');
    }

    const header = doc.querySelector('.estimate-site')?.textContent || filename.replace(/\.pdf$/i, '');
    const subtitle = doc.querySelector('.estimate-subtitle')?.textContent || 'Профессиональная смета ремонта';
    const lines = [header, subtitle, ''];
    doc.querySelectorAll('.estimate-summary-card').forEach(card => {
      const cardText = Array.from(card.querySelectorAll('span, b, small'))
        .map(node => (node.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' · ');
      if (cardText) lines.push(cardText);
    });
    if (lines.length > 3) lines.push('');

    sections.forEach(section => {
      const title = section.querySelector('h2')?.textContent?.trim();
      if (title) lines.push(title);
      section.querySelectorAll('tr').forEach(row => {
        const cells = Array.from(row.children)
          .map(cell => (cell.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length) lines.push(cells.join('  |  '));
      });
      lines.push('');
    });
    return lines;
  }

  function fillRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
      return;
    }
    ctx.fillRect(x, y, width, height);
  }

  function strokeRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.stroke();
      return;
    }
    ctx.strokeRect(x, y, width, height);
  }

  function normalizeCellText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function parseEstimateTableSection(section) {
    return {
      title: normalizeCellText(section.querySelector('h2')?.textContent),
      kind: section.querySelector('.estimate-table--materials') ? 'materials' : 'works',
      rows: Array.from(section.querySelectorAll('tr')).map(row => ({
        cells: Array.from(row.children).map(cell => ({
          text: normalizeCellText(cell.textContent),
          colspan: Number(cell.getAttribute('colspan') || 1)
        })).filter(cell => cell.text),
        className: row.className || '',
        isHeader: row.querySelector('th') !== null,
        isTotal: /total|итого/i.test(`${row.className || ''} ${row.textContent || ''}`)
      })).filter(row => row.cells.length)
    };
  }

  function getEstimateColumnWidths(kind, cellCount, tableWidth) {
    if (cellCount <= 1) return [tableWidth];
    const works = [0.045, 0.325, 0.065, 0.075, 0.105, 0.115, 0.08, 0.085, 0.105];
    const materials = [0.055, 0.45, 0.08, 0.12, 0.145, 0.15];
    const source = kind === 'materials' ? materials : works;
    const weights = cellCount === source.length
      ? source
      : Array.from({ length: cellCount }, (_, index) => index === 1 ? 0.34 : (0.66 / Math.max(1, cellCount - 1)));
    const total = weights.reduce((sum, value) => sum + value, 0) || 1;
    return weights.map(value => tableWidth * value / total);
  }

  function drawCellText(ctx, text, x, y, width, lineHeight, maxLines = 7) {
    const lines = wrapCanvasText(ctx, text, Math.max(10, width)).slice(0, maxLines);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    if (lines.length === maxLines && wrapCanvasText(ctx, text, Math.max(10, width)).length > maxLines) {
      const lastY = y + (maxLines - 1) * lineHeight;
      ctx.fillText('...', x + Math.max(0, width - ctx.measureText('...').width), lastY);
    }
    return lines.length;
  }

  function renderPremiumEstimateDocumentToJpegs(doc, filename, scale = 1.45) {
    const sections = Array.from(doc.querySelectorAll('.estimate-table-section')).map(parseEstimateTableSection);
    if (!sections.length) return renderTextDocumentToJpegs(doc, filename, scale);

    const width = Math.round(A4_PORTRAIT.widthPx * scale);
    const height = Math.round(A4_PORTRAIT.heightPx * scale);
    const margin = Math.round(38 * scale);
    const tableWidth = width - margin * 2;
    const footerHeight = Math.round(34 * scale);
    const pages = [];
    let canvas = null;
    let ctx = null;
    let y = margin;

    const brand = normalizeCellText(doc.querySelector('.estimate-site')?.textContent) || 'Вашимастера.рф';
    const subtitle = normalizeCellText(doc.querySelector('.estimate-subtitle')?.textContent) || 'Профессиональная смета ремонта';
    const meta = Array.from(doc.querySelectorAll('.estimate-doc-meta div'))
      .map(node => normalizeCellText(node.textContent))
      .filter(Boolean)
      .slice(0, 6);
    const cards = Array.from(doc.querySelectorAll('.estimate-summary-card')).map(card => ({
      title: normalizeCellText(card.querySelector('span')?.textContent),
      value: normalizeCellText(card.querySelector('b')?.textContent),
      note: normalizeCellText(card.querySelector('small')?.textContent),
      accent: card.classList.contains('estimate-summary-card--accent')
    })).filter(card => card.title || card.value);

    function drawFooter() {
      const pageNumber = pages.length + 1;
      ctx.fillStyle = '#94a3b8';
      ctx.font = `700 ${Math.round(8.5 * scale)}px Arial, sans-serif`;
      ctx.fillText(`Страница ${pageNumber}`, margin, height - Math.round(18 * scale));
      ctx.textAlign = 'right';
      ctx.fillText('Сформировано в Смета-про', width - margin, height - Math.round(18 * scale));
      ctx.textAlign = 'left';
    }

    function finishPage() {
      if (!canvas) return;
      drawFooter();
      pages.push({
        dataUrl: canvas.toDataURL('image/jpeg', pages.length > 10 ? 0.82 : 0.9),
        width,
        height
      });
    }

    function newPage(withCompactHeader = true) {
      finishPage();
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const headerHeight = Math.round((withCompactHeader ? 74 : 112) * scale);
      const gradient = ctx.createLinearGradient(margin, margin, width - margin, margin + headerHeight);
      gradient.addColorStop(0, '#fff7ed');
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, '#ffedd5');
      ctx.fillStyle = gradient;
      fillRoundedRect(ctx, margin, margin, tableWidth, headerHeight, Math.round(18 * scale));
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      strokeRoundedRect(ctx, margin, margin, tableWidth, headerHeight, Math.round(18 * scale));

      ctx.fillStyle = '#f97316';
      fillRoundedRect(ctx, margin + Math.round(16 * scale), margin + Math.round(18 * scale), Math.round(42 * scale), Math.round(42 * scale), Math.round(12 * scale));
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(16 * scale)}px Arial, sans-serif`;
      ctx.fillText('ВМ', margin + Math.round(25 * scale), margin + Math.round(45 * scale));

      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${Math.round(17 * scale)}px Arial, sans-serif`;
      ctx.fillText(brand, margin + Math.round(72 * scale), margin + Math.round(34 * scale));
      ctx.fillStyle = '#475569';
      ctx.font = `700 ${Math.round(9.5 * scale)}px Arial, sans-serif`;
      ctx.fillText(subtitle, margin + Math.round(72 * scale), margin + Math.round(52 * scale));

      if (!withCompactHeader) {
        const metaX = margin + Math.round(420 * scale);
        ctx.fillStyle = '#334155';
        ctx.font = `700 ${Math.round(8.5 * scale)}px Arial, sans-serif`;
        meta.forEach((line, index) => {
          ctx.fillText(line, metaX, margin + Math.round((28 + index * 13) * scale));
        });
      }
      y = margin + headerHeight + Math.round(16 * scale);
    }

    function ensureSpace(requiredHeight, compactHeader = true) {
      if (y + requiredHeight <= height - margin - footerHeight) return;
      newPage(compactHeader);
    }

    function drawSummaryCards() {
      if (!cards.length) return;
      const gap = Math.round(8 * scale);
      const cardWidth = (tableWidth - gap * 2) / 3;
      const cardHeight = Math.round(78 * scale);
      ensureSpace(cardHeight + Math.round(12 * scale), true);
      cards.slice(0, 3).forEach((card, index) => {
        const x = margin + index * (cardWidth + gap);
        ctx.fillStyle = card.accent ? '#fff7ed' : '#ffffff';
        fillRoundedRect(ctx, x, y, cardWidth, cardHeight, Math.round(12 * scale));
        ctx.strokeStyle = card.accent ? '#fdba74' : '#d9e2ef';
        strokeRoundedRect(ctx, x, y, cardWidth, cardHeight, Math.round(12 * scale));
        ctx.fillStyle = '#475569';
        ctx.font = `900 ${Math.round(8.5 * scale)}px Arial, sans-serif`;
        drawCellText(ctx, card.title, x + Math.round(12 * scale), y + Math.round(19 * scale), cardWidth - Math.round(24 * scale), Math.round(11 * scale), 1);
        ctx.fillStyle = '#0f172a';
        ctx.font = `900 ${Math.round(14 * scale)}px Arial, sans-serif`;
        drawCellText(ctx, card.value, x + Math.round(12 * scale), y + Math.round(42 * scale), cardWidth - Math.round(24 * scale), Math.round(15 * scale), 1);
        ctx.fillStyle = '#64748b';
        ctx.font = `700 ${Math.round(8.5 * scale)}px Arial, sans-serif`;
        drawCellText(ctx, card.note, x + Math.round(12 * scale), y + Math.round(62 * scale), cardWidth - Math.round(24 * scale), Math.round(10 * scale), 1);
      });
      y += cardHeight + Math.round(18 * scale);
    }

    function drawSectionTitle(title) {
      ensureSpace(Math.round(34 * scale), true);
      ctx.fillStyle = '#fff7ed';
      fillRoundedRect(ctx, margin, y, tableWidth, Math.round(28 * scale), Math.round(9 * scale));
      ctx.fillStyle = '#9a3412';
      ctx.font = `900 ${Math.round(12 * scale)}px Arial, sans-serif`;
      ctx.fillText(title || 'Раздел сметы', margin + Math.round(12 * scale), y + Math.round(18 * scale));
      y += Math.round(38 * scale);
    }

    function getBandColors(row, index) {
      const className = row.className || '';
      if (row.isHeader) return { fill: '#f97316', stroke: '#ea580c', text: '#ffffff', weight: '900' };
      if (row.isTotal) return { fill: '#fffbeb', stroke: '#fbbf24', text: '#78350f', weight: '900' };
      if (/floor/.test(className)) return { fill: '#fff7ed', stroke: '#fdba74', text: '#9a3412', weight: '900' };
      if (/living/.test(className)) return { fill: '#ecfdf5', stroke: '#bbf7d0', text: '#047857', weight: '900' };
      if (/nonliving/.test(className)) return { fill: '#eef2ff', stroke: '#c7d2fe', text: '#4338ca', weight: '900' };
      if (/room-group/.test(className)) return { fill: '#f0fdf4', stroke: '#bbf7d0', text: '#166534', weight: '900' };
      if (/room-row|group-row/.test(className)) return { fill: '#f8fafc', stroke: '#d9e2ef', text: '#334155', weight: '900' };
      return { fill: index % 2 ? '#ffffff' : '#f8fafc', stroke: '#d9e2ef', text: '#172033', weight: '700' };
    }

    function drawTableRow(row, kind, rowIndex) {
      const colors = getBandColors(row, rowIndex);
      const isBand = row.cells.length === 1 || row.cells[0]?.colspan > 1;
      const fontSize = row.isHeader ? 8.1 : (isBand ? 9.2 : 7.8);
      const lineHeight = Math.round((fontSize + 2.8) * scale);
      ctx.font = `${colors.weight} ${Math.round(fontSize * scale)}px Arial, sans-serif`;

      if (isBand) {
        const lines = wrapCanvasText(ctx, row.cells.map(cell => cell.text).join(' '), tableWidth - Math.round(20 * scale));
        const rowHeight = Math.max(Math.round(24 * scale), lines.length * lineHeight + Math.round(12 * scale));
        ensureSpace(rowHeight + Math.round(2 * scale), true);
        ctx.fillStyle = colors.fill;
        ctx.fillRect(margin, y, tableWidth, rowHeight);
        ctx.strokeStyle = colors.stroke;
        ctx.strokeRect(margin, y, tableWidth, rowHeight);
        ctx.fillStyle = colors.text;
        lines.slice(0, 4).forEach((line, index) => {
          ctx.fillText(line, margin + Math.round(10 * scale), y + Math.round(15 * scale) + index * lineHeight);
        });
        y += rowHeight;
        return;
      }

      const widths = getEstimateColumnWidths(kind, row.cells.length, tableWidth);
      const padding = Math.round(4 * scale);
      const cellLineCounts = row.cells.map((cell, index) => wrapCanvasText(ctx, cell.text, Math.max(10, widths[index] - padding * 2)).length);
      const rowHeight = Math.max(Math.round((row.isHeader ? 25 : 30) * scale), Math.min(Math.round(82 * scale), Math.max(...cellLineCounts) * lineHeight + padding * 2));
      ensureSpace(rowHeight + Math.round(2 * scale), true);

      let x = margin;
      row.cells.forEach((cell, index) => {
        const cellWidth = widths[index] || (tableWidth / row.cells.length);
        ctx.fillStyle = colors.fill;
        ctx.fillRect(x, y, cellWidth, rowHeight);
        ctx.strokeStyle = colors.stroke;
        ctx.strokeRect(x, y, cellWidth, rowHeight);
        ctx.fillStyle = colors.text;
        ctx.textAlign = index === 0 || (index > 1 && cellWidth < Math.round(85 * scale)) ? 'center' : 'left';
        const textX = ctx.textAlign === 'center' ? x + cellWidth / 2 : x + padding;
        const availableTextWidth = cellWidth - padding * 2;
        const lines = wrapCanvasText(ctx, cell.text, Math.max(10, availableTextWidth)).slice(0, 6);
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, textX, y + padding + Math.round((fontSize + 1) * scale) + lineIndex * lineHeight);
        });
        ctx.textAlign = 'left';
        x += cellWidth;
      });
      y += rowHeight;
    }

    newPage(false);
    drawSummaryCards();
    sections.forEach(section => {
      drawSectionTitle(section.title);
      section.rows.forEach((row, index) => drawTableRow(row, section.kind, index));
      y += Math.round(12 * scale);
    });
    finishPage();
    return pages;
  }

  function renderTextDocumentToJpegs(doc, filename, scale = 1.45) {
    const width = Math.round(A4_PORTRAIT.widthPx * scale);
    const height = Math.round(A4_PORTRAIT.heightPx * scale);
    const margin = Math.round(52 * scale);
    const lineHeight = Math.round(18 * scale);
    const titleHeight = Math.round(78 * scale);
    const maxWidth = width - margin * 2;
    const probe = document.createElement('canvas');
    const probeCtx = probe.getContext('2d');
    probeCtx.font = `${Math.round(12 * scale)}px Arial, sans-serif`;
    const lines = [];
    getFallbackDocumentLines(doc, filename).forEach(paragraph => {
      const wrapped = wrapCanvasText(probeCtx, paragraph, maxWidth);
      if (wrapped.length) lines.push(...wrapped);
      lines.push('');
    });
    const linesPerPage = Math.max(10, Math.floor((height - margin * 2 - titleHeight) / lineHeight));
    const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
    return Array.from({ length: pageCount }, (_, pageIndex) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      const headerHeight = Math.round(58 * scale);
      const radius = Math.round(16 * scale);
      const headerGradient = ctx.createLinearGradient(margin, margin, width - margin, margin + headerHeight);
      headerGradient.addColorStop(0, '#fb923c');
      headerGradient.addColorStop(1, '#c2410c');
      ctx.fillStyle = headerGradient;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(margin, margin, width - margin * 2, headerHeight, radius);
        ctx.fill();
      } else {
        ctx.fillRect(margin, margin, width - margin * 2, headerHeight);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(17 * scale)}px Arial, sans-serif`;
      ctx.fillText(filename.replace(/\.pdf$/i, ''), margin + Math.round(18 * scale), margin + Math.round(27 * scale));
      ctx.font = `700 ${Math.round(10 * scale)}px Arial, sans-serif`;
      ctx.fillText('Премиальная смета ремонта', margin + Math.round(18 * scale), margin + Math.round(45 * scale));
      const start = pageIndex * linesPerPage;
      const pageLines = lines.slice(start, start + linesPerPage);
      pageLines.forEach((line, index) => {
        const y = margin + titleHeight + index * lineHeight;
        if (!line) return;
        const isSection = /^[А-ЯЁA-Z][^:]{0,80}$/.test(line) && line.length < 90;
        if (isSection) {
          ctx.fillStyle = '#fff7ed';
          ctx.fillRect(margin, y - Math.round(12 * scale), width - margin * 2, Math.round(18 * scale));
          ctx.fillStyle = '#9a3412';
          ctx.font = `800 ${Math.round(11 * scale)}px Arial, sans-serif`;
        } else {
          ctx.fillStyle = index % 2 === 0 ? '#0f172a' : '#334155';
          ctx.font = `${Math.round(10.5 * scale)}px Arial, sans-serif`;
        }
        ctx.fillText(line, margin + Math.round(8 * scale), y);
      });
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(9 * scale)}px Arial, sans-serif`;
      ctx.fillText(`Страница ${pageIndex + 1} из ${pageCount}`, margin, height - Math.round(28 * scale));
      return {
        dataUrl: canvas.toDataURL('image/jpeg', pageCount > 10 ? 0.82 : 0.9),
        width,
        height
      };
    });
  }

  async function downloadHtmlAsA4Pdf(html, filename = 'document.pdf', options = {}) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = `${A4_PORTRAIT.widthPx}px`;
    iframe.style.height = `${A4_PORTRAIT.heightPx}px`;
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    try {
      const doc = iframe.contentDocument;
      doc.open();
      doc.write(html);
      doc.close();
      await new Promise(resolve => setTimeout(resolve, 250));
      if (doc.fonts?.ready) {
        try {
          await doc.fonts.ready;
        } catch (error) {
          // Browser font loading failures should not block export.
        }
      }
      const contentHeight = Math.max(
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
        A4_PORTRAIT.heightPx
      );
      const pageCount = Math.max(1, Math.ceil(contentHeight / A4_PORTRAIT.heightPx));
      const scale = Number(options.scale || (pageCount > 14 ? 1.25 : 1.6));
      let images = [];
      try {
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          images.push(await renderHtmlPageToJpeg(doc, pageIndex, pageCount, scale));
        }
      } catch (error) {
        console.warn('HTML PDF render failed, using premium estimate renderer.', error);
        try {
          images = renderPremiumEstimateDocumentToJpegs(doc, filename, Math.min(scale, 1.45));
        } catch (fallbackError) {
          console.warn('Premium estimate renderer failed, using compact PDF renderer.', fallbackError);
          images = renderTextDocumentToJpegs(doc, filename, Math.min(scale, 1.35));
        }
      }
      buildPdfFromJpegs(images, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    } finally {
      iframe.remove();
    }
  }

  window.downloadHtmlAsA4Pdf = downloadHtmlAsA4Pdf;
})();
