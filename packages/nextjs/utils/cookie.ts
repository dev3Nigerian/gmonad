"use client";

import { useEffect, useState } from "react";
import { notification } from "~~/utils/scaffold-eth";

export function AuthNotification() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;

    // Check for auth error cookie
    const authError = document.cookie.split("; ").find(row => row.startsWith("auth_error="));

    if (authError) {
      const errorMessage = decodeURIComponent(authError.split("=")[1]);
      notification.error(errorMessage);

      // Clear the cookie
      document.cookie = "auth_error=; max-age=0; path=/;";
    }

    // Check for auth success cookie
    const authSuccess = document.cookie.split("; ").find(row => row.startsWith("auth_success="));

    if (authSuccess) {
      const successMessage = decodeURIComponent(authSuccess.split("=")[1]);
      notification.success(successMessage);

      // Clear the cookie
      document.cookie = "auth_success=; max-age=0; path=/;";
    }

    setChecked(true);
  }, [checked]);

  return null; // This component doesn't render anything
}
