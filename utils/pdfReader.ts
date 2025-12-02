// Interfaces para tipagem do PDF.js (quando carregado no window)
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

// Declaração global para o TypeScript entender que pdfjsLib existe no window
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// URL segura e estável (CDNJS) para o PDF.js
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Função para carregar o script dinamicamente (Script Injection)
const loadPdfLibrary = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_URL;
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      // Configura o worker assim que carregar
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
        resolve();
      } else {
        reject(new Error("PDF.js loaded but object not found"));
      }
    };
    
    script.onerror = () => reject(new Error("Failed to load PDF.js script"));
    document.head.appendChild(script);
  });
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    // 1. Garante que a biblioteca está carregada
    await loadPdfLibrary();

    const arrayBuffer = await file.arrayBuffer();
    
    // 2. Carrega o documento usando a variável global
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf: PDFDocumentProxy = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      if (!items || items.length === 0) continue;

      // --- ALGORITMO DE RECONSTRUÇÃO DE LAYOUT (Mantido como solicitado) ---

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
          // Tolerância de 6 unidades para considerar mesma linha
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
        
        // Reordena itens dentro da linha por X para garantir leitura correta da frase
        line.sort((a, b) => a.transform[4] - b.transform[4]);
        
        const lineString = line.map(item => item.str).join(' ');

        if (j > 0) {
          const prevLine = lines[j - 1];
          const prevY = prevLine[0].transform[5];
          const currY = line[0].transform[5];
          
          const diffY = prevY - currY;
          const prevHeight = prevLine[0].transform[3] || 10;

          // Se o espaço vertical for significativo (> 1.8x a altura da linha), cria parágrafo
          if (diffY > (prevHeight * 1.8)) {
            pageText += '\n\n'; 
          } else {
            pageText += '\n'; 
          }
        } else {
          // Primeira linha da página
          if (pageText.length > 0) pageText += '\n';
        }

        pageText += lineString;
      }

      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF. O arquivo pode estar protegido ou corrompido.");
  }
};