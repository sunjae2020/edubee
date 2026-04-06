import { useState, useCallback, useEffect, useRef } from "react";

interface UseDetailEditOptions<T> {
  initialData: T;
  onSave: (data: Partial<T>) => Promise<void>;
  alwaysEdit?: boolean;
}

export function useDetailEdit<T extends Record<string, unknown>>({
  initialData,
  onSave,
  alwaysEdit = false,
}: UseDetailEditOptions<T>) {
  const [isEditing, setIsEditing] = useState(alwaysEdit);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<T>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    if (alwaysEdit && !isDirty && Object.keys(initialData).length > 0 && !initializedRef.current) {
      setFormData({ ...initialData });
      initializedRef.current = true;
    }
  }, [initialData, alwaysEdit, isDirty]);

  const startEdit = useCallback(() => {
    if (!alwaysEdit) {
      setFormData({ ...initialData });
      setIsEditing(true);
    }
  }, [initialData, alwaysEdit]);

  const cancelEdit = useCallback(() => {
    setFormData(alwaysEdit ? { ...initialData } : {});
    setIsDirty(false);
    initializedRef.current = true;
    if (!alwaysEdit) setIsEditing(false);
  }, [initialData, alwaysEdit]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (alwaysEdit) setIsDirty(true);
  }, [alwaysEdit]);

  const saveEdit = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsDirty(false);
      if (!alwaysEdit) {
        setIsEditing(false);
        setFormData({});
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, alwaysEdit]);

  const getValue = useCallback(
    <K extends keyof T>(key: K): T[K] => {
      if ((isEditing || alwaysEdit) && key in formData) return formData[key] as T[K];
      return initialData[key];
    },
    [isEditing, alwaysEdit, formData, initialData]
  );

  return { isEditing: isEditing || alwaysEdit, isDirty, isSaving, formData, startEdit, cancelEdit, setField, saveEdit, getValue };
}
