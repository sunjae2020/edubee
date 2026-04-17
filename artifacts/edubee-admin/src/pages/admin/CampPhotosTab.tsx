import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  FolderOpen, FolderPlus, Image, Trash2, Upload, X, ChevronLeft,
  Lock, Users, Pencil, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Folder = {
  id: string;
  packageGroupId: string;
  name: string;
  visibility: string;
  sortOrder: number;
  createdAt: string;
};

type Photo = {
  id: string;
  folderId: string;
  packageGroupId: string;
  objectPath: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
};

const VISIBILITY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin_only:   { label: "Admin Only",    icon: <Lock className="w-3 h-3" />,  color: "bg-orange-100 text-orange-700" },
  participants: { label: "Participants",  icon: <Users className="w-3 h-3" />, color: "bg-blue-100 text-blue-700" },
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function photoUrl(objectPath: string): string {
  const filename = objectPath.split("/").pop() ?? objectPath;
  const token = localStorage.getItem("edubee_token") ?? "";
  return `${BASE}/api/camp-photos/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
}

// ── Folder Card ─────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  onClick,
  onEdit,
  onDelete,
  photoCount,
}: {
  folder: Folder;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  photoCount: number;
}) {
  const vis = VISIBILITY_LABELS[folder.visibility] ?? VISIBILITY_LABELS.admin_only;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between">
        <FolderOpen className="w-8 h-8 text-primary/70" />
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <p className="font-medium text-sm leading-tight line-clamp-2">{folder.name}</p>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-muted-foreground">{photoCount} photo{photoCount !== 1 ? "s" : ""}</span>
        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${vis.color}`}>
          {vis.icon} {vis.label}
        </span>
      </div>
    </div>
  );
}

// ── Photo Thumbnail ──────────────────────────────────────────────────────────

