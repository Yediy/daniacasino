import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, AlertCircle } from "lucide-react";

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError("");
      setIsScanning(true);

      if (!readerRef.current || !videoRef.current) {
        throw new Error("Scanner not initialized");
      }

      const videoInputDevices = await readerRef.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error("No camera found");
      }

      // Try to use back camera on mobile devices
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear')
      );
      
      const selectedDevice = backCamera || videoInputDevices[0];

      await readerRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            onScan(text);
            stopScanning();
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      setError(errorMessage);
      setIsScanning(false);
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive" className="flex-1">
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Point your camera at a QR code or barcode to scan
        </p>
      </CardContent>
    </Card>
  );
}
