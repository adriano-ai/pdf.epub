
// Define a interface para o objeto PDFDocumentProxy
interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getTextContent: () => Promise<PDFTextContent>;
}

interface PDFTextContent {
  items: Array<{ 
    str: string;
    transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
    width?: number;
    height?: number;
  }>;
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    // TÉCNICA "FAIL-SAFE" (SEGURANÇA MÁXIMA) PARA DEPLOY:
    // Usamos a URL completa da CDN dentro do new Function.
    // Isso garante que o navegador baixe o arquivo exato, sem depender do importmap
    // e sem que o processo de build da Vercel tente analisar essa dependência.
    const loadPdfLib = new Function('return import("https://aistudiocdn.com/pdfjs-dist@4.0.379/build/pdf.min.mjs")');
    const pdfjsLib = await loadPdfLib();

    // Configura o Worker explicitamente
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf: PDFDocumentProxy = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      if (!items || items.length === 0) continue;

      // --- ALGORITMO DE RECONSTRUÇÃO DE LAYOUT ---

      // 1. Ordenação Inicial: Topo -> Baixo (Y desc), depois Esquerda -> Direita (X asc)
      items.sort((a: any, b: any) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        
        if (Math.abs(yA - yB) < 5) {
          return a.transform[4] - b.transform[4]; // Ordena por X
        }
        return yB - yA; // Ordena por Y decrescente
      });

      // 2. Agrupamento em Linhas Visuais
      const lines: any[][] = [];
      let currentLine: any[] = [];
      let currentY = -1;

      for (const item of items) {
        if (!item.str.trim()) continue;

        const itemY = item.transform[5];

        if (currentLine.length === 0) {
          currentLine.push(item);
          currentY = itemY;
        } else {
          if (Math.abs(itemY - currentY) < 6) {
             currentLine.push(item);
          } else {
             lines.push(currentLine);
             currentLine = [item];
             currentY = itemY;
          }
        }
      }
      if (currentLine.length > 0) lines.push(currentLine);

      // 3. Processamento de Texto e Espaçamento (Parágrafos)
      let pageText = '';
      
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        
        // Reordena itens dentro da linha por X
        line.sort((a, b) => a.transform[4] - b.transform[4]);
        
        const lineString = line.map(item => item.str).join(' ');

        if (j > 0) {
          const prevLine = lines[j - 1];
          const prevY = prevLine[0].transform[5];
          const currY = line[0].transform[5];
          
          const diffY = prevY - currY;
          const prevHeight = prevLine[0].transform[3] || 10;

          // Detecta parágrafo se o espaço for maior que ~1.8x a altura da linha
          if (diffY > (prevHeight * 1.8)) {
            pageText += '\n\n'; 
          } else {
            pageText += '\n'; 
          }
        }

        pageText += lineString;
      }

      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF. Verifique se o arquivo não está corrompido.");
  }
};