function PhotoTile({ photo, onDelete }: { photo: Photo; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Image className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}
      <img
        src={photoUrl(photo.objectPath)}
        alt={photo.fileName ?? "photo"}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      {hovered && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 p-2">
          <p className="text-white text-xs text-center line-clamp-2 font-medium">{photo.fileName}</p>
          {photo.fileSize && <p className="text-white/70 text-xs">{formatSize(photo.fileSize)}</p>}
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs mt-1"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CampPhotosTab({ packageGroupId, canEdit }: { packageGroupId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ open: boolean; folder?: Folder }>({ open: false });
  const [folderName, setFolderName] = useState("");
  const [folderVisibility, setFolderVisibility] = useState("admin_only");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const foldersKey = ["camp-photo-folders", packageGroupId];
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: foldersKey,
    queryFn: () => axios.get(`${BASE}/api/camp-photos/folders?packageGroupId=${packageGroupId}`).then(r => r.data),
  });

  const photosKey = ["camp-photos", selectedFolder?.id];
  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: photosKey,
    queryFn: () => axios.get(`${BASE}/api/camp-photos?folderId=${selectedFolder!.id}`).then(r => r.data),
    enabled: !!selectedFolder,
  });

  // Photo counts per folder
  const { data: allPhotoCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["camp-photo-counts", packageGroupId, folders.map(f => f.id).join(",")],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(folders.map(async f => {
        const r = await axios.get(`${BASE}/api/camp-photos?folderId=${f.id}`);
        counts[f.id] = r.data.length;
      }));
      return counts;
    },
    enabled: folders.length > 0,
  });

  const createFolder = useMutation({
    mutationFn: (data: { name: string; visibility: string }) =>
      axios.post(`${BASE}/api/camp-photos/folders`, { packageGroupId, ...data }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: foldersKey }); setFolderDialog({ open: false }); },
    onError: () => toast({ title: "Failed to create folder", variant: "destructive" }),
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; visibility: string }) =>
      axios.put(`${BASE}/api/camp-photos/folders/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: foldersKey });
      setFolderDialog({ open: false });
      if (selectedFolder) {
        setSelectedFolder(prev => prev ? { ...prev, name: folderName, visibility: folderVisibility } : prev);
      }
    },
    onError: () => toast({ title: "Failed to update folder", variant: "destructive" }),
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/camp-photos/folders/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: foldersKey });
      if (selectedFolder?.id === deleteFolder.variables) setSelectedFolder(null);
    },
    onError: () => toast({ title: "Failed to delete folder", variant: "destructive" }),
  });

  const deletePhoto = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/camp-photos/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photosKey });
      qc.invalidateQueries({ queryKey: ["camp-photo-counts", packageGroupId] });
    },
    onError: () => toast({ title: "Failed to delete photo", variant: "destructive" }),
  });

  function openCreateFolder() {
    setFolderName("");
    setFolderVisibility("admin_only");
    setFolderDialog({ open: true });
  }

  function openEditFolder(f: Folder) {
    setFolderName(f.name);
    setFolderVisibility(f.visibility);
    setFolderDialog({ open: true, folder: f });
  }

  function submitFolder() {
    if (!folderName.trim()) return;
    if (folderDialog.folder) {
      updateFolder.mutate({ id: folderDialog.folder.id, name: folderName.trim(), visibility: folderVisibility });
    } else {
      createFolder.mutate({ name: folderName.trim(), visibility: folderVisibility });
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || !selectedFolder) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: arr.length });

    let done = 0;
    const errors: string[] = [];

    for (const file of arr) {
      try {
        const fd = new FormData();
        fd.append("photos", file);
        fd.append("folderId", selectedFolder.id);
        fd.append("packageGroupId", packageGroupId);
        await axios.post(`${BASE}/api/camp-photos/upload`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch {
        errors.push(file.name);
      }
      done++;
      setUploadProgress({ done, total: arr.length });
    }

    setUploading(false);
    setUploadProgress(null);
    qc.invalidateQueries({ queryKey: photosKey });
    qc.invalidateQueries({ queryKey: ["camp-photo-counts", packageGroupId] });

    if (errors.length > 0) {
      toast({ title: `${errors.length} file(s) failed to upload`, variant: "destructive" });
    } else {
      toast({ title: `${arr.length} photo${arr.length !== 1 ? "s" : ""} uploaded successfully` });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const vis = selectedFolder ? (VISIBILITY_LABELS[selectedFolder.visibility] ?? VISIBILITY_LABELS.admin_only) : null;

  return (
    <div className="flex flex-col gap-6">

      {/* Folder View */}
      {!selectedFolder ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Photo Folders</h3>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={openCreateFolder}>
                <FolderPlus className="w-4 h-4 mr-1.5" /> New Folder
              </Button>
            )}
          </div>

          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2 border-2 border-dashed border-border rounded-xl">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No folders yet</p>
              {canEdit && (
                <Button size="sm" variant="outline" className="mt-2" onClick={openCreateFolder}>
                  <FolderPlus className="w-4 h-4 mr-1.5" /> Create First Folder
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {folders.map(f => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  photoCount={allPhotoCounts[f.id] ?? 0}
                  onClick={() => setSelectedFolder(f)}
                  onEdit={() => openEditFolder(f)}
                  onDelete={() => { if (confirm(`Delete folder "${f.name}" and all its photos?`)) deleteFolder.mutate(f.id); }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Photo Grid View */
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => setSelectedFolder(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Folders
            </Button>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary/70" />
              <span className="font-semibold text-sm">{selectedFolder.name}</span>
              {vis && (
                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${vis.color}`}>
                  {vis.icon} {vis.label}
                </span>
              )}
            </div>
            {canEdit && (
              <div className="ml-auto flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" /> Upload Photos
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Upload progress bar */}
          {uploading && uploadProgress && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
              />
            </div>
          )}

          {photos.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center gap-2 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => canEdit && fileInputRef.current?.click()}
            >
              <Image className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No photos yet</p>
              {canEdit && <p className="text-xs text-muted-foreground/60">Click to upload photos</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {photos.map(p => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  onDelete={() => { if (confirm("Delete this photo?")) deletePhoto.mutate(p.id); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Folder Create/Edit Dialog */}
      <Dialog open={folderDialog.open} onOpenChange={o => setFolderDialog({ open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{folderDialog.folder ? "Edit Folder" : "New Folder"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                placeholder="e.g. Week 1 Activities"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitFolder()}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Visibility</label>
              <Select value={folderVisibility} onValueChange={setFolderVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-orange-500" /> Admin Only
                    </span>
                  </SelectItem>
                  <SelectItem value="participants">
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-500" /> Participants (Contracted Clients)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {folderVisibility === "admin_only"
                  ? "Visible to admins and camp coordinators only."
                  : "Visible to contracted students (participants) and admins."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog({ open: false })}>Cancel</Button>
            <Button
              onClick={submitFolder}
              disabled={!folderName.trim() || createFolder.isPending || updateFolder.isPending}
            >
              {createFolder.isPending || updateFolder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {folderDialog.folder ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
