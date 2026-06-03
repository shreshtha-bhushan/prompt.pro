"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { signOut, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      signOut().then(() => {
        // If this was opened in a background tab by the extension, we can try to close it
        // Or if it's the main tab, redirect to the home page
        if (window.history.length <= 1) {
          window.close();
        } else {
          router.push("/");
        }
      });
    }
  }, [isLoaded, signOut, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="text-white">Signing out...</div>
    </div>
  );
}
