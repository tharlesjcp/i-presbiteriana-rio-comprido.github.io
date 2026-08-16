import type { RichTextDocument,RichTextInline } from '../domain/bulletin';

const escapeHtml=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const inline=(items:RichTextInline[])=>items.map(part=>{
  const classes=[part.marks?.includes('bold')&&'text-bold',part.marks?.includes('italic')&&'text-italic',part.marks?.includes('underline')&&'text-underline'].filter(Boolean).join(' ');
  return `<span${classes?` class="${classes}"`:''}>${escapeHtml(part.text)}</span>`;
}).join('');
const alignment=(value?:string)=>['left','center','right','justify'].includes(value||'')?value:'left';

export const renderRichTextHtml=(document:RichTextDocument)=>document.blocks.map(block=>{
  if(block.type==='list'){
    const tag=block.style==='numbered'?'ol':'ul';
    return `<${tag}>${block.items.map(item=>`<li>${inline(item)}</li>`).join('')}</${tag}>`;
  }
  const content=inline(block.content),style=` style="text-align:${alignment(block.alignment)}"`;
  if(block.type==='heading'){const tag=block.level===2?'h2':'h3';return `<${tag}${style}>${content}</${tag}>`;}
  if(block.type==='quote')return `<blockquote${style}><p>${content}</p></blockquote>`;
  return `<p${style}>${content}</p>`;
}).join('');
