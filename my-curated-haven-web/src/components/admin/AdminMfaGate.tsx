"use client";

import { useRouter } from "next/navigation";
import AdminMfa from "./AdminMfa";

export default function AdminMfaGate() {
  const router = useRouter();
  return (
    <AdminMfa
      onVerified={() => {
        router.refresh();
      }}
    />
  );
}
