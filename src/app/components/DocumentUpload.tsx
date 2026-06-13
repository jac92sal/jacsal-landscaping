import { useRef, useState } from 'react';
import { Upload, Paperclip, Check, Loader2, X, FileText } from 'lucide-react';
import {
  ClientDocument,
  uploadClientDocument,
  formatFileSize,
} from '../../lib/documentsApi';

interface DocumentUploadProps {
  screeningId: string | null;
  email: string;
  requiresDocuments?: boolean;
  serviceName?: string;
}

export function DocumentUpload({
  screeningId,
  email,
  requiresDocuments,
  serviceName,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<ClientDocument[]>([]);

  const resetForm = () => {
    setFile(null);
    setLabel('');
    setDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const doc = await uploadClientDocument({ screeningId, email, label, description, file });
      setUploaded((prev) => [doc, ...prev]);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 text-left space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Paperclip className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="mb-1">Do you have any documents to share before our meeting?</h3>
          <p className="text-sm text-muted-foreground">
            {requiresDocuments
              ? `Your ${serviceName || 'selected service'} works best when we can review your materials in advance. Add any relevant documents below — optional, but encouraged.`
              : 'Optional — attach anything that would help us prepare (notes, a resume, a business plan, financials, etc.).'}
          </p>
        </div>
      </div>

      {/* Already-uploaded list */}
      {uploaded.length > 0 && (
        <ul className="space-y-2">
          {uploaded.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start gap-3 p-3 bg-secondary/10 border border-secondary/20 rounded-lg"
            >
              <Check className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{doc.label || doc.file_name}</div>
                <div className="text-xs text-muted-foreground">
                  {doc.file_name}
                  {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                </div>
                {doc.description && (
                  <div className="text-xs text-muted-foreground mt-1">{doc.description}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload form */}
      <div className="space-y-3">
        {file ? (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 hover:bg-background rounded-lg transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
          >
            <Upload className="w-4 h-4" />
            Choose a file (PDF, Word, Excel, image — up to 10 MB)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.heic,.webp"
          onChange={(e) => {
            setError(null);
            setFile(e.target.files?.[0] ?? null);
          }}
        />

        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g., Resume, Business Plan)"
          className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description (what is this, and what should we know about it?)"
          className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {uploaded.length > 0 ? 'Upload another document' : 'Upload document'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
