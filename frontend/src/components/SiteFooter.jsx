import React from "react";

export default function SiteFooter({ className = "" }) {
  return (
    <footer
      className={`hidden lg:block w-full px-3 sm:px-5 lg:px-6 py-4 text-[10px] text-gray-400 text-center ${className}`}
    >
      © 2026 Story Hub. All rights reserved.
    </footer>
  );
}
