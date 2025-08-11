import { useState, useRef } from "react";
import { Upload, File, X, FileSpreadsheet, Database, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void;
}

const FileUpload = ({ onFilesUploaded }: FileUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [
    { ext: ".xlsx/.xls", icon: FileSpreadsheet, description: "Excel files" },
    { ext: ".csv", icon: FileSpreadsheet, description: "CSV files" },
    { ext: ".geojson", icon: MapIcon, description: "GeoJSON files" },
    { ext: ".gpkg", icon: Database, description: "GeoPackage files" },
    { ext: ".kml", icon: MapIcon, description: "KML files" }
  ];

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/geo+json',
      'application/geopackage+sqlite3',
      'application/vnd.google-earth.kml+xml'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.geojson', '.gpkg', '.kml'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
  };

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Unsupported file format: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      const newFiles = [...uploadedFiles, ...validFiles];
      setUploadedFiles(newFiles);
      onFilesUploaded(newFiles);
      toast.success(`${validFiles.length} file(s) uploaded successfully`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    switch (ext) {
      case '.xlsx':
      case '.xls':
      case '.csv':
        return FileSpreadsheet;
      case '.geojson':
      case '.kml':
        return MapIcon;
      case '.gpkg':
        return Database;
      default:
        return File;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4 text-primary" />
        <span className="text-sm">Fichiers ({uploadedFiles.length})</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.geojson,.gpkg,.kml"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="flex items-center gap-1">
          {uploadedFiles.slice(0, 3).map((file, index) => {
            const FileIcon = getFileIcon(file.name);
            return (
              <div key={index} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                <FileIcon className="h-3 w-3 text-primary" />
                <span className="max-w-20 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {uploadedFiles.length > 3 && (
            <span className="text-xs text-muted-foreground">+{uploadedFiles.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;