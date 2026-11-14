"use client";

import { toast } from "@/components/ui/toast";

type ActionMessages = { loading: string; success: string; error?: string };

/** Success is shown only after the operation (including disk acknowledgement) resolves. */
export async function notifyAction<T>(work: () => Promise<T>, messages: ActionMessages): Promise<T> {
  const id = toast.add({ type: "loading", title: messages.loading, timeout: 0 });
  try {
    const result = await work();
    toast.update(id, { type: "success", title: messages.success, timeout: 4500 });
    return result;
  } catch (error) {
    toast.update(id, { type: "error", title: messages.error ?? "Aksi belum berhasil", description: error instanceof Error ? error.message : "Silakan coba kembali.", timeout: 9000 });
    throw error;
  }
}
