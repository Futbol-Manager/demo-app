import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'markdownAi' })
export class MarkdownAiPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    let html = value;

    // Preserve existing <br> tags from old responses, then normalize
    html = html.replace(/<br\s*\/?>/gi, '\n');

    // Split into blocks (paragraphs separated by blank lines)
    const blocks = html.split(/\n{2,}/);
    const processedBlocks = blocks.map(block => this.processBlock(block.trim()));
    html = processedBlocks.filter(b => b).join('\n');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private processBlock(block: string): string {
    if (!block) return '';

    const lines = block.split('\n');

    // Detect if this block is a list
    const isUnorderedList = lines.every(l => /^[\-\*\•]\s/.test(l.trim()) || l.trim() === '');
    const isOrderedList = lines.every(l => /^\d+\.\s/.test(l.trim()) || l.trim() === '');

    if (isUnorderedList && lines.some(l => l.trim())) {
      const items = lines
        .filter(l => l.trim())
        .map(l => `<li>${this.processInline(l.replace(/^[\-\*\•]\s/, '').trim())}</li>`)
        .join('');
      return `<ul class="ai-list">${items}</ul>`;
    }

    if (isOrderedList && lines.some(l => l.trim())) {
      const items = lines
        .filter(l => l.trim())
        .map(l => `<li>${this.processInline(l.replace(/^\d+\.\s/, '').trim())}</li>`)
        .join('');
      return `<ol class="ai-list">${items}</ol>`;
    }

    // Process line by line for headers and paragraphs
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^#{3}\s/.test(trimmed)) return `<h5 class="ai-h5">${this.processInline(trimmed.replace(/^#{3}\s/, ''))}</h5>`;
      if (/^#{2}\s/.test(trimmed)) return `<h4 class="ai-h4">${this.processInline(trimmed.replace(/^#{2}\s/, ''))}</h4>`;
      if (/^#\s/.test(trimmed)) return `<h3 class="ai-h3">${this.processInline(trimmed.replace(/^#\s/, ''))}</h3>`;
      if (/^---+$/.test(trimmed)) return '<hr class="ai-hr">';
      return this.processInline(trimmed);
    }).filter(l => l !== '');

    if (processedLines.length === 1 && /^<h[1-6]/.test(processedLines[0])) {
      return processedLines[0];
    }
    return `<p class="ai-p">${processedLines.join('<br>')}</p>`;
  }

  private processInline(text: string): string {
    // Bold+Italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>');
    // Escape remaining < > that aren't part of tags
    return text;
  }
}
