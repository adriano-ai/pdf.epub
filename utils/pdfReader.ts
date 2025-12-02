
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
    // TÉCNICA "FAIL-SAFE" PARA VERCEL/BUNDLERS:
    // Usamos 'new Function' para evitar que o bundler (Webpack/Vite) tente resolver 'pdfjs-dist' 
    // durante o build (npm run build), o que causaria erro pois a lib não está no package.json.
    // O navegador executará isso normalmente em tempo de execução usando o importmap do index.html.
    const loadPdfLib = new Function('return import("pdfjs-dist")');
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
      // A coordenada Y no PDF geralmente cresce de baixo para cima, então maior Y = topo da página.
      items.sort((a: any, b: any) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        
        // Se a diferença vertical for muito pequena, estão na mesma linha
        if (Math.abs(yA - yB) < 5) {
          return a.transform[4] - b.transform[4]; // Ordena por X
        }
        return yB - yA; // Ordena por Y decrescente (topo primeiro)
      });

      // 2. Agrupamento em Linhas Visuais
      const lines: any[][] = [];
      let currentLine: any[] = [];
      let currentY = -1;

      for (const item of items) {
        // Ignora itens vazios que são apenas espaçamento no PDF
        if (!item.str.trim()) continue;

        const itemY = item.transform[5];

        if (currentLine.length === 0) {
          currentLine.push(item);
          currentY = itemY;
        } else {
          // Se a distância vertical for pequena, pertence à mesma linha
          if (Math.abs(itemY - currentY) < 6) {
             currentLine.push(item);
          } else {
             // Fecha a linha anterior e começa uma nova
             lines.push(currentLine);
             currentLine = [item];
             currentY = itemY;
          }
        }
      }
      if (currentLine.length > 0) lines.push(currentLine);

      // 3. Processamento de Texto e Espaçamento Vertical (Parágrafos)
      let pageText = '';
      
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        
        // Reordena itens dentro da linha por X para garantir leitura correta
        line.sort((a, b) => a.transform[4] - b.transform[4]);
        
        const lineString = line.map(item => item.str).join(' '); // Junta fragmentos da linha

        if (j > 0) {
          const prevLine = lines[j - 1];
          const prevY = prevLine[0].transform[5];
          const currY = line[0].transform[5];
          
          // Calcula a distância vertical entre esta linha e a anterior
          const diffY = prevY - currY;
          
          // Estima a altura da fonte da linha anterior (transform[3] é scaleY ~= font size)
          const prevHeight = prevLine[0].transform[3] || 10;

          // Se o espaço for significativamente maior que a altura da linha (ex: > 1.8x), é um novo parágrafo
          if (diffY > (prevHeight * 1.8)) {
            pageText += '\n\n'; // Parágrafo
          } else {
            pageText += '\n'; // Apenas quebra de linha visual
          }
        }

        pageText += lineString;
      }

      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF. O arquivo pode estar corrompido ou ser uma imagem.");
  }
};
