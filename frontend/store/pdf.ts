import { create } from 'zustand';

interface PDFStore {
  isOpen: boolean;
  pdfId: string | null;
  page: number;
  snippet: string | null;

  openPDF: (pdfId: string, page?: number, snippet?: string) => void;
  closePDF: () => void;
  setPage: (page: number) => void;
}

export const usePDFStore = create<PDFStore>((set) => ({
  isOpen: false,
  pdfId: null,
  page: 1,
  snippet: null,

  openPDF: (pdfId, page = 1, snippet = null) =>
    set({ isOpen: true, pdfId, page, snippet }),

  closePDF: () =>
    set({ isOpen: false, pdfId: null, page: 1, snippet: null }),

  setPage: (page) => set({ page }),
}));