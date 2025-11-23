import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Upload,
  Wifi,
  WifiOff,
  Settings,
  X,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { QueuedUpload, UploadQueue, NetworkStats } from '@/lib/uploadQueue';
import { formatFileSize } from '@/lib/imageCompression';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface UploadQueueVisualizationProps {
  queue: UploadQueue;
}

export function UploadQueueVisualization({ queue }: UploadQueueVisualizationProps) {
  const [uploads, setUploads] = useState<QueuedUpload[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [concurrency, setConcurrency] = useState(3);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = queue.subscribe((newQueue) => {
      setUploads(newQueue);
    });

    // Initial network stats
    setNetworkStats(queue.getNetworkStats());
    
    return unsubscribe;
  }, [queue]);

  const stats = queue.getStats();

  const getStatusIcon = (status: QueuedUpload['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'retrying':
        return <RotateCcw className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: QueuedUpload['status']) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      uploading: 'default',
      retrying: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getNetworkQualityColor = (quality?: NetworkStats['quality']) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-amber-500';
      case 'poor': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const handleConcurrencyChange = (value: number[]) => {
    const newValue = value[0];
    setConcurrency(newValue);
    queue.setConcurrency(newValue);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (uploads.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Upload Queue</h3>
              <p className="text-xs text-muted-foreground">
                {stats.completed}/{stats.total} completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Network Status */}
            {networkStats && (
              <div className={`flex items-center gap-2 text-sm ${getNetworkQualityColor(networkStats.quality)}`}>
                {networkStats.quality === 'excellent' || networkStats.quality === 'good' ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="capitalize">{networkStats.quality}</span>
              </div>
            )}

            {/* Settings */}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Upload Settings</SheetTitle>
                  <SheetDescription>
                    Configure upload behavior and network settings
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Concurrency Control */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">
                        Concurrent Uploads
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {concurrency}
                      </span>
                    </div>
                    <Slider
                      value={[concurrency]}
                      onValueChange={handleConcurrencyChange}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values upload faster but may affect performance on slower connections
                    </p>
                  </div>

                  {/* Network Stats */}
                  {networkStats && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Network Information</label>
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quality:</span>
                          <span className={`capitalize font-medium ${getNetworkQualityColor(networkStats.quality)}`}>
                            {networkStats.quality}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estimated Speed:</span>
                          <span className="font-medium">
                            {formatFileSize(networkStats.estimatedSpeed)}/s
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Recommended:</span>
                          <span className="font-medium">
                            {networkStats.recommendedConcurrency} concurrent
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => queue.clearCompleted()}
                      disabled={stats.completed === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Completed ({stats.completed})
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="text-center p-2 rounded-md bg-muted">
            <div className="font-medium text-muted-foreground">Pending</div>
            <div className="text-lg font-semibold">{stats.pending}</div>
          </div>
          <div className="text-center p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <div className="font-medium">Uploading</div>
            <div className="text-lg font-semibold">{stats.uploading}</div>
          </div>
          <div className="text-center p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <div className="font-medium">Retrying</div>
            <div className="text-lg font-semibold">{stats.retrying}</div>
          </div>
          <div className="text-center p-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
            <div className="font-medium">Completed</div>
            <div className="text-lg font-semibold">{stats.completed}</div>
          </div>
          <div className="text-center p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <div className="font-medium">Failed</div>
            <div className="text-lg font-semibold">{stats.failed}</div>
          </div>
        </div>

        {/* Upload List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(upload.status)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  {getStatusBadge(upload.status)}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(upload.file.size)}</span>
                  {upload.startedAt && upload.completedAt && (
                    <span>• {formatDuration(upload.completedAt - upload.startedAt)}</span>
                  )}
                  {upload.retryCount > 0 && (
                    <span>• Retry {upload.retryCount}</span>
                  )}
                </div>

                {/* Progress Bar */}
                {(upload.status === 'uploading' || upload.status === 'retrying') && (
                  <Progress value={upload.progress} className="h-1 mt-2" />
                )}

                {/* Error Message */}
                {upload.error && upload.status === 'failed' && (
                  <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                )}

                {/* Retry Message */}
                {upload.error && upload.status === 'retrying' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {upload.error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex gap-1">
                {upload.status === 'failed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => queue.retryUpload(upload.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                {(upload.status === 'pending' || upload.status === 'failed') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => queue.removeUpload(upload.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {upload.status === 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => queue.cancelUpload(upload.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
