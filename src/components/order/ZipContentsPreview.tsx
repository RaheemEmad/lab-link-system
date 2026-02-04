import { useState, useMemo } from "react";
import { 
  FileArchive, 
  FileText, 
  Image, 
  Box, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown,
  Folder,
  FolderOpen
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

interface ZipEntry {
  name: string;
  size: number;
  type: string;
}

interface ZipContentsPreviewProps {
  contents: ZipEntry[];
  warnings?: string[];
  totalSize?: number;
  fileCount?: number;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  type?: string;
  children: TreeNode[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const modelTypes = ['.stl', '.obj', '.fbx', '.3ds'];
  
  if (imageTypes.includes(type)) return <Image className="h-4 w-4 text-primary" />;
  if (modelTypes.includes(type)) return <Box className="h-4 w-4 text-primary" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const buildTree = (entries: ZipEntry[]): TreeNode[] => {
  const root: TreeNode[] = [];
  
  entries.forEach(entry => {
    const parts = entry.name.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';
    
    parts.forEach((part, index) => {
      currentPath += (currentPath ? '/' : '') + part;
      const isLastPart = index === parts.length - 1;
      const isDirectory = !isLastPart || entry.name.endsWith('/');
      
      let existing = currentLevel.find(n => n.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isDirectory,
          size: isLastPart ? entry.size : undefined,
          type: isLastPart ? entry.type : undefined,
          children: []
        };
        currentLevel.push(existing);
      }
      
      currentLevel = existing.children;
    });
  });
  
  // Sort: directories first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    }).map(n => ({ ...n, children: sortNodes(n.children) }));
  };
  
  return sortNodes(root);
};

const TreeNodeComponent = ({ node, depth = 0 }: { node: TreeNode; depth?: number }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  
  if (node.isDirectory) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start h-7 px-2"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 mr-1 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="h-4 w-4 mr-2 text-primary shrink-0" />
            ) : (
              <Folder className="h-4 w-4 mr-2 text-primary shrink-0" />
            )}
            <span className="truncate text-xs">{node.name}</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {node.children.length}
            </Badge>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {node.children.map((child, i) => (
            <TreeNodeComponent key={child.path} node={child} depth={depth + 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  return (
    <div 
      className="flex items-center h-7 px-2 hover:bg-muted/50 rounded"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(node.type || '')}
      <span className="ml-2 truncate text-xs flex-1">{node.name}</span>
      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
        {node.size !== undefined ? formatFileSize(node.size) : ''}
      </span>
    </div>
  );
};

export function ZipContentsPreview({ 
  contents, 
  warnings = [], 
  totalSize, 
  fileCount 
}: ZipContentsPreviewProps) {
  const tree = useMemo(() => buildTree(contents), [contents]);
  
  return (
    <div className="border rounded-lg bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <FileArchive className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">ZIP Contents</span>
        </div>
        <div className="flex items-center gap-2">
          {fileCount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {fileCount} files
            </Badge>
          )}
          {totalSize !== undefined && (
            <Badge variant="outline" className="text-xs">
              {formatFileSize(totalSize)}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-3 py-2 border-b bg-destructive/10">
          {warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Tree View */}
      <ScrollArea className="h-[200px]">
        <div className="p-1">
          {tree.map((node) => (
            <TreeNodeComponent key={node.path} node={node} />
          ))}
          {tree.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Empty archive
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ZipContentsPreview;
