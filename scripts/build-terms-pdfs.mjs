import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {jsPDF} from 'jspdf';
import {getTermsUiCopy} from '../src/legal/terms-tools.ts';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const LANGUAGES=['de','en','es','pt','it','fr'];
const NAVY=[6,45,82],INK=[21,59,91],MINT=[183,243,215];
const printable=/[^\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/u;
const presentationText=text=>{
  const value=String(text).replace(/\s/gu,' ');
  if(printable.test(value))throw new Error('The PDF font cannot faithfully render a document character.');
  return value;
};
const canonicalDocument=document=>({version:document.version,language:document.language,title:document.title,dateLabel:document.dateLabel,translationNotice:document.translationNotice,sections:document.sections,contact:document.contact});

/** Selectable text from the exact same immutable data rendered by TermsPage. */
export function generateTermsPdf(document){
  if(!LANGUAGES.includes(document.language)||!Array.isArray(document.sections)||!document.sections.length)throw new Error('Invalid terms document');
  const copy=getTermsUiCopy(document.language);
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true,precision:4});
  const sourceHash=createHash('sha256').update(JSON.stringify(canonicalDocument(document))).digest('hex');
  pdf.setFileId(sourceHash.slice(0,32).toUpperCase());
  const date=/\d{4}-\d{2}-\d{2}/.exec(document.version)?.[0]||'2026-11-26';
  pdf.setCreationDate(`D:${date.replaceAll('-','')}120000+00'00'`);
  pdf.setLanguage(document.language==='de'?'de-CH':document.language);
  pdf.setProperties({title:presentationText(document.title),subject:`${document.version} | ${document.language} | ${sourceHash}`,author:'Kraken Properties and Facilities Management Gomes Mendes',creator:'Kraken PFM · immutable legal document'});
  const left=18,right=192,bottom=276,bodySize=10.2,lineHeight=5.0;
  let y=25;
  const font=(size=bodySize,bold=false)=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...INK);};
  const nextPage=()=>{
    pdf.addPage();font(8,true);pdf.setTextColor(...NAVY);pdf.text('KRAKEN PFM',left,14);
    font(8);pdf.text(presentationText(document.title),right,14,{align:'right',maxWidth:140});
    pdf.setDrawColor(220,232,240);pdf.setLineWidth(.25);pdf.line(left,18,right,18);y=27;
  };
  const ensure=height=>{if(y+height>bottom)nextPage();};
  const linesFor=(text,width=right-left,size=bodySize,bold=false)=>{font(size,bold);return pdf.splitTextToSize(presentationText(text),width);};
  const paragraph=(text,{indent=0,spaceAfter=3.2,bullet=false,size=bodySize,height=lineHeight}={})=>{
    const lines=linesFor(text,right-left-indent,size),minimum=Math.min(2,lines.length)*height;
    ensure(minimum);let cursor=0;
    while(cursor<lines.length){
      let count=Math.floor((bottom-y)/height)+1;
      if(count<1){nextPage();continue;}
      count=Math.min(count,lines.length-cursor);
      if(lines.length-cursor-count===1&&count>1)count--;
      if(count===1&&lines.length-cursor>1){nextPage();continue;}
      font(size);
      if(bullet&&cursor===0)pdf.text('•',left+1,y);
      for(let index=0;index<count;index++){pdf.text(lines[cursor+index],left+indent,y);y+=height;}
      cursor+=count;if(cursor<lines.length)nextPage();
    }
    y+=spaceAfter;
  };
  pdf.setFillColor(...NAVY);pdf.roundedRect(left,15,right-left,10,2,2,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);pdf.setTextColor(255,255,255);pdf.text('KRAKEN PFM',left+4,21.7);
  pdf.setFillColor(...MINT);pdf.rect(left,27,right-left,1,'F');
  y=39;font(19,true);
  const titleLines=linesFor(document.title,right-left,19,true);
  for(const line of titleLines){pdf.text(line,left,y);y+=8.1;}
  y+=1;paragraph(document.dateLabel,{size:9.2,height:4.6,spaceAfter:1});
  paragraph(copy.language,{size:9.2,height:4.6,spaceAfter:6});
  if(document.translationNotice){
    paragraph(document.translationNotice,{size:9.5,height:4.8,spaceAfter:1.8});
    font(8.8);pdf.setTextColor(20,87,120);pdf.textWithLink(presentationText(copy.german),left,y,{url:'https://krakenpfm.ch/terms'});y+=8;
  }
  for(const section of document.sections){
    const title=linesFor(section.title,right-left,12,true);
    // A heading stays with at least the first two lines of its first block.
    ensure(title.length*5.7+12);font(12,true);
    for(const line of title){pdf.text(line,left,y);y+=5.7;}
    y+=2.5;
    for(const block of section.blocks){
      if(block.type==='paragraph')paragraph(block.text);
      else if(block.type==='list'){for(const item of block.items)paragraph(item,{indent:5.2,bullet:true,spaceAfter:1.1});y+=2;}
      else throw new Error('Unknown legal content block');
    }
    y+=3.5;
  }
  ensure(25);pdf.setDrawColor(180,200,212);pdf.line(left,y,right,y);y+=7;
  paragraph(document.contact,{size:9,height:4.6,spaceAfter:0});
  const pageCount=pdf.getNumberOfPages();
  for(let index=1;index<=pageCount;index++){
    pdf.setPage(index);pdf.setDrawColor(220,232,240);pdf.line(left,284,right,284);font(8);
    pdf.text('krakenpfm.ch · kai@krakenpfm.ch',left,290);
    pdf.text(`${copy.page} ${index} / ${pageCount}`,right,290,{align:'right'});
  }
  return {bytes:Buffer.from(pdf.output('arraybuffer')),pageCount,sourceHash};
}

export async function buildTermsPdfs({root=ROOT,output=path.join(root,'public/legal/terms')}={}){
  const sources=path.join(root,'src/legal/versions'),entries=await readdir(sources,{withFileTypes:true}),files=[];
  for(const entry of entries.filter(entry=>entry.isDirectory()&&!entry.name.endsWith('--initial')).sort((a,b)=>a.name.localeCompare(b.name))){
    for(const language of LANGUAGES){
      const source=path.join(sources,entry.name,language+'.json');
      let document;try{document=JSON.parse(await readFile(source,'utf8'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
      if(document.version!==entry.name||document.language!==language)throw new Error('Version/language mismatch in immutable terms source');
      const {bytes,pageCount,sourceHash}=generateTermsPdf(document);
      const directory=path.join(output,entry.name);await mkdir(directory,{recursive:true});
      const file=path.join(directory,language+'.pdf');await writeFile(file,bytes);
      files.push({version:entry.name,language,path:'/legal/terms/'+entry.name+'/'+language+'.pdf',pages:pageCount,bytes:bytes.length,documentSha256:sourceHash,pdfSha256:createHash('sha256').update(bytes).digest('hex')});
    }
  }
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,'pdf-manifest.json'),JSON.stringify({format:'kraken-terms-pdf-v1',files},null,2)+'\n');
  return files;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const files=await buildTermsPdfs();console.log(JSON.stringify({termsPdfs:files.length,pages:files.reduce((sum,file)=>sum+file.pages,0),versions:[...new Set(files.map(file=>file.version))]}));
}
