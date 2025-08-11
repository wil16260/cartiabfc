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
    <div className="w-full space-y-4">
      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium">Glissez vos fichiers ici</p>
          <p className="text-sm text-muted-foreground">
            ou{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={() => fileInputRef.current?.click()}
            >
              parcourez vos fichiers
            </Button>
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".xlsx,.xls,.csv,.geojson,.gpkg,.kml"
          onChange={handleFileInput}
        />
      </div>

      {/* Supported Formats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {supportedFormats.map((format, index) => {
          const IconComponent = format.icon;
          return (
            <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
              <div className="text-xs">
                <div className="font-medium">{format.ext}</div>
                <div className="text-muted-foreground">{format.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Fichiers téléchargés ({uploadedFiles.length})</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => {
                const IconComponent = getFileIcon(file.name);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;