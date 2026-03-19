import { useState, useCallback } from "react";

interface UseDetailEditOptions<T> {
  initialData: T;
  onSave: (data: Partial<T>) => Promise<void>;
}

export function useDetailEdit<T extends Record<string, unknown>>({
  initialData,
  onSave,
}: UseDetailEditOptions<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<T>>({});

  const startEdit = useCallback(() => {
    setFormData({ ...initialData });
    setIsEditing(true);
  }, [initialData]);

  const cancelEdit = useCallback(() => {
    setFormData({});
    setIsEditing(false);
  }, []);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveEdit = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
      setFormData({});
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  const getValue = useCallback(
    <K extends keyof T>(key: K): T[K] => {
      if (isEditing && key in formData) return formData[key] as T[K];
      return initialData[key];
    },
    [isEditing, formData, initialData]
  );

  return { isEditing, isSaving, formData, startEdit, cancelEdit, setField, saveEdit, getValue };
}
