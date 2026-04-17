import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FolderOpen, Image, ChevronLeft, Lock, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type Folder = {
  id: string;
  packageGroupId: string;
  name: string;
  visibility: string;
  createdAt: string;
};

type Photo = {
  id: string;
  folderId: string;
  objectPath: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
};

function photoUrl(objectPath: string): string {
  const filename = objectPath.split("/").pop() ?? objectPath;
  const token = localStorage.getItem("portal_token") ?? "";
  return `${BASE_URL}/api/portal/student/camp-photos/file/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
}

function FolderCard({ folder, onClick }: { folder: Folder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all hover:shadow-md active:scale-[0.98]"
      style={{ background: "#FFFDF9", borderColor: "#E8E4DC" }}
    >
      <FolderOpen className="w-9 h-9" style={{ color: "#F5821F" }} />
      <div>
        <p className="font-semibold text-sm leading-snug" style={{ color: "#1C1917" }}>{folder.name}</p>
        <span
          className="inline-flex items-center gap-1 text-xs mt-1.5 px-2 py-0.5 rounded-full font-medium"
          style={{ background: "#E0F2FE", color: "#0284C7" }}
        >
          <Users className="w-3 h-3" /> Participants
        </span>
      </div>
    </button>
  );
}

function PhotoGrid({ folderId, folderName, onBack }: { folderId: string; folderName: string; onBack: () => void }) {
  const { data, isLoading } = useQuery<{ data: Photo[] }>({
    queryKey: ["portal-student-camp-photos", folderId],
    queryFn: () => api.get(`/portal/student/camp-photos?folderId=${folderId}`),
  });

  const photos = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1"
          style={{ color: "#78716C" }}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" style={{ color: "#F5821F" }} />
          <span className="font-semibold text-sm" style={{ color: "#1C1917" }}>{folderName}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F5821F" }} />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 border-2 border-dashed rounded-2xl" style={{ borderColor: "#E8E4DC" }}>
          <Image className="w-10 h-10" style={{ color: "#D6CFC4" }} />
          <p className="text-sm" style={{ color: "#A8A29E" }}>No photos in this folder yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <PhotoTile key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoTile({ photo }: { photo: Photo }) {
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div
        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border"
        style={{ borderColor: "#E8E4DC", background: "#F5F0E8" }}
        onClick={() => setLightbox(true)}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image className="w-8 h-8" style={{ color: "#D6CFC4" }} />
          </div>
        )}
        <img
          src={photoUrl(photo.objectPath)}
          alt={photo.fileName ?? "photo"}
          className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightbox(false)}
        >
          <img
            src={photoUrl(photo.objectPath)}
            alt={photo.fileName ?? "photo"}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold leading-none"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

export default function StudentPhotosPage() {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  const { data, isLoading } = useQuery<{ data: Folder[] }>({
    queryKey: ["portal-student-camp-photo-folders"],
    queryFn: () => api.get("/portal/student/camp-photos/folders"),
  });

  const folders = data?.data ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "#1C1917" }}>Camp Photos</h1>
        <p className="text-sm mt-0.5" style={{ color: "#A8A29E" }}>Photos from your program</p>
      </div>

      {selectedFolder ? (
        <PhotoGrid
          folderId={selectedFolder.id}
          folderName={selectedFolder.name}
          onBack={() => setSelectedFolder(null)}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F5821F" }} />
        </div>
      ) : folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 border-2 border-dashed rounded-2xl" style={{ borderColor: "#E8E4DC" }}>
          <FolderOpen className="w-10 h-10" style={{ color: "#D6CFC4" }} />
          <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>No photos yet</p>
          <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>
            Program photos will appear here once your coordinator uploads them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {folders.map(f => (
            <FolderCard key={f.id} folder={f} onClick={() => setSelectedFolder(f)} />
          ))}
        </div>
      )}
    </div>
  );
}
