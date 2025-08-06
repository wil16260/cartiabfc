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
    <div className="space-y-4">
      <Card 
        className={`transition-all duration-200 cursor-pointer ${
          dragActive 
            ? 'border-primary bg-primary/5 shadow-ocean' 
            : 'border-dashed border-2 hover:border-primary/50 hover:bg-primary/5'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Upload Geodata Files</h3>
          <p className="text-muted-foreground mb-4">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports: Excel, CSV, GeoJSON, GPKG, KML
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.geojson,.gpkg,.kml"
            onChange={handleFileInput}
            className="hidden"
          />
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Uploaded Files ({uploadedFiles.length})</h4>
          {uploadedFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.name);
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {supportedFormats.map((format, index) => {
          const Icon = format.icon;
          return (
            <div key={index} className="text-center p-3 bg-muted/50 rounded-lg">
              <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-xs font-medium">{format.ext}</p>
              <p className="text-xs text-muted-foreground">{format.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileUpload;