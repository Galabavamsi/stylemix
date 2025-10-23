
export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

export type AppTab = 'tryon' | 'generate' | 'edit';

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
