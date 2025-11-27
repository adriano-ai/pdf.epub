import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

// Helper for downloading files without external dependencies
const saveAs = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- PDF Generator ---
export const generatePDF = (text: string, title: string) => {
  // Orientation 'p' (portrait), unit 'mm', format 'a4'
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });
  
  // Configs
  const marginLeft = 20;
  const marginTop = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - (marginLeft * 2);
  
  // Metadata
  doc.setProperties({
    title: title,
    creator: 'PDF.ai'
  });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, marginLeft, marginTop);

  // Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const splitText = doc.splitTextToSize(text, maxLineWidth);
  
  let cursorY = marginTop + 15;
  
  // Page handling loop
  for (let i = 0; i < splitText.length; i++) {
    if (cursorY > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      cursorY = marginTop;
    }
    doc.text(splitText[i], marginLeft, cursorY);
    cursorY += lineHeight;
  }

  // Save manually to avoid 'file-saver' dependency issues in some environments
  const pdfBlob = doc.output('blob');
  saveAs(pdfBlob, `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

// --- EPUB Generator ---
export const generateEPUB = async (text: string, title: string) => {
  const zip = new JSZip();
  const cleanTitle = title.replace(/[^\w\s]/gi, '');
  const uuid = 'urn:uuid:' + crypto.randomUUID();

  // 1. mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: "STORE" });

  // 2. META-INF/container.xml
  zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`);

  // 3. OEBPS folder
  const oebps = zip.folder('OEBPS');
  if (!oebps) throw new Error("Falha ao criar estrutura EPUB");

  // Split text into paragraphs for HTML
  const paragraphs = text.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('\n');

  // content.xhtml
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
    <title>${cleanTitle}</title>
    <style>
        body { font-family: serif; line-height: 1.5; margin: 5%; }
        h1 { text-align: center; color: #333; }
        p { margin-bottom: 1em; text-indent: 1em; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${paragraphs}
</body>
</html>`;
  oebps.file('chapter1.xhtml', xhtml);

  // content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${title}</dc:title>
        <dc:language>pt-BR</dc:language>
        <dc:identifier id="BookID">${uuid}</dc:identifier>
        <dc:creator>PDF.ai User</dc:creator>
        <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
    </metadata>
    <manifest>
        <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="chapter1"/>
    </spine>
</package>`;
  oebps.file('content.opf', opf);

  // toc.ncx (for compatibility)
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="${uuid}"/>
    </head>
    <docTitle>
        <text>${title}</text>
    </docTitle>
    <navMap>
        <navPoint id="navPoint-1" playOrder="1">
            <navLabel>
                <text>${title}</text>
            </navLabel>
            <content src="chapter1.xhtml"/>
        </navPoint>
    </navMap>
</ncx>`;
  oebps.file('toc.ncx', ncx);

  // Generate and download
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${cleanTitle.toLowerCase().replace(/\s+/g, '_')}.epub`);
};