import { create } from 'zustand';

interface PDFStore {
  isOpen: boolean;
  pdfId: string | null;
  page: number;
  snippet: string;
  openPDF: (id: string, page: number, snippet?: string) => void;
  closePDF: () => void;
  setPage: (page: number) => void;
}

export const usePDFStore = create<PDFStore>((set) => ({
  isOpen: false,
  pdfId: null,
  page: 1,
  snippet: '',
  
  openPDF: (id, page, snippet = '') =>
    set({ isOpen: true, pdfId: id, page, snippet }),
  
  closePDF: () =>
    set({ isOpen: false, pdfId: null, page: 1, snippet: '' }),
  
  setPage: (page) =>
    set({ page }),
}));