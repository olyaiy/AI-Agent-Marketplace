"use client";

import * as React from "react";
import { AvatarPicker } from "@/components/avatar-picker";

interface Props {
  avatars: string[]; // urls like /avatars/filename.png
  initialAvatar?: string; // filename only
}

export const EditAvatarClient = React.memo(function EditAvatarClient({ avatars, initialAvatar }: Props) {
  const initialUrl = React.useMemo(() => (initialAvatar ? `/avatars/${initialAvatar}` : undefined), [initialAvatar]);
  const [selectedUrl, setSelectedUrl] = React.useState<string | undefined>(initialUrl);

  const selectedFileName = React.useMemo(() => {
    if (!selectedUrl) return "";
    const parts = selectedUrl.split("/");
    return parts[parts.length - 1] ?? "";
  }, [selectedUrl]);

  return (
    <div className="flex items-center gap-3">
      <AvatarPicker avatars={avatars} value={selectedUrl} onChange={setSelectedUrl} />
      <input type="hidden" name="avatar" value={selectedFileName} />
    </div>
  );
});


